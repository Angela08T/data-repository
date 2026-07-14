"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { exportMultiSheetExcel } from "@/lib/utils/exportExcel";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import BarChartIcon from "@mui/icons-material/BarChart";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import BoltIcon from "@mui/icons-material/Bolt";
import SensorsIcon from "@mui/icons-material/Sensors";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

// TODO: mismo nombre usado en src/app/reportar-votos/page.tsx
const NOMBRE_PARTIDO = "Jesús Maldonado";

const REFRESH_MS = 20000;
const RITMO_VENTANA_MS = 5 * 60 * 1000;
const HISTORIAL_MAX = 20;
const HORA_INICIO_VOTACION = 8; // apertura de mesas
// Electores hábiles en San Juan de Lurigancho, elecciones generales 2021 (JNE) —
// cifra más reciente disponible; se usa solo como referencia de contexto, no como
// techo del eje Y (con pocos votos de prueba el gráfico se vería plano).
const ELECTORES_ESTIMADOS_SJL = 794417;

interface ActaMesa {
  numero_mesa: string;
  created_at: string;
  personeros: { comuna: string | null } | null;
}

const numberFmt = new Intl.NumberFormat("es-PE");

// ── Evolución de votos por hora (acumulado, desde la apertura hasta ahora) ───
// Todo el cálculo de horas se hace en huso horario de Lima (UTC-5, Perú no usa
// horario de verano) en vez del huso horario del navegador que esté mirando la
// página — así la hora de cada voto siempre corresponde a la hora real en Perú
// en que el personero lo envió, sin importar dónde esté el dispositivo que lo ve.
interface PuntoEvolucion { label: string; votos: number; }

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;

// Traslada un instante real a un Date cuyos getters UTC devuelven la hora/fecha
// de Lima. Como es un desplazamiento constante, las comparaciones entre fechas
// desplazadas siguen siendo válidas (equivalen a comparar los instantes reales).
function aHoraLima(d: Date): Date {
  return new Date(d.getTime() + LIMA_OFFSET_MS);
}

function claveDiaLima(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function buildEvolucionHoy(actas: ActaMesa[]): PuntoEvolucion[] {
  const ahoraLima = aHoraLima(new Date());
  const horaFin = Math.max(ahoraLima.getUTCHours(), HORA_INICIO_VOTACION);
  const hoyKey = claveDiaLima(ahoraLima);

  const actasHoyLima = actas
    .map((a) => aHoraLima(new Date(a.created_at)))
    .filter((d) => claveDiaLima(d) === hoyKey);

  const puntos: PuntoEvolucion[] = [];
  for (let h = HORA_INICIO_VOTACION; h <= horaFin; h++) {
    const esUltimo = h === horaFin;
    const limiteLima = esUltimo
      ? ahoraLima
      : new Date(Date.UTC(ahoraLima.getUTCFullYear(), ahoraLima.getUTCMonth(), ahoraLima.getUTCDate(), h, 59, 59, 999));
    const votos = actasHoyLima.filter((d) => d.getTime() <= limiteLima.getTime()).length;
    puntos.push({ label: esUltimo ? "Ahora" : `${String(h).padStart(2, "0")}:00`, votos });
  }
  return puntos;
}

function nextNiceMax(n: number): number {
  if (n <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / pow;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * pow;
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${n}`;
}

// ── Conteo animado ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (to - from) * eased);
      displayRef.current = value;
      setDisplay(value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function AnimatedNumber({ value, duration }: { value: number; duration?: number }) {
  const display = useCountUp(value, duration);
  return <>{numberFmt.format(display)}</>;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
      style={{ background: "rgba(255,255,255,0.16)", color: "#fff" }}>
      <span className="relative flex h-2 w-2">
        <span className="live-dot absolute inline-flex h-full w-full rounded-full" style={{ background: "#4ade80" }} />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#4ade80" }} />
      </span>
      En vivo
    </span>
  );
}

// ── Mini gráfico de tendencia (para el hero) ─────────────────────────────────
function Sparkline({ data, color = "#fff" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const width = 100, height = 34, pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
    </svg>
  );
}

function IconBadge({ icon, color, pulse }: { icon: React.ReactNode; color: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex w-9 h-9 items-center justify-center rounded-full flex-shrink-0" style={{ background: `${color}18` }}>
      {pulse && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: `${color}40` }} />}
      <span className="relative flex items-center justify-center" style={{ color }}>{icon}</span>
    </span>
  );
}

function TrendCard({ label, value, subtitle, icon, color }: {
  label: string; value: string; subtitle: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="kpi-enter stat-card bg-white rounded-2xl shadow p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <IconBadge icon={icon} color={color} />
      </div>
      <p className="text-2xl md:text-3xl font-extrabold" style={{ color: "#0d1b3e" }}>{value}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <ArrowUpwardIcon sx={{ fontSize: 14, color: "#16a34a" }} />
        <span className="text-xs font-semibold" style={{ color: "#16a34a" }}>{subtitle}</span>
      </div>
    </div>
  );
}

function ProgressCard({ label, value, pctLabel, pct, icon, color }: {
  label: string; value: string; pctLabel: string; pct: number; icon: React.ReactNode; color: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);

  return (
    <div className="kpi-enter stat-card bg-white rounded-2xl shadow p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <IconBadge icon={icon} color={color} pulse />
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl md:text-3xl font-extrabold" style={{ color: "#0d1b3e" }}>{value}</p>
        <span className="text-xs font-bold" style={{ color }}>{pctLabel}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mt-3" style={{ background: `${color}18` }}>
        <div
          className="h-full rounded-full transition-all duration-[900ms] ease-out"
          style={{ width: mounted ? `${pct}%` : "0%", background: color }}
        />
      </div>
    </div>
  );
}

function SimpleStatCard({ label, value, subtitle, icon, color }: {
  label: string; value: string | number; subtitle: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="kpi-enter stat-card bg-white rounded-2xl shadow p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <IconBadge icon={icon} color={color} />
      </div>
      <p className="text-2xl md:text-3xl font-extrabold" style={{ color: "#0d1b3e" }}>{value}</p>
      <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
    </div>
  );
}

function ComunaBar({ comuna, votos, mesas, pct, delay }: {
  comuna: string; votos: number; mesas: number; pct: number; delay: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className="px-6 py-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-gray-700">{comuna}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{mesas} mesa{mesas !== 1 ? "s" : ""}</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: "#1565c0" }}>{votos}</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#eff6ff" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: mounted ? `${pct}%` : "0%",
            background: "linear-gradient(90deg, #1565c0, #1976d2)",
          }}
        />
      </div>
    </div>
  );
}

function EvolucionChart({ puntos }: { puntos: PuntoEvolucion[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);

  const width = 900, height = 240, padL = 42, padR = 16, padT = 24, padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVotos = Math.max(...puntos.map((p) => p.votos), 1);
  const yMax = nextNiceMax(maxVotos);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));

  const xFor = (i: number) => padL + (puntos.length > 1 ? (i / (puntos.length - 1)) * plotW : plotW / 2);
  const yFor = (v: number) => padT + plotH - (v / yMax) * plotH;

  const linePath = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.votos).toFixed(1)}`).join(" ");
  const areaPath = puntos.length > 0
    ? `${linePath} L ${xFor(puntos.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    : "";

  const ultimo = puntos[puntos.length - 1];
  const ultimoX = xFor(puntos.length - 1);
  const ultimoY = yFor(ultimo?.votos ?? 0);
  const labelStep = Math.max(1, Math.ceil(puntos.length / 8));
  const pctPadron = ((ultimo?.votos ?? 0) / ELECTORES_ESTIMADOS_SJL) * 100;

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base" style={{ color: "#0d1b3e" }}>Evolución de votos en tiempo real</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {numberFmt.format(ultimo?.votos ?? 0)} de ~{numberFmt.format(ELECTORES_ESTIMADOS_SJL)} electores estimados en SJL ({pctPadron < 0.01 && pctPadron > 0 ? "<0.01" : pctPadron.toFixed(2)}%)
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: "#eff6ff", color: "#1565c0" }}>Hoy</span>
      </div>

      <div className="px-4 py-4 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
          <defs>
            <linearGradient id="evolucionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1565c0" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1565c0" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={yFor(t)} y2={yFor(t)} stroke="#eef2f7" strokeWidth={1} />
              <text x={padL - 8} y={yFor(t) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{formatCompact(t)}</text>
            </g>
          ))}

          {puntos.map((p, i) => (
            (i % labelStep === 0 || i === puntos.length - 1) && (
              <text key={`${p.label}-${i}`} x={xFor(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {p.label}
              </text>
            )
          ))}

          <path d={areaPath} fill="url(#evolucionFill)" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }} />
          <path
            d={linePath}
            fill="none"
            stroke="#1565c0"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: mounted ? 0 : 1,
              transition: "stroke-dashoffset 1.1s ease-out",
            }}
          />
          {ultimo && <circle cx={ultimoX} cy={ultimoY} r={5} fill="#1565c0" stroke="#fff" strokeWidth={2} />}
        </svg>

        {ultimo && (
          <div
            className="absolute px-2 py-1 rounded-lg text-xs font-bold text-white shadow whitespace-nowrap pointer-events-none"
            style={{
              left: `${(ultimoX / width) * 100}%`,
              top: `${(ultimoY / height) * 100}%`,
              transform: "translate(-50%, -170%)",
              background: "#1565c0",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 1s",
            }}
          >
            {numberFmt.format(ultimo.votos)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultadosVotosPage() {
  const [actas, setActas] = useState<ActaMesa[]>([]);
  const [mesasAsignadas, setMesasAsignadas] = useState(0);
  const [historial, setHistorial] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);

    const [resActas, resPersoneros] = await Promise.all([
      supabase
        .from("actas_mesa")
        .select("numero_mesa, created_at, personeros(comuna)"),
      supabase.from("personeros").select("numero_mesa").not("numero_mesa", "is", null),
    ]);

    if (resActas.error) { setError(resActas.error.message); setLoading(false); return; }

    const rows = (resActas.data as unknown as ActaMesa[]) ?? [];
    setActas(rows);
    setHistorial((prev) => {
      const next = [...prev, rows.length];
      return next.length > HISTORIAL_MAX ? next.slice(next.length - HISTORIAL_MAX) : next;
    });

    const mesasUnicas = new Set((resPersoneros.data ?? []).map((p) => p.numero_mesa).filter(Boolean));
    setMesasAsignadas(mesasUnicas.size);

    setUltimaActualizacion(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const totalVotosPartido = actas.length;
  const mesasReportadas = new Set(actas.map((a) => a.numero_mesa)).size;
  const coberturaPct = mesasAsignadas > 0 ? Math.round((mesasReportadas / mesasAsignadas) * 100) : 0;
  const promedioPorMesa = mesasReportadas > 0 ? Math.round((totalVotosPartido / mesasReportadas) * 10) / 10 : 0;

  const ahora = ultimaActualizacion?.getTime() ?? 0;
  const ritmoReciente = ahora
    ? actas.filter((a) => ahora - new Date(a.created_at).getTime() <= RITMO_VENTANA_MS).length
    : 0;

  const porComunaMap = actas.reduce<Record<string, { mesas: Set<string>; votos: number }>>((acc, a) => {
    const comuna = a.personeros?.comuna?.trim() || "Sin comuna";
    if (!acc[comuna]) acc[comuna] = { mesas: new Set(), votos: 0 };
    acc[comuna].mesas.add(a.numero_mesa);
    acc[comuna].votos += 1;
    return acc;
  }, {});

  const porComuna = Object.entries(porComunaMap)
    .map(([comuna, r]) => ({ comuna, votos: r.votos, mesas: r.mesas.size }))
    .sort((a, b) => b.votos - a.votos);
  const maxComunaVotos = Math.max(...porComuna.map((c) => c.votos), 1);

  const puntosEvolucion = buildEvolucionHoy(actas);

  const handleExport = () => {
    const sheets = [
      {
        name: "Resumen",
        rows: [{
          "Partido": NOMBRE_PARTIDO,
          "Total de votos": totalVotosPartido,
          "Mesas reportadas": mesasReportadas,
          "Mesas asignadas": mesasAsignadas,
          "% cobertura": `${coberturaPct}%`,
          "Promedio por mesa": promedioPorMesa,
          "Votos últimos 5 min": ritmoReciente,
        }],
      },
      {
        name: "Por Comuna",
        rows: porComuna.map((c) => ({ "Comuna": c.comuna, "Mesas reportadas": c.mesas, "Votos": c.votos })),
      },
      {
        name: "Evolución Hoy",
        rows: puntosEvolucion.map((p) => ({ "Hora": p.label, "Votos acumulados": p.votos })),
      },
    ];
    exportMultiSheetExcel(sheets, `Resultados_Votacion_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Resultados en Vivo</h1>
          <p className="text-sm text-gray-400 mt-1">
            Conteo paralelo en base a los votos reportados por los personeros
            {ultimaActualizacion && ` · Actualizado ${ultimaActualizacion.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip title="Exportar Excel">
            <IconButton onClick={handleExport} disabled={loading || actas.length === 0}>
              <FileDownloadIcon sx={{ color: actas.length > 0 ? "#1565c0" : "#d1d5db" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchData} disabled={loading}>
              <RefreshIcon sx={{ color: loading ? "#d1d5db" : "#94a3b8" }} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <CircularProgress size={36} sx={{ color: "#1565c0" }} />
          <p className="text-gray-400 text-sm mt-4">Cargando resultados...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-red-400 text-sm">
          Error al cargar datos: {error}
        </div>
      ) : (
        <>
          {/* Hero: total de votos */}
          <div className="hero-card rounded-3xl shadow-xl p-8 md:p-10 text-center"
            style={{ background: "linear-gradient(135deg, #0d47a1, #1565c0 55%, #1976d2)" }}>

            <HowToVoteIcon sx={{ position: "absolute", top: -18, right: -10, fontSize: 190, color: "rgba(255,255,255,0.06)" }} />

            <div className="flex justify-center mb-4">
              <LiveBadge />
            </div>

            <p className="text-xs md:text-sm font-bold uppercase tracking-[0.15em]" style={{ color: "#bfdbfe" }}>
              Total de votos — {NOMBRE_PARTIDO}
            </p>
            <p className="text-7xl md:text-8xl font-black text-white mt-3 tracking-tight" style={{ textShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
              <AnimatedNumber value={totalVotosPartido} />
            </p>
            <p className="text-sm mt-4" style={{ color: "#dbeafe" }}>
              <strong className="text-white">{mesasReportadas}</strong> de <strong className="text-white">{mesasAsignadas}</strong> mesas reportadas · {coberturaPct}% de cobertura
            </p>

            <div className="absolute bottom-4 right-6 hidden sm:block">
              <Sparkline data={historial} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TrendCard
              label="Ritmo reciente"
              value={`+${ritmoReciente}`}
              subtitle="en los últimos 5 min"
              icon={<BoltIcon sx={{ fontSize: 18 }} />}
              color="#1565c0"
            />
            <ProgressCard
              label="Mesas reportando"
              value={`${mesasReportadas} / ${mesasAsignadas}`}
              pctLabel={`${coberturaPct}%`}
              pct={coberturaPct}
              icon={<SensorsIcon sx={{ fontSize: 18 }} />}
              color="#16a34a"
            />
            <SimpleStatCard
              label="Promedio por mesa"
              value={promedioPorMesa}
              subtitle="Votos por mesa reportada"
              icon={<BarChartIcon sx={{ fontSize: 18 }} />}
              color="#7c3aed"
            />
          </div>

          {actas.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 text-sm">
              Aún no hay votos reportados. Los resultados aparecerán aquí apenas los personeros empiecen a enviar sus reportes.
            </div>
          )}

          <EvolucionChart puntos={puntosEvolucion} />

          {porComuna.length > 0 && (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <LocationCityIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <h3 className="font-bold text-base" style={{ color: "#0d1b3e" }}>Votos por comuna</h3>
              </div>
              <div className="divide-y divide-gray-50 py-2">
                {porComuna.map((c, i) => (
                  <ComunaBar
                    key={c.comuna}
                    comuna={c.comuna}
                    votos={c.votos}
                    mesas={c.mesas}
                    pct={Math.round((c.votos / maxComunaVotos) * 100)}
                    delay={80 + i * 80}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
