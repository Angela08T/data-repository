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
  LocalDrink,
  Person,
  PhoneEnabled,
  PhoneDisabled,
  Female,
  Male,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import { calcularEdad, formatearFecha, MESES_LABELS } from "@/lib/utils/formatters";
import { useFilters } from "@/lib/hooks/useFilters";
import { useBeneficiarioDialog } from "@/lib/hooks/useBeneficiarioDialog";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { usePermissions } from "@/lib/hooks/usePermissions";

const PVL_COLOR = "#d81b7e";

// ============================================
// INTERFACES BACKEND
// ============================================
interface BeneficiarioListaBackend {
  id: string;
  committee: string;
  doc_num: string;
  lastname: string;
  name: string;
  phone: string | null;
  sex: "MALE" | "FEMALE" | null;
  priority: number;
  birthday: string;
  doc_type: string;
}

interface BackendListaResponse {
  message: string;
  data: {
    data: BeneficiarioListaBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

// Interface para la tabla
interface BeneficiarioTabla {
  id: string;
  nombreCompleto: string;
  tipoDoc: string;
  numDoc: string;
  sexo: "MALE" | "FEMALE" | null;
  edad: number;
  fechaNacimiento: string;
  prioridad: number;
  comite: string;
  celular: string;
}

// ============================================
// MAPEO BACKEND -> FRONTEND
// ============================================
const mapListaToTabla = (item: BeneficiarioListaBackend): BeneficiarioTabla => ({
  id: item.id,
  nombreCompleto: `${item.name} ${item.lastname}`,
  tipoDoc: item.doc_type || "DNI",
  numDoc: item.doc_num || "-",
  sexo: item.sex ?? null,
  edad: calcularEdad(item.birthday),
  fechaNacimiento: item.birthday,
  prioridad: item.priority,
  comite: item.committee || "-",
  celular: item.phone || "-",
});

// ============================================
// CONSTANTES
// ============================================
const PRIORIDAD_CONFIG: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "1° Prioridad", bg: "#ffebee", color: "#c62828" },
  2: { label: "2° Prioridad", bg: "#fff3e0", color: "#e65100" },
  3: { label: "3° Prioridad", bg: "#fffde7", color: "#f57f17" },
};

// ============================================
// COMPONENTE DE DETALLE
// ============================================
interface DetalleProps {
  beneficiario: BeneficiarioListaBackend | null;
  loading: boolean;
}

function DetalleContent({ beneficiario, loading }: DetalleProps) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress size={40} sx={{ color: PVL_COLOR }} />
      </Box>
    );
  }

  if (!beneficiario) {
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

  const edad = calcularEdad(beneficiario.birthday);
  const prioridadCfg = PRIORIDAD_CONFIG[beneficiario.priority] || {
    label: `Prioridad ${beneficiario.priority}`,
    bg: "#f5f5f5",
    color: "#757575",
  };

  return (
    <Box>
      {/* Encabezado del beneficiario */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${PVL_COLOR}10 0%, ${PVL_COLOR}20 100%)`,
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
            background: `linear-gradient(135deg, ${PVL_COLOR}20 0%, ${PVL_COLOR}40 100%)`,
            color: PVL_COLOR,
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
            {beneficiario.name} {beneficiario.lastname}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {beneficiario.doc_type} · {beneficiario.doc_num} · {edad} años
          </Typography>
          <Box display="flex" gap={1} mt={0.5}>
            <Chip
              label={prioridadCfg.label}
              size="small"
              sx={{
                backgroundColor: prioridadCfg.bg,
                color: prioridadCfg.color,
                fontWeight: 600,
                fontSize: "0.7rem",
              }}
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
          {renderCampo("Nombre", beneficiario.name)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Apellidos", beneficiario.lastname)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Tipo de Documento", beneficiario.doc_type)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Número de Documento", beneficiario.doc_num)}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo(
            "Fecha de Nacimiento",
            `${formatearFecha(beneficiario.birthday)} (${edad} años)`
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderCampo("Celular", beneficiario.phone)}
        </Grid>

        {/* Datos del programa */}
        <Grid size={12}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="#475569"
            gutterBottom
            sx={{ mt: 2 }}
          >
            Datos del Programa
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block">
              Prioridad
            </Typography>
            <Chip
              label={prioridadCfg.label}
              size="small"
              sx={{
                mt: 0.5,
                backgroundColor: prioridadCfg.bg,
                color: prioridadCfg.color,
                fontWeight: 600,
              }}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 8 }}>
          {renderCampo("Comité", beneficiario.committee)}
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function PVLBeneficiariosPage() {
  const { getData } = useFetch();

  const [data, setData] = useState<BeneficiarioTabla[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Paginación server-side
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fetchKey, setFetchKey] = useState(0);

  // Búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Datos del detalle (se carga por API)
  const [detalleData, setDetalleData] = useState<BeneficiarioListaBackend | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [rawDataMap, setRawDataMap] = useState<Record<string, BeneficiarioListaBackend>>({});

  const { canShowObservacion } = usePermissions();

  // Hooks de filtros y dialog
  const filters = useFilters({ edadMax: 120 });
  const dialog = useBeneficiarioDialog<string>(); // almacena el ID del beneficiario

  // Disparar re-fetch
  const triggerFetch = () => {
    setPage(0);
    setFetchKey((k) => k + 1);
  };

  // Debounce de búsqueda (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cargar lista de beneficiarios
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

        const response = await getData<BackendListaResponse>(`pvl/dependent?${params.toString()}`);

        if (response?.data) {
          const rawList = response.data.data;
          setData(rawList.map(mapListaToTabla));
          setTotalCount(response.data.totalCount);
          const map: Record<string, BeneficiarioListaBackend> = {};
          rawList.forEach((b) => { map[b.id] = b; });
          setRawDataMap((prev) => ({ ...prev, ...map }));
        }
      } catch (error) {
        console.error("Error al cargar beneficiarios:", error);
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, fetchKey, debouncedSearch, getData]);

  // Cargar detalle del beneficiario
  const fetchDetalle = useCallback(
    async (id: string) => {
      if (rawDataMap[id]) {
        setDetalleData(rawDataMap[id]);
        setDetalleLoading(false);
        return;
      }
      setDetalleLoading(true);
      try {
        const response = await getData<{ message: string; data: BeneficiarioListaBackend }>(
          `pvl/dependent/${id}`
        );
        if (response?.data) setDetalleData(response.data);
      } catch (error) {
        console.error("Error al cargar detalle:", error);
        setDetalleData(null);
      } finally {
        setDetalleLoading(false);
      }
    },
    [getData, rawDataMap]
  );

  useEffect(() => {
    if (dialog.selectedItem && dialog.detailOpen) fetchDetalle(dialog.selectedItem);
  }, [dialog.selectedItem, dialog.detailOpen, fetchDetalle]);

  // Handlers
  const handleFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    filters.setFiltroTelefonoDraft(filters.filtroTelefono);
    filters.setFiltroSexoDraft(filters.filtroSexo);
    filters.handleFilterClick(e);
  };

  const handleApplyFilters = () => {
    filters.handleApplyFilters();
    triggerFetch();
  };

  const handleMesToggle = (index: number) => {
    filters.setMesSeleccionado(filters.mesSeleccionado === index ? null : index);
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

  const dataFormateados = useFormatTableData(data);
  const filteredData = dataFormateados;

  const isEdadFiltered = filters.edadRange[0] > 0 || filters.edadRange[1] < 120;
  const isCumpleanosFiltered =
    filters.cumpleanosModo === "mes" ? filters.mesSeleccionado !== null : filters.diaCumpleanos !== "";

  // Exportar a Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "99999");

      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      if (isEdadFiltered) {
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

      const response = await getData<BackendListaResponse>(`pvl/dependent?${params.toString()}`);
      if (!response?.data) return;

      const exportData = response.data.data.map((b) => ({
        "Nombre Completo": `${b.name} ${b.lastname}`,
        "Tipo Doc": b.doc_type || "DNI",
        "N° Documento": b.doc_num || "-",
        "Edad": calcularEdad(b.birthday),
        "Fecha Nacimiento": formatearFecha(b.birthday),
        "Prioridad": b.priority,
        "Comité": b.committee || "-",
        "Celular": b.phone || "-",
      }));

      if (exportData.length === 0) return;
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Beneficiarios PVL");
      worksheet["!cols"] = Object.keys(exportData[0] || {}).map(() => ({ wch: 22 }));
      XLSX.writeFile(workbook, `beneficiarios_pvl_${new Date().toISOString().split("T")[0]}.xlsx`);
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
              background: `linear-gradient(135deg, ${PVL_COLOR}15 0%, ${PVL_COLOR}30 100%)`,
              color: PVL_COLOR,
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              boxShadow: `0 4px 12px ${PVL_COLOR}25`,
            }}
          >
            <LocalDrink sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: PVL_COLOR }}>
            PVL - Beneficiarios
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ ml: 7.5 }}>
          Listado de beneficiarios del Programa de Vaso de Leche
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
                placeholder="Buscar por nombre, documento, comité..."
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
                      ? MESES_LABELS[filters.mesSeleccionado].slice(0, 3)
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
                    : <PhoneDisabled sx={{ fontSize: 14, color: "#dc2626" }} />}
                  <Typography variant="caption" color={filters.filtroTelefono === "con" ? "#16a34a" : "#dc2626"}>
                    {filters.filtroTelefono === "con" ? "Con celular" : "Sin celular"}
                  </Typography>
                  <IconButton size="small" onClick={() => { filters.setFiltroTelefono(""); filters.setFiltroTelefonoDraft(""); triggerFetch(); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: filters.filtroTelefono === "con" ? "#16a34a" : "#dc2626" }} />
                  </IconButton>
                </Box>
              )}
              {filters.filtroSexo && (
                <Box sx={{ backgroundColor: filters.filtroSexo === "FEMALE" ? "#fce7f3" : "#dbeafe", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  {filters.filtroSexo === "FEMALE"
                    ? <Female sx={{ fontSize: 14, color: "#be185d" }} />
                    : <Male sx={{ fontSize: 14, color: "#1d4ed8" }} />}
                  <Typography variant="caption" color={filters.filtroSexo === "FEMALE" ? "#be185d" : "#1d4ed8"}>
                    {filters.filtroSexo === "FEMALE" ? "Mujeres" : "Hombres"}
                  </Typography>
                  <IconButton size="small" onClick={() => { filters.setFiltroSexo(""); filters.setFiltroSexoDraft(""); triggerFetch(); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: filters.filtroSexo === "FEMALE" ? "#be185d" : "#1d4ed8" }} />
                  </IconButton>
                </Box>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
                {totalCount.toLocaleString()} beneficiario(s)
              </Typography>
            </Box>

            {/* Panel de filtros avanzados */}
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
              accentColor={PVL_COLOR}
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
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Sexo</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Edad</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Prioridad</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Comité</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Celular</TableCell>
                    {canShowObservacion() && <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Observación</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={32} sx={{ color: PVL_COLOR }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Cargando beneficiarios...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron beneficiarios
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row: BeneficiarioTabla, index: number) => {
                      const prioridadCfg = PRIORIDAD_CONFIG[row.prioridad] || {
                        label: `P${row.prioridad}`,
                        bg: "#f5f5f5",
                        color: "#757575",
                      };
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
                          <TableCell>
                            {row.sexo ? (
                              <Chip
                                size="small"
                                icon={row.sexo === "FEMALE" ? <Female sx={{ fontSize: "14px !important", color: "white !important" }} /> : <Male sx={{ fontSize: "14px !important", color: "white !important" }} />}
                                label={row.sexo === "FEMALE" ? "Mujer" : "Hombre"}
                                sx={{ backgroundColor: row.sexo === "FEMALE" ? "#be185d" : "#1d4ed8", color: "white", fontSize: "0.7rem", height: 22, fontWeight: 600 }}
                              />
                            ) : (
                              <Chip size="small" label="Sin dato" sx={{ backgroundColor: "#e2e8f0", color: "#64748b", fontSize: "0.7rem", height: 22 }} />
                            )}
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
                          <TableCell align="center">
                            <Chip
                              label={prioridadCfg.label}
                              size="small"
                              sx={{
                                backgroundColor: prioridadCfg.bg,
                                color: prioridadCfg.color,
                                fontWeight: 600,
                                fontSize: "0.7rem",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.78rem", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              title={row.comite}
                            >
                              {row.comite}
                            </Typography>
                          </TableCell>
                          <TableCell>{row.celular}</TableCell>
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
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
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
            <LocalDrink sx={{ color: PVL_COLOR }} />
            <Typography variant="h6" fontWeight={600} color="#334155">
              Ficha del Beneficiario
            </Typography>
          </Box>
          <IconButton onClick={handleDetailClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DetalleContent beneficiario={detalleData} loading={detalleLoading} />
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
