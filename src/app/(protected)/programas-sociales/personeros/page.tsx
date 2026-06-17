"use client";

import { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton, Tooltip, CircularProgress } from "@mui/material";
import { supabase } from "@/lib/supabase";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";

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
}

function SexoBadge({ sexo }: { sexo: string }) {
  const esMujer = sexo?.toUpperCase() === "F";
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={esMujer ? { background: "#fce7f3", color: "#9d174d" } : { background: "#dbeafe", color: "#1e40af" }}
    >
      {esMujer ? <FemaleIcon sx={{ fontSize: 13 }} /> : <MaleIcon sx={{ fontSize: 13 }} />}
      {esMujer ? "Femenino" : "Masculino"}
    </span>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
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
  const [data, setData]       = useState<Personero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [filtroSexo, setFiltroSexo] = useState<"todos" | "M" | "F">("todos");

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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtrados = data.filter((p) => {
    const nombreCompleto = `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.toLowerCase();
    const matchSearch =
      nombreCompleto.includes(search.toLowerCase()) ||
      p.dni.includes(search) ||
      (p.distrito ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.comuna ?? "").toLowerCase().includes(search.toLowerCase());
    const matchSexo = filtroSexo === "todos" || p.sexo?.toUpperCase() === filtroSexo;
    return matchSearch && matchSexo;
  });

  const totalMujeres = data.filter((p) => p.sexo?.toUpperCase() === "F").length;
  const totalHombres = data.filter((p) => p.sexo?.toUpperCase() === "M").length;

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: "#0d1b3e" }}>Personeros</h1>
        <p className="text-sm text-gray-400 mt-1">Registro de personeros inscritos en la campaña</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total personeros" value={data.length}  icon={<PeopleIcon />}  color="#1565c0" />
        <StatCard label="Mujeres"          value={totalMujeres} icon={<FemaleIcon />}  color="#9d174d" />
        <StatCard label="Hombres"          value={totalHombres} icon={<MaleIcon />}    color="#1e40af" />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <TextField
            size="small"
            placeholder="Buscar por nombre, DNI, distrito o comuna..."
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
            {([
              { value: "todos", label: "Todos" },
              { value: "F",     label: "Femenino" },
              { value: "M",     label: "Masculino" },
            ] as const).map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltroSexo(f.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={
                  filtroSexo === f.value
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
              <IconButton size="small">
                <FileDownloadIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Contador */}
        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50">
          {loading ? "Cargando..." : `${filtrados.length} registro${filtrados.length !== 1 ? "s" : ""}`}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Apellidos y Nombres", "DNI", "Nacimiento", "Sexo", "Distrito", "Dirección", "Teléfono", "Comuna"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap" style={{ color: "#64748b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <CircularProgress size={28} sx={{ color: "#1565c0" }} />
                    <p className="text-gray-400 text-sm mt-3">Cargando registros...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-red-400 text-sm">
                    Error al cargar datos: {error}
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                filtrados.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-t border-gray-50 hover:bg-blue-50 transition-colors"
                    style={{ background: i % 2 === 0 ? "#ffffff" : "#fafbff" }}
                  >
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
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-700">{p.dni}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{p.fecha_nacimiento}</span>
                    </td>
                    <td className="px-4 py-3">
                      <SexoBadge sexo={p.sexo} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">{p.distrito}</span>
                        <span className="text-xs text-gray-400">{p.region}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{p.direccion || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {p.telefono && p.telefono !== "EMPTY" ? p.telefono : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f0fdf4", color: "#166534" }}>
                        {p.comuna || "—"}
                      </span>
                    </td>
                  </tr>
                ))
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
