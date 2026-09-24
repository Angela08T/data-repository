"use client";

import { useState, useEffect, useCallback } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import QuizIcon from "@mui/icons-material/Quiz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReplayIcon from "@mui/icons-material/Replay";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// Mismo criterio de huso horario que el resto de los paneles con series por
// día (Crecimiento, Resultados en Vivo): todo se agrupa en hora de Lima, no en
// la del navegador de quien mire el panel.
const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
function aHoraLima(d: Date): Date { return new Date(d.getTime() + LIMA_OFFSET_MS); }
function soloFechaUTC(d: Date): Date { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
function claveDia(d: Date): string { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; }
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function etiquetaDia(d: Date): string { return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`; }

const numberFmt = new Intl.NumberFormat("es-PE");

interface Intento {
  id: string;
  intentos_invalidos: number;
  clic_personero: boolean;
  creado_en: string;
}

interface PuntoDiario { fecha: Date; key: string; sinErrores: number; conErrores: number; }

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

function BarrasResultado({ puntos }: { puntos: PuntoDiario[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);

  const alturaSvg = 200, padB = 26, padT = 16;
  const plotH = alturaSvg - padB - padT;
  const anchoBarra = 26, gap = 10;
  const anchoSvg = Math.max(600, puntos.length * (anchoBarra + gap) + gap);
  const max = Math.max(...puntos.map((p) => p.sinErrores + p.conErrores), 1);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${anchoSvg} ${alturaSvg}`} width={anchoSvg} height={alturaSvg} style={{ display: "block" }}>
        <line x1={0} x2={anchoSvg} y1={alturaSvg - padB} y2={alturaSvg - padB} stroke="rgba(148,163,184,0.22)" strokeWidth={1} />
        {puntos.map((p, i) => {
          const total = p.sinErrores + p.conErrores;
          const hOk = mounted ? (p.sinErrores / max) * plotH : 0;
          const hErr = mounted ? (p.conErrores / max) * plotH : 0;
          const x = gap + i * (anchoBarra + gap);
          const yBase = alturaSvg - padB;
          const yOkTop = yBase - hOk;
          const yErrTop = yOkTop - hErr;
          return (
            <g key={p.key}>
              {total > 0 && <text x={x + anchoBarra / 2} y={yErrTop - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#eef2ff">{total}</text>}
              {p.conErrores > 0 && <rect x={x} y={yErrTop} width={anchoBarra} height={hErr} rx={4} fill="#f59e0b" style={{ transition: "height 700ms ease-out, y 700ms ease-out" }} />}
              {p.sinErrores > 0 && <rect x={x} y={yOkTop} width={anchoBarra} height={hOk} rx={4} fill="#4ade80" style={{ transition: "height 700ms ease-out, y 700ms ease-out" }} />}
              {total === 0 && <rect x={x} y={yBase - 2} width={anchoBarra} height={2} rx={1} fill="rgba(148,163,184,0.25)" />}
              <text x={x + anchoBarra / 2} y={alturaSvg - padB + 16} textAnchor="middle" fontSize={10} fill="#94a3b8" fontWeight={600}>{etiquetaDia(p.fecha)}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 justify-center mt-1 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#4ade80" }} /> Sin errores (ya sabían)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#f59e0b" }} /> Con errores (aprendieron)</span>
      </div>
    </div>
  );
}

const RANGOS = [7, 14, 30, 0] as const;

export default function SimulacroVotacionPage() {
  const [intentos, setIntentos] = useState<Intento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rango, setRango] = useState<number>(14);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const PAGE_SIZE = 1000;
    const todos: Intento[] = [];
    let from = 0;
    let hayError: string | null = null;
    while (true) {
      const { data, error: err } = await supabase
        .from("simulacro_voto")
        .select("id, intentos_invalidos, clic_personero, creado_en")
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (err) { hayError = err.message; break; }
      const lote = (data as Intento[]) ?? [];
      todos.push(...lote);
      if (lote.length === 0) break;
      from += lote.length;
    }
    if (hayError) setError(hayError);
    else setIntentos(todos);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const total = intentos.length;
  const sinErrores = intentos.filter((i) => i.intentos_invalidos === 0).length;
  const conErrores = total - sinErrores;
  const clics = intentos.filter((i) => i.clic_personero).length;
  const pctSinErrores = total > 0 ? Math.round((sinErrores / total) * 100) : 0;
  const pctClics = total > 0 ? Math.round((clics / total) * 100) : 0;

  const porDia = new Map<string, PuntoDiario>();
  for (const i of intentos) {
    const dia = soloFechaUTC(aHoraLima(new Date(i.creado_en)));
    const key = claveDia(dia);
    const actual = porDia.get(key) ?? { fecha: dia, key, sinErrores: 0, conErrores: 0 };
    if (i.intentos_invalidos === 0) actual.sinErrores++; else actual.conErrores++;
    porDia.set(key, actual);
  }
  const serieCompleta = Array.from(porDia.values()).sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const serieVisible = rango === 0 ? serieCompleta : serieCompleta.slice(-rango);

  const handleExport = () => {
    const rows = intentos.map((i) => ({
      "Fecha y hora": new Date(i.creado_en).toLocaleString("es-PE"),
      "Resultado": i.intentos_invalidos === 0 ? "Sin errores" : "Con errores",
      "Intentos inválidos": i.intentos_invalidos,
      "Hizo clic en Únete como personero": i.clic_personero ? "Sí" : "No",
    }));
    exportToExcel(rows, `Simulacro_Votacion_${new Date().toISOString().slice(0, 10)}`, "Simulacro");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Simulacro de Votación</h1>
          <p className="text-sm text-gray-400 mt-1">Resultados de <span className="font-mono">/aprende-a-votar</span> — quién sabe marcar su voto y quién está aprendiendo</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip title="Exportar Excel">
            <span><IconButton onClick={handleExport} disabled={loading || total === 0}>
              <FileDownloadIcon sx={{ color: loading || total === 0 ? "#475569" : "#60a5fa" }} />
            </IconButton></span>
          </Tooltip>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchData} disabled={loading}>
              <RefreshIcon sx={{ color: loading ? "#475569" : "#94a3b8" }} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <CircularProgress size={36} sx={{ color: "#3b82f6" }} />
          <p className="text-gray-400 text-sm mt-4">Cargando datos...</p>
        </div>
      ) : error ? (
        <div className="glow-card rounded-2xl p-10 text-center text-red-400 text-sm">Error al cargar datos: {error}</div>
      ) : total === 0 ? (
        <div className="glow-card rounded-2xl p-10 text-center text-gray-400 text-sm">
          Todavía nadie completó el simulacro en <span className="font-mono">/aprende-a-votar</span>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard label="Practicaron en total" value={numberFmt.format(total)} subtitle="Simulacros completados" icon={<QuizIcon />} color="#3b82f6" />
            <StatCard label="Ya sabían votar" value={`${pctSinErrores}%`} subtitle={`${numberFmt.format(sinErrores)} sin ningún error`} icon={<CheckCircleIcon />} color="#4ade80" />
            <StatCard label="Aprendieron practicando" value={`${100 - pctSinErrores}%`} subtitle={`${numberFmt.format(conErrores)} con al menos 1 error`} icon={<ReplayIcon />} color="#f59e0b" />
            <StatCard label="Clic en Únete como personero" value={numberFmt.format(clics)} subtitle={`${pctClics}% de quienes practicaron`} icon={<HowToVoteIcon />} color="#a78bfa" />
            <StatCard label="Total de errores corregidos" value={numberFmt.format(intentos.reduce((s, i) => s + i.intentos_invalidos, 0))} subtitle="Marcas inválidas en total" icon={<InfoOutlinedIcon />} color="#f87171" />
          </div>

          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Simulacros por día</h3>
              <div className="flex items-center gap-1.5">
                {RANGOS.map((r) => (
                  <button key={r} onClick={() => setRango(r)}
                    className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                    style={rango === r
                      ? { background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" }
                      : { background: "transparent", color: "#94a3b8", borderColor: "rgba(148,163,184,0.22)" }}>
                    {r === 0 ? "Todos" : `${r} días`}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2">
              <BarrasResultado puntos={serieVisible} />
            </div>
          </div>

          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs" style={{ background: "rgba(96,165,250,0.10)", color: "#93c5fd" }}>
            <InfoOutlinedIcon sx={{ fontSize: 16, flexShrink: 0, mt: "1px" }} />
            <p>
              &quot;Clic en Únete como personero&quot; cuenta cuántas veces ese botón llevó a alguien hacia la ficha de inscripción
              (jesusmaldonadooficial.com). Como esa ficha vive en otro sitio fuera de esta app, no hay forma de confirmar aquí
              cuántos de esos clics terminaron en una inscripción real — solo que la persona fue redirigida.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
