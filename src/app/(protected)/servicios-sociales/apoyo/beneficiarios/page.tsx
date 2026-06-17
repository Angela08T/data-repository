"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Grid,
} from "@mui/material";
import {
  FileDownload,
  Refresh,
  Search,
  Visibility,
  Close,
  VolunteerActivism,
  Badge,
  Phone,
  CalendarMonth,
  PersonSearch,
  Edit,
  Delete,
  LocationOn,
} from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import * as XLSX from "xlsx";
import { formatearFecha, formatearTelefono } from "@/lib/utils/formatters";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.SERVICIOS_SOCIALES];
const MODULE_COLOR = subgerencia.color;

// ============================================
// TIPOS
// ============================================
interface SupBackend {
  id: string;
  district: string;
  populated: string;
  lastname: string;
  name: string;
  dni: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: SupBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

interface SupTabla {
  id: string;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  distrito: string;
  poblado: string;
  fechaRegistro: string;
}

// ============================================
// UTILIDADES
// ============================================
const toTitleCase = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const mapToTabla = (item: SupBackend): SupTabla => ({
  id: item.id,
  nombreCompleto: toTitleCase(`${item.name} ${item.lastname}`),
  nombre: toTitleCase(item.name),
  apellido: toTitleCase(item.lastname),
  dni: item.dni,
  telefono: item.phone,
  distrito: toTitleCase(item.district),
  poblado: toTitleCase(item.populated),
  fechaRegistro: item.created_at,
});

// ============================================
// COMPONENTE DETALLE
// ============================================
interface DetalleSupProps {
  beneficiario: SupTabla | null;
  onClose: () => void;
}

function DetalleSup({ beneficiario, onClose }: DetalleSupProps) {
  return (
    <>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: MODULE_COLOR,
          color: "white",
          py: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <PersonSearch />
          <Typography variant="h6" fontWeight={600}>
            Datos del Beneficiario
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {!beneficiario ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress sx={{ color: MODULE_COLOR }} />
          </Box>
        ) : (
          <Box>
            {/* Header de identidad */}
            <Box
              sx={{
                textAlign: "center",
                mb: 3,
                p: 2,
                bgcolor: `${MODULE_COLOR}10`,
                borderRadius: 2,
                border: `1px solid ${MODULE_COLOR}30`,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: MODULE_COLOR,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1.5,
                }}
              >
                <Typography variant="h5" color="white" fontWeight={700}>
                  {beneficiario.nombre.charAt(0)}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {beneficiario.nombreCompleto}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                DNI: {beneficiario.dni}
              </Typography>
            </Box>

            {/* Identificación */}
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color={MODULE_COLOR}
              sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Badge fontSize="small" />
              Identificación
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Nombres
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {beneficiario.nombre}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Apellidos
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {beneficiario.apellido}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  DNI
                </Typography>
                <Typography variant="body2" fontWeight={500} fontFamily="monospace">
                  {beneficiario.dni}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Teléfono
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatearTelefono(beneficiario.telefono)}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            {/* Ubicación */}
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color={MODULE_COLOR}
              sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <LocationOn fontSize="small" />
              Ubicación
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Distrito
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {beneficiario.distrito}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Poblado / Sector
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {beneficiario.poblado}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            {/* Registro */}
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color={MODULE_COLOR}
              sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <CalendarMonth fontSize="small" />
              Registro
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Fecha de Registro
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatearFecha(beneficiario.fechaRegistro)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderColor: MODULE_COLOR, color: MODULE_COLOR }}>
          Cerrar
        </Button>
      </DialogActions>
    </>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function ApoyoBeneficiariosPage() {
  const [rawData, setRawData] = useState<SupTabla[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [fetchKey, setFetchKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleBeneficiario, setDetalleBeneficiario] = useState<SupTabla | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { canUpdate, canDelete } = usePermissions();
  const { getData } = useFetch();
  const dataFormateados = useFormatTableData(rawData);

  // Debounce búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("limit", String(rowsPerPage));
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const response = await getData<BackendResponse>(`support/sup?${params.toString()}`);
      if (response?.data) {
        setRawData(response.data.data.map(mapToTabla));
        setTotalCount(response.data.totalCount);
      }
    } catch {
      setRawData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, debouncedSearch, fetchKey, getData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => { setPage(0); setFetchKey((k) => k + 1); };

  const handleVerDetalle = (b: SupTabla) => {
    setDetalleBeneficiario(b);
    setDetalleOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const fechaISO = new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams({ limit: "99999", page: "1" });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const response = await getData<BackendResponse>(`support/sup?${params.toString()}`);
      if (!response?.data) return;

      const exportData = response.data.data.map((item: SupBackend, index: number) => ({
        "#": index + 1,
        "Apellidos": toTitleCase(item.lastname),
        "Nombres": toTitleCase(item.name),
        "DNI": item.dni,
        "Teléfono": formatearTelefono(item.phone),
        "Distrito": toTitleCase(item.district),
        "Poblado / Sector": toTitleCase(item.populated),
        "Fecha Registro": formatearFecha(item.created_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = [
        { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 12 },
        { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 18 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Apoyo");
      XLSX.writeFile(workbook, `apoyo_beneficiarios_${fechaISO}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Box
            sx={{
              background: `linear-gradient(135deg, ${MODULE_COLOR}15 0%, ${MODULE_COLOR}30 100%)`,
              color: MODULE_COLOR,
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              boxShadow: `0 4px 12px ${MODULE_COLOR}25`,
            }}
          >
            <VolunteerActivism sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: MODULE_COLOR }}>
            Apoyo — Beneficiarios
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ ml: 7.5 }}>
          Registro de beneficiarios del programa de Apoyo Social
        </Typography>
      </Box>

      {/* Tarjeta principal */}
      <Card sx={{ borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <CardContent sx={{ p: 3 }}>
          {/* Buscador y acciones */}
          <Box mb={2} display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              placeholder="Buscar por nombre o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "#64748b", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: 280,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  "&:hover fieldset": { borderColor: "#64748b" },
                  "&.Mui-focused fieldset": { borderColor: MODULE_COLOR },
                },
              }}
            />

            <Box sx={{ flex: 1 }} />

            <Tooltip title="Actualizar datos">
              <IconButton
                onClick={handleRefresh}
                sx={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", "&:hover": { backgroundColor: "#e2e8f0" } }}
              >
                <Refresh sx={{ color: "#64748b", fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Descargar listado en formato Excel">
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownload />}
                  onClick={handleExport}
                  disabled={isLoading || isExporting || dataFormateados.length === 0}
                  sx={{
                    borderColor: "#22c55e",
                    color: "#16a34a",
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": { backgroundColor: "#dcfce7", borderColor: "#16a34a" },
                    "&.Mui-disabled": { opacity: 0.4 },
                  }}
                >
                  Exportar Excel
                </Button>
              </span>
            </Tooltip>

            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              {isLoading ? "Cargando..." : `${totalCount.toLocaleString()} beneficiario(s)`}
            </Typography>
          </Box>

          {/* Tabla */}
          <Paper sx={{ borderRadius: "12px", boxShadow: "none", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {isLoading ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
                <CircularProgress sx={{ color: MODULE_COLOR }} />
                <Typography variant="body2" color="text.secondary">Cargando registros...</Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {["#", "Nombre Completo", "DNI", "Teléfono", "Distrito", "Poblado / Sector", "F. Registro", ""].map((col, i) => (
                          <TableCell
                            key={i}
                            align={i === 0 || i === 7 ? "center" : "left"}
                            sx={{
                              backgroundColor: MODULE_COLOR,
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              whiteSpace: "nowrap",
                              py: 1.5,
                            }}
                          >
                            {col}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {dataFormateados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                            <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                              <PersonSearch sx={{ fontSize: 40, color: "text.disabled" }} />
                              <Typography color="text.secondary">
                                {debouncedSearch ? "No se encontraron resultados" : "No hay beneficiarios registrados"}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        dataFormateados.map((row, index) => (
                          <TableRow
                            key={row.id}
                            hover
                            sx={{
                              backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                              "&:hover": { backgroundColor: `${MODULE_COLOR}10`, cursor: "pointer" },
                              transition: "background-color 0.15s",
                            }}
                            onClick={() => handleVerDetalle(row)}
                          >
                            <TableCell align="center" sx={{ color: "text.disabled", fontSize: "0.75rem", width: 48 }}>
                              {page * rowsPerPage + index + 1}
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={600} color="text.primary">
                                {row.nombreCompleto}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace">
                                {row.dni}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2">
                                {formatearTelefono(row.telefono)}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={row.distrito}
                                size="small"
                                sx={{ backgroundColor: `${MODULE_COLOR}15`, color: MODULE_COLOR, fontWeight: 600, fontSize: "0.72rem", height: 22 }}
                              />
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {row.poblado}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatearFecha(row.fechaRegistro)}
                              </Typography>
                            </TableCell>

                            <TableCell align="center" sx={{ width: 110, whiteSpace: "nowrap" }}>
                              <Box display="flex" alignItems="center" justifyContent="center">
                                <Tooltip title="Ver detalle">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); handleVerDetalle(row); }}
                                    sx={{ color: MODULE_COLOR }}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {canUpdate("SUP") && (
                                  <Tooltip title="Editar">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => { e.stopPropagation(); /* TODO: editar */ }}
                                      sx={{ color: "#0891b2", "&:hover": { backgroundColor: "rgba(8,145,178,0.1)" } }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {canDelete("SUP") && (
                                  <Tooltip title="Eliminar">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => { e.stopPropagation(); /* TODO: eliminar */ }}
                                      sx={{ color: "#dc2626", "&:hover": { backgroundColor: "rgba(220,38,38,0.1)" } }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={totalCount}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  labelRowsPerPage="Filas por página:"
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}–${to} de ${count !== -1 ? count.toLocaleString() : `más de ${to}`}`
                  }
                  sx={{
                    borderTop: "1px solid #e2e8f0",
                    mt: 2,
                    "& .MuiTablePagination-select": { fontWeight: 500 },
                  }}
                />
              </>
            )}
          </Paper>
        </CardContent>
      </Card>

      {/* Modal Detalle */}
      <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="sm" fullWidth>
        <DetalleSup
          beneficiario={detalleBeneficiario}
          onClose={() => setDetalleOpen(false)}
        />
      </Dialog>
    </Box>
  );
}
