"use client";

import { useState, useEffect, useRef } from "react";

interface OpcionSelect {
  value: string;
  label: string;
}

interface EditableCellProps {
  value: string;
  displayValue?: React.ReactNode;
  editable: boolean;
  type?: "text" | "select";
  options?: OpcionSelect[];
  sanitize?: (raw: string) => string;
  align?: "left" | "center" | "right";
  onSave: (newValue: string) => Promise<string | null>;
}

// Celda de tabla que se vuelve editable con un clic (solo si `editable` es true).
// Guarda al perder el foco o con Enter; Escape cancela sin guardar.
export default function EditableCell({
  value, displayValue, editable, type = "text", options, sanitize, align = "left", onSave,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLSelectElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    const err = await onSave(draft);
    setSaving(false);
    setEditing(false);
    if (err) {
      setError(true);
      setDraft(value);
      setTimeout(() => setError(false), 2500);
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const contenido = displayValue ?? (value || "—");

  if (!editable) {
    return <span className="text-sm text-[#cbd5e1] block" style={{ textAlign: align }}>{contenido}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Clic para editar"
        className="block w-full rounded px-1 -mx-1 hover:bg-[rgba(59,130,246,0.10)] transition-colors cursor-text"
        style={{ textAlign: align, border: error ? "1px solid #dc2626" : "1px solid transparent" }}
      >
        {contenido}
      </button>
    );
  }

  // Los <select>/<input> nativos no heredan el tema oscuro de MUI, así que se les
  // fija fondo y texto a mano — de lo contrario aparecen en blanco (fondo por
  // defecto del navegador) sobre la fila oscura mientras se edita la celda.
  if (type === "select") {
    return (
      <select
        ref={ref}
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
        className="text-sm border rounded px-1 py-0.5 w-full outline-none"
        style={{ borderColor: "#3b82f6", textAlign: align, backgroundColor: "#121a30", color: "#eef2ff" }}
      >
        {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  return (
    <input
      ref={ref}
      type="text"
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(sanitize ? sanitize(e.target.value) : e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") cancel();
      }}
      className="text-sm border rounded px-1.5 py-0.5 w-full outline-none"
      style={{ borderColor: "#3b82f6", textAlign: align, backgroundColor: "#121a30", color: "#eef2ff" }}
    />
  );
}
