/**
 * Siglas urbanas que deben preservarse en mayúsculas al formatear direcciones.
 */
const SIGLAS_URBANAS = new Set([
  "MZ",
  "LT",
  "AA.HH",
  "AA.FF",
  "JR",
  "AV",
  "CA",
  "PSJ",
  "URB",
  "APV",
  "ASOC",
  "COOP",
  "PP.JJ",
  "P.J",
  "SN",
  "S/N",
  "AAHH",
  "INT",
  "DPTO",
  "BLQ",
  "PISO",
  "SEC",
  "GRP",
  "CALLE",
  "PASAJE",
  "ALAMEDA",
  "JIRON",
  "AVENIDA",
]);

/**
 * Convierte un string a Title Case respetando caracteres españoles.
 *
 * @example
 * toTitleCase("JUAN CARLOS PÉREZ") // "Juan Carlos Pérez"
 * toTitleCase("maría josé") // "María José"
 */
export function toTitleCase(str: string): string {
  if (!str) return str;

  return str
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

/**
 * Aplica Title Case a una dirección preservando siglas urbanas en mayúsculas.
 *
 * @example
 * formatDireccion("MZ A LT 5 AA.HH LOS JARDINES") // "Mz A Lt 5 AA.HH Los Jardines"
 * formatDireccion("AV LOS INCAS 123 URB SANTA ROSA") // "Av Los Incas 123 URB Santa Rosa"
 */
export function formatDireccion(str: string): string {
  if (!str) return str;

  return str
    .split(/\s+/)
    .map((word) => {
      if (SIGLAS_URBANAS.has(word.toUpperCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// ─── Fechas y Edades ────────────────────────────────────────────────────────

/**
 * Calcula la edad en años a partir de una fecha de nacimiento.
 * Usa métodos UTC para evitar errores de zona horaria.
 */
export function calcularEdad(fechaNacimiento: string | null | undefined): number {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const mes = hoy.getUTCMonth() - nacimiento.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) edad--;
  return edad;
}

/**
 * Formatea una fecha ISO a DD/MM/YYYY usando UTC para evitar desfases.
 * Retorna "-" si la fecha es nula o vacía.
 */
export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return "-";
  const d = new Date(fecha);
  return `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}/${d.getUTCFullYear()}`;
}

// ─── Teléfonos ───────────────────────────────────────────────────────────────

/**
 * Normaliza un número de teléfono peruano agregando el prefijo +51.
 * Retorna "-" si el valor es nulo o vacío.
 */
export function formatearTelefono(telefono: string | null | undefined): string {
  if (!telefono || !telefono.trim()) return "-";
  const t = telefono.trim();
  if (t.startsWith("+51")) return t;
  if (t.startsWith("51") && t.length >= 11) return `+${t}`;
  return `+51${t}`;
}

// ─── Meses ───────────────────────────────────────────────────────────────────

/** Array de nombres de meses en español (índice 0 = Enero). */
export const MESES_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Array de objetos { value: 1..12, label: "Enero".."Diciembre" } para selects. */
export const MESES = MESES_LABELS.map((label, i) => ({ value: i + 1, label }));
