"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Search,
  FilterList,
  FileDownload,
  Close,
  Visibility,
  Cake,
  LocalHospital,
  Person,
  PhoneEnabled,
  PhoneDisabled,
  Wc,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import { useFilters } from "@/lib/hooks/useFilters";
import { useBeneficiarioDialog } from "@/lib/hooks/useBeneficiarioDialog";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { calcularEdad, formatearFecha } from "@/lib/utils/formatters";
import { usePermissions } from "@/lib/hooks/usePermissions";

const PANTBC_COLOR = "#d81b7e";

const TRADUCCIONES: Record<string, Record<string, string>> = {
  sex: {
    MALE: "Masculino",
    FEMALE: "Femenino",
  },
  patient_type: {
    NEW: "Nuevo",
    RELAPSE: "Recaída",
    TREATMENT_AFTER_FAILURE: "Fracaso de Tto.",
    TREATMENT_AFTER_LOSS: "Abandono recuperado",
    OTHER: "Otro",
  },
};

const traducir = (categoria: string, valor: string | null | undefined): string => {
  if (!valor) return "-";
  return TRADUCCIONES[categoria]?.[valor] || valor;
};

// ============================================
// INTERFACES BACKEND
// ============================================
interface CensusEntity {
  id: string;
  name: string;
}

interface PacienteListaBackend {
  id: string;
  doc_num: string;
  name: string;
  lastname: string;
  phone: string;
  start_at: string;
  birthday: string;
  doc_type: string;
  patient_type: string;
  sector: string | null;
  sex: string;
  census: CensusEntity | null;
}

interface BackendListaResponse {
  message: string;
  data: {
    data: PacienteListaBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

interface BackendDetalleResponse {
  message: string;
  data: PacienteListaBackend;
}

// Interface para la tabla
interface PacienteTabla {
  id: string;
  nombreCompleto: string;
  tipoDoc: string;
  numDoc: string;
  sexo: string;
  edad: number;
  fechaNacimiento: string;
  tipoPaciente: string;
  establecimiento: string;
  celular: string;
  fechaInicio: string;
  sector: string;
}

// ============================================
// MAPEO BACKEND -> FRONTEND (TABLA)
// ============================================
const mapListaToTabla = (item: PacienteListaBackend): PacienteTabla => ({
  id: item.id,
  nombreCompleto: `${item.name} ${item.lastname}`,
  tipoDoc: item.doc_type || "DNI",
  numDoc: item.doc_num || "-",
  sexo: traducir("sex", item.sex),
  edad: calcularEdad(item.birthday),
  fechaNacimiento: item.birthday,
  tipoPaciente: traducir("patient_type", item.patient_type),
  establecimiento: item.census?.name || "-",
  celular: item.phone || "-",
  fechaInicio: item.start_at,
  sector: item.sector || "-",
});

// ============================================
// CONSTANTES
// ============================================
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const SEXO_CHIP_COLORS: Record<string, { bg: string; color: string }> = {
  Masculino: { bg: "#e3f2fd", color: "#1565c0" },
  Femenino: { bg: "#fce4ec", color: "#c2185b" },
};

const TIPO_CHIP_COLORS: Record<string, { bg: string; color: string }> = {
  Nuevo: { bg: "#fce4ec", color: "#880e4f" },
  "Recaída": { bg: "#fff3e0", color: "#e65100" },
  "Fracaso de Tto.": { bg: "#ffebee", color: "#c62828" },
  "Abandono recuperado": { bg: "#e8f5e9", color: "#2e7d32" },
  Otro: { bg: "#f3e5f5", color: "#7b1fa2" },
};

// ============================================
// COMPONENTE DE DETALLE
// ============================================
interface DetalleProps {
  paciente: PacienteListaBackend | null;
  loading: boolean;
}

function DetalleContent({ paciente, loading }: DetalleProps) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress size={40} sx={{ color: PANTBC_COLOR }} />
      </Box>
    );
  }

  if (!paciente) {
    return (
      <Typography color="text.secondary" textAlign="center" py={4}>
        No se pudo cargar la información
      </Typography>
    );
  }

  const renderCampo = (label: string, valor: React.ReactNode) => (
    <Box mb={2}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {valor || "-"}
      </Typography>
    </Box>
  );

  const edad = calcularEdad(paciente.birthday);
  const tipoPaciente = traducir("patient_type", paciente.patient_type);
  const tipoColors = TIPO_CHIP_COLORS[tipoPaciente] || { bg: "#f5f5f5", color: "#757575" };
  const sexoLabel = traducir("sex", paciente.sex);
  const sexoColors = SEXO_CHIP_COLORS[sexoLabel] || { bg: "#f5f5f5", color: "#757575" };

  return (
    <Box>
      {/* Encabezado del paciente */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${PANTBC_COLOR}10 0%, ${PANTBC_COLOR}20 100%)`,
          borderRadius: "12px",
          p: 2.5,
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${PANTBC_COLOR}20 0%, ${PANTBC_COLOR}40 100%)`,
            color: PANTBC_COLOR,
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "12px",
            flexShrink: 0,
          }}
        >
          <Person sx={{ fontSize: 32 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} color="#1e293b">
            {paciente.name} {paciente.lastname}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {paciente.doc_type} · {paciente.doc_num} · {edad} años
          </Typography>
          <Box display="flex" gap={1} mt={0.5}>
            <Chip
              label={sexoLabel}
              size="small"
              sx={{ backgroundColor: sexoColors.bg, color: sexoColors.color, fontWeight: 600, fontSize: "0.7rem" }}
            />
            <Chip
              label={tipoPaciente}
              size="small"
              sx={{ backgroundColor: tipoColors.bg, color: tipoColors.color, fontWeight: 600, fontSize: "0.7rem" }}
            />
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Datos personales */}
        <Grid size={12}>
          <Typography variant="subtitle2" fontWeight={600} color="#475569" gutterBottom>
            Datos Personales
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Nombre", paciente.name)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Apellidos", paciente.lastname)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Tipo de Documento", paciente.doc_type)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Número de Documento", paciente.doc_num)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Fecha de Nacimiento", `${formatearFecha(paciente.birthday)} (${edad} años)`)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Sexo", traducir("sex", paciente.sex))}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Celular", paciente.phone)}
        </Grid>

        {/* Datos del programa */}
        <Grid size={12}>
          <Typography variant="subtitle2" fontWeight={600} color="#475569" gutterBottom sx={{ mt: 2 }}>
            Datos del Programa
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block">
              Tipo de Paciente
            </Typography>
            <Chip
              label={tipoPaciente}
              size="small"
              sx={{ mt: 0.5, backgroundColor: tipoColors.bg, color: tipoColors.color, fontWeight: 600 }}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Fecha de Inicio", formatearFecha(paciente.start_at))}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Sector", paciente.sector)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Establecimiento", paciente.census?.name)}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function PANTBCBeneficiariosPage() {
  const { getData } = useFetch();

  const [data, setData] = useState<PacienteTabla[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fetchKey, setFetchKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Mapa de datos originales para detalle rápido (sin llamada API adicional)
  const [rawDataMap, setRawDataMap] = useState<Record<string, PacienteListaBackend>>({});
  const [detalleData, setDetalleData] = useState<PacienteListaBackend | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const { canShowObservacion } = usePermissions();

  const filters = useFilters({ edadMax: 120 });
  const dialog = useBeneficiarioDialog<string>();

  // Debounce de búsqueda (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const triggerFetch = () => { setPage(0); setFetchKey((k) => k + 1); };

  // Cargar lista de pacientes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page + 1));
        params.set("limit", String(rowsPerPage));

        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

        if (filters.edadRange[0] > 0 || filters.edadRange[1] < 120) {
          params.set("age_min", String(filters.edadRange[0]));
          params.set("age_max", String(filters.edadRange[1]));
        }

        if (filters.cumpleanosModo === "mes" && filters.mesSeleccionado !== null) {
          params.set("month", String(filters.mesSeleccionado + 1));
        } else if (filters.cumpleanosModo === "dia" && filters.diaCumpleanos) {
          const parts = filters.diaCumpleanos.split("-");
          params.set("birthday", `${parts[1]}-${parts[2]}`);
        }

        if (filters.filtroTelefono === "con") params.set("phone", "true");
        else if (filters.filtroTelefono === "sin") params.set("phone", "false");

        if (filters.filtroSexo) params.set("sex", filters.filtroSexo);

        const response = await getData<BackendListaResponse>(`pantbc/patient?${params.toString()}`);

        if (response?.data) {
          const rawList = response.data.data;
          setData(rawList.map(mapListaToTabla));
          setTotalCount(response.data.totalCount);
          const map: Record<string, PacienteListaBackend> = {};
          rawList.forEach((p) => { map[p.id] = p; });
          setRawDataMap((prev) => ({ ...prev, ...map }));
        }
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, fetchKey, debouncedSearch, getData]);

  // Cargar detalle de un paciente
  const fetchDetalle = useCallback(async (id: string) => {
    if (rawDataMap[id]) {
      setDetalleData(rawDataMap[id]);
      setDetalleLoading(false);
      return;
    }
    setDetalleLoading(true);
    try {
      const response = await getData<BackendDetalleResponse>(`pantbc/patient/${id}`);
      if (response?.data) setDetalleData(response.data);
    } catch (error) {
      console.error("Error al cargar detalle:", error);
      setDetalleData(null);
    } finally {
      setDetalleLoading(false);
    }
  }, [getData, rawDataMap]);

  useEffect(() => {
    if (dialog.selectedItem && dialog.detailOpen) fetchDetalle(dialog.selectedItem);
  }, [dialog.selectedItem, dialog.detailOpen, fetchDetalle]);

  // Handlers
  const handleFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    filters.setFiltroTelefonoDraft(filters.filtroTelefono);
    filters.setFiltroSexoDraft(filters.filtroSexo);
    filters.handleFilterClick(e);
  };

  const handleMesToggle = (index: number) => {
    filters.setMesSeleccionado(filters.mesSeleccionado === index ? null : index);
  };

  const handleApplyFilters = () => {
    filters.handleApplyFilters();
    triggerFetch();
  };

  const clearPanelFilters = () => {
    filters.limpiarFiltros();
    triggerFetch();
  };

  const limpiarTodo = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    clearPanelFilters();
  };

  const handleRowClick = (id: string) => {
    setDetalleData(null);
    dialog.handleOpenDetail(id);
  };

  const handleDetailClose = () => {
    dialog.handleCloseDetail();
    setDetalleData(null);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // Valores derivados
  const isEdadFiltered = filters.edadRange[0] > 0 || filters.edadRange[1] < 120;
  const isCumpleanosFiltered = filters.cumpleanosModo === "mes"
    ? filters.mesSeleccionado !== null
    : filters.diaCumpleanos !== "";

  const dataFormateados = useFormatTableData(data);

  // Exportar a Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "99999");

      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      if (filters.edadRange[0] > 0 || filters.edadRange[1] < 120) {
        params.set("age_min", String(filters.edadRange[0]));
        params.set("age_max", String(filters.edadRange[1]));
      }

      if (filters.cumpleanosModo === "mes" && filters.mesSeleccionado !== null) {
        params.set("month", String(filters.mesSeleccionado + 1));
      } else if (filters.cumpleanosModo === "dia" && filters.diaCumpleanos) {
        const parts = filters.diaCumpleanos.split("-");
        params.set("birthday", `${parts[1]}-${parts[2]}`);
      }

      if (filters.filtroTelefono === "con") params.set("phone", "true");
      else if (filters.filtroTelefono === "sin") params.set("phone", "false");

      if (filters.filtroSexo) params.set("sex", filters.filtroSexo);

      const response = await getData<BackendListaResponse>(`pantbc/patient?${params.toString()}`);

      if (!response?.data) return;

      const exportData = response.data.data.map((p) => ({
        "Nombre Completo": `${p.name} ${p.lastname}`,
        "Tipo Doc": p.doc_type || "DNI",
        "N° Documento": p.doc_num || "-",
        "Sexo": traducir("sex", p.sex),
        "Edad": calcularEdad(p.birthday),
        "Fecha Nacimiento": formatearFecha(p.birthday),
        "Tipo Paciente": traducir("patient_type", p.patient_type),
        "Establecimiento": p.census?.name || "-",
        "Celular": p.phone || "-",
        "Fecha Inicio": formatearFecha(p.start_at),
        "Sector": p.sector || "-",
      }));

      if (exportData.length === 0) return;
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pacientes PANTBC");
      worksheet["!cols"] = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }));
      XLSX.writeFile(workbook, `pacientes_pantbc_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (error) {
      console.error("Error exportando:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Box
            sx={{
              background: `linear-gradient(135deg, ${PANTBC_COLOR}15 0%, ${PANTBC_COLOR}30 100%)`,
              color: PANTBC_COLOR,
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              boxShadow: `0 4px 12px ${PANTBC_COLOR}25`,
            }}
          >
            <LocalHospital sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: PANTBC_COLOR }}>
            PANTBC - Pacientes
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ ml: 7.5 }}>
          Listado de pacientes registrados en el Programa de Alimentación y Nutrición para TBC
        </Typography>
      </Box>

      {/* Tarjeta principal */}
      <Box sx={{ position: "relative" }}>
        <Card
          sx={{
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            position: "relative",
            zIndex: 1,
            overflow: "hidden",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            {/* Buscador y Filtros */}
            <Box mb={3} display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
              <TextField
                placeholder="Buscar por nombre, documento, celular..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: "#64748b", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                size="small"
                sx={{
                  width: 340,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f8fafc",
                    "&:hover fieldset": { borderColor: "#64748b" },
                    "&.Mui-focused fieldset": { borderColor: "#475569" },
                  },
                }}
              />
              <Tooltip title="Filtros avanzados">
                <IconButton
                  onClick={handleFilterClick}
                  sx={{
                    backgroundColor: filters.filterOpen ? "#e2e8f0" : "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: "#e2e8f0" },
                  }}
                >
                  <FilterList sx={{ color: "#64748b", fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exportar a Excel">
                <IconButton
                  onClick={handleExport}
                  disabled={isLoading || isExporting}
                  sx={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: "#dcfce7", borderColor: "#22c55e" },
                  }}
                >
                  <FileDownload sx={{ color: "#22c55e", fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              {/* Chips de filtros activos */}
              {isEdadFiltered && (
                <Box sx={{ backgroundColor: "#fce4ec", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="caption" color="#880e4f">
                    Edad: {filters.edadRange[0]} - {filters.edadRange[1]} años
                  </Typography>
                  <IconButton size="small" onClick={() => { filters.setEdadRange([0, 120]); triggerFetch(); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: "#880e4f" }} />
                  </IconButton>
                </Box>
              )}
              {isCumpleanosFiltered && (
                <Box sx={{ backgroundColor: "#fce4ec", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Cake sx={{ fontSize: 14, color: "#880e4f" }} />
                  <Typography variant="caption" color="#880e4f">
                    {filters.cumpleanosModo === "mes" && filters.mesSeleccionado !== null
                      ? MESES[filters.mesSeleccionado].slice(0, 3)
                      : filters.diaCumpleanos.split("-").slice(1).reverse().join("/")}
                  </Typography>
                  <IconButton size="small" onClick={() => { filters.setMesSeleccionado(null); filters.setDiaCumpleanos(""); triggerFetch(); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: "#880e4f" }} />
                  </IconButton>
                </Box>
              )}
              {filters.filtroTelefono && (
                <Box sx={{ backgroundColor: filters.filtroTelefono === "con" ? "#dcfce7" : "#fee2e2", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  {filters.filtroTelefono === "con"
                    ? <PhoneEnabled sx={{ fontSize: 14, color: "#16a34a" }} />
                    : <PhoneDisabled sx={{ fontSize: 14, color: "#dc2626" }} />
                  }
                  <Typography variant="caption" color={filters.filtroTelefono === "con" ? "#16a34a" : "#dc2626"}>
                    {filters.filtroTelefono === "con" ? "Con celular" : "Sin celular"}
                  </Typography>
                  <IconButton size="small" onClick={() => { filters.setFiltroTelefono(""); filters.setFiltroTelefonoDraft(""); triggerFetch(); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: filters.filtroTelefono === "con" ? "#16a34a" : "#dc2626" }} />
                  </IconButton>
                </Box>
              )}
              {filters.filtroSexo && (
                <Box sx={{ backgroundColor: filters.filtroSexo === "MALE" ? "#e3f2fd" : "#fce4ec", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Wc sx={{ fontSize: 14, color: filters.filtroSexo === "MALE" ? "#1565c0" : "#c2185b" }} />
                  <Typography variant="caption" color={filters.filtroSexo === "MALE" ? "#1565c0" : "#c2185b"}>
                    {filters.filtroSexo === "MALE" ? "Masculino" : "Femenino"}
                  </Typography>
                  <IconButton size="small" onClick={() => { filters.setFiltroSexo(""); filters.setFiltroSexoDraft(""); triggerFetch(); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: filters.filtroSexo === "MALE" ? "#1565c0" : "#c2185b" }} />
                  </IconButton>
                </Box>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
                {totalCount.toLocaleString()} paciente(s)
              </Typography>
            </Box>

            {/* Panel de filtros */}
            <FilterPanel
              anchor={filters.filterAnchor}
              onClose={filters.handleFilterClose}
              onApply={handleApplyFilters}
              onClear={limpiarTodo}
              filterType={filters.filterType}
              onFilterTypeChange={filters.setFilterType}
              edadRange={filters.edadRange}
              edadMax={120}
              onEdadChange={filters.setEdadRange}
              cumpleanosModo={filters.cumpleanosModo}
              onCumpleanosModoChange={filters.setCumpleanosModo}
              mesSeleccionado={filters.mesSeleccionado}
              onMesToggle={handleMesToggle}
              diaCumpleanos={filters.diaCumpleanos}
              onDiaCumpleanosChange={filters.setDiaCumpleanos}
              filtroTelefonoDraft={filters.filtroTelefonoDraft}
              onTelefonoDraftChange={filters.setFiltroTelefonoDraft}
              filtroSexoDraft={filters.filtroSexoDraft}
              onSexoDraftChange={filters.setFiltroSexoDraft}
              showGenero={true}
              accentColor={PANTBC_COLOR}
              accentBg="#fce4ec"
            />

            {/* Tabla */}
            <TableContainer
              component={Paper}
              sx={{ borderRadius: "12px", boxShadow: "none", border: "1px solid #e2e8f0", overflow: "hidden" }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Nombre Completo</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Doc.</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Sexo</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Edad</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Tipo Paciente</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Establecimiento</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Celular</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Fecha Inicio</TableCell>
                    {canShowObservacion() && <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Observación</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={32} sx={{ color: PANTBC_COLOR }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Cargando pacientes...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : dataFormateados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron pacientes
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    dataFormateados.map((row: PacienteTabla, index: number) => {
                      const sexoColors = SEXO_CHIP_COLORS[row.sexo] || { bg: "#f5f5f5", color: "#757575" };
                      const tipoColors = TIPO_CHIP_COLORS[row.tipoPaciente] || { bg: "#f5f5f5", color: "#757575" };
                      return (
                        <TableRow
                          key={row.id}
                          onClick={() => handleRowClick(row.id)}
                          sx={{
                            backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                            "&:hover": { backgroundColor: "#f1f5f9", cursor: "pointer" },
                            transition: "background-color 0.2s",
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>{row.nombreCompleto}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                              {row.tipoDoc}
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {row.numDoc}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={row.sexo}
                              size="small"
                              sx={{ backgroundColor: sexoColors.bg, color: sexoColors.color, fontWeight: 600, fontSize: "0.7rem" }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" flexDirection="column" alignItems="center" gap={0.3}>
                              <Chip
                                label={`${row.edad} años`}
                                size="small"
                                sx={{ backgroundColor: "#fce4ec", color: "#880e4f", fontWeight: 600, fontSize: "0.75rem" }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                {formatearFecha(row.fechaNacimiento)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.tipoPaciente}
                              size="small"
                              sx={{ backgroundColor: tipoColors.bg, color: tipoColors.color, fontWeight: 600, fontSize: "0.7rem" }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
                              {row.establecimiento}
                            </Typography>
                          </TableCell>
                          <TableCell>{row.celular}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
                              {formatearFecha(row.fechaInicio)}
                            </Typography>
                          </TableCell>
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
                              sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.78rem", borderRadius: "6px", backgroundColor: "white" } }}
                            />
                          </TableCell>
                          )}
                          <TableCell align="center">
                            <Tooltip title="Ver detalles">
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleRowClick(row.id); }}
                                sx={{ color: "#64748b", "&:hover": { backgroundColor: "#f1f5f9" } }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Paginación */}
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              sx={{
                borderTop: "1px solid #e2e8f0",
                mt: 2,
                "& .MuiTablePagination-selectIcon": { color: "#64748b" },
              }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Dialog de detalles */}
      <Dialog
        open={dialog.detailOpen}
        onClose={handleDetailClose}
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
            <LocalHospital sx={{ color: PANTBC_COLOR }} />
            <Typography variant="h6" fontWeight={600} color="#334155">
              Ficha del Paciente
            </Typography>
          </Box>
          <IconButton onClick={handleDetailClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DetalleContent paciente={detalleData} loading={detalleLoading} />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={handleDetailClose} sx={{ textTransform: "none", color: "#64748b" }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
