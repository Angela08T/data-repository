import { useMemo } from "react";
import { toTitleCase, formatDireccion } from "@/lib/utils/formatters";

const SKIP_KEYS_PATTERN =
  /id|dni|code|codigo|phone|telefono|fsu|s100|email|ruc|modulo|modality|format|level|situation|route|rol|estado|status|type|sex/i;

const ADDRESS_KEYS_PATTERN = /direccion|domicilio|address/i;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;
// Patrón para detectar códigos/enum: con guiones bajos O solo números/letras sin espacios
const ENUM_VALUE_PATTERN = /^[A-Z0-9_]+$/;

function shouldSkipValue(value: string, key: string): boolean {
  // Si el valor es muy corto (<=2 chars), probablemente sea una sigla
  if (value.length <= 2) return true;

  // Si es una fecha ISO, no formatear
  if (ISO_DATE_PATTERN.test(value)) return true;

  // Si el valor NO tiene espacios Y es solo mayúsculas/números/guiones bajos
  // probablemente sea un código o enum (ej: "STATUS_ACTIVE", "TIPO_A", "PVL")
  if (!value.includes(" ") && ENUM_VALUE_PATTERN.test(value)) {
    // PERO si es un campo de nombre, formatear de todas formas
    const isNameField = /name|nombre|apellido|lastname/i.test(key);
    if (isNameField) return false; // No saltear, formatear nombres aunque sean mayúsculas
    return true; // Saltear si no es campo de nombre
  }

  return false;
}

function formatRecord<T extends object>(obj: T): T {
  const result = { ...obj } as Record<string, unknown>;

  for (const key in result) {
    const value = result[key];

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result[key] = formatRecord(value as Record<string, unknown>);
      continue;
    }

    if (typeof value !== "string") continue;
    if (SKIP_KEYS_PATTERN.test(key)) continue;

    // Los campos de nombre SIEMPRE se formatean, sin importar el valor
    const isNameField = /name|nombre|apellido|lastname|entidad/i.test(key);
    if (isNameField) {
      console.log(`🔄 Formateando campo "${key}": "${value}" → "${toTitleCase(value)}"`);
      result[key] = toTitleCase(value);
      continue;
    }

    // Para otros campos, aplicar las reglas normales
    if (shouldSkipValue(value, key)) continue;

    result[key] = ADDRESS_KEYS_PATTERN.test(key)
      ? formatDireccion(value)
      : toTitleCase(value);
  }

  return result as T;
}

/**
 * Hook que formatea automáticamente los strings de un array de datos para tabla.
 *
 * - Convierte nombres a Title Case
 * - Preserva siglas urbanas en direcciones
 * - Excluye DNIs, teléfonos, códigos, IDs, fechas ISO y valores cortos (≤3 chars)
 * - Procesa objetos anidados recursivamente
 *
 * @example
 * const formattedData = useFormatTableData(beneficiarios);
 */
export function useFormatTableData<T extends object>(data: T[]): T[] {
  return useMemo(() => data.map(formatRecord), [data]);
}
