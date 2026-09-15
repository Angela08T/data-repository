import { NextRequest, NextResponse } from "next/server";
import { normalizePhone, sendWhatsApp } from "@/lib/ultramsg";

// Twilio (SMS)
const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_TOKEN  = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_FROM   = process.env.TWILIO_PHONE_NUMBER!;

async function sendSMS(to: string, body: string): Promise<void> {
  const credentials = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }).toString(),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message ?? "Error SMS");
}

export async function POST(req: NextRequest) {
  try {
    const { contactos, mensaje, canal } = await req.json() as {
      contactos: { nombre: string; telefono: string }[];
      mensaje: string;
      canal: "sms" | "whatsapp";
    };

    if (!mensaje?.trim())   return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    if (!contactos?.length) return NextResponse.json({ error: "Sin contactos" }, { status: 400 });

    const resultados = await Promise.allSettled(
      contactos.map(async ({ nombre, telefono }) => {
        const numero = normalizePhone(telefono);
        if (canal === "whatsapp") {
          await sendWhatsApp(numero, mensaje);
        } else {
          await sendSMS(numero, mensaje);
        }
        return { nombre, telefono: numero };
      })
    );

    const enviados = resultados.filter((r) => r.status === "fulfilled").length;
    const fallidos = resultados
      .filter((r) => r.status === "rejected")
      .map((r, i) => ({
        nombre: contactos[i]?.nombre,
        error:  (r as PromiseRejectedResult).reason?.message ?? "Error desconocido",
      }));

    return NextResponse.json({ enviados, fallidos, total: contactos.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
