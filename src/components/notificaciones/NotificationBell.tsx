"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton, Badge, Popover, Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CloseIcon from "@mui/icons-material/Close";
import { useNotificacionesBell, tiempoRelativo } from "@/lib/hooks/useNotificaciones";

const RUTA_HISTORIAL = "/programas-sociales/personeros/notificaciones";

export default function NotificationBell() {
  const router = useRouter();
  const { recientes, noLeidas, toast, marcarLeida, marcarTodasLeidas, descartarToast } = useNotificacionesBell(6);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notificaciones">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Badge badgeContent={noLeidas} max={99} color="error">
            <NotificationsIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 340, maxWidth: "92vw", borderRadius: "14px", mt: 1,
              background: "#121a30", border: "1px solid rgba(148,163,184,0.16)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            },
          },
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(148,163,184,0.14)" }}>
          <span className="text-sm font-bold" style={{ color: "#eef2ff" }}>Notificaciones</span>
          {noLeidas > 0 && (
            <button onClick={marcarTodasLeidas} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#60a5fa" }}>
              <DoneAllIcon sx={{ fontSize: 14 }} /> Marcar todas
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {recientes.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">Todavía no hay notificaciones.</div>
          ) : (
            recientes.map((n) => (
              <button key={n.id} onClick={() => marcarLeida(n.id)}
                className="w-full flex items-start gap-2.5 px-4 py-3 text-left border-b last:border-b-0 transition-colors"
                style={{ borderColor: "rgba(148,163,184,0.08)", background: n.leida ? "transparent" : "rgba(59,130,246,0.08)" }}>
                <PersonAddAlt1Icon sx={{ fontSize: 16, color: "#4ade80", marginTop: "2px", flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="text-xs" style={{ color: n.leida ? "#94a3b8" : "#eef2ff", fontWeight: n.leida ? 500 : 700 }}>{n.mensaje}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{tiempoRelativo(new Date(n.creado_en))}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <button
          onClick={() => { setAnchorEl(null); router.push(RUTA_HISTORIAL); }}
          className="w-full text-center text-xs font-semibold py-2.5 border-t transition-colors"
          style={{ color: "#60a5fa", borderColor: "rgba(148,163,184,0.14)" }}>
          Ver todo el historial →
        </button>
      </Popover>

      {/* Tarjeta emergente: aparece cuando llega una notificación en tiempo
          real y se borra sola a los pocos segundos; el historial completo
          queda guardado en /personeros/notificaciones sin importar esto. */}
      {toast && (
        <div className="fixed top-4 right-4 z-[2000] animate-[slideInLeft_0.25s_ease]" style={{ width: 320, maxWidth: "calc(100vw - 32px)" }}>
          <div className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: "#121a30", border: "1px solid rgba(74,222,128,0.35)", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(74,222,128,0.16)", color: "#4ade80" }}>
              <PersonAddAlt1Icon sx={{ fontSize: 19 }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold" style={{ color: "#eef2ff" }}>Nuevo personero</p>
              <p className="text-xs mt-0.5" style={{ color: "#cbd5e1" }}>{toast.mensaje}</p>
            </div>
            <button onClick={descartarToast} className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors">
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
