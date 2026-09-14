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

// En móviles angostos (iPhone SE, Androids de 320-360px) el par label/valor no
// entra en una sola línea, sobre todo el colegio de votación. Por eso se apila
// (label arriba, valor abajo) hasta el breakpoint sm y recién ahí va en fila.
function DatoFila({ label, value }: { label: string; value?: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "baseline" },
        gap: { xs: 0.25, sm: 2 },
        py: 1,
        borderBottom: "1px solid rgba(148,163,184,0.18)",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={600}
        color="#eef2ff"
        sx={{ textAlign: { xs: "left", sm: "right" }, wordBreak: "break-word" }}
      >
        {value}
      </Typography>
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

  const primaryButtonSx = {
    background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
    "&:hover": { background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)" },
    textTransform: "none" as const,
    fontWeight: "bold",
    py: 1.5,
    borderRadius: "50px",
    fontSize: { xs: "0.95rem", sm: "1rem" },
  };

  const secondaryButtonSx = {
    textTransform: "none" as const,
    fontWeight: "bold",
    py: 1.5,
    borderRadius: "50px",
    fontSize: { xs: "0.95rem", sm: "1rem" },
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        background:
          "radial-gradient(ellipse 70% 55% at 80% -10%, rgba(59,130,246,0.20) 0%, transparent 60%)," +
          "radial-gradient(ellipse 55% 45% at -5% 100%, rgba(37,99,235,0.14) 0%, transparent 55%)," +
          "linear-gradient(160deg, #060a16 0%, #0a1122 50%, #0b1428 100%)",
        pt: "max(env(safe-area-inset-top), 20px)",
        pb: "max(env(safe-area-inset-bottom), 20px)",
        pl: "env(safe-area-inset-left)",
        pr: "env(safe-area-inset-right)",
      }}
    >
      {/* my:auto centra la tarjeta cuando sobra alto (tablets) y deja hacer scroll
          normal cuando el contenido es más alto que la pantalla (móviles chicos). */}
      <Container
        maxWidth="sm"
        disableGutters
        sx={{ px: { xs: 2, sm: 3 }, my: "auto", width: "100%" }}
      >
        <Paper
          sx={{
            p: { xs: 2.5, sm: 4, md: 5 },
            borderRadius: { xs: "16px", sm: "20px" },
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            width: "100%",
          }}
        >

          <Box textAlign="center" mb={{ xs: 3, sm: 4 }}>
            <Box
              sx={{
                width: { xs: 52, sm: 56 },
                height: { xs: 52, sm: 56 },
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 1.5,
                background: "rgba(59,130,246,0.16)",
              }}
            >
              <BadgeIcon sx={{ fontSize: { xs: 26, sm: 28 }, color: "#60a5fa" }} />
            </Box>
            <Typography
              component="h1"
              fontWeight={700}
              color="#eef2ff"
              gutterBottom
              sx={{ fontSize: { xs: "1.3rem", sm: "1.5rem" }, lineHeight: 1.25 }}
            >
              Consulta de Personeros
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 1, sm: 0 } }}>
              San Juan de Lurigancho · Verifica si estás en el padrón
            </Typography>
          </Box>

          {/* Formulario */}
          {!resultado && (
            <Box
              component="form"
              onSubmit={handleConsultar}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                Ingresa tu número de DNI para saber si ya estás inscrito como personero de campaña.
              </Typography>
              <TextField
                fullWidth
                label="DNI"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                disabled={buscando}
                inputMode="numeric"
                autoComplete="off"
                slotProps={{ htmlInput: { maxLength: 8, enterKeyHint: "search" } }}
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
                sx={primaryButtonSx}
              >
                {buscando ? <CircularProgress size={22} color="inherit" /> : "Consultar"}
              </Button>
            </Box>
          )}

          {/* Resultado: inscrito */}
          {resultado?.tipo === "inscrito" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box textAlign="center" py={1}>
                <CheckCircleIcon sx={{ fontSize: { xs: 44, sm: 48 }, color: "#16a34a", mb: 1 }} />
                <Typography
                  fontWeight={700}
                  color="#16a34a"
                  gutterBottom
                  sx={{ fontSize: { xs: "1.15rem", sm: "1.25rem" } }}
                >
                  ¡Sí estás inscrito!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tu DNI figura en el padrón de personeros de campaña.
                </Typography>
              </Box>

              <Box sx={{ background: "rgba(148,163,184,0.10)", p: { xs: 2, sm: 2.5 }, borderRadius: "12px" }}>
                <Typography variant="body1" fontWeight={700} color="#eef2ff" sx={{ wordBreak: "break-word" }}>
                  {nombreCompleto(resultado.personero) || "Registro encontrado"}
                </Typography>
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
                sx={secondaryButtonSx}
              >
                Consultar otro DNI
              </Button>
            </Box>
          )}

          {/* Resultado: no inscrito */}
          {resultado?.tipo === "no-inscrito" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box textAlign="center" py={1}>
                <HowToRegIcon sx={{ fontSize: { xs: 44, sm: 48 }, color: "#60a5fa", mb: 1 }} />
                <Typography
                  fontWeight={700}
                  color="#eef2ff"
                  gutterBottom
                  sx={{ fontSize: { xs: "1.15rem", sm: "1.25rem" } }}
                >
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
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 1.5,
                  borderRadius: "50px",
                  fontSize: { xs: "0.95rem", sm: "1rem" },
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
                sx={secondaryButtonSx}
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
