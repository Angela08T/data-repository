"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress, MenuItem } from "@mui/material";
import dayjs from "dayjs";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { MOTIVOS_ELIMINACION, motivoInfo } from "@/lib/motivosEliminacion";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonIcon from "@mui/icons-material/Person";
import HowToRegIcon from "@mui/icons-material/HowToReg";

interface PersoneroEliminado {
  id: string;
  personero_id: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  nombres: string | null;
  dni: string | null;
  telefono: string | null;
  comuna: string | null;
  distrito: string | null;
  colegio_votacion: string | null;
  numero_mesa: string | null;
  tipo_registro: string | null;
  registrador_nombres: string | null;
  registrador_apellidos: string | null;
  resultado_llamada: string | null;
  motivo_eliminacion: string;
  eliminado_por: string | null;
  eliminado_en: string;
}

function esPorRegistrador(tipo?: string | null): boolean {
  return !!tipo && tipo.toLowerCase() !== "directo";
}

function RegistroBadge({ tipo }: { tipo?: string | null }) {
  const directo = !esPorRegistrador(tipo);
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={directo ? { background: "#f0fdf4", color: "#166534" } : { background: "#fef3c7", color: "#92400e" }}>
      {directo ? <PersonIcon sx={{ fontSize: 12 }} /> : <HowToRegIcon sx={{ fontSize: 12 }} />}
      {directo ? "Directo" : "Registrador"}
    </span>
  );
}

function MotivoBadge({ motivo }: { motivo: string }) {
  const info = motivoInfo(motivo);
  return (
    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${info.color}22`, color: info.color }}>
      {info.label}
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

export default function PersonerosEliminadosPage() {
  const [data, setData] = useState<PersoneroEliminado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("todos");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const PAGE_SIZE = 1000;
    const todos: PersoneroEliminado[] = [];
    let from = 0;
    let hayError: string | null = null;

    while (true) {
      const { data: rows, error: err } = await supabase
        .from("personeros_eliminados")
        .select("*")
        .order("eliminado_en", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (err) { hayError = err.message; break; }
      const lote = (rows as PersoneroEliminado[]) ?? [];
      todos.push(...lote);
      if (lote.length === 0) break;
      from += lote.length;
    }

    if (hayError) setError(hayError);
    else setData(todos);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtrados = data.filter((p) => {
    if (filtroMotivo !== "todos" && p.motivo_eliminacion !== filtroMotivo) return false;
    if (!search.trim()) return true;
    const texto = `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno} ${p.dni} ${p.eliminado_por}`.toLowerCase();
    return texto.includes(search.toLowerCase());
  });

  const handleExport = () => {
    const rows = filtrados.map((p) => ({
      "Apellidos y Nombres": `${p.apellido_paterno ?? ""} ${p.apellido_materno ?? ""} ${p.nombres ?? ""}`.trim(),
      "DNI": p.dni ?? "",
      "Teléfono": p.telefono ?? "",
      "Comuna": p.comuna ?? "",
      "Distrito": p.distrito ?? "",
      "Colegio de Votación": p.colegio_votacion ?? "",
      "N° de Mesa": p.numero_mesa ?? "",
      "Tipo de Registro": esPorRegistrador(p.tipo_registro) ? "Registrador" : "Directo",
      "Registrador": `${p.registrador_nombres ?? ""} ${p.registrador_apellidos ?? ""}`.trim(),
      "Resultado de Llamada": p.resultado_llamada ?? "",
      "Motivo de Eliminación": motivoInfo(p.motivo_eliminacion).label,
      "Eliminado Por": p.eliminado_por ?? "",
      "Fecha y Hora de Eliminación": dayjs(p.eliminado_en).format("DD/MM/YYYY HH:mm"),
    }));
    exportToExcel(rows, `Personeros_Eliminados_${new Date().toISOString().slice(0, 10)}`, "Eliminados");
  };

  const COLS = 7;

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Personeros Eliminados</h1>
        <p className="text-sm text-gray-400 mt-1">Registro de personeros quitados de la lista general, con motivo, quién y cuándo</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total eliminados" value={data.length} icon={<DeleteOutlineIcon />} color="#dc2626" />
        {MOTIVOS_ELIMINACION.slice(0, 3).map((m) => (
          <StatCard key={m.value} label={m.label} value={data.filter((p) => p.motivo_eliminacion === m.value).length}
            icon={<DeleteOutlineIcon />} color={m.color} />
        ))}
      </div>

      <div className="glow-card rounded-2xl overflow-hidden">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-[rgba(148,163,184,0.14)]">
          <div className="flex items-center gap-2 flex-wrap">
            <TextField
              size="small"
              placeholder="Buscar por nombre, DNI o quién eliminó..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 280, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start"><SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} /></InputAdornment>
                  ),
                },
              }}
            />
            <TextField select size="small" label="Motivo" value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}
              sx={{ minWidth: 170, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}>
              <MenuItem value="todos">Todos los motivos</MenuItem>
              {MOTIVOS_ELIMINACION.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
          </div>
          <div className="flex items-center gap-2">
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
          {loading ? "Cargando..." : `${filtrados.length} registro${filtrados.length !== 1 ? "s" : ""}`}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0f1730" }}>
                {["Apellidos y Nombres", "DNI", "Tipo", "Colegio / Mesa", "Motivo", "Eliminado por", "Fecha y hora"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap" style={{ color: "#94a3b8" }}>
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
                filtrados.map((p, i) => (
                  <tr key={p.id} className="border-t border-[rgba(148,163,184,0.10)] hover:bg-[rgba(59,130,246,0.10)] transition-colors"
                    style={{ background: i % 2 === 0 ? "#121a30" : "#0d1526" }}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-semibold text-[#e7ecfb]">{p.apellido_paterno} {p.apellido_materno}</p>
                      <p className="text-xs text-gray-400">{p.nombres}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#cbd5e1]">{p.dni || "—"}</td>
                    <td className="px-4 py-3">
                      <RegistroBadge tipo={p.tipo_registro} />
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm text-[#cbd5e1] truncate" title={p.colegio_votacion ?? ""}>{p.colegio_votacion || "—"}</p>
                      <p className="text-xs text-gray-400">{p.numero_mesa ? `Mesa ${p.numero_mesa}` : ""}</p>
                    </td>
                    <td className="px-4 py-3"><MotivoBadge motivo={p.motivo_eliminacion} /></td>
                    <td className="px-4 py-3 text-[#cbd5e1]">{p.eliminado_por || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#cbd5e1]">{dayjs(p.eliminado_en).format("DD/MM/YYYY HH:mm")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[rgba(148,163,184,0.14)] flex justify-between items-center text-xs text-gray-400">
          <span>{!loading && `Mostrando ${filtrados.length} de ${data.length} registros`}</span>
          <span style={{ color: "#1565c0", fontWeight: 600 }}>Campaign Data Repository</span>
        </div>
      </div>
    </div>
  );
}
