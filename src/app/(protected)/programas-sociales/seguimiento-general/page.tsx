"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress, TablePagination, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { supabase } from "@/lib/supabase";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import GroupsIcon from "@mui/icons-material/Groups";
import LayersIcon from "@mui/icons-material/Layers";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ResultadoLlamadaSelect, { OPCIONES_RESULTADO_LLAMADA } from "@/components/shared/ResultadoLlamadaSelect";
import EditableCell from "@/components/personeros/EditableCell";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type TablaOrigen = "personeros" | "ciudadanos" | "corredores" | "dirigentes" | "participantes_actividades";

// Fila cruda tal como viene de cada tabla de origen — solo las columnas que
// necesitamos para esta vista, sin tocar ni recalcular nada de sus datos.
interface PersoneroRow { id: string; nombres: string | null; apellido_paterno: string | null; apellido_materno: string | null; dni: string | null; telefono: string | null; comuna: string | null; llamado: boolean | null; resultado_llamada: string | null; }
interface CiudadanoRow { id: string; nombres: string | null; apellido_paterno: string | null; apellido_materno: string | null; dni: string | null; telefono: string | null; comuna: string | null; llamado: boolean | null; resultado_llamada: string | null; }
interface CorredorRow { id: string; nombre_completo: string | null; dni: string | null; telefono: string | null; llamado: boolean | null; resultado_llamada: string | null; }
interface DirigenteRow { id: string; nombre: string | null; apellido: string | null; dni: string | null; comuna: string | null; celular: string | null; llamado: boolean | null; resultado_llamada: string | null; }
interface ParticipanteRow { id: string; nombre_completo: string | null; dni: string | null; telefono: string | null; comuna: string | null; llamado: boolean | null; resultado_llamada: string | null; }

// Forma común a la que se normaliza cada fila de origen, sea cual sea su tabla.
interface FilaOrigen {
  tabla: TablaOrigen;
  id: string;
  nombreCompleto: string;
  dni: string | null;
  telefono: string | null;
  comuna: string | null;
  llamado: boolean;
  resultado_llamada: string | null;
}

// Una persona ya fusionada: puede venir de una sola fila de origen o de varias
// (misma persona registrada en más de una sección, o duplicada dentro de la
// misma sección) — "secciones" guarda cada fila real para poder actualizarlas
// todas cuando se cambia el resultado desde acá.
interface RegistroUnificado {
  key: string;
  nombreCompleto: string;
  dni: string | null;
  telefono: string | null;
  comuna: string | null;
  llamado: boolean;
  resultado_llamada: string | null;
  secciones: { tabla: TablaOrigen; id: string }[];
}

const SECCION_INFO: Record<TablaOrigen, { label: string; color: string }> = {
  personeros: { label: "Personero", color: "#3b82f6" },
  ciudadanos: { label: "Ciudadano", color: "#16a34a" },
  corredores: { label: "Corredor", color: "#d97706" },
  dirigentes: { label: "Dirigente", color: "#7c3aed" },
  participantes_actividades: { label: "Participante", color: "#db2777" },
};

const TODAS_LAS_TABLAS: TablaOrigen[] = ["personeros", "ciudadanos", "corredores", "dirigentes", "participantes_actividades"];

// Personeros y Ciudadanos separan el nombre en 3 columnas (nombres/apellido
// paterno/apellido materno) y Dirigentes en 2 (nombre/apellido); no hay forma
// segura de repartir un "nombre completo" editado entre esas columnas sin
// arriesgarse a desordenar los datos. Por eso el nombre solo se deja editar
// cuando la persona tiene alguna fila en una tabla que lo guarda en un solo
// campo de texto (nombre_completo).
const TABLAS_CON_NOMBRE_UNICO = new Set<TablaOrigen>(["corredores", "participantes_actividades"]);

// Comuna sí es un solo campo de texto en todas las tablas que lo tienen —
// Corredores es la única de las 5 que no tiene columna de comuna.
const TABLAS_CON_COMUNA = new Set<TablaOrigen>(["personeros", "ciudadanos", "dirigentes", "participantes_actividades"]);

function hasPhone(telefono?: string | null): boolean {
  return !!telefono && telefono !== "EMPTY";
}

// Supabase/PostgREST limita cada consulta a 1000 filas; se pagina con .range()
// hasta traer todo — igual que en cada listado individual. Se ordena por "id"
// (columna que siempre existe) para que la paginación sea determinística.
async function fetchTodos<T>(tabla: TablaOrigen, select: string): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const todos: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(tabla)
      .select(select)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`${SECCION_INFO[tabla].label}: ${error.message}`);
    const lote = (data as T[]) ?? [];
    todos.push(...lote);
    if (lote.length === 0) break;
    from += lote.length;
  }
  return todos;
}

// El DNI es el único identificador confiable entre las 5 secciones. Una fila
// sin DNI (por ejemplo, un Dirigente o Participante al que todavía no se le
// completó el dato) queda sola en su propio registro hasta que alguien le
// agregue el DNI desde esta misma pantalla — ahí se fusiona sola en el
// siguiente refresco.
function normalizarDni(dni?: string | null): string | null {
  const limpio = (dni ?? "").replace(/\D/g, "");
  return limpio.length >= 6 ? limpio : null;
}

function agruparPorPersona(filas: FilaOrigen[]): RegistroUnificado[] {
  const grupos = new Map<string, FilaOrigen[]>();
  filas.forEach((f) => {
    const key = normalizarDni(f.dni) ?? `${f.tabla}:${f.id}`;
    const arr = grupos.get(key);
    if (arr) arr.push(f);
    else grupos.set(key, [f]);
  });

  return Array.from(grupos.entries()).map(([key, grupo]) => {
    // El nombre mostrado prioriza una fila editable (nombre_completo en un solo
    // campo) cuando existe, para que lo que se ve sea siempre lo mismo que se
    // puede editar — si no hay ninguna, se muestra la primera que tenga nombre
    // (aunque esa no se pueda editar desde acá).
    const conNombre = grupo.find((f) => TABLAS_CON_NOMBRE_UNICO.has(f.tabla) && f.nombreCompleto.trim())
      ?? grupo.find((f) => f.nombreCompleto.trim())
      ?? grupo[0];
    const conDni        = grupo.find((f) => f.dni);
    const conTelefono   = grupo.find((f) => f.telefono);
    const conComuna     = grupo.find((f) => f.comuna);
    const conResultado  = grupo.find((f) => f.resultado_llamada);
    return {
      key,
      nombreCompleto: conNombre.nombreCompleto || "—",
      dni: conDni?.dni ?? null,
      telefono: conTelefono?.telefono ?? null,
      comuna: conComuna?.comuna ?? null,
      llamado: grupo.some((f) => f.llamado),
      resultado_llamada: conResultado?.resultado_llamada ?? null,
      secciones: grupo.map((f) => ({ tabla: f.tabla, id: f.id })),
    };
  });
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="stat-card glow-card rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold" style={{ color: "#eef2ff" }}>{value}</p>
      </div>
    </div>
  );
}

// Leyenda de colores: los mismos que usan las etiquetas de "Sección" y el avatar
// de cada fila, para que se entienda de un vistazo qué color es cada lista.
function LeyendaSecciones() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
      {TODAS_LAS_TABLAS.map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "#94a3b8" }}>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: SECCION_INFO[t].color }} />
          {SECCION_INFO[t].label}
        </span>
      ))}
    </div>
  );
}

function SeccionBadges({ secciones }: { secciones: { tabla: TablaOrigen; id: string }[] }) {
  const unicas = Array.from(new Set(secciones.map((s) => s.tabla)));
  return (
    <div className="flex flex-wrap gap-1">
      {unicas.map((tabla) => (
        <span key={tabla}
          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `${SECCION_INFO[tabla].color}22`, color: SECCION_INFO[tabla].color }}>
          {SECCION_INFO[tabla].label}
        </span>
      ))}
    </div>
  );
}

export default function SeguimientoGeneralPage() {
  const [data, setData]       = useState<RegistroUnificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [errores, setErrores] = useState<string[]>([]);
  const [search, setSearch]   = useState("");
  const [filtroSeccion, setFiltroSeccion]     = useState<"todos" | TablaOrigen>("todos");
  const [filtroResultado, setFiltroResultado] = useState<string>("todos");
  const [page, setPage]                       = useState(0);
  const [rowsPerPage, setRowsPerPage]         = useState(25);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrores([]);

    const [rPersoneros, rCiudadanos, rCorredores, rDirigentes, rParticipantes] = await Promise.allSettled([
      fetchTodos<PersoneroRow>("personeros", "id,nombres,apellido_paterno,apellido_materno,dni,telefono,comuna,llamado,resultado_llamada"),
      fetchTodos<CiudadanoRow>("ciudadanos", "id,nombres,apellido_paterno,apellido_materno,dni,telefono,comuna,llamado,resultado_llamada"),
      fetchTodos<CorredorRow>("corredores", "id,nombre_completo,dni,telefono,llamado,resultado_llamada"),
      fetchTodos<DirigenteRow>("dirigentes", "id,nombre,apellido,dni,comuna,celular,llamado,resultado_llamada"),
      fetchTodos<ParticipanteRow>("participantes_actividades", "id,nombre_completo,dni,telefono,comuna,llamado,resultado_llamada"),
    ]);

    const fallas: string[] = [];
    const todasLasFilas: FilaOrigen[] = [];

    if (rPersoneros.status === "fulfilled") {
      todasLasFilas.push(...rPersoneros.value.map((p): FilaOrigen => ({
        tabla: "personeros", id: p.id,
        nombreCompleto: [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ").trim(),
        dni: p.dni?.trim() || null,
        telefono: hasPhone(p.telefono) ? p.telefono : null,
        comuna: p.comuna?.trim() || null,
        llamado: !!p.llamado,
        resultado_llamada: p.resultado_llamada ?? null,
      })));
    } else fallas.push(rPersoneros.reason instanceof Error ? rPersoneros.reason.message : "Personeros: error desconocido");

    if (rCiudadanos.status === "fulfilled") {
      todasLasFilas.push(...rCiudadanos.value.map((p): FilaOrigen => ({
        tabla: "ciudadanos", id: p.id,
        nombreCompleto: [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ").trim(),
        dni: p.dni?.trim() || null,
        telefono: hasPhone(p.telefono) ? p.telefono : null,
        comuna: p.comuna?.trim() || null,
        llamado: !!p.llamado,
        resultado_llamada: p.resultado_llamada ?? null,
      })));
    } else fallas.push(rCiudadanos.reason instanceof Error ? rCiudadanos.reason.message : "Ciudadanos: error desconocido");

    if (rCorredores.status === "fulfilled") {
      todasLasFilas.push(...rCorredores.value.map((c): FilaOrigen => ({
        tabla: "corredores", id: c.id,
        nombreCompleto: (c.nombre_completo ?? "").trim(),
        dni: c.dni?.trim() || null,
        telefono: hasPhone(c.telefono) ? c.telefono : null,
        comuna: null,
        llamado: !!c.llamado,
        resultado_llamada: c.resultado_llamada ?? null,
      })));
    } else fallas.push(rCorredores.reason instanceof Error ? rCorredores.reason.message : "Corredores: error desconocido");

    if (rDirigentes.status === "fulfilled") {
      todasLasFilas.push(...rDirigentes.value.map((d): FilaOrigen => ({
        tabla: "dirigentes", id: d.id,
        nombreCompleto: [d.nombre, d.apellido].filter(Boolean).join(" ").trim(),
        dni: d.dni?.trim() || null,
        telefono: hasPhone(d.celular) ? d.celular : null,
        comuna: d.comuna?.trim() || null,
        llamado: !!d.llamado,
        resultado_llamada: d.resultado_llamada ?? null,
      })));
    } else fallas.push(rDirigentes.reason instanceof Error ? rDirigentes.reason.message : "Dirigentes: error desconocido");

    if (rParticipantes.status === "fulfilled") {
      todasLasFilas.push(...rParticipantes.value.map((p): FilaOrigen => ({
        tabla: "participantes_actividades", id: p.id,
        nombreCompleto: (p.nombre_completo ?? "").trim(),
        dni: p.dni?.trim() || null,
        telefono: hasPhone(p.telefono) ? p.telefono : null,
        comuna: p.comuna?.trim() || null,
        llamado: !!p.llamado,
        resultado_llamada: p.resultado_llamada ?? null,
      })));
    } else fallas.push(rParticipantes.reason instanceof Error ? rParticipantes.reason.message : "Participantes: error desconocido");

    setData(agruparPorPersona(todasLasFilas));
    setErrores(fallas);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Guarda el resultado en TODAS las filas de origen de la persona (puede estar
  // en más de una sección, o duplicada dentro de la misma) — así, apenas se
  // abra Personeros/Ciudadanos/etc., ya van a traer el resultado actualizado.
  const handleActualizarResultado = async (registro: RegistroUnificado, valor: string | null): Promise<string | null> => {
    const resultados = await Promise.all(
      registro.secciones.map((s) => supabase.from(s.tabla).update({ resultado_llamada: valor }).eq("id", s.id))
    );
    const fallo = resultados.find((r) => r.error);
    if (fallo?.error) return fallo.error.message;
    setData((prev) => prev.map((r) => (r.key === registro.key ? { ...r, resultado_llamada: valor } : r)));
    return null;
  };

  // Nombre: solo se escribe en las filas cuya tabla lo guarda en un solo campo
  // (nombre_completo) — Personeros/Ciudadanos/Dirigentes no se tocan desde acá
  // porque separan el nombre en varias columnas (ver TABLAS_CON_NOMBRE_UNICO).
  const handleActualizarNombre = async (registro: RegistroUnificado, valor: string): Promise<string | null> => {
    const nombre = valor.trim();
    if (!nombre) return "El nombre no puede quedar vacío.";
    const objetivo = registro.secciones.filter((s) => TABLAS_CON_NOMBRE_UNICO.has(s.tabla));
    if (objetivo.length === 0) return "Esta persona no tiene ninguna fila editable de nombre (viene de Personeros, Ciudadanos o Dirigentes).";
    const resultados = await Promise.all(objetivo.map((s) => supabase.from(s.tabla).update({ nombre_completo: nombre }).eq("id", s.id)));
    const fallo = resultados.find((r) => r.error);
    if (fallo?.error) return fallo.error.message;
    setData((prev) => prev.map((r) => (r.key === registro.key ? { ...r, nombreCompleto: nombre } : r)));
    return null;
  };

  // DNI: se escribe en TODAS las filas de origen de la persona. Completar el
  // DNI que le faltaba a una fila puede hacer que ahora deba fusionarse con
  // otra ya existente (o separarse de un grupo al que no correspondía) — por
  // eso, en vez de tratar de adivinar el nuevo agrupamiento en el navegador,
  // se vuelve a traer y agrupar todo desde Supabase.
  const handleActualizarDni = async (registro: RegistroUnificado, valor: string): Promise<string | null> => {
    const dni = valor.trim() || null;
    const resultados = await Promise.all(registro.secciones.map((s) => supabase.from(s.tabla).update({ dni }).eq("id", s.id)));
    const fallo = resultados.find((r) => r.error);
    if (fallo?.error) return fallo.error.message;
    await fetchData();
    return null;
  };

  // Comuna: se escribe en todas las filas de origen que tengan ese campo
  // (todas menos Corredores).
  const handleActualizarComuna = async (registro: RegistroUnificado, valor: string): Promise<string | null> => {
    const comuna = valor.trim() || null;
    const objetivo = registro.secciones.filter((s) => TABLAS_CON_COMUNA.has(s.tabla));
    if (objetivo.length === 0) return "Esta persona no tiene ninguna fila con campo de comuna (viene solo de Corredores).";
    const resultados = await Promise.all(objetivo.map((s) => supabase.from(s.tabla).update({ comuna }).eq("id", s.id)));
    const fallo = resultados.find((r) => r.error);
    if (fallo?.error) return fallo.error.message;
    setData((prev) => prev.map((r) => (r.key === registro.key ? { ...r, comuna } : r)));
    return null;
  };

  const filtrados = data.filter((r) => {
    const texto = `${r.nombreCompleto} ${r.dni ?? ""} ${r.telefono ?? ""} ${r.comuna ?? ""}`.toLowerCase();
    const matchSearch    = texto.includes(search.toLowerCase());
    const matchSeccion   = filtroSeccion === "todos" || r.secciones.some((s) => s.tabla === filtroSeccion);
    const matchResultado = filtroResultado === "todos"
      ? true
      : filtroResultado === "sin_registrar"
        ? !r.resultado_llamada
        : r.resultado_llamada === filtroResultado;
    return matchSearch && matchSeccion && matchResultado;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / rowsPerPage));
  const paginaActual = Math.min(page, totalPaginas - 1);
  const paginados     = filtrados.slice(paginaActual * rowsPerPage, paginaActual * rowsPerPage + rowsPerPage);

  const totalPersonas    = data.length;
  const totalFilasOrigen = data.reduce((sum, r) => sum + r.secciones.length, 0);
  const enVariasSecciones = data.filter((r) => new Set(r.secciones.map((s) => s.tabla)).size > 1).length;
  const sinResultado      = data.filter((r) => !r.resultado_llamada).length;

  const hayFiltrosActivos = filtroSeccion !== "todos" || filtroResultado !== "todos";

  const COLS = 6;

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Seguimiento General</h1>
        <p className="text-sm text-gray-400 mt-1">
          Todas las personas de Personeros, Ciudadanos, Corredores, Dirigentes y Participantes en un solo lugar
        </p>
        <LeyendaSecciones />
      </div>

      {errores.length > 0 && (
        <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(220,38,38,0.14)", color: "#f87171", border: "1px solid rgba(220,38,38,0.35)" }}>
          No se pudieron cargar algunas secciones: {errores.join(" · ")}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Personas únicas"      value={totalPersonas}      icon={<GroupsIcon />}         color="#0891b2" />
        <StatCard label="Registros combinados" value={totalFilasOrigen}   icon={<LayersIcon />}         color="#16a34a" />
        <StatCard label="En más de 1 sección"  value={enVariasSecciones}  icon={<CallSplitIcon />}      color="#db2777" />
        <StatCard label="Sin resultado"        value={sinResultado}      icon={<PendingActionsIcon />} color="#d97706" />
      </div>

      <div className="glow-card rounded-2xl overflow-hidden">

        {/* Toolbar principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-[rgba(148,163,184,0.14)]">
          <TextField
            size="small"
            placeholder="Buscar por nombre, DNI, teléfono o comuna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 320, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip title="Actualizar">
              <IconButton size="small" onClick={fetchData} disabled={loading}>
                <RefreshIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Barra de filtros: Sección + Resultado */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[rgba(148,163,184,0.14)]" style={{ background: "#0d1526" }}>

          {/* Filtro Sección */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sección:</span>
            {(["todos", ...TODAS_LAS_TABLAS] as const).map((t) => (
              <button key={t} onClick={() => { setFiltroSeccion(t); setPage(0); }}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={filtroSeccion === t
                  ? { background: t === "todos" ? "#3b82f6" : SECCION_INFO[t].color, color: "#fff", borderColor: t === "todos" ? "#3b82f6" : SECCION_INFO[t].color }
                  : { background: "#121a30", color: "#94a3b8", borderColor: "rgba(148,163,184,0.22)" }}>
                {t === "todos" ? "Todas" : SECCION_INFO[t].label}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: "rgba(148,163,184,0.22)" }} />

          {/* Filtro Resultado */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resultado:</span>
            <Select
              value={filtroResultado}
              onChange={(e: SelectChangeEvent) => { setFiltroResultado(e.target.value); setPage(0); }}
              size="small"
              sx={{
                fontSize: "0.78rem",
                minWidth: 170,
                borderRadius: "999px",
                color: filtroResultado !== "todos" ? "#eef2ff" : "#94a3b8",
                backgroundColor: filtroResultado !== "todos" ? "rgba(59,130,246,0.16)" : "#121a30",
                "& .MuiSelect-select": { py: 0.6, px: 1.75 },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: filtroResultado !== "todos" ? "#3b82f6" : "rgba(148,163,184,0.22)" },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: "#121a30",
                    backgroundImage: "none",
                    border: "1px solid rgba(148,163,184,0.18)",
                    borderRadius: "12px",
                    mt: 0.5,
                    "& .MuiMenuItem-root": {
                      fontSize: "0.82rem", py: 0.9, px: 2, color: "#cbd5e1",
                      "&:hover": { backgroundColor: "rgba(59,130,246,0.14)" },
                      "&.Mui-selected": { backgroundColor: "rgba(59,130,246,0.22)", color: "#eef2ff" },
                    },
                  },
                },
              }}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="sin_registrar">Sin registrar</MenuItem>
              {OPCIONES_RESULTADO_LLAMADA.map((op) => (
                <MenuItem key={op} value={op}>{op}</MenuItem>
              ))}
            </Select>
          </div>

          {/* Limpiar */}
          {hayFiltrosActivos && (
            <button
              onClick={() => { setFiltroSeccion("todos"); setFiltroResultado("todos"); setPage(0); }}
              className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
              style={{ background: "rgba(220,38,38,0.16)", color: "#f87171", border: "1px solid rgba(220,38,38,0.4)" }}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Contador */}
        <div className="px-4 py-2 text-xs text-gray-400 border-b border-[rgba(148,163,184,0.10)]">
          {loading ? "Cargando..." : `${filtrados.length} persona${filtrados.length !== 1 ? "s" : ""}`}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0f1730" }}>
                {["Nombre completo", "DNI", "Teléfono", "Comuna", "Sección", "Resultado"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap" style={{ color: "#94a3b8" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLS} className="text-center py-16">
                  <CircularProgress size={28} sx={{ color: "#1565c0" }} />
                  <p className="text-gray-400 text-sm mt-3">Cargando registros de las 5 secciones...</p>
                </td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={COLS} className="text-center py-16 text-gray-400 text-sm">
                  No se encontraron registros
                </td></tr>
              ) : (
                paginados.map((r, i) => {
                  const colorPrincipal = SECCION_INFO[r.secciones[0].tabla].color;
                  const nombreEditable = r.secciones.some((s) => TABLAS_CON_NOMBRE_UNICO.has(s.tabla));
                  const comunaEditable = r.secciones.some((s) => TABLAS_CON_COMUNA.has(s.tabla));
                  return (
                  <tr key={r.key}
                    className="table-row-animate border-t border-[rgba(148,163,184,0.10)] hover:bg-[rgba(59,130,246,0.10)] transition-colors"
                    style={{ background: i % 2 === 0 ? "#121a30" : "#0d1526", borderLeft: `3px solid ${colorPrincipal}55` }}>

                    {/* Nombre */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: colorPrincipal }}>
                          {r.nombreCompleto.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Tooltip title={nombreEditable ? "Clic para editar" : "Viene de Personeros, Ciudadanos o Dirigentes — se edita desde esa sección"}>
                            <span>
                              <EditableCell
                                value={r.nombreCompleto}
                                editable={nombreEditable}
                                displayValue={<span className="font-semibold text-[#e7ecfb]">{r.nombreCompleto || "—"}</span>}
                                onSave={(v) => handleActualizarNombre(r, v)}
                              />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </td>

                    {/* DNI */}
                    <td className="px-4 py-3 font-mono text-sm text-[#cbd5e1]">
                      <EditableCell
                        value={r.dni ?? ""}
                        editable
                        sanitize={(v) => v.replace(/\D/g, "").slice(0, 8)}
                        onSave={(v) => handleActualizarDni(r, v)}
                      />
                    </td>

                    {/* Teléfono */}
                    <td className="px-4 py-3 text-sm text-[#cbd5e1]">
                      {r.telefono ? (r.telefono.startsWith("+") ? r.telefono : `+51 ${r.telefono}`) : "—"}
                    </td>

                    {/* Comuna */}
                    <td className="px-4 py-3">
                      <Tooltip title={comunaEditable ? "Clic para editar" : "Esta persona solo viene de Corredores, que no guarda comuna"}>
                        <span>
                          <EditableCell
                            value={r.comuna ?? ""}
                            editable={comunaEditable}
                            displayValue={r.comuna
                              ? <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f0fdf4", color: "#166534" }}>{r.comuna}</span>
                              : <span className="text-[#475569] text-xs">—</span>}
                            onSave={(v) => handleActualizarComuna(r, v)}
                          />
                        </span>
                      </Tooltip>
                    </td>

                    {/* Sección */}
                    <td className="px-4 py-3"><SeccionBadges secciones={r.secciones} /></td>

                    {/* Resultado */}
                    <td className="px-4 py-3">
                      <ResultadoLlamadaSelect
                        value={r.resultado_llamada}
                        onSave={(v) => handleActualizarResultado(r, v)}
                      />
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtrados.length > 0 && (
          <TablePagination
            component="div"
            count={filtrados.length}
            page={paginaActual}
            onPageChange={(_, nuevaPagina) => setPage(nuevaPagina)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100, 250]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            sx={{ borderTop: "1px solid rgba(148,163,184,0.22)", "& .MuiTablePagination-selectIcon": { color: "#94a3b8" } }}
          />
        )}

        <div className="px-5 py-3 border-t border-[rgba(148,163,184,0.14)] flex justify-between items-center text-xs text-gray-400">
          <span>{!loading && `Mostrando ${paginados.length} de ${filtrados.length} filtrados · ${totalPersonas} personas únicas · ${totalFilasOrigen} registros de origen`}</span>
          <span style={{ color: "#1565c0", fontWeight: 600 }}>Campaign Data Repository</span>
        </div>
      </div>
    </div>
  );
}
