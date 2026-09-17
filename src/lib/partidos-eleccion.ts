import { supabase } from "@/lib/supabase";

// La cédula de votación 2026 solo muestra el nombre del PARTIDO (no de los
// candidatos), y hay dos elecciones simultáneas con listas de partidos
// distintas: la del DISTRITO de San Juan de Lurigancho (SJL) — la que nos
// importa priorizar siempre — y la de la PROVINCIA de Lima Metropolitana.
export type Ambito = "sjl" | "lima";

export interface PartidoEleccion {
  id: string;
  ambito: Ambito;
  numero_lista: number;
  nombre: string;
  orden: number;
}

// partidos_eleccion es la fuente de verdad (tabla en Supabase) — así se puede
// corregir un nombre de partido o desactivarlo sin redesplegar código.
export async function fetchPartidosActivos(): Promise<PartidoEleccion[]> {
  const { data, error } = await supabase
    .from("partidos_eleccion")
    .select("id, ambito, numero_lista, nombre, orden")
    .eq("activo", true)
    .order("ambito", { ascending: true })
    .order("orden", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PartidoEleccion[];
}

export function agruparPorAmbito(partidos: PartidoEleccion[]): Record<Ambito, PartidoEleccion[]> {
  return {
    sjl: partidos.filter((p) => p.ambito === "sjl"),
    lima: partidos.filter((p) => p.ambito === "lima"),
  };
}

export const AMBITO_LABEL: Record<Ambito, string> = {
  sjl: "San Juan de Lurigancho (Distrito)",
  lima: "Lima Metropolitana (Provincia)",
};
