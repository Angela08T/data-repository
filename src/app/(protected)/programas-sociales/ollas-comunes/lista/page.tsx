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
  Popover,
  Slider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  SoupKitchen,
  FilterList,
  FileDownload,
  Close,
  Visibility,
  Edit,
  Delete,
  LocationOn,
  Male,
  Female,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import { useFormatTableData } from "@/lib/hooks/useFormatTableData";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];

// Interface para el presidente
interface President {
  id: string;
  name: string;
  lastname: string;
  dni: string;
  phone: string;
  birthday: string;
  sex: string;
}

// Interface para la directiva
interface Directive {
  id: string;
  resolution: string;
  start_at: string;
  end_at: string;
}

// Interface para la olla (API)
interface OllaAPI {
  id: string;
  code: string;
  name: string;
  address: string;
  members: number;
  members_male: number;
  members_female: number;
  situation: string | null;
  latitude: number;
  longitude: number;
  modality: string;
  directive: Directive | null;
  president: President | null;
}

// Interface para la respuesta de la API
interface APIResponse {
  message: string;
  data: {
    data: OllaAPI[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function OllasListaPage() {
  const { canUpdate, canDelete, canShowObservacion } = usePermissions();
  const { getData } = useFetch();

  // Estados para datos - paginación del servidor
  const [data, setData] = useState<OllaAPI[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  // Estados para paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [miembrosRange, setMiembrosRange] = useState<number[]>([0, 500]);
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null);
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});

  // Estados para detalle
  const [selectedOlla, setSelectedOlla] = useState<OllaAPI | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch con paginación del servidor
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

        const response = await getData<APIResponse>(
          `pca/center?${params.toString()}`
        );
        if (response?.data) {
          setData(response.data.data);
          setTotalCount(response.data.totalCount);
        }
      } catch (error) {
        console.error("Error fetching ollas:", error);
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
    setFilterAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const handleMiembrosChange = (_event: Event, newValue: number | number[]) => {
    setMiembrosRange(newValue as number[]);
  };

  const filterOpen = Boolean(filterAnchor);

  const isMiembrosFiltered = miembrosRange[0] > 0 || miembrosRange[1] < 500;

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (olla: OllaAPI) => {
    setSelectedOlla(olla);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedOlla(null);
  };

  // Formatear strings del backend (Title Case, preservar siglas en direcciones)
  const dataFormateados = useFormatTableData(data);

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const [isExporting, setIsExporting] = useState(false);

  // Exportar a Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "99999");
      params.set("page", "1");
      params.set("modality", "CPOT");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const response = await getData<APIResponse>(`pca/center?${params.toString()}`);
      if (!response?.data) return;
      const exportData = response.data.data.map((c: OllaAPI) => ({
        Código: c.code,
        Nombre: c.name,
        Dirección: c.address,
        "Total Miembros": c.members,
        Mujeres: c.members_female,
        Varones: c.members_male,
        Presidente: c.president ? `${c.president.name} ${c.president.lastname}` : "-",
        "DNI Presidente": c.president?.dni || "-",
        "Teléfono Presidente": c.president?.phone || "-",
        "Fecha Nac. Presidente": c.president?.birthday ? formatDate(c.president.birthday) : "-",
        Resolución: c.directive?.resolution || "-",
        "Fecha Inicio": formatDate(c.directive?.start_at),
        "Fecha Fin": formatDate(c.directive?.end_at),
      }));
      if (exportData.length === 0) return;
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ollas Comunes");

      const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }));
      worksheet["!cols"] = colWidths;

      XLSX.writeFile(workbook, `ollas_comunes_${new Date().toISOString().split("T")[0]}.xlsx`);
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
            <SoupKitchen sx={{ fontSize: 28 }} />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: subgerencia.color,
              fontFamily: "'Poppins', 'Roboto', sans-serif",
            }}
          >
            Lista de Ollas Comunes
          </Typography>
        </Box>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            ml: 7.5,
            fontFamily: "'Inter', 'Roboto', sans-serif",
          }}
        >
          Listado de ollas comunes registradas
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
                placeholder="Buscar por código, nombre, dirección, presidente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
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
                  width: 380,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f8fafc",
                    fontFamily: "'Inter', 'Roboto', sans-serif",
                    "&:hover fieldset": {
                      borderColor: "#64748b",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: subgerencia.color,
                    },
                  },
                }}
              />
              <Tooltip title="Filtros avanzados">
                <IconButton
                  onClick={handleFilterClick}
                  sx={{
                    backgroundColor: filterOpen ? "#fce7f3" : "#f8fafc",
                    border: `1px solid ${filterOpen ? subgerencia.color : "#e2e8f0"}`,
                    borderRadius: "8px",
                    "&:hover": {
                      backgroundColor: "#fce7f3",
                      borderColor: subgerencia.color,
                    },
                  }}
                >
                  <FilterList sx={{ color: filterOpen ? subgerencia.color : "#64748b", fontSize: 20 }} />
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
                    "&:hover": {
                      backgroundColor: "#dcfce7",
                      borderColor: "#22c55e",
                    },
                  }}
                >
                  <FileDownload sx={{ color: "#22c55e", fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              {/* Chips de filtros activos */}
              {isMiembrosFiltered && (
                <Box
                  sx={{
                    backgroundColor: "#e2e8f0",
                    borderRadius: "16px",
                    px: 1.5,
                    py: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Typography variant="caption" color="#475569" fontWeight={500}>
                    Miembros: {miembrosRange[0]} - {miembrosRange[1]}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setMiembrosRange([0, 500]);
                      setPage(0);
                      setFetchKey((k) => k + 1);
                    }}
                    sx={{ p: 0.25 }}
                  >
                    <Close sx={{ fontSize: 14, color: "#64748b" }} />
                  </IconButton>
                </Box>
              )}

              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  ml: "auto",
                  fontFamily: "'Inter', 'Roboto', sans-serif",
                }}
              >
                {totalCount.toLocaleString()} olla(s)
              </Typography>
            </Box>

            {/* Popover de filtro */}
            <Popover
              open={filterOpen}
              anchorEl={filterAnchor}
              onClose={handleFilterClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              sx={{ mt: 1 }}
            >
              <Box sx={{ p: 2.5, width: 320 }}>
                <Typography variant="subtitle2" fontWeight={600} color="#334155" mb={1.5}>
                  Filtrar por miembros
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" color="#475569" mb={1.5}>
                  Cantidad de miembros
                </Typography>
                <Slider
                  value={miembrosRange}
                  onChange={handleMiembrosChange}
                  valueLabelDisplay="auto"
                  min={0}
                  max={500}
                  sx={{
                    color: "#64748b",
                    "& .MuiSlider-thumb": {
                      backgroundColor: "#475569",
                    },
                    "& .MuiSlider-track": {
                      backgroundColor: "#64748b",
                    },
                  }}
                />
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="text.secondary">
                    {miembrosRange[0]} miembros
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {miembrosRange[1]} miembros
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="flex-end" mt={2.5} gap={1}>
                  <Button
                    size="small"
                    onClick={() => {
                      setMiembrosRange([0, 500]);
                      setPage(0);
                      setFetchKey((k) => k + 1);
                    }}
                    sx={{
                      color: "#64748b",
                      textTransform: "none",
                      fontFamily: "'Inter', 'Roboto', sans-serif",
                    }}
                  >
                    Limpiar todo
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setPage(0);
                      setFetchKey((k) => k + 1);
                      handleFilterClose();
                    }}
                    sx={{
                      backgroundColor: subgerencia.color,
                      textTransform: "none",
                      fontFamily: "'Inter', 'Roboto', sans-serif",
                      "&:hover": { backgroundColor: "#be185d" },
                    }}
                  >
                    Aplicar
                  </Button>
                </Box>
              </Box>
            </Popover>

            {/* Tabla */}
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: "12px",
                boxShadow: "none",
                border: "1px solid #e2e8f0",
                overflow: "auto",
              }}
            >
              <Table sx={{ minWidth: 1400 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Código
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Nombre
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Dirección
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Miembros
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <Female sx={{ fontSize: 16, color: "#ec4899" }} />
                        Mujeres
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <Male sx={{ fontSize: 16, color: "#3b82f6" }} />
                        Varones
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Fecha Inicio
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Fecha Fin
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Presidente
                    </TableCell>
                    {canShowObservacion() && <TableCell sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Observación
                    </TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155", fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={40} sx={{ color: subgerencia.color }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          Cargando ollas comunes...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : dataFormateados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron ollas comunes
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    dataFormateados.map((row: OllaAPI, index: number) => (
                      <TableRow
                        key={row.id}
                        onClick={() => handleRowClick(row)}
                        sx={{
                          backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                          "&:hover": {
                            backgroundColor: "#fdf2f8",
                            cursor: "pointer",
                          },
                          transition: "background-color 0.2s",
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500, fontFamily: "'Inter', 'Roboto', sans-serif", whiteSpace: "nowrap" }}>
                          {row.code}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "'Inter', 'Roboto', sans-serif", maxWidth: 200 }}>
                          {row.name}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "'Inter', 'Roboto', sans-serif", maxWidth: 250, fontSize: "0.8rem" }}>
                          {row.address}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontWeight: 600 }}>
                          {row.members}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              backgroundColor: "#fce7f3",
                              px: 1,
                              py: 0.25,
                              borderRadius: "8px",
                              color: "#be185d",
                              fontSize: "0.8rem",
                            }}
                          >
                            {row.members_female}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              backgroundColor: "#dbeafe",
                              px: 1,
                              py: 0.25,
                              borderRadius: "8px",
                              color: "#1e40af",
                              fontSize: "0.8rem",
                            }}
                          >
                            {row.members_male}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {formatDate(row.directive?.start_at)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {formatDate(row.directive?.end_at)}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "'Inter', 'Roboto', sans-serif", maxWidth: 180, fontSize: "0.85rem" }}>
                          {row.president ? `${row.president.name} ${row.president.lastname}` : "-"}
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
                          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} flexWrap="nowrap">
                            <Tooltip title="Ver detalles">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(row);
                                }}
                                sx={{
                                  color: "#64748b",
                                  "&:hover": {
                                    backgroundColor: "#f1f5f9",
                                  },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canUpdate("Ollas Comunes") && (
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                sx={{
                                  color: "#0891b2",
                                  "&:hover": {
                                    backgroundColor: "rgba(8, 145, 178, 0.1)",
                                  },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            )}
                            {canDelete("Ollas Comunes") && (
                            <Tooltip title="Eliminar">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                sx={{
                                  color: "#dc2626",
                                  "&:hover": {
                                    backgroundColor: "rgba(220, 38, 38, 0.1)",
                                  },
                                }}
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

            {/* Paginación */}
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              sx={{
                borderTop: "1px solid #e2e8f0",
                mt: 2,
                "& .MuiTablePagination-selectIcon": {
                  color: "#64748b",
                },
              }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Dialog de detalles */}
      <Dialog
        open={detailOpen}
        onClose={handleDetailClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
          },
        }}
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
            <SoupKitchen sx={{ color: subgerencia.color }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "#334155",
                fontFamily: "'Poppins', 'Roboto', sans-serif",
              }}
            >
              Detalles de la Olla Común
            </Typography>
          </Box>
          <IconButton onClick={handleDetailClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          {selectedOlla && (
            <Grid container spacing={3}>
              {/* Información General */}
              <Grid size={12}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: "#475569",
                    fontFamily: "'Poppins', 'Roboto', sans-serif",
                  }}
                  gutterBottom
                >
                  Información General
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Código</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedOlla.code}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Nombre</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedOlla.name}</Typography>
              </Grid>

              {/* Ubicación */}
              <Grid size={12}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: "#475569",
                    mt: 2,
                    fontFamily: "'Poppins', 'Roboto', sans-serif",
                  }}
                  gutterBottom
                >
                  Ubicación
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">Dirección</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedOlla.address}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  <LocationOn sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
                  Latitud
                </Typography>
                <Typography variant="body2" fontWeight={500}>{selectedOlla.latitude}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  <LocationOn sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
                  Longitud
                </Typography>
                <Typography variant="body2" fontWeight={500}>{selectedOlla.longitude}</Typography>
              </Grid>

              {/* Miembros */}
              <Grid size={12}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: "#475569",
                    mt: 2,
                    fontFamily: "'Poppins', 'Roboto', sans-serif",
                  }}
                  gutterBottom
                >
                  Miembros
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Total Miembros</Typography>
                <Typography variant="body2" fontWeight={600} fontSize="1.1rem">{selectedOlla.members}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  <Female sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle", color: "#ec4899" }} />
                  Mujeres
                </Typography>
                <Typography variant="body2" fontWeight={500} color="#be185d">{selectedOlla.members_female}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  <Male sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle", color: "#3b82f6" }} />
                  Varones
                </Typography>
                <Typography variant="body2" fontWeight={500} color="#1e40af">{selectedOlla.members_male}</Typography>
              </Grid>

              {/* Directiva */}
              <Grid size={12}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: "#475569",
                    mt: 2,
                    fontFamily: "'Poppins', 'Roboto', sans-serif",
                  }}
                  gutterBottom
                >
                  Directiva
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Resolución</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedOlla.directive?.resolution || "-"}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">Fecha Inicio</Typography>
                <Typography variant="body2" fontWeight={500}>{formatDate(selectedOlla.directive?.start_at)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">Fecha Fin</Typography>
                <Typography variant="body2" fontWeight={500}>{formatDate(selectedOlla.directive?.end_at)}</Typography>
              </Grid>

              {/* Presidente */}
              <Grid size={12}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: "#475569",
                    mt: 2,
                    fontFamily: "'Poppins', 'Roboto', sans-serif",
                  }}
                  gutterBottom
                >
                  Presidente
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              {selectedOlla.president ? (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Nombre Completo</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedOlla.president.name} {selectedOlla.president.lastname}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">DNI</Typography>
                    <Typography variant="body2" fontWeight={500}>{selectedOlla.president.dni}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                    <Typography variant="body2" fontWeight={500}>{selectedOlla.president.phone}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Fecha de Cumpleaños</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedOlla.president.birthday
                        ? (() => {
                          const birthDate = new Date(selectedOlla.president.birthday);
                          const today = new Date();
                          let age = today.getFullYear() - birthDate.getFullYear();
                          const monthDiff = today.getMonth() - birthDate.getMonth();
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                          }
                          return `${formatDate(selectedOlla.president.birthday)} (${age} años)`;
                        })()
                        : "-"}
                    </Typography>
                  </Grid>
                </>
              ) : (
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Sin presidente asignado
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={handleDetailClose}
            sx={{
              textTransform: "none",
              color: "#64748b",
              fontFamily: "'Inter', 'Roboto', sans-serif",
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
