import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/ultramsg";
import { supabase } from "@/lib/supabase";

// Respuestas automáticas de WhatsApp. UltraMsg llama a esta URL (webhook) cada
// vez que llega un mensaje — se revisa el texto contra cada regla, en orden, y
// se responde con la primera que coincida. Para agregar una respuesta nueva
// más adelante, solo hay que sumar un objeto a REGLAS.
const FICHA_INSCRIPCION_URL = "https://jesusmaldonadooficial.com/#personero";

// El link de Drive se configura como variable de entorno (DRIVE_REUNIONES_URL)
// en vez de quedar escrito en el código — así, cuando lo tengan, alguien lo
// agrega en Vercel sin depender de un nuevo cambio de código ni deploy. Si
// todavía no está configurado, esta regla simplemente no responde nada (mejor
// eso que mandar un mensaje con un link roto o "undefined").
const DRIVE_REUNIONES_URL = process.env.DRIVE_REUNIONES_URL;

interface Regla {
  id: string;
  patron: RegExp;
  respuesta: () => string | null;
  registrarComo?: "personero" | "simpatizante";
}

const REGLAS: Regla[] = [
  {
    id: "personero",
    // "personero", "personera", "personeros", "personeras".
    patron: /personer[oa]s?/i,
    respuesta: () =>
      "¡Hola! 👋 Para inscribirte como personero de campaña, completa esta ficha:\n" +
      `${FICHA_INSCRIPCION_URL}\n\n` +
      "En un momento un miembro del equipo te escribe si tienes otra consulta.",
    registrarComo: "personero",
  },
  {
    id: "reuniones",
    // "comuna"/"comunas" o "reunion(es)"/"reunión(es)" en cualquier parte del texto.
    patron: /\bcomunas?\b|reuni[oó]n(es)?/i,
    respuesta: () => {
      if (!DRIVE_REUNIONES_URL) return null;
      return (
        "Sii, aquí puedes ver la programación de reuniones por comuna:\n" +
        `${DRIVE_REUNIONES_URL}\n` +
        "Ubica la direccion mas cercana a la que puedas asistir según las fechas correspondientes del cronograma, te estaremos esperando."
      );
    },
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

  // Primera regla que coincida Y tenga una respuesta lista (ver DRIVE_REUNIONES_URL).
  let regla: Regla | undefined;
  let mensaje: string | null = null;
  for (const r of REGLAS) {
    if (r.patron.test(texto)) {
      const texto_respuesta = r.respuesta();
      if (texto_respuesta) { regla = r; mensaje = texto_respuesta; break; }
    }
  }

  if (!regla || !mensaje) {
    return NextResponse.json({ ok: true, skipped: "ninguna regla coincide" });
  }

  const telefono = extraerTelefono(data.from);
  if (!telefono) {
    return NextResponse.json({ ok: true, skipped: "sin remitente" });
  }

  try {
    await sendWhatsApp(telefono, mensaje);
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
