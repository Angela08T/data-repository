"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  TextField,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Slider,
} from "@mui/material";
import {
  Download,
  Refresh,
  Search,
  FilterList,
  Cake,
  Clear,
  Close,
  PhoneEnabled,
  PhoneDisabled,
  Female,
  Male,
} from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import * as XLSX from "xlsx";
import { calcularEdad, formatearFecha, formatearTelefono, MESES } from "@/lib/utils/formatters";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.SERVICIOS_SOCIALES];
const PROGRAM_ID = "a343b6c5-9b32-4c2e-bb59-895bce9d55ae";

// apiName = nombre exacto del módulo en la BD (para filtro server-side)
// supEndpoint = true → usa endpoint support/sup en vez de general
const MODULOS_FIJOS = [
  { name: "Participación Vecinal", apiName: "PARTICIPACION VECINAL", color: "#00a3a8" },
  { name: "Cultura y Deporte",     apiName: "CULTURA Y DEPORTE",     color: "#0288d1" },
  { name: "Salud y Sanidad",       apiName: "COMPROMISO I",           color: "#2e7d32" },
  { name: "Apoyo",                 apiName: "SUP",                    color: "#7b1fa2" },
];

// Normaliza a minúsculas sin tildes para comparaciones robustas
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

type FilterType = "edad" | "cumpleanos" | "telefono" | "sexo";

// ============================================
// INTERFACES BACKEND
// ============================================
interface GeneralPersonBackend {
  id: string;
  name: string;
  lastname: string;
  dni: string;
  phone: string | null;
  birthday: string | null;
  sex: "MALE" | "FEMALE" | null;
  message: string | null;
  answer: string | null;
  citizen_id: string;
  module_id: string;
  module: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  send: string | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: GeneralPersonBackend[];
    totalCount: number;
  };
}

// ============================================
// INTERFACE FRONTEND
// ============================================
interface PersonaTabla {
  id: string;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  sexo: "MALE" | "FEMALE" | null;
  fechaNacimiento: string | null;
  edad: number;
  moduloId: string;
  moduloNombre: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ListaGeneralServiciosSocialesPage() {
  const { canShowObservacion } = usePermissions();
  const { getData } = useFetch();

  // Datos
  const [data, setData] = useState<PersonaTabla[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [moduloTotals, setModuloTotals] = useState<Record<string, number>>({});

  // Paginación server-side
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [fetchKey, setFetchKey] = useState(0);

  // Mapa de módulos indexado por apiName (valor que devuelve la API)
  const moduloMap = useMemo(() => {
    const map: Record<string, { name: string; apiName: string; color: string }> = {};
    MODULOS_FIJOS.forEach((m) => { map[normalize(m.apiName)] = m; });
    return map;
  }, []);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("edad");
  const [edadRange, setEdadRange] = useState<number[]>([0, 110]);
  const [filtroMes, setFiltroMes] = useState<number | "">("");
  const [filtroDia, setFiltroDia] = useState("");
  const [filtroTelefono, setFiltroTelefono] = useState<"" | "con" | "sin">("");
  const [filtroTelefonoDraft, setFiltroTelefonoDraft] = useState<"" | "con" | "sin">("");
  const [filtroSexo, setFiltroSexo] = useState<"" | "FEMALE" | "MALE">("");
  const [filtroSexoDraft, setFiltroSexoDraft] = useState<"" | "FEMALE" | "MALE">("");
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null);
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});

  // Debounce de búsqueda (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cargar totales por módulo — limit=1 para obtener solo totalCount
  useEffect(() => {
    const fetchTotals = async () => {
      const counts: Record<string, number> = {};
      await Promise.allSettled(
        MODULOS_FIJOS.map(async (mod) => {
          try {
            const res = await getData<BackendResponse>(
              `general?program_id=${PROGRAM_ID}&module_name=${encodeURIComponent(mod.apiName)}&page=1&limit=1`
            );
            counts[mod.name] = res?.data?.totalCount ?? 0;
          } catch {
            counts[mod.name] = 0;
          }
        })
      );
      setModuloTotals(counts);
    };
    fetchTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getData]);

  // Cargar datos — server-side paginado, endpoint general para todos los módulos
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const selectedMod = MODULOS_FIJOS.find((m) => m.name === filtroModulo);
        const params = new URLSearchParams();
        params.set("program_id", PROGRAM_ID);
        params.set("page", String(page + 1));
        params.set("limit", String(rowsPerPage));

        if (debouncedSearch) params.set("search", debouncedSearch);
        if (selectedMod) params.set("module_name", selectedMod.apiName);

        if (edadRange[0] > 0 || edadRange[1] < 110) {
          params.set("age_min", String(edadRange[0]));
          params.set("age_max", String(edadRange[1]));
        }
        if (filtroMes && filtroDia) {
          params.set("birthday", `${String(filtroMes).padStart(2, "0")}-${String(filtroDia).padStart(2, "0")}`);
        } else if (filtroMes) {
          params.set("month", String(filtroMes));
        }
        if (filtroTelefono === "con") params.set("phone", "true");
        else if (filtroTelefono === "sin") params.set("phone", "false");
        if (filtroSexo) params.set("sex", filtroSexo);

        const response = await getData<BackendResponse>(`general?${params.toString()}`);
        if (response?.data) {
          setData(
            response.data.data.map((item: GeneralPersonBackend) => ({
              id: item.id,
              nombreCompleto: `${item.name} ${item.lastname}`.trim(),
              nombre: item.name,
              apellido: item.lastname,
              dni: item.dni || "-",
              telefono: item.phone || "",
              sexo: item.sex ?? null,
              fechaNacimiento: item.birthday,
              edad: calcularEdad(item.birthday),
              moduloId: item.module?.id || item.module_id,
              moduloNombre: item.module?.name || "-",
            }))
          );
          setTotalCount(response.data.totalCount);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, fetchKey, debouncedSearch, filtroModulo, edadRange, filtroMes, filtroDia, filtroTelefono, filtroSexo, getData]);

  const formattedData = useFormatTableData(data);
  const filteredData = formattedData;

  const [isExporting, setIsExporting] = useState(false);

  // Exportar Excel — mismo endpoint que la tabla
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const selectedMod = MODULOS_FIJOS.find((m) => m.name === filtroModulo);
      const fechaISO = new Date().toISOString().slice(0, 10);

      const params = new URLSearchParams({ page: "1", limit: "99999", program_id: PROGRAM_ID });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedMod) params.set("module_name", selectedMod.apiName);
      if (edadRange[0] > 0 || edadRange[1] < 110) {
        params.set("age_min", String(edadRange[0]));
        params.set("age_max", String(edadRange[1]));
      }
      if (filtroMes && filtroDia) params.set("birthday", `${String(filtroMes).padStart(2, "0")}-${String(filtroDia).padStart(2, "0")}`);
      else if (filtroMes) params.set("month", String(filtroMes));
      if (filtroTelefono === "con") params.set("phone", "true");
      else if (filtroTelefono === "sin") params.set("phone", "false");
      if (filtroSexo) params.set("sex", filtroSexo);

      const response = await getData<BackendResponse>(`general?${params}`);
      if (!response?.data) return;

      const exportData = response.data.data.map((item: GeneralPersonBackend, i: number) => ({
        "#": i + 1,
        "Nombre Completo": `${item.name} ${item.lastname}`.trim(),
        DNI: item.dni || "-",
        Teléfono: formatearTelefono(item.phone),
        "Fecha de Nacimiento": formatearFecha(item.birthday),
        Edad: calcularEdad(item.birthday),
        Módulo: item.module?.name || "-",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws, "Lista General");
      let fileName = "lista_general_servicios_sociales";
      if (filtroModulo) fileName += `_${filtroModulo.toLowerCase().replace(/\s/g, "_")}`;
      XLSX.writeFile(wb, `${fileName}_${fechaISO}.xlsx`);
    } catch (error) {
      console.error("Error exportando:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setFiltroModulo("");
    setEdadRange([0, 110]);
    setFiltroDia("");
    setFiltroMes("");
    setFiltroTelefono("");
    setFiltroTelefonoDraft("");
    setFiltroSexo("");
    setFiltroSexoDraft("");
    setPage(0);
    setFetchKey((k) => k + 1);
  };

  const handleRefresh = () => {
    setPage(0);
    setFetchKey((k) => k + 1);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFiltroTelefonoDraft(filtroTelefono);
    setFiltroSexoDraft(filtroSexo);
    setFilterAnchor(event.currentTarget);
  };

  const handleFilterClose = () => setFilterAnchor(null);

  const handleFilterTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFilterType: FilterType | null
  ) => {
    if (newFilterType !== null) setFilterType(newFilterType);
  };

  const handleEdadChange = (_event: unknown, newValue: number | number[]) => {
    setEdadRange(newValue as number[]);
  };

  const filterOpen = Boolean(filterAnchor);
  const isEdadFiltered = edadRange[0] > 0 || edadRange[1] < 110;
  const hayFiltrosActivos = searchTerm || filtroModulo || filtroDia || filtroMes || isEdadFiltered || filtroTelefono || filtroSexo;

  const totalModulosSum = Object.values(moduloTotals).reduce((s, n) => s + n, 0);
  const grandTotal = totalModulosSum > 0 ? totalModulosSum : totalCount;

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={3}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            color: subgerencia.color,
            fontWeight: 700,
            fontFamily: "'Poppins', 'Roboto', sans-serif",
          }}
        >
          Lista General
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Listado general de personas registradas en todos los módulos
        </Typography>
      </Box>

      {/* Barra de herramientas y filtros */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          {/* Búsqueda */}
          <TextField
            size="small"
            placeholder="Buscar por nombre, DNI, teléfono, módulo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 300 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Filtro por módulo */}
          <TextField
            select
            size="small"
            label="Módulo"
            value={filtroModulo}
            onChange={(e) => { setFiltroModulo(e.target.value); setPage(0); setFetchKey((k) => k + 1); }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos los módulos</MenuItem>
            {MODULOS_FIJOS.map((mod) => (
              <MenuItem key={mod.name} value={mod.name}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: mod.color }} />
                  {mod.name}
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {/* Botón filtros avanzados */}
          <Tooltip title="Filtros de edad, cumpleaños, teléfono y sexo">
            <IconButton
              onClick={handleFilterClick}
              sx={{
                backgroundColor:
                  filterOpen || isEdadFiltered || filtroDia || filtroMes || filtroTelefono || filtroSexo
                    ? "#e0f7fa"
                    : "#f8fafc",
                border: `1px solid ${
                  filterOpen || isEdadFiltered || filtroDia || filtroMes || filtroTelefono || filtroSexo
                    ? subgerencia.color
                    : "#e2e8f0"
                }`,
                borderRadius: "8px",
                "&:hover": { backgroundColor: "#e0f7fa", borderColor: subgerencia.color },
              }}
            >
              <FilterList
                sx={{
                  color:
                    filterOpen || isEdadFiltered || filtroDia || filtroMes || filtroTelefono || filtroSexo
                      ? subgerencia.color
                      : "#64748b",
                  fontSize: 20,
                }}
              />
            </IconButton>
          </Tooltip>

          {/* Chips de filtros activos inline */}
          {isEdadFiltered && (
            <Box sx={{ backgroundColor: "#e0f7fa", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="caption" color={subgerencia.color}>
                Edad: {edadRange[0]} - {edadRange[1]} años
              </Typography>
              <IconButton size="small" onClick={() => { setEdadRange([0, 110]); setPage(0); setFetchKey((k) => k + 1); }} sx={{ p: 0.25 }}>
                <Close sx={{ fontSize: 14, color: subgerencia.color }} />
              </IconButton>
            </Box>
          )}
          {(filtroDia || filtroMes) && (
            <Box sx={{ backgroundColor: "#e0f7fa", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
              <Cake sx={{ fontSize: 14, color: subgerencia.color }} />
              <Typography variant="caption" color={subgerencia.color}>
                {filtroMes && !filtroDia && MESES.find((m) => m.value === filtroMes)?.label}
                {filtroDia && filtroMes && `${filtroDia}/${filtroMes}`}
                {filtroDia && !filtroMes && `Día ${filtroDia}`}
              </Typography>
              <IconButton size="small" onClick={() => { setFiltroDia(""); setFiltroMes(""); setPage(0); setFetchKey((k) => k + 1); }} sx={{ p: 0.25 }}>
                <Close sx={{ fontSize: 14, color: subgerencia.color }} />
              </IconButton>
            </Box>
          )}

          {/* Espaciador */}
          <Box sx={{ flex: 1 }} />

          {/* Acciones */}
          {hayFiltrosActivos && (
            <Tooltip title="Limpiar filtros">
              <IconButton onClick={limpiarFiltros} size="small">
                <Clear />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Actualizar datos">
            <IconButton onClick={handleRefresh} disabled={isLoading} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={isLoading || isExporting || filteredData.length === 0}
            sx={{
              backgroundColor: subgerencia.color,
              "&:hover": { backgroundColor: subgerencia.colorHover },
            }}
          >
            {isExporting ? "Exportando..." : "Descargar Excel"}
          </Button>
        </Box>

        {/* Popover de filtros avanzados */}
        <Popover
          open={filterOpen}
          anchorEl={filterAnchor}
          onClose={handleFilterClose}
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
              onChange={handleFilterTypeChange}
              size="small"
              fullWidth
              sx={{ mb: 2.5 }}
            >
              <ToggleButton value="edad" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#e0f7fa", color: subgerencia.color, "&:hover": { backgroundColor: "#b2ebf2" } } }}>
                Edad
              </ToggleButton>
              <ToggleButton value="cumpleanos" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#e0f7fa", color: subgerencia.color, "&:hover": { backgroundColor: "#b2ebf2" } } }}>
                Cumpleaños
              </ToggleButton>
              <ToggleButton value="telefono" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#dcfce7", color: "#16a34a", "&:hover": { backgroundColor: "#bbf7d0" } } }}>
                Teléfono
              </ToggleButton>
              <ToggleButton value="sexo" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#e0f7fa", color: subgerencia.color, "&:hover": { backgroundColor: "#b2ebf2" } } }}>
                Género
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider sx={{ mb: 2 }} />

            {/* Filtro por edad */}
            {filterType === "edad" && (
              <>
                <Typography variant="subtitle2" fontWeight={600} color="#334155" mb={1.5}>
                  Rango de edad
                </Typography>
                <Slider
                  value={edadRange}
                  onChange={handleEdadChange}
                  valueLabelDisplay="auto"
                  min={0}
                  max={110}
                  sx={{
                    color: subgerencia.color,
                    "& .MuiSlider-thumb": { backgroundColor: subgerencia.color },
                    "& .MuiSlider-track": { backgroundColor: subgerencia.color },
                  }}
                />
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="text.secondary">{edadRange[0]} años</Typography>
                  <Typography variant="caption" color="text.secondary">{edadRange[1]} años</Typography>
                </Box>
              </>
            )}

            {/* Filtro por cumpleaños */}
            {filterType === "cumpleanos" && (
              <>
                <Typography variant="subtitle2" fontWeight={600} color="#334155" mb={1.5}>
                  Filtrar por cumpleaños
                </Typography>
                <TextField
                  select
                  size="small"
                  label="Mes"
                  fullWidth
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value as number | "")}
                  sx={{
                    mb: 2,
                    "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: subgerencia.color } },
                  }}
                >
                  <MenuItem value="">Todos los meses</MenuItem>
                  {MESES.map((mes) => (
                    <MenuItem key={mes.value} value={mes.value}>{mes.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Día (opcional)"
                  type="number"
                  fullWidth
                  value={filtroDia}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || (parseInt(value) >= 1 && parseInt(value) <= 31)) {
                      setFiltroDia(value);
                    }
                  }}
                  slotProps={{ htmlInput: { min: 1, max: 31 } }}
                  helperText="Selecciona un día específico (opcional)"
                  sx={{ "& .MuiOutlinedInput-root": { "&.Mui-focused fieldset": { borderColor: subgerencia.color } } }}
                />
              </>
            )}

            {/* Filtro por teléfono */}
            {filterType === "telefono" && (
              <>
                <Typography variant="body2" color="#475569" mb={1.5}>Filtrar por número de celular</Typography>
                <ToggleButtonGroup
                  value={filtroTelefonoDraft}
                  exclusive
                  onChange={(_e, val) => { if (val !== null) setFiltroTelefonoDraft(val); }}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#f1f5f9", color: "#334155", "&:hover": { backgroundColor: "#e2e8f0" } } }}>Todos</ToggleButton>
                  <ToggleButton value="con" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#dcfce7", color: "#16a34a", "&:hover": { backgroundColor: "#bbf7d0" } } }}>
                    <PhoneEnabled sx={{ fontSize: 15, mr: 0.5 }} />Con celular
                  </ToggleButton>
                  <ToggleButton value="sin" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#fee2e2", color: "#dc2626", "&:hover": { backgroundColor: "#fecaca" } } }}>
                    <PhoneDisabled sx={{ fontSize: 15, mr: 0.5 }} />Sin celular
                  </ToggleButton>
                </ToggleButtonGroup>
              </>
            )}

            {/* Filtro por sexo */}
            {filterType === "sexo" && (
              <>
                <Typography variant="body2" color="#475569" mb={1.5}>Filtrar por género</Typography>
                <ToggleButtonGroup
                  value={filtroSexoDraft}
                  exclusive
                  onChange={(_e, val) => { if (val !== null) setFiltroSexoDraft(val); }}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#f1f5f9", color: "#334155", "&:hover": { backgroundColor: "#e2e8f0" } } }}>Todos</ToggleButton>
                  <ToggleButton value="FEMALE" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#fce7f3", color: "#be185d", "&:hover": { backgroundColor: "#fbcfe8" } } }}>
                    <Female sx={{ fontSize: 15, mr: 0.5 }} />Mujeres
                  </ToggleButton>
                  <ToggleButton value="MALE" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#dbeafe", color: "#1d4ed8", "&:hover": { backgroundColor: "#bfdbfe" } } }}>
                    <Male sx={{ fontSize: 15, mr: 0.5 }} />Hombres
                  </ToggleButton>
                </ToggleButtonGroup>
              </>
            )}

            <Box display="flex" justifyContent="flex-end" mt={2.5} gap={1}>
              <Button
                size="small"
                onClick={() => {
                  setEdadRange([0, 110]);
                  setFiltroDia("");
                  setFiltroMes("");
                  setFiltroTelefono("");
                  setFiltroTelefonoDraft("");
                  setFiltroSexo("");
                  setFiltroSexoDraft("");
                  setPage(0);
                  setFetchKey((k) => k + 1);
                }}
                sx={{ color: "#64748b", textTransform: "none" }}
              >
                Limpiar todo
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setFiltroTelefono(filtroTelefonoDraft);
                  setFiltroSexo(filtroSexoDraft);
                  setPage(0);
                  setFetchKey((k) => k + 1);
                  handleFilterClose();
                }}
                sx={{
                  backgroundColor: subgerencia.color,
                  textTransform: "none",
                  "&:hover": { backgroundColor: subgerencia.colorHover },
                }}
              >
                Aplicar
              </Button>
            </Box>
          </Box>
        </Popover>

        {/* Chips de filtros activos */}
        {hayFiltrosActivos && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Filtros activos:
            </Typography>
            {filtroModulo && (
              <Chip
                size="small"
                label={filtroModulo}
                onDelete={() => { setFiltroModulo(""); setPage(0); setFetchKey((k) => k + 1); }}
                sx={{ backgroundColor: moduloMap[filtroModulo]?.color || subgerencia.color, color: "white" }}
              />
            )}
            {filtroMes && (
              <Chip
                size="small"
                label={`Mes: ${MESES.find((m) => m.value === filtroMes)?.label}`}
                onDelete={() => { setFiltroMes(""); setPage(0); setFetchKey((k) => k + 1); }}
                icon={<Cake sx={{ color: "white !important", fontSize: 16 }} />}
                sx={{ backgroundColor: subgerencia.color, color: "white" }}
              />
            )}
            {filtroDia && (
              <Chip
                size="small"
                label={`Día: ${filtroDia}`}
                onDelete={() => { setFiltroDia(""); setPage(0); setFetchKey((k) => k + 1); }}
                sx={{ backgroundColor: subgerencia.color, color: "white" }}
              />
            )}
            {filtroTelefono && (
              <Chip
                size="small"
                label={filtroTelefono === "con" ? "Con celular" : "Sin celular"}
                onDelete={() => { setFiltroTelefono(""); setFiltroTelefonoDraft(""); setPage(0); setFetchKey((k) => k + 1); }}
                icon={
                  filtroTelefono === "con"
                    ? <PhoneEnabled sx={{ color: "white !important", fontSize: 16 }} />
                    : <PhoneDisabled sx={{ color: "white !important", fontSize: 16 }} />
                }
                sx={{ backgroundColor: filtroTelefono === "con" ? "#16a34a" : "#dc2626", color: "white" }}
              />
            )}
            {filtroSexo && (
              <Chip
                size="small"
                label={filtroSexo === "FEMALE" ? "Mujeres" : "Hombres"}
                onDelete={() => { setFiltroSexo(""); setFiltroSexoDraft(""); setPage(0); setFetchKey((k) => k + 1); }}
                icon={
                  filtroSexo === "FEMALE"
                    ? <Female sx={{ color: "white !important", fontSize: 16 }} />
                    : <Male sx={{ color: "white !important", fontSize: 16 }} />
                }
                sx={{ backgroundColor: filtroSexo === "FEMALE" ? "#be185d" : "#1d4ed8", color: "white" }}
              />
            )}
            {searchTerm && (
              <Chip
                size="small"
                label={`Búsqueda: "${searchTerm}"`}
                onDelete={() => setSearchTerm("")}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Estadísticas por módulo */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Paper sx={{ px: 2, py: 1, borderRadius: "12px", display: "flex", alignItems: "center", gap: 1 }}>
          <FilterList fontSize="small" color="action" />
          <Typography variant="body2">
            <strong>{grandTotal.toLocaleString()}</strong> registros en total
          </Typography>
        </Paper>
        {MODULOS_FIJOS.map((mod) => (
          <Paper
            key={mod.name}
            onClick={() => { setFiltroModulo(mod.name); setPage(0); setFetchKey((k) => k + 1); }}
            sx={{
              px: 2, py: 1, borderRadius: "12px", display: "flex", alignItems: "center",
              gap: 1, borderLeft: `4px solid ${mod.color}`, cursor: "pointer",
              transition: "box-shadow 0.15s",
              boxShadow: filtroModulo === mod.name ? `0 0 0 2px ${mod.color}` : undefined,
              "&:hover": { boxShadow: `0 0 0 2px ${mod.color}` },
            }}
          >
            <Typography variant="body2">
              {mod.name}:{" "}
              <strong>
                {moduloTotals[mod.name] !== undefined
                  ? moduloTotals[mod.name].toLocaleString()
                  : "…"}
              </strong>
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Tabla */}
      <Paper sx={{ borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)", overflow: "hidden" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: 400, gap: 2 }}>
            <CircularProgress sx={{ color: subgerencia.color }} />
            <Typography variant="body2" color="text.secondary">
              Cargando registros...
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "calc(100vh - 400px)" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: subgerencia.color, color: "white", fontSize: "0.78rem", whiteSpace: "nowrap", py: 1.5 }}>Nombre Completo</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: subgerencia.color, color: "white", fontSize: "0.78rem", whiteSpace: "nowrap", py: 1.5 }}>DNI</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: subgerencia.color, color: "white", fontSize: "0.78rem", whiteSpace: "nowrap", py: 1.5 }}>Sexo</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: subgerencia.color, color: "white", fontSize: "0.78rem", whiteSpace: "nowrap", py: 1.5 }}>Teléfono</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: subgerencia.color, color: "white", fontSize: "0.78rem", whiteSpace: "nowrap", py: 1.5 }}>Cumpleaños / Edad</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: subgerencia.color, color: "white", fontSize: "0.78rem", whiteSpace: "nowrap", py: 1.5 }}>Módulo</TableCell>
                    {canShowObservacion() && <TableCell sx={{ fontWeight: 700, backgroundColor: subgerencia.color, color: "white", fontSize: "0.78rem", whiteSpace: "nowrap", py: 1.5, minWidth: 160 }}>Observación</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron registros con los filtros aplicados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row: PersonaTabla, index: number) => {
                      const modInfo = moduloMap[normalize(row.moduloNombre)];
                      const modColor = modInfo?.color || subgerencia.color;
                      const modLabel = modInfo?.name || row.moduloNombre;
                      return (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{
                            backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                            "&:hover": { backgroundColor: "#e0f7fa" },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{row.nombreCompleto}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{row.dni}</Typography>
                          </TableCell>
                          <TableCell>
                            {row.sexo ? (
                              <Chip
                                size="small"
                                icon={
                                  row.sexo === "FEMALE"
                                    ? <Female sx={{ fontSize: "14px !important", color: "white !important" }} />
                                    : <Male sx={{ fontSize: "14px !important", color: "white !important" }} />
                                }
                                label={row.sexo === "FEMALE" ? "Mujer" : "Hombre"}
                                sx={{
                                  backgroundColor: row.sexo === "FEMALE" ? "#be185d" : "#1d4ed8",
                                  color: "white",
                                  fontSize: "0.7rem",
                                  height: 22,
                                  fontWeight: 600,
                                }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                label="Sin dato"
                                sx={{ backgroundColor: "#e2e8f0", color: "#64748b", fontSize: "0.7rem", height: 22, fontWeight: 500 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{formatearTelefono(row.telefono)}</Typography>
                          </TableCell>
                          <TableCell>
                            {row.fechaNacimiento ? (
                              <Box display="flex" flexDirection="column" gap={0.25}>
                                <Chip
                                  label={`${row.edad} años`}
                                  size="small"
                                  sx={{ backgroundColor: "#e0f7fa", color: subgerencia.color, fontWeight: 600, fontSize: "0.75rem", height: 22, width: "fit-content" }}
                                />
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Cake sx={{ fontSize: 12, color: subgerencia.color }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatearFecha(row.fechaNacimiento)}
                                  </Typography>
                                </Box>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.moduloNombre && row.moduloNombre !== "-" ? (
                              <Chip
                                size="small"
                                label={modLabel}
                                sx={{ backgroundColor: modColor, color: "white", fontSize: "0.7rem", height: 24, fontWeight: 600 }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
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
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={grandTotal}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
              }
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
