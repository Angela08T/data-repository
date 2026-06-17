"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Close, WhatsApp, Cake, Send, Warning } from "@mui/icons-material";
import { PersonaParaEnvio, MODULO_CONFIG, ModuloType } from "../types";

// Interface que viene de lista-general (PersonaUnificada)
interface PersonaUnificada {
  id: string;
  modulo: ModuloType;
  moduloLabel: string;
  entidadNombre: string;
  entidadCodigo: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  cumpleanos: string | null;
  rol: string;
}

interface WhatsAppMessageDialogProps {
  open: boolean;
  onClose: () => void;
  personas: PersonaUnificada[];
  onConfirm: (personas: PersonaParaEnvio[]) => Promise<void>;
  calcularEdad: (fecha: string) => number;
}

// Formatear teléfono con prefijo +51
const formatearTelefono = (telefono: string | null | undefined): string => {
  if (!telefono || telefono.trim() === "") return "";
  const telefonoLimpio = telefono.trim();
  if (telefonoLimpio.startsWith("+51")) {
    return telefonoLimpio;
  }
  if (telefonoLimpio.startsWith("51") && telefonoLimpio.length >= 11) {
    return `+${telefonoLimpio}`;
  }
  return `+51${telefonoLimpio}`;
};

export default function WhatsAppMessageDialog({
  open,
  onClose,
  personas,
  onConfirm,
  calcularEdad,
}: WhatsAppMessageDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(personas.map((p) => p.id))
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrar personas con teléfono válido
  const personasConTelefono = personas.filter(
    (p) => p.telefono && p.telefono.trim() !== "" && p.cumpleanos
  );

  const personasSinTelefono = personas.filter(
    (p) => !p.telefono || p.telefono.trim() === "" || !p.cumpleanos
  );

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === personasConTelefono.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(personasConTelefono.map((p) => p.id)));
    }
  };

  const handleConfirm = async () => {
    setError(null);
    setSending(true);

    try {
      const personasSeleccionadas: PersonaParaEnvio[] = personasConTelefono
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({
          personaId: p.id,
          nombre: p.nombre,
          apellido: p.apellido,
          telefono: formatearTelefono(p.telefono),
          edad: p.cumpleanos ? calcularEdad(p.cumpleanos) : 0,
          modulo: p.modulo,
          entidadNombre: p.entidadNombre,
        }));

      await onConfirm(personasSeleccionadas);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar mensajes");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setError(null);
      onClose();
    }
  };

  // Resetear selección cuando cambian las personas
  const resetSelection = () => {
    setSelectedIds(new Set(personasConTelefono.map((p) => p.id)));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px" },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "#dcfce7",
          borderBottom: "1px solid #bbf7d0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <WhatsApp sx={{ color: "#25D366", fontSize: 28 }} />
          <Typography variant="h6" fontWeight={600} color="#166534">
            Enviar Saludo de Cumpleaños
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={sending}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Alerta de personas sin teléfono */}
        {personasSinTelefono.length > 0 && (
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{ borderRadius: 0 }}
          >
            {personasSinTelefono.length} persona(s) no tienen teléfono o fecha de cumpleaños registrada
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {error}
          </Alert>
        )}

        {/* Header de selección */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Checkbox
              checked={selectedIds.size === personasConTelefono.length && personasConTelefono.length > 0}
              indeterminate={selectedIds.size > 0 && selectedIds.size < personasConTelefono.length}
              onChange={handleSelectAll}
              disabled={sending}
            />
            <Typography variant="body2" color="text.secondary">
              {selectedIds.size} de {personasConTelefono.length} seleccionados
            </Typography>
          </Box>
          <Button size="small" onClick={resetSelection} disabled={sending}>
            Seleccionar todos
          </Button>
        </Box>

        {/* Lista de personas */}
        <List
          sx={{
            maxHeight: 350,
            overflow: "auto",
            py: 0,
          }}
        >
          {personasConTelefono.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No hay personas con teléfono válido"
                secondary="Verifica que las personas tengan número de teléfono registrado"
                sx={{ textAlign: "center", py: 4 }}
              />
            </ListItem>
          ) : (
            personasConTelefono.map((persona, index) => (
              <Box key={persona.id}>
                <ListItem
                  sx={{
                    "&:hover": { backgroundColor: "#f8fafc" },
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 42 }}>
                    <Checkbox
                      checked={selectedIds.has(persona.id)}
                      onChange={() => handleToggle(persona.id)}
                      disabled={sending}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight={500}>
                          {persona.nombre} {persona.apellido}
                        </Typography>
                        <Chip
                          size="small"
                          label={MODULO_CONFIG[persona.modulo].label}
                          sx={{
                            backgroundColor: MODULO_CONFIG[persona.modulo].color,
                            color: "white",
                            fontSize: "0.65rem",
                            height: 20,
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          {formatearTelefono(persona.telefono)}
                        </Typography>
                        {persona.cumpleanos && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Cake sx={{ fontSize: 14, color: "#d81b7e" }} />
                            <Typography variant="body2" color="#d81b7e">
                              {calcularEdad(persona.cumpleanos)} años
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < personasConTelefono.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </List>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: "1px solid #e2e8f0",
          gap: 1,
        }}
      >
        <Button onClick={handleClose} disabled={sending} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={sending || selectedIds.size === 0}
          startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send />}
          sx={{
            backgroundColor: "#25D366",
            "&:hover": { backgroundColor: "#128C7E" },
          }}
        >
          {sending
            ? "Enviando..."
            : `Enviar a ${selectedIds.size} persona${selectedIds.size !== 1 ? "s" : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
