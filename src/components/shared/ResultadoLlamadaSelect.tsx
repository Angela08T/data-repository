"use client";

import { useState } from "react";
import { Select, MenuItem, type SelectChangeEvent } from "@mui/material";

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

// Select de MUI (no el <select> nativo del navegador): el menú desplegable nativo
// no se puede maquetar — hereda el estilo genérico y minúsculo del sistema
// operativo. Con MUI el menú es un Paper propio, así que se le puede dar tamaño
// de letra, espaciado y colores legibles a juego con el tema oscuro.
export default function ResultadoLlamadaSelect({ value, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const handleChange = async (e: SelectChangeEvent) => {
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
    <Select
      value={value ?? ""}
      onChange={handleChange}
      disabled={saving}
      displayEmpty
      size="small"
      renderValue={(v) =>
        v ? v : <span style={{ color: "#64748b" }}>— Sin registrar —</span>
      }
      sx={{
        fontSize: "0.8rem",
        minWidth: 168,
        maxWidth: 190,
        borderRadius: "10px",
        color: value ? "#eef2ff" : "#64748b",
        backgroundColor: "#121a30",
        "& .MuiSelect-select": { py: 0.9, px: 1.5 },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: error ? "#dc2626" : "rgba(148,163,184,0.25)",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: error ? "#dc2626" : "#3b82f6",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "#3b82f6",
        },
      }}
      MenuProps={{
        PaperProps: {
          sx: {
            bgcolor: "#121a30",
            backgroundImage: "none",
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: "12px",
            mt: 0.5,
            boxShadow: "0 16px 40px rgba(2,6,23,0.55)",
            "& .MuiMenuItem-root": {
              fontSize: "0.85rem",
              py: 1,
              px: 2,
              color: "#cbd5e1",
              "&:hover": { backgroundColor: "rgba(59,130,246,0.14)" },
              "&.Mui-selected": { backgroundColor: "rgba(59,130,246,0.22)", color: "#eef2ff", fontWeight: 600 },
              "&.Mui-selected:hover": { backgroundColor: "rgba(59,130,246,0.28)" },
            },
          },
        },
      }}
    >
      <MenuItem value="">
        <span style={{ color: "#64748b" }}>— Sin registrar —</span>
      </MenuItem>
      {OPCIONES_RESULTADO_LLAMADA.map((op) => (
        <MenuItem key={op} value={op}>{op}</MenuItem>
      ))}
    </Select>
  );
}
