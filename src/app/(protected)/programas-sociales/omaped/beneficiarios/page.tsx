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
  Accessible,
  PhoneEnabled,
  PhoneDisabled,
  Wc,
  Male,
  Female,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import { useFilters } from "@/lib/hooks/useFilters";
import { useBeneficiarioDialog } from "@/lib/hooks/useBeneficiarioDialog";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { calcularEdad, formatearFecha, MESES_LABELS } from "@/lib/utils/formatters";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];
const OMAPED_COLOR = subgerencia.color;

// Traducciones
const TRADUCCIONES: Record<string, Record<string, string>> = {
  degree: {
    MILD: "Leve",
    MODERATE: "Moderado",
    SEVERE: "Severo",
    VERY_SEVERE: "Muy Severo",
  },
};

const traducir = (categoria: string, valor: string | null | undefined): string => {
  if (!valor) return "-";
  return TRADUCCIONES[categoria]?.[valor] || valor;
};

// Colores para grado de discapacidad
const DEGREE_COLORS: Record<string, { bg: string; color: string }> = {
  Leve: { bg: "#fef9c3", color: "#854d0e" },
  Moderado: { bg: "#fed7aa", color: "#9a3412" },
  Severo: { bg: "#fecaca", color: "#991b1b" },
  "Muy Severo": { bg: "#e9d5ff", color: "#6b21a8" },
};

// ============================================
// INTERFACES BACKEND
// ============================================
interface BeneficiarioOMAPEDBackend {
  id: string;
  name: string;
  lastname: string;
  doc_num: string;
  doc_type: string | null;
  phone: string | null;
  address: string | null;
  birthday: string;
  certificate: string | null;
  diagnostic1: string | null;
  conadis: string | null;
  folio: string | null;
  degree: string | null;
  sex?: string | null;
}

// Interfaz completa del GET ONE (más campos que el listado)
interface BeneficiarioOMAPEDDetalle extends BeneficiarioOMAPEDBackend {
  diagnostic2: string | null;
  atention: string | null;
  cert_disc: string | null;
  beca: string | null;
  job_placement: boolean | null;
  entrepreneurship: string | null;
  therapy: string | null;
  therapy_schedule: string | null;
  reniec: string | null;
  reniec_shift: string | null;
  fair: string | null;
  conadis_date: string | null;
  conadis_procedure: string | null;
  conadis_validity: string | null;
  unnamed: string | null;
  contigo: string | null;
  pc1000: string | null;
  fad: string | null;
  census_taker: string | null;
  state: string | null;
  commune: string | null;
  wheelchair: boolean | null;
  registered_at: string | null;
  change_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: BeneficiarioOMAPEDBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

// ============================================
// INTERFACE FRONTEND
// ============================================
interface BeneficiarioTabla {
  id: string;
  docNum: string;
  docType: string;
  nombreCompleto: string;
  telefono: string;
  fechaNacimiento: string;
  edad: number;
  sexo: string;
  grado: string;
  diagnostico: string;
  certificado: string;
  conadis: string;
  folio: string;
  direccion: string;
}

// Interfaz detalle frontend
interface BeneficiarioDetalleView {
  id: string;
  nombreCompleto: string;
  docNum: string;
  docType: string;
  telefono: string;
  direccion: string;
  fechaNacimiento: string;
  edad: number;
  grado: string;
  diagnostico1: string;
  diagnostico2: string;
  certificado: string;
  certDiscapacidad: string;
  conadis: string;
  conadisFecha: string;
  conadisTramite: string;
  conadisVigencia: string;
  folio: string;
  atencion: string;
  terapia: string;
  horarioTerapia: string;
  beca: string;
  insercionLaboral: string;
  emprendimiento: string;
  feria: string;
  reniec: string;
  turnoReniec: string;
  contigo: string;
  pc1000: string;
  fad: string;
  empadronador: string;
  estado: string;
  comuna: string;
  sillaDeRuedas: string;
  fechaRegistro: string;
  fechaCambio: string;
}

const mapDetalleToView = (item: BeneficiarioOMAPEDDetalle): BeneficiarioDetalleView => ({
  id: item.id,
  nombreCompleto: `${item.name} ${item.lastname}`.trim(),
  docNum: item.doc_num || "-",
  docType: item.doc_type || "DNI",
  telefono: item.phone || "-",
  direccion: item.address || "-",
  fechaNacimiento: item.birthday,
  edad: calcularEdad(item.birthday),
  grado: traducir("degree", item.degree),
  diagnostico1: item.diagnostic1 || "-",
  diagnostico2: item.diagnostic2 || "-",
  certificado: item.certificate || "-",
  certDiscapacidad: item.cert_disc || "-",
  conadis: item.conadis || "-",
  conadisFecha: item.conadis_date ? formatearFecha(item.conadis_date) : "-",
  conadisTramite: item.conadis_procedure || "-",
  conadisVigencia: item.conadis_validity || "-",
  folio: item.folio || "-",
  atencion: item.atention || "-",
  terapia: item.therapy || "-",
  horarioTerapia: item.therapy_schedule || "-",
  beca: item.beca || "-",
  insercionLaboral: item.job_placement === true ? "Sí" : item.job_placement === false ? "No" : "-",
  emprendimiento: item.entrepreneurship || "-",
  feria: item.fair || "-",
  reniec: item.reniec || "-",
  turnoReniec: item.reniec_shift || "-",
  contigo: item.contigo || "-",
  pc1000: item.pc1000 || "-",
  fad: item.fad || "-",
  empadronador: item.census_taker || "-",
  estado: item.state || "-",
  comuna: item.commune || "-",
  sillaDeRuedas: item.wheelchair === true ? "Sí" : item.wheelchair === false ? "No" : "-",
  fechaRegistro: item.registered_at ? formatearFecha(item.registered_at) : "-",
  fechaCambio: item.change_at ? formatearFecha(item.change_at) : "-",
});

const mapBackendToTabla = (item: BeneficiarioOMAPEDBackend): BeneficiarioTabla => ({
  id: item.id,
  docNum: item.doc_num || "-",
  docType: item.doc_type || "DNI",
  nombreCompleto: `${item.name} ${item.lastname}`.trim(),
  telefono: item.phone || "-",
  fechaNacimiento: item.birthday,
  edad: calcularEdad(item.birthday),
  sexo: item.sex === "MALE" ? "Masculino" : item.sex === "FEMALE" ? "Femenino" : "-",
  grado: traducir("degree", item.degree),
  diagnostico: item.diagnostic1 || "-",
  certificado: item.certificate || "-",
  conadis: item.conadis || "-",
  folio: item.folio || "-",
  direccion: item.address || "-",
});

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function OMAPEDBeneficiariosPage() {
  const { getData } = useFetch();

  // Estados para datos
  const [data, setData] = useState<BeneficiarioTabla[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Paginación server-side
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fetchKey, setFetchKey] = useState(0);

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Otros estados locales
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [detailData, setDetailData] = useState<BeneficiarioDetalleView | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { canShowObservacion } = usePermissions();

  // Hooks reutilizables
  const filters = useFilters({ edadMax: 110 });
  const dialog = useBeneficiarioDialog<string>();

  // Debounce de búsqueda (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const triggerFetch = () => {
    setPage(0);
    setFetchKey((k) => k + 1);
  };

  // Cargar datos con paginación y filtros server-side
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page + 1));
        params.set("limit", String(rowsPerPage));

        if (debouncedSearch.trim()) {
          params.set("search", debouncedSearch.trim());
        }

        if (filters.edadRange[0] > 0 || filters.edadRange[1] < 110) {
          params.set("age_min", String(filters.edadRange[0]));
          params.set("age_max", String(filters.edadRange[1]));
        }

        if (filters.cumpleanosModo === "mes" && filters.mesSeleccionado !== null) {
          params.set("month", String(filters.mesSeleccionado + 1));
        } else if (filters.cumpleanosModo === "dia" && filters.diaCumpleanos) {
          const parts = filters.diaCumpleanos.split("-");
          params.set("birthday", `${parts[1]}-${parts[2]}`);
        }

        if (filters.filtroTelefono === "con") {
          params.set("phone", "true");
        } else if (filters.filtroTelefono === "sin") {
          params.set("phone", "false");
        }

        if (filters.filtroSexo) {
          params.set("sex", filters.filtroSexo);
        }

        const response = await getData<BackendResponse>(
          `omaped/disabled?${params.toString()}`
        );

        if (response?.data) {
          setData(response.data.data.map(mapBackendToTabla));
          setTotalCount(response.data.totalCount);
        }
      } catch (error) {
        console.error("Error fetching OMAPED beneficiarios:", error);
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, fetchKey, debouncedSearch, getData]);

  // Handlers de filtros
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    filters.setFiltroTelefonoDraft(filters.filtroTelefono);
    filters.setFiltroSexoDraft(filters.filtroSexo);
    filters.handleFilterClick(event);
  };

  const handleMesToggle = (mes: number) => {
    filters.setMesSeleccionado(mes === filters.mesSeleccionado ? null : mes);
  };

  const handleApplyFilters = () => {
    filters.handleApplyFilters();
    triggerFetch();
  };

  const limpiarFiltros = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    filters.limpiarFiltros();
    setPage(0);
    setFetchKey((k) => k + 1);
  };

  const isEdadFiltered = filters.edadRange[0] > 0 || filters.edadRange[1] < 110;
  const isCumpleanosFiltered =
    filters.cumpleanosModo === "mes"
      ? filters.mesSeleccionado !== null
      : filters.diaCumpleanos !== "";

  const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = async (row: BeneficiarioTabla) => {
    dialog.handleOpenDetail(row.id);
    setDetailLoading(true);
    try {
      const response = await getData<{ message: string; data: BeneficiarioOMAPEDDetalle }>(
        `omaped/disabled/${row.id}`
      );
      if (response?.data) {
        setDetailData(mapDetalleToView(response.data));
      } else {
        setDetailData(null);
      }
    } catch (error) {
      console.error("Error fetching detalle OMAPED:", error);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDetailClose = () => {
    dialog.handleCloseDetail();
    setDetailData(null);
  };

  // Formatear strings del backend (Title Case)
  const dataFormateados = useFormatTableData(data);
  const filteredData = dataFormateados;

  // Exportar a Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "99999");

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      if (filters.edadRange[0] > 0 || filters.edadRange[1] < 110) {
        params.set("age_min", String(filters.edadRange[0]));
        params.set("age_max", String(filters.edadRange[1]));
      }

      if (filters.cumpleanosModo === "mes" && filters.mesSeleccionado !== null) {
        params.set("month", String(filters.mesSeleccionado + 1));
      } else if (filters.cumpleanosModo === "dia" && filters.diaCumpleanos) {
        const parts = filters.diaCumpleanos.split("-");
        params.set("birthday", `${parts[1]}-${parts[2]}`);
      }

      if (filters.filtroTelefono === "con") {
        params.set("phone", "true");
      } else if (filters.filtroTelefono === "sin") {
        params.set("phone", "false");
      }
      if (filters.filtroSexo) {
        params.set("sex", filters.filtroSexo);
      }

      const response = await getData<BackendResponse>(`omaped/disabled?${params.toString()}`);

      if (!response?.data) return;

      const exportData = response.data.data.map((item) => ({
        "Nombre Completo": `${item.name} ${item.lastname}`.trim(),
        "Tipo Doc": item.doc_type || "DNI",
        "Nro. Doc": item.doc_num || "-",
        Teléfono: item.phone || "-",
        "Fecha de Nacimiento": formatearFecha(item.birthday),
        Edad: calcularEdad(item.birthday),
        Grado: traducir("degree", item.degree),
        Diagnóstico: item.diagnostic1 || "-",
        Certificado: item.certificate || "-",
        CONADIS: item.conadis || "-",
        Folio: item.folio || "-",
        Dirección: item.address || "-",
      }));

      if (exportData.length === 0) return;

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "OMAPED Beneficiarios");
      worksheet["!cols"] = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }));
      XLSX.writeFile(
        workbook,
        `omaped_beneficiarios_${new Date().toISOString().split("T")[0]}.xlsx`
      );
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
              background: `linear-gradient(135deg, ${OMAPED_COLOR}15 0%, ${OMAPED_COLOR}30 100%)`,
              color: OMAPED_COLOR,
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              boxShadow: `0 4px 12px ${OMAPED_COLOR}25`,
            }}
          >
            <Accessible sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: OMAPED_COLOR }}>
            OMAPED - Beneficiarios
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ ml: 7.5 }}>
          Listado de personas con discapacidad registradas en OMAPED
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
                placeholder="Buscar por nombre, DNI o teléfono..."
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
                  width: 320,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f8fafc",
                    "&:hover fieldset": { borderColor: "#64748b" },
                    "&.Mui-focused fieldset": { borderColor: OMAPED_COLOR },
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
                <Box sx={{ backgroundColor: "#f3e5f5", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="caption" color="#7b1fa2">
                    Edad: {filters.edadRange[0]} - {filters.edadRange[1]} años
                  </Typography>
                  <IconButton size="small" onClick={() => { filters.setEdadRange([0, 110]); triggerFetch(); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: "#7b1fa2" }} />
                  </IconButton>
                </Box>
              )}
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
                {totalCount.toLocaleString()} beneficiario(s)
              </Typography>
            </Box>

            {/* Panel de filtros */}
            <FilterPanel
              anchor={filters.filterAnchor}
              onClose={filters.handleFilterClose}
              onApply={handleApplyFilters}
              onClear={limpiarFiltros}
              filterType={filters.filterType}
              onFilterTypeChange={filters.setFilterType}
              edadRange={filters.edadRange}
              edadMax={110}
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
              accentColor={OMAPED_COLOR}
              accentBg="#f3e5f5"
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
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>DNI</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Teléfono</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Sexo</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Edad</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Grado</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Diagnóstico</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>CONADIS</TableCell>
                    {canShowObservacion() && <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Observación</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={32} sx={{ color: OMAPED_COLOR }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Cargando beneficiarios...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron beneficiarios
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row: BeneficiarioTabla, index: number) => {
                      const gradeColors = DEGREE_COLORS[row.grado] || { bg: "#f1f5f9", color: "#475569" };
                      return (
                        <TableRow
                          key={row.id}
                          onClick={() => handleRowClick(row)}
                          sx={{
                            backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                            "&:hover": { backgroundColor: "#f1f5f9", cursor: "pointer" },
                            transition: "background-color 0.2s",
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>{row.nombreCompleto}</TableCell>
                          <TableCell>{row.docNum}</TableCell>
                          <TableCell>{row.telefono}</TableCell>
                          <TableCell>
                            {row.sexo === "Masculino" ? (
                              <Chip icon={<Male sx={{ fontSize: "0.9rem !important", color: "white !important" }} />} label="Hombre" size="small"
                                sx={{ backgroundColor: "#1e40af", color: "white", fontWeight: 700, fontSize: "0.75rem", borderRadius: "20px", "& .MuiChip-icon": { color: "white" } }} />
                            ) : row.sexo === "Femenino" ? (
                              <Chip icon={<Female sx={{ fontSize: "0.9rem !important", color: "white !important" }} />} label="Mujer" size="small"
                                sx={{ backgroundColor: "#be185d", color: "white", fontWeight: 700, fontSize: "0.75rem", borderRadius: "20px", "& .MuiChip-icon": { color: "white" } }} />
                            ) : (
                              <Chip label="Sin dato" size="small"
                                sx={{ backgroundColor: "#f1f5f9", color: "#94a3b8", fontWeight: 600, fontSize: "0.75rem", borderRadius: "20px" }} />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" flexDirection="column" alignItems="center" gap={0.3}>
                              <Chip label={`${row.edad} años`} size="small" sx={{ backgroundColor: "#f3e5f5", color: "#7b1fa2", fontWeight: 600, fontSize: "0.75rem" }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                {formatearFecha(row.fechaNacimiento)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {row.grado !== "-" ? (
                              <Chip label={row.grado} size="small" sx={{ backgroundColor: gradeColors.bg, color: gradeColors.color, fontWeight: 600, fontSize: "0.7rem" }} />
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.diagnostico}
                          </TableCell>
                          <TableCell>{row.conadis}</TableCell>
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
                                onClick={(e) => { e.stopPropagation(); handleRowClick(row); }}
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
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Accessible sx={{ color: OMAPED_COLOR }} />
            <Typography variant="h6" fontWeight={600} color="#334155">
              Detalle del Beneficiario
            </Typography>
          </Box>
          <IconButton onClick={handleDetailClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 1 }}>
          {detailLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={6}>
              <CircularProgress size={32} sx={{ color: OMAPED_COLOR }} />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Cargando detalle...
              </Typography>
            </Box>
          ) : detailData && (
            <Grid container spacing={2}>
              {/* Datos Personales */}
              <Grid size={12}>
                <Typography variant="subtitle2" fontWeight={600} color={OMAPED_COLOR} gutterBottom>
                  Datos Personales
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Nombre Completo</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.nombreCompleto}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Tipo de Documento</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.docType}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Nro. Documento</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.docNum}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Fecha de Nacimiento</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatearFecha(detailData.fechaNacimiento)}{" "}
                  <span style={{ color: "#64748b", fontWeight: 400 }}>({detailData.edad} años)</span>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.telefono}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Estado</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.estado}</Typography>
              </Grid>
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary">Dirección</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.direccion}</Typography>
              </Grid>

              {/* Información de Discapacidad */}
              <Grid size={12}>
                <Typography variant="subtitle2" fontWeight={600} color={OMAPED_COLOR} gutterBottom sx={{ mt: 2 }}>
                  Información de Discapacidad
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Grado</Typography>
                <Box mt={0.5}>
                  {detailData.grado !== "-" ? (
                    <Chip
                      label={detailData.grado}
                      size="small"
                      sx={{
                        backgroundColor: DEGREE_COLORS[detailData.grado]?.bg || "#f1f5f9",
                        color: DEGREE_COLORS[detailData.grado]?.color || "#475569",
                        fontWeight: 600,
                      }}
                    />
                  ) : (
                    <Typography variant="body2" fontWeight={500}>-</Typography>
                  )}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Diagnóstico 1</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.diagnostico1}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Diagnóstico 2</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.diagnostico2}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Certificado</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.certificado}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Cert. Discapacidad</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.certDiscapacidad}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Silla de Ruedas</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.sillaDeRuedas}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Folio</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.folio}</Typography>
              </Grid>

              {/* CONADIS */}
              <Grid size={12}>
                <Typography variant="subtitle2" fontWeight={600} color={OMAPED_COLOR} gutterBottom sx={{ mt: 2 }}>
                  CONADIS
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Nro. CONADIS</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.conadis}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Fecha</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.conadisFecha}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Trámite</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.conadisTramite}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Vigencia</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.conadisVigencia}</Typography>
              </Grid>

              {/* Atención y Servicios */}
              <Grid size={12}>
                <Typography variant="subtitle2" fontWeight={600} color={OMAPED_COLOR} gutterBottom sx={{ mt: 2 }}>
                  Atención y Servicios
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Atención</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.atencion}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Terapia</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.terapia}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Horario de Terapia</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.horarioTerapia}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Beca</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.beca}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Inserción Laboral</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.insercionLaboral}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Emprendimiento</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.emprendimiento}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Feria</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.feria}</Typography>
              </Grid>

              {/* RENIEC */}
              <Grid size={12}>
                <Typography variant="subtitle2" fontWeight={600} color={OMAPED_COLOR} gutterBottom sx={{ mt: 2 }}>
                  RENIEC
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">RENIEC</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.reniec}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Turno RENIEC</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.turnoReniec}</Typography>
              </Grid>

              {/* Programas */}
              <Grid size={12}>
                <Typography variant="subtitle2" fontWeight={600} color={OMAPED_COLOR} gutterBottom sx={{ mt: 2 }}>
                  Programas
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Contigo</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.contigo}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">PC1000</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.pc1000}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">FAD</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.fad}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Comuna</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.comuna}</Typography>
              </Grid>

              {/* Otros */}
              <Grid size={12}>
                <Typography variant="subtitle2" fontWeight={600} color={OMAPED_COLOR} gutterBottom sx={{ mt: 2 }}>
                  Otros
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Empadronador</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.empadronador}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Fecha de Registro</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.fechaRegistro}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Fecha de Cambio</Typography>
                <Typography variant="body2" fontWeight={500}>{detailData.fechaCambio}</Typography>
              </Grid>
            </Grid>
          )}
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
