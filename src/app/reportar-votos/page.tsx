"use client";

import { useState } from "react";
import {
  Box, Container, Paper, Typography, Button, Alert, Collapse, CircularProgress, TextField,
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { supabase } from "@/lib/supabase";

// TODO: ajustar al nombre exacto del partido/lista de campaña.
const NOMBRE_PARTIDO = "Jesús Maldonado";

interface Personero {
  id: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  colegio: string | null;
  numero_mesa: string | null;
}

const MAX_FOTO_BYTES = 5 * 1024 * 1024;

type Step = "dni" | "form" | "success";

export default function ReportarVotosPage() {
  const [step, setStep] = useState<Step>("dni");

  // Paso 1: DNI
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [dniError, setDniError] = useState<string | null>(null);
  const [personero, setPersonero] = useState<Personero | null>(null);

  // Paso 2: un envío = 1 voto
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [votosEnviados, setVotosEnviados] = useState(0);

  const handleBuscarDni = async (e: React.FormEvent) => {
    e.preventDefault();
    setDniError(null);

    if (!dni.trim()) {
      setDniError("Ingresa tu número de DNI.");
      return;
    }

    setBuscando(true);
    try {
      const { data: p, error } = await supabase
        .from("personeros")
        .select("id, dni, nombres, apellido_paterno, apellido_materno, colegio:colegio_votacion, numero_mesa")
        .eq("dni", dni.trim())
        .maybeSingle();

      if (error) {
        setDniError("Ocurrió un error al buscar tu registro. Intenta nuevamente.");
        return;
      }
      if (!p) {
        setDniError("No encontramos tu DNI en el padrón de personeros. Verifica el número o contacta a tu coordinador.");
        return;
      }
      if (!p.colegio || !p.numero_mesa) {
        setDniError("Tu registro no tiene colegio o mesa asignados todavía. Contacta a tu coordinador antes de reportar.");
        return;
      }

      setPersonero(p as Personero);
      setVotosEnviados(0);
      setStep("form");
    } finally {
      setBuscando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setSubmitError("El archivo debe ser una imagen (foto del acta).");
      return;
    }
    if (f.size > MAX_FOTO_BYTES) {
      setSubmitError("La imagen no debe superar los 5 MB.");
      return;
    }
    setSubmitError(null);
    setFoto(f);
    setFotoPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personero) return;
    setSubmitError(null);

    if (!foto) {
      setSubmitError("Debes adjuntar una foto del acta.");
      return;
    }

    setSubmitting(true);
    try {
      const path = `${personero.numero_mesa}/${Date.now()}-${foto.name}`;
      const { error: uploadError } = await supabase.storage
        .from("actas-electorales")
        .upload(path, foto);

      if (uploadError) {
        setSubmitError(`No se pudo subir la foto del acta: ${uploadError.message}`);
        return;
      }

      const { error: actaError } = await supabase
        .from("actas_mesa")
        .insert({
          personero_id: personero.id,
          personero_dni: personero.dni,
          colegio: personero.colegio,
          numero_mesa: personero.numero_mesa,
          foto_acta_url: path,
        });

      if (actaError) {
        setSubmitError(`No se pudo registrar el voto: ${actaError.message}`);
        return;
      }

      setVotosEnviados((n) => n + 1);
      setStep("success");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegistrarOtro = () => {
    setFoto(null);
    setFotoPreview(null);
    setSubmitError(null);
    setStep("form");
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        backgroundColor: "#f8fafc",
        pt: "max(env(safe-area-inset-top), 24px)",
        pb: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <Container maxWidth="sm" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper sx={{ p: { xs: 2.5, sm: 5 }, borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" }}>

          <Box textAlign="center" mb={4}>
            <Box
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "#eff6ff" }}
            >
              <HowToVoteIcon sx={{ fontSize: 28, color: "#1565c0" }} />
            </Box>
            <Typography variant="h5" component="h1" fontWeight={700} color="#0d1b3e" gutterBottom>
              Reportar Votos de Mesa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              San Juan de Lurigancho · Conteo de personeros
            </Typography>
          </Box>

          {step === "dni" && (
            <form onSubmit={handleBuscarDni} className="space-y-4">
              <Typography variant="body2" color="text.secondary" mb={2}>
                Ingresa tu DNI para verificar tu registro como personero y comenzar a reportar.
              </Typography>
              <TextField
                fullWidth
                label="DNI"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                disabled={buscando}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
              <Collapse in={!!dniError}>
                <Alert severity="error" onClose={() => setDniError(null)} sx={{ borderRadius: "12px" }}>
                  {dniError}
                </Alert>
              </Collapse>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={buscando}
                sx={{
                  background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)" },
                  textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px",
                }}
              >
                {buscando ? <CircularProgress size={22} color="inherit" /> : "Continuar"}
              </Button>
            </form>
          )}

          {step === "form" && personero && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Box sx={{ background: "#f1f5f9", p: 2, borderRadius: "12px" }}>
                <Typography variant="body1" fontWeight={600} color="#0d1b3e">
                  {personero.nombres} {personero.apellido_paterno} {personero.apellido_materno}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Colegio: {personero.colegio}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  N° de Mesa: <strong>{personero.numero_mesa}</strong>
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Cada foto que envíes cuenta como <strong>1 voto</strong> para {NOMBRE_PARTIDO}. Envía una foto por cada voto que confirmes en el acta.
              </Typography>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} color="#0d1b3e" mb={1}>
                  Foto del acta
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  sx={{ borderRadius: "10px", textTransform: "none" }}
                >
                  {foto ? "Cambiar foto" : "Subir foto del acta"}
                  <input type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />
                </Button>
                {fotoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoPreview}
                    alt="Vista previa del acta"
                    className="mt-3 rounded-xl max-h-64 max-w-full w-auto"
                    style={{ objectFit: "contain" }}
                  />
                )}
              </Box>

              <Collapse in={!!submitError}>
                <Alert severity="error" onClose={() => setSubmitError(null)} sx={{ borderRadius: "12px" }}>
                  {submitError}
                </Alert>
              </Collapse>

              {votosEnviados > 0 && (
                <Typography variant="body2" sx={{ color: "#16a34a", fontWeight: 600 }}>
                  Van {votosEnviados} voto{votosEnviados !== 1 ? "s" : ""} enviado{votosEnviados !== 1 ? "s" : ""} por ti en esta sesión.
                </Typography>
              )}

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                sx={{
                  background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)" },
                  textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px",
                }}
              >
                {submitting ? <CircularProgress size={22} color="inherit" /> : "Enviar voto"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <Box textAlign="center" py={2}>
              <CheckCircleIcon sx={{ fontSize: 48, color: "#16a34a", mb: 1 }} />
              <Typography variant="h6" fontWeight={700} color="#16a34a" gutterBottom>
                ¡Voto registrado!
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Se sumó al conteo de la mesa {personero?.numero_mesa}. Llevas {votosEnviados} voto{votosEnviados !== 1 ? "s" : ""} enviado{votosEnviados !== 1 ? "s" : ""}.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleRegistrarOtro}
                sx={{
                  background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)" },
                  textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px",
                }}
              >
                Registrar otro voto
              </Button>
            </Box>
          )}

        </Paper>
      </Container>
    </Box>
  );
}
