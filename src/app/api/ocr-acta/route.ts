import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { fetchPartidosActivos, agruparPorAmbito, Ambito } from "@/lib/partidos-eleccion";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const anthropic = new Anthropic();

// Leer las dos secciones (SJL + Lima) en una sola llamada tarda más que la
// lectura de una sola lista — se sube el límite por defecto de la función
// (10s) para que no se corte a mitad de la respuesta de Claude.
export const maxDuration = 60;

// Precisión leyendo cifras oficiales importa más que el costo aquí — el gasto por
// acta con Sonnet 5 es de todas formas bajo (imagen comprimida + salida corta).
// Bajar a "claude-haiku-4-5" si el costo se vuelve un problema con muchas mesas.
const MODEL = "claude-sonnet-5";
const TOOL_NAME = "registrar_lectura_acta";

// Con miles de personeros reportando en horas pico (sobre todo al cierre de
// mesas), es normal toparse de vez en cuando con un 429 (rate limit) o 529
// (servidor de Anthropic saturado) — son errores transitorios, no de la
// lectura en sí, así que conviene reintentar un par de veces con backoff en
// vez de fallarle al personero a la primera.
async function crearLecturaConReintentos(
  params: Anthropic.MessageCreateParamsNonStreaming,
  intentosMax = 3
): Promise<Anthropic.Message> {
  let ultimoError: unknown;
  for (let intento = 0; intento < intentosMax; intento++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err) {
      ultimoError = err;
      const status = (err as { status?: number } | undefined)?.status;
      const esReintentable = status === 429 || status === 500 || status === 503 || status === 529;
      if (!esReintentable || intento === intentosMax - 1) throw err;
      const espera = 600 * Math.pow(2, intento) + Math.random() * 300;
      await new Promise((resolve) => setTimeout(resolve, espera));
    }
  }
  throw ultimoError;
}

// El acta de esta elección trae DOS secciones de resultados en la misma hoja:
// la del DISTRITO de San Juan de Lurigancho (la que más nos importa) y la de
// la PROVINCIA de Lima Metropolitana. Cada una lista solo nombres de partidos
// (no de candidatos), numerados según su propia cédula.
function seccionSchema(partidosProperties: Record<string, { type: "integer"; minimum: number }>) {
  return {
    type: "object" as const,
    properties: {
      partidos: {
        type: "object" as const,
        description: "Votos leídos por partido político. Clave = número de lista del partido en esta sección, valor = cantidad de votos.",
        properties: partidosProperties,
        required: Object.keys(partidosProperties),
      },
      votos_blancos: { type: "integer" as const, minimum: 0, description: "Votos en blanco de esta sección" },
      votos_nulos: { type: "integer" as const, minimum: 0, description: "Votos nulos de esta sección" },
      votos_impugnados: { type: "integer" as const, minimum: 0, description: "Votos impugnados de esta sección" },
      confianza: {
        type: "string" as const,
        enum: ["alta", "media", "baja"],
        description: "Qué tan seguro estás de la lectura completa de esta sección",
      },
      advertencia: {
        type: ["string", "null"] as const,
        description: "Explica brevemente si algo de esta sección no se pudo leer con claridad, la foto está incompleta/borrosa, o los números no cuadran con el total. null si no hay ninguna advertencia.",
      },
    },
    required: ["partidos", "votos_blancos", "votos_nulos", "votos_impugnados", "confianza", "advertencia"],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType, dni, numeroMesa } = (await req.json()) as {
      imageBase64: string;
      mediaType: string;
      dni: string;
      numeroMesa: string;
    };

    if (!imageBase64 || !dni || !numeroMesa) {
      return NextResponse.json({ error: "Faltan datos de la solicitud." }, { status: 400 });
    }

    // Guardia anti-abuso: solo se llama a Claude si el DNI y la mesa corresponden
    // a un personero real, así no se gasta crédito con solicitudes arbitrarias.
    const { data: personero, error: personeroError } = await supabase
      .from("personeros")
      .select("id")
      .eq("dni", dni.trim())
      .eq("numero_mesa", numeroMesa)
      .maybeSingle();

    if (personeroError || !personero) {
      return NextResponse.json({ error: "No se pudo verificar el personero para esta mesa." }, { status: 403 });
    }

    const partidos = await fetchPartidosActivos();
    const porAmbito = agruparPorAmbito(partidos);
    if (porAmbito.sjl.length === 0 || porAmbito.lima.length === 0) {
      return NextResponse.json({ error: "No hay partidos configurados todavía para ambas listas." }, { status: 500 });
    }

    function propsDe(ambito: Ambito) {
      const props: Record<string, { type: "integer"; minimum: number }> = {};
      for (const p of porAmbito[ambito]) props[String(p.numero_lista)] = { type: "integer", minimum: 0 };
      return props;
    }

    const tool: Anthropic.Tool = {
      name: TOOL_NAME,
      description: "Registra la lectura de los votos por partido político de un acta de mesa, para las dos elecciones simultáneas (distrito SJL y provincia Lima).",
      input_schema: {
        type: "object",
        properties: {
          sjl: seccionSchema(propsDe("sjl")),
          lima: seccionSchema(propsDe("lima")),
        },
        required: ["sjl", "lima"],
      },
    };

    const listaPartidos = (ambito: Ambito) =>
      porAmbito[ambito].map((p) => `${p.numero_lista}. ${p.nombre}`).join("\n");

    const prompt = `Eres un asistente de conteo paralelo de las elecciones municipales del Perú (04 de octubre de 2026). Te voy a mostrar la foto de un acta de mesa (formato oficial ONPE).

IMPORTANTE: esta acta trae DOS elecciones simultáneas, cada una con su propia lista de partidos numerada:
1) La elección de alcalde DISTRITAL de SAN JUAN DE LURIGANCHO (SJL) — esta es la que MÁS nos importa y debes ubicar y leer PRIMERO. Búscala por palabras clave como "SAN JUAN DE LURIGANCHO (SJL)", "DISTRITO" o "SJL" en los encabezados o títulos de sección del acta.
2) La elección de alcalde PROVINCIAL de LIMA METROPOLITANA — es secundaria, pero también debes leerla completa.

No confundas las dos secciones: cada una tiene su propia numeración de partidos y sus propios votos en blanco/nulos/impugnados. Si el acta solo trae una sola sección de votos y no distingue distrito/provincia, usa tu mejor criterio para ubicar cuál corresponde a cada lista de partidos según los nombres que reconozcas, y baja la confianza de la sección que te genere duda.

Lista de partidos de SAN JUAN DE LURIGANCHO (SJL) — distrital (número de lista → nombre del partido):
${listaPartidos("sjl")}

Lista de partidos de LIMA METROPOLITANA — provincial (número de lista → nombre del partido):
${listaPartidos("lima")}

Lee la foto con cuidado, dígito por dígito, para cada una de las dos secciones. Si el acta muestra un total de votos emitidos por sección, verifica que la suma de todos los partidos de esa sección más blancos, nulos e impugnados sea consistente con ese total — si no cuadra, o si algún número no se distingue con claridad (foto borrosa, cortada, con tachones), usa confianza "baja" o "media" para esa sección y describe el problema en su "advertencia". Si una sección se lee con claridad y sin ambigüedad, usa confianza "alta" y advertencia null para esa sección.

Reporta los votos de todos los partidos de cada lista aunque algunos tengan 0 votos. Usa la tool "${TOOL_NAME}" para reportar tu lectura, con un objeto "sjl" y un objeto "lima" completos e independientes.`;

    const response = await crearLecturaConReintentos({
      model: MODEL,
      max_tokens: 3072,
      tools: [tool],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === TOOL_NAME
    );

    if (!toolUse) {
      return NextResponse.json({ error: "La IA no pudo leer el acta. Intenta con otra foto." }, { status: 502 });
    }

    return NextResponse.json(toolUse.input);
  } catch (err) {
    const status = (err as { status?: number } | undefined)?.status;
    const saturado = status === 429 || status === 529;
    const msg = saturado
      ? "El sistema de lectura está muy saturado en este momento. Espera unos segundos y vuelve a intentar."
      : err instanceof Error ? err.message : "Error interno al leer el acta.";
    return NextResponse.json({ error: msg }, { status: saturado ? 503 : 500 });
  }
}
