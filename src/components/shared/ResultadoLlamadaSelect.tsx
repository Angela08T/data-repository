"use client";

import { useState } from "react";

// Lista única de resultados de llamada, compartida por Personeros, Ciudadanos,
// Corredores, Dirigentes y Participantes de Actividades — así el callcenter usa
// el mismo criterio en todas las listas y agregar una opción nueva se hace en un
// solo lugar.
export const OPCIONES_RESULTADO_LLAMADA = [
  "No contesta",
  "Rpta. positiva",
  "Rpta. negativa",
  "No es de SJL",
  "Colgó",
  "Dejó mensaje de WhatsApp",
  "Vota en provincia",
  "Número sin servicio",
  "Número equivocado",
  "Es jurado electoral",
  "Indeciso",
  "No tiene WhatsApp",
  "No quiere ser personero",
  "Ocupado",
  "Pendiente",
  "Discapacitado",
] as const;

interface Props {
  value: string | null;
  onSave: (nuevo: string | null) => Promise<string | null>;
}

// Select siempre visible (no requiere clic para "entrar en modo edición") que
// guarda apenas cambia la opción. Devuelve el borde en rojo unos segundos si
// onSave falla, para que quede claro que no se guardó.
export default function ResultadoLlamadaSelect({ value, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevo = e.target.value || null;
    setSaving(true);
    const err = await onSave(nuevo);
    setSaving(false);
    if (err) {
      setError(true);
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <select
      value={value ?? ""}
      disabled={saving}
      onChange={handleChange}
      className="text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer w-full transition-colors"
      style={{
        backgroundColor: "#121a30",
        color: value ? "#eef2ff" : "#64748b",
        border: error ? "1px solid #dc2626" : "1px solid rgba(148,163,184,0.25)",
        maxWidth: 180,
      }}
    >
      <option value="">— Sin registrar —</option>
      {OPCIONES_RESULTADO_LLAMADA.map((op) => (
        <option key={op} value={op}>{op}</option>
      ))}
    </select>
  );
}
