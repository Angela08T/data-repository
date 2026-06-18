"use client";

import { useState, useEffect, useCallback } from "react";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { exportMultiSheetExcel } from "@/lib/utils/exportExcel";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PollIcon from "@mui/icons-material/Poll";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PeopleIcon from "@mui/icons-material/People";

// ── Estructura de encuestas ────────────────────────────────────────────────────

const ENCUESTAS: Record<string, { pregunta: string; opciones: string[] }> = {
  "1": {
    pregunta: "¿Cuál es la obra más urgente para tu barrio?",
    opciones: ["Pistas y veredas", "Agua y desagüe", "Parques y áreas verdes", "Alumbrado público"],
  },
  "2": {
    pregunta: "¿Cómo calificarías la gestión del distrito en seguridad ciudadana?",
    opciones: ["Excelente", "Buena", "Regular", "Deficiente"],
  },
  "3": {
    pregunta: "¿Qué programa social necesita más inversión?",
    opciones: ["Becas educativas", "Empleo juvenil", "Adulto mayor", "Salud preventiva"],
  },
  "4": {
    pregunta: "¿Confías en que Jesús Maldonado ganará las elecciones?",
    opciones: ["Sí, totalmente", "Probablemente sí", "Aún no lo decido", "No"],
  },
};

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Voto {
  id: string;
  encuesta_id: string;
  opcion_id: string;
  created_at: string;
}

interface ResultadoOpcion {
  label: string;
  votos: number;
  pct: number;
  esLider: boolean;
}

interface ResultadoEncuesta {
  encuesta_id: string;
  pregunta: string;
  opciones: ResultadoOpcion[];
  total: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildResultados(votos: Voto[]): ResultadoEncuesta[] {
  const conteo: Record<string, Record<string, number>> = {};

  for (const v of votos) {
    if (!conteo[v.encuesta_id]) conteo[v.encuesta_id] = {};
    const idx = v.opcion_id;
    conteo[v.encuesta_id][idx] = (conteo[v.encuesta_id][idx] ?? 0) + 1;
  }

  return Object.keys(ENCUESTAS).map((eid) => {
    const enc      = ENCUESTAS[eid];
    const votoEnc  = conteo[eid] ?? {};
    const total    = Object.values(votoEnc).reduce((s, n) => s + n, 0);
    const maxVotos = Math.max(...enc.opciones.map((_, i) => votoEnc[String(i)] ?? 0), 0);

    const opciones: ResultadoOpcion[] = enc.opciones.map((label, i) => {
      const v   = votoEnc[String(i)] ?? 0;
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      return { label, votos: v, pct, esLider: v === maxVotos && maxVotos > 0 };
    });

    return { encuesta_id: eid, pregunta: enc.pregunta, opciones, total };
  });
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

// ── Componentes ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="stat-card bg-white rounded-2xl shadow p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold" style={{ color: "#0d1b3e" }}>{value}</p>
      </div>
    </div>
  );
}

function EncuestaCard({ resultado }: { resultado: ResultadoEncuesta }) {
  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "#eff6ff" }}>
          <PollIcon sx={{ fontSize: 18, color: "#1565c0" }} />
        </div>
        <h3 className="font-semibold text-base leading-snug" style={{ color: "#0d1b3e" }}>
          {resultado.pregunta}
        </h3>
      </div>

      {/* Opciones */}
      <div className="px-6 pb-4 space-y-3">
        {resultado.opciones.map((op, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">{op.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: op.esLider ? "#1565c0" : "#64748b" }}>
                  {op.pct}%
                </span>
                {op.esLider && resultado.total > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#1565c0" }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
            </div>
            <div className="h-9 rounded-xl overflow-hidden relative"
              style={{ background: op.esLider && resultado.total > 0 ? "#dbeafe" : "#f1f5f9" }}>
              <div
                className="h-full rounded-xl transition-all duration-700"
                style={{
                  width: resultado.total > 0 ? `${op.pct}%` : "0%",
                  background: op.esLider ? "#1565c0" : "#94a3b8",
                  opacity: 0.25,
                }}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-600">
                {resultado.total > 0 ? `${op.votos} voto${op.votos !== 1 ? "s" : ""}` : "Sin votos aún"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2">
        <PeopleIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
        <span className="text-xs text-gray-400">
          {resultado.total > 0
            ? <><strong className="text-gray-600">{resultado.total}</strong> votos registrados</>
            : "Aún no hay votos en esta encuesta"}
        </span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EncuestasPage() {
  const [votos, setVotos]     = useState<Voto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("encuesta_votos")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) setError(err.message);
    else setVotos((rows as Voto[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resultados     = buildResultados(votos);
  const totalEncuestas = Object.keys(ENCUESTAS).length;
  const ultimoVoto     = votos[0] ? formatFecha(votos[0].created_at) : "—";

  const handleExport = () => {
    const sheets = resultados.map((r) => ({
      name: `Enc ${r.encuesta_id}`,
      rows: r.opciones.map((op) => ({
        "Pregunta":   r.pregunta,
        "Opción":     op.label,
        "Votos":      op.votos,
        "Porcentaje": `${op.pct}%`,
        "¿Líder?":    op.esLider && r.total > 0 ? "Sí" : "No",
      })),
    }));
    exportMultiSheetExcel(sheets, `Encuestas_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Resultados de Encuestas</h1>
          <p className="text-sm text-gray-400 mt-1">Resultados en tiempo real de las votaciones públicas</p>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip title="Exportar Excel">
            <IconButton onClick={handleExport} disabled={loading || votos.length === 0}>
              <FileDownloadIcon sx={{ color: votos.length > 0 ? "#1565c0" : "#d1d5db" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchData} disabled={loading}>
              <RefreshIcon sx={{ color: loading ? "#d1d5db" : "#94a3b8" }} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total votos"       value={votos.length}   icon={<HowToVoteIcon />} color="#1565c0" />
        <StatCard label="Encuestas activas" value={totalEncuestas} icon={<PollIcon />}      color="#0d47a1" />
        <StatCard label="Último voto"       value={ultimoVoto}     icon={<PeopleIcon />}    color="#16a34a" />
      </div>

      {/* Encuestas */}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {resultados.map((r) => (
            <EncuestaCard key={r.encuesta_id} resultado={r} />
          ))}
        </div>
      )}

      {/* Tabla votos recientes */}
      {!loading && votos.length > 0 && (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-base" style={{ color: "#0d1b3e" }}>Votos recientes</h3>
            <p className="text-xs text-gray-400">Últimos 20 registros</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Pregunta", "Opción votada", "Fecha y hora"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "#64748b" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {votos.slice(0, 20).map((v, i) => {
                  const enc  = ENCUESTAS[v.encuesta_id];
                  const opcion = enc?.opciones[Number(v.opcion_id)] ?? `Opción ${v.opcion_id}`;
                  return (
                    <tr key={v.id} className="border-t border-gray-50 hover:bg-blue-50 transition-colors"
                      style={{ background: i % 2 === 0 ? "#ffffff" : "#fafbff" }}>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium text-gray-600 line-clamp-1">
                          {enc?.pregunta ?? `Encuesta #${v.encuesta_id}`}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ background: "#eff6ff", color: "#1565c0" }}>
                          {opcion}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {formatFecha(v.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
            <span>Mostrando los últimos 20 de {votos.length} votos</span>
            <span style={{ color: "#1565c0", fontWeight: 600 }}>Campaign Data Repository</span>
          </div>
        </div>
      )}
    </div>
  );
}
