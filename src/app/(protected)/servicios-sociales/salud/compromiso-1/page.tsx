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
  Popover,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
} from "@mui/material";
import {
  FileDownload,
  Refresh,
  Search,
  Visibility,
  Close,
  ChildCare,
  Badge,
  Phone,
  CalendarMonth,
  PersonSearch,
  Edit,
  Delete,
  FilterList,
  Clear,
  Cake,
  PhoneEnabled,
  PhoneDisabled,
  Male,
  Female,
} from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import * as XLSX from "xlsx";
import { formatearFecha, MESES } from "@/lib/utils/formatters";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.SERVICIOS_SOCIALES];
const MODULE_COLOR = subgerencia.color; // #00a3a8

type FilterType = "edad" | "cumpleanos" | "telefono" | "sexo";

// ============================================
// TIPOS
// ============================================
interface MadreBackend {
  id: string;
  name: string;
  lastname: string;
  doc_num: string;
  phone: string | null;
  birthday: string | null;
  sex: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  doc_type: string;
}

interface BackendResponse {
  message: string;
  data: {
    data: MadreBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

interface MadreTabla {
  id: string;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  tipoDoc: string;
  numDoc: string;
  telefono: string | null;
  sexo: string;
  fechaNacimiento: string | null;
  edad: number | null;
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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatearTelefono = (tel: string | null | undefined): string => {
  if (!tel) return "-";
  const limpio = tel.replace(/\D/g, "");
  if (limpio.length === 9) {
    return `${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
  }
  return tel;
};

const calcularEdad = (fechaNacimiento: string | null | undefined): number | null => {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const mes = hoy.getUTCMonth() - nacimiento.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) {
    edad--;
  }
  return edad;
};

// ============================================
// MAPEO DE DATOS
// ============================================
const mapToTabla = (item: MadreBackend): MadreTabla => ({
  id: item.id,
  nombreCompleto: toTitleCase(`${item.name} ${item.lastname}`),
  nombre: toTitleCase(item.name),
  apellido: toTitleCase(item.lastname),
  tipoDoc: item.doc_type,
  numDoc: item.doc_num,
  telefono: item.phone,
  sexo: item.sex || "",
  fechaNacimiento: item.birthday,
  edad: calcularEdad(item.birthday),
  fechaRegistro: item.created_at,
});

// ============================================
// COMPONENTE DE DETALLE
// ============================================
interface DetalleMadreProps {
  madre: MadreTabla | null;
  isLoading: boolean;
  onClose: () => void;
}

function DetalleMadre({ madre, isLoading, onClose }: DetalleMadreProps) {
  const edad = madre ? calcularEdad(madre.fechaNacimiento) : null;

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
            Datos de la Madre
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {isLoading || !madre ? (
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
                  {madre.nombre.charAt(0)}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {madre.nombreCompleto}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {madre.tipoDoc} · {madre.numDoc}
              </Typography>
            </Box>

            {/* Datos de Identificación */}
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
                  {madre.nombre}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Apellidos
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {madre.apellido}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Tipo de Documento
                </Typography>
                <Chip
                  label={madre.tipoDoc}
                  size="small"
                  sx={{ backgroundColor: `${MODULE_COLOR}20`, color: MODULE_COLOR, fontWeight: 600 }}
                />
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  N° de Documento
                </Typography>
                <Typography variant="body2" fontWeight={500} fontFamily="monospace">
                  {madre.numDoc}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            {/* Datos de Contacto */}
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color={MODULE_COLOR}
              sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Phone fontSize="small" />
              Contacto y Nacimiento
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Teléfono / Celular
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatearTelefono(madre.telefono) || "-"}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Fecha de Nacimiento
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatearFecha(madre.fechaNacimiento)}
                </Typography>
              </Grid>
              {edad !== null && (
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Edad
                  </Typography>
                  <Chip
                    label={`${edad} años`}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: MODULE_COLOR, color: MODULE_COLOR }}
                  />
                </Grid>
              )}
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
                  {formatearFecha(madre.fechaRegistro)}
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
export default function Compromiso1Page() {
  // --- Estado: Datos ---
  const [rawData, setRawData] = useState<MadreTabla[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- Estado: Paginación ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [fetchKey, setFetchKey] = useState(0);

  // --- Estado: Búsqueda ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // --- Estado: Filtros avanzados ---
  const [filterType, setFilterType] = useState<FilterType>("edad");
  const [edadRange, setEdadRange] = useState<number[]>([0, 110]);
  const [edadRangePending, setEdadRangePending] = useState<number[]>([0, 110]);
  const [filtroMes, setFiltroMes] = useState<number | "">("");
  const [filtroDia, setFiltroDia] = useState("");
  const [filtroTelefono, setFiltroTelefono] = useState<"" | "con" | "sin">("");
  const [filtroTelefonoDraft, setFiltroTelefonoDraft] = useState<"" | "con" | "sin">("");
  const [filtroSexo, setFiltroSexo] = useState<"" | "MALE" | "FEMALE">("");
  const [filtroSexoDraft, setFiltroSexoDraft] = useState<"" | "MALE" | "FEMALE">("");
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null);
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});

  // --- Estado: Detalle ---
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleMadre, setDetalleMadre] = useState<MadreTabla | null>(null);

  const { canUpdate, canDelete, canShowObservacion } = usePermissions();
  const { getData } = useFetch();
  const dataFormateados = useFormatTableData(rawData);

  // --- Debounce búsqueda ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- Fetch de datos ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("limit", String(rowsPerPage));

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      if (edadRange[0] > 0 || edadRange[1] < 110) {
        params.set("age_min", String(edadRange[0]));
        params.set("age_max", String(edadRange[1]));
      }
      if (filtroMes && filtroDia) {
        const mm = String(filtroMes).padStart(2, "0");
        const dd = String(filtroDia).padStart(2, "0");
        params.set("birthday", `${mm}-${dd}`);
      } else if (filtroMes) {
        params.set("month", String(filtroMes));
      }
      if (filtroTelefono === "con") {
        params.set("phone", "true");
      } else if (filtroTelefono === "sin") {
        params.set("phone", "false");
      }
      if (filtroSexo) {
        params.set("sex", filtroSexo);
      }

      const response = await getData<BackendResponse>(`compromise/mother?${params.toString()}`);

      if (response?.data) {
        setRawData(response.data.data.map(mapToTabla));
        setTotalCount(response.data.totalCount);
      }
    } catch (error) {
      console.error("Error al cargar madres:", error);
      setRawData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, fetchKey, edadRange, filtroMes, filtroDia, filtroTelefono, filtroSexo, getData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---
  const handleRefresh = () => { setPage(0); setFetchKey((k) => k + 1); };

  const limpiarFiltros = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setEdadRange([0, 110]);
    setEdadRangePending([0, 110]);
    setFiltroMes("");
    setFiltroDia("");
    setFiltroTelefono("");
    setFiltroTelefonoDraft("");
    setFiltroSexo("");
    setFiltroSexoDraft("");
    setPage(0);
    setFetchKey((k) => k + 1);
  };

  const filterOpen = Boolean(filterAnchor);
  const isEdadFiltered = edadRange[0] > 0 || edadRange[1] < 110;
  const hayFiltrosActivos = searchTerm || filtroDia || filtroMes || isEdadFiltered || filtroTelefono || filtroSexo;

  const handleVerDetalle = (madre: MadreTabla) => {
    setDetalleMadre(madre);
    setDetalleOpen(true);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const fechaISO = new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams();
      params.set("limit", "99999");
      params.set("page", "1");
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (edadRange[0] > 0 || edadRange[1] < 110) {
        params.set("age_min", String(edadRange[0]));
        params.set("age_max", String(edadRange[1]));
      }
      if (filtroMes && filtroDia) {
        const mm = String(filtroMes).padStart(2, "0");
        const dd = String(filtroDia).padStart(2, "0");
        params.set("birthday", `${mm}-${dd}`);
      } else if (filtroMes) {
        params.set("month", String(filtroMes));
      }
      if (filtroSexo) params.set("sex", filtroSexo);
      const response = await getData<BackendResponse>(`compromise/mother?${params.toString()}`);
      if (!response?.data) return;
      const exportData = response.data.data.map((item: MadreBackend, index: number) => ({
        "#": index + 1,
        "Nombre Completo": toTitleCase(`${item.name} ${item.lastname}`),
        "Tipo Documento": item.doc_type,
        "N° Documento": item.doc_num,
        Teléfono: formatearTelefono(item.phone),
        Sexo: item.sex === "MALE" ? "Masculino" : item.sex === "FEMALE" ? "Femenino" : "-",
        "Fecha Nacimiento": formatearFecha(item.birthday),
        "Fecha Registro": formatearFecha(item.created_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const colWidths = [
        { wch: 5 },
        { wch: 35 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
      ];
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Madres");
      XLSX.writeFile(workbook, `compromiso1_madres_${fechaISO}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box>
      {/* ── Header ── */}
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
            <ChildCare sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: MODULE_COLOR }}>
            Compromiso 1 · Bajo Hierro
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ ml: 7.5 }}>
          Registro de madres con niños diagnosticados con anemia (bajo hierro)
        </Typography>
      </Box>

      {/* ── Tarjeta principal ── */}
      <Card
        sx={{
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* ── Buscador y acciones ── */}
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

            {/* Filtros avanzados */}
            <Tooltip title="Filtros de edad y cumpleaños">
              <IconButton
                onClick={(e) => setFilterAnchor(e.currentTarget)}
                sx={{
                  backgroundColor:
                    filterOpen || isEdadFiltered || filtroDia || filtroMes || filtroTelefono || filtroSexo
                      ? "#e0f7f7"
                      : "#f8fafc",
                  border: `1px solid ${
                    filterOpen || isEdadFiltered || filtroDia || filtroMes || filtroTelefono || filtroSexo
                      ? MODULE_COLOR
                      : "#e2e8f0"
                  }`,
                  borderRadius: "8px",
                  "&:hover": { backgroundColor: "#e0f7f7", borderColor: MODULE_COLOR },
                }}
              >
                <FilterList
                  sx={{
                    color:
                      filterOpen || isEdadFiltered || filtroDia || filtroMes || filtroTelefono || filtroSexo
                        ? MODULE_COLOR
                        : "#64748b",
                    fontSize: 20,
                  }}
                />
              </IconButton>
            </Tooltip>

            {/* Chips inline filtros activos */}
            {isEdadFiltered && (
              <Box sx={{ backgroundColor: "#dbeafe", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="caption" color="#1e40af">
                  Edad: {edadRange[0]} - {edadRange[1]} años
                </Typography>
                <IconButton size="small" onClick={() => { setEdadRange([0, 110]); setEdadRangePending([0, 110]); setPage(0); setFetchKey((k) => k + 1); }} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: "#1e40af" }} />
                </IconButton>
              </Box>
            )}
            {(filtroDia || filtroMes) && (
              <Box sx={{ backgroundColor: "#e0f7f7", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Cake sx={{ fontSize: 14, color: MODULE_COLOR }} />
                <Typography variant="caption" color={MODULE_COLOR}>
                  {filtroMes && !filtroDia && MESES.find((m) => m.value === filtroMes)?.label}
                  {filtroDia && filtroMes && `${filtroDia}/${filtroMes}`}
                  {filtroDia && !filtroMes && `Día ${filtroDia}`}
                </Typography>
                <IconButton size="small" onClick={() => { setFiltroDia(""); setFiltroMes(""); setPage(0); setFetchKey((k) => k + 1); }} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: MODULE_COLOR }} />
                </IconButton>
              </Box>
            )}

            <Box sx={{ flex: 1 }} />

            {hayFiltrosActivos && (
              <Tooltip title="Limpiar todos los filtros">
                <IconButton onClick={limpiarFiltros} size="small" sx={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <Clear sx={{ color: "#64748b", fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Actualizar datos">
              <IconButton
                onClick={handleRefresh}
                sx={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  "&:hover": { backgroundColor: "#e2e8f0" },
                }}
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
              {isLoading ? "Cargando..." : `${totalCount.toLocaleString()} madre(s)`}
            </Typography>
          </Box>

          {/* ── Popover filtros avanzados ── */}
          <Popover
            open={filterOpen}
            anchorEl={filterAnchor}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            sx={{ mt: 1 }}
          >
            <Box sx={{ p: 2.5, width: 320 }}>
              <Typography variant="subtitle2" fontWeight={600} color="#334155" mb={1.5}>
                Tipo de filtro
              </Typography>
              <ToggleButtonGroup
                value={filterType}
                exclusive
                onChange={(_e, v) => { if (v !== null) setFilterType(v); }}
                size="small"
                fullWidth
                sx={{ mb: 2.5 }}
              >
                <ToggleButton
                  value="edad"
                  sx={{
                    textTransform: "none",
                    fontSize: "0.75rem",
                    "&.Mui-selected": { backgroundColor: "#dbeafe", color: "#1e40af", "&:hover": { backgroundColor: "#bfdbfe" } },
                  }}
                >
                  Edad
                </ToggleButton>
                <ToggleButton
                  value="cumpleanos"
                  sx={{
                    textTransform: "none",
                    fontSize: "0.75rem",
                    "&.Mui-selected": { backgroundColor: "#e0f7f7", color: MODULE_COLOR, "&:hover": { backgroundColor: "#b2ebf2" } },
                  }}
                >
                  Cumpleaños
                </ToggleButton>
                <ToggleButton
                  value="telefono"
                  sx={{
                    textTransform: "none",
                    fontSize: "0.75rem",
                    "&.Mui-selected": { backgroundColor: "#dcfce7", color: "#16a34a", "&:hover": { backgroundColor: "#bbf7d0" } },
                  }}
                >
                  Teléfono
                </ToggleButton>
                <ToggleButton
                  value="sexo"
                  sx={{
                    textTransform: "none",
                    fontSize: "0.75rem",
                    "&.Mui-selected": { backgroundColor: "#fce7f3", color: "#db2777", "&:hover": { backgroundColor: "#fbcfe8" } },
                  }}
                >
                  Sexo
                </ToggleButton>
              </ToggleButtonGroup>

              <Divider sx={{ mb: 2 }} />

              {filterType === "edad" && (
                <>
                  <Typography variant="body2" color="#475569" mb={1.5}>
                    Rango de edad
                  </Typography>
                  <Slider
                    value={edadRangePending}
                    onChange={(_e, v) => setEdadRangePending(v as number[])}
                    valueLabelDisplay="auto"
                    min={0}
                    max={110}
                    sx={{ color: "#3b82f6", "& .MuiSlider-thumb": { backgroundColor: "#1e40af" } }}
                  />
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="caption" color="text.secondary">{edadRangePending[0]} años</Typography>
                    <Typography variant="caption" color="text.secondary">{edadRangePending[1]} años</Typography>
                  </Box>
                </>
              )}

              {filterType === "cumpleanos" && (
                <>
                  <Typography variant="body2" color="#475569" mb={1.5}>
                    Filtrar por cumpleaños
                  </Typography>
                  <TextField
                    select
                    size="small"
                    label="Mes"
                    fullWidth
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value as number | "")}
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value="">Todos los meses</MenuItem>
                    {MESES.map((m) => (
                      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label="Día (opcional)"
                    type="number"
                    fullWidth
                    value={filtroDia}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 31)) setFiltroDia(v);
                    }}
                    slotProps={{ htmlInput: { min: 1, max: 31 } }}
                    helperText="Selecciona un día específico (opcional)"
                  />
                </>
              )}

              {filterType === "telefono" && (
                <>
                  <Typography variant="body2" color="#475569" mb={1.5}>
                    Filtrar por celular registrado
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant={filtroTelefonoDraft === "con" ? "contained" : "outlined"}
                      startIcon={<PhoneEnabled fontSize="small" />}
                      onClick={() => setFiltroTelefonoDraft(filtroTelefonoDraft === "con" ? "" : "con")}
                      sx={{
                        flex: 1,
                        textTransform: "none",
                        borderColor: "#16a34a",
                        color: filtroTelefonoDraft === "con" ? "white" : "#16a34a",
                        backgroundColor: filtroTelefonoDraft === "con" ? "#16a34a" : "transparent",
                        "&:hover": { backgroundColor: filtroTelefonoDraft === "con" ? "#15803d" : "#dcfce7" },
                      }}
                    >
                      Con celular
                    </Button>
                    <Button
                      size="small"
                      variant={filtroTelefonoDraft === "sin" ? "contained" : "outlined"}
                      startIcon={<PhoneDisabled fontSize="small" />}
                      onClick={() => setFiltroTelefonoDraft(filtroTelefonoDraft === "sin" ? "" : "sin")}
                      sx={{
                        flex: 1,
                        textTransform: "none",
                        borderColor: "#dc2626",
                        color: filtroTelefonoDraft === "sin" ? "white" : "#dc2626",
                        backgroundColor: filtroTelefonoDraft === "sin" ? "#dc2626" : "transparent",
                        "&:hover": { backgroundColor: filtroTelefonoDraft === "sin" ? "#b91c1c" : "#fee2e2" },
                      }}
                    >
                      Sin celular
                    </Button>
                  </Box>
                </>
              )}

              {filterType === "sexo" && (
                <>
                  <Typography variant="body2" color="#475569" mb={1.5}>
                    Filtrar por sexo
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant={filtroSexoDraft === "MALE" ? "contained" : "outlined"}
                      startIcon={<Male fontSize="small" />}
                      onClick={() => setFiltroSexoDraft(filtroSexoDraft === "MALE" ? "" : "MALE")}
                      sx={{
                        flex: 1,
                        textTransform: "none",
                        borderColor: "#2563eb",
                        color: filtroSexoDraft === "MALE" ? "white" : "#2563eb",
                        backgroundColor: filtroSexoDraft === "MALE" ? "#2563eb" : "transparent",
                        "&:hover": { backgroundColor: filtroSexoDraft === "MALE" ? "#1d4ed8" : "#dbeafe" },
                      }}
                    >
                      Masculino
                    </Button>
                    <Button
                      size="small"
                      variant={filtroSexoDraft === "FEMALE" ? "contained" : "outlined"}
                      startIcon={<Female fontSize="small" />}
                      onClick={() => setFiltroSexoDraft(filtroSexoDraft === "FEMALE" ? "" : "FEMALE")}
                      sx={{
                        flex: 1,
                        textTransform: "none",
                        borderColor: "#db2777",
                        color: filtroSexoDraft === "FEMALE" ? "white" : "#db2777",
                        backgroundColor: filtroSexoDraft === "FEMALE" ? "#db2777" : "transparent",
                        "&:hover": { backgroundColor: filtroSexoDraft === "FEMALE" ? "#be185d" : "#fce7f3" },
                      }}
                    >
                      Femenino
                    </Button>
                  </Box>
                </>
              )}

              <Box display="flex" justifyContent="flex-end" mt={2.5} gap={1}>
                <Button
                  size="small"
                  onClick={() => { setEdadRange([0, 110]); setEdadRangePending([0, 110]); setFiltroDia(""); setFiltroMes(""); setFiltroTelefono(""); setFiltroTelefonoDraft(""); setFiltroSexo(""); setFiltroSexoDraft(""); setPage(0); setFetchKey((k) => k + 1); }}
                  sx={{ color: "#64748b", textTransform: "none" }}
                >
                  Limpiar todo
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => { setEdadRange(edadRangePending); setFiltroTelefono(filtroTelefonoDraft); setFiltroSexo(filtroSexoDraft); setPage(0); setFetchKey((k) => k + 1); setFilterAnchor(null); }}
                  sx={{ backgroundColor: MODULE_COLOR, textTransform: "none", "&:hover": { backgroundColor: subgerencia.colorHover } }}
                >
                  Aplicar
                </Button>
              </Box>
            </Box>
          </Popover>

          {/* ── Chips resumen filtros activos ── */}
          {hayFiltrosActivos && (
            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Filtros activos:
              </Typography>
              {isEdadFiltered && (
                <Chip
                  size="small"
                  label={`Edad: ${edadRange[0]}-${edadRange[1]} años`}
                  onDelete={() => { setEdadRange([0, 110]); setEdadRangePending([0, 110]); setPage(0); setFetchKey((k) => k + 1); }}
                  sx={{ backgroundColor: "#dbeafe", color: "#1e40af" }}
                />
              )}
              {filtroMes && (
                <Chip
                  size="small"
                  label={`Mes: ${MESES.find((m) => m.value === filtroMes)?.label}`}
                  onDelete={() => { setFiltroMes(""); setPage(0); setFetchKey((k) => k + 1); }}
                  icon={<Cake sx={{ color: "white !important", fontSize: 16 }} />}
                  sx={{ backgroundColor: MODULE_COLOR, color: "white" }}
                />
              )}
              {filtroDia && (
                <Chip
                  size="small"
                  label={`Día: ${filtroDia}`}
                  onDelete={() => { setFiltroDia(""); setPage(0); setFetchKey((k) => k + 1); }}
                  sx={{ backgroundColor: MODULE_COLOR, color: "white" }}
                />
              )}
              {filtroTelefono && (
                <Chip
                  size="small"
                  label={filtroTelefono === "con" ? "Con celular" : "Sin celular"}
                  icon={filtroTelefono === "con" ? <PhoneEnabled sx={{ fontSize: 14, color: "white !important" }} /> : <PhoneDisabled sx={{ fontSize: 14, color: "white !important" }} />}
                  onDelete={() => { setFiltroTelefono(""); setFiltroTelefonoDraft(""); setPage(0); setFetchKey((k) => k + 1); }}
                  sx={{ backgroundColor: filtroTelefono === "con" ? "#16a34a" : "#dc2626", color: "white" }}
                />
              )}
              {filtroSexo && (
                <Chip
                  size="small"
                  label={filtroSexo === "MALE" ? "Masculino" : "Femenino"}
                  icon={filtroSexo === "MALE" ? <Male sx={{ fontSize: 14, color: "white !important" }} /> : <Female sx={{ fontSize: 14, color: "white !important" }} />}
                  onDelete={() => { setFiltroSexo(""); setFiltroSexoDraft(""); setPage(0); setFetchKey((k) => k + 1); }}
                  sx={{ backgroundColor: filtroSexo === "MALE" ? "#2563eb" : "#db2777", color: "white" }}
                />
              )}
              {searchTerm && (
                <Chip size="small" label={`Búsqueda: "${searchTerm}"`} onDelete={() => setSearchTerm("")} />
              )}
            </Box>
          )}

          {/* ── Tabla ── */}
          <Paper
            sx={{
              borderRadius: "12px",
              boxShadow: "none",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
        {isLoading ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
            <CircularProgress sx={{ color: MODULE_COLOR }} />
            <Typography variant="body2" color="text.secondary">
              Cargando registros...
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {["#", "Nombre Completo", "Tipo Doc / N° Documento", "Teléfono", "Sexo", "Edad / Nacimiento", "F. Registro", ...(canShowObservacion() ? ["Observación"] : []), ""].map(
                      (col, i) => (
                        <TableCell
                          key={i}
                          align={i === 0 || i === 8 ? "center" : "left"}
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
                      )
                    )}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {dataFormateados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                          <PersonSearch sx={{ fontSize: 40, color: "text.disabled" }} />
                          <Typography color="text.secondary">
                            {debouncedSearch || hayFiltrosActivos ? "No se encontraron resultados con los filtros aplicados" : "No hay madres registradas"}
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
                        {/* # */}
                        <TableCell align="center" sx={{ color: "text.disabled", fontSize: "0.75rem", width: 48 }}>
                          {page * rowsPerPage + index + 1}
                        </TableCell>

                        {/* Nombre */}
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {row.nombreCompleto}
                          </Typography>
                        </TableCell>

                        {/* Documento */}
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={row.tipoDoc}
                              size="small"
                              sx={{
                                backgroundColor: `${MODULE_COLOR}20`,
                                color: MODULE_COLOR,
                                fontWeight: 700,
                                fontSize: "0.68rem",
                                height: 20,
                              }}
                            />
                            <Typography variant="body2" fontFamily="monospace">
                              {row.numDoc}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Teléfono */}
                        <TableCell>
                          <Typography variant="body2">
                            {formatearTelefono(row.telefono)}
                          </Typography>
                        </TableCell>

                        {/* Sexo */}
                        <TableCell>
                          {row.sexo === "MALE" ? (
                            <Chip
                              label="Masculino"
                              size="small"
                              icon={<Male sx={{ fontSize: 14, color: "white !important" }} />}
                              sx={{ backgroundColor: "#2563eb", color: "white", fontWeight: 600, fontSize: "0.72rem", height: 22 }}
                            />
                          ) : row.sexo === "FEMALE" ? (
                            <Chip
                              label="Femenino"
                              size="small"
                              icon={<Female sx={{ fontSize: 14, color: "white !important" }} />}
                              sx={{ backgroundColor: "#db2777", color: "white", fontWeight: 600, fontSize: "0.72rem", height: 22 }}
                            />
                          ) : (
                            <Chip
                              label="Sin dato"
                              size="small"
                              sx={{ backgroundColor: "#f1f5f9", color: "#94a3b8", fontWeight: 500, fontSize: "0.72rem", height: 22 }}
                            />
                          )}
                        </TableCell>

                        {/* Edad / Nacimiento */}
                        <TableCell>
                          {row.fechaNacimiento ? (
                            <Box display="flex" flexDirection="column" gap={0.25}>
                              <Chip
                                label={`${row.edad} años`}
                                size="small"
                                sx={{
                                  backgroundColor: "#dbeafe",
                                  color: "#1e40af",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  height: 22,
                                  width: "fit-content",
                                }}
                              />
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Cake sx={{ fontSize: 12, color: MODULE_COLOR }} />
                                <Typography variant="caption" color="text.secondary">
                                  {formatearFecha(row.fechaNacimiento)}
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>

                        {/* Fecha Registro */}
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatearFecha(row.fechaRegistro)}
                          </Typography>
                        </TableCell>

                        {/* Observación */}
                        {canShowObservacion() && (
                        <TableCell sx={{ minWidth: 160 }} onClick={(e) => e.stopPropagation()}>
                          <TextField
                            size="small"
                            placeholder="Escribir..."
                            value={observaciones[row.id] || ""}
                            onChange={(e) => setObservaciones((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            multiline
                            maxRows={2}
                            fullWidth
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                fontSize: "0.78rem",
                                borderRadius: "6px",
                                backgroundColor: "white",
                              },
                            }}
                          />
                        </TableCell>
                        )}

                        {/* Acciones */}
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
                            {canUpdate("COMPROMISO I") && (
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
                            {canDelete("COMPROMISO I") && (
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
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} de ${count !== -1 ? count.toLocaleString() : `más de ${to}`}`
              }
              sx={{
                borderTop: "1px solid #e2e8f0",
                mt: 2,
                "& .MuiTablePagination-select": { fontWeight: 500 },
                "& .MuiTablePagination-selectIcon": { color: "#64748b" },
              }}
            />
          </>
        )}
          </Paper>
        </CardContent>
      </Card>

      {/* ── Modal de Detalle ── */}
      <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="sm" fullWidth>
        <DetalleMadre
          madre={detalleMadre}
          isLoading={false}
          onClose={() => setDetalleOpen(false)}
        />
      </Dialog>
    </Box>
  );
}
