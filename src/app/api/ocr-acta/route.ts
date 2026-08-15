import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { fetchCandidatosActivos } from "@/lib/candidatos-alcaldia";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const anthropic = new Anthropic();

// Precisión leyendo cifras oficiales importa más que el costo aquí — el gasto por
// acta con Sonnet 5 es de todas formas bajo (imagen comprimida + salida corta).
// Bajar a "claude-haiku-4-5" si el costo se vuelve un problema con muchas mesas.
const MODEL = "claude-sonnet-5";
const TOOL_NAME = "registrar_lectura_acta";

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

    const candidatos = await fetchCandidatosActivos();
    if (candidatos.length === 0) {
      return NextResponse.json({ error: "No hay candidatos configurados todavía." }, { status: 500 });
    }

    const candidatosProperties: Record<string, { type: "integer"; minimum: number }> = {};
    for (const c of candidatos) {
      candidatosProperties[String(c.numero_lista)] = { type: "integer", minimum: 0 };
    }

    const tool: Anthropic.Tool = {
      name: TOOL_NAME,
      description: "Registra la lectura de los votos del acta de una mesa de votación municipal.",
      input_schema: {
        type: "object",
        properties: {
          candidatos: {
            type: "object",
            description: "Votos leídos por candidato. Clave = número de lista del candidato, valor = cantidad de votos.",
            properties: candidatosProperties,
            required: Object.keys(candidatosProperties),
          },
          votos_blancos: { type: "integer", minimum: 0, description: "Votos en blanco" },
          votos_nulos: { type: "integer", minimum: 0, description: "Votos nulos" },
          votos_impugnados: { type: "integer", minimum: 0, description: "Votos impugnados" },
          confianza: {
            type: "string",
            enum: ["alta", "media", "baja"],
            description: "Qué tan seguro estás de la lectura completa del acta",
          },
          advertencia: {
            type: ["string", "null"],
            description: "Explica brevemente si algo no se pudo leer con claridad, la foto está incompleta/borrosa, o los números no cuadran con el total. null si no hay ninguna advertencia.",
          },
        },
        required: ["candidatos", "votos_blancos", "votos_nulos", "votos_impugnados", "confianza", "advertencia"],
      },
    };

    const listaCandidatos = candidatos
      .map((c) => `${c.numero_lista}. ${c.nombre} (${c.partido})`)
      .join("\n");

    const prompt = `Eres un asistente de conteo paralelo de una elección municipal en Perú. Te voy a mostrar la foto de un acta de mesa (formato oficial ONPE) con los resultados de la elección de alcalde de San Juan de Lurigancho.

El acta lista los votos de cada organización política, numeradas según esta lista de candidatos (número de lista → nombre → partido):
${listaCandidatos}

También incluye, generalmente al final, los votos en blanco, votos nulos y votos impugnados.

Lee la foto con cuidado, dígito por dígito. Si el acta muestra un total de votos emitidos, verifica que la suma de todos los candidatos más blancos, nulos e impugnados sea consistente con ese total — si no cuadra, o si algún número no se distingue con claridad (foto borrosa, cortada, con tachones), usa confianza "baja" o "media" y describe el problema en "advertencia". Si todo se lee con claridad y sin ambigüedad, usa confianza "alta" y advertencia null.

Reporta los votos de todos los candidatos de la lista aunque algunos tengan 0 votos. Usa la tool "${TOOL_NAME}" para reportar tu lectura.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
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
    const msg = err instanceof Error ? err.message : "Error interno al leer el acta.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
