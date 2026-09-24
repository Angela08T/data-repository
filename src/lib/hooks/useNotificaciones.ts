"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface NotificacionPersonero {
  id: string;
  tipo: string;
  mensaje: string;
  personero_id: string | null;
  leida: boolean;
  creado_en: string;
}

export function tiempoRelativo(fecha: Date): string {
  const diffMs = Date.now() - fecha.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "justo ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD} d`;
  return fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

// Solo el contador de no leídas — usado en la campanita del menú lateral,
// donde no hace falta cargar el detalle de cada notificación.
export function useNotificacionesNoLeidas(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let activo = true;
    const contar = async () => {
      const { count: n } = await supabase
        .from("notificaciones")
        .select("id", { count: "exact", head: true })
        .eq("leida", false);
      if (activo) setCount(n ?? 0);
    };
    contar();

    const canal = supabase
      .channel("notificaciones-conteo")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones" }, contar)
      .subscribe();

    return () => { activo = false; supabase.removeChannel(canal); };
  }, []);

  return count;
}

// Versión completa para la campanita de la barra de herramientas: últimas
// notificaciones, contador y una tarjeta emergente ("toast") que aparece sola
// cuando llega una nueva y se borra a los pocos segundos.
export function useNotificacionesBell(limiteRecientes = 6) {
  const [recientes, setRecientes] = useState<NotificacionPersonero[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [toast, setToast] = useState<NotificacionPersonero | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contarNoLeidas = useCallback(async () => {
    const { count } = await supabase
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("leida", false);
    setNoLeidas(count ?? 0);
  }, []);

  const cargarRecientes = useCallback(async () => {
    const { data } = await supabase
      .from("notificaciones")
      .select("id, tipo, mensaje, personero_id, leida, creado_en")
      .order("creado_en", { ascending: false })
      .order("id", { ascending: false })
      .limit(limiteRecientes);
    setRecientes((data as NotificacionPersonero[]) ?? []);
  }, [limiteRecientes]);

  useEffect(() => { cargarRecientes(); contarNoLeidas(); }, [cargarRecientes, contarNoLeidas]);

  useEffect(() => {
    const canal = supabase
      .channel("notificaciones-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones" }, (payload) => {
        const nueva = payload.new as NotificacionPersonero;
        setRecientes((prev) => [nueva, ...prev].slice(0, limiteRecientes));
        setNoLeidas((n) => n + 1);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(nueva);
        toastTimer.current = setTimeout(() => setToast(null), 6000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notificaciones" }, (payload) => {
        const actualizada = payload.new as NotificacionPersonero;
        setRecientes((prev) => prev.map((n) => (n.id === actualizada.id ? actualizada : n)));
        contarNoLeidas();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limiteRecientes]);

  const marcarLeida = useCallback(async (id: string) => {
    setRecientes((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    setNoLeidas((n) => Math.max(0, n - 1));
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    setRecientes((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    await supabase.from("notificaciones").update({ leida: true }).eq("leida", false);
  }, []);

  const descartarToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  return { recientes, noLeidas, toast, marcarLeida, marcarTodasLeidas, descartarToast };
}
