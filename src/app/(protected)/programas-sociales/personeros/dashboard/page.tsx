"use client";

import { useState, useEffect, useCallback } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { supabase } from "@/lib/supabase";
import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import MapIcon from "@mui/icons-material/Map";
import RefreshIcon from "@mui/icons-material/Refresh";
import CakeIcon from "@mui/icons-material/Cake";
import PhoneIcon from "@mui/icons-material/Phone";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import SchoolIcon from "@mui/icons-material/School";
import BarChartIcon from "@mui/icons-material/BarChart";

dayjs.locale("es");

const COMUNAS = Array.from({ length: 18 }, (_, i) => i + 1);
const ZONAS = Array.from({ length: 8 }, (_, i) => i + 1);
const RANGOS_EDAD = [
  { etiqueta: "18-25", min: 18, max: 25 },
  { etiqueta: "26-35", min: 26, max: 35 },
  { etiqueta: "36-45", min: 36, max: 45 },
  { etiqueta: "46-55", min: 46, max: 55 },
  { etiqueta: "56-65", min: 56, max: 65 },
  { etiqueta: "66+",   min: 66, max: 200 },
];

// Paleta: azul primario de la app para Hombre, rosa ya usado en SexoBadge para
// Mujer — validados con el validador del skill de dataviz (ΔE CVD normal 29.8 /
// protan 23.6). Cian para edad (mismo tono que el badge "Edad" de la tabla),
// ámbar para colegio, azul primario para mesa — cada par validado por separado.
const COLOR_HOMBRE = "#1d4ed8";
const COLOR_MUJER  = "#9d174d";
const COLOR_TELEFONO = "#16a34a";
const COLOR_TELEFONO_TRACK = "#dcfce7";
const COLOR_MESA = "#1565c0";
const COLOR_MESA_TRACK = "#dbeafe";
const COLOR_EDAD = "#0891b2";
const COLOR_COLEGIO = "#d97706";

// Mismo criterio que la tabla de Personeros: el texto libre de comuna/zona viene
// con inconsistencias, así que se agrupa por el número extraído, no por texto exacto.
function extraerNumeroComuna(comuna?: string | null): number | null {
  if (!comuna) return null;
  const match = comuna.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return n >= 1 && n <= 18 ? n : null;
}

function extraerNumeroZona(zona?: string | null): number | null {
  if (!zona) return null;
  const match = zona.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return n >= 1 && n <= 8 ? n : null;
}

// "sexo" viene con variantes ("F", "Femenino", "FEMENINO", "F " con espacio,
// vacío...) — se normaliza por la primera letra, no por el texto exacto.
function normalizarSexo(sexo?: string | null): "M" | "F" | null {
  const v = sexo?.trim().toUpperCase();
  if (!v) return null;
  if (v.startsWith("F")) return "F";
  if (v.startsWith("M")) return "M";
  return null;
}

// fecha_nacimiento viene como texto "DD/MM/YYYY" o, a veces, "YYYY-MM-DD".
function extraerDiaMes(fechaNacimiento?: string | null): { dia: number; mes: number } | null {
  if (!fechaNacimiento) return null;
  const partes = fechaNacimiento.trim().split(/[/-]/);
  if (partes.length < 3) return null;
  const esFormatoConSlash = fechaNacimiento.includes("/");
  const dia = parseInt(esFormatoConSlash ? partes[0] : partes[2], 10);
  const mes = parseInt(partes[1], 10);
  if (!Number.isInteger(dia) || !Number.isInteger(mes)) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { dia, mes };
}

// Para la edad sí hace falta un año válido (a diferencia del día/mes de cumpleaños).
function calcularEdad(fechaNacimiento?: string | null): number | null {
  if (!fechaNacimiento) return null;
  const partes = fechaNacimiento.trim().split(/[/-]/);
  if (partes.length < 3) return null;
  const esFormatoConSlash = fechaNacimiento.includes("/");
  const dia  = parseInt(esFormatoConSlash ? partes[0] : partes[2], 10);
  const mes  = parseInt(partes[1], 10);
  const anio = parseInt(esFormatoConSlash ? partes[2] : partes[0], 10);
  if (!Number.isInteger(dia) || !Number.isInteger(mes) || !Number.isInteger(anio)) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const anioActual = dayjs().year();
  if (anio < 1900 || anio > anioActual) return null;
  const nacimiento = dayjs(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`);
  if (!nacimiento.isValid()) return null;
  const edad = dayjs().diff(nacimiento, "year");
  return edad >= 0 ? edad : null;
}

function diasHastaProximoCumple(dia: number, mes: number, hoy: Dayjs): number {
  let objetivo = dayjs(`${hoy.year()}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`);
  if (!objetivo.isValid()) return Infinity;
  if (objetivo.isBefore(hoy, "day")) objetivo = objetivo.add(1, "year");
  return objetivo.diff(hoy, "day");
}

function hasPhone(telefono?: string | null): boolean {
  return !!telefono && telefono !== "EMPTY";
}

interface PersoneroMini {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  sexo: string | null;
  comuna: string | null;
  zona: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  numero_mesa: string | null;
  colegio_votacion: string | null;
}

function StatCard({ label, value, subtitle, icon, color }: {
  label: string; value: string | number; subtitle?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="stat-card bg-white rounded-2xl shadow p-7 flex items-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-4xl font-black leading-tight" style={{ color: "#0d1b3e" }}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function BarraDistribucion({ etiqueta, cantidad, pct, color, delay }: {
  etiqueta: string; cantidad: number; pct: number; color: string; delay: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className="px-6 py-3">
      <div className="flex justify-between items-center mb-1.5 gap-3">
        <span className="text-sm font-semibold text-gray-700 truncate">{etiqueta}</span>
        <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color }}>{cantidad}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `${color}18` }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: mounted ? `${pct}%` : "0%", background: color }}
        />
      </div>
    </div>
  );
}

// Donut de 2 segmentos dibujado a mano con stroke-dasharray — sin librería de
// charts. Etiquetado directo (no depende solo del color) + leyenda debajo.
function Donut({ segmentos, size = 176, grosor = 26 }: {
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
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={grosor} />
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
        <span className="text-3xl font-black" style={{ color: "#0d1b3e" }}>{total}</span>
        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Total</span>
      </div>
    </div>
  );
}

function LeyendaDonut({ segmentos }: { segmentos: { etiqueta: string; valor: number; color: string }[] }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  return (
    <div className="space-y-2 w-full">
      {segmentos.map((seg) => (
        <div key={seg.etiqueta} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-sm text-gray-600 truncate">{seg.etiqueta}</span>
          </div>
          <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: seg.color }}>
            {seg.valor} · {total > 0 ? Math.round((seg.valor / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}

function Meter({ pct, color, track }: { pct: number; color: string; track: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);
  return (
    <div className="h-4 rounded-full overflow-hidden" style={{ background: track }}>
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: mounted ? `${pct}%` : "0%", background: color }} />
    </div>
  );
}

// Histograma de columnas dibujado a mano — un solo hue (cian, el mismo del badge
// "Edad" de la tabla de Personeros), etiqueta directa en la punta de cada columna.
function HistogramaEdades({ bins, color }: { bins: { etiqueta: string; cantidad: number }[]; color: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(raf); }, []);

  const width = 600, height = 220, padB = 26, padT = 26, padX = 8;
  const plotH = height - padT - padB;
  const gap = 16;
  const barWidth = (width - padX * 2 - gap * (bins.length - 1)) / bins.length;
  const max = Math.max(...bins.map((b) => b.cantidad), 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <line x1={padX} x2={width - padX} y1={height - padB} y2={height - padB} stroke="#e2e8f0" strokeWidth={1} />
      {bins.map((b, i) => {
        const h = mounted ? (b.cantidad / max) * plotH : 0;
        const x = padX + i * (barWidth + gap);
        const y = height - padB - h;
        return (
          <g key={b.etiqueta}>
            {b.cantidad > 0 && (
              <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0d1b3e">
                {b.cantidad}
              </text>
            )}
            <rect x={x} y={y} width={barWidth} height={h} rx={4} fill={color}
              style={{ transition: "height 700ms ease-out, y 700ms ease-out" }} />
            <text x={x + barWidth / 2} y={height - padB + 17} textAnchor="middle" fontSize={11} fill="#94a3b8" fontWeight={600}>
              {b.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DashboardCard({ titulo, icon, children }: { titulo: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        {icon}
        <h3 className="font-bold text-base" style={{ color: "#0d1b3e" }}>{titulo}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function PersonerosDashboardPage() {
  const [data, setData] = useState<PersoneroMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("personeros")
      .select("nombres, apellido_paterno, apellido_materno, sexo, comuna, zona, telefono, fecha_nacimiento, numero_mesa, colegio_votacion");
    if (err) setError(err.message);
    else setData((rows as PersoneroMini[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const total = data.length;
  const hombres = data.filter((p) => normalizarSexo(p.sexo) === "M").length;
  const mujeres = data.filter((p) => normalizarSexo(p.sexo) === "F").length;

  const conTelefono = data.filter((p) => hasPhone(p.telefono)).length;
  const sinTelefono = total - conTelefono;
  const pctConTelefono = total > 0 ? Math.round((conTelefono / total) * 100) : 0;

  const conMesa = data.filter((p) => !!p.numero_mesa?.trim()).length;
  const sinMesa = total - conMesa;
  const pctConMesa = total > 0 ? Math.round((conMesa / total) * 100) : 0;

  const hoy = dayjs();
  const cumpleanieros = data.filter((p) => {
    const dm = extraerDiaMes(p.fecha_nacimiento);
    return dm ? dm.dia === hoy.date() && dm.mes === hoy.month() + 1 : false;
  });
  const proximosCumples = data
    .map((p) => {
      const dm = extraerDiaMes(p.fecha_nacimiento);
      if (!dm) return null;
      return { p, dm, dias: diasHastaProximoCumple(dm.dia, dm.mes, hoy) };
    })
    .filter((x): x is { p: PersoneroMini; dm: { dia: number; mes: number }; dias: number } => !!x && x.dias > 0 && x.dias <= 30)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5);

  const edades = data.map((p) => calcularEdad(p.fecha_nacimiento)).filter((e): e is number => e !== null);
  const sinEdad = total - edades.length;
  const binsEdad = RANGOS_EDAD.map((r) => ({ etiqueta: r.etiqueta, cantidad: edades.filter((e) => e >= r.min && e <= r.max).length }));

  const porComunaMap = new Map<number, number>();
  let sinComuna = 0;
  for (const p of data) {
    const n = extraerNumeroComuna(p.comuna);
    if (n) porComunaMap.set(n, (porComunaMap.get(n) ?? 0) + 1);
    else sinComuna++;
  }
  const porComuna = [
    ...COMUNAS.map((n) => ({ etiqueta: `Comuna ${n}`, cantidad: porComunaMap.get(n) ?? 0 })),
    ...(sinComuna > 0 ? [{ etiqueta: "Sin comuna", cantidad: sinComuna }] : []),
  ].filter((c) => c.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad);
  const maxComuna = Math.max(...porComuna.map((c) => c.cantidad), 1);

  const porZonaMap = new Map<number, number>();
  let sinZona = 0;
  for (const p of data) {
    const n = extraerNumeroZona(p.zona);
    if (n) porZonaMap.set(n, (porZonaMap.get(n) ?? 0) + 1);
    else sinZona++;
  }
  const porZona = [
    ...ZONAS.map((n) => ({ etiqueta: `Zona ${n}`, cantidad: porZonaMap.get(n) ?? 0 })),
    ...(sinZona > 0 ? [{ etiqueta: "Sin zona", cantidad: sinZona }] : []),
  ].filter((z) => z.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad);
  const maxZona = Math.max(...porZona.map((z) => z.cantidad), 1);

  const porColegioMap = new Map<string, number>();
  let sinColegio = 0;
  for (const p of data) {
    const nombre = p.colegio_votacion?.trim();
    if (nombre) porColegioMap.set(nombre, (porColegioMap.get(nombre) ?? 0) + 1);
    else sinColegio++;
  }
  const porColegio = [
    ...Array.from(porColegioMap.entries()).map(([etiqueta, cantidad]) => ({ etiqueta, cantidad })),
    ...(sinColegio > 0 ? [{ etiqueta: "Sin colegio registrado", cantidad: sinColegio }] : []),
  ].sort((a, b) => b.cantidad - a.cantidad);
  const maxColegio = Math.max(...porColegio.map((c) => c.cantidad), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Dashboard de Personeros</h1>
          <p className="text-sm text-gray-400 mt-1">Resumen general por comuna, zona, sexo, edad y contacto</p>
        </div>
        <Tooltip title="Actualizar">
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon sx={{ color: loading ? "#d1d5db" : "#94a3b8" }} />
          </IconButton>
        </Tooltip>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <CircularProgress size={36} sx={{ color: "#1565c0" }} />
          <p className="text-gray-400 text-sm mt-4">Cargando datos...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-red-400 text-sm">
          Error al cargar datos: {error}
        </div>
      ) : (
        <>
          {/* KPIs grandes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard label="Total personeros" value={total}
              icon={<PeopleIcon sx={{ fontSize: 30 }} />} color="#1565c0" />
            <StatCard label="Hombres" value={hombres} subtitle={total > 0 ? `${Math.round((hombres / total) * 100)}% del total` : undefined}
              icon={<MaleIcon sx={{ fontSize: 30 }} />} color={COLOR_HOMBRE} />
            <StatCard label="Mujeres" value={mujeres} subtitle={total > 0 ? `${Math.round((mujeres / total) * 100)}% del total` : undefined}
              icon={<FemaleIcon sx={{ fontSize: 30 }} />} color={COLOR_MUJER} />
            <StatCard label="Cumplen años hoy" value={cumpleanieros.length} subtitle={hoy.format("D [de] MMMM")}
              icon={<CakeIcon sx={{ fontSize: 30 }} />} color="#db2777" />
          </div>

          {/* Sexo, teléfono, cumpleaños */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DashboardCard titulo="Hombres vs. Mujeres" icon={<Diversity3Icon sx={{ fontSize: 18, color: "#94a3b8" }} />}>
              <div className="flex flex-col items-center gap-5">
                <Donut segmentos={[
                  { etiqueta: "Hombres", valor: hombres, color: COLOR_HOMBRE },
                  { etiqueta: "Mujeres", valor: mujeres, color: COLOR_MUJER },
                ]} />
                <LeyendaDonut segmentos={[
                  { etiqueta: "Hombres", valor: hombres, color: COLOR_HOMBRE },
                  { etiqueta: "Mujeres", valor: mujeres, color: COLOR_MUJER },
                ]} />
              </div>
            </DashboardCard>

            <DashboardCard titulo="Con teléfono" icon={<PhoneIcon sx={{ fontSize: 18, color: "#94a3b8" }} />}>
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black" style={{ color: COLOR_TELEFONO }}>{pctConTelefono}%</span>
                  <span className="text-xs text-gray-400">{conTelefono} de {total}</span>
                </div>
                <Meter pct={pctConTelefono} color={COLOR_TELEFONO} track={COLOR_TELEFONO_TRACK} />
                <div className="flex items-center justify-between text-sm pt-2">
                  <div className="flex items-center gap-1.5" style={{ color: COLOR_TELEFONO }}>
                    <PhoneIcon sx={{ fontSize: 15 }} />
                    <span className="font-semibold">{conTelefono} con teléfono</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <PhoneDisabledIcon sx={{ fontSize: 15 }} />
                    <span className="font-semibold">{sinTelefono} sin teléfono</span>
                  </div>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard titulo="Cumpleaños" icon={<CakeIcon sx={{ fontSize: 18, color: "#94a3b8" }} />}>
              {cumpleanieros.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {cumpleanieros.map((p, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg" style={{ background: "#fdf2f8" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "#db2777" }}>
                        {p.nombres?.charAt(0) ?? "?"}
                      </div>
                      <span className="text-sm text-gray-700 truncate">
                        {p.nombres} {p.apellido_paterno} {p.apellido_materno}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-2">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: "#fdf2f8" }}>
                    <CakeIcon sx={{ fontSize: 28, color: "#f9a8d4" }} />
                  </div>
                  <p className="text-sm text-gray-400 mb-1">Nadie cumple años hoy</p>
                  {proximosCumples.length > 0 && (
                    <div className="w-full mt-3 space-y-1.5 text-left">
                      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Próximos cumpleaños</p>
                      {proximosCumples.map(({ p, dm }, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 truncate">{p.nombres} {p.apellido_paterno}</span>
                          <span className="text-gray-400 font-semibold flex-shrink-0 ml-2">
                            {String(dm.dia).padStart(2, "0")}/{String(dm.mes).padStart(2, "0")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </DashboardCard>
          </div>

          {/* Edad y mesa de votación */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DashboardCard titulo="Rango de edades" icon={<BarChartIcon sx={{ fontSize: 18, color: "#94a3b8" }} />}>
                <HistogramaEdades bins={binsEdad} color={COLOR_EDAD} />
                {sinEdad > 0 && (
                  <p className="text-xs text-gray-400 text-center mt-2">{sinEdad} sin fecha de nacimiento válida</p>
                )}
              </DashboardCard>
            </div>

            <DashboardCard titulo="Con mesa asignada" icon={<HowToVoteIcon sx={{ fontSize: 18, color: "#94a3b8" }} />}>
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black" style={{ color: COLOR_MESA }}>{pctConMesa}%</span>
                  <span className="text-xs text-gray-400">{conMesa} de {total}</span>
                </div>
                <Meter pct={pctConMesa} color={COLOR_MESA} track={COLOR_MESA_TRACK} />
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="font-semibold" style={{ color: COLOR_MESA }}>{conMesa} con mesa</span>
                  <span className="font-semibold text-gray-400">{sinMesa} sin mesa</span>
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Comuna y zona */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <LocationCityIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <h3 className="font-bold text-base" style={{ color: "#0d1b3e" }}>Por comuna</h3>
              </div>
              <div className="divide-y divide-gray-50 py-2 max-h-[480px] overflow-y-auto">
                {porComuna.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-10">Sin datos de comuna todavía</p>
                ) : (
                  porComuna.map((c, i) => (
                    <BarraDistribucion key={c.etiqueta} etiqueta={c.etiqueta} cantidad={c.cantidad}
                      pct={Math.round((c.cantidad / maxComuna) * 100)} color="#1565c0" delay={40 + i * 40} />
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <MapIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <h3 className="font-bold text-base" style={{ color: "#0d1b3e" }}>Por zona</h3>
              </div>
              <div className="divide-y divide-gray-50 py-2 max-h-[480px] overflow-y-auto">
                {porZona.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-10">Sin datos de zona todavía</p>
                ) : (
                  porZona.map((z, i) => (
                    <BarraDistribucion key={z.etiqueta} etiqueta={z.etiqueta} cantidad={z.cantidad}
                      pct={Math.round((z.cantidad / maxZona) * 100)} color="#7c3aed" delay={40 + i * 40} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Por colegio de votación */}
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <SchoolIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
              <h3 className="font-bold text-base" style={{ color: "#0d1b3e" }}>Registrados por colegio de votación</h3>
            </div>
            <div className="divide-y divide-gray-50 py-2 max-h-[420px] overflow-y-auto">
              {porColegio.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">Sin datos de colegio todavía</p>
              ) : (
                porColegio.map((c, i) => (
                  <BarraDistribucion key={c.etiqueta} etiqueta={c.etiqueta} cantidad={c.cantidad}
                    pct={Math.round((c.cantidad / maxColegio) * 100)} color={COLOR_COLEGIO} delay={20 + i * 25} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
