"use client";

import { useState, useEffect, useCallback } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { supabase } from "@/lib/supabase";
import { tiempoRelativo, type NotificacionPersonero as Notificacion } from "@/lib/hooks/useNotificaciones";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

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

const FILTROS = [
  { value: "todas", label: "Todas" },
  { value: "no_leidas", label: "No leídas" },
] as const;

export default function NotificacionesPersonerosPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["value"]>("todas");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const PAGE_SIZE = 1000;
    const todas: Notificacion[] = [];
    let from = 0;
    let hayError: string | null = null;
    while (true) {
      const { data, error: err } = await supabase
        .from("notificaciones")
        .select("id, tipo, mensaje, personero_id, leida, creado_en")
        .order("creado_en", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (err) { hayError = err.message; break; }
      const lote = (data as Notificacion[]) ?? [];
      todas.push(...lote);
      if (lote.length === 0) break;
      from += lote.length;
    }
    if (hayError) setError(hayError);
    else setNotificaciones(todas);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Nuevas notificaciones (ej. un registrador agregando personeros en este
  // mismo momento) aparecen arriba sin que nadie tenga que refrescar la página.
  useEffect(() => {
    const canal = supabase
      .channel("notificaciones-personeros")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones" }, (payload) => {
        const nueva = payload.new as Notificacion;
        setNotificaciones((prev) => (prev.some((n) => n.id === nueva.id) ? prev : [nueva, ...prev]));
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const total = notificaciones.length;
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const visibles = filtro === "no_leidas" ? notificaciones.filter((n) => !n.leida) : notificaciones;

  const marcarLeida = async (id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
  };

  const marcarTodasLeidas = async () => {
    if (noLeidas === 0) return;
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    await supabase.from("notificaciones").update({ leida: true }).eq("leida", false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#eef2ff" }}>Notificaciones</h1>
          <p className="text-sm text-gray-400 mt-1">Historial de personeros nuevos agregados a la campaña</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip title="Marcar todas como leídas">
            <span><IconButton onClick={marcarTodasLeidas} disabled={loading || noLeidas === 0}>
              <DoneAllIcon sx={{ color: loading || noLeidas === 0 ? "#475569" : "#60a5fa" }} />
            </IconButton></span>
          </Tooltip>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchData} disabled={loading}>
              <RefreshIcon sx={{ color: loading ? "#475569" : "#94a3b8" }} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <CircularProgress size={36} sx={{ color: "#3b82f6" }} />
          <p className="text-gray-400 text-sm mt-4">Cargando notificaciones...</p>
        </div>
      ) : error ? (
        <div className="glow-card rounded-2xl p-10 text-center text-red-400 text-sm">Error al cargar datos: {error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total de notificaciones" value={total} subtitle="Personeros agregados en total" icon={<NotificationsIcon />} color="#3b82f6" />
            <StatCard label="Sin leer" value={noLeidas} subtitle={noLeidas === 0 ? "Estás al día" : "Pendientes de revisar"} icon={<MarkEmailUnreadIcon />} color="#f59e0b" />
          </div>

          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-base" style={{ color: "#eef2ff" }}>Historial</h3>
              <div className="flex items-center gap-1.5">
                {FILTROS.map((f) => (
                  <button key={f.value} onClick={() => setFiltro(f.value)}
                    className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                    style={filtro === f.value
                      ? { background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" }
                      : { background: "transparent", color: "#94a3b8", borderColor: "rgba(148,163,184,0.22)" }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {visibles.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                {filtro === "no_leidas" ? "No hay notificaciones sin leer." : "Todavía no hay notificaciones."}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(148,163,184,0.10)" }}>
                {visibles.map((n) => (
                  <div key={n.id}
                    className="flex items-start gap-3 px-6 py-4 transition-colors"
                    style={{ background: n.leida ? "transparent" : "rgba(59,130,246,0.06)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(74,222,128,0.14)", color: "#4ade80" }}>
                      <PersonAddAlt1Icon sx={{ fontSize: 19 }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm" style={{ color: n.leida ? "#cbd5e1" : "#eef2ff", fontWeight: n.leida ? 500 : 700 }}>
                        {n.mensaje}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{tiempoRelativo(new Date(n.creado_en))}</p>
                    </div>
                    {!n.leida && (
                      <button onClick={() => marcarLeida(n.id)}
                        className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-all"
                        style={{ background: "rgba(59,130,246,0.14)", color: "#60a5fa" }}>
                        Marcar leída
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
