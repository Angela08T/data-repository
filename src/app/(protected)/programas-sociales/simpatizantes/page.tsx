"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress, Checkbox, Button } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MessageIcon from "@mui/icons-material/Message";
import BadgeIcon from "@mui/icons-material/Badge";
import SendMessageModal, { Contacto } from "@/components/messaging/SendMessageModal";

interface Simpatizante {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string;
  dni: string | null;
  created_at: string;
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora  = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
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

export default function SimpatizantesPage() {
  const [data, setData]           = useState<Simpatizante[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalContactos, setModalContactos] = useState<Contacto[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("simpatizantes")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setData((rows as Simpatizante[]) ?? []);
    setLoading(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtrados = data.filter((s) => {
    const texto = `${s.nombre} ${s.apellidos ?? ""} ${s.telefono} ${s.dni ?? ""}`.toLowerCase();
    return texto.includes(search.toLowerCase());
  });

  // Selección
  const allChecked = filtrados.length > 0 && filtrados.every((s) => selectedIds.has(s.id));
  const someChecked = filtrados.some((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtrados.filter((s) => s.telefono).map((s) => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSendOne = (s: Simpatizante) => {
    if (!s.telefono) return;
    setModalContactos([{ nombre: `${s.nombre} ${s.apellidos}`, telefono: s.telefono }]);
    setModalOpen(true);
  };

  const openSendBulk = () => {
    const contactos = filtrados
      .filter((s) => selectedIds.has(s.id) && s.telefono)
      .map((s) => ({ nombre: `${s.nombre} ${s.apellidos}`, telefono: s.telefono }));
    if (!contactos.length) return;
    setModalContactos(contactos);
    setModalOpen(true);
  };

  const handleExport = () => {
    const rows = filtrados.map((s) => {
      const { fecha, hora } = formatFecha(s.created_at);
      return {
        "Nombre":            s.nombre ?? "",
        "Apellidos":         s.apellidos ?? "",
        "DNI":               s.dni ?? "",
        "Teléfono":          s.telefono ?? "",
        "Fecha de Registro": fecha,
        "Hora":              hora,
      };
    });
    exportToExcel(rows, `Simpatizantes_${new Date().toISOString().slice(0, 10)}`, "Simpatizantes");
  };

  const hoy = new Date().toLocaleDateString("es-PE");
  const hoy_count = data.filter((s) => new Date(s.created_at).toLocaleDateString("es-PE") === hoy).length;
  const selCount = filtrados.filter((s) => selectedIds.has(s.id)).length;

  const COLS = 6; // checkbox + nombre + dni + teléfono + fecha + acciones

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Simpatizantes</h1>
        <p className="text-sm text-gray-400 mt-1">Personas registradas como simpatizantes de la campaña</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total simpatizantes" value={data.length}                              icon={<PeopleIcon />}    color="#1565c0" />
        <StatCard label="Registrados hoy"     value={hoy_count}                               icon={<PersonAddIcon />} color="#16a34a" />
        <StatCard label="Con teléfono"        value={data.filter(s => s.telefono).length}     icon={<PhoneIcon />}     color="#0d47a1" />
        <StatCard label="Con DNI"             value={data.filter(s => s.dni).length}          icon={<BadgeIcon />}     color="#7c3aed" />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <TextField
            size="small"
            placeholder="Buscar por nombre, apellidos, DNI o teléfono..."
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

            {/* Botón envío masivo */}
            {selCount > 0 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<MessageIcon sx={{ fontSize: 16 }} />}
                onClick={openSendBulk}
                sx={{
                  borderRadius: "10px", textTransform: "none", fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif", fontSize: "0.75rem",
                  background: "linear-gradient(135deg, #1565c0, #1976d2)",
                  boxShadow: "0 4px 12px rgba(21,101,192,0.35)",
                  "&:hover": { background: "linear-gradient(135deg, #0d47a1, #1565c0)" },
                }}
              >
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
                {/* Checkbox select-all */}
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    size="small"
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={toggleSelectAll}
                    disabled={loading || filtrados.every((s) => !s.telefono)}
                    sx={{ p: 0, color: "#cbd5e1", "&.Mui-checked": { color: "#1565c0" }, "&.MuiCheckbox-indeterminate": { color: "#1565c0" } }}
                  />
                </th>
                {["Nombre y Apellidos", "DNI", "Teléfono", "Fecha de registro", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "#64748b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLS} className="text-center py-16">
                    <CircularProgress size={28} sx={{ color: "#1565c0" }} />
                    <p className="text-gray-400 text-sm mt-3">Cargando registros...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLS} className="text-center py-16 text-red-400 text-sm">
                    Error al cargar datos: {error}
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={COLS} className="text-center py-16 text-gray-400 text-sm">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                filtrados.map((s, i) => {
                  const { fecha, hora } = formatFecha(s.created_at);
                  const checked = selectedIds.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      className="table-row-animate border-t border-gray-50 hover:bg-blue-50 transition-colors"
                      style={{ background: checked ? "#eff6ff" : i % 2 === 0 ? "#ffffff" : "#fafbff" }}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 w-10">
                        <Checkbox
                          size="small"
                          checked={checked}
                          onChange={() => toggleOne(s.id)}
                          disabled={!s.telefono}
                          sx={{ p: 0, color: "#cbd5e1", "&.Mui-checked": { color: "#1565c0" } }}
                        />
                      </td>

                      {/* Nombre */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: "#1565c0" }}
                          >
                            {s.nombre?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <p className="font-semibold text-gray-800">{s.nombre} {s.apellidos}</p>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="px-5 py-4">
                        {s.dni ? (
                          <span className="font-mono text-sm font-medium text-gray-700">{s.dni}</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Teléfono */}
                      <td className="px-5 py-4">
                        {s.telefono ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <PhoneIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                            {s.telefono}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700">{fecha}</span>
                          <span className="text-xs text-gray-400">{hora}</span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-4">
                        <Tooltip title={s.telefono ? "Enviar mensaje" : "Sin teléfono"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openSendOne(s)}
                              disabled={!s.telefono}
                              sx={{
                                background: s.telefono ? "rgba(21,101,192,0.08)" : "transparent",
                                "&:hover": { background: "rgba(21,101,192,0.18)" },
                              }}
                            >
                              <MessageIcon sx={{ fontSize: 16, color: s.telefono ? "#1565c0" : "#cbd5e1" }} />
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

      <SendMessageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contactos={modalContactos}
      />
    </div>
  );
}
