// Motivos al eliminar un personero de la lista general — compartido entre el
// diálogo de borrado (Personeros) y el listado de archivados (Eliminados),
// para que el value guardado en personeros_eliminados.motivo_eliminacion y su
// etiqueta/color se mantengan consistentes en los dos lugares.
export interface MotivoEliminacion {
  value: string;
  label: string;
  color: string;
}

export const MOTIVOS_ELIMINACION: MotivoEliminacion[] = [
  { value: "duplicado", label: "Duplicado", color: "#f59e0b" },
  { value: "triplicado", label: "Triplicado", color: "#f97316" },
  { value: "cuadriplicado", label: "Cuadriplicado", color: "#ef4444" },
  { value: "respuesta_negativa", label: "Respuesta negativa", color: "#dc2626" },
  { value: "otro", label: "Otro", color: "#64748b" },
];

export function motivoInfo(value?: string | null): MotivoEliminacion {
  return MOTIVOS_ELIMINACION.find((m) => m.value === value) ?? { value: value ?? "", label: value || "—", color: "#94a3b8" };
}
