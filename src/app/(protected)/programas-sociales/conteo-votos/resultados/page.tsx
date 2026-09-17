"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { exportMultiSheetExcel } from "@/lib/utils/exportExcel";
import { Ambito } from "@/lib/partidos-eleccion";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import BarChartIcon from "@mui/icons-material/BarChart";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BoltIcon from "@mui/icons-material/Bolt";
import SensorsIcon from "@mui/icons-material/Sensors";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

const REFRESH_MS = 20000;
const RITMO_VENTANA_MS = 5 * 60 * 1000;
const HISTORIAL_MAX = 20;
const HORA_INICIO_VOTACION = 8; // apertura de mesas
// Electores hábiles en San Juan de Lurigancho, elecciones generales 2021 (JNE) —
// cifra más reciente disponible; se usa solo como referencia de contexto, no como
// techo del eje Y (con pocos votos de prueba el gráfico se vería plano).
const ELECTORES_ESTIMADOS_SJL = 794417;

const COLORES_PARTIDOS = ["#1565c0", "#7c3aed", "#16a34a", "#d97706", "#db2777", "#0891b2", "#dc2626", "#4f46e5"];
const COLORES_MEDALLA = ["#eab308", "#94a3b8", "#b45309"]; // oro, plata, bronce

// Colores de acento por ámbito: SJL en azul (prioritario), Lima en morado
// (secundario) — se usan de forma consistente en toda la página para que sea
// obvio de un vistazo cuál sección es cuál.
const COLOR_SJL = "#1565c0";
const COLOR_LIMA = "#7c3aed";

interface ActaMesa {
  id: string;
  created_at: string;
  votos_blancos_sjl: number | null;
  votos_nulos_sjl: number | null;
  votos_impugnados_sjl: number | null;
  votos_blancos_lima: number | null;
  votos_nulos_lima: number | null;
  votos_impugnados_lima: number | null;
  personeros: { comuna: string | null } | null;
}

// Estas dos vistas vienen de funciones agregadas en Postgres (resultados_por_partido
// y resumen_actas_por_ambito) en vez de bajar las ~150 mil filas crudas de
// votos_partido (mesas × partidos) al navegador en cada refresh — con miles de
// mesas reportando, esa diferencia es lo que mantiene la página fluida.
interface ResultadoPartidoRow {
  ambito: Ambito;
  numero_lista: number;
  nombre: string;
  votos: number | string;
}

interface ResumenActaAmbitoRow {
  acta_id: string;
  ambito: Ambito;
  total_votos: number | string;
}

interface ResultadoPartido {
  numero: number;
  nombre: string;
  votos: number;
  pct: number;
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

// El total de votos válidos de una mesa (por ámbito) viene de la función
// agregada resumen_actas_por_ambito (ver fetchData) en vez de sumarse a mano
// recorriendo cada fila de votos_partido, así que se pasa un mapa
// "acta_id|ambito" -> total, precalculado una vez por fetch.
function totalVotosActa(a: ActaMesa, ambito: Ambito, resumenPorActaAmbito: Map<string, number>): number {
  const base = resumenPorActaAmbito.get(`${a.id}|${ambito}`) ?? 0;
  if (ambito === "sjl") return base + (a.votos_blancos_sjl ?? 0) + (a.votos_nulos_sjl ?? 0) + (a.votos_impugnados_sjl ?? 0);
  return base + (a.votos_blancos_lima ?? 0) + (a.votos_nulos_lima ?? 0) + (a.votos_impugnados_lima ?? 0);
}

function buildEvolucionHoy(actas: ActaMesa[], ambito: Ambito, resumenPorActaAmbito: Map<string, number>): PuntoEvolucion[] {
  const ahoraLima = aHoraLima(new Date());
  const horaFin = Math.max(ahoraLima.getUTCHours(), HORA_INICIO_VOTACION);
  const hoyKey = claveDiaLima(ahoraLima);

  const actasHoyLima = actas
    .map((a) => ({ fechaLima: aHoraLima(new Date(a.created_at)), total: totalVotosActa(a, ambito, resumenPorActaAmbito) }))
    .filter((a) => claveDiaLima(a.fechaLima) === hoyKey);

  const puntos: PuntoEvolucion[] = [];
  for (let h = HORA_INICIO_VOTACION; h <= horaFin; h++) {
    const esUltimo = h === horaFin;
    const limiteLima = esUltimo
      ? ahoraLima
      : new Date(Date.UTC(ahoraLima.getUTCFullYear(), ahoraLima.getUTCMonth(), ahoraLima.getUTCDate(), h, 59, 59, 999));
    const votos = actasHoyLima
      .filter((a) => a.fechaLima.getTime() <= limiteLima.getTime())
      .reduce((sum, a) => sum + a.total, 0);
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
    <div className="kpi-enter stat-card glow-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <IconBadge icon={icon} color={color} />
      </div>
      <p className="text-2xl md:text-3xl font-extrabold" style={{ color: "#eef2ff" }}>{value}</p>
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
    <div className="kpi-enter stat-card glow-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <IconBadge icon={icon} color={color} pulse />
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl md:text-3xl font-extrabold" style={{ color: "#eef2ff" }}>{value}</p>
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
    <div className="kpi-enter stat-card glow-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <IconBadge icon={icon} color={color} />
      </div>
      <p className="text-2xl md:text-3xl font-extrabold" style={{ color: "#eef2ff" }}>{value}</p>
      <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
    </div>
  );
}

function ComunaBar({ comuna, votos, mesas, pct, delay, color }: {
  comuna: string; votos: number; mesas: number; pct: number; delay: number; color: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className="px-6 py-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-[#cbd5e1]">{comuna}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{mesas} mesa{mesas !== 1 ? "s" : ""}</span>
          <span className="text-sm font-bold tabular-nums" style={{ color }}>{votos}</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `${color}22` }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: mounted ? `${pct}%` : "0%",
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          }}
        />
      </div>
    </div>
  );
}

function PartidoBar({ resultado, color, delay, rank }: { resultado: ResultadoPartido; color: string; delay: number; rank?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const esPodio = !!rank && rank <= 3 && resultado.votos > 0;
  const colorMedalla = esPodio ? COLORES_MEDALLA[rank! - 1] : undefined;

  return (
    <div className="px-6 py-3" style={esPodio ? { background: `${colorMedalla}0c` } : undefined}>
      <div className="flex justify-between items-center gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {esPodio && <MilitaryTechIcon sx={{ fontSize: 18, color: colorMedalla, flexShrink: 0 }} />}
          <span className="text-sm font-semibold text-[#cbd5e1] truncate block">{resultado.numero}. {resultado.nombre}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400 tabular-nums">{resultado.pct.toFixed(1)}%</span>
          <span className="text-sm font-bold tabular-nums" style={{ color }}>{numberFmt.format(resultado.votos)}</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `${color}18` }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: mounted ? `${resultado.pct}%` : "0%", background: color }}
        />
      </div>
    </div>
  );
}

// ── Podio (top 3) ────────────────────────────────────────────────────────────
function PodiumCard({ resultado, rank, color }: { resultado: ResultadoPartido; rank: 1 | 2 | 3; color: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150 + rank * 120);
    return () => clearTimeout(t);
  }, [rank]);

  const alturaBloque: Record<number, string> = { 1: "h-28 md:h-36", 2: "h-20 md:h-24", 3: "h-14 md:h-16" };
  const ordenVisual: Record<number, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };
  const escalaAvatar = rank === 1 ? "w-16 h-16 md:w-20 md:h-20 text-xl md:text-2xl" : "w-12 h-12 md:w-14 md:h-14 text-base md:text-lg";

  return (
    <div className={`flex flex-col items-center flex-1 min-w-0 ${ordenVisual[rank]}`}>
      {rank === 1 && <WorkspacePremiumIcon sx={{ fontSize: 26, color, mb: 0.5 }} />}
      <div
        className={`rounded-full flex items-center justify-center text-white font-black shadow-lg mb-2 ring-4 ring-white flex-shrink-0 ${escalaAvatar}`}
        style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 8px 20px ${color}40` }}
      >
        {resultado.nombre.charAt(0).toUpperCase()}
      </div>
      <p className="text-xs md:text-sm font-bold text-center truncate max-w-full px-1" style={{ color: "#eef2ff" }}>
        {resultado.nombre}
      </p>
      <p className="text-base md:text-xl font-black tabular-nums mt-1" style={{ color }}>
        {numberFmt.format(resultado.votos)}
      </p>
      <p className="text-[11px] font-semibold text-gray-400 mb-2">{resultado.pct.toFixed(1)}%</p>
      <div
        className={`w-full rounded-t-xl flex items-start justify-center pt-2 transition-all duration-700 ease-out ${alturaBloque[rank]}`}
        style={{
          background: `linear-gradient(180deg, ${color}, ${color}cc)`,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scaleY(1)" : "scaleY(0.6)",
          transformOrigin: "bottom",
        }}
      >
        <span className="text-white font-black text-xl md:text-2xl" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
          {rank}
        </span>
      </div>
    </div>
  );
}

function Podio({ resultados }: { resultados: ResultadoPartido[] }) {
  const top3 = resultados.filter((r) => r.votos > 0).slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="kpi-enter glow-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center gap-2">
        <EmojiEventsIcon sx={{ fontSize: 18, color: "#eab308" }} />
        <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Podio</h3>
      </div>
      <div className="flex items-end justify-center gap-3 md:gap-8 px-6 pt-8 pb-0">
        {top3.map((r, i) => (
          <PodiumCard key={r.numero} resultado={r} rank={(i + 1) as 1 | 2 | 3} color={COLORES_MEDALLA[i]} />
        ))}
      </div>
    </div>
  );
}

function EvolucionChart({ puntos, color, titulo, subtitulo }: { puntos: PuntoEvolucion[]; color: string; titulo: string; subtitulo: string }) {
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
  const gradientId = `evolucionFill-${titulo.replace(/\s+/g, "")}`;

  return (
    <div className="glow-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>{titulo}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: `${color}22`, color }}>Hoy</span>
      </div>

      <div className="px-4 py-4 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={yFor(t)} y2={yFor(t)} stroke="rgba(148,163,184,0.14)" strokeWidth={1} />
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

          <path d={areaPath} fill={`url(#${gradientId})`} style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }} />
          <path
            d={linePath}
            fill="none"
            stroke={color}
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
          {ultimo && <circle cx={ultimoX} cy={ultimoY} r={5} fill={color} stroke="#fff" strokeWidth={2} />}
        </svg>

        {ultimo && (
          <div
            className="absolute px-2 py-1 rounded-lg text-xs font-bold text-white shadow whitespace-nowrap pointer-events-none"
            style={{
              left: `${(ultimoX / width) * 100}%`,
              top: `${(ultimoY / height) * 100}%`,
              transform: "translate(-50%, -170%)",
              background: color,
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

// ── Sección secundaria compacta (Lima) ───────────────────────────────────────
function SeccionSecundaria({ titulo, resultados, totalVotos, mesasReportadas, color }: {
  titulo: string; resultados: ResultadoPartido[]; totalVotos: number; mesasReportadas: number; color: string;
}) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const lider = resultados[0];

  return (
    <div className="glow-card rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}33` }}>
      <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ background: `${color}14` }}>
        <div className="flex items-center gap-2">
          <LocationCityIcon sx={{ fontSize: 20, color }} />
          <div>
            <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>{titulo}</h3>
            <p className="text-xs text-gray-400">Secundario · {mesasReportadas} mesa{mesasReportadas !== 1 ? "s" : ""} reportada{mesasReportadas !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {lider && lider.votos > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Va ganando</p>
            <p className="text-sm font-bold truncate max-w-[160px]" style={{ color }}>{lider.nombre}</p>
          </div>
        )}
      </div>

      {resultados.length === 0 || totalVotos === 0 ? (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">Aún no hay votos reportados para Lima.</div>
      ) : (
        <>
          <div className="flex items-center justify-between px-6 pt-3">
            <span className="text-xs text-gray-400">{numberFmt.format(totalVotos)} votos válidos</span>
            {resultados.length > 5 && (
              <button
                onClick={() => setMostrarTodos((v) => !v)}
                className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                style={{ background: `${color}22`, color }}>
                {mostrarTodos ? "Ver menos" : `Ver los ${resultados.length}`}
              </button>
            )}
          </div>
          <div className="divide-y divide-[rgba(148,163,184,0.10)] py-2">
            {(mostrarTodos ? resultados : resultados.slice(0, 5)).map((r, i) => (
              <PartidoBar key={r.numero} resultado={r} color={color} delay={40 + i * 40} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ResultadosVotosPage() {
  const [actas, setActas] = useState<ActaMesa[]>([]);
  const [resultadosPartido, setResultadosPartido] = useState<ResultadoPartidoRow[]>([]);
  const [resumenActas, setResumenActas] = useState<ResumenActaAmbitoRow[]>([]);
  const [mesasAsignadas, setMesasAsignadas] = useState(0);
  const [historial, setHistorial] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [mostrarTodosSjl, setMostrarTodosSjl] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);

    // resultados_por_partido y resumen_actas_por_ambito son funciones de
    // Postgres que agregan en la base de datos — con miles de mesas, traer
    // cada voto por partido crudo (mesas × partidos) haría la página cada vez
    // más lenta; así siempre bajan unas pocas decenas/cientos de filas.
    const [resActas, resResultados, resResumen, resPersoneros] = await Promise.all([
      supabase
        .from("actas_mesa")
        .select("id, created_at, votos_blancos_sjl, votos_nulos_sjl, votos_impugnados_sjl, votos_blancos_lima, votos_nulos_lima, votos_impugnados_lima, personeros(comuna)"),
      supabase.rpc("resultados_por_partido"),
      supabase.rpc("resumen_actas_por_ambito"),
      supabase.from("personeros").select("numero_mesa").not("numero_mesa", "is", null),
    ]);

    if (resActas.error) { setError(resActas.error.message); setLoading(false); return; }
    if (resResultados.error) { setError(resResultados.error.message); setLoading(false); return; }
    if (resResumen.error) { setError(resResumen.error.message); setLoading(false); return; }

    const rows = (resActas.data as unknown as ActaMesa[]) ?? [];
    setActas(rows);
    setResultadosPartido((resResultados.data as ResultadoPartidoRow[]) ?? []);
    setResumenActas((resResumen.data as ResumenActaAmbitoRow[]) ?? []);
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

  // Mapa "acta_id|ambito" -> total de votos válidos de esa mesa en ese ámbito,
  // ya sumado en la base de datos.
  const resumenPorActaAmbito = new Map<string, number>();
  for (const r of resumenActas) {
    resumenPorActaAmbito.set(`${r.acta_id}|${r.ambito}`, Number(r.total_votos) || 0);
  }

  // 1 fila de actas_mesa = 1 mesa reportada.
  const mesasReportadas = actas.length;
  const coberturaPct = mesasAsignadas > 0 ? Math.round((mesasReportadas / mesasAsignadas) * 100) : 0;
  const totalVotosValidosSjl = actas.reduce((sum, a) => sum + totalVotosActa(a, "sjl", resumenPorActaAmbito), 0);
  const totalVotosValidosLima = actas.reduce((sum, a) => sum + totalVotosActa(a, "lima", resumenPorActaAmbito), 0);
  const promedioPorMesaSjl = mesasReportadas > 0 ? Math.round((totalVotosValidosSjl / mesasReportadas) * 10) / 10 : 0;

  const ahora = ultimaActualizacion?.getTime() ?? 0;
  const ritmoReciente = ahora
    ? actas.filter((a) => ahora - new Date(a.created_at).getTime() <= RITMO_VENTANA_MS).length
    : 0;

  function calcularResultados(ambito: Ambito): ResultadoPartido[] {
    const resultados: ResultadoPartido[] = resultadosPartido
      .filter((r) => r.ambito === ambito)
      .map((r) => ({ numero: r.numero_lista, nombre: r.nombre, votos: Number(r.votos) || 0, pct: 0 }));
    const total = resultados.reduce((sum, r) => sum + r.votos, 0);
    resultados.forEach((r) => { r.pct = total > 0 ? (r.votos / total) * 100 : 0; });
    resultados.sort((a, b) => b.votos - a.votos);
    return resultados;
  }

  const resultadosSjl = calcularResultados("sjl");
  const resultadosLima = calcularResultados("lima");
  const totalVotosSjlPartidos = resultadosSjl.reduce((sum, r) => sum + r.votos, 0);
  const liderSjl = resultadosSjl[0];

  const porComunaMap = actas.reduce<Record<string, { mesas: number; votos: number }>>((acc, a) => {
    const comuna = a.personeros?.comuna?.trim() || "Sin comuna";
    if (!acc[comuna]) acc[comuna] = { mesas: 0, votos: 0 };
    acc[comuna].mesas += 1;
    acc[comuna].votos += totalVotosActa(a, "sjl", resumenPorActaAmbito);
    return acc;
  }, {});

  const porComuna = Object.entries(porComunaMap)
    .map(([comuna, r]) => ({ comuna, votos: r.votos, mesas: r.mesas }))
    .sort((a, b) => b.votos - a.votos);
  const maxComunaVotos = Math.max(...porComuna.map((c) => c.votos), 1);

  const puntosEvolucionSjl = buildEvolucionHoy(actas, "sjl", resumenPorActaAmbito);
  const puntosEvolucionLima = buildEvolucionHoy(actas, "lima", resumenPorActaAmbito);
  const ultimoSjl = puntosEvolucionSjl[puntosEvolucionSjl.length - 1];
  const pctPadronSjl = ((ultimoSjl?.votos ?? 0) / ELECTORES_ESTIMADOS_SJL) * 100;

  const handleExport = () => {
    const sheets = [
      {
        name: "Resumen",
        rows: [{
          "Partido líder SJL": liderSjl ? liderSjl.nombre : "",
          "Votos del líder SJL": liderSjl?.votos ?? 0,
          "Total de votos válidos SJL": totalVotosValidosSjl,
          "Total de votos válidos Lima": totalVotosValidosLima,
          "Mesas reportadas": mesasReportadas,
          "Mesas asignadas": mesasAsignadas,
          "% cobertura": `${coberturaPct}%`,
          "Promedio por mesa (SJL)": promedioPorMesaSjl,
          "Mesas reportadas últimos 5 min": ritmoReciente,
        }],
      },
      {
        name: "Por Partido - SJL",
        rows: resultadosSjl.map((r) => ({
          "N°": r.numero, "Partido": r.nombre, "Votos": r.votos, "%": `${r.pct.toFixed(2)}%`,
        })),
      },
      {
        name: "Por Partido - Lima",
        rows: resultadosLima.map((r) => ({
          "N°": r.numero, "Partido": r.nombre, "Votos": r.votos, "%": `${r.pct.toFixed(2)}%`,
        })),
      },
      {
        name: "Por Comuna (SJL)",
        rows: porComuna.map((c) => ({ "Comuna": c.comuna, "Mesas reportadas": c.mesas, "Votos": c.votos })),
      },
      {
        name: "Evolución Hoy - SJL",
        rows: puntosEvolucionSjl.map((p) => ({ "Hora": p.label, "Votos acumulados": p.votos })),
      },
    ];
    exportMultiSheetExcel(sheets, `Resultados_Votacion_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Resultados en Vivo</h1>
          <p className="text-sm text-gray-400 mt-1">
            Conteo paralelo — San Juan de Lurigancho (distrital) primero, Lima Metropolitana (provincial) como referencia
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
        <div className="glow-card rounded-2xl p-10 text-center text-red-400 text-sm">
          Error al cargar datos: {error}
        </div>
      ) : (
        <>
          {/* ── SJL: siempre primero, siempre el bloque principal ── */}
          <div className="flex items-center gap-2 pt-1">
            <ApartmentIcon sx={{ fontSize: 20, color: COLOR_SJL }} />
            <h2 className="text-lg font-black" style={{ color: "#eef2ff" }}>San Juan de Lurigancho</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${COLOR_SJL}22`, color: COLOR_SJL }}>
              Distrital · Prioritario
            </span>
          </div>

          {/* Hero: partido líder SJL */}
          <div className="hero-card rounded-3xl shadow-xl p-8 md:p-10 text-center"
            style={{ background: "linear-gradient(135deg, #0d47a1, #1565c0 55%, #1976d2)" }}>

            <HowToVoteIcon sx={{ position: "absolute", top: -18, right: -10, fontSize: 190, color: "rgba(255,255,255,0.06)" }} />

            <div className="flex justify-center mb-4">
              <LiveBadge />
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <WorkspacePremiumIcon sx={{ fontSize: 18, color: "#fbbf24" }} />
              <p className="text-xs md:text-sm font-bold uppercase tracking-[0.15em]" style={{ color: "#bfdbfe" }}>
                Va ganando en SJL
              </p>
            </div>
            {liderSjl && liderSjl.votos > 0 ? (
              <>
                <p className="text-3xl md:text-5xl font-black text-white mt-3 tracking-tight" style={{ textShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
                  {liderSjl.nombre}
                </p>
                <div className="relative flex justify-center mt-4">
                  <div
                    className="absolute inset-0 m-auto rounded-full pointer-events-none"
                    style={{ width: 220, height: 220, background: "radial-gradient(circle, rgba(251,191,36,0.35), transparent 70%)", filter: "blur(6px)" }}
                  />
                  <p className="relative text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight" style={{ textShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
                    <AnimatedNumber value={liderSjl.votos} />
                  </p>
                </div>
                <p className="text-sm mt-2" style={{ color: "#dbeafe" }}>
                  {liderSjl.pct.toFixed(1)}% de {numberFmt.format(totalVotosSjlPartidos)} votos válidos
                </p>
              </>
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-white mt-3">Aún no hay votos reportados</p>
            )}
            <p className="text-sm mt-4" style={{ color: "#dbeafe" }}>
              <strong className="text-white">{mesasReportadas}</strong> de <strong className="text-white">{mesasAsignadas}</strong> mesas reportadas · {coberturaPct}% de cobertura
            </p>

            <div className="absolute bottom-4 right-6 hidden sm:block">
              <Sparkline data={historial} />
            </div>
          </div>

          <Podio resultados={resultadosSjl} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TrendCard
              label="Ritmo reciente"
              value={`+${ritmoReciente}`}
              subtitle="mesas en los últimos 5 min"
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
              label="Promedio por mesa (SJL)"
              value={promedioPorMesaSjl}
              subtitle="Votos válidos por mesa reportada"
              icon={<BarChartIcon sx={{ fontSize: 18 }} />}
              color="#7c3aed"
            />
          </div>

          {actas.length === 0 ? (
            <div className="glow-card rounded-2xl p-10 text-center text-gray-400 text-sm">
              Aún no hay actas reportadas. Los resultados aparecerán aquí apenas los personeros empiecen a enviar sus reportes.
            </div>
          ) : (
            <div className="glow-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <EmojiEventsIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                  <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Resultados por partido — SJL</h3>
                </div>
                {resultadosSjl.length > 8 && (
                  <button
                    onClick={() => setMostrarTodosSjl((v) => !v)}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                    style={{ background: "rgba(59,130,246,0.16)", color: "#1565c0" }}>
                    {mostrarTodosSjl ? "Ver menos" : `Ver los ${resultadosSjl.length}`}
                  </button>
                )}
              </div>
              <div className="divide-y divide-[rgba(148,163,184,0.10)] py-2">
                {(mostrarTodosSjl ? resultadosSjl : resultadosSjl.slice(0, 8)).map((r, i) => (
                  <PartidoBar
                    key={r.numero}
                    resultado={r}
                    color={COLORES_PARTIDOS[i % COLORES_PARTIDOS.length]}
                    delay={60 + i * 60}
                    rank={i + 1}
                  />
                ))}
              </div>
            </div>
          )}

          <EvolucionChart
            puntos={puntosEvolucionSjl}
            color={COLOR_SJL}
            titulo="Evolución de votos en tiempo real — SJL"
            subtitulo={`${numberFmt.format(ultimoSjl?.votos ?? 0)} de ~${numberFmt.format(ELECTORES_ESTIMADOS_SJL)} electores estimados (${pctPadronSjl < 0.01 && pctPadronSjl > 0 ? "<0.01" : pctPadronSjl.toFixed(2)}%)`}
          />

          {porComuna.length > 0 && (
            <div className="glow-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center gap-2">
                <LocationCityIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Votos SJL por comuna</h3>
              </div>
              <div className="divide-y divide-[rgba(148,163,184,0.10)] py-2">
                {porComuna.map((c, i) => (
                  <ComunaBar
                    key={c.comuna}
                    comuna={c.comuna}
                    votos={c.votos}
                    mesas={c.mesas}
                    pct={Math.round((c.votos / maxComunaVotos) * 100)}
                    delay={80 + i * 80}
                    color={COLOR_SJL}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Lima: siempre después de SJL, como sección secundaria ── */}
          <div className="flex items-center gap-2 pt-4">
            <LocationCityIcon sx={{ fontSize: 20, color: COLOR_LIMA }} />
            <h2 className="text-lg font-black" style={{ color: "#eef2ff" }}>Lima Metropolitana</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${COLOR_LIMA}22`, color: COLOR_LIMA }}>
              Provincial · Secundario
            </span>
          </div>

          <SeccionSecundaria
            titulo="Resultados por partido — Lima"
            resultados={resultadosLima}
            totalVotos={totalVotosValidosLima}
            mesasReportadas={mesasReportadas}
            color={COLOR_LIMA}
          />

          {totalVotosValidosLima > 0 && (
            <EvolucionChart
              puntos={puntosEvolucionLima}
              color={COLOR_LIMA}
              titulo="Evolución de votos en tiempo real — Lima"
              subtitulo={`${numberFmt.format(puntosEvolucionLima[puntosEvolucionLima.length - 1]?.votos ?? 0)} votos válidos acumulados hoy`}
            />
          )}
        </>
      )}
    </div>
  );
}
