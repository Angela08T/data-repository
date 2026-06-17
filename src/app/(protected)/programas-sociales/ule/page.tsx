"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Card, CardContent, Typography, Paper, CircularProgress, Skeleton, Alert } from "@mui/material";
import { People, Assignment, Cake, PersonSearch } from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];

// Interfaces para el backend
interface RegisteredPerson {
  id: string;
  fsu: string;
  s100: string;
  dni: string;
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

// Interface para datos por urbanización
interface UrbanData {
  id: string;
  nombre: string;
  cantidad: number;
  color: string;
}

// Colores para las urbanizaciones
const URBAN_COLORS = [
  "#d81b7e", "#00a3a8", "#4caf50", "#ff9800", "#9c27b0",
  "#2196f3", "#f44336", "#795548", "#607d8b", "#e91e63",
  "#3f51b5", "#009688", "#ff5722", "#673ab7", "#8bc34a",
];

const BATCH_SIZE = 500; // Cargar en lotes de 500 registros

export default function ULEDashboardPage() {
  const { getData } = useFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [registeredData, setRegisteredData] = useState<RegisteredPerson[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const hasFetched = useRef(false);

  // Cargar datos del backend en lotes
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      // Primero obtener el total
      const firstResponse = await getData<BackendResponse>(`ule/registered?page=1&limit=1`, { showErrorAlert: false });
      const totalCount = firstResponse?.data?.totalCount || 0;

      if (totalCount === 0) {
        setRegisteredData([]);
        setIsLoading(false);
        return;
      }

      // Calcular número de páginas necesarias
      const totalPages = Math.ceil(totalCount / BATCH_SIZE);
      const allData: RegisteredPerson[] = [];

      // Cargar en lotes
      for (let page = 1; page <= totalPages; page++) {
        const response = await getData<BackendResponse>(
          `ule/registered?page=${page}&limit=${BATCH_SIZE}`,
          { showErrorAlert: false }
        );

        if (response?.data?.data) {
          allData.push(...response.data.data);
        }

        // Actualizar progreso
        setLoadingProgress(Math.round((page / totalPages) * 100));
      }

      setRegisteredData(allData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error al cargar los datos. Por favor, intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [fetchData]);

  // Calcular estadísticas
  const totalEmpadronados = registeredData.length;
  const totalMiembros = registeredData.reduce((sum, r) => sum + r.members, 0);
  const mesActual = new Date().getUTCMonth();
  const cumpleanosEsteMes = registeredData.filter(r => {
    if (!r.birthday) return false;
    const mesCumple = new Date(r.birthday).getUTCMonth();
    return mesCumple === mesActual;
  }).length;
  const totalEmpadronadores = new Set(registeredData.filter(r => r.enumerator).map(r => r.enumerator!.id)).size;

  // Contar por formato (FSU, S100)
  const formatoFSU = registeredData.filter(r => r.format === "FSU").length;
  const formatoS100 = registeredData.filter(r => r.format === "S100").length;

  // Estadísticas para las tarjetas
  const stats = [
    {
      title: "Total Empadronados",
      value: totalEmpadronados.toLocaleString(),
      icon: <People sx={{ fontSize: 32 }} />,
      color: "#d81b7e",
    },
    {
      title: "Total Miembros",
      value: totalMiembros.toLocaleString(),
      icon: <Assignment sx={{ fontSize: 32 }} />,
      color: "#00a3a8",
    },
    {
      title: "Cumpleaños este Mes",
      value: cumpleanosEsteMes.toLocaleString(),
      icon: <Cake sx={{ fontSize: 32 }} />,
      color: "#4caf50",
    },
    {
      title: "Empadronadores",
      value: totalEmpadronadores.toLocaleString(),
      icon: <PersonSearch sx={{ fontSize: 32 }} />,
      color: "#ff9800",
    },
  ];

  // Calcular empadronados por urbanización
  const empadronadosPorUrban: UrbanData[] = [];
  if (registeredData.length > 0) {
    const urbanMap = new Map<string, { nombre: string; cantidad: number }>();

    registeredData.forEach((person) => {
      if (person.urban) {
        const existing = urbanMap.get(person.urban.id);
        if (existing) {
          existing.cantidad += 1;
        } else {
          urbanMap.set(person.urban.id, {
            nombre: person.urban.name,
            cantidad: 1,
          });
        }
      }
    });

    let colorIndex = 0;
    urbanMap.forEach((value, key) => {
      empadronadosPorUrban.push({
        id: key,
        nombre: value.nombre,
        cantidad: value.cantidad,
        color: URBAN_COLORS[colorIndex % URBAN_COLORS.length],
      });
      colorIndex++;
    });

    // Ordenar por cantidad descendente
    empadronadosPorUrban.sort((a, b) => b.cantidad - a.cantidad);
  }

  const maxUrban = Math.max(...empadronadosPorUrban.map((u) => u.cantidad), 1);
  const top10Urban = empadronadosPorUrban.slice(0, 10);

  // Calcular porcentajes de forma segura
  const porcentajeFSU = totalEmpadronados > 0 ? (formatoFSU / totalEmpadronados) * 100 : 0;
  const porcentajeS100 = totalEmpadronados > 0 ? (formatoS100 / totalEmpadronados) * 100 : 0;
  const dashFSU = totalEmpadronados > 0 ? (formatoFSU / totalEmpadronados) * 440 : 0;
  const dashS100 = totalEmpadronados > 0 ? (formatoS100 / totalEmpadronados) * 440 : 0;

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: subgerencia.color }}>
          ULE - Unidad Local de Empadronamiento
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Dashboard de la Unidad Local de Empadronamiento
        </Typography>
      </Box>

      {/* Mensaje de error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tarjetas de estadísticas */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 3,
          mb: 4,
        }}
      >
        {stats.map((stat, index) => (
          <Box
            key={index}
            sx={{
              position: "relative",
              height: "100%",
            }}
          >
            {/* Sombra rosa difuminada debajo */}
            <Box
              sx={{
                position: "absolute",
                bottom: "-15px",
                left: "10%",
                right: "10%",
                height: "30px",
                background: "linear-gradient(to bottom, rgba(216, 27, 126, 0.3), rgba(216, 27, 126, 0))",
                borderRadius: "50%",
                filter: "blur(12px)",
                zIndex: 0,
              }}
            />
            <Card
              sx={{
                height: "100%",
                borderRadius: "24px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
                border: "none",
                transition: "transform 0.2s, box-shadow 0.2s",
                position: "relative",
                overflow: "visible",
                zIndex: 1,
                "&:hover": {
                  transform: "translateY(-4px)",
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  right: "-6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "12px",
                  height: "60%",
                  background: "linear-gradient(to bottom, #f472b6, #d81b7e, #be185d)",
                  borderRadius: "12px",
                  boxShadow: "0 4px 10px rgba(216, 27, 126, 0.35)",
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box
                    sx={{
                      background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}30 100%)`,
                      color: stat.color,
                      width: 56,
                      height: 56,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "16px",
                      mr: 2,
                      boxShadow: `0 4px 12px ${stat.color}25`,
                      border: `1px solid ${stat.color}20`,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={80} height={40} />
                  ) : (
                    <Typography variant="h4" fontWeight="bold">
                      {stat.value}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Contenido adicional */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Gráfico de Barras - Empadronados por Urbanización */}
        <Paper
          sx={{
            p: 3,
            height: "400px",
            borderRadius: "20px",
            boxShadow: "0 8px 20px rgba(216, 27, 126, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08)",
            background: "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: "#334155" }}>
            Top 10 Urbanizaciones
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Distribución de empadronados por zona
          </Typography>

          {isLoading ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flex={1} gap={1}>
              <CircularProgress sx={{ color: "#d81b7e" }} />
              {loadingProgress > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Cargando... {loadingProgress}%
                </Typography>
              )}
            </Box>
          ) : top10Urban.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <Typography variant="body2" color="text.secondary">
                No hay datos disponibles
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Barras horizontales */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  overflowY: "auto",
                  pr: 1,
                  "&::-webkit-scrollbar": { width: "4px" },
                  "&::-webkit-scrollbar-track": { background: "#f1f5f9", borderRadius: "4px" },
                  "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "4px" },
                }}
              >
                {top10Urban.map((urban) => {
                  const barWidth = (urban.cantidad / maxUrban) * 100;
                  return (
                    <Box key={urban.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          width: "120px",
                          minWidth: "120px",
                          color: "#475569",
                          fontSize: "0.7rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={urban.nombre}
                      >
                        {urban.nombre}
                      </Typography>
                      <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            height: "20px",
                            width: `${barWidth}%`,
                            minWidth: "8px",
                            backgroundColor: urban.color,
                            borderRadius: "4px",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              opacity: 0.85,
                              transform: "scaleY(1.1)",
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ color: "#334155", fontWeight: 700, fontSize: "0.7rem" }}
                        >
                          {urban.cantidad}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Paper>

        {/* Distribución por Formato */}
        <Paper
          sx={{
            p: 3,
            height: "400px",
            borderRadius: "20px",
            boxShadow: "0 8px 20px rgba(216, 27, 126, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08)",
            background: "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: "#334155" }}>
            Distribución por Formato
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Empadronados según tipo de formato
          </Typography>

          {isLoading ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flex={1} gap={1}>
              <CircularProgress sx={{ color: "#d81b7e" }} />
              {loadingProgress > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Cargando... {loadingProgress}%
                </Typography>
              )}
            </Box>
          ) : totalEmpadronados === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <Typography variant="body2" color="text.secondary">
                No hay datos disponibles
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 3,
              }}
            >
              {/* Gráfico de donut simple */}
              <Box sx={{ position: "relative", width: 180, height: 180 }}>
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {/* Fondo */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="20"
                  />
                  {/* FSU */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke="#d81b7e"
                    strokeWidth="20"
                    strokeDasharray={`${dashFSU} 440`}
                    strokeDashoffset="0"
                    transform="rotate(-90 90 90)"
                  />
                  {/* S100 */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke="#00a3a8"
                    strokeWidth="20"
                    strokeDasharray={`${dashS100} 440`}
                    strokeDashoffset={`${-dashFSU}`}
                    transform="rotate(-90 90 90)"
                  />
                  {/* Centro */}
                  <circle cx="90" cy="90" r="50" fill="white" />
                  <text x="90" y="85" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">
                    Total
                  </text>
                  <text x="90" y="105" textAnchor="middle" fontSize="16" fontWeight="700" fill="#d81b7e">
                    {totalEmpadronados.toLocaleString()}
                  </text>
                </svg>
              </Box>

              {/* Leyenda */}
              <Box sx={{ display: "flex", gap: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: "4px", backgroundColor: "#d81b7e" }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="#334155">
                      FSU
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatoFSU.toLocaleString()} ({porcentajeFSU.toFixed(1)}%)
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: "4px", backgroundColor: "#00a3a8" }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="#334155">
                      S100
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatoS100.toLocaleString()} ({porcentajeS100.toFixed(1)}%)
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
