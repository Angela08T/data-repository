"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogTitle, Button, CircularProgress, IconButton,
} from "@mui/material";
import CloseIcon      from "@mui/icons-material/Close";
import SmsIcon        from "@mui/icons-material/Sms";
import WhatsAppIcon   from "@mui/icons-material/WhatsApp";
import SendIcon       from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon      from "@mui/icons-material/Error";
import PeopleIcon     from "@mui/icons-material/People";

export interface Contacto {
  nombre: string;
  telefono: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  contactos: Contacto[];
}

type Canal = "sms" | "whatsapp";
type Estado = "idle" | "sending" | "done";

interface Resultado {
  enviados: number;
  fallidos: { nombre: string; error: string }[];
  total: number;
}

export default function SendMessageModal({ open, onClose, contactos }: Props) {
  const [canal, setCanal]     = useState<Canal>("sms");
  const [mensaje, setMensaje] = useState("");
  const [estado, setEstado]   = useState<Estado>("idle");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const handleClose = () => {
    if (estado === "sending") return;
    setMensaje("");
    setEstado("idle");
    setResultado(null);
    onClose();
  };

  const handleSend = async () => {
    if (!mensaje.trim()) return;
    setEstado("sending");
    setResultado(null);

    try {
      const res = await fetch("/api/twilio/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactos, mensaje, canal }),
      });
      const data = await res.json();
      setResultado(data);
      setEstado("done");
    } catch {
      setResultado({ enviados: 0, fallidos: [{ nombre: "—", error: "Error de red" }], total: contactos.length });
      setEstado("done");
    }
  };

  const chars = mensaje.length;
  const maxChars = 160;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "20px", boxShadow: "0 24px 64px rgba(13,27,62,0.18)", overflow: "hidden" },
      }}
    >
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d1b3e 0%, #1565c0 100%)", padding: "20px 24px" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              <SendIcon sx={{ fontSize: 18, color: "#fff" }} />
            </div>
            <div>
              <DialogTitle sx={{ p: 0, color: "#fff", fontWeight: 800, fontSize: "1rem", fontFamily: "'Poppins', sans-serif" }}>
                Enviar mensaje
              </DialogTitle>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem", margin: 0 }}>
                {contactos.length} contacto{contactos.length !== 1 ? "s" : ""} seleccionado{contactos.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <IconButton onClick={handleClose} disabled={estado === "sending"}
            sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { background: "rgba(255,255,255,0.12)" } }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </div>
      </div>

      <DialogContent sx={{ p: 3 }}>

        {/* Resultado */}
        {estado === "done" && resultado && (
          <div className="space-y-3 mb-4">
            {/* Enviados */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f0fdf4" }}>
              <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 22 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#16a34a" }}>
                  {resultado.enviados} mensaje{resultado.enviados !== 1 ? "s" : ""} enviado{resultado.enviados !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-400">de {resultado.total} contactos</p>
              </div>
            </div>

            {/* Fallidos */}
            {resultado.fallidos.length > 0 && (
              <div className="p-3 rounded-xl" style={{ background: "#fef2f2" }}>
                <div className="flex items-center gap-2 mb-2">
                  <ErrorIcon sx={{ color: "#dc2626", fontSize: 18 }} />
                  <p className="text-xs font-bold" style={{ color: "#dc2626" }}>
                    {resultado.fallidos.length} fallido{resultado.fallidos.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {resultado.fallidos.map((f, i) => (
                  <p key={i} className="text-xs text-gray-500 ml-6">• {f.nombre}: {f.error}</p>
                ))}
              </div>
            )}

            <Button fullWidth variant="outlined" onClick={handleClose}
              sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
              Cerrar
            </Button>
          </div>
        )}

        {/* Formulario */}
        {estado !== "done" && (
          <div className="space-y-4">

            {/* Contactos */}
            <div className="p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="flex items-center gap-2 mb-2">
                <PeopleIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Destinatarios</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {contactos.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: "#eff6ff", color: "#1565c0" }}>
                    {c.nombre}
                  </span>
                ))}
              </div>
            </div>

            {/* Canal */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Canal</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "sms",      label: "SMS",       icon: <SmsIcon sx={{ fontSize: 18 }} />,      color: "#1565c0" },
                  { value: "whatsapp", label: "WhatsApp",  icon: <WhatsAppIcon sx={{ fontSize: 18 }} />, color: "#16a34a" },
                ] as const).map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCanal(c.value)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all"
                    style={
                      canal === c.value
                        ? { background: c.color, color: "#fff", borderColor: c.color, boxShadow: `0 4px 12px ${c.color}40` }
                        : { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }
                    }
                  >
                    {c.icon}{c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensaje</p>
                <span className="text-xs" style={{ color: chars > maxChars ? "#dc2626" : "#94a3b8" }}>
                  {chars}/{maxChars}
                </span>
              </div>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={4}
                className="w-full text-sm border rounded-xl px-3 py-2.5 outline-none resize-none transition-all"
                style={{
                  borderColor: "#e2e8f0",
                  fontFamily: "'Poppins', sans-serif",
                  color: "#0d1b3e",
                  lineHeight: 1.6,
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1565c0")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <Button fullWidth variant="outlined" onClick={handleClose} disabled={estado === "sending"}
                sx={{
                  borderRadius: "12px", textTransform: "none", fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif", borderColor: "#e2e8f0", color: "#64748b",
                  "&:hover": { borderColor: "#cbd5e1", background: "#f8fafc" },
                }}>
                Cancelar
              </Button>
              <Button fullWidth variant="contained" onClick={handleSend}
                disabled={estado === "sending" || !mensaje.trim()}
                startIcon={estado === "sending" ? undefined : (canal === "whatsapp" ? <WhatsAppIcon /> : <SmsIcon />)}
                sx={{
                  borderRadius: "12px", textTransform: "none", fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif",
                  background: canal === "whatsapp"
                    ? "linear-gradient(135deg, #16a34a, #15803d)"
                    : "linear-gradient(135deg, #1565c0, #1976d2)",
                  "&:hover": {
                    background: canal === "whatsapp"
                      ? "linear-gradient(135deg, #15803d, #166534)"
                      : "linear-gradient(135deg, #0d47a1, #1565c0)",
                  },
                  boxShadow: canal === "whatsapp"
                    ? "0 4px 14px rgba(22,163,74,0.35)"
                    : "0 4px 14px rgba(21,101,192,0.35)",
                }}>
                {estado === "sending"
                  ? <CircularProgress size={20} color="inherit" />
                  : `Enviar ${canal === "whatsapp" ? "WhatsApp" : "SMS"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
