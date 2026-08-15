"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress, Checkbox, Button, TablePagination, Popover, Slider, Typography, Box } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { showError } from "@/lib/utils/swalConfig";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import PhoneIcon from "@mui/icons-material/Phone";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import MessageIcon from "@mui/icons-material/Message";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CakeIcon from "@mui/icons-material/Cake";
import SendMessageModal, { Contacto } from "@/components/messaging/SendMessageModal";
import SuccessToast from "@/components/feedback/SuccessToast";

dayjs.locale("es");

const EDAD_MAX = 100;
const COMUNAS = Array.from({ length: 18 }, (_, i) => i + 1);

// El texto libre de "comuna" viene con inconsistencias (mayúsculas, espacios,
// "No sé / No conozco mi comuna", etc.), así que el filtro compara por el
// número extraído en vez de por texto exacto.
function extraerNumeroComuna(comuna?: string | null): number | null {
  if (!comuna) return null;
  const match = comuna.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return n >= 1 && n <= 18 ? n : null;
}

interface Participante {
  id: string;
  nombre_completo: string;
  telefono?: string | null;
  edad?: number | null;
  direccion?: string | null;
  comuna?: string | null;
  fecha_nacimiento?: string | null;
  llamado?: boolean | null;
  fecha_llamada?: string | null;
  created_at?: string | null;
}

// fecha_nacimiento viene como texto: "DD/MM/YYYY" o, en algunos registros, "YYYY-MM-DD".
function extraerDiaMes(fechaNacimiento: string): { dia: number; mes: number } | null {
  if (!fechaNacimiento) return null;
  const partes = fechaNacimiento.trim().split(/[/-]/);
  if (partes.length < 3) return null;

  const esFormatoConSlash = fechaNacimiento.includes("/"); // DD/MM/YYYY
  const dia = parseInt(esFormatoConSlash ? partes[0] : partes[2], 10);
  const mes = parseInt(partes[1], 10);

  if (!Number.isInteger(dia) || !Number.isInteger(mes)) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { dia, mes };
}

function cumpleEnFecha(fechaNacimiento: string, objetivo: Dayjs): boolean {
  const partes = extraerDiaMes(fechaNacimiento);
  if (!partes) return false;
  return partes.dia === objetivo.date() && partes.mes === objetivo.month() + 1;
}

function hasPhone(p: Participante): boolean {
  return !!p.telefono && p.telefono !== "EMPTY";
}

function LlamadoBadge({ llamado }: { llamado?: boolean | null }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={llamado
        ? { background: "#f0fdf4", color: "#166534" }
        : { background: "#f1f5f9", color: "#64748b" }}>
      {llamado ? <PhoneInTalkIcon sx={{ fontSize: 12 }} /> : <PendingActionsIcon sx={{ fontSize: 12 }} />}
      {llamado ? "Llamado" : "Pendiente"}
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

export default function ParticipantesActividadesPage() {
  const [data, setData]       = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [filtroCelular, setFiltroCelular]         = useState<"todos" | "con" | "sin">("todos");
  const [filtroComuna, setFiltroComuna]           = useState<string>("todos");
  const [filtroFechaCumple, setFiltroFechaCumple] = useState<Dayjs | null>(null);
  const [filtroLlamado, setFiltroLlamado]         = useState<"todos" | "llamados" | "pendientes">("todos");
  const [edadRange, setEdadRange]                 = useState<number[]>([0, EDAD_MAX]);
  const [edadRangeDraft, setEdadRangeDraft]       = useState<number[]>([0, EDAD_MAX]);
  const [edadAnchor, setEdadAnchor]               = useState<HTMLElement | null>(null);
  const [exportAnchor, setExportAnchor]           = useState<HTMLElement | null>(null);
  const [cantidadDescarga, setCantidadDescarga]   = useState<string>("");
  const [successMsg, setSuccessMsg]               = useState<string | null>(null);
  const [selectedIds, setSelectedIds]             = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen]                 = useState(false);
  const [modalContactos, setModalContactos]       = useState<Contacto[]>([]);
  const [page, setPage]                           = useState(0);
  const [rowsPerPage, setRowsPerPage]             = useState(25);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Supabase/PostgREST limita cada consulta; se pagina con .range() hasta traer todo.
    const PAGE_SIZE = 1000;
    const todos: Participante[] = [];
    let from = 0;
    let hayError: string | null = null;

    while (true) {
      const { data: rows, error: err } = await supabase
        .from("participantes_actividades")
        .select("*")
        .order("nombre_completo", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (err) { hayError = err.message; break; }
      const lote = (rows as Participante[]) ?? [];
      todos.push(...lote);
      if (lote.length === 0) break;
      from += lote.length;
    }

    if (hayError) setError(hayError);
    else setData(todos);
    setLoading(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isEdadFiltered = edadRange[0] > 0 || edadRange[1] < EDAD_MAX;

  const filtrados = data.filter((p) => {
    const nombreCompleto = (p.nombre_completo ?? "").toLowerCase();
    const matchSearch =
      nombreCompleto.includes(search.toLowerCase()) ||
      (p.telefono ?? "").includes(search) ||
      (p.direccion ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.comuna ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCelular = filtroCelular === "todos"
      ? true
      : filtroCelular === "con"
        ? hasPhone(p)
        : !hasPhone(p);
    const matchComuna = filtroComuna === "todos" || extraerNumeroComuna(p.comuna) === Number(filtroComuna);
    const matchCumple = !filtroFechaCumple || cumpleEnFecha(p.fecha_nacimiento ?? "", filtroFechaCumple);
    const matchEdad = (() => {
      if (!isEdadFiltered) return true;
      if (p.edad == null) return false;
      return p.edad >= edadRange[0] && p.edad <= edadRange[1];
    })();
    const matchLlamado = filtroLlamado === "todos"
      ? true
      : filtroLlamado === "llamados"
        ? !!p.llamado
        : !p.llamado;
    return matchSearch && matchCelular && matchComuna && matchCumple && matchEdad && matchLlamado;
  });

  useEffect(() => { setPage(0); }, [search, filtroCelular, filtroComuna, filtroFechaCumple, edadRange, filtroLlamado]);

  const paginados = filtrados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Selección (aplica solo a la página visible)
  const conTelefono = paginados.filter(hasPhone);
  const allChecked  = conTelefono.length > 0 && conTelefono.every((p) => selectedIds.has(p.id));
  const someChecked = paginados.some((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(conTelefono.map((p) => p.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSendOne = (p: Participante) => {
    if (!hasPhone(p)) return;
    setModalContactos([{ nombre: p.nombre_completo, telefono: p.telefono! }]);
    setModalOpen(true);
  };

  const openSendBulk = () => {
    const contactos = filtrados
      .filter((p) => selectedIds.has(p.id) && hasPhone(p))
      .map((p) => ({ nombre: p.nombre_completo, telefono: p.telefono! }));
    if (!contactos.length) return;
    setModalContactos(contactos);
    setModalOpen(true);
  };

  const totalConCelular = useMemo(() => data.filter(hasPhone).length, [data]);
  const totalSinCelular = data.length - totalConCelular;
  const totalLlamados   = useMemo(() => data.filter((p) => p.llamado).length, [data]);
  const selCount         = filtrados.filter((p) => selectedIds.has(p.id)).length;
  const COLS             = 9; // checkbox + nombres + celular + edad + nacimiento + dirección + comuna + llamado + acciones

  // Solo se puede descargar/marcar en lote a quienes aún están pendientes
  // (respetando los demás filtros activos: búsqueda, celular, edad).
  const pendientesDisponibles = filtrados.filter((p) => !p.llamado);

  const abrirExportar = (e: React.MouseEvent<HTMLElement>) => {
    setCantidadDescarga(String(pendientesDisponibles.length));
    setExportAnchor(e.currentTarget);
  };

  const confirmarExportar = async () => {
    const max = pendientesDisponibles.length;
    const n = Math.max(1, Math.min(parseInt(cantidadDescarga, 10) || 0, max));
    if (n <= 0) return;

    const lote = pendientesDisponibles.slice(0, n);
    const rows = lote.map((p) => ({
      "Nombres y Apellidos": p.nombre_completo ?? "",
      "Número de Contacto":  hasPhone(p) ? (p.telefono!.startsWith("+") ? p.telefono : `+51 ${p.telefono}`) : "",
      "Edad":                p.edad ?? "",
      "Fecha Nacimiento":    p.fecha_nacimiento ?? "",
      "Dirección":           p.direccion ?? "",
      "Comuna":              p.comuna ?? "",
    }));
    exportToExcel(rows, `Participantes_Actividades_Lote_${new Date().toISOString().slice(0, 10)}`, "Participantes");
    setExportAnchor(null);

    const ids = lote.map((p) => p.id);
    const ahora = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("participantes_actividades")
      .update({ llamado: true, fecha_llamada: ahora })
      .in("id", ids);

    if (updateError) {
      showError("No se pudo actualizar", updateError.message);
    } else {
      setData((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, llamado: true, fecha_llamada: ahora } : p)));
      setSuccessMsg(`${ids.length} contacto${ids.length !== 1 ? "s" : ""} descargado${ids.length !== 1 ? "s" : ""} y marcado${ids.length !== 1 ? "s" : ""} como llamado${ids.length !== 1 ? "s" : ""}.`);
    }
  };

  const hayFiltrosActivos = filtroCelular !== "todos" || filtroComuna !== "todos" || !!filtroFechaCumple || filtroLlamado !== "todos" || isEdadFiltered;

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Participantes de Actividades</h1>
        <p className="text-sm text-gray-400 mt-1">Registro de participantes en actividades</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total participantes" value={data.length}      icon={<PeopleIcon />}        color="#1565c0" />
        <StatCard label="Con celular"          value={totalConCelular} icon={<PhoneIcon />}         color="#16a34a" />
        <StatCard label="Sin celular"          value={totalSinCelular} icon={<PhoneDisabledIcon />} color="#dc2626" />
        <StatCard label="Llamados"             value={totalLlamados}   icon={<PhoneInTalkIcon />}   color="#166534" />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        {/* Toolbar principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <TextField
            size="small"
            placeholder="Buscar por nombre, celular o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 320, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
            {selCount > 0 && (
              <Button variant="contained" size="small"
                startIcon={<MessageIcon sx={{ fontSize: 16 }} />}
                onClick={openSendBulk}
                sx={{
                  borderRadius: "10px", textTransform: "none", fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif", fontSize: "0.75rem",
                  background: "linear-gradient(135deg, #1565c0, #1976d2)",
                  boxShadow: "0 4px 12px rgba(21,101,192,0.35)",
                  "&:hover": { background: "linear-gradient(135deg, #0d47a1, #1565c0)" },
                }}>
                Enviar a {selCount} seleccionado{selCount !== 1 ? "s" : ""}
              </Button>
            )}
            <Tooltip title="Actualizar">
              <IconButton size="small" onClick={fetchData} disabled={loading}>
                <RefreshIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Descargar por lotes">
              <IconButton size="small" onClick={abrirExportar} disabled={loading || pendientesDisponibles.length === 0}>
                <FileDownloadIcon sx={{ fontSize: 18, color: pendientesDisponibles.length > 0 ? "#1565c0" : "#94a3b8" }} />
              </IconButton>
            </Tooltip>
          </div>

          <Popover
            open={!!exportAnchor}
            anchorEl={exportAnchor}
            onClose={() => setExportAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{ mt: 1 }}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: "16px",
                  boxShadow: "0 16px 40px rgba(15,23,42,0.16)",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          >
            <Box sx={{ p: 3, width: 300 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0d1b3e" sx={{ fontFamily: "'Poppins', sans-serif" }}>
                Descargar por lotes
              </Typography>
              <Typography variant="caption" color="#94a3b8" sx={{ display: "block", mt: 0.25, mb: 2 }}>
                Se descargan los primeros N pendientes (según los filtros activos) y quedan marcados como llamados
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Box sx={{ px: 2, py: 0.5, borderRadius: "999px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <Typography variant="body2" fontWeight={700} color="#166534">
                    {pendientesDisponibles.length} pendiente{pendientesDisponibles.length !== 1 ? "s" : ""} disponible{pendientesDisponibles.length !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                size="small"
                type="number"
                label="Cantidad a descargar"
                value={cantidadDescarga}
                onChange={(e) => setCantidadDescarga(e.target.value)}
                slotProps={{ htmlInput: { min: 1, max: pendientesDisponibles.length } }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
              />

              <Box display="flex" justifyContent="flex-end" mt={3} gap={1}>
                <Button size="small"
                  onClick={() => setExportAnchor(null)}
                  sx={{ color: "#64748b", textTransform: "none", fontWeight: 600, fontFamily: "'Poppins', sans-serif", "&:hover": { background: "#f1f5f9" } }}>
                  Cancelar
                </Button>
                <Button size="small" variant="contained"
                  onClick={confirmarExportar}
                  disabled={pendientesDisponibles.length === 0 || !cantidadDescarga || Number(cantidadDescarga) < 1}
                  sx={{
                    borderRadius: "999px", textTransform: "none", fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                    background: "linear-gradient(135deg, #1565c0, #1976d2)",
                    boxShadow: "0 4px 12px rgba(21,101,192,0.35)",
                    "&:hover": { background: "linear-gradient(135deg, #0d47a1, #1565c0)" },
                  }}>
                  Descargar y marcar
                </Button>
              </Box>
            </Box>
          </Popover>
        </div>

        {/* Barra de filtros: Celular + Edad */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100" style={{ background: "#fafbff" }}>

          {/* Filtro Celular */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Celular:</span>
            {([
              { value: "todos", label: "Todos" },
              { value: "con",   label: "Con celular" },
              { value: "sin",   label: "Sin celular" },
            ] as const).map((f) => (
              <button key={f.value} onClick={() => setFiltroCelular(f.value)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={filtroCelular === f.value
                  ? { background: "#16a34a", color: "#fff", borderColor: "#16a34a" }
                  : { background: "#fff", color: "#64748b", borderColor: "#e2e8f0" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />

          {/* Filtro Comuna */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Comuna:</span>
            <select
              value={filtroComuna}
              onChange={(e) => setFiltroComuna(e.target.value)}
              className="text-xs border rounded-full px-3 py-1.5 outline-none cursor-pointer font-semibold transition-all"
              style={{
                borderColor: filtroComuna !== "todos" ? "#1565c0" : "#e2e8f0",
                color: filtroComuna !== "todos" ? "#1565c0" : "#64748b",
                background: filtroComuna !== "todos" ? "#eff6ff" : "#fff",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <option value="todos">Todas</option>
              {COMUNAS.map((n) => (
                <option key={n} value={n}>Comuna {n}</option>
              ))}
            </select>
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />

          {/* Filtro Cumpleaños (calendario) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <CakeIcon sx={{ fontSize: 14 }} /> Cumpleaños:
            </span>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker
                value={filtroFechaCumple}
                onChange={(nuevo) => setFiltroFechaCumple(nuevo)}
                format="DD [de] MMMM"
                enableAccessibleFieldDOMStructure={false}
                slotProps={{
                  textField: {
                    size: "small",
                    placeholder: "Elegir fecha",
                    sx: {
                      width: 176,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "999px",
                        height: 32,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        background: filtroFechaCumple ? "#fdf2f8" : "#fff",
                        transition: "all 0.15s ease",
                        "& fieldset": { borderColor: filtroFechaCumple ? "#f472b6" : "#e2e8f0" },
                        "&:hover fieldset": { borderColor: "#db2777" },
                        "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(219,39,119,0.12)" },
                        "&.Mui-focused fieldset": { borderColor: "#db2777", borderWidth: "1.5px" },
                      },
                      "& .MuiOutlinedInput-input": {
                        padding: "0 2px 0 6px",
                        color: filtroFechaCumple ? "#db2777" : "#334155",
                        "&::placeholder": { color: "#94a3b8", opacity: 1 },
                      },
                    },
                  },
                  openPickerButton: {
                    size: "small",
                    sx: {
                      color: filtroFechaCumple ? "#db2777" : "#94a3b8",
                      marginRight: "2px",
                      "& .MuiSvgIcon-root": { fontSize: 17 },
                    },
                  },
                }}
              />
            </LocalizationProvider>
            {filtroFechaCumple ? (
              <button onClick={() => setFiltroFechaCumple(null)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={{ background: "#fdf2f8", color: "#db2777", borderColor: "#f9a8d4" }}>
                ✕ Quitar
              </button>
            ) : (
              <button onClick={() => setFiltroFechaCumple(dayjs())}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={{ background: "#fff", color: "#db2777", borderColor: "#fbcfe8" }}>
                Hoy
              </button>
            )}
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />

          {/* Filtro Edad (calculada a partir de fecha_nacimiento) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Edad:</span>
            <button
              onClick={(e) => { setEdadRangeDraft(edadRange); setEdadAnchor(e.currentTarget); }}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={isEdadFiltered
                ? { background: "#ecfeff", color: "#0891b2", borderColor: "#0891b2" }
                : { background: "#fff", color: "#64748b", borderColor: "#e2e8f0" }}>
              {isEdadFiltered ? `${edadRange[0]} - ${edadRange[1]} años` : "Todas"}
            </button>
          </div>

          <Popover
            open={!!edadAnchor}
            anchorEl={edadAnchor}
            onClose={() => setEdadAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            sx={{ mt: 1 }}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: "16px",
                  boxShadow: "0 16px 40px rgba(15,23,42,0.16)",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          >
            <Box sx={{ p: 3, width: 300 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0d1b3e" sx={{ fontFamily: "'Poppins', sans-serif" }}>
                Rango de edad
              </Typography>
              <Typography variant="caption" color="#94a3b8" sx={{ display: "block", mt: 0.25, mb: 2 }}>
                Filtra según la edad registrada de cada participante
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
                <Box sx={{ px: 2, py: 0.5, borderRadius: "999px", background: "#ecfeff", border: "1px solid #a5f3fc" }}>
                  <Typography variant="body2" fontWeight={700} color="#0891b2">
                    {edadRangeDraft[0]} - {edadRangeDraft[1]} años
                  </Typography>
                </Box>
              </Box>

              <Slider
                value={edadRangeDraft}
                onChange={(_e, v) => setEdadRangeDraft(v as number[])}
                valueLabelDisplay="auto"
                min={0}
                max={EDAD_MAX}
                sx={{
                  color: "#0891b2",
                  height: 6,
                  "& .MuiSlider-thumb": {
                    width: 18,
                    height: 18,
                    backgroundColor: "#fff",
                    border: "3px solid #0891b2",
                    boxShadow: "0 2px 8px rgba(8,145,178,0.4)",
                    "&:hover, &.Mui-focusVisible": { boxShadow: "0 0 0 8px rgba(8,145,178,0.16)" },
                    "&.Mui-active": { boxShadow: "0 0 0 10px rgba(8,145,178,0.2)" },
                  },
                  "& .MuiSlider-track": { backgroundColor: "#0891b2", border: "none" },
                  "& .MuiSlider-rail": { backgroundColor: "#e2e8f0", opacity: 1 },
                  "& .MuiSlider-valueLabel": { backgroundColor: "#0891b2", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700 },
                }}
              />
              <Box display="flex" justifyContent="space-between" mt={0.5}>
                <Typography variant="caption" color="#94a3b8" fontWeight={600}>0 años</Typography>
                <Typography variant="caption" color="#94a3b8" fontWeight={600}>{EDAD_MAX} años</Typography>
              </Box>

              <Box display="flex" justifyContent="flex-end" mt={3} gap={1}>
                <Button size="small"
                  onClick={() => { setEdadRangeDraft([0, EDAD_MAX]); setEdadRange([0, EDAD_MAX]); }}
                  sx={{ color: "#64748b", textTransform: "none", fontWeight: 600, fontFamily: "'Poppins', sans-serif", "&:hover": { background: "#f1f5f9" } }}>
                  Limpiar todo
                </Button>
                <Button size="small" variant="contained"
                  onClick={() => { setEdadRange(edadRangeDraft); setEdadAnchor(null); }}
                  sx={{
                    borderRadius: "999px", textTransform: "none", fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                    background: "linear-gradient(135deg, #0891b2, #06b6d4)",
                    boxShadow: "0 4px 12px rgba(8,145,178,0.35)",
                    "&:hover": { background: "linear-gradient(135deg, #0e7490, #0891b2)" },
                  }}>
                  Aplicar
                </Button>
              </Box>
            </Box>
          </Popover>

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />

          {/* Filtro Llamado (para seguimiento de callcenter) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Llamado:</span>
            {([
              { value: "todos",      label: "Todos" },
              { value: "llamados",   label: "Llamados" },
              { value: "pendientes", label: "Pendientes" },
            ] as const).map((f) => (
              <button key={f.value} onClick={() => setFiltroLlamado(f.value)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={filtroLlamado === f.value
                  ? { background: "#166534", color: "#fff", borderColor: "#166534" }
                  : { background: "#fff", color: "#64748b", borderColor: "#e2e8f0" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Limpiar */}
          {hayFiltrosActivos && (
            <button
              onClick={() => { setFiltroCelular("todos"); setFiltroComuna("todos"); setFiltroFechaCumple(null); setFiltroLlamado("todos"); setEdadRange([0, EDAD_MAX]); setEdadRangeDraft([0, EDAD_MAX]); }}
              className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
              style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Contador */}
        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50 flex items-center gap-2">
          {loading ? "Cargando..." : `${filtrados.length} registro${filtrados.length !== 1 ? "s" : ""}`}
          {selCount > 0 && (
            <span className="font-semibold" style={{ color: "#1565c0" }}>
              · {selCount} seleccionado{selCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th className="px-4 py-3 w-10">
                  <Checkbox size="small" checked={allChecked} indeterminate={someChecked && !allChecked}
                    onChange={toggleSelectAll} disabled={loading || conTelefono.length === 0}
                    sx={{ p: 0, color: "#cbd5e1", "&.Mui-checked": { color: "#1565c0" }, "&.MuiCheckbox-indeterminate": { color: "#1565c0" } }} />
                </th>
                {["Nombres y Apellidos", "Número de Contacto", "Edad", "Nacimiento", "Dirección", "Comuna", "Llamado", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap" style={{ color: "#64748b" }}>
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
                paginados.map((p, i) => {
                  const checked    = selectedIds.has(p.id);
                  const tienePhone = hasPhone(p);
                  const edad       = p.edad ?? null;
                  return (
                    <tr key={p.id}
                      className="table-row-animate border-t border-gray-50 hover:bg-blue-50 transition-colors"
                      style={{ background: checked ? "#eff6ff" : i % 2 === 0 ? "#ffffff" : "#fafbff" }}>

                      {/* Checkbox */}
                      <td className="px-4 py-3 w-10">
                        <Checkbox size="small" checked={checked} onChange={() => toggleOne(p.id)}
                          disabled={!tienePhone}
                          sx={{ p: 0, color: "#cbd5e1", "&.Mui-checked": { color: "#1565c0" } }} />
                      </td>

                      {/* Nombres y Apellidos */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: "#1565c0" }}>
                            {p.nombre_completo?.charAt(0) ?? "?"}
                          </div>
                          <span className="font-semibold text-gray-800">{p.nombre_completo}</span>
                        </div>
                      </td>

                      {/* Número de Contacto */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{tienePhone ? (p.telefono!.startsWith("+") ? p.telefono : `+51 ${p.telefono}`) : "—"}</span>
                      </td>

                      {/* Edad */}
                      <td className="px-4 py-3 text-center">
                        {edad !== null ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#ecfeff", color: "#0891b2" }}>
                            {edad}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Nacimiento */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{p.fecha_nacimiento || "—"}</span>
                      </td>

                      {/* Dirección */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="text-sm text-gray-600 truncate block">{p.direccion || "—"}</span>
                      </td>

                      {/* Comuna */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f0fdf4", color: "#166534" }}>
                          {p.comuna || "—"}
                        </span>
                      </td>

                      {/* Llamado */}
                      <td className="px-4 py-3">
                        <Tooltip title={p.fecha_llamada ? `Llamado el ${dayjs(p.fecha_llamada).format("DD/MM/YYYY HH:mm")}` : "Aún no ha sido llamado"}>
                          <span><LlamadoBadge llamado={p.llamado} /></span>
                        </Tooltip>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <Tooltip title={tienePhone ? "Enviar mensaje" : "Sin celular"}>
                          <span>
                            <IconButton size="small" onClick={() => openSendOne(p)} disabled={!tienePhone}
                              sx={{ background: tienePhone ? "rgba(21,101,192,0.08)" : "transparent",
                                "&:hover": { background: "rgba(21,101,192,0.18)" } }}>
                              <MessageIcon sx={{ fontSize: 16, color: tienePhone ? "#1565c0" : "#cbd5e1" }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtrados.length > 0 && (
          <TablePagination
            component="div"
            count={filtrados.length}
            page={page}
            onPageChange={(_, nuevaPagina) => setPage(nuevaPagina)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100, 250]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            sx={{ borderTop: "1px solid #e2e8f0", "& .MuiTablePagination-selectIcon": { color: "#64748b" } }}
          />
        )}

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <span>{!loading && `Mostrando ${filtrados.length} de ${data.length} registros`}</span>
          <span style={{ color: "#1565c0", fontWeight: 600 }}>Campaign Data Repository</span>
        </div>
      </div>

      <SendMessageModal open={modalOpen} onClose={() => setModalOpen(false)} contactos={modalContactos} />
      <SuccessToast open={!!successMsg} message={successMsg ?? ""} onClose={() => setSuccessMsg(null)} />
    </div>
  );
}
