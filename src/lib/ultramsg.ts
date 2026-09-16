// Cliente mínimo de UltraMsg (WhatsApp) — usado tanto para el envío manual desde
// el panel (/api/twilio/send) como para la respuesta automática del webhook
// (/api/ultramsg/webhook), para no duplicar esta llamada en los dos lugares.

const UM_INSTANCE = process.env.ULTRAMSG_INSTANCE_ID!;
const UM_TOKEN     = process.env.ULTRAMSG_TOKEN!;

// Normaliza a formato internacional E.164. Sin prefijo se asume Perú (+51).
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("51") && digits.length === 11) return `+${digits}`;
  if (digits.length === 9) return `+51${digits}`;
  if (digits.startsWith("1") && digits.length >= 10) return `+${digits}`;
  return `+${digits}`;
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const response = await fetch(
    `https://api.ultramsg.com/${UM_INSTANCE}/messages/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: UM_TOKEN, to, body }).toString(),
    }
  );
  const data = await response.json();
  if (!response.ok || data?.sent === "false" || data?.error) {
    throw new Error(data?.error ?? data?.message ?? "Error UltraMsg");
  }
}

// imageUrl debe ser una URL pública (UltraMsg la descarga desde ahí) — por eso
// las imágenes que se mandan automáticamente viven en /public de este mismo
// proyecto en vez de subirse a otro lado.
export async function sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
  const response = await fetch(
    `https://api.ultramsg.com/${UM_INSTANCE}/messages/image`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: UM_TOKEN, to, image: imageUrl, caption: caption ?? "" }).toString(),
    }
  );
  const data = await response.json();
  if (!response.ok || data?.sent === "false" || data?.error) {
    throw new Error(data?.error ?? data?.message ?? "Error UltraMsg (imagen)");
  }
}
