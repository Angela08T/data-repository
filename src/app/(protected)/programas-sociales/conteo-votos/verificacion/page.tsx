"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress } from "@mui/material";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { showError } from "@/lib/utils/swalConfig";
import { fetchPartidosActivos, PartidoEleccion, Ambito } from "@/lib/partidos-eleccion";
import { BeneficiarioDetailsDialog } from "@/components/modals/BeneficiarioDetailsDialog";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ImageIcon from "@mui/icons-material/Image";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ApartmentIcon from "@mui/icons-material/Apartment";
import LocationCityIcon from "@mui/icons-material/LocationCity";

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
  votos_blancos_sjl: number | null;
  votos_nulos_sjl: number | null;
  votos_impugnados_sjl: number | null;
  confianza_ia_sjl: string | null;
  advertencia_ia_sjl: string | null;
  votos_blancos_lima: number | null;
  votos_nulos_lima: number | null;
  votos_impugnados_lima: number | null;
  confianza_ia_lima: string | null;
  advertencia_ia_lima: string | null;
  personeros: PersoneroMini | null;
}

interface VotoPartidoRow {
  acta_id: string;
  partido_id: string;
  votos: number | null;
}

interface VotoDetalleRow {
  votos: number | null;
  votos_ia: number | null;
  partidos_eleccion: { nombre: string; ambito: Ambito; numero_lista: number } | null;
}

interface ResumenAmbito {
  total: number;
  liderNombre: string;
  liderVotos: number;
}

interface ResumenActa {
  sjl: ResumenAmbito;
  lima: ResumenAmbito;
}

function resumenVacio(): ResumenAmbito {
  return { total: 0, liderNombre: "—", liderVotos: -1 };
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora  = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
}

function totalVotosActaAmbito(a: ActaMesa, ambito: Ambito, resumen: Map<string, ResumenActa>): number {
  const r = resumen.get(a.id)?.[ambito] ?? resumenVacio();
  if (ambito === "sjl") return r.total + (a.votos_blancos_sjl ?? 0) + (a.votos_nulos_sjl ?? 0) + (a.votos_impugnados_sjl ?? 0);
  return r.total + (a.votos_blancos_lima ?? 0) + (a.votos_nulos_lima ?? 0) + (a.votos_impugnados_lima ?? 0);
}

function liderActaAmbito(a: ActaMesa, ambito: Ambito, resumen: Map<string, ResumenActa>): string {
  const r = resumen.get(a.id)?.[ambito];
  if (!r || r.liderVotos <= 0) return "—";
  return `${r.liderNombre} (${r.liderVotos})`;
}

function ConfianzaBadge({ confianza }: { confianza: string | null }) {
  const estilos: Record<string, { bg: string; color: string; label: string }> = {
    alta:  { bg: "#f0fdf4", color: "#166534", label: "Alta" },
    media: { bg: "#fffbeb", color: "#92400e", label: "Media" },
    baja:  { bg: "#fef2f2", color: "#dc2626", label: "Baja" },
  };
  const s = estilos[confianza ?? ""] ?? { bg: "rgba(148,163,184,0.14)", color: "#94a3b8", label: "—" };
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="stat-card glow-card rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold" style={{ color: "#eef2ff" }}>{value}</p>
      </div>
    </div>
  );
}

export default function RegistroVotosPage() {
  const [data, setData]       = useState<ActaMesa[]>([]);
  const [votosPartido, setVotosPartido] = useState<VotoPartidoRow[]>([]);
  const [partidos, setPartidos] = useState<PartidoEleccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [detalleActa, setDetalleActa] = useState<ActaMesa | null>(null);
  const [detalleVotos, setDetalleVotos] = useState<VotoDetalleRow[] | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  useEffect(() => {
    fetchPartidosActivos().catch(() => {}).then((p) => { if (p) setPartidos(p); });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [resActas, resVotos] = await Promise.all([
      supabase
        .from("actas_mesa")
        .select("*, personeros(nombres, apellido_paterno, apellido_materno)")
        .order("created_at", { ascending: false }),
      supabase.from("votos_partido").select("acta_id, partido_id, votos"),
    ]);
    if (resActas.error) setError(resActas.error.message);
    else setData((resActas.data as unknown as ActaMesa[]) ?? []);
    setVotosPartido((resVotos.data as VotoPartidoRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!detalleActa) return;
    setDetalleLoading(true);
    supabase
      .from("votos_partido")
      .select("votos, votos_ia, partidos_eleccion(nombre, ambito, numero_lista)")
      .eq("acta_id", detalleActa.id)
      .then(({ data: rows }) => {
        const votos = ((rows as unknown as VotoDetalleRow[]) ?? [])
          .slice()
          .sort((a, b) => {
            const ambA = a.partidos_eleccion?.ambito ?? "lima";
            const ambB = b.partidos_eleccion?.ambito ?? "lima";
            if (ambA !== ambB) return ambA === "sjl" ? -1 : 1;
            return (a.partidos_eleccion?.numero_lista ?? 0) - (b.partidos_eleccion?.numero_lista ?? 0);
          });
        setDetalleVotos(votos);
        setDetalleLoading(false);
      });
  }, [detalleActa]);

  // Total y partido líder por mesa y por ámbito (SJL / Lima), precalculados una
  // vez por fetch a partir de votos_partido (1 fila por partido por acta).
  const partidosPorId = new Map(partidos.map((p) => [p.id, p]));
  const resumenPorActa = new Map<string, ResumenActa>();
  for (const v of votosPartido) {
    const cantidad = Number(v.votos) || 0;
    const partido = partidosPorId.get(v.partido_id);
    if (!partido) continue;
    const actual = resumenPorActa.get(v.acta_id) ?? { sjl: resumenVacio(), lima: resumenVacio() };
    const r = actual[partido.ambito];
    r.total += cantidad;
    if (cantidad > r.liderVotos) {
      r.liderNombre = partido.nombre;
      r.liderVotos = cantidad;
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
  const totalVotosSjl = data.reduce((sum, a) => sum + totalVotosActaAmbito(a, "sjl", resumenPorActa), 0);
  const totalVotosLima = data.reduce((sum, a) => sum + totalVotosActaAmbito(a, "lima", resumenPorActa), 0);

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
        "Total SJL": totalVotosActaAmbito(a, "sjl", resumenPorActa),
        "Partido líder SJL": liderActaAmbito(a, "sjl", resumenPorActa),
        "Confianza IA SJL": a.confianza_ia_sjl ?? "",
        "Total Lima": totalVotosActaAmbito(a, "lima", resumenPorActa),
        "Partido líder Lima": liderActaAmbito(a, "lima", resumenPorActa),
        "Confianza IA Lima": a.confianza_ia_lima ?? "",
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
        <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Registro de Votos</h1>
        <p className="text-sm text-gray-400 mt-1">Cada fila es un acta de mesa reportada por un personero, con sus dos conteos: SJL (distrital, prioritario) y Lima (provincial)</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Votos válidos SJL" value={totalVotosSjl} icon={<ApartmentIcon />} color="#1565c0" />
        <StatCard label="Votos válidos Lima" value={totalVotosLima} icon={<LocationCityIcon />} color="#7c3aed" />
        <StatCard label="Mesas reportadas"  value={mesasReportadas} icon={<FactCheckIcon />} color="#16a34a" />
      </div>

      <div className="glow-card rounded-2xl overflow-hidden">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-[rgba(148,163,184,0.14)]">
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

        <div className="px-4 py-2 text-xs text-gray-400 border-b border-[rgba(148,163,184,0.10)]">
          {loading ? "Cargando..." : `${filtrados.length} acta${filtrados.length !== 1 ? "s" : ""}`}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0f1730" }}>
                {["Personero", "Colegio / Mesa", "SJL (prioritario)", "Lima", "Fecha", "Acciones"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap" style={{ color: "#94a3b8" }}>
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
                      className="border-t border-[rgba(148,163,184,0.10)] hover:bg-[rgba(59,130,246,0.10)] transition-colors"
                      style={{ background: i % 2 === 0 ? "#121a30" : "#0d1526" }}>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#e7ecfb]">
                          {a.personeros ? `${a.personeros.nombres} ${a.personeros.apellido_paterno} ${a.personeros.apellido_materno}` : "—"}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{a.personero_dni}</p>
                      </td>

                      <td className="px-5 py-4 max-w-[220px]">
                        <p className="text-sm text-[#cbd5e1] truncate" title={a.colegio}>{a.colegio}</p>
                        <p className="text-xs text-gray-400">Mesa {a.numero_mesa}</p>
                      </td>

                      <td className="px-5 py-4 max-w-[200px]">
                        <p className="text-sm font-bold" style={{ color: "#60a5fa" }}>{totalVotosActaAmbito(a, "sjl", resumenPorActa)} votos</p>
                        <p className="text-xs text-gray-400 truncate" title={liderActaAmbito(a, "sjl", resumenPorActa)}>{liderActaAmbito(a, "sjl", resumenPorActa)}</p>
                        <ConfianzaBadge confianza={a.confianza_ia_sjl} />
                      </td>

                      <td className="px-5 py-4 max-w-[200px]">
                        <p className="text-sm font-bold" style={{ color: "#a78bfa" }}>{totalVotosActaAmbito(a, "lima", resumenPorActa)} votos</p>
                        <p className="text-xs text-gray-400 truncate" title={liderActaAmbito(a, "lima", resumenPorActa)}>{liderActaAmbito(a, "lima", resumenPorActa)}</p>
                        <ConfianzaBadge confianza={a.confianza_ia_lima} />
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs text-[#cbd5e1]">{fecha}</span>
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

        <div className="px-5 py-3 border-t border-[rgba(148,163,184,0.14)] flex justify-between items-center text-xs text-gray-400">
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
              titulo: "Resumen — San Juan de Lurigancho (prioritario)",
              campos: [
                { label: "Confianza IA", value: <ConfianzaBadge confianza={detalleActa.confianza_ia_sjl} /> },
                { label: "Total votos válidos", value: totalVotosActaAmbito(detalleActa, "sjl", resumenPorActa) },
                { label: "Votos en blanco", value: detalleActa.votos_blancos_sjl ?? 0 },
                { label: "Votos nulos", value: detalleActa.votos_nulos_sjl ?? 0 },
                { label: "Votos impugnados", value: detalleActa.votos_impugnados_sjl ?? 0 },
                { label: "Advertencia de la IA", value: detalleActa.advertencia_ia_sjl ?? "Ninguna", fullWidth: true },
              ],
            },
            {
              titulo: "Votos por partido — SJL (lectura IA vs. confirmado)",
              campos: (detalleVotos ?? []).filter((v) => v.partidos_eleccion?.ambito === "sjl").map((v, i) => ({
                label: `${v.partidos_eleccion?.numero_lista ?? i + 1}. ${v.partidos_eleccion?.nombre ?? "—"}`,
                value: `IA: ${v.votos_ia ?? "—"}  ·  Confirmado: ${v.votos ?? 0}`,
              })),
            },
            {
              titulo: "Resumen — Lima Metropolitana (secundario)",
              campos: [
                { label: "Confianza IA", value: <ConfianzaBadge confianza={detalleActa.confianza_ia_lima} /> },
                { label: "Total votos válidos", value: totalVotosActaAmbito(detalleActa, "lima", resumenPorActa) },
                { label: "Votos en blanco", value: detalleActa.votos_blancos_lima ?? 0 },
                { label: "Votos nulos", value: detalleActa.votos_nulos_lima ?? 0 },
                { label: "Votos impugnados", value: detalleActa.votos_impugnados_lima ?? 0 },
                { label: "Advertencia de la IA", value: detalleActa.advertencia_ia_lima ?? "Ninguna", fullWidth: true },
              ],
            },
            {
              titulo: "Votos por partido — Lima (lectura IA vs. confirmado)",
              campos: (detalleVotos ?? []).filter((v) => v.partidos_eleccion?.ambito === "lima").map((v, i) => ({
                label: `${v.partidos_eleccion?.numero_lista ?? i + 1}. ${v.partidos_eleccion?.nombre ?? "—"}`,
                value: `IA: ${v.votos_ia ?? "—"}  ·  Confirmado: ${v.votos ?? 0}`,
              })),
            },
          ]}
        />
      )}
    </div>
  );
}
