"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress, Checkbox, Button, TablePagination, Popover, Typography, Box } from "@mui/material";
import dayjs from "dayjs";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { showError } from "@/lib/utils/swalConfig";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import GroupsIcon from "@mui/icons-material/Groups";
import BusinessIcon from "@mui/icons-material/Business";
import MessageIcon from "@mui/icons-material/Message";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SendMessageModal, { Contacto } from "@/components/messaging/SendMessageModal";
import SuccessToast from "@/components/feedback/SuccessToast";

interface Dirigente {
  id: string;
  comuna: string;
  promotor: string;
  numero?: string | null;
  nombre: string;
  apellido: string;
  organizacion?: string | null;
  celular?: string | null;
  llamado?: boolean | null;
  fecha_llamada?: string | null;
  created_at?: string | null;
}

function hasPhone(d: Dirigente): boolean {
  return !!d.celular && d.celular !== "EMPTY";
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

export default function DirigentesPage() {
  const [data, setData]         = useState<Dirigente[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [filtroComuna, setFiltroComuna]     = useState<string>("todos");
  const [filtroPromotor, setFiltroPromotor] = useState<string>("todos");
  const [filtroLlamado, setFiltroLlamado]   = useState<"todos" | "llamados" | "pendientes">("todos");
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalContactos, setModalContactos] = useState<Contacto[]>([]);
  const [page, setPage]                     = useState(0);
  const [rowsPerPage, setRowsPerPage]       = useState(25);
  const [exportAnchor, setExportAnchor]     = useState<HTMLElement | null>(null);
  const [cantidadDescarga, setCantidadDescarga] = useState<string>("");
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Supabase/PostgREST limita cada consulta; se pagina con .range() hasta traer todo.
    const PAGE_SIZE = 1000;
    const todos: Dirigente[] = [];
    let from = 0;
    let hayError: string | null = null;

    while (true) {
      const { data: rows, error: err } = await supabase
        .from("dirigentes")
        .select("*")
        .order("comuna", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (err) { hayError = err.message; break; }
      const lote = (rows as Dirigente[]) ?? [];
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

  // Comunas únicas para el dropdown
  const comunasUnicas = Array.from(
    new Set(data.map((d) => d.comuna?.trim()).filter(Boolean))
  ).sort() as string[];

  // Promotores únicos para el dropdown
  const promotoresUnicos = Array.from(
    new Set(data.map((d) => d.promotor?.trim()).filter(Boolean))
  ).sort() as string[];

  const filtrados = data.filter((d) => {
    const nombreCompleto = `${d.nombre} ${d.apellido}`.toLowerCase();
    const matchSearch =
      nombreCompleto.includes(search.toLowerCase()) ||
      (d.organizacion ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.comuna ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.promotor ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.celular ?? "").includes(search);
    const matchComuna   = filtroComuna === "todos" || (d.comuna?.trim() ?? "") === filtroComuna;
    const matchPromotor = filtroPromotor === "todos" || (d.promotor?.trim() ?? "") === filtroPromotor;
    const matchLlamado  = filtroLlamado === "todos"
      ? true
      : filtroLlamado === "llamados"
        ? !!d.llamado
        : !d.llamado;
    return matchSearch && matchComuna && matchPromotor && matchLlamado;
  });

  useEffect(() => { setPage(0); }, [search, filtroComuna, filtroPromotor, filtroLlamado]);

  const paginados = filtrados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Selección (aplica solo a la página visible)
  const conTelefono = paginados.filter(hasPhone);
  const allChecked  = conTelefono.length > 0 && conTelefono.every((d) => selectedIds.has(d.id));
  const someChecked = paginados.some((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(conTelefono.map((d) => d.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSendOne = (d: Dirigente) => {
    if (!hasPhone(d)) return;
    setModalContactos([{ nombre: `${d.nombre} ${d.apellido}`, telefono: d.celular! }]);
    setModalOpen(true);
  };

  const openSendBulk = () => {
    const contactos = filtrados
      .filter((d) => selectedIds.has(d.id) && hasPhone(d))
      .map((d) => ({ nombre: `${d.nombre} ${d.apellido}`, telefono: d.celular! }));
    if (!contactos.length) return;
    setModalContactos(contactos);
    setModalOpen(true);
  };

  const totalOrganizaciones = new Set(data.map((d) => d.organizacion?.trim()).filter(Boolean)).size;
  const totalLlamados       = data.filter((d) => d.llamado).length;
  const selCount             = filtrados.filter((d) => selectedIds.has(d.id)).length;
  const COLS                 = 9; // checkbox + comuna + promotor + n° + nombre + apellido + organización + celular + llamado + acciones

  // Solo se puede descargar/marcar en lote a quienes aún están pendientes
  // (respetando los demás filtros activos: búsqueda, comuna, promotor).
  const pendientesDisponibles = filtrados.filter((d) => !d.llamado);

  const abrirExportar = (e: React.MouseEvent<HTMLElement>) => {
    setCantidadDescarga(String(pendientesDisponibles.length));
    setExportAnchor(e.currentTarget);
  };

  const confirmarExportar = async () => {
    const max = pendientesDisponibles.length;
    const n = Math.max(1, Math.min(parseInt(cantidadDescarga, 10) || 0, max));
    if (n <= 0) return;

    const lote = pendientesDisponibles.slice(0, n);
    const rows = lote.map((d) => ({
      "Comuna":       d.comuna ?? "",
      "Promotor":     d.promotor ?? "",
      "N°":           d.numero ?? "",
      "Nombre":       d.nombre ?? "",
      "Apellido":     d.apellido ?? "",
      "Organización": d.organizacion ?? "",
      "Celular":      hasPhone(d) ? (d.celular!.startsWith("+") ? d.celular : `+51 ${d.celular}`) : "",
    }));
    exportToExcel(rows, `Dirigentes_Lote_${new Date().toISOString().slice(0, 10)}`, "Dirigentes");
    setExportAnchor(null);

    const ids = lote.map((d) => d.id);
    const ahora = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("dirigentes")
      .update({ llamado: true, fecha_llamada: ahora })
      .in("id", ids);

    if (updateError) {
      showError("No se pudo actualizar", updateError.message);
    } else {
      setData((prev) => prev.map((d) => (ids.includes(d.id) ? { ...d, llamado: true, fecha_llamada: ahora } : d)));
      setSuccessMsg(`${ids.length} contacto${ids.length !== 1 ? "s" : ""} descargado${ids.length !== 1 ? "s" : ""} y marcado${ids.length !== 1 ? "s" : ""} como llamado${ids.length !== 1 ? "s" : ""}.`);
    }
  };

  const hayFiltrosActivos = filtroComuna !== "todos" || filtroPromotor !== "todos" || filtroLlamado !== "todos";

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Dirigentes</h1>
        <p className="text-sm text-gray-400 mt-1">Registro de dirigentes y promotores por comuna</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total dirigentes"   value={data.length}            icon={<AssignmentIndIcon />} color="#1565c0" />
        <StatCard label="Promotores"         value={promotoresUnicos.length} icon={<GroupsIcon />}        color="#d97706" />
        <StatCard label="Organizaciones"     value={totalOrganizaciones}     icon={<BusinessIcon />}      color="#166534" />
        <StatCard label="Llamados"           value={totalLlamados}           icon={<PhoneInTalkIcon />}   color="#166534" />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        {/* Toolbar principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <TextField
            size="small"
            placeholder="Buscar por nombre, apellido, comuna, promotor u organización..."
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

        {/* Barra de filtros: Comuna + Promotor */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100" style={{ background: "#fafbff" }}>

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

          {/* Filtro Promotor */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Promotor:</span>
            <select
              value={filtroPromotor}
              onChange={(e) => setFiltroPromotor(e.target.value)}
              className="text-xs border rounded-full px-3 py-1.5 outline-none cursor-pointer font-semibold transition-all"
              style={{
                borderColor: filtroPromotor !== "todos" ? "#d97706" : "#e2e8f0",
                color: filtroPromotor !== "todos" ? "#d97706" : "#64748b",
                background: filtroPromotor !== "todos" ? "#fffbeb" : "#fff",
                fontFamily: "'Poppins', sans-serif",
                maxWidth: 220,
              }}
            >
              <option value="todos">Todos</option>
              {promotoresUnicos.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
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

          {/* Limpiar */}
          {hayFiltrosActivos && (
            <button
              onClick={() => { setFiltroComuna("todos"); setFiltroPromotor("todos"); setFiltroLlamado("todos"); }}
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
                {["Comuna", "Promotor", "N°", "Nombre", "Apellido", "Organización", "Celular", "Llamado", ""].map((h) => (
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
                paginados.map((d, i) => {
                  const checked    = selectedIds.has(d.id);
                  const tienePhone = hasPhone(d);
                  return (
                    <tr key={d.id}
                      className="table-row-animate border-t border-gray-50 hover:bg-blue-50 transition-colors"
                      style={{ background: checked ? "#eff6ff" : i % 2 === 0 ? "#ffffff" : "#fafbff" }}>

                      {/* Checkbox */}
                      <td className="px-4 py-3 w-10">
                        <Checkbox size="small" checked={checked} onChange={() => toggleOne(d.id)}
                          disabled={!tienePhone}
                          sx={{ p: 0, color: "#cbd5e1", "&.Mui-checked": { color: "#1565c0" } }} />
                      </td>

                      {/* Comuna */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f0fdf4", color: "#166534" }}>
                          {d.comuna || "—"}
                        </span>
                      </td>

                      {/* Promotor */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#fffbeb", color: "#92400e" }}>
                          {d.promotor || "—"}
                        </span>
                      </td>

                      {/* N° */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-sm text-gray-600">{d.numero || "—"}</span>
                      </td>

                      {/* Nombre */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: "#1565c0" }}>
                            {d.nombre?.charAt(0) ?? "?"}
                          </div>
                          <span className="font-semibold text-gray-800">{d.nombre}</span>
                        </div>
                      </td>

                      {/* Apellido */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{d.apellido || "—"}</span>
                      </td>

                      {/* Organización */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-sm text-gray-600 truncate block" title={d.organizacion ?? ""}>{d.organizacion || "—"}</span>
                      </td>

                      {/* Celular */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{tienePhone ? (d.celular!.startsWith("+") ? d.celular : `+51 ${d.celular}`) : "—"}</span>
                      </td>

                      {/* Llamado */}
                      <td className="px-4 py-3">
                        <Tooltip title={d.fecha_llamada ? `Llamado el ${dayjs(d.fecha_llamada).format("DD/MM/YYYY HH:mm")}` : "Aún no ha sido llamado"}>
                          <span><LlamadoBadge llamado={d.llamado} /></span>
                        </Tooltip>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <Tooltip title={tienePhone ? "Enviar mensaje" : "Sin celular"}>
                          <span>
                            <IconButton size="small" onClick={() => openSendOne(d)} disabled={!tienePhone}
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
