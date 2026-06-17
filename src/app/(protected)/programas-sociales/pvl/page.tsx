"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Card, CardContent, Typography, Paper, CircularProgress, Skeleton } from "@mui/material";
import { People, LocalDrink, Groups, Accessible } from "@mui/icons-material";
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

// Interfaces para el backend
interface CommitteeBackend {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  beneficiaries: number;
  beneficiaries_foreign: number;
  members: number;
  handicappeds: number;
  commune: number;
  observation: string | null;
  route: string;
  couple: { id: string; name: string } | null;
  town: { id: string; name: string } | null;
  coordinator: {
    id: string;
    name: string;
    lastname: string;
    dni: string;
    phone: string;
    birthday?: string;
  } | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: CommitteeBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

// Interface para los datos de comuna calculados
interface ComunaData {
  id: number;
  nombre: string;
  color: string;
  cantidad: number;
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

export default function PVLDashboardPage() {
  const { getData } = useFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [comitesData, setComitesData] = useState<CommitteeBackend[]>([]);
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
      const firstResponse = await getData<BackendResponse>(`pvl/committee?page=1&limit=1`);
      const totalCount = firstResponse?.data?.totalCount || 0;

      if (totalCount > 0) {
        // Luego obtener todos los datos
        const response = await getData<BackendResponse>(
          `pvl/committee?page=1&limit=${totalCount}`
        );
        if (response?.data?.data) {
          setComitesData(response.data.data);
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

  // Función para determinar la comuna de un comité basándose en sus coordenadas
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
            // Para MultiPolygon, verificar cada polígono individualmente
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
  const totalBeneficiarios = comitesData.reduce((sum, c) => sum + c.beneficiaries, 0);
  const totalComites = comitesData.length;
  const totalSocios = comitesData.reduce((sum, c) => sum + c.members, 0);
  const totalDiscapacitados = comitesData.reduce((sum, c) => sum + c.handicappeds, 0);

  // Estadísticas para las tarjetas
  const stats = [
    {
      title: "Total Beneficiarios",
      value: totalBeneficiarios.toLocaleString(),
      icon: <People sx={{ fontSize: 32 }} />,
      color: "#d81b7e",
    },
    {
      title: "Total Comités",
      value: totalComites.toLocaleString(),
      icon: <LocalDrink sx={{ fontSize: 32 }} />,
      color: "#00a3a8",
    },
    {
      title: "Total Socios",
      value: totalSocios.toLocaleString(),
      icon: <Groups sx={{ fontSize: 32 }} />,
      color: "#4caf50",
    },
    {
      title: "Discapacitados",
      value: totalDiscapacitados.toLocaleString(),
      icon: <Accessible sx={{ fontSize: 32 }} />,
      color: "#ff9800",
    },
  ];

  // Calcular comités por comuna basándose en coordenadas
  const comitesPorComuna: ComunaData[] = [];
  const beneficiariosPorComuna: ComunaData[] = [];

  if (sectoresData && comitesData.length > 0) {
    // Crear un mapa para acumular datos por comuna
    const comunaMap = new Map<number, { nombre: string; color: string; comites: number; beneficiarios: number }>();

    // Inicializar con los sectores del GeoJSON
    sectoresData.features.forEach((feature) => {
      comunaMap.set(feature.properties.id, {
        nombre: feature.properties.name,
        color: feature.properties.color,
        comites: 0,
        beneficiarios: 0,
      });
    });

    // Calcular comités y beneficiarios por comuna
    comitesData.forEach((comite) => {
      if (comite.latitude && comite.longitude) {
        const comuna = getComunaFromCoordinates(comite.latitude, comite.longitude);
        if (comuna) {
          const existing = comunaMap.get(comuna.id);
          if (existing) {
            existing.comites += 1;
            existing.beneficiarios += comite.beneficiaries;
          }
        }
      }
    });

    // Convertir a arrays
    comunaMap.forEach((value, key) => {
      if (value.comites > 0) {
        comitesPorComuna.push({
          id: key,
          nombre: value.nombre,
          color: value.color,
          cantidad: value.comites,
        });
      }
      if (value.beneficiarios > 0) {
        beneficiariosPorComuna.push({
          id: key,
          nombre: value.nombre,
          color: value.color,
          cantidad: value.beneficiarios,
        });
      }
    });
  }

  const totalBenefComuna = beneficiariosPorComuna.reduce((sum, c) => sum + c.cantidad, 0);
  const maxComites = Math.max(...comitesPorComuna.map((c) => c.cantidad), 1);

  // Calcular segmentos del donut para beneficiarios
  let currentAngle = -Math.PI / 2;
  const segments = beneficiariosPorComuna
    .sort((a, b) => b.cantidad - a.cantidad)
    .map((comuna) => {
      const angle = totalBenefComuna > 0 ? (comuna.cantidad / totalBenefComuna) * 2 * Math.PI : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      return {
        ...comuna,
        startAngle,
        endAngle,
        path: generateDonutSegment(startAngle, endAngle, 90, 50, 100, 100),
      };
    });

  const isDataReady = !isLoading && sectoresData !== null;

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: subgerencia.color }}>
          PVL - Programa de Vaso de Leche
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Dashboard del Programa de Vaso de Leche
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
        {/* Gráfico de Barras - Comités por Comuna */}
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
            Comités por Comuna
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Distribución de comités por zona
          </Typography>

          {!isDataReady ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: "#d81b7e" }} />
            </Box>
          ) : comitesPorComuna.length === 0 ? (
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
                {comitesPorComuna
                  .sort((a, b) => a.id - b.id)
                  .map((comuna) => {
                    // Calcular altura en píxeles (máximo 180px)
                    const maxBarHeight = 180;
                    const barHeight = Math.max((comuna.cantidad / maxComites) * maxBarHeight, 8);
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
                          title={`${comuna.nombre}: ${comuna.cantidad} comités`}
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
                {comitesPorComuna
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

        {/* Beneficiarios por Comuna - Donut Chart */}
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
            Beneficiarios por Comuna
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Distribución de beneficiarios por zona
          </Typography>

          {!isDataReady ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: "#d81b7e" }} />
            </Box>
          ) : beneficiariosPorComuna.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <Typography variant="body2" color="text.secondary">
                No hay datos disponibles
              </Typography>
            </Box>
          ) : (
            <>
              {/* Gráfico Donut */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {/* Círculo de fondo con borde punteado */}
                  <circle
                    cx="100"
                    cy="100"
                    r="92"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />

                  {/* Segmentos del donut */}
                  {segments.map((segment, index) => (
                    <path
                      key={index}
                      d={segment.path}
                      fill={segment.color}
                      stroke="white"
                      strokeWidth="2"
                      style={{
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.02)";
                        e.currentTarget.style.transformOrigin = "100px 100px";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    />
                  ))}

                  {/* Círculo central blanco */}
                  <circle cx="100" cy="100" r="45" fill="white" />

                  {/* Texto central */}
                  <text
                    x="100"
                    y="95"
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="#334155"
                  >
                    Total
                  </text>
                  <text
                    x="100"
                    y="112"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="700"
                    fill="#d81b7e"
                  >
                    {totalBenefComuna.toLocaleString()}
                  </text>
                </svg>
              </Box>

              {/* Lista de comunas con cantidades */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1,
                  flex: 1,
                  overflowY: "auto",
                  px: 1,
                  "&::-webkit-scrollbar": { width: "4px" },
                  "&::-webkit-scrollbar-track": { background: "#f1f5f9", borderRadius: "4px" },
                  "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "4px" },
                }}
              >
                {beneficiariosPorComuna
                  .sort((a, b) => b.cantidad - a.cantidad)
                  .map((comuna) => (
                    <Box
                      key={comuna.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        py: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "3px",
                          backgroundColor: comuna.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#475569",
                          fontSize: "0.6rem",
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        C{comuna.id}: {comuna.cantidad.toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
