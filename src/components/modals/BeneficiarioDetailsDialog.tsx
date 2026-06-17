"use client";

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import { Close, Person } from "@mui/icons-material";

export interface CampoDetalle {
  label: string;
  value: React.ReactNode;
  /** Si es true, ocupa todo el ancho disponible */
  fullWidth?: boolean;
}

export interface SeccionDetalle {
  titulo: string;
  campos: CampoDetalle[];
}

export interface BeneficiarioDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  isLoading?: boolean;
  /** Secciones de campos a mostrar */
  secciones?: SeccionDetalle[];
  /** Contenido personalizado (alternativa a secciones) */
  children?: React.ReactNode;
}

function CampoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box mb={2}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value ?? "-"}
      </Typography>
    </Box>
  );
}

/**
 * Dialog genérico para mostrar los detalles de un beneficiario.
 *
 * Uso con secciones:
 * ```tsx
 * <BeneficiarioDetailsDialog
 *   open={detailOpen}
 *   onClose={handleCloseDetail}
 *   title="Ficha del Beneficiario"
 *   accentColor="#d81b7e"
 *   secciones={[
 *     {
 *       titulo: "Datos Personales",
 *       campos: [
 *         { label: "Nombre", value: item.nombre },
 *         { label: "DNI", value: item.dni },
 *       ],
 *     },
 *   ]}
 * />
 * ```
 *
 * Uso con children (contenido personalizado):
 * ```tsx
 * <BeneficiarioDetailsDialog open={detailOpen} onClose={handleCloseDetail} title="Detalles">
 *   <MyCustomContent />
 * </BeneficiarioDetailsDialog>
 * ```
 */
export function BeneficiarioDetailsDialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  accentColor = "#475569",
  isLoading = false,
  secciones,
  children,
}: BeneficiarioDetailsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px", maxHeight: "90vh" } }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          {icon ?? <Person sx={{ color: accentColor }} />}
          <Box>
            <Typography variant="h6" fontWeight={600} color="#334155">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={6}>
            <CircularProgress size={40} sx={{ color: accentColor }} />
          </Box>
        ) : children ? (
          children
        ) : secciones ? (
          secciones.map((seccion, si) => (
            <Box key={si} mb={si < secciones.length - 1 ? 3 : 0}>
              <Typography variant="subtitle2" fontWeight={600} color="#475569" gutterBottom>
                {seccion.titulo}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {seccion.campos.map((campo, ci) => (
                  <Grid
                    key={ci}
                    size={campo.fullWidth ? 12 : { xs: 12, sm: 6, md: 4 }}
                  >
                    <CampoItem label={campo.label} value={campo.value} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: "#64748b" }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
