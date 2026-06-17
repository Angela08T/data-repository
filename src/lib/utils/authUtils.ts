import type { MeResponse } from "@/types/auth";
import { SubgerenciaType } from "@/lib/constants";

// Mapeo entre nombres de módulos en la BD y permisos del frontend
const MODULE_TO_PERMISSION: Record<string, string> = {
  "PVL":                   "pvl",
  "OMAPED":                "omaped",
  "PANTBC":                "pantbc",
  "CIAM":                  "ciam",
  "ULE":                   "ule",
  "Ollas Comunes":         "ollas_comunes",
  "Comedores Populares":   "comedores_populares",
  "PARTICIPACION VECINAL": "participacion_ciudadana",
  "CULTURA Y DEPORTE":     "servicios_deporte",
  "COMPROMISO I":          "salud",
  "SUP":                   "apoyo",
};

const SERVICIOS_MODULES_DB = [
  "PARTICIPACION VECINAL",
  "CULTURA Y DEPORTE",
  "COMPROMISO I",
  "SUP",
];

export function mapMeResponseToModuleAbilities(meData: MeResponse): Record<string, string[]> {
  if (meData.is_super) return {};
  const result: Record<string, string[]> = {};
  for (const m of meData.modules) {
    if (m.name) result[m.name] = m.abilities;
  }
  return result;
}

export function mapMeResponseToPermissions(meData: MeResponse): string[] {
  if (meData.is_super) return ["all"];

  const role = (meData.role ?? "").toUpperCase();

  if (role.includes("SUBGERENTE") && role.includes("PROGRAMAS")) {
    return ["all_programas_sociales", "mapa_programas_sociales"];
  }
  if (role.includes("SUBGERENTE") && role.includes("SERVICIOS")) {
    return ["all_servicios_sociales", "mapa_servicios_sociales"];
  }

  const perms: string[] = meData.modules
    .filter((m) => m.name)
    .map((m) => {
      const name = m.name as string;
      return MODULE_TO_PERMISSION[name] ?? name.toLowerCase().replace(/\s+/g, "_");
    });

  // Si todos los módulos son solo de lectura, agregar permiso readonly
  const allReadOnly =
    perms.length > 0 &&
    meData.modules.every(
      (m) => m.abilities.length === 1 && m.abilities[0] === "READ"
    );
  if (allReadOnly) perms.push("readonly");

  return perms;
}

export function determineSubgerencia(
  meData: MeResponse,
  loginSubgerencia: SubgerenciaType
): SubgerenciaType {
  if (meData.is_super) return loginSubgerencia;

  const role = (meData.role ?? "").toUpperCase();
  if (role.includes("SERVICIOS")) return SubgerenciaType.SERVICIOS_SOCIALES;
  if (role.includes("PROGRAMAS")) return SubgerenciaType.PROGRAMAS_SOCIALES;

  const serviciosModules = meData.modules.filter(
    (m) => m.name && SERVICIOS_MODULES_DB.includes(m.name)
  );
  const programasModules = meData.modules.filter(
    (m) => m.name && !SERVICIOS_MODULES_DB.includes(m.name)
  );

  // Solo servicios → servicios sociales
  if (serviciosModules.length > 0 && programasModules.length === 0)
    return SubgerenciaType.SERVICIOS_SOCIALES;
  // Solo programas → programas sociales
  if (programasModules.length > 0 && serviciosModules.length === 0)
    return SubgerenciaType.PROGRAMAS_SOCIALES;

  // Ambas o ninguna → respetar el login page que usó el usuario
  return loginSubgerencia;
}

export function getRoleDisplayName(role: string | null): string {
  if (!role) return "Operador";
  const names: Record<string, string> = {
    ADMIN:       "Administrador del Sistema",
    PVL:         "Operador PVL",
    OMAPED:      "Operador OMAPED",
    PANTBC:      "Operador PANTBC",
    CIAM:        "Operador CIAM",
    ULE:         "Operador ULE",
    OLLAS:       "Operador Ollas Comunes",
    COMEDORES:   "Operador Comedores Populares",
  };
  return names[role.toUpperCase()] ?? role;
}
