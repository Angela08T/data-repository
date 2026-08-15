import { supabase } from "@/lib/supabase";

export interface CandidatoAlcaldia {
  id: string;
  partido: string;
  nombre: string;
  numero_lista: number;
  orden: number;
}

// candidatos_alcaldia es la fuente de verdad (tabla en Supabase, no una lista
// hardcodeada) — así se puede editar/desactivar un candidato sin redesplegar.
export async function fetchCandidatosActivos(): Promise<CandidatoAlcaldia[]> {
  const { data, error } = await supabase
    .from("candidatos_alcaldia")
    .select("id, partido, nombre, numero_lista, orden")
    .eq("activo", true)
    .not("numero_lista", "is", null)
    .order("orden", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CandidatoAlcaldia[];
}
