"use client";

import { useState, useEffect } from "react";
import {
  Box, Container, Paper, Typography, Button, Alert, Collapse, CircularProgress, TextField, Chip,
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import ApartmentIcon from "@mui/icons-material/Apartment";
import { supabase } from "@/lib/supabase";
import { compressImage, blobToBase64 } from "@/lib/utils/compressImage";
import { fetchPartidosActivos, agruparPorAmbito, PartidoEleccion, Ambito } from "@/lib/partidos-eleccion";

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
  votos_blancos_sjl: number | null;
  votos_nulos_sjl: number | null;
  votos_impugnados_sjl: number | null;
  confianza_ia_sjl: string | null;
  advertencia_ia_sjl: string | null;
  votos_blancos_lima: number | null;
  votos_nulos_lima: number | null;
  votos_impugnados_lima: number | null;
  confianza_ia_lima: string | null;
  advertencia_ia_lima: string | null;
  created_at: string | null;
}

interface VotoPartidoRow {
  votos: number | null;
  votos_ia: number | null;
  partidos_eleccion: { ambito: Ambito; numero_lista: number } | null;
}

type Confianza = "alta" | "media" | "baja";

interface SeccionLectura {
  partidos: Record<string, number>;
  votos_blancos: number;
  votos_nulos: number;
  votos_impugnados: number;
  confianza: Confianza;
  advertencia: string | null;
}

interface LecturaIA {
  sjl: SeccionLectura;
  lima: SeccionLectura;
}

interface SeccionEstado {
  votos: Record<string, number>;
  votosBlancos: number;
  votosNulos: number;
  votosImpugnados: number;
}

const MAX_FOTO_BYTES = 15 * 1024 * 1024;

type Step = "dni" | "foto" | "revisar" | "success";

// La IA a veces omite una de las dos secciones (p. ej. si la foto trae el acta
// de una sola elección) o devuelve un campo suelto: se completa con ceros y una
// advertencia en vez de romper la pantalla con un TypeError.
function normalizarSeccion(raw: unknown, nombre: string): SeccionLectura {
  const s = (raw && typeof raw === "object" ? raw : null) as Partial<SeccionLectura> | null;
  if (!s || typeof s.partidos !== "object" || s.partidos === null) {
    return {
      partidos: {},
      votos_blancos: 0,
      votos_nulos: 0,
      votos_impugnados: 0,
      confianza: "baja",
      advertencia: `La IA no pudo leer la sección de ${nombre}. Ingresa los votos a mano o vuelve a tomar la foto.`,
    };
  }
  const partidos: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.partidos)) partidos[k] = Math.max(0, Math.trunc(Number(v)) || 0);
  const confianza: Confianza = s.confianza === "alta" || s.confianza === "media" ? s.confianza : "baja";
  return {
    partidos,
    votos_blancos: Math.max(0, Math.trunc(Number(s.votos_blancos)) || 0),
    votos_nulos: Math.max(0, Math.trunc(Number(s.votos_nulos)) || 0),
    votos_impugnados: Math.max(0, Math.trunc(Number(s.votos_impugnados)) || 0),
    confianza,
    advertencia: typeof s.advertencia === "string" ? s.advertencia : null,
  };
}

function normalizarLectura(raw: unknown): LecturaIA | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { sjl?: unknown; lima?: unknown };
  if (!r.sjl && !r.lima) return null;
  return { sjl: normalizarSeccion(r.sjl, "San Juan de Lurigancho"), lima: normalizarSeccion(r.lima, "Lima Metropolitana") };
}

function votosVacios(partidos: PartidoEleccion[]): Record<string, number> {
  return Object.fromEntries(partidos.map((p) => [String(p.numero_lista), 0]));
}

function seccionVacia(partidos: PartidoEleccion[]): SeccionEstado {
  return { votos: votosVacios(partidos), votosBlancos: 0, votosNulos: 0, votosImpugnados: 0 };
}

function totalSeccion(s: SeccionEstado): number {
  return Object.values(s.votos).reduce((sum, v) => sum + (Number(v) || 0), 0)
    + (Number(s.votosBlancos) || 0) + (Number(s.votosNulos) || 0) + (Number(s.votosImpugnados) || 0);
}

export default function ReportarVotosPage() {
  const [step, setStep] = useState<Step>("dni");
  const [partidos, setPartidos] = useState<PartidoEleccion[]>([]);
  const [partidosError, setPartidosError] = useState<string | null>(null);

  // Paso 1: DNI
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [dniError, setDniError] = useState<string | null>(null);
  const [personero, setPersonero] = useState<Personero | null>(null);

  // Estado del acta (nueva o existente)
  const [modoEdicion, setModoEdicion] = useState(false);
  const [fechaReporte, setFechaReporte] = useState<string | null>(null);
  const [fotoActaUrlExistente, setFotoActaUrlExistente] = useState<string | null>(null);

  // Paso 2: foto + lectura IA
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoComprimida, setFotoComprimida] = useState<Blob | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [lecturaIA, setLecturaIA] = useState<LecturaIA | null>(null);

  // Paso 3: revisión/corrección — un estado por sección (SJL primero, Lima después)
  const [sjl, setSjl] = useState<SeccionEstado>({ votos: {}, votosBlancos: 0, votosNulos: 0, votosImpugnados: 0 });
  const [lima, setLima] = useState<SeccionEstado>({ votos: {}, votosBlancos: 0, votosNulos: 0, votosImpugnados: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchPartidosActivos()
      .then(setPartidos)
      .catch((e) => setPartidosError(e instanceof Error ? e.message : "No se pudo cargar la lista de partidos."));
  }, []);

  const porAmbito = agruparPorAmbito(partidos);

  const handleBuscarDni = async (e: React.FormEvent) => {
    e.preventDefault();
    setDniError(null);

    if (!dni.trim()) {
      setDniError("Ingresa tu número de DNI.");
      return;
    }
    if (partidos.length === 0) {
      setDniError(partidosError ?? "Aún se está cargando la lista de partidos, intenta en unos segundos.");
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
        .select("id, foto_acta_url, votos_blancos_sjl, votos_nulos_sjl, votos_impugnados_sjl, confianza_ia_sjl, advertencia_ia_sjl, votos_blancos_lima, votos_nulos_lima, votos_impugnados_lima, confianza_ia_lima, advertencia_ia_lima, created_at")
        .eq("numero_mesa", personeroData.numero_mesa)
        .maybeSingle();

      if (acta) {
        const a = acta as ActaExistenteRow;
        const { data: votosRows } = await supabase
          .from("votos_partido")
          .select("votos, votos_ia, partidos_eleccion(ambito, numero_lista)")
          .eq("acta_id", a.id);

        const sjlVotos = votosVacios(porAmbito.sjl);
        const limaVotos = votosVacios(porAmbito.lima);
        const sjlIA: Record<string, number> = {};
        const limaIA: Record<string, number> = {};
        let huboLecturaIA = false;

        for (const row of (votosRows ?? []) as unknown as VotoPartidoRow[]) {
          const info = row.partidos_eleccion;
          if (!info) continue;
          const destino = info.ambito === "sjl" ? sjlVotos : limaVotos;
          destino[String(info.numero_lista)] = row.votos ?? 0;
          if (row.votos_ia != null) {
            (info.ambito === "sjl" ? sjlIA : limaIA)[String(info.numero_lista)] = row.votos_ia;
            huboLecturaIA = true;
          }
        }

        setModoEdicion(true);
        setFechaReporte(a.created_at);
        setFotoActaUrlExistente(a.foto_acta_url);
        setSjl({ votos: sjlVotos, votosBlancos: a.votos_blancos_sjl ?? 0, votosNulos: a.votos_nulos_sjl ?? 0, votosImpugnados: a.votos_impugnados_sjl ?? 0 });
        setLima({ votos: limaVotos, votosBlancos: a.votos_blancos_lima ?? 0, votosNulos: a.votos_nulos_lima ?? 0, votosImpugnados: a.votos_impugnados_lima ?? 0 });
        setLecturaIA(huboLecturaIA ? {
          sjl: {
            partidos: sjlIA,
            votos_blancos: a.votos_blancos_sjl ?? 0,
            votos_nulos: a.votos_nulos_sjl ?? 0,
            votos_impugnados: a.votos_impugnados_sjl ?? 0,
            confianza: (a.confianza_ia_sjl as Confianza) ?? "alta",
            advertencia: a.advertencia_ia_sjl,
          },
          lima: {
            partidos: limaIA,
            votos_blancos: a.votos_blancos_lima ?? 0,
            votos_nulos: a.votos_nulos_lima ?? 0,
            votos_impugnados: a.votos_impugnados_lima ?? 0,
            confianza: (a.confianza_ia_lima as Confianza) ?? "alta",
            advertencia: a.advertencia_ia_lima,
          },
        } : null);
        setStep("revisar");
      } else {
        setModoEdicion(false);
        setSjl(seccionVacia(porAmbito.sjl));
        setLima(seccionVacia(porAmbito.lima));
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

    // Cada paso se nombra para que, si algo falla, el mensaje diga QUÉ falló en
    // vez de un genérico "verifica tu conexión" que esconde la causa real.
    let paso = "preparar la foto";
    try {
      const comprimida = await compressImage(foto);
      const base64 = await blobToBase64(comprimida);

      paso = "enviar la foto al lector";
      // Con barra final: la app usa trailingSlash y sin ella el servidor
      // responde con una redirección extra antes de procesar.
      const res = await fetch("/api/ocr-acta/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: "image/jpeg",
          dni: personero.dni,
          numeroMesa: personero.numero_mesa,
        }),
      });

      paso = "leer la respuesta del servidor";
      // Un corte del servidor (timeout, foto muy pesada) devuelve HTML, no JSON:
      // se lee como texto para poder mostrar el código en vez de romper.
      const texto = await res.text();
      let data: unknown = null;
      try { data = JSON.parse(texto); } catch { /* respuesta no-JSON */ }

      if (!res.ok) {
        const mensaje = (data as { error?: string } | null)?.error;
        setOcrError(
          mensaje ??
          (res.status === 504 || res.status === 408
            ? "La lectura tardó demasiado. Intenta de nuevo con una foto más nítida."
            : res.status === 413
              ? "La foto es demasiado pesada. Intenta con otra."
              : `El servidor respondió con un error (${res.status}). Intenta de nuevo.`)
        );
        return;
      }

      const lectura = normalizarLectura(data);
      if (!lectura) {
        setOcrError("La IA devolvió una respuesta incompleta. Intenta con otra foto.");
        return;
      }
      setFotoComprimida(comprimida);
      setLecturaIA(lectura);
      setSjl({
        votos: { ...votosVacios(porAmbito.sjl), ...lectura.sjl.partidos },
        votosBlancos: lectura.sjl.votos_blancos ?? 0,
        votosNulos: lectura.sjl.votos_nulos ?? 0,
        votosImpugnados: lectura.sjl.votos_impugnados ?? 0,
      });
      setLima({
        votos: { ...votosVacios(porAmbito.lima), ...lectura.lima.partidos },
        votosBlancos: lectura.lima.votos_blancos ?? 0,
        votosNulos: lectura.lima.votos_nulos ?? 0,
        votosImpugnados: lectura.lima.votos_impugnados ?? 0,
      });
      setStep("revisar");
    } catch (e) {
      console.error(`Error al ${paso}:`, e);
      const detalle = e instanceof Error ? e.message : "error desconocido";
      setOcrError(`No se pudo ${paso} (${detalle}). Verifica tu conexión e intenta de nuevo.`);
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

  const totalGeneral = totalSeccion(sjl) + totalSeccion(lima);

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
        votos_blancos_sjl: sjl.votosBlancos,
        votos_nulos_sjl: sjl.votosNulos,
        votos_impugnados_sjl: sjl.votosImpugnados,
        confianza_ia_sjl: lecturaIA?.sjl.confianza ?? null,
        advertencia_ia_sjl: lecturaIA?.sjl.advertencia ?? null,
        votos_blancos_lima: lima.votosBlancos,
        votos_nulos_lima: lima.votosNulos,
        votos_impugnados_lima: lima.votosImpugnados,
        confianza_ia_lima: lecturaIA?.lima.confianza ?? null,
        advertencia_ia_lima: lecturaIA?.lima.advertencia ?? null,
        updated_at: new Date().toISOString(),
      };

      // upsert por numero_mesa (columna con restricción unique) en vez de
      // "buscar y luego insertar o actualizar": con miles de personeros
      // reportando cerca de la misma hora, ese patrón deja una ventana de
      // carrera donde dos envíos casi simultáneos para la misma mesa podrían
      // crear dos actas duplicadas. El upsert es una sola operación atómica.
      const { data: guardada, error: actaError } = await supabase
        .from("actas_mesa")
        .upsert(actaPayload, { onConflict: "numero_mesa" })
        .select("id")
        .single();

      if (actaError) {
        setSubmitError(`No se pudo guardar el reporte: ${actaError.message}`);
        return;
      }

      const idActa = guardada.id;
      setModoEdicion(true);

      const filasVotos = [
        ...porAmbito.sjl.map((p) => ({
          acta_id: idActa,
          partido_id: p.id,
          votos: sjl.votos[String(p.numero_lista)] ?? 0,
          votos_ia: lecturaIA?.sjl.partidos[String(p.numero_lista)] ?? null,
        })),
        ...porAmbito.lima.map((p) => ({
          acta_id: idActa,
          partido_id: p.id,
          votos: lima.votos[String(p.numero_lista)] ?? 0,
          votos_ia: lecturaIA?.lima.partidos[String(p.numero_lista)] ?? null,
        })),
      ];

      const { error: votosError } = await supabase
        .from("votos_partido")
        .upsert(filasVotos, { onConflict: "acta_id,partido_id" });

      if (votosError) {
        setSubmitError(`Se guardó la mesa pero no los votos por partido: ${votosError.message}`);
        return;
      }

      setStep("success");
    } finally {
      setSubmitting(false);
    }
  };

  function SeccionVotos({
    ambito, titulo, subtitulo, icon, color, lista, estado, setEstado, lectura,
  }: {
    ambito: Ambito; titulo: string; subtitulo: string; icon: React.ReactNode; color: string;
    lista: PartidoEleccion[]; estado: SeccionEstado; setEstado: (fn: (prev: SeccionEstado) => SeccionEstado) => void;
    lectura: SeccionLectura | null;
  }) {
    return (
      <Box sx={{ border: `1px solid ${color}33`, borderRadius: "14px", overflow: "hidden" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, background: `${color}14` }}>
          {icon}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color }}>{titulo}</Typography>
            <Typography variant="caption" color="text.secondary">{subtitulo}</Typography>
          </Box>
          {ambito === "sjl" && (
            <Chip label="Prioridad" size="small" sx={{ background: color, color: "#fff", fontWeight: 700, fontSize: "0.65rem" }} />
          )}
        </Box>

        {lectura && (lectura.confianza !== "alta" || lectura.advertencia) && (
          <Alert severity="warning" sx={{ borderRadius: 0 }}>
            La IA no está totalmente segura de esta sección ({lectura.confianza}).{lectura.advertencia ? ` ${lectura.advertencia}` : ""} Revisa los números con cuidado.
          </Alert>
        )}

        <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
          {lista.map((p) => (
            <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1, borderBottom: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography variant="body2" fontWeight={600} color="#eef2ff" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {p.numero_lista}. {p.nombre}
              </Typography>
              <TextField
                size="small"
                type="number"
                value={estado.votos[String(p.numero_lista)] ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setEstado((prev) => ({ ...prev, votos: { ...prev.votos, [String(p.numero_lista)]: v } }));
                }}
                slotProps={{ htmlInput: { min: 0, style: { textAlign: "right" } } }}
                sx={{ width: 90, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              />
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1.5, p: 2 }}>
          <TextField size="small" type="number" label="En blanco" value={estado.votosBlancos}
            onChange={(e) => setEstado((prev) => ({ ...prev, votosBlancos: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
          <TextField size="small" type="number" label="Nulos" value={estado.votosNulos}
            onChange={(e) => setEstado((prev) => ({ ...prev, votosNulos: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
          <TextField size="small" type="number" label="Impugnados" value={estado.votosImpugnados}
            onChange={(e) => setEstado((prev) => ({ ...prev, votosImpugnados: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
        </Box>

        <Typography variant="body2" fontWeight={700} textAlign="right" sx={{ color, px: 2, pb: 1.5 }}>
          Total {titulo}: {totalSeccion(estado)} votos
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        background:
          "radial-gradient(ellipse 70% 55% at 80% -10%, rgba(59,130,246,0.20) 0%, transparent 60%)," +
          "radial-gradient(ellipse 55% 45% at -5% 100%, rgba(37,99,235,0.14) 0%, transparent 55%)," +
          "linear-gradient(160deg, #060a16 0%, #0a1122 50%, #0b1428 100%)",
        pt: "max(env(safe-area-inset-top), 24px)",
        pb: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <Container maxWidth="sm" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper sx={{ p: { xs: 2.5, sm: 5 }, borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" }}>

          <Box textAlign="center" mb={4}>
            <Box
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(59,130,246,0.16)" }}
            >
              <HowToVoteIcon sx={{ fontSize: 28, color: "#1565c0" }} />
            </Box>
            <Typography variant="h5" component="h1" fontWeight={700} color="#eef2ff" gutterBottom>
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
              <Box sx={{ background: "rgba(148,163,184,0.14)", p: 2, borderRadius: "12px" }}>
                <Typography variant="body1" fontWeight={600} color="#eef2ff">
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
                Sube una foto clara y completa del acta de tu mesa. La IA leerá los votos de <strong>ambas elecciones</strong> (SJL y Lima) automáticamente — luego podrás corregir cualquier número antes de confirmar.
              </Typography>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} color="#eef2ff" mb={1}>
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
              <Box sx={{ background: "rgba(148,163,184,0.14)", p: 2, borderRadius: "12px" }}>
                <Typography variant="body1" fontWeight={600} color="#eef2ff">
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

              {fotoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoPreview}
                  alt="Foto del acta"
                  className="rounded-xl max-h-56 max-w-full w-auto mx-auto block"
                  style={{ objectFit: "contain" }}
                />
              )}

              {/* SJL siempre primero y con estilo destacado — es el conteo prioritario. */}
              <SeccionVotos
                ambito="sjl"
                titulo="San Juan de Lurigancho"
                subtitulo="Elección distrital — conteo prioritario"
                icon={<ApartmentIcon sx={{ color: "#1565c0" }} />}
                color="#1565c0"
                lista={porAmbito.sjl}
                estado={sjl}
                setEstado={setSjl}
                lectura={lecturaIA?.sjl ?? null}
              />

              <SeccionVotos
                ambito="lima"
                titulo="Lima Metropolitana"
                subtitulo="Elección provincial — secundaria"
                icon={<LocationCityIcon sx={{ color: "#7c3aed" }} />}
                color="#7c3aed"
                lista={porAmbito.lima}
                estado={lima}
                setEstado={setLima}
                lectura={lecturaIA?.lima ?? null}
              />

              <Typography variant="body2" fontWeight={700} color="#1565c0" textAlign="right">
                Total general: {totalGeneral} votos
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
                Se registraron {totalGeneral} votos de la mesa {personero?.numero_mesa} (SJL + Lima).
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
