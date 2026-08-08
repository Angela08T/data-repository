"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress, Checkbox, Button, TablePagination, Popover, Slider, Typography, Box } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { showConfirm, showError } from "@/lib/utils/swalConfig";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import MessageIcon from "@mui/icons-material/Message";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import PersonIcon from "@mui/icons-material/Person";
import CakeIcon from "@mui/icons-material/Cake";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SendMessageModal, { Contacto } from "@/components/messaging/SendMessageModal";
import SuccessToast from "@/components/feedback/SuccessToast";

dayjs.locale("es");

// fecha_nacimiento viene como texto: "DD/MM/YYYY" o, en algunos registros, "YYYY-MM-DD".
// Extraemos día/mes por posición (sin validar el año completo), porque hay registros
// con el año mal tipeado (ej. "29/12/19986") que aun así deben poder filtrarse por cumpleaños.
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

// A diferencia de cumpleEnFecha, para calcular la edad sí necesitamos un año válido
// (entre 1900 y el año actual). Si el año está corrupto (ej. "19986"), la edad
// queda como desconocida en vez de mostrar un número inventado.
function calcularEdad(fechaNacimiento: string): number | null {
  if (!fechaNacimiento) return null;
  const partes = fechaNacimiento.trim().split(/[/-]/);
  if (partes.length < 3) return null;

  const esFormatoConSlash = fechaNacimiento.includes("/"); // DD/MM/YYYY
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

const EDAD_MAX = 100;

interface Ciudadano {
  id: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  dni: string;
  fecha_nacimiento: string;
  sexo: string;
  lugar_nacimiento: string;
  region: string;
  provincia: string;
  distrito: string;
  direccion: string;
  direccion_completa?: string | null;
  telefono: string;
  comuna: string;
  email?: string | null;
  created_at?: string | null;
  registrador_nombres?: string | null;
  registrador_apellidos?: string | null;
  tipo_registro?: string | null;
  colegio_votacion?: string | null;
  numero_mesa?: string | null;
  encargado?: string | null;
  llamado?: boolean | null;
  fecha_llamada?: string | null;
}

function hasPhone(p: Ciudadano): boolean {
  return !!p.telefono && p.telefono !== "EMPTY";
}

function esPorRegistrador(p: Ciudadano): boolean {
  return !!p.tipo_registro && p.tipo_registro.toLowerCase() !== "directo";
}

function SexoBadge({ sexo }: { sexo?: string | null }) {
  const valor = sexo?.trim().toUpperCase();
  // La data de ciudadanos no siempre incluye el sexo real; si no es "M" ni "F"
  // no se debe adivinar (antes esto se mostraba como "Masculino" por defecto).
  if (valor !== "F" && valor !== "M") {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  const esMujer = valor === "F";
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={esMujer ? { background: "#fce7f3", color: "#9d174d" } : { background: "#dbeafe", color: "#1e40af" }}>
      {esMujer ? <FemaleIcon sx={{ fontSize: 13 }} /> : <MaleIcon sx={{ fontSize: 13 }} />}
      {esMujer ? "Femenino" : "Masculino"}
    </span>
  );
}

function RegistroBadge({ tipo }: { tipo?: string | null }) {
  const directo = !tipo || tipo.toLowerCase() === "directo";
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={directo
        ? { background: "#f0fdf4", color: "#166534" }
        : { background: "#fef3c7", color: "#92400e" }}>
      {directo ? <PersonIcon sx={{ fontSize: 12 }} /> : <HowToRegIcon sx={{ fontSize: 12 }} />}
      {directo ? "Directo" : "Registrador"}
    </span>
  );
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

export default function CiudadanosPage() {
  const [data, setData]           = useState<Ciudadano[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [filtroComuna, setFiltroComuna]           = useState<string>("todos");
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState<"todos" | "directo" | "registrador">("todos");
  const [filtroColegio, setFiltroColegio]         = useState<string>("todos");
  const [filtroEncargado, setFiltroEncargado]     = useState<string>("todos");
  const [filtroFechaCumple, setFiltroFechaCumple] = useState<Dayjs | null>(null);
  const [filtroLlamado, setFiltroLlamado]         = useState<"todos" | "llamados" | "pendientes">("todos");
  const [edadRange, setEdadRange]                 = useState<number[]>([0, EDAD_MAX]);
  const [edadRangeDraft, setEdadRangeDraft]       = useState<number[]>([0, EDAD_MAX]);
  const [edadAnchor, setEdadAnchor]               = useState<HTMLElement | null>(null);
  const [selectedIds, setSelectedIds]             = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen]                 = useState(false);
  const [modalContactos, setModalContactos]       = useState<Contacto[]>([]);
  const [successMsg, setSuccessMsg]               = useState<string | null>(null);
  const [page, setPage]                           = useState(0);
  const [rowsPerPage, setRowsPerPage]             = useState(25);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Supabase/PostgREST limita cada consulta a 1000 filas por defecto,
    // así que hay que traer la tabla completa paginando con .range().
    const PAGE_SIZE = 1000;
    const todos: Ciudadano[] = [];
    let from = 0;
    let hayError: string | null = null;

    while (true) {
      const { data: rows, error: err } = await supabase
        .from("ciudadanos")
        .select("*")
        .order("apellido_paterno", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (err) { hayError = err.message; break; }
      const lote = (rows as Ciudadano[]) ?? [];
      todos.push(...lote);
      // Si el servidor devuelve un lote vacío, ya no queda nada más por traer.
      // No asumimos que cada lote trae exactamente PAGE_SIZE filas: Supabase puede
      // recortar el tamaño de página por su cuenta, y si avanzáramos por PAGE_SIZE fijo
      // en vez de por lo que realmente llegó, se saltarían filas o se cortaría antes de tiempo.
      if (lote.length === 0) break;
      from += lote.length;
    }

    if (hayError) setError(hayError);
    else setData(todos);
    setLoading(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Comunas únicas para el dropdown
  const comunasUnicas = Array.from(
    new Set(data.map((p) => p.comuna?.trim()).filter(Boolean))
  ).sort() as string[];

  // Colegios únicos para el dropdown
  const colegiosUnicos = Array.from(
    new Set(data.map((p) => p.colegio_votacion?.trim()).filter(Boolean))
  ).sort() as string[];

  // Encargados únicos para el dropdown (quién recolectó cada registro)
  const encargadosUnicos = Array.from(
    new Set(data.map((p) => p.encargado?.trim()).filter(Boolean))
  ).sort() as string[];

  const isEdadFiltered = edadRange[0] > 0 || edadRange[1] < EDAD_MAX;

  const filtrados = data.filter((p) => {
    const nombreCompleto = `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.toLowerCase();
    const matchSearch =
      nombreCompleto.includes(search.toLowerCase()) ||
      (p.dni ?? "").includes(search) ||
      (p.distrito ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.comuna ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.registrador_nombres ?? "").toLowerCase().includes(search.toLowerCase());
    const matchComuna   = filtroComuna === "todos" || (p.comuna?.trim() ?? "") === filtroComuna;
    const matchColegio  = filtroColegio === "todos" || (p.colegio_votacion?.trim() ?? "") === filtroColegio;
    const matchTipo     = filtroTipoRegistro === "todos"
      ? true
      : filtroTipoRegistro === "directo"
        ? !esPorRegistrador(p)
        : esPorRegistrador(p);
    const matchCumple    = !filtroFechaCumple || cumpleEnFecha(p.fecha_nacimiento, filtroFechaCumple);
    const matchEncargado = filtroEncargado === "todos" || (p.encargado?.trim() ?? "") === filtroEncargado;
    const matchEdad       = (() => {
      if (!isEdadFiltered) return true;
      const edad = calcularEdad(p.fecha_nacimiento);
      if (edad === null) return false;
      return edad >= edadRange[0] && edad <= edadRange[1];
    })();
    const matchLlamado = filtroLlamado === "todos"
      ? true
      : filtroLlamado === "llamados"
        ? !!p.llamado
        : !p.llamado;
    return matchSearch && matchComuna && matchColegio && matchTipo && matchCumple && matchEncargado && matchEdad && matchLlamado;
  });

  useEffect(() => { setPage(0); }, [search, filtroComuna, filtroTipoRegistro, filtroColegio, filtroEncargado, filtroFechaCumple, filtroLlamado]);

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

  const openSendOne = (p: Ciudadano) => {
    if (!hasPhone(p)) return;
    setModalContactos([{ nombre: `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`, telefono: p.telefono }]);
    setModalOpen(true);
  };

  const openSendBulk = () => {
    const contactos = filtrados
      .filter((p) => selectedIds.has(p.id) && hasPhone(p))
      .map((p) => ({ nombre: `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`, telefono: p.telefono }));
    if (!contactos.length) return;
    setModalContactos(contactos);
    setModalOpen(true);
  };

  const totalMujeres      = data.filter((p) => p.sexo?.toUpperCase() === "F").length;
  const totalHombres      = data.filter((p) => p.sexo?.toUpperCase() === "M").length;
  const porRegistrador    = data.filter(esPorRegistrador).length;
  const selCount          = filtrados.filter((p) => selectedIds.has(p.id)).length;
  const COLS              = 18; // checkbox + cols + tipo + registrador + colegio + mesa + encargado + llamado + acciones

  const handleExport = async () => {
    const rows = filtrados.map((p) => ({
      "Apellido Paterno":      p.apellido_paterno ?? "",
      "Apellido Materno":      p.apellido_materno ?? "",
      "Nombres":               p.nombres ?? "",
      "DNI":                   p.dni ?? "",
      "Fecha Nacimiento":      p.fecha_nacimiento ?? "",
      "Edad":                  calcularEdad(p.fecha_nacimiento) ?? "",
      "Sexo":                  p.sexo?.trim().toUpperCase() === "F" ? "Femenino" : p.sexo?.trim().toUpperCase() === "M" ? "Masculino" : "",
      "Lugar Nacimiento":      p.lugar_nacimiento ?? "",
      "Región":                p.region ?? "",
      "Provincia":             p.provincia ?? "",
      "Distrito":              p.distrito ?? "",
      "Dirección":             p.direccion ?? "",
      "Dirección Completa":    p.direccion_completa ?? "",
      "Teléfono":              hasPhone(p) ? (p.telefono.startsWith("+") ? p.telefono : `+51 ${p.telefono}`) : "",
      "Comuna":                p.comuna ?? "",
      "Email":                 p.email ?? "",
      "Tipo de Registro":      p.tipo_registro ?? "directo",
      "Registrador Nombres":   p.registrador_nombres ?? "",
      "Registrador Apellidos": p.registrador_apellidos ?? "",
      "Colegio de Votación":   p.colegio_votacion ?? "",
      "N° de Mesa":            p.numero_mesa ?? "",
      "Encargado":             p.encargado ?? "",
      "Llamado":               p.llamado ? "Sí" : "No",
    }));
    exportToExcel(rows, `Ciudadanos_${new Date().toISOString().slice(0, 10)}`, "Ciudadanos");

    // Si la descarga se hizo con el filtro de cumpleaños activo, es la lista que se
    // entrega a callcenter: se ofrece marcar a esos contactos como "llamados".
    if (filtroFechaCumple && filtrados.length > 0) {
      const result = await showConfirm(
        "¿Marcar como llamados?",
        `Vas a descargar ${filtrados.length} contacto${filtrados.length !== 1 ? "s" : ""} filtrado${filtrados.length !== 1 ? "s" : ""} por cumpleaños. ¿Deseas marcarlos como "Llamados" para el callcenter?`
      );
      if (result.isConfirmed) {
        const ids = filtrados.map((p) => p.id);
        const ahora = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("ciudadanos")
          .update({ llamado: true, fecha_llamada: ahora })
          .in("id", ids);

        if (updateError) {
          showError("No se pudo actualizar", updateError.message);
        } else {
          setData((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, llamado: true, fecha_llamada: ahora } : p)));
          setSuccessMsg(`${ids.length} contacto${ids.length !== 1 ? "s" : ""} marcado${ids.length !== 1 ? "s" : ""} como llamado${ids.length !== 1 ? "s" : ""}.`);
        }
      }
    }
  };

  const hayFiltrosActivos = filtroComuna !== "todos" || filtroTipoRegistro !== "todos" || filtroColegio !== "todos" || filtroEncargado !== "todos" || filtroLlamado !== "todos" || !!filtroFechaCumple || isEdadFiltered;

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Ciudadanos</h1>
        <p className="text-sm text-gray-400 mt-1">Padrón general de ciudadanos registrados</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total ciudadanos"  value={data.length}      icon={<PeopleIcon />}    color="#1565c0" />
        <StatCard label="Mujeres"           value={totalMujeres}     icon={<FemaleIcon />}    color="#9d174d" />
        <StatCard label="Hombres"           value={totalHombres}     icon={<MaleIcon />}      color="#1e40af" />
        <StatCard label="Por registrador"   value={porRegistrador}   icon={<HowToRegIcon />}  color="#d97706" />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        {/* Toolbar principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <TextField
            size="small"
            placeholder="Buscar por nombre, DNI, distrito, comuna o registrador..."
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
            <Tooltip title="Exportar Excel">
              <IconButton size="small" onClick={handleExport} disabled={loading || filtrados.length === 0}>
                <FileDownloadIcon sx={{ fontSize: 18, color: filtrados.length > 0 ? "#1565c0" : "#94a3b8" }} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Barra de filtros: Tipo de registro + Comuna */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100" style={{ background: "#fafbff" }}>

          {/* Filtro tipo de registro */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Registro:</span>
            {([
              { value: "todos",       label: "Todos" },
              { value: "directo",     label: "Directo" },
              { value: "registrador", label: "Por registrador" },
            ] as const).map((f) => (
              <button key={f.value} onClick={() => setFiltroTipoRegistro(f.value)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={filtroTipoRegistro === f.value
                  ? { background: "#d97706", color: "#fff", borderColor: "#d97706" }
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
              {comunasUnicas.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />

          {/* Filtro Colegio */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Colegio:</span>
            <select
              value={filtroColegio}
              onChange={(e) => setFiltroColegio(e.target.value)}
              className="text-xs border rounded-full px-3 py-1.5 outline-none cursor-pointer font-semibold transition-all"
              style={{
                borderColor: filtroColegio !== "todos" ? "#7c3aed" : "#e2e8f0",
                color: filtroColegio !== "todos" ? "#7c3aed" : "#64748b",
                background: filtroColegio !== "todos" ? "#f5f3ff" : "#fff",
                fontFamily: "'Poppins', sans-serif",
                maxWidth: 220,
              }}
            >
              <option value="todos">Todos</option>
              {colegiosUnicos.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />

          {/* Filtro Encargado (quién recolectó la data) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Encargado:</span>
            <select
              value={filtroEncargado}
              onChange={(e) => setFiltroEncargado(e.target.value)}
              className="text-xs border rounded-full px-3 py-1.5 outline-none cursor-pointer font-semibold transition-all"
              style={{
                borderColor: filtroEncargado !== "todos" ? "#0f766e" : "#e2e8f0",
                color: filtroEncargado !== "todos" ? "#0f766e" : "#64748b",
                background: filtroEncargado !== "todos" ? "#f0fdfa" : "#fff",
                fontFamily: "'Poppins', sans-serif",
                maxWidth: 200,
              }}
            >
              <option value="todos">Todos</option>
              {encargadosUnicos.map((e) => (
                <option key={e} value={e}>{e}</option>
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
                Calculada a partir de la fecha de nacimiento
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

          {/* Limpiar */}
          {hayFiltrosActivos && (
            <button
              onClick={() => { setFiltroComuna("todos"); setFiltroTipoRegistro("todos"); setFiltroColegio("todos"); setFiltroEncargado("todos"); setFiltroFechaCumple(null); setFiltroLlamado("todos"); setEdadRange([0, EDAD_MAX]); setEdadRangeDraft([0, EDAD_MAX]); }}
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
                {["Apellidos y Nombres", "DNI", "Nacimiento", "Edad", "Sexo", "Distrito", "Dirección", "Dirección Completa", "Teléfono", "Comuna", "Tipo", "Registrador", "Colegio de Votación", "N° Mesa", "Encargado", "Llamado", ""].map((h) => (
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
                  const checked     = selectedIds.has(p.id);
                  const tienePhone  = hasPhone(p);
                  const registrador = esPorRegistrador(p);
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

                      {/* Nombre */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: p.sexo?.trim().toUpperCase() === "F" ? "#9d174d" : p.sexo?.trim().toUpperCase() === "M" ? "#1565c0" : "#94a3b8" }}>
                            {p.nombres?.charAt(0) ?? "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{p.apellido_paterno} {p.apellido_materno}</p>
                            <p className="text-xs text-gray-400">{p.nombres}</p>
                          </div>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-gray-700">{p.dni || "—"}</span>
                      </td>

                      {/* Nacimiento */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{p.fecha_nacimiento || "—"}</span>
                      </td>

                      {/* Edad */}
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const edad = calcularEdad(p.fecha_nacimiento);
                          return edad !== null ? (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#ecfeff", color: "#0891b2" }}>
                              {edad}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          );
                        })()}
                      </td>

                      {/* Sexo */}
                      <td className="px-4 py-3">
                        <SexoBadge sexo={p.sexo} />
                      </td>

                      {/* Distrito */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700">{p.distrito || "—"}</span>
                          <span className="text-xs text-gray-400">{p.region}</span>
                        </div>
                      </td>

                      {/* Dirección */}
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-sm text-gray-600 truncate block">{p.direccion || "—"}</span>
                      </td>

                      {/* Dirección Completa */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-sm text-gray-600 truncate block" title={p.direccion_completa ?? ""}>{p.direccion_completa || "—"}</span>
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{tienePhone ? (p.telefono.startsWith("+") ? p.telefono : `+51 ${p.telefono}`) : "—"}</span>
                      </td>

                      {/* Comuna */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f0fdf4", color: "#166534" }}>
                          {p.comuna || "—"}
                        </span>
                      </td>

                      {/* Tipo de registro */}
                      <td className="px-4 py-3">
                        <RegistroBadge tipo={p.tipo_registro} />
                      </td>

                      {/* Registrador */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {registrador && (p.registrador_nombres || p.registrador_apellidos) ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-700">
                              {p.registrador_nombres} {p.registrador_apellidos}
                            </span>
                            <span className="text-xs text-gray-400">Registrador</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Colegio de votación */}
                      <td className="px-4 py-3 max-w-[180px]">
                        {p.colegio_votacion ? (
                          <span className="text-xs text-gray-700 block truncate" title={p.colegio_votacion}>{p.colegio_votacion}</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* N° de Mesa */}
                      <td className="px-4 py-3 text-center">
                        {p.numero_mesa ? (
                          <span className="inline-block px-2 py-0.5 rounded font-mono text-xs font-bold"
                            style={{ background: "#eff6ff", color: "#1565c0" }}>
                            {p.numero_mesa}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Encargado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.encargado ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f0fdfa", color: "#0f766e" }}>
                            {p.encargado}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Llamado */}
                      <td className="px-4 py-3">
                        <Tooltip title={p.fecha_llamada ? `Llamado el ${dayjs(p.fecha_llamada).format("DD/MM/YYYY HH:mm")}` : "Aún no ha sido llamado"}>
                          <span><LlamadoBadge llamado={p.llamado} /></span>
                        </Tooltip>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <Tooltip title={tienePhone ? "Enviar mensaje" : "Sin teléfono"}>
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
