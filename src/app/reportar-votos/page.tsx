"use client";

import { useState, useEffect } from "react";
import {
  Box, Container, Paper, Typography, Button, Alert, Collapse, CircularProgress, TextField,
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { supabase } from "@/lib/supabase";
import { compressImage, blobToBase64 } from "@/lib/utils/compressImage";
import { fetchCandidatosActivos, CandidatoAlcaldia } from "@/lib/candidatos-alcaldia";

interface Personero {
  id: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  colegio: string | null;
  numero_mesa: string | null;
}

interface ActaExistenteRow {
  id: string;
  foto_acta_url: string | null;
  votos_blancos: number | null;
  votos_nulos: number | null;
  votos_impugnados: number | null;
  confianza_ia: string | null;
  advertencia_ia: string | null;
  created_at: string | null;
}

interface VotoCandidatoRow {
  votos: number | null;
  votos_ia: number | null;
  candidatos_alcaldia: { numero_lista: number | null } | null;
}

type Confianza = "alta" | "media" | "baja";

interface LecturaIA {
  candidatos: Record<string, number>;
  votos_blancos: number;
  votos_nulos: number;
  votos_impugnados: number;
  confianza: Confianza;
  advertencia: string | null;
}

const MAX_FOTO_BYTES = 15 * 1024 * 1024;

type Step = "dni" | "foto" | "revisar" | "success";

function votosVacios(candidatos: CandidatoAlcaldia[]): Record<string, number> {
  return Object.fromEntries(candidatos.map((c) => [String(c.numero_lista), 0]));
}

export default function ReportarVotosPage() {
  const [step, setStep] = useState<Step>("dni");
  const [candidatos, setCandidatos] = useState<CandidatoAlcaldia[]>([]);
  const [candidatosError, setCandidatosError] = useState<string | null>(null);

  // Paso 1: DNI
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [dniError, setDniError] = useState<string | null>(null);
  const [personero, setPersonero] = useState<Personero | null>(null);

  // Estado del acta (nueva o existente)
  const [modoEdicion, setModoEdicion] = useState(false);
  const [actaId, setActaId] = useState<string | null>(null);
  const [fechaReporte, setFechaReporte] = useState<string | null>(null);
  const [fotoActaUrlExistente, setFotoActaUrlExistente] = useState<string | null>(null);

  // Paso 2: foto + lectura IA
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoComprimida, setFotoComprimida] = useState<Blob | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [lecturaIA, setLecturaIA] = useState<LecturaIA | null>(null);

  // Paso 3: revisión/corrección
  const [votos, setVotos] = useState<Record<string, number>>({});
  const [votosBlancos, setVotosBlancos] = useState(0);
  const [votosNulos, setVotosNulos] = useState(0);
  const [votosImpugnados, setVotosImpugnados] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidatosActivos()
      .then(setCandidatos)
      .catch((e) => setCandidatosError(e instanceof Error ? e.message : "No se pudo cargar la lista de candidatos."));
  }, []);

  const handleBuscarDni = async (e: React.FormEvent) => {
    e.preventDefault();
    setDniError(null);

    if (!dni.trim()) {
      setDniError("Ingresa tu número de DNI.");
      return;
    }
    if (candidatos.length === 0) {
      setDniError(candidatosError ?? "Aún se está cargando la lista de candidatos, intenta en unos segundos.");
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

      const personeroData = p as Personero;
      setPersonero(personeroData);

      const { data: acta } = await supabase
        .from("actas_mesa")
        .select("id, foto_acta_url, votos_blancos, votos_nulos, votos_impugnados, confianza_ia, advertencia_ia, created_at")
        .eq("numero_mesa", personeroData.numero_mesa)
        .maybeSingle();

      if (acta) {
        const a = acta as ActaExistenteRow;
        const { data: votosRows } = await supabase
          .from("votos_candidato")
          .select("votos, votos_ia, candidatos_alcaldia(numero_lista)")
          .eq("acta_id", a.id);

        const votosExistentes = votosVacios(candidatos);
        let huboLecturaIA = false;
        const candidatosIA: Record<string, number> = {};
        for (const row of (votosRows ?? []) as unknown as VotoCandidatoRow[]) {
          const numeroLista = row.candidatos_alcaldia?.numero_lista;
          if (numeroLista == null) continue;
          votosExistentes[String(numeroLista)] = row.votos ?? 0;
          if (row.votos_ia != null) {
            candidatosIA[String(numeroLista)] = row.votos_ia;
            huboLecturaIA = true;
          }
        }

        setModoEdicion(true);
        setActaId(a.id);
        setFechaReporte(a.created_at);
        setFotoActaUrlExistente(a.foto_acta_url);
        setVotos(votosExistentes);
        setVotosBlancos(a.votos_blancos ?? 0);
        setVotosNulos(a.votos_nulos ?? 0);
        setVotosImpugnados(a.votos_impugnados ?? 0);
        setLecturaIA(huboLecturaIA ? {
          candidatos: candidatosIA,
          votos_blancos: a.votos_blancos ?? 0,
          votos_nulos: a.votos_nulos ?? 0,
          votos_impugnados: a.votos_impugnados ?? 0,
          confianza: (a.confianza_ia as Confianza) ?? "alta",
          advertencia: a.advertencia_ia,
        } : null);
        setStep("revisar");
      } else {
        setModoEdicion(false);
        setActaId(null);
        setVotos(votosVacios(candidatos));
        setVotosBlancos(0);
        setVotosNulos(0);
        setVotosImpugnados(0);
        setLecturaIA(null);
        setStep("foto");
      }
    } finally {
      setBuscando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setOcrError("El archivo debe ser una imagen (foto del acta).");
      return;
    }
    if (f.size > MAX_FOTO_BYTES) {
      setOcrError("La imagen no debe superar los 15 MB.");
      return;
    }
    setOcrError(null);
    setFoto(f);
    setFotoPreview(URL.createObjectURL(f));
  };

  const handleLeerConIA = async () => {
    if (!foto || !personero) return;
    setOcrError(null);
    setOcrLoading(true);

    try {
      const comprimida = await compressImage(foto);
      const base64 = await blobToBase64(comprimida);

      const res = await fetch("/api/ocr-acta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: "image/jpeg",
          dni: personero.dni,
          numeroMesa: personero.numero_mesa,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOcrError(data?.error ?? "No se pudo leer el acta.");
        return;
      }

      const lectura = data as LecturaIA;
      setFotoComprimida(comprimida);
      setLecturaIA(lectura);
      setVotos({ ...votosVacios(candidatos), ...lectura.candidatos });
      setVotosBlancos(lectura.votos_blancos ?? 0);
      setVotosNulos(lectura.votos_nulos ?? 0);
      setVotosImpugnados(lectura.votos_impugnados ?? 0);
      setStep("revisar");
    } catch {
      setOcrError("No se pudo leer el acta. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleVolverAFoto = () => {
    setFoto(null);
    setFotoPreview(null);
    setFotoComprimida(null);
    setOcrError(null);
    setStep("foto");
  };

  const totalVotos =
    Object.values(votos).reduce((sum, v) => sum + (Number(v) || 0), 0) +
    (Number(votosBlancos) || 0) + (Number(votosNulos) || 0) + (Number(votosImpugnados) || 0);

  const handleConfirmar = async () => {
    if (!personero) return;
    setSubmitError(null);

    if (!modoEdicion && !fotoComprimida) {
      setSubmitError("Debes leer el acta con la IA antes de confirmar.");
      return;
    }

    setSubmitting(true);
    try {
      let fotoActaUrl = fotoActaUrlExistente;

      if (fotoComprimida) {
        const path = `${personero.numero_mesa}/${Date.now()}-acta.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("actas-electorales")
          .upload(path, fotoComprimida, { contentType: "image/jpeg" });

        if (uploadError) {
          setSubmitError(`No se pudo subir la foto del acta: ${uploadError.message}`);
          return;
        }
        fotoActaUrl = path;
      }

      const actaPayload = {
        personero_id: personero.id,
        personero_dni: personero.dni,
        colegio: personero.colegio,
        numero_mesa: personero.numero_mesa,
        foto_acta_url: fotoActaUrl,
        votos_blancos: votosBlancos,
        votos_nulos: votosNulos,
        votos_impugnados: votosImpugnados,
        confianza_ia: lecturaIA?.confianza ?? null,
        advertencia_ia: lecturaIA?.advertencia ?? null,
        updated_at: new Date().toISOString(),
      };

      let idActa = actaId;

      if (modoEdicion && idActa) {
        const { error: actaError } = await supabase.from("actas_mesa").update(actaPayload).eq("id", idActa);
        if (actaError) {
          setSubmitError(`No se pudo guardar el reporte: ${actaError.message}`);
          return;
        }
      } else {
        const { data: inserted, error: actaError } = await supabase
          .from("actas_mesa")
          .insert(actaPayload)
          .select("id")
          .single();
        if (actaError) {
          setSubmitError(`No se pudo guardar el reporte: ${actaError.message}`);
          return;
        }
        idActa = inserted.id;
        // Si el personero corrige la mesa desde la pantalla de éxito, el próximo
        // guardado debe actualizar esta misma fila en vez de intentar duplicarla.
        setActaId(idActa);
        setModoEdicion(true);
      }

      const filasVotos = candidatos.map((c) => ({
        acta_id: idActa,
        candidato_id: c.id,
        votos: votos[String(c.numero_lista)] ?? 0,
        votos_ia: lecturaIA?.candidatos[String(c.numero_lista)] ?? null,
      }));

      const { error: votosError } = await supabase
        .from("votos_candidato")
        .upsert(filasVotos, { onConflict: "acta_id,candidato_id" });

      if (votosError) {
        setSubmitError(`Se guardó la mesa pero no los votos por candidato: ${votosError.message}`);
        return;
      }

      setStep("success");
    } finally {
      setSubmitting(false);
    }
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
              Reportar Acta de Mesa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              San Juan de Lurigancho · Conteo paralelo de personeros
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

          {step === "foto" && personero && (
            <div className="space-y-5">
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
                Sube una foto clara y completa del acta de tu mesa. La IA leerá los votos de todos los candidatos automáticamente — luego podrás corregir cualquier número antes de confirmar.
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

              <Collapse in={!!ocrError}>
                <Alert severity="error" onClose={() => setOcrError(null)} sx={{ borderRadius: "12px" }}>
                  {ocrError}
                </Alert>
              </Collapse>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={ocrLoading ? undefined : <AutoAwesomeIcon />}
                disabled={!foto || ocrLoading}
                onClick={handleLeerConIA}
                sx={{
                  background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
                  "&:hover": { background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)" },
                  textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px",
                }}
              >
                {ocrLoading
                  ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1.5 }} />Leyendo el acta... puede tardar unos segundos</>
                  : "Leer acta con IA"}
              </Button>
            </div>
          )}

          {step === "revisar" && personero && (
            <div className="space-y-4">
              <Box sx={{ background: "#f1f5f9", p: 2, borderRadius: "12px" }}>
                <Typography variant="body1" fontWeight={600} color="#0d1b3e">
                  {personero.nombres} {personero.apellido_paterno} {personero.apellido_materno}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Colegio: {personero.colegio} · Mesa: <strong>{personero.numero_mesa}</strong>
                </Typography>
              </Box>

              {modoEdicion && (
                <Alert severity="info" sx={{ borderRadius: "12px" }}>
                  Esta mesa ya fue reportada{fechaReporte ? ` el ${new Date(fechaReporte).toLocaleString("es-PE")}` : ""}. Puedes corregir los datos si hace falta.
                </Alert>
              )}

              {lecturaIA && (lecturaIA.confianza !== "alta" || lecturaIA.advertencia) && (
                <Alert severity="warning" sx={{ borderRadius: "12px" }}>
                  La IA no está totalmente segura de esta lectura ({lecturaIA.confianza}).{lecturaIA.advertencia ? ` ${lecturaIA.advertencia}` : ""} Revisa los números con cuidado.
                </Alert>
              )}

              {fotoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoPreview}
                  alt="Foto del acta"
                  className="rounded-xl max-h-56 max-w-full w-auto mx-auto block"
                  style={{ objectFit: "contain" }}
                />
              )}

              <Typography variant="subtitle2" fontWeight={700} color="#0d1b3e">
                Votos por candidato
              </Typography>
              <Box sx={{ maxHeight: 340, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
                {candidatos.map((c) => (
                  <Box key={c.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1, borderBottom: "1px solid #f1f5f9" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} color="#0d1b3e" noWrap>
                        {c.numero_lista}. {c.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                        {c.partido}
                      </Typography>
                    </Box>
                    <TextField
                      size="small"
                      type="number"
                      value={votos[String(c.numero_lista)] ?? 0}
                      onChange={(e) => setVotos((prev) => ({ ...prev, [String(c.numero_lista)]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      slotProps={{ htmlInput: { min: 0, style: { textAlign: "right" } } }}
                      sx={{ width: 90, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                    />
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1.5 }}>
                <TextField size="small" type="number" label="En blanco" value={votosBlancos}
                  onChange={(e) => setVotosBlancos(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  slotProps={{ htmlInput: { min: 0 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                <TextField size="small" type="number" label="Nulos" value={votosNulos}
                  onChange={(e) => setVotosNulos(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  slotProps={{ htmlInput: { min: 0 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                <TextField size="small" type="number" label="Impugnados" value={votosImpugnados}
                  onChange={(e) => setVotosImpugnados(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  slotProps={{ htmlInput: { min: 0 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
              </Box>

              <Typography variant="body2" fontWeight={700} color="#1565c0" textAlign="right">
                Total: {totalVotos} votos
              </Typography>

              <Collapse in={!!submitError}>
                <Alert severity="error" onClose={() => setSubmitError(null)} sx={{ borderRadius: "12px" }}>
                  {submitError}
                </Alert>
              </Collapse>

              <div className="flex gap-3">
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  disabled={submitting}
                  onClick={handleVolverAFoto}
                  sx={{ textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px" }}
                >
                  Volver a tomar foto
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={submitting}
                  onClick={handleConfirmar}
                  sx={{
                    background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
                    "&:hover": { background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)" },
                    textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px",
                  }}
                >
                  {submitting ? <CircularProgress size={22} color="inherit" /> : "Confirmar y guardar mesa"}
                </Button>
              </div>
            </div>
          )}

          {step === "success" && (
            <Box textAlign="center" py={2}>
              <CheckCircleIcon sx={{ fontSize: 48, color: "#16a34a", mb: 1 }} />
              <Typography variant="h6" fontWeight={700} color="#16a34a" gutterBottom>
                ¡Mesa reportada!
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Se registraron {totalVotos} votos de la mesa {personero?.numero_mesa}.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => setStep("revisar")}
                sx={{ textTransform: "none", fontWeight: "bold", py: 1.5, borderRadius: "50px" }}
              >
                Corregir datos de esta mesa
              </Button>
            </Box>
          )}

        </Paper>
      </Container>
    </Box>
  );
}
