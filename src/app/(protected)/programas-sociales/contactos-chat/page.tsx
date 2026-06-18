"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import BadgeIcon from "@mui/icons-material/Badge";
import GroupsIcon from "@mui/icons-material/Groups";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import PhoneIcon from "@mui/icons-material/Phone";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CloseIcon from "@mui/icons-material/Close";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type TipoContacto = "personero" | "simpatizante";

interface ContactoChat {
  id: string;
  nombre: string;
  apellido_materno: string;
  apellido_paterno: string;
  telefono: string;
  tipo: TipoContacto;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// Devuelve "YYYY-MM-DD" en zona horaria de Lima
function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora  = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
}

function formatDateLabel(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: TipoContacto }) {
  const esPersonero = tipo === "personero";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={esPersonero
        ? { background: "#eff6ff", color: "#1565c0" }
        : { background: "#f0fdf4", color: "#166534" }}
    >
      {esPersonero ? <BadgeIcon sx={{ fontSize: 13 }} /> : <GroupsIcon sx={{ fontSize: 13 }} />}
      {esPersonero ? "Personero" : "Simpatizante"}
    </span>
  );
}

function StatCard({
  label, value, icon, color, sublabel, highlight,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  color: string; sublabel?: string; highlight?: boolean;
}) {
  return (
    <div
      className="stat-card rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: highlight ? `linear-gradient(135deg, ${color}ee, ${color}cc)` : "#fff",
        boxShadow: highlight ? `0 8px 24px ${color}40` : undefined,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: highlight ? "rgba(255,255,255,0.2)" : `${color}18` }}
      >
        <span style={{ color: highlight ? "#fff" : color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: highlight ? "rgba(255,255,255,0.8)" : "#94a3b8" }}>
          {label}
        </p>
        <p className="text-xl font-bold" style={{ color: highlight ? "#fff" : "#0d1b3e" }}>{value}</p>
        {sublabel && (
          <p className="text-xs mt-0.5" style={{ color: highlight ? "rgba(255,255,255,0.7)" : "#94a3b8" }}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Quick date options ─────────────────────────────────────────────────────────

const QUICK_DATES = [
  { label: "Hoy",       value: () => offsetDate(0)  },
  { label: "Ayer",      value: () => offsetDate(-1) },
  { label: "Anteayer",  value: () => offsetDate(-2) },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ContactosChatPage() {
  const [data, setData]         = useState<ContactoChat[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [filtroTipo, setFiltroTipo]   = useState<TipoContacto | "todos">("todos");
  const [filtroFecha, setFiltroFecha] = useState<string | null>(null); // "YYYY-MM-DD" o null

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("contactos_chat")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) setError(err.message);
    else setData((rows as ContactoChat[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aplicar filtros
  const filtrados = data.filter((c) => {
    const texto = `${c.nombre} ${c.apellido_materno} ${c.apellido_paterno} ${c.telefono}`.toLowerCase();
    const matchSearch = texto.includes(search.toLowerCase());
    const matchTipo   = filtroTipo === "todos" || c.tipo === filtroTipo;
    const matchFecha  = !filtroFecha || toLocalDateStr(new Date(c.created_at)) === filtroFecha;
    return matchSearch && matchTipo && matchFecha;
  });

  // Stats globales (sin filtro de fecha)
  const totalPersoneros    = data.filter((c) => c.tipo === "personero").length;
  const totalSimpatizantes = data.filter((c) => c.tipo === "simpatizante").length;

  // Stat de la fecha seleccionada
  const countFechaSeleccionada = filtroFecha
    ? data.filter((c) => toLocalDateStr(new Date(c.created_at)) === filtroFecha).length
    : data.filter((c) => toLocalDateStr(new Date(c.created_at)) === offsetDate(0)).length;

  const fechaStatLabel = filtroFecha
    ? formatDateLabel(filtroFecha)
    : "Hoy";

  const handleExport = () => {
    const rows = filtrados.map((c) => {
      const { fecha, hora } = formatFecha(c.created_at);
      return {
        "Nombre":           c.nombre ?? "",
        "Apellido Materno": c.apellido_materno ?? "",
        "Apellido Paterno": c.apellido_paterno ?? "",
        "Teléfono":         c.telefono ?? "",
        "Tipo":             c.tipo ?? "",
        "Fecha":            fecha,
        "Hora":             hora,
      };
    });
    exportToExcel(rows, `ContactosChat_${filtroFecha ?? new Date().toISOString().slice(0, 10)}`, "Contactos Chat");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1565c0, #1976d2)", boxShadow: "0 4px 14px rgba(21,101,192,0.35)" }}
            >
              <ChatBubbleIcon sx={{ fontSize: 18, color: "#fff" }} />
            </div>
            <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Contactos del Chat</h1>
          </div>
          <p className="text-sm text-gray-400 ml-12">Personas registradas a través del chatbot de campaña</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total registros"   value={data.length}          icon={<PeopleIcon />}     color="#1565c0" />
        <StatCard label="Personeros"        value={totalPersoneros}      icon={<BadgeIcon />}      color="#1565c0" sublabel="vía chatbot" />
        <StatCard label="Simpatizantes"     value={totalSimpatizantes}   icon={<GroupsIcon />}     color="#16a34a" sublabel="vía chatbot" />
        <StatCard
          label={fechaStatLabel}
          value={countFechaSeleccionada}
          icon={<CalendarTodayIcon />}
          color="#7c3aed"
          sublabel="registros"
          highlight={!!filtroFecha}
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">

        {/* Toolbar principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <TextField
            size="small"
            placeholder="Buscar por nombre, apellidos o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
            {([
              { value: "todos",        label: "Todos" },
              { value: "personero",    label: "Personeros" },
              { value: "simpatizante", label: "Simpatizantes" },
            ] as const).map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltroTipo(f.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={
                  filtroTipo === f.value
                    ? { background: "#1565c0", color: "#fff", borderColor: "#1565c0" }
                    : { background: "transparent", color: "#64748b", borderColor: "#e2e8f0" }
                }
              >
                {f.label}
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

        {/* Barra de filtro de fecha */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100"
          style={{ background: "#fafbff" }}
        >
          <CalendarTodayIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
          <span className="text-xs font-semibold text-gray-400 mr-1">Filtrar por fecha:</span>

          {/* Accesos rápidos */}
          {QUICK_DATES.map((q) => {
            const val = q.value();
            const active = filtroFecha === val;
            return (
              <button
                key={q.label}
                onClick={() => setFiltroFecha(active ? null : val)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={
                  active
                    ? { background: "#7c3aed", color: "#fff", borderColor: "#7c3aed" }
                    : { background: "#fff", color: "#64748b", borderColor: "#e2e8f0" }
                }
              >
                {q.label}
              </button>
            );
          })}

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />

          {/* Selector de fecha calendario MUI */}
          <DatePicker
            value={filtroFecha ? dayjs(filtroFecha) : null}
            onChange={(val: Dayjs | null) => setFiltroFecha(val ? val.format("YYYY-MM-DD") : null)}
            maxDate={dayjs()}
            label="Elegir fecha"
            slotProps={{
              textField: {
                size: "small",
                sx: {
                  width: 160,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "50px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: filtroFecha && !QUICK_DATES.map(q => q.value()).includes(filtroFecha) ? "#7c3aed" : "#64748b",
                    "& fieldset": {
                      borderColor: filtroFecha && !QUICK_DATES.map(q => q.value()).includes(filtroFecha) ? "#7c3aed" : "#e2e8f0",
                    },
                    "&:hover fieldset": { borderColor: "#1565c0" },
                    "&.Mui-focused fieldset": { borderColor: "#1565c0" },
                    background: filtroFecha && !QUICK_DATES.map(q => q.value()).includes(filtroFecha) ? "#f5f3ff" : "#fff",
                  },
                  "& .MuiInputLabel-root": { fontSize: "0.72rem" },
                  "& .MuiSvgIcon-root": {
                    fontSize: 16,
                    color: filtroFecha && !QUICK_DATES.map(q => q.value()).includes(filtroFecha) ? "#7c3aed" : "#94a3b8",
                  },
                },
              },
            }}
          />

          {/* Limpiar filtro */}
          {filtroFecha && (
            <button
              onClick={() => setFiltroFecha(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
              style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              <CloseIcon sx={{ fontSize: 11 }} />
              Quitar filtro
            </button>
          )}

          {/* Etiqueta de fecha activa */}
          {filtroFecha && (
            <span className="ml-auto text-xs font-semibold" style={{ color: "#7c3aed" }}>
              Mostrando: {formatDateLabel(filtroFecha)}
            </span>
          )}
        </div>

        {/* Contador */}
        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50">
          {loading
            ? "Cargando..."
            : `${filtrados.length} registro${filtrados.length !== 1 ? "s" : ""}${filtroFecha ? ` el ${formatDateLabel(filtroFecha)}` : ""}`}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Nombre completo", "Apellidos", "Teléfono", "Tipo", "Fecha y hora"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "#64748b" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <CircularProgress size={28} sx={{ color: "#1565c0" }} />
                    <p className="text-gray-400 text-sm mt-3">Cargando registros...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-red-400 text-sm">
                    Error al cargar datos: {error}
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#f5f3ff" }}>
                        <CalendarTodayIcon sx={{ fontSize: 28, color: "#7c3aed" }} />
                      </div>
                      <p className="text-gray-500 text-sm font-semibold">Sin registros{filtroFecha ? ` el ${formatDateLabel(filtroFecha)}` : ""}</p>
                      {filtroFecha && (
                        <button
                          onClick={() => setFiltroFecha(null)}
                          className="text-xs font-semibold px-4 py-1.5 rounded-full"
                          style={{ background: "#eff6ff", color: "#1565c0" }}
                        >
                          Ver todos los registros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map((c, i) => {
                  const { fecha, hora } = formatFecha(c.created_at);
                  const inicial = c.nombre?.charAt(0)?.toUpperCase() ?? "?";
                  const esPersonero = c.tipo === "personero";
                  return (
                    <tr
                      key={c.id}
                      className="table-row-animate border-t border-gray-50 hover:bg-blue-50 transition-colors"
                      style={{ background: i % 2 === 0 ? "#ffffff" : "#fafbff" }}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: esPersonero ? "#1565c0" : "#16a34a" }}
                          >
                            {inicial}
                          </div>
                          <span className="font-semibold text-gray-800">{c.nombre}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700 font-medium">
                          {c.apellido_paterno} {c.apellido_materno}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {c.telefono ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <PhoneIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                            {c.telefono}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <TipoBadge tipo={c.tipo} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700">{fecha}</span>
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
