import { NextRequest, NextResponse } from "next/server";

const ACCOUNT_SID       = process.env.TWILIO_ACCOUNT_SID!;
const AUTH_TOKEN        = process.env.TWILIO_AUTH_TOKEN!;
const PHONE_NUMBER      = process.env.TWILIO_PHONE_NUMBER!;
const WHATSAPP_NUMBER   = process.env.TWILIO_WHATSAPP_NUMBER!;

// Asegura formato E.164 peruano: agrega +51 si el número no tiene código de país
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("51") && digits.length === 11) return `+${digits}`;
  if (digits.length === 9) return `+51${digits}`;
  if (digits.startsWith("1") && digits.length >= 10) return `+${digits}`;
  return `+${digits}`;
}

async function sendTwilioMessage(to: string, body: string, channel: "sms" | "whatsapp") {
  const from = channel === "whatsapp" ? `whatsapp:${WHATSAPP_NUMBER}` : PHONE_NUMBER;
  const toFormatted = channel === "whatsapp" ? `whatsapp:${to}` : to;

  const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toFormatted, From: from, Body: body }).toString(),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message ?? "Error Twilio");
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const { contactos, mensaje, canal } = await req.json() as {
      contactos: { nombre: string; telefono: string }[];
      mensaje: string;
      canal: "sms" | "whatsapp";
    };

    if (!mensaje?.trim())       return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    if (!contactos?.length)     return NextResponse.json({ error: "Sin contactos" }, { status: 400 });

    const resultados = await Promise.allSettled(
      contactos.map(async ({ nombre, telefono }) => {
        const numero = normalizePhone(telefono);
        await sendTwilioMessage(numero, mensaje, canal);
        return { nombre, telefono: numero };
      })
    );

    const enviados  = resultados.filter((r) => r.status === "fulfilled").length;
    const fallidos  = resultados
      .filter((r) => r.status === "rejected")
      .map((r, i) => ({
        nombre:  contactos[i]?.nombre,
        error:   (r as PromiseRejectedResult).reason?.message ?? "Error desconocido",
      }));

    return NextResponse.json({ enviados, fallidos, total: contactos.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
