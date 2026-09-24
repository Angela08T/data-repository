"use client";

import { useState, useEffect, useCallback } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { supabase } from "@/lib/supabase";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import SpeedIcon from "@mui/icons-material/Speed";
import EventIcon from "@mui/icons-material/Event";
import FlagIcon from "@mui/icons-material/Flag";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

// Día de la elección — mismo dato usado en el resto de la app (mensajes,
// conteo de votos). Se fija a medianoche en hora de Lima.
const FECHA_ELECCION = new Date("2026-10-04T00:00:00-05:00");
// Cuántos días recientes se promedian para estimar el ritmo diario de
// inscripción. 7 amortigua los altibajos de fin de semana sin diluir un
// cambio de ritmo reciente (por ejemplo, tras una campaña de difusión).
const DIAS_PROMEDIO_RITMO = 7;

const numberFmt = new Intl.NumberFormat("es-PE");

// Todo el cálculo de "a qué día calendario pertenece este registro" se hace en
// huso horario de Lima (UTC-5) en vez del huso del navegador que esté mirando
// la página — así un mismo registro cae siempre en el mismo día para
// cualquiera que abra este panel, sin importar en qué zona horaria esté.
const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
function aHoraLima(d: Date): Date {
  return new Date(d.getTime() + LIMA_OFFSET_MS);
}
function soloFechaUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function claveDia(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function etiquetaDia(d: Date): string {
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

interface PuntoDiario {
  fecha: Date;
  key: string;
  nuevos: number;
  acumulado: number;
}

interface PuntoProyectado {
  fecha: Date;
  key: string;
  acumulado: number;
}

function nextNiceMax(n: number): number {
  if (n <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / pow;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * pow;
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

// ── Barras de registros nuevos por día ───────────────────────────────────────
function BarrasDiarias({ puntos }: { puntos: PuntoDiario[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);

  const alturaSvg = 200;
  const padB = 26, padT = 20;
  const plotH = alturaSvg - padB - padT;
  const anchoBarra = 26, gap = 10;
  const anchoSvg = Math.max(600, puntos.length * (anchoBarra + gap) + gap);
  const max = Math.max(...puntos.map((p) => p.nuevos), 1);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${anchoSvg} ${alturaSvg}`} width={anchoSvg} height={alturaSvg} style={{ display: "block" }}>
        <line x1={0} x2={anchoSvg} y1={alturaSvg - padB} y2={alturaSvg - padB} stroke="rgba(148,163,184,0.22)" strokeWidth={1} />
        {puntos.map((p, i) => {
          const h = mounted ? (p.nuevos / max) * plotH : 0;
          const x = gap + i * (anchoBarra + gap);
          const y = alturaSvg - padB - h;
          return (
            <g key={p.key}>
              {p.nuevos > 0 && (
                <text x={x + anchoBarra / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#eef2ff">
                  {p.nuevos}
                </text>
              )}
              <rect x={x} y={y} width={anchoBarra} height={h} rx={5} fill="#3b82f6"
                style={{ transition: "height 700ms ease-out, y 700ms ease-out" }} />
              <text x={x + anchoBarra / 2} y={alturaSvg - padB + 16} textAnchor="middle" fontSize={10} fill="#94a3b8" fontWeight={600}>
                {etiquetaDia(p.fecha)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Línea de acumulado real + proyección punteada hacia la elección ─────────
function LineaAcumulada({ historico, proyeccion, fechaEleccion }: {
  historico: PuntoDiario[]; proyeccion: PuntoProyectado[]; fechaEleccion: Date;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);

  if (historico.length === 0) return null;

  const width = 900, height = 260, padL = 46, padR = 16, padT = 24, padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const todosLosPuntos = [
    ...historico.map((p) => ({ t: p.fecha.getTime(), v: p.acumulado, esProyeccion: false })),
    ...proyeccion.map((p) => ({ t: p.fecha.getTime(), v: p.acumulado, esProyeccion: true })),
  ];
  const tMin = todosLosPuntos[0].t;
  const tMax = todosLosPuntos[todosLosPuntos.length - 1].t;
  const rangoT = Math.max(tMax - tMin, 86400000);
  const maxV = nextNiceMax(Math.max(...todosLosPuntos.map((p) => p.v), 1));

  const xFor = (t: number) => padL + ((t - tMin) / rangoT) * plotW;
  const yFor = (v: number) => padT + plotH - (v / maxV) * plotH;

  const pathDe = (pts: { t: number; v: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.t).toFixed(1)} ${yFor(p.v).toFixed(1)}`).join(" ");

  const pathHistorico = pathDe(historico.map((p) => ({ t: p.fecha.getTime(), v: p.acumulado })));
  const puntoEnlace = historico[historico.length - 1];
  const pathProyeccion = proyeccion.length > 0
    ? pathDe([{ t: puntoEnlace.fecha.getTime(), v: puntoEnlace.acumulado }, ...proyeccion.map((p) => ({ t: p.fecha.getTime(), v: p.acumulado }))])
    : "";

  const areaHistorico = `${pathHistorico} L ${xFor(puntoEnlace.fecha.getTime()).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xFor(historico[0].fecha.getTime()).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f));
  const xEleccion = xFor(fechaEleccion.getTime());
  const dentroDelRango = fechaEleccion.getTime() >= tMin && fechaEleccion.getTime() <= tMax;

  return (
    <div className="px-4 py-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
        <defs>
          <linearGradient id="crecimientoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={yFor(t)} y2={yFor(t)} stroke="rgba(148,163,184,0.14)" strokeWidth={1} />
            <text x={padL - 8} y={yFor(t) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{numberFmt.format(t)}</text>
          </g>
        ))}

        {dentroDelRango && (
          <>
            <line x1={xEleccion} x2={xEleccion} y1={padT} y2={padT + plotH} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={xEleccion} y={padT - 8} textAnchor="middle" fontSize={10} fontWeight={700} fill="#f59e0b">Elección</text>
          </>
        )}

        <path d={areaHistorico} fill="url(#crecimientoFill)" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }} />
        <path d={pathHistorico} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: mounted ? 0 : 1, transition: "stroke-dashoffset 1.1s ease-out" }} />

        {pathProyeccion && (
          <path d={pathProyeccion} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="6 5" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.6s" }} />
        )}

        <circle cx={xFor(puntoEnlace.fecha.getTime())} cy={yFor(puntoEnlace.acumulado)} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
        {proyeccion.length > 0 && (
          <circle cx={xFor(proyeccion[proyeccion.length - 1].fecha.getTime())} cy={yFor(proyeccion[proyeccion.length - 1].acumulado)}
            r={5} fill="#a78bfa" stroke="#fff" strokeWidth={2} />
        )}
      </svg>
      <div className="flex items-center gap-4 justify-center mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "#3b82f6" }} /> Real</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "#a78bfa", opacity: 0.8 }} /> Proyección</span>
      </div>
    </div>
  );
}

const RANGOS = [7, 14, 30, 0] as const; // 0 = todos

export default function CrecimientoPersonerosPage() {
  const [fechas, setFechas] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rango, setRango] = useState<number>(14);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const PAGE_SIZE = 1000;
    const todas: Date[] = [];
    let from = 0;
    let hayError: string | null = null;

    while (true) {
      const { data: rows, error: err } = await supabase
        .from("personeros")
        .select("id, created_at")
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (err) { hayError = err.message; break; }
      const lote = (rows as { id: string; created_at: string | null }[]) ?? [];
      for (const r of lote) if (r.created_at) todas.push(new Date(r.created_at));
      if (lote.length === 0) break;
      from += lote.length;
    }

    if (hayError) setError(hayError);
    else setFechas(todas);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Conteo por día calendario (hora Lima) a partir de cada fecha de registro.
  const conteoPorDia = new Map<string, number>();
  let minDia: Date | null = null;
  for (const f of fechas) {
    const diaLima = soloFechaUTC(aHoraLima(f));
    const key = claveDia(diaLima);
    conteoPorDia.set(key, (conteoPorDia.get(key) ?? 0) + 1);
    if (!minDia || diaLima.getTime() < minDia.getTime()) minDia = diaLima;
  }

  const hoy = soloFechaUTC(aHoraLima(new Date()));

  // Serie continua día por día (sin huecos) desde el primer registro hasta hoy.
  const serieCompleta: PuntoDiario[] = [];
  if (minDia) {
    let acumulado = 0;
    for (let t = minDia.getTime(); t <= hoy.getTime(); t += 86400000) {
      const fecha = new Date(t);
      const key = claveDia(fecha);
      const nuevos = conteoPorDia.get(key) ?? 0;
      acumulado += nuevos;
      serieCompleta.push({ fecha, key, nuevos, acumulado });
    }
  }

  const totalActual = serieCompleta.length > 0 ? serieCompleta[serieCompleta.length - 1].acumulado : 0;

  // Ritmo diario: promedio de nuevos registros en los últimos DIAS_PROMEDIO_RITMO
  // días con datos — se usa tal cual para proyectar hacia adelante (no es una
  // regresión, es deliberadamente simple: "si seguimos al ritmo reciente").
  const ultimosParaRitmo = serieCompleta.slice(-DIAS_PROMEDIO_RITMO);
  const ritmoDiario = ultimosParaRitmo.length > 0
    ? ultimosParaRitmo.reduce((s, p) => s + p.nuevos, 0) / ultimosParaRitmo.length
    : 0;

  const fechaEleccionLima = soloFechaUTC(aHoraLima(FECHA_ELECCION));
  const diasRestantes = Math.round((fechaEleccionLima.getTime() - hoy.getTime()) / 86400000);

  const proyeccion: PuntoProyectado[] = [];
  if (diasRestantes > 0) {
    let acc = totalActual;
    for (let t = hoy.getTime() + 86400000; t <= fechaEleccionLima.getTime(); t += 86400000) {
      acc += ritmoDiario;
      proyeccion.push({ fecha: new Date(t), key: claveDia(new Date(t)), acumulado: Math.round(acc) });
    }
  }
  const totalProyectado = proyeccion.length > 0 ? proyeccion[proyeccion.length - 1].acumulado : totalActual;

  const serieVisible = rango === 0 ? serieCompleta : serieCompleta.slice(-rango);

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Crecimiento de Personeros</h1>
          <p className="text-sm text-gray-400 mt-1">Registros por día y proyección hacia el 04 de octubre</p>
        </div>
        <Tooltip title="Actualizar">
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon sx={{ color: loading ? "#475569" : "#94a3b8" }} />
          </IconButton>
        </Tooltip>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <CircularProgress size={36} sx={{ color: "#3b82f6" }} />
          <p className="text-gray-400 text-sm mt-4">Cargando datos...</p>
        </div>
      ) : error ? (
        <div className="glow-card rounded-2xl p-10 text-center text-red-400 text-sm">Error al cargar datos: {error}</div>
      ) : serieCompleta.length === 0 ? (
        <div className="glow-card rounded-2xl p-10 text-center text-gray-400 text-sm">
          Todavía no hay suficientes registros con fecha para calcular el crecimiento.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total actual" value={numberFmt.format(totalActual)} subtitle="Personeros registrados"
              icon={<PeopleIcon />} color="#3b82f6" />
            <StatCard label="Ritmo diario" value={ritmoDiario.toFixed(1)} subtitle={`Promedio de los últimos ${Math.min(DIAS_PROMEDIO_RITMO, serieCompleta.length)} días`}
              icon={<SpeedIcon />} color="#2dd4bf" />
            <StatCard label="Días para la elección" value={diasRestantes > 0 ? diasRestantes : "Hoy"} subtitle="04 de octubre de 2026"
              icon={<EventIcon />} color="#f59e0b" />
            <StatCard label="Proyección al día de la elección" value={numberFmt.format(totalProyectado)} subtitle={diasRestantes > 0 ? "Si se mantiene el ritmo actual" : "La elección ya llegó"}
              icon={<FlagIcon />} color="#a78bfa" />
          </div>

          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUpIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Registros nuevos por día</h3>
              </div>
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
              <BarrasDiarias puntos={serieVisible} />
            </div>
          </div>

          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)]">
              <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Total acumulado y proyección</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                La proyección asume que se mantiene el ritmo diario reciente ({ritmoDiario.toFixed(1)} personeros/día) hasta el día de la elección.
              </p>
            </div>
            <LineaAcumulada historico={serieCompleta} proyeccion={proyeccion} fechaEleccion={fechaEleccionLima} />
          </div>
        </>
      )}
    </div>
  );
}
