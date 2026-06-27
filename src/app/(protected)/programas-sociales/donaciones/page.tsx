"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress } from "@mui/material";
import SearchIcon            from "@mui/icons-material/Search";
import FileDownloadIcon      from "@mui/icons-material/FileDownload";
import RefreshIcon           from "@mui/icons-material/Refresh";
import CheckCircleIcon       from "@mui/icons-material/CheckCircle";
import CancelIcon            from "@mui/icons-material/Cancel";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import PeopleIcon            from "@mui/icons-material/People";
import AttachMoneyIcon       from "@mui/icons-material/AttachMoney";
import VerifiedUserIcon      from "@mui/icons-material/VerifiedUser";
import { supabase }          from "@/lib/supabase";
import { exportToExcel }     from "@/lib/utils/exportExcel";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type EstadoPago = "procesado" | "fallido";

interface Donacion {
  id: string;
  monto: number;
  metodo: string;
  estado: EstadoPago;
  created_at: string;
  nombres: string | null;
  apellidos: string | null;
  razon_social: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  declaracion_jurada: boolean | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  const d = new Date(iso);
  return {
    fecha: d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }),
    hora:  d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
  };
}

function shortId(uuid: string) { return uuid.slice(0, 8).toUpperCase(); }

// ── Sub-componentes ────────────────────────────────────────────────────────────

function EstadoChip({ estado }: { estado: EstadoPago }) {
  const cfg: Record<EstadoPago, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    procesado: { label: "Procesado", color: "#16a34a", bg: "#dcfce7", icon: <CheckCircleIcon sx={{ fontSize: 13 }} /> },
    fallido:   { label: "Fallido",   color: "#dc2626", bg: "#fee2e2", icon: <CancelIcon sx={{ fontSize: 13 }} /> },
  };
  const c = cfg[estado] ?? { label: estado, color: "#64748b", bg: "#f1f5f9", icon: null };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: c.color, background: c.bg }}>
      {c.icon}{c.label}
    </span>
  );
}

function MetodoBadge({ metodo }: { metodo: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: "#eff6ff", color: "#1565c0" }}>
      {metodo}
    </span>
  );
}

function DjBadge({ valor }: { valor: boolean | null }) {
  if (valor === null) return <span className="text-gray-300 text-xs">—</span>;
  return valor
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#16a34a" }}>
        <VerifiedUserIcon sx={{ fontSize: 13 }} /> Sí
      </span>
    : <span className="inline-flex items-center text-xs font-semibold" style={{ color: "#dc2626" }}>No</span>;
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="stat-card bg-white rounded-2xl shadow p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold" style={{ color: "#0d1b3e" }}>{value}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DonacionesPage() {
  const [data, setData]             = useState<Donacion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoPago | "todos">("todos");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("donaciones")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setData((rows as Donacion[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtrados = data.filter((d) => {
    const texto = [d.id, String(d.monto), d.metodo, d.nombres, d.apellidos, d.numero_documento]
      .filter(Boolean).join(" ").toLowerCase();
    const matchSearch = texto.includes(search.toLowerCase());
    const matchEstado = filtroEstado === "todos" || d.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const totalRecaudado = data.filter((d) => d.estado === "procesado").reduce((acc, d) => acc + d.monto, 0);
  const procesadas     = data.filter((d) => d.estado === "procesado").length;

  const handleExport = () => {
    const rows = filtrados.map((d) => {
      const { fecha, hora } = formatFecha(d.created_at);
      return {
        "ID":                 d.id,
        "Nombres":            d.nombres ?? "",
        "Apellidos":          d.apellidos ?? "",
        "Razón Social":       d.razon_social ?? "",
        "Tipo Documento":     d.tipo_documento ?? "",
        "N° Documento":       d.numero_documento ?? "",
        "Monto (S/)":         Number(d.monto).toFixed(2),
        "Método de Pago":     d.metodo ?? "",
        "Estado":             d.estado,
        "Declaración Jurada": d.declaracion_jurada ? "Sí" : "No",
        "Fecha":              fecha,
        "Hora":               hora,
      };
    });
    exportToExcel(rows, `Donaciones_${new Date().toISOString().slice(0, 10)}`, "Donaciones");
  };

  const COLS = ["ID", "Donante", "Documento", "Monto", "Método", "Estado", "D. Jurada", "Fecha y Hora"];

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Donaciones</h1>
        <p className="text-sm text-gray-400 mt-1">Aportes recibidos a través del formulario público</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total recaudado"  value={`S/ ${totalRecaudado.toFixed(2)}`} icon={<AttachMoneyIcon />}       color="#1565c0" />
        <StatCard label="Total donaciones" value={data.length}                        icon={<PeopleIcon />}            color="#0d47a1" />
        <StatCard label="Procesadas"       value={procesadas}                         icon={<VolunteerActivismIcon />} color="#16a34a" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <TextField
            size="small"
            placeholder="Buscar por nombre, DNI, monto o método..."
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
            {(["todos", "procesado", "fallido"] as const).map((e) => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e as EstadoPago | "todos")}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={
                  filtroEstado === e
                    ? { background: "#1565c0", color: "#fff", borderColor: "#1565c0" }
                    : { background: "transparent", color: "#64748b", borderColor: "#e2e8f0" }
                }
              >
                {e === "todos" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
              </button>
            ))}
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

        {/* Contador */}
        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50">
          {loading ? "Cargando..." : `${filtrados.length} registro${filtrados.length !== 1 ? "s" : ""}`}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {COLS.map((h) => (
                  <th key={h}
                    className={`${h === "D. Jurada" ? "text-center" : "text-left"} px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap`}
                    style={{ color: "#64748b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLS.length} className="text-center py-16">
                    <CircularProgress size={28} sx={{ color: "#1565c0" }} />
                    <p className="text-gray-400 text-sm mt-3">Cargando registros...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLS.length} className="text-center py-16 text-red-400 text-sm">
                    Error al cargar datos: {error}
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="text-center py-16 text-gray-400 text-sm">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                filtrados.map((d, i) => {
                  const { fecha, hora } = formatFecha(d.created_at);
                  const nombreCompleto  = [d.nombres, d.apellidos].filter(Boolean).join(" ") || null;
                  const inicial         = (d.nombres ?? d.apellidos ?? "?").charAt(0).toUpperCase();
                  return (
                    <tr
                      key={d.id}
                      className="table-row-animate border-t border-gray-50 hover:bg-blue-50 transition-colors"
                      style={{ background: i % 2 === 0 ? "#ffffff" : "#fafbff" }}
                    >
                      {/* ID */}
                      <td className="px-4 py-3">
                        <Tooltip title={d.id}>
                          <span className="font-mono text-xs px-2 py-1 rounded-md cursor-default font-semibold"
                            style={{ background: "#eff6ff", color: "#1565c0" }}>
                            {shortId(d.id)}…
                          </span>
                        </Tooltip>
                      </td>

                      {/* Donante */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {nombreCompleto ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ background: "#1565c0" }}>
                              {inicial}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-xs">{nombreCompleto}</p>
                              {d.razon_social && (
                                <p className="text-xs text-gray-400">{d.razon_social}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Documento */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {d.numero_documento ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold" style={{ color: "#0d1b3e" }}>
                              {d.numero_documento}
                            </span>
                            {d.tipo_documento && (
                              <span className="text-xs text-gray-400">{d.tipo_documento}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold" style={{ color: "#0d1b3e" }}>
                          S/ {Number(d.monto).toFixed(2)}
                        </span>
                      </td>

                      {/* Método */}
                      <td className="px-4 py-3">
                        <MetodoBadge metodo={d.metodo ?? "—"} />
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <EstadoChip estado={d.estado} />
                      </td>

                      {/* Declaración Jurada */}
                      <td className="px-4 py-3 text-center">
                        <DjBadge valor={d.declaracion_jurada} />
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700 text-xs">{fecha}</span>
                          <span className="text-xs text-gray-400">{hora}</span>
                        </div>
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
    </div>
  );
}
