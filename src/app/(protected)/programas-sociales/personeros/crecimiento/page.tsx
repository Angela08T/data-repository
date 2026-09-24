"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { supabase } from "@/lib/supabase";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import SpeedIcon from "@mui/icons-material/Speed";
import EventIcon from "@mui/icons-material/Event";
import FlagIcon from "@mui/icons-material/Flag";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PersonIcon from "@mui/icons-material/Person";
import CalendarViewMonthIcon from "@mui/icons-material/CalendarViewMonth";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";

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
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Miér", "Jue", "Vie", "Sáb"];
function etiquetaDia(d: Date): string {
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}
function esPorRegistradorTexto(tipo: string | null): boolean {
  return !!tipo && tipo.trim().toLowerCase() !== "directo";
}

interface PuntoDiario {
  fecha: Date;
  key: string;
  directo: number;
  registrador: number;
  nuevos: number;
  acumulado: number;
  acumuladoDirecto: number;
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

// Mide el ancho real del contenedor para que las barras/celdas se dibujen a
// tamaño 1:1 (sin CSS que las estire): con pocos días de datos, se agrandan
// para llenar el espacio disponible; con muchos, se mantienen a su tamaño
// mínimo legible y el contenedor scrollea en vez de aplastarlas.
function useAnchoContenedor(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(900);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setAncho(Math.round(el.getBoundingClientRect().width));
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, ancho];
}

const COLOR_DIRECTO = "#2dd4bf";
const COLOR_REGISTRADOR = "#f59e0b";
const COLOR_TOTAL = "#3b82f6";
const COLOR_PROYECCION = "#a78bfa";

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
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Barras apiladas: directo (orgánico) + registrador (carga de campo) ──────
function BarrasApiladas({ puntos }: { puntos: PuntoDiario[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);
  const [contRef, anchoDisponible] = useAnchoContenedor();

  const alturaSvg = 220;
  const padB = 26, padT = 20;
  const plotH = alturaSvg - padB - padT;
  const gap = 10;
  const anchoBarraMin = 22;
  const anchoNecesario = puntos.length * (anchoBarraMin + gap) + gap;
  const anchoSvg = Math.max(anchoNecesario, anchoDisponible);
  const anchoBarra = anchoSvg > anchoNecesario ? (anchoSvg - gap * (puntos.length + 1)) / puntos.length : anchoBarraMin;
  const max = Math.max(...puntos.map((p) => p.nuevos), 1);

  return (
    <div ref={contRef} className="overflow-x-auto">
      <svg viewBox={`0 0 ${anchoSvg} ${alturaSvg}`} width={anchoSvg} height={alturaSvg} style={{ display: "block" }}>
        <line x1={0} x2={anchoSvg} y1={alturaSvg - padB} y2={alturaSvg - padB} stroke="rgba(148,163,184,0.22)" strokeWidth={1} />
        {puntos.map((p, i) => {
          const hDirecto = mounted ? (p.directo / max) * plotH : 0;
          const hRegistrador = mounted ? (p.registrador / max) * plotH : 0;
          const x = gap + i * (anchoBarra + gap);
          const yBase = alturaSvg - padB;
          const yDirectoTop = yBase - hDirecto;
          const yRegistradorTop = yDirectoTop - hRegistrador;
          return (
            <g key={p.key}>
              {p.nuevos > 0 && (
                <text x={x + anchoBarra / 2} y={yRegistradorTop - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#eef2ff">
                  {p.nuevos}
                </text>
              )}
              {p.registrador > 0 && (
                <rect x={x} y={yRegistradorTop} width={anchoBarra} height={hRegistrador} rx={4} fill={COLOR_REGISTRADOR}
                  style={{ transition: "height 700ms ease-out, y 700ms ease-out" }} />
              )}
              {p.directo > 0 && (
                <rect x={x} y={yDirectoTop} width={anchoBarra} height={hDirecto} rx={4} fill={COLOR_DIRECTO}
                  style={{ transition: "height 700ms ease-out, y 700ms ease-out" }} />
              )}
              {p.nuevos === 0 && <rect x={x} y={yBase - 2} width={anchoBarra} height={2} rx={1} fill="rgba(148,163,184,0.25)" />}
              <text x={x + anchoBarra / 2} y={alturaSvg - padB + 16} textAnchor="middle" fontSize={10} fill="#94a3b8" fontWeight={600}>
                {etiquetaDia(p.fecha)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 justify-center mt-1 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLOR_DIRECTO }} /> Directo (orgánico)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLOR_REGISTRADOR }} /> Por registrador (carga de campo)</span>
      </div>
    </div>
  );
}

// ── Mapa de calor tipo calendario — toda la historia en un vistazo ───────────
// La intensidad se escala con raíz cuadrada (no lineal): así un día con 1-5
// registros se distingue con claridad aunque exista un día con miles (una
// carga masiva), que en una barra normal aplastaría visualmente a todos los demás.
function MapaCalor({ puntos }: { puntos: PuntoDiario[] }) {
  const [contRef, anchoDisponible] = useAnchoContenedor();

  if (puntos.length === 0) return null;

  const primerDia = puntos[0].fecha;
  const inicioSemana = new Date(primerDia.getTime() - primerDia.getUTCDay() * 86400000);
  const porClave = new Map(puntos.map((p) => [p.key, p]));
  const ultimoDia = puntos[puntos.length - 1].fecha;
  const totalDias = Math.round((ultimoDia.getTime() - inicioSemana.getTime()) / 86400000) + 1;
  const totalSemanas = Math.ceil(totalDias / 7);

  const max = Math.max(...puntos.map((p) => p.nuevos), 1);
  const escala = Math.sqrt(max) || 1;

  function colorPara(nuevos: number): string {
    if (nuevos === 0) return "rgba(148,163,184,0.10)";
    const intensidad = Math.min(1, Math.sqrt(nuevos) / escala);
    // Interpola entre el azul tenue y el azul vivo del resto de la app.
    const alpha = 0.25 + intensidad * 0.75;
    return `rgba(59,130,246,${alpha.toFixed(2)})`;
  }

  const gap = 3, margenIzq = 24;
  const celdaMin = 13;
  // La celda crece para llenar el ancho disponible (hasta un tope legible),
  // en vez de quedar diminuta a la izquierda con un espacio vacío enorme. Pero
  // el lienzo (viewBox) siempre se ajusta a lo que de verdad se dibuja: si al
  // tope de celda todavía sobra ancho, ese sobrante se centra en la tarjeta
  // en vez de quedar como canvas vacío pegado a la derecha.
  const celdaMax = 26;
  const necesario = totalSemanas * (celdaMin + gap) + margenIzq;
  const celda = anchoDisponible > necesario
    ? Math.min(celdaMax, (anchoDisponible - margenIzq) / totalSemanas - gap)
    : celdaMin;
  const width = totalSemanas * (celda + gap) + margenIzq;
  const height = 7 * (celda + gap) + 16;

  const semanas = Array.from({ length: totalSemanas }, (_, s) => s);

  // Etiquetas de mes: se marca la primera semana en la que aparece cada mes nuevo.
  const etiquetasMes: { semana: number; texto: string }[] = [];
  let ultimoMes = -1;
  for (let s = 0; s < totalSemanas; s++) {
    const fechaSemana = new Date(inicioSemana.getTime() + s * 7 * 86400000);
    if (fechaSemana.getUTCMonth() !== ultimoMes) {
      etiquetasMes.push({ semana: s, texto: MESES[fechaSemana.getUTCMonth()] });
      ultimoMes = fechaSemana.getUTCMonth();
    }
  }

  return (
    <div ref={contRef} className="overflow-x-auto px-4 py-4 flex justify-center">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: "block", flexShrink: 0 }}>
        {etiquetasMes.map(({ semana, texto }) => (
          <text key={semana} x={margenIzq + semana * (celda + gap)} y={10} fontSize={9} fill="#94a3b8" fontWeight={600}>{texto}</text>
        ))}
        {DIAS_SEMANA.map((d, i) => (
          (i % 2 === 1) && <text key={d} x={0} y={16 + 16 + i * (celda + gap) + celda * 0.7} fontSize={9} fill="#94a3b8">{d}</text>
        ))}
        {semanas.map((s) => (
          Array.from({ length: 7 }, (_, dow) => {
            const fecha = new Date(inicioSemana.getTime() + (s * 7 + dow) * 86400000);
            const key = claveDia(fecha);
            const punto = porClave.get(key);
            if (!punto) return null;
            return (
              <rect key={key}
                x={margenIzq + s * (celda + gap)} y={16 + dow * (celda + gap)}
                width={celda} height={celda} rx={3}
                fill={colorPara(punto.nuevos)}
                stroke="rgba(148,163,184,0.12)"
              >
                <title>{`${etiquetaDia(fecha)}: ${punto.nuevos} registro${punto.nuevos !== 1 ? "s" : ""}`}</title>
              </rect>
            );
          })
        ))}
      </svg>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        <span>Menos</span>
        {[0.1, 0.35, 0.6, 0.85, 1].map((a) => (
          <span key={a} className="w-3 h-3 rounded-sm inline-block" style={{ background: `rgba(59,130,246,${a})` }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}

// ── Línea de acumulado: total, solo-directo, y proyección punteada ──────────
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
    ...historico.map((p) => ({ t: p.fecha.getTime(), v: p.acumulado })),
    ...proyeccion.map((p) => ({ t: p.fecha.getTime(), v: p.acumulado })),
  ];
  const tMin = todosLosPuntos[0].t;
  const tMax = todosLosPuntos[todosLosPuntos.length - 1].t;
  const rangoT = Math.max(tMax - tMin, 86400000);
  const maxV = nextNiceMax(Math.max(...todosLosPuntos.map((p) => p.v), 1));

  const xFor = (t: number) => padL + ((t - tMin) / rangoT) * plotW;
  const yFor = (v: number) => padT + plotH - (v / maxV) * plotH;

  const pathDe = (pts: { t: number; v: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.t).toFixed(1)} ${yFor(p.v).toFixed(1)}`).join(" ");

  const pathTotal = pathDe(historico.map((p) => ({ t: p.fecha.getTime(), v: p.acumulado })));
  const pathDirecto = pathDe(historico.map((p) => ({ t: p.fecha.getTime(), v: p.acumuladoDirecto })));
  const puntoEnlace = historico[historico.length - 1];
  const pathProyeccion = proyeccion.length > 0
    ? pathDe([{ t: puntoEnlace.fecha.getTime(), v: puntoEnlace.acumulado }, ...proyeccion.map((p) => ({ t: p.fecha.getTime(), v: p.acumulado }))])
    : "";

  const areaTotal = `${pathTotal} L ${xFor(puntoEnlace.fecha.getTime()).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xFor(historico[0].fecha.getTime()).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f));
  const xEleccion = xFor(fechaEleccion.getTime());
  const dentroDelRango = fechaEleccion.getTime() >= tMin && fechaEleccion.getTime() <= tMax;

  return (
    <div className="px-4 py-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
        <defs>
          <linearGradient id="crecimientoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR_TOTAL} stopOpacity="0.20" />
            <stop offset="100%" stopColor={COLOR_TOTAL} stopOpacity="0" />
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

        <path d={areaTotal} fill="url(#crecimientoFill)" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }} />
        <path d={pathTotal} fill="none" stroke={COLOR_TOTAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: mounted ? 0 : 1, transition: "stroke-dashoffset 1.1s ease-out" }} />
        <path d={pathDirecto} fill="none" stroke={COLOR_DIRECTO} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: mounted ? 0 : 1, transition: "stroke-dashoffset 1.1s ease-out 0.15s" }} />

        {pathProyeccion && (
          <path d={pathProyeccion} fill="none" stroke={COLOR_PROYECCION} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="6 5" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.6s" }} />
        )}

        <circle cx={xFor(puntoEnlace.fecha.getTime())} cy={yFor(puntoEnlace.acumulado)} r={5} fill={COLOR_TOTAL} stroke="#fff" strokeWidth={2} />
        {proyeccion.length > 0 && (
          <circle cx={xFor(proyeccion[proyeccion.length - 1].fecha.getTime())} cy={yFor(proyeccion[proyeccion.length - 1].acumulado)}
            r={5} fill={COLOR_PROYECCION} stroke="#fff" strokeWidth={2} />
        )}
      </svg>
      <div className="flex items-center gap-4 justify-center mt-2 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: COLOR_TOTAL }} /> Total real</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: COLOR_DIRECTO }} /> Solo directo (orgánico)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: COLOR_PROYECCION, opacity: 0.8 }} /> Proyección</span>
      </div>
    </div>
  );
}

// ── Donut: composición directo vs. registrador ───────────────────────────────
function Donut({ segmentos, size = 160, grosor = 24 }: {
  segmentos: { etiqueta: string; valor: number; color: string }[]; size?: number; grosor?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);

  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const r = (size - grosor) / 2;
  const c = 2 * Math.PI * r;
  const GAP = 3;
  let acumulado = 0;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth={grosor} />
        {total > 0 && segmentos.filter((s) => s.valor > 0).map((seg) => {
          const frac = seg.valor / total;
          const largo = Math.max(0, (mounted ? frac * c : 0) - GAP);
          const offset = -(acumulado * c) - GAP / 2;
          acumulado += frac;
          return (
            <circle key={seg.etiqueta} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={grosor} strokeLinecap="butt"
              strokeDasharray={`${largo} ${c - largo}`} strokeDashoffset={offset}
              style={{ transition: "stroke-dasharray 900ms ease-out" }} />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color: "#eef2ff" }}>{numberFmt.format(total)}</span>
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Total</span>
      </div>
    </div>
  );
}

function LeyendaDonut({ segmentos }: { segmentos: { etiqueta: string; valor: number; color: string }[] }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  return (
    <div className="space-y-2.5 w-full">
      {segmentos.map((seg) => (
        <div key={seg.etiqueta} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-sm text-[#cbd5e1] truncate">{seg.etiqueta}</span>
          </div>
          <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: seg.color }}>
            {numberFmt.format(seg.valor)} · {total > 0 ? Math.round((seg.valor / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Promedio de registros por día de la semana ───────────────────────────────
function BarrasPorDiaSemana({ promedios }: { promedios: number[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);

  const width = 360, height = 190, padB = 24, padT = 22;
  const plotH = height - padB - padT;
  const gap = 12;
  const anchoBarra = (width - gap * 8) / 7;
  const max = Math.max(...promedios, 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <line x1={0} x2={width} y1={height - padB} y2={height - padB} stroke="rgba(148,163,184,0.22)" strokeWidth={1} />
      {promedios.map((v, i) => {
        const h = mounted ? (v / max) * plotH : 0;
        const x = gap + i * (anchoBarra + gap);
        const y = height - padB - h;
        return (
          <g key={i}>
            <text x={x + anchoBarra / 2} y={Math.max(y - 6, padT - 6)} textAnchor="middle" fontSize={11} fontWeight={700} fill="#eef2ff">{v.toFixed(1)}</text>
            <rect x={x} y={y} width={anchoBarra} height={h} rx={5} fill="#818cf8"
              style={{ transition: "height 700ms ease-out, y 700ms ease-out" }} />
            <text x={x + anchoBarra / 2} y={height - padB + 15} textAnchor="middle" fontSize={10} fill="#94a3b8" fontWeight={600}>
              {DIAS_SEMANA[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const RANGOS = [7, 14, 30, 0] as const; // 0 = todos

export default function CrecimientoPersonerosPage() {
  const [registros, setRegistros] = useState<{ fecha: Date; directo: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rango, setRango] = useState<number>(14);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const PAGE_SIZE = 1000;
    const todos: { fecha: Date; directo: boolean }[] = [];
    let from = 0;
    let hayError: string | null = null;

    while (true) {
      const { data: rows, error: err } = await supabase
        .from("personeros")
        .select("id, created_at, tipo_registro")
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (err) { hayError = err.message; break; }
      const lote = (rows as { id: string; created_at: string | null; tipo_registro: string | null }[]) ?? [];
      for (const r of lote) if (r.created_at) todos.push({ fecha: new Date(r.created_at), directo: !esPorRegistradorTexto(r.tipo_registro) });
      if (lote.length === 0) break;
      from += lote.length;
    }

    if (hayError) setError(hayError);
    else setRegistros(todos);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Conteo por día calendario (hora Lima), separado en directo vs. registrador.
  const conteoPorDia = new Map<string, { directo: number; registrador: number }>();
  let minDia: Date | null = null;
  for (const r of registros) {
    const diaLima = soloFechaUTC(aHoraLima(r.fecha));
    const key = claveDia(diaLima);
    const actual = conteoPorDia.get(key) ?? { directo: 0, registrador: 0 };
    if (r.directo) actual.directo++; else actual.registrador++;
    conteoPorDia.set(key, actual);
    if (!minDia || diaLima.getTime() < minDia.getTime()) minDia = diaLima;
  }

  const hoy = soloFechaUTC(aHoraLima(new Date()));

  // Serie continua día por día (sin huecos) desde el primer registro hasta hoy.
  const serieCompleta: PuntoDiario[] = [];
  if (minDia) {
    let acumulado = 0, acumuladoDirecto = 0;
    for (let t = minDia.getTime(); t <= hoy.getTime(); t += 86400000) {
      const fecha = new Date(t);
      const key = claveDia(fecha);
      const c = conteoPorDia.get(key) ?? { directo: 0, registrador: 0 };
      acumulado += c.directo + c.registrador;
      acumuladoDirecto += c.directo;
      serieCompleta.push({ fecha, key, directo: c.directo, registrador: c.registrador, nuevos: c.directo + c.registrador, acumulado, acumuladoDirecto });
    }
  }

  const totalActual = serieCompleta.length > 0 ? serieCompleta[serieCompleta.length - 1].acumulado : 0;
  const totalDirecto = serieCompleta.length > 0 ? serieCompleta[serieCompleta.length - 1].acumuladoDirecto : 0;
  const totalRegistrador = totalActual - totalDirecto;
  const pctDirecto = totalActual > 0 ? Math.round((totalDirecto / totalActual) * 100) : 0;

  // El ritmo se calcula solo con registro DIRECTO: una carga masiva de un
  // registrador (cientos de fichas de campo en un solo día) no refleja el
  // interés real día a día, y si se mezclara distorsionaría la proyección.
  const ultimosParaRitmo = serieCompleta.slice(-DIAS_PROMEDIO_RITMO);
  const ritmoDiario = ultimosParaRitmo.length > 0
    ? ultimosParaRitmo.reduce((s, p) => s + p.directo, 0) / ultimosParaRitmo.length
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

  // Promedio de registros (directo + registrador) por día de la semana, sobre
  // toda la historia — para ver si hay un patrón (ej. fines de semana bajos).
  const sumaPorDiaSemana = [0, 0, 0, 0, 0, 0, 0];
  const cantidadPorDiaSemana = [0, 0, 0, 0, 0, 0, 0];
  for (const p of serieCompleta) {
    const dow = p.fecha.getUTCDay();
    sumaPorDiaSemana[dow] += p.nuevos;
    cantidadPorDiaSemana[dow]++;
  }
  const promedioPorDiaSemana = sumaPorDiaSemana.map((s, i) => (cantidadPorDiaSemana[i] > 0 ? s / cantidadPorDiaSemana[i] : 0));

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
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard label="Total actual" value={numberFmt.format(totalActual)} subtitle="Personeros registrados"
              icon={<PeopleIcon />} color={COLOR_TOTAL} />
            <StatCard label="Registro directo" value={`${pctDirecto}%`} subtitle={`${numberFmt.format(totalDirecto)} orgánicos de ${numberFmt.format(totalActual)}`}
              icon={<PersonIcon />} color={COLOR_DIRECTO} />
            <StatCard label="Ritmo diario orgánico" value={ritmoDiario.toFixed(1)} subtitle={`Directo, prom. últimos ${Math.min(DIAS_PROMEDIO_RITMO, serieCompleta.length)} días`}
              icon={<SpeedIcon />} color="#818cf8" />
            <StatCard label="Días para la elección" value={diasRestantes > 0 ? diasRestantes : "Hoy"} subtitle="04 de octubre de 2026"
              icon={<EventIcon />} color="#f59e0b" />
            <StatCard label="Proyección al día de la elección" value={numberFmt.format(totalProyectado)} subtitle={diasRestantes > 0 ? "Sumando solo el ritmo orgánico" : "La elección ya llegó"}
              icon={<FlagIcon />} color={COLOR_PROYECCION} />
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
              <BarrasApiladas puntos={serieVisible} />
            </div>
          </div>

          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center gap-2">
              <CalendarViewMonthIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
              <div>
                <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Mapa de calor — toda la historia</h3>
                <p className="text-xs text-gray-400 mt-0.5">Cada cuadro es un día; el color no es proporcional al tamaño para que los días con pocos registros también se distingan.</p>
              </div>
            </div>
            <MapaCalor puntos={serieCompleta} />
          </div>

          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)]">
              <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Total acumulado y proyección</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                La proyección solo suma el ritmo orgánico reciente ({ritmoDiario.toFixed(1)} directos/día) hasta el día de la elección — no asume más cargas masivas.
              </p>
            </div>
            <LineaAcumulada historico={serieCompleta} proyeccion={proyeccion} fechaEleccion={fechaEleccionLima} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="glow-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center gap-2">
                <DonutLargeIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Directo vs. registrador</h3>
              </div>
              <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
                <Donut segmentos={[
                  { etiqueta: "Directo (orgánico)", valor: totalDirecto, color: COLOR_DIRECTO },
                  { etiqueta: "Por registrador (campo)", valor: totalRegistrador, color: COLOR_REGISTRADOR },
                ]} />
                <LeyendaDonut segmentos={[
                  { etiqueta: "Directo (orgánico)", valor: totalDirecto, color: COLOR_DIRECTO },
                  { etiqueta: "Por registrador (campo)", valor: totalRegistrador, color: COLOR_REGISTRADOR },
                ]} />
              </div>
            </div>

            <div className="glow-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center gap-2">
                <ViewWeekIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Promedio por día de la semana</h3>
              </div>
              <div className="p-6">
                <BarrasPorDiaSemana promedios={promedioPorDiaSemana} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
