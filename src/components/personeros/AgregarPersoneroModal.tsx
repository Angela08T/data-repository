"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogTitle, Button, CircularProgress, IconButton, TextField, Alert,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { supabase } from "@/lib/supabase";

const CONSULTA_MESA_URL = "https://consultaelectoral.onpe.gob.pe/inicio";

const COMUNAS = Array.from({ length: 18 }, (_, i) => i + 1);

export interface PersoneroCreado {
  id: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  dni: string;
  fecha_nacimiento: string;
  sexo: string;
  lugar_nacimiento: string;
  region: string;
  provincia: string;
  distrito: string;
  direccion: string;
  telefono: string;
  comuna: string | null;
  email: string | null;
  tipo_registro: string;
  registrador_nombres: string | null;
  registrador_apellidos: string | null;
  colegio_votacion: string | null;
  numero_mesa: string | null;
  fecha_registro: string | null;
  llamado: boolean | null;
  fecha_llamada: string | null;
  created_at: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (nuevo: PersoneroCreado) => void;
  registradorNombres: string;
  registradorApellidos: string;
}

const inputSx = { "& .MuiOutlinedInput-root": { borderRadius: "10px" } };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#1565c0" }}>
      {children}
    </p>
  );
}

const initialForm = {
  fechaRegistro: dayjs() as Dayjs | null,
  apellidoPaterno: "",
  apellidoMaterno: "",
  nombres: "",
  dni: "",
  fechaNacimiento: null as Dayjs | null,
  sexo: "" as "" | "M" | "F",
  lugarNacimiento: "",
  numeroMesa: "",
  colegioVotacion: "",
  region: "",
  provincia: "",
  distrito: "",
  direccion: "",
  telefono: "",
  comuna: "",
  email: "",
};

export default function AgregarPersoneroModal({ open, onClose, onCreated, registradorNombres, registradorApellidos }: Props) {
  const [form, setForm]       = useState(initialForm);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = <K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    if (saving) return;
    setForm(initialForm);
    setError(null);
    onClose();
  };

  const camposObligatoriosCompletos =
    !!form.fechaRegistro &&
    !!form.apellidoPaterno.trim() &&
    !!form.apellidoMaterno.trim() &&
    !!form.nombres.trim() &&
    !!form.dni.trim() &&
    !!form.fechaNacimiento &&
    !!form.sexo &&
    !!form.lugarNacimiento.trim() &&
    !!form.region.trim() &&
    !!form.provincia.trim() &&
    !!form.distrito.trim() &&
    !!form.direccion.trim();

  const handleSubmit = async () => {
    if (!camposObligatoriosCompletos) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      fecha_registro:      form.fechaRegistro!.format("YYYY-MM-DD"),
      apellido_paterno:    form.apellidoPaterno.trim(),
      apellido_materno:    form.apellidoMaterno.trim(),
      nombres:             form.nombres.trim(),
      dni:                 form.dni.trim(),
      fecha_nacimiento:    form.fechaNacimiento!.format("DD/MM/YYYY"),
      sexo:                form.sexo,
      lugar_nacimiento:    form.lugarNacimiento.trim(),
      numero_mesa:         form.numeroMesa.trim() || null,
      colegio_votacion:    form.colegioVotacion.trim() || null,
      region:              form.region.trim(),
      provincia:           form.provincia.trim(),
      distrito:            form.distrito.trim(),
      direccion:           form.direccion.trim(),
      telefono:            form.telefono.trim() || null,
      comuna:              form.comuna === "no_se" ? "No sé / No conozco mi comuna" : form.comuna ? `Comuna ${form.comuna}` : null,
      email:               form.email.trim() || null,
      tipo_registro:       "registrador",
      registrador_nombres: registradorNombres || null,
      registrador_apellidos: registradorApellidos || null,
    };

    const { data, error: insertError } = await supabase
      .from("personeros")
      .insert(payload)
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated(data as PersoneroCreado);
    setForm(initialForm);
  };

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
              <PersonAddIcon sx={{ fontSize: 18, color: "#fff" }} />
            </div>
            <div>
              <DialogTitle sx={{ p: 0, color: "#fff", fontWeight: 800, fontSize: "1rem", fontFamily: "'Poppins', sans-serif" }}>
                Agregar personero
              </DialogTitle>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem", margin: 0 }}>
                Se registrará como &quot;Por registrador&quot;
              </p>
            </div>
          </div>
          <IconButton onClick={handleClose} disabled={saving}
            sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { background: "rgba(255,255,255,0.12)" } }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </div>
      </div>

      <DialogContent sx={{ p: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <div className="space-y-5">

            {/* Fecha de registro */}
            <div>
              <SectionTitle>Fecha de registro</SectionTitle>
              <DatePicker
                value={form.fechaRegistro}
                onChange={(v) => set("fechaRegistro", v)}
                format="DD/MM/YYYY"
                enableAccessibleFieldDOMStructure={false}
                slotProps={{ textField: { size: "small", fullWidth: true, required: true, sx: inputSx } }}
              />
            </div>

            {/* Datos personales */}
            <div>
              <SectionTitle>Datos personales</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <TextField size="small" label="Apellido Paterno" required sx={inputSx}
                  value={form.apellidoPaterno} onChange={(e) => set("apellidoPaterno", e.target.value)} />
                <TextField size="small" label="Apellido Materno" required sx={inputSx}
                  value={form.apellidoMaterno} onChange={(e) => set("apellidoMaterno", e.target.value)} />
                <TextField size="small" label="Nombres" required sx={{ ...inputSx, gridColumn: "1 / -1" }}
                  value={form.nombres} onChange={(e) => set("nombres", e.target.value)} />
                <TextField size="small" label="DNI" required sx={inputSx}
                  slotProps={{ htmlInput: { maxLength: 8 } }}
                  value={form.dni} onChange={(e) => set("dni", e.target.value.replace(/\D/g, ""))} />
                <DatePicker
                  value={form.fechaNacimiento}
                  onChange={(v) => set("fechaNacimiento", v)}
                  format="DD/MM/YYYY"
                  label="Fecha de nacimiento"
                  enableAccessibleFieldDOMStructure={false}
                  slotProps={{ textField: { size: "small", required: true, sx: inputSx } }}
                />

                {/* Sexo */}
                <div className="flex items-center gap-2">
                  {([{ value: "M", label: "Masculino" }, { value: "F", label: "Femenino" }] as const).map((s) => (
                    <button key={s.value} type="button" onClick={() => set("sexo", s.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all"
                      style={form.sexo === s.value
                        ? { background: "#1565c0", color: "#fff", borderColor: "#1565c0" }
                        : { background: "#fff", color: "#64748b", borderColor: "#e2e8f0" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <TextField size="small" label="Lugar de nacimiento" required sx={inputSx}
                  value={form.lugarNacimiento} onChange={(e) => set("lugarNacimiento", e.target.value)} />
              </div>
            </div>

            {/* Datos electorales */}
            <div>
              <SectionTitle>Datos electorales</SectionTitle>
              <Alert
                icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />}
                severity="info"
                sx={{ borderRadius: "10px", mb: 2, fontSize: "0.78rem", py: 0.5 }}
              >
                ¿No sabes tu número de mesa o local de votación?{" "}
                {CONSULTA_MESA_URL ? (
                  <a href={CONSULTA_MESA_URL} target="_blank" rel="noopener noreferrer"
                    style={{ fontWeight: 700, color: "#1565c0" }}>
                    Consúltalo aquí
                  </a>
                ) : (
                  <span style={{ fontWeight: 700 }}>Consúltalo aquí</span>
                )}
              </Alert>
              <div className="grid grid-cols-2 gap-3">
                <TextField size="small" label="N° de mesa" sx={inputSx}
                  value={form.numeroMesa} onChange={(e) => set("numeroMesa", e.target.value)} />
                <TextField size="small" label="Colegio de votación" sx={inputSx}
                  value={form.colegioVotacion} onChange={(e) => set("colegioVotacion", e.target.value)} />
              </div>
            </div>

            {/* Domicilio actual */}
            <div>
              <SectionTitle>Domicilio actual</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <TextField size="small" label="Región" required sx={inputSx}
                  value={form.region} onChange={(e) => set("region", e.target.value)} />
                <TextField size="small" label="Provincia" required sx={inputSx}
                  value={form.provincia} onChange={(e) => set("provincia", e.target.value)} />
                <TextField size="small" label="Distrito" required sx={inputSx}
                  value={form.distrito} onChange={(e) => set("distrito", e.target.value)} />
                <TextField size="small" label="Teléfono" sx={inputSx}
                  value={form.telefono} onChange={(e) => set("telefono", e.target.value.replace(/\D/g, ""))} />
                <TextField size="small" label="Av. / Calle / Jirón / Urb. / AA.HH. / Sector" required
                  sx={{ ...inputSx, gridColumn: "1 / -1" }}
                  value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />

                {/* Comuna */}
                <TextField size="small" select label="Comuna" sx={inputSx}
                  slotProps={{ select: { native: true } }}
                  value={form.comuna} onChange={(e) => set("comuna", e.target.value)}>
                  <option value=""></option>
                  {COMUNAS.map((n) => (
                    <option key={n} value={n}>Comuna {n}</option>
                  ))}
                  <option value="no_se">No sé / No conozco mi comuna</option>
                </TextField>

                <TextField size="small" label="Correo electrónico" type="email" sx={inputSx}
                  value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>

            {error && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>{error}</Alert>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <Button fullWidth variant="outlined" onClick={handleClose} disabled={saving}
                sx={{
                  borderRadius: "12px", textTransform: "none", fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif", borderColor: "#e2e8f0", color: "#64748b",
                  "&:hover": { borderColor: "#cbd5e1", background: "#f8fafc" },
                }}>
                Cancelar
              </Button>
              <Button fullWidth variant="contained" onClick={handleSubmit} disabled={saving}
                startIcon={saving ? undefined : <PersonAddIcon />}
                sx={{
                  borderRadius: "12px", textTransform: "none", fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                  background: "linear-gradient(135deg, #1565c0, #1976d2)",
                  boxShadow: "0 4px 14px rgba(21,101,192,0.35)",
                  "&:hover": { background: "linear-gradient(135deg, #0d47a1, #1565c0)" },
                }}>
                {saving ? <CircularProgress size={20} color="inherit" /> : "Guardar personero"}
              </Button>
            </div>
          </div>
        </LocalizationProvider>
      </DialogContent>
    </Dialog>
  );
}
