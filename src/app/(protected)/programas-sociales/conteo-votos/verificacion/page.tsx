"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress } from "@mui/material";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { showError } from "@/lib/utils/swalConfig";
import { fetchCandidatosActivos, CandidatoAlcaldia } from "@/lib/candidatos-alcaldia";
import { BeneficiarioDetailsDialog } from "@/components/modals/BeneficiarioDetailsDialog";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ImageIcon from "@mui/icons-material/Image";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface PersoneroMini {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
}

interface ActaMesa {
  id: string;
  personero_id: string;
  personero_dni: string;
  colegio: string;
  numero_mesa: string;
  foto_acta_url: string;
  created_at: string;
  votos_blancos: number | null;
  votos_nulos: number | null;
  votos_impugnados: number | null;
  confianza_ia: string | null;
  advertencia_ia: string | null;
  personeros: PersoneroMini | null;
}

interface VotoCandidatoRow {
  acta_id: string;
  candidato_id: string;
  votos: number | null;
}

interface VotoDetalleRow {
  votos: number | null;
  votos_ia: number | null;
  candidatos_alcaldia: { nombre: string; partido: string; numero_lista: number } | null;
}

interface ResumenActa {
  total: number;
  liderNombre: string;
  liderVotos: number;
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora  = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
}

function totalVotosActa(a: ActaMesa, resumen: Map<string, ResumenActa>): number {
  const r = resumen.get(a.id);
  return (r?.total ?? 0) + (a.votos_blancos ?? 0) + (a.votos_nulos ?? 0) + (a.votos_impugnados ?? 0);
}

function liderActa(a: ActaMesa, resumen: Map<string, ResumenActa>): string {
  const r = resumen.get(a.id);
  if (!r || r.liderVotos <= 0) return "—";
  return `${r.liderNombre} (${r.liderVotos})`;
}

function ConfianzaBadge({ confianza }: { confianza: string | null }) {
  const estilos: Record<string, { bg: string; color: string; label: string }> = {
    alta:  { bg: "#f0fdf4", color: "#166534", label: "Alta" },
    media: { bg: "#fffbeb", color: "#92400e", label: "Media" },
    baja:  { bg: "#fef2f2", color: "#dc2626", label: "Baja" },
  };
  const s = estilos[confianza ?? ""] ?? { bg: "#f1f5f9", color: "#64748b", label: "—" };
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

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

export default function RegistroVotosPage() {
  const [data, setData]       = useState<ActaMesa[]>([]);
  const [votosCandidato, setVotosCandidato] = useState<VotoCandidatoRow[]>([]);
  const [candidatos, setCandidatos] = useState<CandidatoAlcaldia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [detalleActa, setDetalleActa] = useState<ActaMesa | null>(null);
  const [detalleVotos, setDetalleVotos] = useState<VotoDetalleRow[] | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  useEffect(() => {
    fetchCandidatosActivos().catch(() => {}).then((c) => { if (c) setCandidatos(c); });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [resActas, resVotos] = await Promise.all([
      supabase
        .from("actas_mesa")
        .select("*, personeros(nombres, apellido_paterno, apellido_materno)")
        .order("created_at", { ascending: false }),
      supabase.from("votos_candidato").select("acta_id, candidato_id, votos"),
    ]);
    if (resActas.error) setError(resActas.error.message);
    else setData((resActas.data as unknown as ActaMesa[]) ?? []);
    setVotosCandidato((resVotos.data as VotoCandidatoRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!detalleActa) return;
    setDetalleLoading(true);
    supabase
      .from("votos_candidato")
      .select("votos, votos_ia, candidatos_alcaldia(nombre, partido, numero_lista)")
      .eq("acta_id", detalleActa.id)
      .then(({ data: rows }) => {
        const votos = ((rows as unknown as VotoDetalleRow[]) ?? [])
          .slice()
          .sort((a, b) => (a.candidatos_alcaldia?.numero_lista ?? 0) - (b.candidatos_alcaldia?.numero_lista ?? 0));
        setDetalleVotos(votos);
        setDetalleLoading(false);
      });
  }, [detalleActa]);

  // Total y candidato líder por mesa, precalculados una vez por fetch a partir de
  // votos_candidato (tabla normalizada: 1 fila por candidato por acta).
  const candidatosPorId = new Map(candidatos.map((c) => [c.id, c]));
  const resumenPorActa = new Map<string, ResumenActa>();
  for (const v of votosCandidato) {
    const cantidad = Number(v.votos) || 0;
    const actual = resumenPorActa.get(v.acta_id) ?? { total: 0, liderNombre: "—", liderVotos: -1 };
    actual.total += cantidad;
    if (cantidad > actual.liderVotos) {
      actual.liderNombre = candidatosPorId.get(v.candidato_id)?.nombre ?? "—";
      actual.liderVotos = cantidad;
    }
    resumenPorActa.set(v.acta_id, actual);
  }

  const filtrados = data.filter((a) => {
    const nombrePersonero = a.personeros
      ? `${a.personeros.nombres} ${a.personeros.apellido_paterno} ${a.personeros.apellido_materno}`
      : "";
    const texto = `${nombrePersonero} ${a.personero_dni} ${a.colegio} ${a.numero_mesa}`.toLowerCase();
    return texto.includes(search.toLowerCase());
  });

  const mesasReportadas = data.length;
  const totalVotosValidos = data.reduce((sum, a) => sum + totalVotosActa(a, resumenPorActa), 0);

  const verFoto = async (acta: ActaMesa) => {
    const { data: signed, error: signErr } = await supabase.storage
      .from("actas-electorales")
      .createSignedUrl(acta.foto_acta_url, 3600);

    if (signErr || !signed?.signedUrl) {
      showError("No se pudo cargar la foto", signErr?.message);
      return;
    }
    Swal.fire({
      title: `Mesa ${acta.numero_mesa} — ${acta.colegio}`,
      imageUrl: signed.signedUrl,
      imageAlt: "Foto del acta",
      width: 640,
      confirmButtonText: "Cerrar",
    });
  };

  const handleExport = () => {
    const rows = filtrados.map((a) => {
      const { fecha, hora } = formatFecha(a.created_at);
      return {
        "Personero": a.personeros ? `${a.personeros.nombres} ${a.personeros.apellido_paterno} ${a.personeros.apellido_materno}` : "",
        "DNI": a.personero_dni,
        "Colegio": a.colegio,
        "N° Mesa": a.numero_mesa,
        "Total votos válidos": totalVotosActa(a, resumenPorActa),
        "Candidato líder": liderActa(a, resumenPorActa),
        "Confianza IA": a.confianza_ia ?? "",
        "Fecha": fecha,
        "Hora": hora,
      };
    });
    exportToExcel(rows, `Registro_Votos_${new Date().toISOString().slice(0, 10)}`, "Votos");
  };

  const COLS = 6;

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Registro de Votos</h1>
        <p className="text-sm text-gray-400 mt-1">Cada fila es un acta de mesa reportada por un personero, con su foto de respaldo</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <StatCard label="Total de votos válidos" value={totalVotosValidos} icon={<HowToVoteIcon />} color="#1565c0" />
        <StatCard label="Mesas reportadas"        value={mesasReportadas}  icon={<FactCheckIcon />} color="#16a34a" />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <TextField
            size="small"
            placeholder="Buscar por personero, DNI, colegio o mesa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
            <Tooltip title="Exportar Excel">
              <IconButton size="small" onClick={handleExport} disabled={loading || filtrados.length === 0}>
                <FileDownloadIcon sx={{ fontSize: 18, color: filtrados.length > 0 ? "#1565c0" : "#94a3b8" }} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50">
          {loading ? "Cargando..." : `${filtrados.length} acta${filtrados.length !== 1 ? "s" : ""}`}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Personero", "Colegio / Mesa", "Total / Líder", "Confianza", "Fecha", "Acciones"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap" style={{ color: "#64748b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLS} className="text-center py-16">
                  <CircularProgress size={28} sx={{ color: "#1565c0" }} />
                  <p className="text-gray-400 text-sm mt-3">Cargando registros...</p>
                </td></tr>
              ) : error ? (
                <tr><td colSpan={COLS} className="text-center py-16 text-red-400 text-sm">
                  Error al cargar datos: {error}
                </td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={COLS} className="text-center py-16 text-gray-400 text-sm">
                  No se encontraron registros
                </td></tr>
              ) : (
                filtrados.map((a, i) => {
                  const { fecha, hora } = formatFecha(a.created_at);
                  return (
                    <tr key={a.id}
                      className="border-t border-gray-50 hover:bg-blue-50 transition-colors"
                      style={{ background: i % 2 === 0 ? "#ffffff" : "#fafbff" }}>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800">
                          {a.personeros ? `${a.personeros.nombres} ${a.personeros.apellido_paterno} ${a.personeros.apellido_materno}` : "—"}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{a.personero_dni}</p>
                      </td>

                      <td className="px-5 py-4 max-w-[220px]">
                        <p className="text-sm text-gray-700 truncate" title={a.colegio}>{a.colegio}</p>
                        <p className="text-xs text-gray-400">Mesa {a.numero_mesa}</p>
                      </td>

                      <td className="px-5 py-4 max-w-[220px]">
                        <p className="text-sm font-bold text-gray-700">{totalVotosActa(a, resumenPorActa)} votos</p>
                        <p className="text-xs text-gray-400 truncate" title={liderActa(a, resumenPorActa)}>{liderActa(a, resumenPorActa)}</p>
                      </td>

                      <td className="px-5 py-4">
                        <ConfianzaBadge confianza={a.confianza_ia} />
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{fecha}</span>
                        <p className="text-xs text-gray-400">{hora}</p>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <Tooltip title="Ver detalle de votos">
                          <IconButton size="small" onClick={() => setDetalleActa(a)}>
                            <VisibilityIcon sx={{ fontSize: 16, color: "#1565c0" }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver foto del acta">
                          <IconButton size="small" onClick={() => verFoto(a)}>
                            <ImageIcon sx={{ fontSize: 16, color: "#1565c0" }} />
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <span>{!loading && `Mostrando ${filtrados.length} de ${data.length} registros`}</span>
          <span style={{ color: "#1565c0", fontWeight: 600 }}>Campaign Data Repository</span>
        </div>
      </div>

      {detalleActa && (
        <BeneficiarioDetailsDialog
          open={!!detalleActa}
          onClose={() => { setDetalleActa(null); setDetalleVotos(null); }}
          title={`Mesa ${detalleActa.numero_mesa}`}
          subtitle={detalleActa.colegio}
          icon={<HowToVoteIcon sx={{ color: "#1565c0" }} />}
          accentColor="#1565c0"
          isLoading={detalleLoading}
          secciones={[
            {
              titulo: "Resumen",
              campos: [
                { label: "Confianza IA", value: <ConfianzaBadge confianza={detalleActa.confianza_ia} /> },
                { label: "Total votos válidos", value: totalVotosActa(detalleActa, resumenPorActa) },
                { label: "Votos en blanco", value: detalleActa.votos_blancos ?? 0 },
                { label: "Votos nulos", value: detalleActa.votos_nulos ?? 0 },
                { label: "Votos impugnados", value: detalleActa.votos_impugnados ?? 0 },
                { label: "Advertencia de la IA", value: detalleActa.advertencia_ia ?? "Ninguna", fullWidth: true },
              ],
            },
            {
              titulo: "Votos por candidato — lectura IA vs. confirmado por el personero",
              campos: (detalleVotos ?? []).map((v, i) => ({
                label: `${v.candidatos_alcaldia?.numero_lista ?? i + 1}. ${v.candidatos_alcaldia?.nombre ?? "—"}`,
                value: `IA: ${v.votos_ia ?? "—"}  ·  Confirmado: ${v.votos ?? 0}`,
              })),
            },
          ]}
        />
      )}
    </div>
  );
}
