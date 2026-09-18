"use client";

import { useState, useEffect, useCallback } from "react";
import { CircularProgress, IconButton, Tooltip, Button } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import EditableCell from "@/components/personeros/EditableCell";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import BadgeIcon from "@mui/icons-material/Badge";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";

// La distribución (coordinador y mesas por comuna) vive en la tabla
// control_comunas y se edita haciendo clic sobre el valor. Los personeros
// registrados se cuentan en vivo desde la tabla de personeros. Esta lista solo
// sirve para cargar la distribución inicial cuando la tabla está vacía.
interface ComunaControl {
  comuna: number;
  coordinador: string;
  mesas: number | null; // null = sin mesas asignadas todavía
}

const DISTRIBUCION_INICIAL: ComunaControl[] = [
  { comuna: 1, coordinador: "Luis", mesas: 164 },
  { comuna: 2, coordinador: "Luis", mesas: 63 },
  { comuna: 3, coordinador: "Luis", mesas: 132 },
  { comuna: 4, coordinador: "Luis", mesas: 238 },
  { comuna: 5, coordinador: "Lennin", mesas: 186 },
  { comuna: 6, coordinador: "Lennin", mesas: 101 },
  { comuna: 7, coordinador: "Lennin", mesas: 158 },
  { comuna: 8, coordinador: "Lennin", mesas: 70 },
  { comuna: 9, coordinador: "Ines", mesas: 168 },
  { comuna: 10, coordinador: "Ines", mesas: 328 },
  { comuna: 11, coordinador: "Ines", mesas: 92 },
  { comuna: 12, coordinador: "Ines", mesas: 261 },
  { comuna: 13, coordinador: "Fatima", mesas: 258 },
  { comuna: 14, coordinador: "Jhon", mesas: 111 },
  { comuna: 15, coordinador: "Jhon", mesas: 115 },
  { comuna: 16, coordinador: "Fatima", mesas: 117 },
  { comuna: 17, coordinador: "Jhon", mesas: 168 },
  { comuna: 18, coordinador: "Chaners", mesas: null },
];

// Colores de los coordinadores conocidos; si se escribe un nombre nuevo, toma
// el siguiente color libre de la paleta.
const COLOR_COORDINADOR_CONOCIDO: Record<string, string> = {
  luis: "#d4a84b",
  lennin: "#a78bfa",
  ines: "#f472b6",
  fatima: "#86b84a",
  jhon: "#2dd4bf",
  chaners: "#fb923c",
};
const PALETA_EXTRA = ["#38bdf8", "#f87171", "#c084fc", "#facc15", "#34d399", "#fb7185"];

function claveCoordinador(nombre: string): string {
  return nombre.trim().toLowerCase();
}

// Mismo criterio que el dashboard y el listado de Personeros: el texto libre de
// comuna viene con inconsistencias ("Comuna 5", "5", "COMUNA 05"...), así que
// se agrupa por el número extraído.
function extraerNumeroComuna(comuna?: string | null): number | null {
  if (!comuna) return null;
  const match = comuna.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return n >= 1 && n <= 18 ? n : null;
}

const numberFmt = new Intl.NumberFormat("es-PE");

// Semáforo de cobertura: rojo = muy por debajo de las mesas, ámbar = a medio
// camino, verde = casi completo, azul = ya se superó la cantidad de mesas.
function colorCobertura(pct: number): string {
  if (pct > 100) return "#60a5fa";
  if (pct >= 70) return "#4ade80";
  if (pct >= 30) return "#fbbf24";
  return "#f87171";
}

function formatPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

interface FilaControl {
  comuna: number;
  coordinador: string;
  mesas: number | null;
  personeros: number;
  faltan: number | null;
  pct: number | null;
}

function CoordinadorChip({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ background: `${color}22`, color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {nombre || "Sin coordinador"}
    </span>
  );
}

function BarraCobertura({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-500 text-sm">—</span>;
  const color = colorCobertura(pct);
  return (
    <div className="flex items-center gap-3 min-w-[150px]">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: `${color}22` }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-14 text-right" style={{ color }}>{formatPct(pct)}</span>
    </div>
  );
}

function StatCard({ label, value, subtitle, icon, color }: {
  label: string; value: string | number; subtitle?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="stat-card glow-card rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black leading-tight tabular-nums" style={{ color: "#eef2ff" }}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function ControlPersonerosPage() {
  const [config, setConfig] = useState<ComunaControl[]>([]);
  const [comunasRegistradas, setComunasRegistradas] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: cfg, error: cfgError } = await supabase
      .from("control_comunas")
      .select("comuna, coordinador, mesas")
      .order("comuna", { ascending: true });

    if (cfgError) {
      setError(`No se pudo leer la distribución (${cfgError.message}). Verifica que la tabla control_comunas exista en Supabase.`);
      setLoading(false);
      return;
    }

    // Supabase/PostgREST limita cada consulta a 1000 filas; se pagina con
    // .range() hasta traer todo, igual que en el listado y el dashboard.
    const PAGE_SIZE = 1000;
    const todas: (string | null)[] = [];
    let from = 0;
    let hayError: string | null = null;

    while (true) {
      const { data: rows, error: err } = await supabase
        .from("personeros")
        .select("id, comuna")
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (err) { hayError = err.message; break; }
      const lote = (rows as { id: string; comuna: string | null }[]) ?? [];
      todas.push(...lote.map((r) => r.comuna));
      if (lote.length === 0) break;
      from += lote.length;
    }

    if (hayError) {
      setError(hayError);
    } else {
      setConfig((cfg as ComunaControl[]) ?? []);
      setComunasRegistradas(todas);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Un UPDATE bloqueado por RLS no da error: simplemente no toca ninguna fila.
  // Por eso se pide la fila de vuelta con .select() y se verifica que exista.
  const guardarCampo = async (comuna: number, cambios: { coordinador?: string; mesas?: number | null }): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from("control_comunas")
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq("comuna", comuna)
      .select("comuna");

    if (err) return err.message;
    if (!data || data.length === 0) return "No se pudo guardar (sin permiso o la comuna no existe).";

    setConfig((prev) => prev.map((c) => (c.comuna === comuna ? { ...c, ...cambios } : c)));
    return null;
  };

  const guardarCoordinador = (comuna: number, valor: string) => {
    const nombre = valor.trim();
    if (!nombre) return Promise.resolve("El coordinador no puede quedar vacío.");
    return guardarCampo(comuna, { coordinador: nombre });
  };

  const guardarMesas = (comuna: number, valor: string) => {
    const limpio = valor.trim();
    return guardarCampo(comuna, { mesas: limpio === "" ? null : parseInt(limpio, 10) });
  };

  const cargarDistribucionInicial = async () => {
    setCargandoInicial(true);
    const { data, error: err } = await supabase
      .from("control_comunas")
      .upsert(DISTRIBUCION_INICIAL, { onConflict: "comuna" })
      .select("comuna");
    setCargandoInicial(false);

    if (err) { setError(err.message); return; }
    if (!data || data.length === 0) {
      setError("No se pudo cargar la distribución inicial (sin permiso de escritura en control_comunas).");
      return;
    }
    fetchData();
  };

  const personerosPorComuna = new Map<number, number>();
  let sinComuna = 0;
  for (const c of comunasRegistradas) {
    const n = extraerNumeroComuna(c);
    if (n) personerosPorComuna.set(n, (personerosPorComuna.get(n) ?? 0) + 1);
    else sinComuna++;
  }

  const filas: FilaControl[] = config.map((c) => {
    const personeros = personerosPorComuna.get(c.comuna) ?? 0;
    return {
      comuna: c.comuna,
      coordinador: c.coordinador,
      mesas: c.mesas,
      personeros,
      faltan: c.mesas !== null ? c.mesas - personeros : null,
      pct: c.mesas ? (personeros / c.mesas) * 100 : null,
    };
  });

  // Coordinadores en orden de aparición (por comuna); cada uno conserva su color.
  const coordinadores: string[] = [];
  for (const f of filas) {
    if (!coordinadores.some((n) => claveCoordinador(n) === claveCoordinador(f.coordinador))) coordinadores.push(f.coordinador);
  }
  const colorDe = (nombre: string): string => {
    const clave = claveCoordinador(nombre);
    if (COLOR_COORDINADOR_CONOCIDO[clave]) return COLOR_COORDINADOR_CONOCIDO[clave];
    const desconocidos = coordinadores.filter((n) => !COLOR_COORDINADOR_CONOCIDO[claveCoordinador(n)]);
    const idx = desconocidos.findIndex((n) => claveCoordinador(n) === clave);
    return PALETA_EXTRA[Math.max(idx, 0) % PALETA_EXTRA.length];
  };

  const totalMesas = filas.reduce((sum, f) => sum + (f.mesas ?? 0), 0);
  const totalPersoneros = comunasRegistradas.length;
  // Igual que en la planilla original: "faltan" suma solo las comunas que tienen
  // mesas asignadas (los personeros de una comuna sin mesas o sin comuna no descuentan).
  const totalFaltan = filas.reduce((sum, f) => sum + (f.faltan ?? 0), 0);
  const pctTotal = totalMesas > 0 ? (totalPersoneros / totalMesas) * 100 : 0;

  const resumenCoordinadores = coordinadores.map((nombre) => {
    const suyas = filas.filter((f) => claveCoordinador(f.coordinador) === claveCoordinador(nombre));
    const mesas = suyas.reduce((sum, f) => sum + (f.mesas ?? 0), 0);
    const personeros = suyas.reduce((sum, f) => sum + f.personeros, 0);
    const faltan = suyas.reduce((sum, f) => sum + (f.faltan ?? 0), 0);
    return {
      nombre,
      comunas: suyas.map((f) => f.comuna),
      mesas,
      personeros,
      faltan,
      pct: mesas > 0 ? (personeros / mesas) * 100 : null,
    };
  });

  const handleExport = () => {
    const rows = [
      ...filas.map((f) => ({
        "Comuna": `Comuna ${f.comuna}`,
        "Coordinador": f.coordinador,
        "Cantidad / Mesas": f.mesas ?? "",
        "Personeros / B. datos": f.personeros,
        "Personeros faltan": f.faltan ?? "",
        "Porcentaje": f.pct !== null ? formatPct(f.pct) : "",
      })),
      ...(sinComuna > 0 ? [{
        "Comuna": "Sin comuna", "Coordinador": "", "Cantidad / Mesas": "",
        "Personeros / B. datos": sinComuna, "Personeros faltan": "", "Porcentaje": "",
      }] : []),
      {
        "Comuna": "Total", "Coordinador": "", "Cantidad / Mesas": totalMesas,
        "Personeros / B. datos": totalPersoneros, "Personeros faltan": totalFaltan,
        "Porcentaje": formatPct(pctTotal),
      },
    ];
    exportToExcel(rows, `Control_Personeros_${new Date().toISOString().slice(0, 10)}`, "Control");
  };

  const sinConfig = !loading && !error && config.length === 0;

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Control de Personeros</h1>
          <p className="text-sm text-gray-400 mt-1">
            Mesas por comuna y coordinador frente a los personeros registrados. Haz clic en un coordinador o en las mesas para editarlos.
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip title="Exportar Excel">
            <span>
              <IconButton onClick={handleExport} disabled={loading || !!error || sinConfig}>
                <FileDownloadIcon sx={{ color: loading || error || sinConfig ? "#475569" : "#60a5fa" }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Actualizar">
            <span>
              <IconButton onClick={fetchData} disabled={loading}>
                <RefreshIcon sx={{ color: loading ? "#475569" : "#94a3b8" }} />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <CircularProgress size={36} sx={{ color: "#3b82f6" }} />
          <p className="text-gray-400 text-sm mt-4">Cargando datos...</p>
        </div>
      ) : error ? (
        <div className="glow-card rounded-2xl p-10 text-center text-red-400 text-sm">
          {error}
        </div>
      ) : sinConfig ? (
        <div className="glow-card rounded-2xl p-10 text-center space-y-4">
          <p className="text-[#cbd5e1] text-sm">
            Todavía no hay una distribución guardada. Puedes cargar la inicial (18 comunas con sus coordinadores y mesas) y luego editarla.
          </p>
          <Button variant="contained" onClick={cargarDistribucionInicial} disabled={cargandoInicial}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "12px" }}>
            {cargandoInicial ? <CircularProgress size={20} color="inherit" /> : "Cargar distribución inicial"}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total de mesas" value={numberFmt.format(totalMesas)} subtitle="Comunas con mesas asignadas"
              icon={<HowToVoteIcon />} color="#60a5fa" />
            <StatCard label="Personeros en base de datos" value={numberFmt.format(totalPersoneros)} subtitle="Todas las comunas"
              icon={<BadgeIcon />} color="#4ade80" />
            <StatCard label="Personeros que faltan" value={numberFmt.format(totalFaltan)} subtitle="Para cubrir todas las mesas"
              icon={<PersonSearchIcon />} color="#f87171" />
            <StatCard label="Cobertura" value={formatPct(pctTotal)} subtitle="Personeros / mesas"
              icon={<DonutLargeIcon />} color={colorCobertura(pctTotal)} />
          </div>

          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#0f1730" }}>
                    {[
                      { h: "Comuna", align: "text-left" },
                      { h: "Coordinador", align: "text-left" },
                      { h: "Cantidad / Mesas", align: "text-right" },
                      { h: "Personeros / B. datos", align: "text-right" },
                      { h: "Personeros faltan", align: "text-right" },
                      { h: "Porcentaje", align: "text-left" },
                    ].map(({ h, align }) => (
                      <th key={h} className={`px-5 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap ${align}`}
                        style={{ color: "#94a3b8" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => {
                    const color = colorDe(f.coordinador);
                    return (
                      <tr key={f.comuna}
                        className="border-t border-[rgba(148,163,184,0.10)] hover:bg-[rgba(59,130,246,0.10)] transition-colors"
                        style={{ background: i % 2 === 0 ? "#121a30" : "#0d1526", boxShadow: `inset 3px 0 0 ${color}` }}>
                        <td className="px-5 py-3 font-semibold text-[#e7ecfb] whitespace-nowrap">Comuna {f.comuna}</td>
                        <td className="px-5 py-3 min-w-[150px]">
                          <EditableCell
                            value={f.coordinador}
                            editable
                            displayValue={<CoordinadorChip nombre={f.coordinador} color={color} />}
                            onSave={(v) => guardarCoordinador(f.comuna, v)}
                          />
                        </td>
                        <td className="px-5 py-3 min-w-[110px]">
                          <EditableCell
                            value={f.mesas !== null ? String(f.mesas) : ""}
                            editable
                            align="right"
                            sanitize={(raw) => raw.replace(/\D/g, "").slice(0, 5)}
                            displayValue={
                              <span className="tabular-nums text-[#cbd5e1]">
                                {f.mesas !== null ? numberFmt.format(f.mesas) : <span className="text-gray-500">—</span>}
                              </span>
                            }
                            onSave={(v) => guardarMesas(f.comuna, v)}
                          />
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-bold text-[#e7ecfb]">
                          {numberFmt.format(f.personeros)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-bold"
                          style={{ color: f.faltan === null ? "#64748b" : f.faltan < 0 ? "#60a5fa" : f.faltan === 0 ? "#4ade80" : "#f87171" }}
                          title={f.faltan !== null && f.faltan < 0 ? "Hay más personeros que mesas" : undefined}>
                          {f.faltan !== null ? numberFmt.format(f.faltan) : "—"}
                        </td>
                        <td className="px-5 py-3"><BarraCobertura pct={f.pct} /></td>
                      </tr>
                    );
                  })}

                  {sinComuna > 0 && (
                    <tr className="border-t border-[rgba(148,163,184,0.10)]" style={{ background: "#0d1526" }}>
                      <td className="px-5 py-3 font-semibold text-gray-400 whitespace-nowrap">Sin comuna</td>
                      <td className="px-5 py-3 text-gray-500">—</td>
                      <td className="px-5 py-3 text-right text-gray-500">—</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-gray-300">{numberFmt.format(sinComuna)}</td>
                      <td className="px-5 py-3 text-right text-gray-500">—</td>
                      <td className="px-5 py-3 text-xs text-gray-500">Registrados sin comuna válida</td>
                    </tr>
                  )}

                  <tr className="border-t-2 border-[rgba(96,165,250,0.35)]" style={{ background: "#0f1730" }}>
                    <td className="px-5 py-4 font-black text-[#eef2ff] uppercase tracking-wide">Total</td>
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4 text-right tabular-nums font-black text-[#eef2ff]">{numberFmt.format(totalMesas)}</td>
                    <td className="px-5 py-4 text-right tabular-nums font-black text-[#eef2ff]">{numberFmt.format(totalPersoneros)}</td>
                    <td className="px-5 py-4 text-right tabular-nums font-black" style={{ color: "#f87171" }}>{numberFmt.format(totalFaltan)}</td>
                    <td className="px-5 py-4"><BarraCobertura pct={pctTotal} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-black mb-3" style={{ color: "#eef2ff" }}>Resumen por coordinador</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {resumenCoordinadores.map((c) => {
                const color = colorDe(c.nombre);
                return (
                  <div key={claveCoordinador(c.nombre)} className="glow-card rounded-2xl p-5" style={{ borderColor: `${color}55` }}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <CoordinadorChip nombre={c.nombre} color={color} />
                      <span className="text-xs text-gray-400 text-right">
                        {c.comunas.length === 1 ? `Comuna ${c.comunas[0]}` : `Comunas ${c.comunas.join(", ")}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Mesas</p>
                        <p className="text-lg font-black tabular-nums text-[#eef2ff]">{c.mesas ? numberFmt.format(c.mesas) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Personeros</p>
                        <p className="text-lg font-black tabular-nums text-[#eef2ff]">{numberFmt.format(c.personeros)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Faltan</p>
                        <p className="text-lg font-black tabular-nums"
                          style={{ color: !c.mesas ? "#64748b" : c.faltan < 0 ? "#60a5fa" : c.faltan === 0 ? "#4ade80" : "#f87171" }}>
                          {c.mesas ? numberFmt.format(c.faltan) : "—"}
                        </p>
                      </div>
                    </div>
                    <BarraCobertura pct={c.pct} />
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Los personeros se cuentan en vivo desde la base de datos según la comuna registrada. Un valor de “faltan” en azul
            significa que ya hay más personeros que mesas en esa comuna.
          </p>
        </>
      )}
    </div>
  );
}
