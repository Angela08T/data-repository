"use client";

import { useState } from "react";
import {
  Box, Container, Paper, Typography, Button, Alert, Collapse, CircularProgress, TextField,
} from "@mui/material";
import BadgeIcon from "@mui/icons-material/Badge";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReplayIcon from "@mui/icons-material/Replay";
import { supabase } from "@/lib/supabase";

// Ficha pública de inscripción de personeros (sitio oficial de campaña).
const FICHA_INSCRIPCION_URL = "https://jesusmaldonadooficial.com/#personero";

interface PersoneroConsulta {
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  comuna: string | null;
  zona: string | null;
  colegio_votacion: string | null;
  numero_mesa: string | null;
}

type Resultado =
  | { tipo: "inscrito"; personero: PersoneroConsulta }
  | { tipo: "no-inscrito" };

function DatoFila({ label, value }: { label: string; value?: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75, borderBottom: "1px solid #f1f5f9" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600} color="#0d1b3e" textAlign="right">{value}</Typography>
    </Box>
  );
}

export default function SoyPersoneroPage() {
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (dni.trim().length !== 8) {
      setError("Ingresa los 8 dígitos de tu DNI.");
      return;
    }

    setBuscando(true);
    try {
      // Hay DNIs repetidos en el padrón (registros duplicados), así que no se usa
      // .maybeSingle(): se trae el más reciente y basta con que exista uno.
      const { data, error: err } = await supabase
        .from("personeros")
        .select("nombres, apellido_paterno, apellido_materno, comuna, zona, colegio_votacion, numero_mesa")
        .eq("dni", dni.trim())
        .order("created_at", { ascending: false })
        .limit(1);

      if (err) {
        setError("Ocurrió un error al consultar. Intenta nuevamente en unos segundos.");
        return;
      }

      const fila = (data as PersoneroConsulta[] | null)?.[0];
      if (fila) {
        setResultado({ tipo: "inscrito", personero: fila });
      } else {
        setResultado({ tipo: "no-inscrito" });
      }
    } catch {
      setError("No se pudo completar la consulta. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setBuscando(false);
    }
  };

  const reiniciar = () => {
    setResultado(null);
    setError(null);
    setDni("");
  };

  const nombreCompleto = (p: PersoneroConsulta) =>
    [p.nombres, p.apellido_paterno, p.apellido_materno]
      .map((x) => x?.trim())
      .filter(Boolean)
      .join(" ");

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
              <BadgeIcon sx={{ fontSize: 28, color: "#1565c0" }} />
            </Box>
            <Typography variant="h5" component="h1" fontWeight={700} color="#0d1b3e" gutterBottom>
              Consulta de Personeros
            </Typography>
            <Typography variant="body2" color="text.secondary">
              San Juan de Lurigancho · Verifica si estás en el padrón
            </Typography>
          </Box>

          {/* Formulario */}
          {!resultado && (
            <form onSubmit={handleConsultar} className="space-y-4">
              <Typography variant="body2" color="text.secondary" mb={2}>
                Ingresa tu número de DNI para saber si ya estás inscrito como personero de campaña.
              </Typography>
              <TextField
                fullWidth
                label="DNI"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                disabled={buscando}
                inputMode="numeric"
                slotProps={{ htmlInput: { maxLength: 8 } }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
              <Collapse in={!!error}>
                <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: "12px" }}>
                  {error}
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
                {buscando ? <CircularProgress size={22} color="inherit" /> : "Consultar"}
              </Button>
            </form>
          )}

          {/* Resultado: inscrito */}
          {resultado?.tipo === "inscrito" && (
            <Box className="space-y-4">
              <Box textAlign="center" py={1}>
                <CheckCircleIcon sx={{ fontSize: 48, color: "#16a34a", mb: 1 }} />
                <Typography variant="h6" fontWeight={700} color="#16a34a" gutterBottom>
                  ¡Sí estás inscrito!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tu DNI figura en el padrón de personeros de campaña.
                </Typography>
              </Box>

              <Box sx={{ background: "#f1f5f9", p: 2, borderRadius: "12px" }}>
                {nombreCompleto(resultado.personero) ? (
                  <Typography variant="body1" fontWeight={700} color="#0d1b3e" mb={0.5}>
                    {nombreCompleto(resultado.personero)}
                  </Typography>
                ) : (
                  <Typography variant="body1" fontWeight={700} color="#0d1b3e" mb={0.5}>
                    Registro encontrado
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">DNI {dni}</Typography>

                <Box mt={1.5}>
                  <DatoFila label="Comuna" value={resultado.personero.comuna} />
                  <DatoFila label="Zona" value={resultado.personero.zona} />
                  <DatoFila label="Colegio de votación" value={resultado.personero.colegio_votacion} />
                  <DatoFila label="N° de mesa" value={resultado.personero.numero_mesa} />
                </Box>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<ReplayIcon />}
                onClick={reiniciar}
                sx={{ textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px" }}
              >
                Consultar otro DNI
              </Button>
            </Box>
          )}

          {/* Resultado: no inscrito */}
          {resultado?.tipo === "no-inscrito" && (
            <Box className="space-y-4">
              <Box textAlign="center" py={1}>
                <HowToRegIcon sx={{ fontSize: 48, color: "#1565c0", mb: 1 }} />
                <Typography variant="h6" fontWeight={700} color="#0d1b3e" gutterBottom>
                  Todavía no estás inscrito
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No encontramos el DNI <strong>{dni}</strong> en el padrón de personeros. Puedes inscribirte ahora
                  llenando la ficha oficial.
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                href={FICHA_INSCRIPCION_URL}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon />}
                sx={{
                  background: "linear-gradient(135deg, #166534 0%, #16a34a 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #14532d 0%, #166534 100%)" },
                  textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px",
                }}
              >
                Inscribirme ahora
              </Button>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<ReplayIcon />}
                onClick={reiniciar}
                sx={{ textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px" }}
              >
                Consultar otro DNI
              </Button>
            </Box>
          )}

        </Paper>
      </Container>
    </Box>
  );
}
