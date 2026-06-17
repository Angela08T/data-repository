"use client";

import { useState, useEffect } from "react";
import {
  Card, CardContent, Typography, Box, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Paper, IconButton, Tooltip, Popover,
  Slider, Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Divider,
  ToggleButton, ToggleButtonGroup, CircularProgress, Chip,
} from "@mui/material";
import { Search, SoupKitchen, FilterList, FileDownload, Close, Visibility, Cake, PhoneEnabled, PhoneDisabled, Wc, Male, Female } from "@mui/icons-material";
import * as XLSX from "xlsx";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { calcularEdad, formatearFecha, MESES_LABELS as MESES } from "@/lib/utils/formatters";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];
const TRADUCCIONES_SEXO: Record<string, string> = { MALE: "Masculino", FEMALE: "Femenino" };
const TRADUCCIONES_SOCIAL: Record<string, string> = { PARTNER: "Socio", BENEFICIARY: "Beneficiario" };

interface RecipientBackend {
  id: string; doc_num: string; doc_type: string; lastname: string; name: string;
  address: string | null; phone: string | null; pregnant: boolean; disabled: boolean;
  assignee_doc_num: string | null; assignee_lastname: string | null; assignee_name: string | null;
  birthday: string | null; registered_at: string | null; created_at: string; updated_at: string;
  deleted_at: string | null; center_id: string; modality: string; sex: string; social: string;
}

interface BackendResponse {
  message: string;
  data: { data: RecipientBackend[]; currentPage: number; pageCount: number; totalCount: number; totalPages: number; };
}

interface BeneficiarioFrontend {
  id: string; nombreCompleto: string; dni: string; tipoDoc: string; telefono: string;
  direccion: string; fechaNacimiento: string | null; sexo: string; social: string;
  gestante: boolean; discapacitado: boolean; apoderadoDni: string; apoderadoNombre: string;
  fechaRegistro: string | null; fechaCreacion: string;
}

const mapBackendToFrontend = (item: RecipientBackend): BeneficiarioFrontend => ({
  id: item.id,
  nombreCompleto: `${item.name} ${item.lastname}`.trim(),
  dni: item.doc_num || "-",
  tipoDoc: item.doc_type || "DNI",
  telefono: item.phone || "-",
  direccion: item.address || "-",
  fechaNacimiento: item.birthday,
  sexo: TRADUCCIONES_SEXO[item.sex] || item.sex || "-",
  social: TRADUCCIONES_SOCIAL[item.social] || item.social || "-",
  gestante: item.pregnant,
  discapacitado: item.disabled,
  apoderadoDni: item.assignee_doc_num || "-",
  apoderadoNombre: item.assignee_name && item.assignee_lastname ? `${item.assignee_name} ${item.assignee_lastname}`.trim() : "-",
  fechaRegistro: item.registered_at,
  fechaCreacion: item.created_at,
});

type FilterType = "edad" | "cumpleanos" | "telefono" | "genero";
type CumpleanosModo = "mes" | "dia";

export default function OllasBeneficiariosPage() {
  const { canShowObservacion } = usePermissions();
  const { getData } = useFetch();

  const [data, setData] = useState<BeneficiarioFrontend[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Paginación server-side
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [fetchKey, setFetchKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("edad");
  const [edadRange, setEdadRange] = useState<number[]>([0, 110]);
  const [mesesCumpleanos, setMesesCumpleanos] = useState<number[]>([]);
  const [cumpleanosModo, setCumpleanosModo] = useState<CumpleanosModo>("mes");
  const [diaCumpleanos, setDiaCumpleanos] = useState<string>("");
  const [filtroTelefono, setFiltroTelefono] = useState<"" | "con" | "sin">("");
  const [filtroTelefonoDraft, setFiltroTelefonoDraft] = useState<"" | "con" | "sin">("");
  const [filtroSexo, setFiltroSexo] = useState<"" | "MALE" | "FEMALE">("");
  const [filtroSexoDraft, setFiltroSexoDraft] = useState<"" | "MALE" | "FEMALE">("");
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null);
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<BeneficiarioFrontend | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Cargar datos con paginación server-side
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page + 1));
        params.set("limit", String(rowsPerPage));
        params.set("modality", "CPOT");

        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }

        if (edadRange[0] > 0 || edadRange[1] < 110) {
          params.set("age_min", String(edadRange[0]));
          params.set("age_max", String(edadRange[1]));
        }

        if (cumpleanosModo === "mes" && mesesCumpleanos.length > 0) {
          params.set("birthday_month", mesesCumpleanos.map((m) => m + 1).join(","));
        } else if (cumpleanosModo === "dia" && diaCumpleanos) {
          const parts = diaCumpleanos.split("-");
          params.set("birthday_day", `${parts[1]}-${parts[2]}`);
        }

        if (filtroTelefono === "con") {
          params.set("phone", "true");
        } else if (filtroTelefono === "sin") {
          params.set("phone", "false");
        }

        if (filtroSexo) {
          params.set("sex", filtroSexo);
        }

        const response = await getData<BackendResponse>(`pca/recipient?${params.toString()}`);
        if (response?.data) {
          setData(response.data.data.map(mapBackendToFrontend));
          setTotalCount(response.data.totalCount);
        }
      } catch (error) {
        console.error("Error fetching beneficiarios ollas:", error);
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, searchTerm, fetchKey, getData]);

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFiltroTelefonoDraft(filtroTelefono);
    setFiltroSexoDraft(filtroSexo);
    setFilterAnchor(event.currentTarget);
  };
  const handleFilterClose = () => setFilterAnchor(null);
  const handleFilterTypeChange = (_event: React.MouseEvent<HTMLElement>, v: FilterType | null) => { if (v !== null) setFilterType(v); };
  const handleEdadChange = (_event: Event, v: number | number[]) => setEdadRange(v as number[]);
  const handleMesToggle = (mes: number) => setMesesCumpleanos((prev) => prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes]);

  const filterOpen = Boolean(filterAnchor);
  const isEdadFiltered = edadRange[0] > 0 || edadRange[1] < 110;
  const isCumpleanosFiltered = cumpleanosModo === "mes" ? mesesCumpleanos.length > 0 : diaCumpleanos !== "";

  const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
  const handleRowClick = (b: BeneficiarioFrontend) => { setSelectedBeneficiario(b); setDetailOpen(true); };
  const handleDetailClose = () => { setDetailOpen(false); setSelectedBeneficiario(null); };

  const [isExporting, setIsExporting] = useState(false);
  const dataFormateados = useFormatTableData(data);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "99999");
      params.set("page", "1");
      params.set("modality", "CPOT");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (edadRange[0] > 0 || edadRange[1] < 110) {
        params.set("age_min", String(edadRange[0]));
        params.set("age_max", String(edadRange[1]));
      }
      if (cumpleanosModo === "mes" && mesesCumpleanos.length > 0) {
        params.set("birthday_month", mesesCumpleanos.map((m) => m + 1).join(","));
      } else if (cumpleanosModo === "dia" && diaCumpleanos) {
        const parts = diaCumpleanos.split("-");
        params.set("birthday_day", `${parts[1]}-${parts[2]}`);
      }
      if (filtroTelefono === "con") {
        params.set("phone", "true");
      } else if (filtroTelefono === "sin") {
        params.set("phone", "false");
      }
      if (filtroSexo) {
        params.set("sex", filtroSexo);
      }
      const response = await getData<BackendResponse>(`pca/recipient?${params.toString()}`);
      if (!response?.data) return;
      const exportData = response.data.data.map((item: RecipientBackend) => ({
        "Nombre Completo": `${item.name} ${item.lastname}`.trim(),
        DNI: item.doc_num || "-",
        "Teléfono": item.phone || "-",
        "Dirección": item.address || "-",
        "Fecha Nacimiento": formatearFecha(item.birthday),
        Edad: item.birthday ? calcularEdad(item.birthday) : "-",
        Sexo: TRADUCCIONES_SEXO[item.sex] || item.sex || "-",
        Condición: TRADUCCIONES_SOCIAL[item.social] || item.social || "-",
        Gestante: item.pregnant ? "Sí" : "No",
        Discapacitado: item.disabled ? "Sí" : "No",
        "Fecha Registro": formatearFecha(item.registered_at),
      }));
      if (exportData.length === 0) return;
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Beneficiarios Ollas");
      worksheet["!cols"] = Object.keys(exportData[0]).map(() => ({ wch: 20 }));
      XLSX.writeFile(workbook, `beneficiarios_ollas_${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box>
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Box sx={{ background: `linear-gradient(135deg, ${subgerencia.color}15 0%, ${subgerencia.color}30 100%)`, color: subgerencia.color, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", boxShadow: `0 4px 12px ${subgerencia.color}25` }}>
            <SoupKitchen sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: subgerencia.color }}>
            Ollas Comunes - Beneficiarios
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ ml: 7.5 }}>
          Listado de beneficiarios de Ollas Comunes
        </Typography>
      </Box>

      <Box sx={{ position: "relative" }}>
        <Card sx={{ borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)", position: "relative", zIndex: 1, overflow: "hidden" }}>
          <CardContent sx={{ p: 3 }}>
            <Box mb={3} display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
              <TextField placeholder="Buscar por nombre, DNI, dirección..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                slotProps={{ input: { startAdornment: (<InputAdornment position="start"><Search sx={{ color: "#64748b", fontSize: 20 }} /></InputAdornment>) } }}
                size="small" sx={{ width: 320, "& .MuiOutlinedInput-root": { borderRadius: "8px", backgroundColor: "#f8fafc", "&:hover fieldset": { borderColor: "#64748b" }, "&.Mui-focused fieldset": { borderColor: "#475569" } } }}
              />
              <Tooltip title="Filtros">
                <IconButton onClick={handleFilterClick} sx={{ backgroundColor: filterOpen ? "#e2e8f0" : "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", "&:hover": { backgroundColor: "#e2e8f0" } }}>
                  <FilterList sx={{ color: "#64748b", fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exportar a Excel">
                <IconButton onClick={handleExport} disabled={isLoading || isExporting} sx={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", "&:hover": { backgroundColor: "#dcfce7", borderColor: "#22c55e" } }}>
                  <FileDownload sx={{ color: "#22c55e", fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              {isEdadFiltered && (
                <Box sx={{ backgroundColor: "#dbeafe", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="caption" color="#1e40af">Edad: {edadRange[0]} - {edadRange[1]} años</Typography>
                  <IconButton size="small" onClick={() => { setEdadRange([0, 110]); setPage(0); setFetchKey((k) => k + 1); }} sx={{ p: 0.25 }}><Close sx={{ fontSize: 14, color: "#1e40af" }} /></IconButton>
                </Box>
              )}
              {isCumpleanosFiltered && (
                <Box sx={{ backgroundColor: "#fce7f3", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Cake sx={{ fontSize: 14, color: "#be185d" }} />
                  <Typography variant="caption" color="#be185d">
                    {cumpleanosModo === "mes" ? mesesCumpleanos.map((m) => MESES[m].slice(0, 3)).join(", ") : diaCumpleanos.split("-").slice(1).reverse().join("/")}
                  </Typography>
                  <IconButton size="small" onClick={() => { setMesesCumpleanos([]); setDiaCumpleanos(""); setPage(0); setFetchKey((k) => k + 1); }} sx={{ p: 0.25 }}><Close sx={{ fontSize: 14, color: "#be185d" }} /></IconButton>
                </Box>
              )}
              {filtroTelefono && (
                <Box sx={{ backgroundColor: filtroTelefono === "con" ? "#dcfce7" : "#fee2e2", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  {filtroTelefono === "con"
                    ? <PhoneEnabled sx={{ fontSize: 14, color: "#16a34a" }} />
                    : <PhoneDisabled sx={{ fontSize: 14, color: "#dc2626" }} />
                  }
                  <Typography variant="caption" color={filtroTelefono === "con" ? "#16a34a" : "#dc2626"}>
                    {filtroTelefono === "con" ? "Con celular" : "Sin celular"}
                  </Typography>
                  <IconButton size="small" onClick={() => { setFiltroTelefono(""); setFiltroTelefonoDraft(""); setPage(0); setFetchKey((k) => k + 1); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: filtroTelefono === "con" ? "#16a34a" : "#dc2626" }} />
                  </IconButton>
                </Box>
              )}
              {filtroSexo && (
                <Box sx={{ backgroundColor: filtroSexo === "MALE" ? "#e3f2fd" : "#fce4ec", borderRadius: "16px", px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Wc sx={{ fontSize: 14, color: filtroSexo === "MALE" ? "#1565c0" : "#c2185b" }} />
                  <Typography variant="caption" color={filtroSexo === "MALE" ? "#1565c0" : "#c2185b"}>
                    {filtroSexo === "MALE" ? "Masculino" : "Femenino"}
                  </Typography>
                  <IconButton size="small" onClick={() => { setFiltroSexo(""); setFiltroSexoDraft(""); setPage(0); setFetchKey((k) => k + 1); }} sx={{ p: 0.25 }}>
                    <Close sx={{ fontSize: 14, color: filtroSexo === "MALE" ? "#1565c0" : "#c2185b" }} />
                  </IconButton>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
                {totalCount.toLocaleString()} beneficiario(s)
              </Typography>
            </Box>

            <Popover open={filterOpen} anchorEl={filterAnchor} onClose={handleFilterClose} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }} sx={{ mt: 1 }}>
              <Box sx={{ p: 2.5, width: 320 }}>
                <Typography variant="subtitle2" fontWeight={600} color="#334155" mb={1.5}>Tipo de filtro</Typography>
                <ToggleButtonGroup value={filterType} exclusive onChange={handleFilterTypeChange} size="small" fullWidth sx={{ mb: 2.5 }}>
                  <ToggleButton value="edad" sx={{ textTransform: "none", fontSize: "0.7rem", "&.Mui-selected": { backgroundColor: "#dbeafe", color: "#1e40af", "&:hover": { backgroundColor: "#bfdbfe" } } }}>Edad</ToggleButton>
                  <ToggleButton value="cumpleanos" sx={{ textTransform: "none", fontSize: "0.7rem", "&.Mui-selected": { backgroundColor: "#fce7f3", color: "#be185d", "&:hover": { backgroundColor: "#fbcfe8" } } }}>Cumpleaños</ToggleButton>
                  <ToggleButton value="telefono" sx={{ textTransform: "none", fontSize: "0.7rem", "&.Mui-selected": { backgroundColor: "#dcfce7", color: "#16a34a", "&:hover": { backgroundColor: "#bbf7d0" } } }}>Teléfono</ToggleButton>
                  <ToggleButton value="genero" sx={{ textTransform: "none", fontSize: "0.7rem", "&.Mui-selected": { backgroundColor: "#e3f2fd", color: "#1565c0", "&:hover": { backgroundColor: "#bbdefb" } } }}>Género</ToggleButton>
                </ToggleButtonGroup>
                <Divider sx={{ mb: 2 }} />
                {filterType === "edad" && (
                  <>
                    <Typography variant="body2" color="#475569" mb={1.5}>Rango de edad</Typography>
                    <Slider value={edadRange} onChange={handleEdadChange} valueLabelDisplay="auto" min={0} max={110} sx={{ color: "#3b82f6", "& .MuiSlider-thumb": { backgroundColor: "#1e40af" }, "& .MuiSlider-track": { backgroundColor: "#3b82f6" } }} />
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="caption" color="text.secondary">{edadRange[0]} años</Typography>
                      <Typography variant="caption" color="text.secondary">{edadRange[1]} años</Typography>
                    </Box>
                  </>
                )}
                {filterType === "cumpleanos" && (
                  <>
                    <Typography variant="body2" color="#475569" mb={1.5}>Cumpleaños del beneficiario</Typography>
                    <ToggleButtonGroup value={cumpleanosModo} exclusive onChange={(_, v) => v && setCumpleanosModo(v)} size="small" fullWidth sx={{ mb: 2 }}>
                      <ToggleButton value="mes" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#fce7f3", color: "#be185d", "&:hover": { backgroundColor: "#fbcfe8" } } }}>Por mes</ToggleButton>
                      <ToggleButton value="dia" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#fce7f3", color: "#be185d", "&:hover": { backgroundColor: "#fbcfe8" } } }}>Día específico</ToggleButton>
                    </ToggleButtonGroup>
                    {cumpleanosModo === "mes" ? (
                      <>
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75 }}>
                          {MESES.map((mes, index) => (
                            <Button key={mes} size="small" variant={mesesCumpleanos.includes(index) ? "contained" : "outlined"} onClick={() => handleMesToggle(index)}
                              sx={{ textTransform: "none", fontSize: "0.7rem", py: 0.5, px: 1, minWidth: 0, borderColor: mesesCumpleanos.includes(index) ? "#be185d" : "#e2e8f0", backgroundColor: mesesCumpleanos.includes(index) ? "#be185d" : "transparent", color: mesesCumpleanos.includes(index) ? "white" : "#64748b", "&:hover": { backgroundColor: mesesCumpleanos.includes(index) ? "#9d174d" : "#fce7f3", borderColor: "#be185d" } }}>
                              {mes.slice(0, 3)}
                            </Button>
                          ))}
                        </Box>
                        {mesesCumpleanos.length > 0 && <Typography variant="caption" color="#be185d" sx={{ mt: 1, display: "block" }}>{mesesCumpleanos.length} mes(es) seleccionado(s)</Typography>}
                      </>
                    ) : (
                      <TextField type="date" value={diaCumpleanos} onChange={(e) => setDiaCumpleanos(e.target.value)} fullWidth size="small" helperText="Selecciona una fecha para filtrar por día y mes"
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "&.Mui-focused fieldset": { borderColor: "#be185d" } } }} />
                    )}
                  </>
                )}
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
                {filterType === "genero" && (
                  <>
                    <Typography variant="body2" color="#475569" mb={1.5}>Filtrar por género</Typography>
                    <ToggleButtonGroup value={filtroSexoDraft} exclusive onChange={(_e, val) => { if (val !== null) setFiltroSexoDraft(val); }} size="small" fullWidth>
                      <ToggleButton value="" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#f1f5f9", color: "#334155", "&:hover": { backgroundColor: "#e2e8f0" } } }}>Todos</ToggleButton>
                      <ToggleButton value="MALE" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#e3f2fd", color: "#1565c0", "&:hover": { backgroundColor: "#bbdefb" } } }}>Masculino</ToggleButton>
                      <ToggleButton value="FEMALE" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#fce4ec", color: "#c2185b", "&:hover": { backgroundColor: "#f8bbd0" } } }}>Femenino</ToggleButton>
                    </ToggleButtonGroup>
                  </>
                )}
                <Box display="flex" justifyContent="flex-end" mt={2.5} gap={1}>
                  <Button size="small" onClick={() => { setEdadRange([0, 110]); setMesesCumpleanos([]); setCumpleanosModo("mes"); setDiaCumpleanos(""); setFiltroTelefono(""); setFiltroTelefonoDraft(""); setFiltroSexo(""); setFiltroSexoDraft(""); setPage(0); setFetchKey((k) => k + 1); }} sx={{ color: "#64748b", textTransform: "none" }}>Limpiar todo</Button>
                  <Button size="small" variant="contained" onClick={() => { setFiltroTelefono(filtroTelefonoDraft); setFiltroSexo(filtroSexoDraft); setPage(0); setFetchKey((k) => k + 1); handleFilterClose(); }} sx={{ backgroundColor: "#475569", textTransform: "none", "&:hover": { backgroundColor: "#334155" } }}>Aplicar</Button>
                </Box>
              </Box>
            </Popover>

            <TableContainer component={Paper} sx={{ borderRadius: "12px", boxShadow: "none", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Nombre Completo</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>DNI</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Teléfono</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Sexo</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Dirección</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Edad</TableCell>
                    {canShowObservacion() && <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Observación</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={32} sx={{ color: "#64748b" }} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Cargando beneficiarios...</Typography></TableCell></TableRow>
                  ) : dataFormateados.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><Typography variant="body2" color="text.secondary">No se encontraron beneficiarios</Typography></TableCell></TableRow>
                  ) : (
                    dataFormateados.map((row: BeneficiarioFrontend, index: number) => (
                      <TableRow key={row.id} onClick={() => handleRowClick(row)} sx={{ backgroundColor: index % 2 === 0 ? "white" : "#f8fafc", "&:hover": { backgroundColor: "#f1f5f9", cursor: "pointer" }, transition: "background-color 0.2s" }}>
                        <TableCell sx={{ fontWeight: 500 }}>{row.nombreCompleto}</TableCell>
                        <TableCell>{row.dni}</TableCell>
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
                        <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.direccion}</TableCell>
                        <TableCell align="center">
                          {row.fechaNacimiento ? (
                            <Box display="flex" flexDirection="column" alignItems="center" gap={0.3}>
                              <Chip label={`${calcularEdad(row.fechaNacimiento)} años`} size="small" sx={{ backgroundColor: "#f3e5f5", color: "#7b1fa2", fontWeight: 600, fontSize: "0.75rem" }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                {formatearFecha(row.fechaNacimiento)}
                              </Typography>
                            </Box>
                          ) : "-"}
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
                          <Tooltip title="Ver detalles"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRowClick(row); }} sx={{ color: "#64748b", "&:hover": { backgroundColor: "#f1f5f9" } }}><Visibility fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination component="div" count={totalCount} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Filas por página:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
              sx={{ borderTop: "1px solid #e2e8f0", mt: 2, "& .MuiTablePagination-selectIcon": { color: "#64748b" } }} />
          </CardContent>
        </Card>
      </Box>

      <Dialog open={detailOpen} onClose={handleDetailClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <SoupKitchen sx={{ color: "#475569" }} />
            <Typography variant="h6" fontWeight={600} color="#334155">Detalle del Beneficiario</Typography>
          </Box>
          <IconButton onClick={handleDetailClose} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          {selectedBeneficiario && (
            <Grid container spacing={2}>
              <Grid size={12}><Typography variant="subtitle2" fontWeight={600} color="#475569" gutterBottom>Datos Personales</Typography><Divider sx={{ mb: 1 }} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Nombre Completo</Typography><Typography variant="body2" fontWeight={500}>{selectedBeneficiario.nombreCompleto}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">{selectedBeneficiario.tipoDoc}</Typography><Typography variant="body2" fontWeight={500}>{selectedBeneficiario.dni}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Teléfono</Typography><Typography variant="body2" fontWeight={500}>{selectedBeneficiario.telefono}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Sexo</Typography><Typography variant="body2" fontWeight={500}>{selectedBeneficiario.sexo}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Fecha de Nacimiento</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedBeneficiario.fechaNacimiento ? `${formatearFecha(selectedBeneficiario.fechaNacimiento)} (${calcularEdad(selectedBeneficiario.fechaNacimiento)} años)` : "-"}</Typography>
              </Grid>
              <Grid size={12}><Typography variant="caption" color="text.secondary">Dirección</Typography><Typography variant="body2" fontWeight={500}>{selectedBeneficiario.direccion}</Typography></Grid>

              <Grid size={12}><Typography variant="subtitle2" fontWeight={600} color="#475569" gutterBottom sx={{ mt: 2 }}>Condición</Typography><Divider sx={{ mb: 1 }} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Tipo</Typography><Typography variant="body2" fontWeight={500}>{selectedBeneficiario.social}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">Gestante</Typography>
                <Box mt={0.5}><Chip label={selectedBeneficiario.gestante ? "Sí" : "No"} size="small" sx={{ backgroundColor: selectedBeneficiario.gestante ? "#dcfce7" : "#f1f5f9", color: selectedBeneficiario.gestante ? "#166534" : "#475569", fontWeight: 600 }} /></Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">Discapacitado</Typography>
                <Box mt={0.5}><Chip label={selectedBeneficiario.discapacitado ? "Sí" : "No"} size="small" sx={{ backgroundColor: selectedBeneficiario.discapacitado ? "#dbeafe" : "#f1f5f9", color: selectedBeneficiario.discapacitado ? "#1e40af" : "#475569", fontWeight: 600 }} /></Box>
              </Grid>

              {selectedBeneficiario.apoderadoDni !== "-" && (
                <>
                  <Grid size={12}><Typography variant="subtitle2" fontWeight={600} color="#475569" gutterBottom sx={{ mt: 2 }}>Apoderado</Typography><Divider sx={{ mb: 1 }} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Nombre</Typography><Typography variant="body2" fontWeight={500}>{selectedBeneficiario.apoderadoNombre}</Typography></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">DNI</Typography><Typography variant="body2" fontWeight={500}>{selectedBeneficiario.apoderadoDni}</Typography></Grid>
                </>
              )}

              <Grid size={12}><Typography variant="subtitle2" fontWeight={600} color="#475569" gutterBottom sx={{ mt: 2 }}>Registro</Typography><Divider sx={{ mb: 1 }} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fecha de Registro</Typography><Typography variant="body2" fontWeight={500}>{formatearFecha(selectedBeneficiario.fechaRegistro)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fecha de Creación</Typography><Typography variant="body2" fontWeight={500}>{formatearFecha(selectedBeneficiario.fechaCreacion)}</Typography></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={handleDetailClose} sx={{ textTransform: "none", color: "#64748b" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
