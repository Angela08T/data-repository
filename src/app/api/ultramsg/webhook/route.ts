import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp, sendImage } from "@/lib/ultramsg";
import { supabase } from "@/lib/supabase";

// Respuestas automáticas de WhatsApp. UltraMsg llama a esta URL (webhook) cada
// vez que llega un mensaje — se revisa el texto contra cada regla, EN ORDEN, y
// se responde con la primera que coincida y tenga algo listo para mandar. Para
// agregar una respuesta nueva más adelante, alcanza con sumar un objeto a REGLAS.
const FICHA_INSCRIPCION_URL = "https://jesusmaldonadooficial.com/#personero";

// Dominio público de esta misma app, para armar URLs absolutas de imágenes
// (UltraMsg necesita poder descargarlas, no le sirve una ruta relativa). Si el
// dominio cambiara, se ajusta con la variable de entorno NEXT_PUBLIC_SITE_URL
// en vez de tocar código.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://data-repository-eight.vercel.app";
const MAPA_COMUNAS_URL = `${SITE_URL}/mapa-comuna.jpg`;

// La programación de reuniones es una imagen (cronograma semanal), no un link
// de Drive — vive en /public igual que el mapa de comunas.
const PROGRAMACION_REUNIONES_URL = `${SITE_URL}/programacion-reuniones.png`;
const CAPTION_REUNIONES =
  "Sii, aquí puedes ver la programación de reuniones por comuna.\n" +
  "Ubica la dirección más cercana a la que puedas asistir según las fechas correspondientes del cronograma, te estaremos esperando.";

type Accion =
  | { tipo: "texto"; mensaje: string }
  | { tipo: "imagen"; url: string; caption?: string };

interface Regla {
  id: string;
  patron: RegExp;
  // Devuelve las acciones a mandar, en orden (ej. imagen y luego texto). Un
  // arreglo vacío/null significa "esta regla coincide pero no tiene nada listo
  // para responder todavía" (ej. falta configurar un link) — se sigue probando
  // con la siguiente regla.
  acciones: () => Accion[] | null;
  registrarComo?: "personero" | "simpatizante";
}

const REGLAS: Regla[] = [
  {
    id: "personero",
    // "personero", "personera", "personeros", "personeras".
    patron: /personer[oa]s?/i,
    // El link del grupo de WhatsApp ya no se manda acá — ahora va incluido en
    // el mensaje predeterminado del envío masivo desde la página de Personeros,
    // así que llega junto con el primer comunicado en vez de por separado.
    acciones: () => [{
      tipo: "texto",
      mensaje:
        "¡Hola! 👋 Para inscribirte como personero de campaña, completa esta ficha:\n" +
        `${FICHA_INSCRIPCION_URL}\n\n` +
        "En un momento un miembro del equipo te escribe si tienes otra consulta.",
    }],
    registrarComo: "personero",
  },
  {
    id: "duda_comuna",
    // Preguntas de quien NO sabe a qué comuna pertenece: "no sé de qué comuna
    // soy", "no sé mi comuna", "a qué comuna pertenezco", "cuál es mi comuna",
    // "qué comuna me toca". Va antes que la regla general de "comuna" porque es
    // más específica (si no, nunca se alcanzaría a evaluar).
    patron: /no\s+s[eé].*comuna|a\s+qu[eé]\s+comuna|cu[aá]l\s+es\s+mi\s+comuna|qu[eé]\s+comuna\s+(me\s+toca|soy|pertenezco)/i,
    acciones: () => [
      { tipo: "imagen", url: MAPA_COMUNAS_URL, caption: "Busca en el mapa a qué comuna o zona perteneces." },
      { tipo: "imagen", url: PROGRAMACION_REUNIONES_URL, caption: CAPTION_REUNIONES },
    ],
  },
  {
    id: "reuniones",
    // Ya sabe su comuna (la menciona directo, ej. "vivo en la comuna 2") o
    // pregunta directo por la reunión — acá solo va la imagen de programación.
    patron: /\bcomunas?\b|reuni[oó]n(es)?/i,
    acciones: () => [{ tipo: "imagen", url: PROGRAMACION_REUNIONES_URL, caption: CAPTION_REUNIONES }],
  },
];

// Protege el webhook: sin este secreto en la URL, cualquiera podría llamarlo y
// hacer que la cuenta de WhatsApp mande mensajes. Se configura como query param
// al pegar la URL en UltraMsg (ver instrucciones).
const WEBHOOK_SECRET = process.env.ULTRAMSG_WEBHOOK_SECRET;

interface UltraMsgWebhookBody {
  event_type?: string;
  instanceId?: string;
  data?: {
    id?: string;
    from?: string;
    to?: string;
    body?: string;
    fromMe?: boolean;
    self?: boolean;
    isGroupMsg?: boolean;
    isGroup?: boolean;
    pushname?: string;
    type?: string;
  };
}

function extraerTelefono(from?: string): string | null {
  if (!from) return null;
  // UltraMsg manda el remitente como "51987654321@c.us" (o "...@g.us" en grupos).
  const digits = from.split("@")[0].replace(/\D/g, "");
  return digits ? `+${digits}` : null;
}

export async function POST(req: NextRequest) {
  // Verificación del secreto — si no coincide, no se procesa nada (pero se
  // responde 200 igual para que UltraMsg no lo reintente sin parar).
  if (WEBHOOK_SECRET) {
    const secretoRecibido = req.nextUrl.searchParams.get("secret");
    if (secretoRecibido !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "secreto inválido" }, { status: 200 });
    }
  }

  let payload: UltraMsgWebhookBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 200 });
  }

  const data = payload.data;

  // Solo reacciona a mensajes entrantes reales de texto: no a los que manda la
  // propia cuenta (fromMe/self — si no, el bot terminaría respondiéndose a sí
  // mismo), ni a mensajes de grupo, ni a otros tipos de evento (ack, etc.).
  if (!data || data.fromMe || data.self || data.isGroupMsg || data.isGroup) {
    return NextResponse.json({ ok: true, skipped: "no aplica" });
  }

  const texto = (data.body ?? "").trim();
  if (!texto) {
    return NextResponse.json({ ok: true, skipped: "mensaje vacío" });
  }

  // Primera regla que coincida Y tenga al menos una acción lista para mandar.
  let regla: Regla | undefined;
  let acciones: Accion[] | null = null;
  for (const r of REGLAS) {
    if (r.patron.test(texto)) {
      const listas = r.acciones();
      if (listas && listas.length > 0) { regla = r; acciones = listas; break; }
    }
  }

  if (!regla || !acciones) {
    return NextResponse.json({ ok: true, skipped: "ninguna regla coincide" });
  }

  const telefono = extraerTelefono(data.from);
  if (!telefono) {
    return NextResponse.json({ ok: true, skipped: "sin remitente" });
  }

  try {
    // En orden (no en paralelo): si es imagen + texto, WhatsApp debe mostrarlos
    // en ese orden, uno detrás del otro.
    for (const accion of acciones) {
      if (accion.tipo === "imagen") await sendImage(telefono, accion.url, accion.caption);
      else await sendWhatsApp(telefono, accion.mensaje);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error desconocido";
    // Se responde 200 igual: un fallo de envío no es algo que UltraMsg deba
    // reintentar (reintentaría el webhook, no el envío).
    return NextResponse.json({ ok: false, error: `No se pudo responder: ${msg}` });
  }

  // Registro best-effort en "Contactos del Chat" para que este lead quede
  // visible junto a los demás contactos del chatbot. Si la tabla no acepta
  // inserts desde acá (permisos), no debe romper la respuesta automática.
  if (regla.registrarComo) {
    try {
      await supabase.from("contactos_chat").insert({
        nombre: data.pushname?.trim() || "Contacto WhatsApp",
        apellido_paterno: "",
        apellido_materno: "",
        telefono,
        tipo: regla.registrarComo,
      });
    } catch {
      // silencioso a propósito
    }
  }

  return NextResponse.json({ ok: true, regla: regla.id, respondido: telefono });
}
