"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CircularProgress, IconButton, Tooltip, Button, TextField, InputAdornment, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { CustomSwal, showDeleteConfirm, showError } from "@/lib/utils/swalConfig";
import EditableCell from "@/components/personeros/EditableCell";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AddIcon from "@mui/icons-material/Add";
import PlaceIcon from "@mui/icons-material/Place";
import LinkIcon from "@mui/icons-material/Link";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SchoolIcon from "@mui/icons-material/School";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";

interface Local {
  id: string;
  comuna: number;
  nombre: string;
  direccion: string | null;
  mesas: number;
  personeros_requeridos: number | null;
  electores: number | null;
  enlace_maps: string | null;
  orden: number;
}

const COMUNAS = Array.from({ length: 18 }, (_, i) => i + 1);
const numberFmt = new Intl.NumberFormat("es-PE");

// Colores por comuna (ciclo) solo para distinguir visualmente cada bloque.
const COLORES_COMUNA = ["#60a5fa", "#a78bfa", "#f472b6", "#fbbf24", "#2dd4bf", "#fb923c"];
const colorComuna = (comuna: number) => COLORES_COMUNA[(comuna - 1) % COLORES_COMUNA.length];

// El nombre del colegio en la ficha de cada personero viene escrito a mano
// ("IE 171 01 JUAN VELASCO ALVARADO", "I E 158 SANTA MARIA"...), así que para
// cruzarlo con un local se compara sin tildes, mayúsculas ni signos.
function normalizarNombre(s?: string | null): string {
  return (s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function urlMapa(l: Local): string {
  if (l.enlace_maps) return l.enlace_maps;
  const consulta = `${l.nombre} ${l.direccion ?? ""} San Juan de Lurigancho`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

function colorFaltan(faltan: number): string {
  if (faltan < 0) return "#60a5fa";
  if (faltan === 0) return "#4ade80";
  return "#f87171";
}

function StatCard({ label, value, subtitle, icon, color }: {
  label: string; value: string | number; subtitle?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="stat-card glow-card rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black leading-tight tabular-nums" style={{ color: "#eef2ff" }}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const FORM_VACIO = { comuna: "1", nombre: "", direccion: "", mesas: "", electores: "", enlace_maps: "" };

export default function LocalesVotacionPage() {
  const [locales, setLocales] = useState<Local[]>([]);
  const [colegiosPersoneros, setColegiosPersoneros] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(false);
  const [search, setSearch] = useState("");
  const [comunaFiltro, setComunaFiltro] = useState("todas");

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: rows, error: locError } = await supabase
      .from("locales_votacion")
      .select("id, comuna, nombre, direccion, mesas, personeros_requeridos, electores, enlace_maps, orden")
      .order("comuna", { ascending: true })
      .order("orden", { ascending: true });

    if (locError) {
      setError(`No se pudieron leer los locales (${locError.message}). Verifica que la tabla locales_votacion exista en Supabase.`);
      setLoading(false);
      return;
    }

    // Supabase/PostgREST limita cada consulta a 1000 filas; se pagina con .range().
    const PAGE_SIZE = 1000;
    const colegios: (string | null)[] = [];
    let from = 0;
    while (true) {
      const { data: lote, error: err } = await supabase
        .from("personeros")
        .select("id, colegio_votacion")
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (err) { setError(err.message); setLoading(false); return; }
      const filas = (lote as { id: string; colegio_votacion: string | null }[]) ?? [];
      colegios.push(...filas.map((f) => f.colegio_votacion));
      if (filas.length === 0) break;
      from += filas.length;
    }

    setLocales((rows as Local[]) ?? []);
    setColegiosPersoneros(colegios);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Un UPDATE bloqueado por RLS no da error: simplemente no toca ninguna fila.
  // Por eso se pide la fila de vuelta con .select() y se verifica que exista.
  const guardarCampo = async (id: string, cambios: Partial<Local>): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from("locales_votacion")
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id");

    if (err) return err.code === "23505" ? "Ya existe un local con ese nombre en esa comuna." : err.message;
    if (!data || data.length === 0) return "No se pudo guardar (sin permiso o el local ya no existe).";

    setLocales((prev) => prev.map((l) => (l.id === id ? { ...l, ...cambios } : l)));
    return null;
  };

  const guardarTexto = (id: string, campo: "nombre" | "direccion", valor: string) => {
    const limpio = valor.trim();
    if (campo === "nombre" && !limpio) return Promise.resolve("El nombre no puede quedar vacío.");
    return guardarCampo(id, { [campo]: limpio === "" ? null : limpio });
  };

  const guardarNumero = (id: string, campo: "mesas" | "personeros_requeridos" | "electores", valor: string) => {
    const limpio = valor.trim();
    if (campo === "mesas" && limpio === "") return Promise.resolve("Las mesas no pueden quedar vacías.");
    return guardarCampo(id, { [campo]: limpio === "" ? null : parseInt(limpio, 10) });
  };

  const editarEnlace = async (l: Local) => {
    const { value, isConfirmed } = await CustomSwal.fire({
      title: "Enlace de Google Maps",
      input: "url",
      inputValue: l.enlace_maps ?? "",
      inputPlaceholder: "https://maps.app.goo.gl/...",
      inputAttributes: { autocapitalize: "off" },
      showCancelButton: true,
      confirmButtonText: "Guardar",
      footer: "Déjalo vacío para volver a la búsqueda automática en Google Maps.",
      inputValidator: (v) => (v && !/^https?:\/\//i.test(v.trim()) ? "El enlace debe empezar con http:// o https://" : null),
    });
    if (!isConfirmed) return;
    const enlace = (value as string).trim();
    const err = await guardarCampo(l.id, { enlace_maps: enlace === "" ? null : enlace });
    if (err) showError("No se pudo guardar el enlace", err);
  };

  const eliminarLocal = async (l: Local) => {
    const r = await showDeleteConfirm(`el local "${l.nombre}"`);
    if (!r.isConfirmed) return;
    const { data, error: err } = await supabase.from("locales_votacion").delete().eq("id", l.id).select("id");
    if (err || !data || data.length === 0) {
      showError("No se pudo eliminar", err?.message ?? "Sin permiso o el local ya no existe.");
      return;
    }
    setLocales((prev) => prev.filter((x) => x.id !== l.id));
  };

  const cargarLocalesIniciales = async () => {
    setCargandoInicial(true);
    // El listado inicial se carga solo al hacer clic: así no viaja dentro del
    // resto de la página para quien ya tiene los locales guardados.
    const iniciales = (await import("@/lib/data/locales-votacion-iniciales.json")).default as [number, string, string, number, number][];
    const filas = iniciales.map(([comuna, nombre, direccion, mesas, electores], i) => ({
      comuna, nombre, direccion, mesas, electores, orden: i + 1,
    }));
    const { data, error: err } = await supabase
      .from("locales_votacion")
      .upsert(filas, { onConflict: "comuna,nombre" })
      .select("id");
    setCargandoInicial(false);

    if (err) { setError(err.message); return; }
    if (!data || data.length === 0) {
      setError("No se pudieron cargar los locales (sin permiso de escritura en locales_votacion).");
      return;
    }
    fetchData();
  };

  const agregarLocal = async () => {
    setFormError(null);
    const nombre = form.nombre.trim();
    const mesas = parseInt(form.mesas, 10);
    if (!nombre) { setFormError("Escribe el nombre del local."); return; }
    if (!Number.isInteger(mesas) || mesas < 0) { setFormError("Escribe la cantidad de mesas."); return; }
    const enlace = form.enlace_maps.trim();
    if (enlace && !/^https?:\/\//i.test(enlace)) { setFormError("El enlace de Maps debe empezar con http:// o https://"); return; }

    setGuardando(true);
    const { data, error: err } = await supabase
      .from("locales_votacion")
      .insert({
        comuna: parseInt(form.comuna, 10),
        nombre,
        direccion: form.direccion.trim() || null,
        mesas,
        electores: form.electores.trim() === "" ? null : parseInt(form.electores, 10),
        enlace_maps: enlace || null,
        orden: Math.max(0, ...locales.map((l) => l.orden)) + 1,
      })
      .select("id");
    setGuardando(false);

    if (err) { setFormError(err.code === "23505" ? "Ya existe un local con ese nombre en esa comuna." : err.message); return; }
    if (!data || data.length === 0) { setFormError("No se pudo guardar (sin permiso de escritura)."); return; }

    setDialogAbierto(false);
    setForm(FORM_VACIO);
    fetchData();
  };

  // Personeros registrados por local, cruzados por nombre de colegio.
  const registradosPorNombre = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of colegiosPersoneros) {
      const k = normalizarNombre(c);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [colegiosPersoneros]);

  const nombresLocales = useMemo(() => new Set(locales.map((l) => normalizarNombre(l.nombre))), [locales]);

  const personerosSinColegio = colegiosPersoneros.filter((c) => !normalizarNombre(c)).length;
  const personerosColegioDesconocido = colegiosPersoneros.filter((c) => {
    const k = normalizarNombre(c);
    return k && !nombresLocales.has(k);
  }).length;

  const filas = useMemo(() => {
    const texto = normalizarNombre(search);
    return locales
      .filter((l) => comunaFiltro === "todas" || l.comuna === parseInt(comunaFiltro, 10))
      .filter((l) => !texto || normalizarNombre(`${l.nombre} ${l.direccion ?? ""}`).includes(texto))
      .map((l) => {
        const requeridos = l.personeros_requeridos ?? l.mesas;
        const registrados = registradosPorNombre.get(normalizarNombre(l.nombre)) ?? 0;
        return { ...l, requeridos, registrados, faltan: requeridos - registrados };
      });
  }, [locales, search, comunaFiltro, registradosPorNombre]);

  const grupos = useMemo(() => {
    const m = new Map<number, typeof filas>();
    for (const f of filas) m.set(f.comuna, [...(m.get(f.comuna) ?? []), f]);
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [filas]);

  const totales = (lista: typeof filas) => ({
    locales: lista.length,
    mesas: lista.reduce((s, l) => s + l.mesas, 0),
    requeridos: lista.reduce((s, l) => s + l.requeridos, 0),
    registrados: lista.reduce((s, l) => s + l.registrados, 0),
    faltan: lista.reduce((s, l) => s + Math.max(0, l.faltan), 0),
    electores: lista.reduce((s, l) => s + (l.electores ?? 0), 0),
  });
  const totalGeneral = totales(filas);

  const handleExport = () => {
    const rows = filas.map((l) => ({
      "Nombre del local": l.nombre,
      "Dirección del local": l.direccion ?? "",
      "Comuna": l.comuna,
      "Mesas": l.mesas,
      "P. Req.": l.requeridos,
      "Registrados": l.registrados,
      "Faltan": l.faltan,
      "Electores": l.electores ?? "",
      "Enlace Maps": urlMapa(l),
    }));
    exportToExcel(rows, `Locales_Votacion_${new Date().toISOString().slice(0, 10)}`, "Locales");
  };

  const sinLocales = !loading && !error && locales.length === 0;
  const COLS = 9;

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Locales de Votación</h1>
          <p className="text-sm text-gray-400 mt-1">
            Locales por comuna con sus mesas, personeros requeridos y electores. Haz clic en un dato para editarlo.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(FORM_VACIO); setFormError(null); setDialogAbierto(true); }}
            disabled={loading || !!error}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "12px", mr: 1 }}>
            Agregar local
          </Button>
          <Tooltip title="Exportar Excel">
            <span>
              <IconButton onClick={handleExport} disabled={loading || !!error || filas.length === 0}>
                <FileDownloadIcon sx={{ color: loading || error || filas.length === 0 ? "#475569" : "#60a5fa" }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Actualizar">
            <span>
              <IconButton onClick={fetchData} disabled={loading}>
                <RefreshIcon sx={{ color: loading ? "#475569" : "#94a3b8" }} />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <CircularProgress size={36} sx={{ color: "#3b82f6" }} />
          <p className="text-gray-400 text-sm mt-4">Cargando locales...</p>
        </div>
      ) : error ? (
        <div className="glow-card rounded-2xl p-10 text-center text-red-400 text-sm">{error}</div>
      ) : sinLocales ? (
        <div className="glow-card rounded-2xl p-10 text-center space-y-4">
          <p className="text-[#cbd5e1] text-sm">
            Todavía no hay locales guardados. Puedes cargar el listado inicial (220 locales de las comunas 1 a 17, con sus direcciones, mesas y electores) y luego editarlo.
          </p>
          <Button variant="contained" onClick={cargarLocalesIniciales} disabled={cargandoInicial}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "12px" }}>
            {cargandoInicial ? <CircularProgress size={20} color="inherit" /> : "Cargar locales iniciales"}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Locales" value={numberFmt.format(totalGeneral.locales)} subtitle={comunaFiltro === "todas" ? "Todas las comunas" : `Comuna ${comunaFiltro}`}
              icon={<SchoolIcon />} color="#60a5fa" />
            <StatCard label="Mesas" value={numberFmt.format(totalGeneral.mesas)} subtitle="Suma de los locales mostrados"
              icon={<HowToVoteIcon />} color="#a78bfa" />
            <StatCard label="Electores" value={numberFmt.format(totalGeneral.electores)} subtitle="Suma de los locales mostrados"
              icon={<GroupsIcon />} color="#2dd4bf" />
            <StatCard label="Personeros que faltan" value={numberFmt.format(totalGeneral.faltan)} subtitle="Requeridos − registrados en ese local"
              icon={<PersonSearchIcon />} color="#f87171" />
          </div>

          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-[rgba(148,163,184,0.14)]">
              <TextField
                size="small"
                placeholder="Buscar por local o dirección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: { sm: 320 }, width: { xs: "100%", sm: "auto" }, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start"><SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} /></InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                select size="small" label="Comuna" value={comunaFiltro}
                onChange={(e) => setComunaFiltro(e.target.value)}
                sx={{ minWidth: 160, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
              >
                <MenuItem value="todas">Todas las comunas</MenuItem>
                {COMUNAS.map((c) => <MenuItem key={c} value={String(c)}>Comuna {c}</MenuItem>)}
              </TextField>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#0f1730" }}>
                    {[
                      ["Nombre del local", "text-left"], ["Dirección", "text-left"], ["Mesas", "text-right"], ["P. Req.", "text-right"],
                      ["Registrados", "text-right"], ["Faltan", "text-right"], ["Electores", "text-right"], ["Mapa", "text-center"], ["", "text-center"],
                    ].map(([h, align], i) => (
                      <th key={i} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap ${align}`} style={{ color: "#94a3b8" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupos.length === 0 ? (
                    <tr><td colSpan={COLS} className="text-center py-16 text-gray-400 text-sm">No se encontraron locales</td></tr>
                  ) : grupos.map(([comuna, lista]) => {
                    const color = colorComuna(comuna);
                    const t = totales(lista);
                    return (
                      <FragmentoComuna key={comuna}>
                        <tr style={{ background: `${color}1a`, boxShadow: `inset 3px 0 0 ${color}` }}>
                          <td colSpan={COLS} className="px-4 py-2.5">
                            <span className="font-black uppercase tracking-wide" style={{ color }}>Comuna {comuna}</span>
                            <span className="text-xs text-gray-400 ml-3">{t.locales} local{t.locales !== 1 ? "es" : ""}</span>
                          </td>
                        </tr>
                        {lista.map((l, i) => (
                          <tr key={l.id}
                            className="border-t border-[rgba(148,163,184,0.10)] hover:bg-[rgba(59,130,246,0.10)] transition-colors"
                            style={{ background: i % 2 === 0 ? "#121a30" : "#0d1526", boxShadow: `inset 3px 0 0 ${color}66` }}>
                            <td className="px-4 py-2.5 min-w-[220px] max-w-[300px] font-semibold text-[#e7ecfb]">
                              <EditableCell value={l.nombre} editable onSave={(v) => guardarTexto(l.id, "nombre", v)} />
                            </td>
                            <td className="px-4 py-2.5 min-w-[220px] max-w-[300px]">
                              <EditableCell value={l.direccion ?? ""} editable onSave={(v) => guardarTexto(l.id, "direccion", v)} />
                            </td>
                            <td className="px-4 py-2.5 min-w-[80px]">
                              <EditableCell value={String(l.mesas)} editable align="right" sanitize={(r) => r.replace(/\D/g, "").slice(0, 4)}
                                displayValue={<span className="tabular-nums font-bold text-[#e7ecfb]">{numberFmt.format(l.mesas)}</span>}
                                onSave={(v) => guardarNumero(l.id, "mesas", v)} />
                            </td>
                            <td className="px-4 py-2.5 min-w-[80px]">
                              <EditableCell value={l.personeros_requeridos !== null ? String(l.personeros_requeridos) : ""} editable align="right"
                                sanitize={(r) => r.replace(/\D/g, "").slice(0, 4)}
                                displayValue={<span className="tabular-nums text-[#cbd5e1]" title={l.personeros_requeridos === null ? "Igual a las mesas (por defecto)" : undefined}>{numberFmt.format(l.requeridos)}</span>}
                                onSave={(v) => guardarNumero(l.id, "personeros_requeridos", v)} />
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-[#cbd5e1]">{numberFmt.format(l.registrados)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-bold" style={{ color: colorFaltan(l.faltan) }}>{numberFmt.format(l.faltan)}</td>
                            <td className="px-4 py-2.5 min-w-[90px]">
                              <EditableCell value={l.electores !== null ? String(l.electores) : ""} editable align="right"
                                sanitize={(r) => r.replace(/\D/g, "").slice(0, 7)}
                                displayValue={<span className="tabular-nums text-[#cbd5e1]">{l.electores !== null ? numberFmt.format(l.electores) : "—"}</span>}
                                onSave={(v) => guardarNumero(l.id, "electores", v)} />
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-center">
                              <Tooltip title={l.enlace_maps ? "Abrir en Google Maps" : "Buscar en Google Maps"}>
                                <IconButton size="small" component="a" href={urlMapa(l)} target="_blank" rel="noopener noreferrer">
                                  <PlaceIcon sx={{ fontSize: 18, color: l.enlace_maps ? "#4ade80" : "#60a5fa" }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Editar enlace de Maps">
                                <IconButton size="small" onClick={() => editarEnlace(l)}>
                                  <LinkIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                                </IconButton>
                              </Tooltip>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <Tooltip title="Eliminar local">
                                <IconButton size="small" onClick={() => eliminarLocal(l)}>
                                  <DeleteOutlineIcon sx={{ fontSize: 18, color: "#f87171" }} />
                                </IconButton>
                              </Tooltip>
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-[rgba(148,163,184,0.18)]" style={{ background: "#0f1730" }}>
                          <td className="px-4 py-2.5 font-black text-[#eef2ff] uppercase text-xs tracking-wide" colSpan={2}>Subtotal comuna {comuna}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-black text-[#eef2ff]">{numberFmt.format(t.mesas)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-black text-[#eef2ff]">{numberFmt.format(t.requeridos)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-black text-[#eef2ff]">{numberFmt.format(t.registrados)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-black" style={{ color: "#f87171" }}>{numberFmt.format(t.faltan)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-black text-[#eef2ff]">{numberFmt.format(t.electores)}</td>
                          <td colSpan={2} />
                        </tr>
                      </FragmentoComuna>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-[rgba(148,163,184,0.14)] text-xs text-gray-400 space-y-1">
              <p>
                “Registrados” cuenta los personeros cuyo colegio de votación tiene exactamente el mismo nombre que el local
                (sin importar tildes ni mayúsculas). Por eso puede quedar por debajo del real si alguien escribió el colegio distinto.
              </p>
              <p>
                {personerosColegioDesconocido} personeros tienen un colegio que no coincide con ningún local de esta lista
                y {personerosSinColegio} no tienen colegio registrado.
              </p>
            </div>
          </div>
        </>
      )}

      <Dialog open={dialogAbierto} onClose={() => !guardando && setDialogAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Agregar local de votación</DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <TextField select label="Comuna" value={form.comuna} onChange={(e) => setForm({ ...form, comuna: e.target.value })} size="small">
              {COMUNAS.map((c) => <MenuItem key={c} value={String(c)}>Comuna {c}</MenuItem>)}
            </TextField>
            <TextField label="Mesas" value={form.mesas} size="small"
              onChange={(e) => setForm({ ...form, mesas: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            <div className="sm:col-span-2">
              <TextField label="Nombre del local" value={form.nombre} size="small" fullWidth
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <TextField label="Dirección" value={form.direccion} size="small" fullWidth
                onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <TextField label="Electores" value={form.electores} size="small"
              onChange={(e) => setForm({ ...form, electores: e.target.value.replace(/\D/g, "").slice(0, 7) })} />
            <TextField label="Enlace de Google Maps (opcional)" value={form.enlace_maps} size="small"
              onChange={(e) => setForm({ ...form, enlace_maps: e.target.value })} />
          </div>
          {formError && <p className="text-sm text-red-400 mt-3">{formError}</p>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogAbierto(false)} disabled={guardando} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={agregarLocal} disabled={guardando} sx={{ textTransform: "none", fontWeight: 700 }}>
            {guardando ? <CircularProgress size={20} color="inherit" /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// <tbody> no admite <div>, y agrupar filas sin envoltorio exige un fragmento con key.
function FragmentoComuna({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
