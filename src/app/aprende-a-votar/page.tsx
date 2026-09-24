"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CircularProgress } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { fetchPartidosActivos, agruparPorAmbito, PartidoEleccion } from "@/lib/partidos-eleccion";
import CheckIcon from "@mui/icons-material/Check";
import ReplayIcon from "@mui/icons-material/Replay";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import CelebrationIcon from "@mui/icons-material/Celebration";

const FICHA_INSCRIPCION_URL = "https://jesusmaldonadooficial.com/#personero";

// ── Geometría del trazo: valida "X" o "+" sin usar IA, con reglas simples ────
interface Punto { x: number; y: number }

function longitudTrazo(t: Punto[]): number {
  let s = 0;
  for (let i = 1; i < t.length; i++) s += Math.hypot(t[i].x - t[i - 1].x, t[i].y - t[i - 1].y);
  return s;
}

interface TrazoRecto { angulo: number; longitud: number; medio: Punto }

// Un trazo "recto" es aquel cuya distancia en línea recta (inicio a fin) es
// casi igual a lo que realmente recorrió el dedo — así se distinguen las
// líneas de una X/+ de un garabato curvo o un círculo.
function analizarTrazoRecto(t: Punto[]): TrazoRecto | null {
  if (t.length < 2) return null;
  const inicio = t[0], fin = t[t.length - 1];
  const distDirecta = Math.hypot(fin.x - inicio.x, fin.y - inicio.y);
  const longitudTotal = longitudTrazo(t);
  if (longitudTotal < 1 || distDirecta / longitudTotal < 0.78) return null;
  const angulo = ((Math.atan2(fin.y - inicio.y, fin.x - inicio.x) * 180) / Math.PI + 180) % 180;
  return { angulo, longitud: distDirecta, medio: { x: (inicio.x + fin.x) / 2, y: (inicio.y + fin.y) / 2 } };
}

function diferenciaAngular(a: number, b: number): number {
  const d = Math.abs(a - b) % 180;
  return Math.min(d, 180 - d);
}
function cercaDe(valor: number, objetivo: number, tolerancia: number): boolean {
  return diferenciaAngular(valor, objetivo) <= tolerancia;
}

// Se piden dos trazos (la mayoría de personas levanta el dedo entre las dos
// líneas de una X o un +) que sean rectos, perpendiculares entre sí, formen
// ángulos de X (~45°/135°) o de + (~0°/90°), y se crucen cerca del centro.
function validarMarca(trazos: Punto[][], ancho: number, alto: number): boolean {
  const min = Math.min(ancho, alto);
  const significativos = trazos.filter((t) => longitudTrazo(t) > min * 0.35);
  if (significativos.length < 2) return false;

  const dosMasLargos = [...significativos].sort((a, b) => longitudTrazo(b) - longitudTrazo(a)).slice(0, 2);
  const analisis = dosMasLargos.map(analizarTrazoRecto);
  if (analisis.some((a) => !a)) return false;
  const [a, b] = analisis as TrazoRecto[];

  const diffEntreSi = diferenciaAngular(a.angulo, b.angulo);
  if (diffEntreSi < 50 || diffEntreSi > 130) return false;

  const esX = (cercaDe(a.angulo, 45, 25) && cercaDe(b.angulo, 135, 25)) || (cercaDe(a.angulo, 135, 25) && cercaDe(b.angulo, 45, 25));
  const esCruz = (cercaDe(a.angulo, 0, 22) && cercaDe(b.angulo, 90, 22)) || (cercaDe(a.angulo, 90, 22) && cercaDe(b.angulo, 0, 22));
  if (!esX && !esCruz) return false;

  const distanciaCentros = Math.hypot(a.medio.x - b.medio.x, a.medio.y - b.medio.y);
  return distanciaCentros <= min * 0.55;
}

// ── Casilla marcable: el dedo dibuja dentro del recuadro (nunca puede salirse,
// las coordenadas quedan ancladas al tamaño de la casilla) ──────────────────
function CasillaMarcable({ marcado, resetSignal, onValidar, onInvalido, onLimpiar }: {
  marcado: boolean; resetSignal: number;
  onValidar: () => void; onInvalido: () => void; onLimpiar: () => void;
}) {
  const [trazosListos, setTrazosListos] = useState<Punto[][]>([]);
  const [trazoActivo, setTrazoActivo] = useState<Punto[] | null>(null);
  const [flashError, setFlashError] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { setTrazosListos([]); setTrazoActivo(null); }, [resetSignal]);

  // El tamaño real de la casilla se mide del DOM (no se asume un valor fijo):
  // así funciona igual de bien con el tamaño chico de dos columnas en un
  // celular que con uno más grande en pantallas anchas.
  function puntoRelativo(e: React.PointerEvent): Punto {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
    };
  }

  function handleDown(e: React.PointerEvent) {
    if (marcado) { onLimpiar(); return; }
    (e.target as Element).setPointerCapture(e.pointerId);
    setTrazoActivo([puntoRelativo(e)]);
  }
  function handleMove(e: React.PointerEvent) {
    if (!trazoActivo) return;
    setTrazoActivo((prev) => (prev ? [...prev, puntoRelativo(e)] : prev));
  }
  function handleUp() {
    if (!trazoActivo) return;
    const trazoFinal = trazoActivo;
    setTrazoActivo(null);
    if (trazoFinal.length < 2) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const nuevos = [...trazosListos, trazoFinal];
    if (validarMarca(nuevos, rect.width, rect.height)) {
      setTrazosListos(nuevos);
      onValidar();
    } else if (nuevos.length >= 2) {
      setTrazosListos([]);
      setFlashError(true);
      setTimeout(() => setFlashError(false), 650);
      onInvalido();
    } else {
      setTrazosListos(nuevos);
    }
  }

  const aTrazo = (t: Punto[]) => t.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="relative flex-shrink-0 w-8 h-8 sm:w-11 sm:h-11">
      <div className="absolute inset-0 rounded-sm border-2 bg-white transition-colors"
        style={{ borderColor: marcado ? "#16a34a" : flashError ? "#dc2626" : "#94a3b8" }} />
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: "none", cursor: marcado ? "pointer" : "crosshair" }}
        onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp}
      >
        {trazosListos.map((t, i) => (
          <polyline key={i} points={aTrazo(t)} fill="none" stroke="#dc2626" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {trazoActivo && <polyline points={aTrazo(trazoActivo)} fill="none" stroke="#dc2626" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {marcado && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center" style={{ background: "#16a34a" }}>
          <CheckIcon sx={{ fontSize: 10, color: "#fff" }} />
        </div>
      )}
    </div>
  );
}

// ── Fila de un partido: símbolo real + nombre + casilla ──────────────────────
function FilaPartido({ partido, marcado, resetSignal, onValidar, onInvalido, onLimpiar }: {
  partido: PartidoEleccion; marcado: boolean; resetSignal: number;
  onValidar: () => void; onInvalido: () => void; onLimpiar: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-3 px-1.5 sm:px-3 py-1.5 sm:py-2 border-b border-black/10 last:border-b-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/simbolos-partidos/${partido.ambito}-${partido.numero_lista}.png`} alt="" className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0" draggable={false} />
      <span className="flex-1 min-w-0 text-[9.5px] sm:text-[13px] font-bold uppercase leading-tight text-black">{partido.nombre}</span>
      <CasillaMarcable marcado={marcado} resetSignal={resetSignal} onValidar={onValidar} onInvalido={onInvalido} onLimpiar={onLimpiar} />
    </div>
  );
}

interface SeccionProps {
  titulo: string; subtitulo: string; colorFondo: string; colorHeader: string;
  partidos: PartidoEleccion[]; marcaActual: number | null; resets: Record<number, number>;
  onValidar: (numeroLista: number) => void; onInvalido: () => void; onLimpiar: () => void;
}
function SeccionCedula({ titulo, subtitulo, colorFondo, colorHeader, partidos, marcaActual, resets, onValidar, onInvalido, onLimpiar }: SeccionProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-black/20 flex-1 min-w-0">
      <div className="text-center py-1.5 sm:py-2 px-1" style={{ background: colorHeader }}>
        <p className="text-white font-black text-[10px] sm:text-sm leading-tight">{titulo}</p>
        <p className="text-white/80 text-[8px] sm:text-[11px] leading-tight">{subtitulo}</p>
      </div>
      <div className="text-center py-1 sm:py-1.5 px-1 bg-white border-b border-black/10">
        <p className="text-[7.5px] sm:text-[10px] font-bold text-black leading-tight">MARCA CON UNA CRUZ (X) O UN ASPA (+)</p>
        <p className="text-[6.5px] sm:text-[9px] text-gray-600 leading-tight">DENTRO DEL RECUADRO DE SÍMBOLO DE SU PREFERENCIA</p>
      </div>
      <div style={{ background: colorFondo }}>
        {partidos.map((p) => (
          <FilaPartido
            key={p.id}
            partido={p}
            marcado={marcaActual === p.numero_lista}
            resetSignal={resets[p.numero_lista] ?? 0}
            onValidar={() => onValidar(p.numero_lista)}
            onInvalido={onInvalido}
            onLimpiar={onLimpiar}
          />
        ))}
      </div>
    </div>
  );
}

interface Stats { total: number; sinErrores: number }

export default function AprendeAVotarPage() {
  const [partidos, setPartidos] = useState<PartidoEleccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const [marcaLima, setMarcaLima] = useState<number | null>(null);
  const [marcaSjl, setMarcaSjl] = useState<number | null>(null);
  const [resetsLima, setResetsLima] = useState<Record<number, number>>({});
  const [resetsSjl, setResetsSjl] = useState<Record<number, number>>({});
  const [intentosInvalidos, setIntentosInvalidos] = useState(0);
  const [avisoInvalido, setAvisoInvalido] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [listo, setListo] = useState(false);
  const [registroId, setRegistroId] = useState<string | null>(null);

  const cargarStats = useCallback(async () => {
    const [{ count: total }, { count: sinErrores }] = await Promise.all([
      supabase.from("simulacro_voto").select("id", { count: "exact", head: true }),
      supabase.from("simulacro_voto").select("id", { count: "exact", head: true }).eq("intentos_invalidos", 0),
    ]);
    setStats({ total: total ?? 0, sinErrores: sinErrores ?? 0 });
  }, []);

  useEffect(() => {
    fetchPartidosActivos()
      .then(setPartidos)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la cédula."))
      .finally(() => setLoading(false));
    cargarStats();
  }, [cargarStats]);

  const porAmbito = agruparPorAmbito(partidos);

  const marcarLima = (numeroLista: number) => {
    if (marcaLima !== null && marcaLima !== numeroLista) {
      setResetsLima((prev) => ({ ...prev, [marcaLima]: (prev[marcaLima] ?? 0) + 1 }));
    }
    setMarcaLima(numeroLista);
  };
  const marcarSjl = (numeroLista: number) => {
    if (marcaSjl !== null && marcaSjl !== numeroLista) {
      setResetsSjl((prev) => ({ ...prev, [marcaSjl]: (prev[marcaSjl] ?? 0) + 1 }));
    }
    setMarcaSjl(numeroLista);
  };
  const limpiarLima = () => { if (marcaLima !== null) setResetsLima((p) => ({ ...p, [marcaLima]: (p[marcaLima] ?? 0) + 1 })); setMarcaLima(null); };
  const limpiarSjl = () => { if (marcaSjl !== null) setResetsSjl((p) => ({ ...p, [marcaSjl]: (p[marcaSjl] ?? 0) + 1 })); setMarcaSjl(null); };

  const marcarInvalido = () => {
    setIntentosInvalidos((n) => n + 1);
    setAvisoInvalido(true);
    setTimeout(() => setAvisoInvalido(false), 2200);
  };

  const puedeConfirmar = marcaLima !== null && marcaSjl !== null;

  const confirmar = async () => {
    if (!puedeConfirmar) return;
    setConfirmando(true);
    const { data } = await supabase.from("simulacro_voto").insert({ intentos_invalidos: intentosInvalidos }).select("id").single();
    setRegistroId(data?.id ?? null);
    setConfirmando(false);
    setListo(true);
    cargarStats();
  };

  // Registra que la persona hizo clic para inscribirse — no hay forma de saber
  // desde aquí si de verdad completó la ficha en el otro sitio (esa parte vive
  // fuera de esta app), pero sí cuántas veces este botón llevó a alguien allá.
  const registrarClicPersonero = () => {
    if (!registroId) return;
    supabase.from("simulacro_voto").update({ clic_personero: true }).eq("id", registroId).then();
  };

  const reiniciar = () => {
    setMarcaLima(null); setMarcaSjl(null);
    setIntentosInvalidos(0);
    setListo(false);
    setRegistroId(null);
  };

  const nombrePartidoLima = partidos.find((p) => p.ambito === "lima" && p.numero_lista === marcaLima)?.nombre;
  const nombrePartidoSjl = partidos.find((p) => p.ambito === "sjl" && p.numero_lista === marcaSjl)?.nombre;

  return (
    <div className="min-h-dvh" style={{ background: "#0b1120" }}>
      <div className="max-w-3xl mx-auto px-2 py-5 sm:px-6" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)", paddingTop: "max(env(safe-area-inset-top), 20px)" }}>

        {/* Cabecera */}
        <div className="text-center mb-4">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-3"
            style={{ background: "rgba(59,130,246,0.18)", color: "#60a5fa" }}>
            Simulacro educativo · No es tu voto real
          </span>
          <h1 className="text-xl sm:text-2xl font-black" style={{ color: "#eef2ff" }}>Aprende a marcar tu voto</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
            Practica cómo se marca la cédula real de las Elecciones Regionales y Municipales 2026 — dibuja con el dedo una X o un + dentro del recuadro.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CircularProgress size={32} sx={{ color: "#3b82f6" }} />
            <p className="text-sm mt-3" style={{ color: "#94a3b8" }}>Cargando la cédula...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl p-8 text-center text-sm text-red-400" style={{ background: "rgba(220,38,38,0.1)" }}>{error}</div>
        ) : listo ? (
          <div className="rounded-2xl p-6 sm:p-8 text-center" style={{ background: "#121a30", border: "1px solid rgba(34,197,94,0.35)" }}>
            <CelebrationIcon sx={{ fontSize: 48, color: "#4ade80" }} />
            <h2 className="text-xl font-black mt-3" style={{ color: "#eef2ff" }}>¡Aprendiste a marcar tu voto correctamente!</h2>
            <p className="text-sm mt-2" style={{ color: "#94a3b8" }}>
              Marcaste <strong style={{ color: "#eef2ff" }}>{nombrePartidoLima}</strong> en Lima Metropolitana y{" "}
              <strong style={{ color: "#eef2ff" }}>{nombrePartidoSjl}</strong> en San Juan de Lurigancho.
            </p>
            {intentosInvalidos === 0 ? (
              <p className="text-sm mt-1 font-semibold" style={{ color: "#4ade80" }}>Lo lograste sin ningún error. ¡Ya sabes votar!</p>
            ) : (
              <p className="text-sm mt-1" style={{ color: "#fbbf24" }}>Te corregiste {intentosInvalidos} vez{intentosInvalidos !== 1 ? "es" : ""} en el camino — ¡y aprendiste!</p>
            )}

            <button onClick={reiniciar}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
              style={{ background: "rgba(59,130,246,0.16)", color: "#60a5fa" }}>
              <ReplayIcon sx={{ fontSize: 18 }} /> Practicar de nuevo
            </button>

            <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(148,163,184,0.16)" }}>
              <p className="text-sm mb-3" style={{ color: "#cbd5e1" }}>¿Quieres ayudar a que más gente defienda su voto el 4 de octubre?</p>
              <a href={FICHA_INSCRIPCION_URL} target="_blank" rel="noopener noreferrer" onClick={registrarClicPersonero}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-black text-white transition-all"
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 6px 18px rgba(22,163,74,0.4)" }}>
                <HowToVoteIcon /> Únete como personero
              </a>
            </div>
          </div>
        ) : (
          <>
            {avisoInvalido && (
              <div className="mb-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-center" style={{ background: "rgba(220,38,38,0.16)", color: "#fca5a5" }}>
                Esa marca no vale: debe ser una X o un + que se crucen, dentro del recuadro. No se permite un círculo ni otra figura.
              </div>
            )}

            <div className="flex flex-row gap-1.5 sm:gap-4">
              <SeccionCedula
                titulo="PROVINCIA DE LIMA METROPOLITANA" subtitulo="Elección provincial"
                colorFondo="#fbdcee" colorHeader="#3d3d3d"
                partidos={porAmbito.lima} marcaActual={marcaLima} resets={resetsLima}
                onValidar={marcarLima} onInvalido={marcarInvalido} onLimpiar={limpiarLima}
              />
              <SeccionCedula
                titulo="DISTRITO DE SAN JUAN DE LURIGANCHO" subtitulo="Elección distrital · la que más nos importa"
                colorFondo="#cceafe" colorHeader="#1d3d5c"
                partidos={porAmbito.sjl} marcaActual={marcaSjl} resets={resetsSjl}
                onValidar={marcarSjl} onInvalido={marcarInvalido} onLimpiar={limpiarSjl}
              />
            </div>

            <div className="sticky bottom-3 mt-5">
              <button onClick={confirmar} disabled={!puedeConfirmar || confirmando}
                className="w-full py-3.5 rounded-full font-black text-white transition-all flex items-center justify-center gap-2"
                style={{
                  background: puedeConfirmar ? "linear-gradient(135deg, #1565c0, #1976d2)" : "#334155",
                  boxShadow: puedeConfirmar ? "0 8px 24px rgba(21,101,192,0.45)" : "none",
                  opacity: confirmando ? 0.7 : 1,
                }}>
                {confirmando ? <CircularProgress size={20} color="inherit" /> : (
                  <>
                    <HowToVoteIcon sx={{ fontSize: 20 }} />
                    {puedeConfirmar ? "Confirmar mi voto de práctica" : "Marca un partido en cada sección"}
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {stats && stats.total > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-center" style={{ color: "#64748b" }}>
            <span>{stats.total} persona{stats.total !== 1 ? "s" : ""} ya practicó cómo votar</span>
            <span>·</span>
            <span>{Math.round((stats.sinErrores / stats.total) * 100)}% lo logró sin ningún error</span>
          </div>
        )}
      </div>
    </div>
  );
}
