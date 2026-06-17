"use client";

import { useState, useEffect } from "react";
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
  Chip,
  IconButton,
  Tooltip,
  MenuItem,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Alert,
} from "@mui/material";
import {
  Search,
  People,
  Download,
  Clear,
  Visibility,
  Edit,
  Delete,
  Close,
  Person,
  Phone,
  Badge,
  Home,
  CalendarMonth,
  Groups,
  Assignment,
  FilterList,
  Cake,
  PhoneEnabled,
  PhoneDisabled,
  Wc,
  Male,
  Female,
} from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import * as XLSX from "xlsx";
import { calcularEdad, formatearFecha, formatearTelefono, MESES_LABELS } from "@/lib/utils/formatters";
import { useFilters } from "@/lib/hooks/useFilters";
import { useBeneficiarioDialog } from "@/lib/hooks/useBeneficiarioDialog";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];

// Interfaces para el backend
interface RegisteredPerson {
  id: string;
  fsu: string;
  s100: string;
  dni: string;
  sex?: string | null;
  name: string;
  lastname: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  members: number;
  birthday: string;
  registered_at: string;
  format: string;
  level: string;
  enumerator: {
    id: string;
    dni: string;
    name: string;
    lastname: string;
    phone: string;
    birthday: string;
  } | null;
  urban: {
    id: string;
    name: string;
  } | null;
  box: {
    id: string;
    code_num: number;
  } | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: RegisteredPerson[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function ULEEmpadronadosPage() {
  const { getData } = useFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<RegisteredPerson[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Paginación server-side
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [fetchKey, setFetchKey] = useState(0);

  // Estados de filtros locales
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroFormato, setFiltroFormato] = useState<string>("");
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  const { canUpdate, canDelete, canShowObservacion } = usePermissions();

  // Hooks de filtros y dialog
  const filters = useFilters({ edadMax: 100 });
  const dialog = useBeneficiarioDialog<RegisteredPerson>();

  // Disparar re-fetch
  const triggerFetch = () => {
    setPage(0);
    setFetchKey((k) => k + 1);
  };

  // Cargar datos con paginación y filtros server-side
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page + 1));
        params.set("limit", String(rowsPerPage));

        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (filtroFormato) params.set("format", filtroFormato);

        if (filters.edadRange[0] > 0 || filters.edadRange[1] < 100) {
          params.set("age_min", String(filters.edadRange[0]));
          params.set("age_max", String(filters.edadRange[1]));
        }

        if (filters.cumpleanosModo === "mes" && filters.mesSeleccionado !== null) {
          params.set("birthday_month", String(filters.mesSeleccionado + 1));
        } else if (filters.cumpleanosModo === "dia" && filters.diaCumpleanos) {
          const parts = filters.diaCumpleanos.split("-");
          params.set("birthday_day", `${parts[1]}-${parts[2]}`);
        }

        if (filters.filtroTelefono === "con") params.set("phone", "true");
        else if (filters.filtroTelefono === "sin") params.set("phone", "false");

        if (filters.filtroSexo) params.set("sex", filters.filtroSexo);

        const response = await getData<BackendResponse>(`ule/registered?${params.toString()}`);

        if (response?.data) {
          setData(response.data.data);
          setTotalCount(response.data.totalCount);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Error al cargar los datos. Por favor, intenta de nuevo.");
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filtroFormato, searchTerm, fetchKey, getData]);

  const dataFormateados = useFormatTableData(data);
  const empadronadosFiltrados = dataFormateados;

  const isEdadFiltered = filters.edadRange[0] > 0 || filters.edadRange[1] < 100;
  const isCumpleanosFiltered =
    filters.cumpleanosModo === "mes" ? filters.mesSeleccionado !== null : filters.diaCumpleanos !== "";

  // Sincroniza drafts al abrir el panel de filtros
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    filters.setFiltroTelefonoDraft(filters.filtroTelefono);
    filters.setFiltroSexoDraft(filters.filtroSexo);
    filters.handleFilterClick(event);
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
    setFiltroFormato("");
    clearPanelFilters();
  };

  const hayFiltrosActivos = searchTerm || filtroFormato || isEdadFiltered || isCumpleanosFiltered;

  // Descargar Excel (obtiene todos los datos filtrados del backend)
  const descargarExcel = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "99999");
      params.set("page", "1");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (filtroFormato) params.set("format", filtroFormato);
      if (isEdadFiltered) {
        params.set("age_min", String(filters.edadRange[0]));
        params.set("age_max", String(filters.edadRange[1]));
      }
      if (filters.cumpleanosModo === "mes" && filters.mesSeleccionado !== null) {
        params.set("birthday_month", String(filters.mesSeleccionado + 1));
      } else if (filters.cumpleanosModo === "dia" && filters.diaCumpleanos) {
        const parts = filters.diaCumpleanos.split("-");
        params.set("birthday_day", `${parts[1]}-${parts[2]}`);
      }
      if (filters.filtroTelefono === "con") params.set("phone", "true");
      else if (filters.filtroTelefono === "sin") params.set("phone", "false");
      if (filters.filtroSexo) params.set("sex", filters.filtroSexo);

      const response = await getData<BackendResponse>(`ule/registered?${params.toString()}`);
      if (!response?.data) return;

      const datosExcel = response.data.data.map((e) => ({
        "DNI": e.dni,
        "Nombres": e.name,
        "Apellidos": e.lastname,
        "Teléfono": formatearTelefono(e.phone),
        "Formato": e.format,
        "FSU": e.fsu || "",
        "S100": e.s100 || "",
        "Nivel": e.level,
        "Miembros": e.members,
        "Urbanización": e.urban?.name || "",
        "Empadronador": e.enumerator ? `${e.enumerator.name} ${e.enumerator.lastname}` : "",
        "Fecha Registro": formatearFecha(e.registered_at),
        "Fecha Nacimiento": formatearFecha(e.birthday),
        "Edad": e.birthday ? calcularEdad(e.birthday) : "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(datosExcel);
      ws["!cols"] = [
        { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 8 },  { wch: 10 }, { wch: 25 },
        { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 6 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Empadronados ULE");

      let fileName = "empadronados_ule";
      if (filtroFormato) fileName += `_${filtroFormato}`;
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatoColor = (formato: string) => {
    switch (formato) {
      case "FSU": return "#d81b7e";
      case "S100": return "#00a3a8";
      default: return "#64748b";
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case "P": return "success";
      case "NP": return "warning";
      default: return "default";
    }
  };

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Box
            sx={{
              background: `linear-gradient(135deg, ${subgerencia.color}15 0%, ${subgerencia.color}30 100%)`,
              color: subgerencia.color,
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              boxShadow: `0 4px 12px ${subgerencia.color}25`,
            }}
          >
            <People sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: subgerencia.color }}>
            ULE - Empadronados
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ ml: 7.5 }}>
          Listado de personas empadronadas en la Unidad Local de Empadronamiento
        </Typography>
      </Box>

      {/* Mensaje de error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tarjeta principal */}
      <Card
        sx={{
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Barra de filtros */}
          <Box mb={3} display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              placeholder="Buscar por nombre, DNI, FSU, S100..."
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
                minWidth: 300,
                "& .MuiOutlinedInput-root": { borderRadius: "8px", backgroundColor: "#f8fafc" },
              }}
            />

            <TextField
              select
              size="small"
              label="Formato"
              value={filtroFormato}
              onChange={(e) => { setFiltroFormato(e.target.value); setPage(0); }}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="FSU">FSU</MenuItem>
              <MenuItem value="S100">S100</MenuItem>
            </TextField>

            <Tooltip title="Filtros de edad y cumpleaños">
              <IconButton
                onClick={handleFilterClick}
                sx={{
                  backgroundColor: filters.filterOpen || isEdadFiltered || isCumpleanosFiltered ? "#fce7f3" : "#f8fafc",
                  border: `1px solid ${filters.filterOpen || isEdadFiltered || isCumpleanosFiltered ? subgerencia.color : "#e2e8f0"}`,
                  borderRadius: "8px",
                  "&:hover": { backgroundColor: "#fce7f3", borderColor: subgerencia.color },
                }}
              >
                <FilterList
                  sx={{
                    color: filters.filterOpen || isEdadFiltered || isCumpleanosFiltered
                      ? subgerencia.color
                      : "#64748b",
                    fontSize: 20,
                  }}
                />
              </IconButton>
            </Tooltip>

            {/* Chip: filtro edad activo */}
            {isEdadFiltered && (
              <Box sx={{ backgroundColor: "#dbeafe", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="caption" color="#1e40af">
                  Edad: {filters.edadRange[0]} - {filters.edadRange[1]} años
                </Typography>
                <IconButton size="small" onClick={() => { filters.setEdadRange([0, 100]); triggerFetch(); }} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: "#1e40af" }} />
                </IconButton>
              </Box>
            )}

            {/* Chip: filtro cumpleaños activo */}
            {isCumpleanosFiltered && (
              <Box sx={{ backgroundColor: "#fce7f3", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Cake sx={{ fontSize: 14, color: "#be185d" }} />
                <Typography variant="caption" color="#be185d">
                  {filters.cumpleanosModo === "mes" && filters.mesSeleccionado !== null
                    ? MESES_LABELS[filters.mesSeleccionado].slice(0, 3)
                    : filters.diaCumpleanos.split("-").slice(1).reverse().join("/")}
                </Typography>
                <IconButton size="small" onClick={() => { filters.setMesSeleccionado(null); filters.setDiaCumpleanos(""); triggerFetch(); }} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: "#be185d" }} />
                </IconButton>
              </Box>
            )}

            {/* Chip: filtro teléfono activo */}
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

            {/* Chip: filtro sexo activo */}
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

            <Box sx={{ flex: 1 }} />

            {hayFiltrosActivos && (
              <Tooltip title="Limpiar filtros">
                <IconButton onClick={limpiarTodo} size="small">
                  <Clear />
                </IconButton>
              </Tooltip>
            )}

            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={descargarExcel}
              disabled={isLoading || isExporting || empadronadosFiltrados.length === 0}
              sx={{
                backgroundColor: subgerencia.color,
                "&:hover": { backgroundColor: "#b01668" },
              }}
            >
              Descargar Excel
            </Button>
          </Box>

          {/* Panel de filtros avanzados */}
          <FilterPanel
            anchor={filters.filterAnchor}
            onClose={filters.handleFilterClose}
            onApply={handleApplyFilters}
            onClear={clearPanelFilters}
            filterType={filters.filterType}
            onFilterTypeChange={filters.setFilterType}
            edadRange={filters.edadRange}
            edadMax={100}
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
            accentColor={subgerencia.color}
            accentBg="#fce7f3"
          />

          {/* Resumen */}
          <Box mb={2} display="flex" gap={2} flexWrap="wrap">
            <Chip
              label={`${totalCount.toLocaleString()} registros`}
              size="small"
              sx={{ backgroundColor: "#f1f5f9" }}
            />
            {filtroFormato && (
              <Chip
                label={`Formato: ${filtroFormato}`}
                size="small"
                onDelete={() => setFiltroFormato("")}
                sx={{ backgroundColor: getFormatoColor(filtroFormato), color: "white" }}
              />
            )}
          </Box>

          {/* Tabla */}
          {isLoading ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={400} gap={1}>
              <CircularProgress sx={{ color: subgerencia.color }} />
              <Typography variant="caption" color="text.secondary">
                Cargando empadronados...
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: "12px",
                  boxShadow: "none",
                  border: "1px solid #e2e8f0",
                  maxHeight: "calc(100vh - 420px)",
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                      <TableCell sx={{ fontWeight: 600, color: "#334155" }}>DNI</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Nombre Completo</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Teléfono</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Sexo</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Formato</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#334155" }}>FSU / S100</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Nivel</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Miembros</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Edad</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Empadronador</TableCell>
                      {canShowObservacion() && <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Observación</TableCell>}
                      <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {empadronadosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No se encontraron registros con los filtros aplicados
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      empadronadosFiltrados.map((empadronado, index) => (
                        <TableRow
                          key={empadronado.id}
                          onClick={() => dialog.handleOpenDetail(empadronado)}
                          sx={{
                            backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                            "&:hover": { backgroundColor: "#fdf2f8", cursor: "pointer" },
                            transition: "background-color 0.2s",
                          }}
                        >
                          <TableCell sx={{ fontFamily: "monospace", fontWeight: 500 }}>
                            {empadronado.dni}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {empadronado.name} {empadronado.lastname}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatearTelefono(empadronado.phone) || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {empadronado.sex === "MALE" ? (
                              <Chip
                                icon={<Male sx={{ fontSize: "0.9rem !important", color: "white !important" }} />}
                                label="Hombre" size="small"
                                sx={{ backgroundColor: "#1e40af", color: "white", fontWeight: 700, fontSize: "0.75rem", borderRadius: "20px", "& .MuiChip-icon": { color: "white" } }}
                              />
                            ) : empadronado.sex === "FEMALE" ? (
                              <Chip
                                icon={<Female sx={{ fontSize: "0.9rem !important", color: "white !important" }} />}
                                label="Mujer" size="small"
                                sx={{ backgroundColor: "#be185d", color: "white", fontWeight: 700, fontSize: "0.75rem", borderRadius: "20px", "& .MuiChip-icon": { color: "white" } }}
                              />
                            ) : (
                              <Chip
                                label="Sin dato" size="small"
                                sx={{ backgroundColor: "#f1f5f9", color: "#94a3b8", fontWeight: 600, fontSize: "0.75rem", borderRadius: "20px" }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={empadronado.format}
                              size="small"
                              sx={{ backgroundColor: getFormatoColor(empadronado.format), color: "white", fontWeight: 500, fontSize: "0.7rem" }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                            {empadronado.format === "FSU" ? empadronado.fsu : empadronado.s100}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={empadronado.level}
                              size="small"
                              color={getNivelColor(empadronado.level) as "success" | "warning" | "default"}
                              sx={{ fontWeight: 500, fontSize: "0.7rem" }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={500}>
                              {empadronado.members}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {empadronado.birthday ? (
                              <Box display="flex" flexDirection="column" alignItems="center" gap={0.3}>
                                <Chip
                                  label={`${calcularEdad(empadronado.birthday)} años`}
                                  size="small"
                                  sx={{ backgroundColor: "#f3e5f5", color: "#7b1fa2", fontWeight: 600, fontSize: "0.75rem" }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                  {formatearFecha(empadronado.birthday)}
                                </Typography>
                              </Box>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              title={empadronado.enumerator ? `${empadronado.enumerator.name} ${empadronado.enumerator.lastname}` : ""}
                            >
                              {empadronado.enumerator
                                ? `${empadronado.enumerator.name} ${empadronado.enumerator.lastname}`
                                : "-"}
                            </Typography>
                          </TableCell>
                          {canShowObservacion() && (
                          <TableCell sx={{ minWidth: 160 }} onClick={(e) => e.stopPropagation()}>
                            <TextField
                              size="small"
                              placeholder="Escribir..."
                              value={observaciones[empadronado.id] || ""}
                              onChange={(e) => setObservaciones((prev) => ({ ...prev, [empadronado.id]: e.target.value }))}
                              multiline
                              maxRows={2}
                              fullWidth
                              sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.78rem", borderRadius: "6px", backgroundColor: "white" } }}
                            />
                          </TableCell>
                          )}
                          <TableCell align="center">
                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                              <Tooltip title="Ver detalles">
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); dialog.handleOpenDetail(empadronado); }}
                                  sx={{ color: "#64748b", "&:hover": { backgroundColor: "#f1f5f9" } }}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {canUpdate("ULE") && (
                              <Tooltip title="Editar">
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); }}
                                  sx={{ color: "#0891b2", "&:hover": { backgroundColor: "rgba(8, 145, 178, 0.1)" } }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              )}
                              {canDelete("ULE") && (
                              <Tooltip title="Eliminar">
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); }}
                                  sx={{ color: "#dc2626", "&:hover": { backgroundColor: "rgba(220, 38, 38, 0.1)" } }}
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
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                }
                sx={{ borderTop: "1px solid #e2e8f0", mt: 2 }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalles */}
      <Dialog
        open={dialog.detailOpen}
        onClose={dialog.handleCloseDetail}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "#fdf2f8",
            borderBottom: "1px solid #fce7f3",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <People sx={{ color: subgerencia.color }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#334155" }}>
              Detalles del Empadronado
            </Typography>
          </Box>
          <IconButton onClick={dialog.handleCloseDetail} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          {dialog.selectedItem && (
            <Grid container spacing={3}>
              {/* Información Personal */}
              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#475569" }} gutterBottom>
                  <Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                  Información Personal
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  <Badge sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
                  DNI
                </Typography>
                <Typography variant="body2" fontWeight={500}>{dialog.selectedItem.dni}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Nombres</Typography>
                <Typography variant="body2" fontWeight={500}>{dialog.selectedItem.name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Apellidos</Typography>
                <Typography variant="body2" fontWeight={500}>{dialog.selectedItem.lastname}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  <Phone sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
                  Teléfono
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatearTelefono(dialog.selectedItem.phone) || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  <CalendarMonth sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
                  Fecha de Nacimiento
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dialog.selectedItem.birthday
                    ? `${formatearFecha(dialog.selectedItem.birthday)} (${calcularEdad(dialog.selectedItem.birthday)} años)`
                    : "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  <Groups sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
                  Miembros del Hogar
                </Typography>
                <Typography variant="body2" fontWeight={600} fontSize="1.1rem">
                  {dialog.selectedItem.members}
                </Typography>
              </Grid>

              {/* Información de Registro */}
              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#475569", mt: 2 }} gutterBottom>
                  <Assignment sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                  Información de Registro
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Formato</Typography>
                <Box mt={0.5}>
                  <Chip
                    label={dialog.selectedItem.format}
                    size="small"
                    sx={{ backgroundColor: getFormatoColor(dialog.selectedItem.format), color: "white", fontWeight: 500 }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Código FSU</Typography>
                <Typography variant="body2" fontWeight={500} sx={{ fontFamily: "monospace" }}>
                  {dialog.selectedItem.fsu || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Código S100</Typography>
                <Typography variant="body2" fontWeight={500} sx={{ fontFamily: "monospace" }}>
                  {dialog.selectedItem.s100 || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Nivel</Typography>
                <Box mt={0.5}>
                  <Chip
                    label={dialog.selectedItem.level === "P" ? "Pobre" : dialog.selectedItem.level === "NP" ? "No Pobre" : dialog.selectedItem.level}
                    size="small"
                    color={getNivelColor(dialog.selectedItem.level) as "success" | "warning" | "default"}
                    sx={{ fontWeight: 500 }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Fecha de Registro</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatearFecha(dialog.selectedItem.registered_at)}
                </Typography>
              </Grid>

              {/* Ubicación */}
              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#475569", mt: 2 }} gutterBottom>
                  <Home sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                  Ubicación
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Urbanización</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dialog.selectedItem.urban?.name || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">Latitud</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dialog.selectedItem.latitude || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">Longitud</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dialog.selectedItem.longitude || "-"}
                </Typography>
              </Grid>

              {/* Empadronador */}
              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#475569", mt: 2 }} gutterBottom>
                  <Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                  Empadronador
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              {dialog.selectedItem.enumerator ? (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Nombre Completo</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {dialog.selectedItem.enumerator.name} {dialog.selectedItem.enumerator.lastname}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">DNI</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {dialog.selectedItem.enumerator.dni}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatearTelefono(dialog.selectedItem.enumerator.phone) || "-"}
                    </Typography>
                  </Grid>
                </>
              ) : (
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Sin empadronador asignado
                  </Typography>
                </Grid>
              )}

              {/* Caja */}
              {dialog.selectedItem.box && (
                <>
                  <Grid size={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#475569", mt: 2 }} gutterBottom>
                      Caja
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Código de Caja</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {dialog.selectedItem.box.code_num}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={dialog.handleCloseDetail} sx={{ textTransform: "none", color: "#64748b" }}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={dialog.handleCloseDetail}
            sx={{ textTransform: "none", backgroundColor: "#0891b2", "&:hover": { backgroundColor: "#0e7490" } }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
