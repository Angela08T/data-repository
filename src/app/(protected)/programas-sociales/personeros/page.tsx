"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress, Checkbox, Button } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import MessageIcon from "@mui/icons-material/Message";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import PersonIcon from "@mui/icons-material/Person";
import SendMessageModal, { Contacto } from "@/components/messaging/SendMessageModal";

interface Personero {
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
  telefono: string;
  comuna: string;
  email?: string | null;
  created_at?: string | null;
  registrador_nombres?: string | null;
  registrador_apellidos?: string | null;
  tipo_registro?: string | null;
  colegio?: string | null;
  numero_mesa?: string | null;
}

function hasPhone(p: Personero): boolean {
  return !!p.telefono && p.telefono !== "EMPTY";
}

function esPorRegistrador(p: Personero): boolean {
  return !!p.tipo_registro && p.tipo_registro.toLowerCase() !== "directo";
}

function SexoBadge({ sexo }: { sexo: string }) {
  const esMujer = sexo?.toUpperCase() === "F";
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

export default function PersonerosPage() {
  const [data, setData]           = useState<Personero[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [filtroSexo, setFiltroSexo]               = useState<"todos" | "M" | "F">("todos");
  const [filtroComuna, setFiltroComuna]           = useState<string>("todos");
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState<"todos" | "directo" | "registrador">("todos");
  const [filtroColegio, setFiltroColegio]         = useState<string>("todos");
  const [selectedIds, setSelectedIds]             = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen]                 = useState(false);
  const [modalContactos, setModalContactos]       = useState<Contacto[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("personeros")
      .select("*")
      .order("apellido_paterno", { ascending: true });
    if (err) setError(err.message);
    else setData((rows as Personero[]) ?? []);
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
    new Set(data.map((p) => p.colegio?.trim()).filter(Boolean))
  ).sort() as string[];

  const filtrados = data.filter((p) => {
    const nombreCompleto = `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.toLowerCase();
    const matchSearch =
      nombreCompleto.includes(search.toLowerCase()) ||
      (p.dni ?? "").includes(search) ||
      (p.distrito ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.comuna ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.registrador_nombres ?? "").toLowerCase().includes(search.toLowerCase());
    const matchSexo     = filtroSexo === "todos" || p.sexo?.toUpperCase() === filtroSexo;
    const matchComuna   = filtroComuna === "todos" || (p.comuna?.trim() ?? "") === filtroComuna;
    const matchColegio  = filtroColegio === "todos" || (p.colegio?.trim() ?? "") === filtroColegio;
    const matchTipo     = filtroTipoRegistro === "todos"
      ? true
      : filtroTipoRegistro === "directo"
        ? !esPorRegistrador(p)
        : esPorRegistrador(p);
    return matchSearch && matchSexo && matchComuna && matchColegio && matchTipo;
  });

  // Selección
  const conTelefono = filtrados.filter(hasPhone);
  const allChecked  = conTelefono.length > 0 && conTelefono.every((p) => selectedIds.has(p.id));
  const someChecked = filtrados.some((p) => selectedIds.has(p.id));

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

  const openSendOne = (p: Personero) => {
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
  const COLS              = 14; // checkbox + cols + tipo + registrador + colegio + mesa + acciones

  const handleExport = () => {
    const rows = filtrados.map((p) => ({
      "Apellido Paterno":      p.apellido_paterno ?? "",
      "Apellido Materno":      p.apellido_materno ?? "",
      "Nombres":               p.nombres ?? "",
      "DNI":                   p.dni ?? "",
      "Fecha Nacimiento":      p.fecha_nacimiento ?? "",
      "Sexo":                  p.sexo?.toUpperCase() === "F" ? "Femenino" : "Masculino",
      "Lugar Nacimiento":      p.lugar_nacimiento ?? "",
      "Región":                p.region ?? "",
      "Provincia":             p.provincia ?? "",
      "Distrito":              p.distrito ?? "",
      "Dirección":             p.direccion ?? "",
      "Teléfono":              hasPhone(p) ? (p.telefono.startsWith("+") ? p.telefono : `+51 ${p.telefono}`) : "",
      "Comuna":                p.comuna ?? "",
      "Email":                 p.email ?? "",
      "Tipo de Registro":      p.tipo_registro ?? "directo",
      "Registrador Nombres":   p.registrador_nombres ?? "",
      "Registrador Apellidos": p.registrador_apellidos ?? "",
      "Colegio de Votación":   p.colegio ?? "",
      "N° de Mesa":            p.numero_mesa ?? "",
    }));
    exportToExcel(rows, `Personeros_${new Date().toISOString().slice(0, 10)}`, "Personeros");
  };

  const hayFiltrosActivos = filtroComuna !== "todos" || filtroTipoRegistro !== "todos" || filtroColegio !== "todos";

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Personeros</h1>
        <p className="text-sm text-gray-400 mt-1">Registro de personeros inscritos en la campaña</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total personeros"  value={data.length}      icon={<PeopleIcon />}    color="#1565c0" />
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
            {([
              { value: "todos", label: "Todos" },
              { value: "F",     label: "Femenino" },
              { value: "M",     label: "Masculino" },
            ] as const).map((f) => (
              <button key={f.value} onClick={() => setFiltroSexo(f.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={filtroSexo === f.value
                  ? { background: "#1565c0", color: "#fff", borderColor: "#1565c0" }
                  : { background: "transparent", color: "#64748b", borderColor: "#e2e8f0" }}>
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

          {/* Limpiar */}
          {hayFiltrosActivos && (
            <button
              onClick={() => { setFiltroComuna("todos"); setFiltroTipoRegistro("todos"); setFiltroColegio("todos"); }}
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
                {["Apellidos y Nombres", "DNI", "Nacimiento", "Sexo", "Distrito", "Dirección", "Teléfono", "Comuna", "Tipo", "Registrador", "Colegio de Votación", "N° Mesa", ""].map((h) => (
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
                filtrados.map((p, i) => {
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
                            style={{ background: p.sexo?.toUpperCase() === "F" ? "#9d174d" : "#1565c0" }}>
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
                        {p.colegio ? (
                          <span className="text-xs text-gray-700 block truncate" title={p.colegio}>{p.colegio}</span>
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

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <span>{!loading && `Mostrando ${filtrados.length} de ${data.length} registros`}</span>
          <span style={{ color: "#1565c0", fontWeight: 600 }}>Campaign Data Repository</span>
        </div>
      </div>

      <SendMessageModal open={modalOpen} onClose={() => setModalOpen(false)} contactos={modalContactos} />
    </div>
  );
}
