"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Card, CardContent, Typography, Paper, CircularProgress, Skeleton } from "@mui/material";
import { SoupKitchen, Groups, Male, Female, CheckCircle, HourglassEmpty } from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];

// Interface para el GeoJSON de sectores
interface SectorFeature {
  type: "Feature";
  properties: {
    id: number;
    name: string;
    numero: number;
    color: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface SectoresGeoJSON {
  type: "FeatureCollection";
  features: SectorFeature[];
}

// Interface para los datos de comuna calculados
interface ComunaData {
  id: number;
  nombre: string;
  color: string;
  cantidad: number;
}

// Interface para los datos del backend
interface OllaBackend {
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
  president_id: string;
  directive_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  directive: {
    id: string;
    resolution: string;
    start_at: string;
    end_at: string;
  } | null;
  president: {
    id: string;
    name: string;
    lastname: string;
    dni: string;
    phone: string;
    birthday: string;
    sex: "MALE" | "FEMALE";
  } | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: OllaBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

// Función para generar el path de un segmento del donut
const generateDonutSegment = (
  startAngle: number,
  endAngle: number,
  outerRadius: number,
  innerRadius: number,
  cx: number,
  cy: number
) => {
  const startOuterX = cx + outerRadius * Math.cos(startAngle);
  const startOuterY = cy + outerRadius * Math.sin(startAngle);
  const endOuterX = cx + outerRadius * Math.cos(endAngle);
  const endOuterY = cy + outerRadius * Math.sin(endAngle);
  const startInnerX = cx + innerRadius * Math.cos(endAngle);
  const startInnerY = cy + innerRadius * Math.sin(endAngle);
  const endInnerX = cx + innerRadius * Math.cos(startAngle);
  const endInnerY = cy + innerRadius * Math.sin(startAngle);

  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return `
    M ${startOuterX} ${startOuterY}
    A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}
    L ${startInnerX} ${startInnerY}
    A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInnerX} ${endInnerY}
    Z
  `;
};

export default function OllasDashboardPage() {
  const { getData } = useFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [ollasData, setOllasData] = useState<OllaBackend[]>([]);
  const [sectoresData, setSectoresData] = useState<SectoresGeoJSON | null>(null);

  // Cargar GeoJSON de sectores
  const fetchSectores = useCallback(async () => {
    try {
      const response = await fetch("/data/sectores-pvl.geojson");
      const data = await response.json();
      setSectoresData(data);
    } catch (error) {
      console.error("Error cargando sectores:", error);
    }
  }, []);

  // Cargar datos del backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Primero obtener el total
      const firstResponse = await getData<BackendResponse>(`pca/center?page=0&modality=CPOT&limit=1`);
      const totalCount = firstResponse?.data?.totalCount || 0;

      if (totalCount > 0) {
        // Luego obtener todos los datos
        const response = await getData<BackendResponse>(
          `pca/center?page=0&modality=CPOT&limit=${totalCount}`
        );
        if (response?.data?.data) {
          setOllasData(response.data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    fetchSectores();
    fetchData();
  }, [fetchSectores, fetchData]);

  // Función para determinar la comuna de una olla basándose en sus coordenadas
  const getComunaFromCoordinates = useCallback(
    (lat: number, lng: number): SectorFeature["properties"] | null => {
      if (!sectoresData) return null;

      const pt = point([lng, lat]);

      for (const feature of sectoresData.features) {
        try {
          if (feature.geometry.type === "Polygon") {
            const poly = polygon(feature.geometry.coordinates as number[][][]);
            if (booleanPointInPolygon(pt, poly)) {
              return feature.properties;
            }
          } else if (feature.geometry.type === "MultiPolygon") {
            const multiCoords = feature.geometry.coordinates as number[][][][];
            for (const polyCoords of multiCoords) {
              const poly = polygon(polyCoords);
              if (booleanPointInPolygon(pt, poly)) {
                return feature.properties;
              }
            }
          }
        } catch (error) {
          console.error("Error checking point in polygon:", error);
        }
      }

      return null;
    },
    [sectoresData]
  );

  // Calcular estadísticas
  const totalOllas = ollasData.length;
  const totalSocios = ollasData.reduce((sum, o) => sum + o.members, 0);
  const totalSociosHombres = ollasData.reduce((sum, o) => sum + o.members_male, 0);
  const totalSociosMujeres = ollasData.reduce((sum, o) => sum + o.members_female, 0);
  const totalTransitados = ollasData.filter((o) => o.situation === "Transitado").length;
  const totalPendientes = ollasData.filter((o) => o.situation !== "Transitado").length;

  // Estadísticas para las tarjetas principales
  const stats = [
    {
      title: "Total Ollas",
      value: totalOllas.toLocaleString(),
      icon: <SoupKitchen sx={{ fontSize: 32 }} />,
      color: "#d81b7e",
    },
    {
      title: "Total Socios",
      value: totalSocios.toLocaleString(),
      icon: <Groups sx={{ fontSize: 32 }} />,
      color: "#00a3a8",
    },
    {
      title: "Socios Hombres",
      value: totalSociosHombres.toLocaleString(),
      icon: <Male sx={{ fontSize: 32 }} />,
      color: "#2563eb",
    },
    {
      title: "Socios Mujeres",
      value: totalSociosMujeres.toLocaleString(),
      icon: <Female sx={{ fontSize: 32 }} />,
      color: "#db2777",
    },
  ];

  // Calcular ollas por comuna basándose en coordenadas
  const ollasPorComuna: ComunaData[] = [];

  if (sectoresData && ollasData.length > 0) {
    const comunaMap = new Map<number, { nombre: string; color: string; cantidad: number }>();

    // Inicializar con los sectores del GeoJSON
    sectoresData.features.forEach((feature) => {
      comunaMap.set(feature.properties.id, {
        nombre: feature.properties.name,
        color: feature.properties.color,
        cantidad: 0,
      });
    });

    // Calcular ollas por comuna
    ollasData.forEach((olla) => {
      if (olla.latitude && olla.longitude) {
        const comuna = getComunaFromCoordinates(olla.latitude, olla.longitude);
        if (comuna) {
          const existing = comunaMap.get(comuna.id);
          if (existing) {
            existing.cantidad += 1;
          }
        }
      }
    });

    // Convertir a array
    comunaMap.forEach((value, key) => {
      if (value.cantidad > 0) {
        ollasPorComuna.push({
          id: key,
          nombre: value.nombre,
          color: value.color,
          cantidad: value.cantidad,
        });
      }
    });
  }

  const maxOllasComuna = Math.max(...ollasPorComuna.map((c) => c.cantidad), 1);
  const isDataReady = !isLoading && sectoresData !== null;

  // Datos para el gráfico de género
  const generoData = [
    { nombre: "Hombres", cantidad: totalSociosHombres, color: "#2563eb" },
    { nombre: "Mujeres", cantidad: totalSociosMujeres, color: "#db2777" },
  ].filter((g) => g.cantidad > 0);

  const totalGenero = generoData.reduce((sum, g) => sum + g.cantidad, 0);

  // Calcular segmentos del donut para género
  let currentAngleGenero = -Math.PI / 2;
  const segmentsGenero = generoData.map((item) => {
    const angle = totalGenero > 0 ? (item.cantidad / totalGenero) * 2 * Math.PI : 0;
    const startAngle = currentAngleGenero;
    const endAngle = currentAngleGenero + angle;
    currentAngleGenero = endAngle;

    return {
      ...item,
      startAngle,
      endAngle,
      path: generateDonutSegment(startAngle, endAngle, 90, 50, 100, 100),
      percentage: totalGenero > 0 ? ((item.cantidad / totalGenero) * 100).toFixed(1) : "0",
    };
  });

  // Top 10 ollas con más socios
  const topOllas = [...ollasData]
    .sort((a, b) => b.members - a.members)
    .slice(0, 10);

  const maxSocios = topOllas.length > 0 ? topOllas[0].members : 1;

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            color: subgerencia.color,
            fontWeight: 700,
            fontFamily: "'Poppins', 'Roboto', sans-serif",
            letterSpacing: "-0.5px",
          }}
        >
          Ollas Comunes
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            fontFamily: "'Inter', 'Roboto', sans-serif",
          }}
        >
          Dashboard de Gestión de Ollas Comunes
        </Typography>
      </Box>

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
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        fontFamily: "'Poppins', 'Roboto', sans-serif",
                      }}
                    >
                      {stat.value}
                    </Typography>
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    fontFamily: "'Inter', 'Roboto', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Gráficos */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Gráfico de Barras - Ollas por Comuna */}
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
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              color: "#334155",
              fontWeight: 700,
              fontFamily: "'Poppins', 'Roboto', sans-serif",
            }}
          >
            Ollas por Comuna
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#64748b",
              mb: 2,
              fontFamily: "'Inter', 'Roboto', sans-serif",
            }}
          >
            Distribución de ollas por zona
          </Typography>

          {!isDataReady ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: "#d81b7e" }} />
            </Box>
          ) : ollasPorComuna.length === 0 ? (
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
                overflow: "hidden",
              }}
            >
              {/* Gráfico de barras vertical */}
              <Box
                sx={{
                  height: "220px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 0.5,
                  px: 1,
                  overflowX: "auto",
                  overflowY: "hidden",
                  "&::-webkit-scrollbar": { height: "4px" },
                  "&::-webkit-scrollbar-track": { background: "#f1f5f9", borderRadius: "4px" },
                  "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "4px" },
                }}
              >
                {ollasPorComuna
                  .sort((a, b) => a.id - b.id)
                  .map((comuna) => {
                    const maxBarHeight = 180;
                    const barHeight = Math.max((comuna.cantidad / maxOllasComuna) * maxBarHeight, 8);
                    return (
                      <Box
                        key={comuna.id}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: "30px",
                          flex: 1,
                          maxWidth: "50px",
                        }}
                      >
                        {/* Valor encima de la barra */}
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#334155",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            mb: 0.5,
                          }}
                        >
                          {comuna.cantidad}
                        </Typography>
                        {/* Barra */}
                        <Box
                          sx={{
                            width: "80%",
                            height: `${barHeight}px`,
                            backgroundColor: comuna.color,
                            borderRadius: "4px 4px 0 0",
                            transition: "all 0.3s ease",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            "&:hover": {
                              opacity: 0.85,
                              transform: "scaleX(1.1)",
                              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                            },
                          }}
                          title={`${comuna.nombre}: ${comuna.cantidad} ollas`}
                        />
                      </Box>
                    );
                  })}
              </Box>
              {/* Línea base */}
              <Box
                sx={{
                  height: "2px",
                  backgroundColor: "#94a3b8",
                  borderRadius: "1px",
                  mx: 1,
                }}
              />
              {/* Etiquetas de comunas */}
              <Box
                sx={{
                  display: "flex",
                  gap: 0.5,
                  px: 1,
                  mt: 0.5,
                  overflowX: "auto",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {ollasPorComuna
                  .sort((a, b) => a.id - b.id)
                  .map((comuna) => (
                    <Box
                      key={comuna.id}
                      sx={{
                        minWidth: "30px",
                        flex: 1,
                        maxWidth: "50px",
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#64748b",
                          fontSize: "0.6rem",
                          fontWeight: 500,
                        }}
                      >
                        C{comuna.id}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </Box>
          )}
        </Paper>

        {/* Gráfico de Distribución por Género */}
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
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              color: "#334155",
              fontWeight: 700,
              fontFamily: "'Poppins', 'Roboto', sans-serif",
            }}
          >
            Distribución por Género
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#64748b",
              mb: 2,
              fontFamily: "'Inter', 'Roboto', sans-serif",
            }}
          >
            Socios por género
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: "#d81b7e" }} />
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" flex={1} justifyContent="center">
              {/* Gráfico Donut */}
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {segmentsGenero.map((segment, index) => (
                  <path
                    key={index}
                    d={segment.path}
                    fill={segment.color}
                    stroke="white"
                    strokeWidth="2"
                    style={{ transition: "all 0.3s ease", cursor: "pointer" }}
                  />
                ))}
                <circle cx="100" cy="100" r="45" fill="white" />
                <text x="100" y="95" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">
                  Total
                </text>
                <text x="100" y="112" textAnchor="middle" fontSize="14" fontWeight="700" fill="#d81b7e">
                  {totalSocios.toLocaleString()}
                </text>
              </svg>

              {/* Leyenda */}
              <Box sx={{ display: "flex", gap: 4, mt: 3 }}>
                {segmentsGenero.map((item) => (
                  <Box key={item.nombre} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: "4px", backgroundColor: item.color }} />
                    <Box>
                      <Typography variant="body2" fontWeight="600" sx={{ color: "#334155" }}>
                        {item.nombre}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {item.cantidad.toLocaleString()} ({item.percentage}%)
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Top 10 Ollas con más socios */}
      <Box sx={{ mt: 3 }}>
        <Paper
          sx={{
            p: 3,
            borderRadius: "20px",
            boxShadow: "0 8px 20px rgba(216, 27, 126, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08)",
            background: "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              color: "#334155",
              fontWeight: 700,
              fontFamily: "'Poppins', 'Roboto', sans-serif",
            }}
          >
            Top 10 Ollas con más Socios
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#64748b",
              mb: 3,
              fontFamily: "'Inter', 'Roboto', sans-serif",
            }}
          >
            Ollas con mayor cantidad de socios registrados
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress sx={{ color: "#d81b7e" }} />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {topOllas.map((olla, index) => (
                <Box key={olla.id}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#d81b7e",
                          fontWeight: 700,
                          minWidth: 24,
                          fontFamily: "'Poppins', 'Roboto', sans-serif",
                        }}
                      >
                        #{index + 1}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#475569",
                          fontWeight: 500,
                          fontFamily: "'Inter', 'Roboto', sans-serif",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {olla.name}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#334155",
                        fontWeight: 600,
                        fontFamily: "'Poppins', 'Roboto', sans-serif",
                        ml: 2,
                      }}
                    >
                      {olla.members} socios
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 8,
                      backgroundColor: "#e2e8f0",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${(olla.members / maxSocios) * 100}%`,
                        background: "linear-gradient(90deg, #f472b6, #d81b7e)",
                        borderRadius: "4px",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
