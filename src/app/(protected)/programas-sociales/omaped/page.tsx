"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import {
  People,
  Accessible,
  Badge,
  AssignmentTurnedIn,
} from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import { calcularEdad } from "@/lib/utils/formatters";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];
const OMAPED_COLOR = subgerencia.color;

// Interfaces para el backend
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

// Traducciones de grado
const DEGREE_LABELS: Record<string, string> = {
  MILD: "Leve",
  MODERATE: "Moderado",
  SEVERE: "Severo",
  VERY_SEVERE: "Muy Severo",
};

const DEGREE_COLORS: Record<string, string> = {
  Leve: "#facc15",
  Moderado: "#fb923c",
  Severo: "#ef4444",
  "Muy Severo": "#a855f7",
  "Sin dato": "#94a3b8",
};

// Rangos de edad
const AGE_RANGES = [
  { label: "0-17", min: 0, max: 17, color: "#38bdf8" },
  { label: "18-29", min: 18, max: 29, color: "#34d399" },
  { label: "30-44", min: 30, max: 44, color: "#fbbf24" },
  { label: "45-59", min: 45, max: 59, color: "#fb923c" },
  { label: "60+", min: 60, max: 200, color: "#f87171" },
];


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

export default function OMAPEDDashboardPage() {
  const { getData } = useFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [beneficiariosData, setBeneficiariosData] = useState<BeneficiarioOMAPEDBackend[]>([]);

  // Cargar todos los datos del backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const firstResponse = await getData<BackendResponse>(`omaped/disabled?page=1&limit=1`);
      const totalCount = firstResponse?.data?.totalCount || 0;

      if (totalCount > 0) {
        const response = await getData<BackendResponse>(
          `omaped/disabled?page=1&limit=${totalCount}`
        );
        if (response?.data?.data) {
          setBeneficiariosData(response.data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching OMAPED data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcular estadísticas
  const totalRegistrados = beneficiariosData.length;
  const conCertificado = beneficiariosData.filter(
    (b) => b.certificate && b.certificate.trim() !== ""
  ).length;
  const conConadis = beneficiariosData.filter(
    (b) => b.conadis && b.conadis.trim() !== ""
  ).length;
  const conDiagnostico = beneficiariosData.filter(
    (b) => b.diagnostic1 && b.diagnostic1.trim() !== ""
  ).length;

  // Tarjetas de estadísticas
  const stats = [
    {
      title: "Total Registrados",
      value: totalRegistrados.toLocaleString(),
      icon: <People sx={{ fontSize: 32 }} />,
      color: OMAPED_COLOR,
    },
    {
      title: "Con Certificado",
      value: conCertificado.toLocaleString(),
      icon: <AssignmentTurnedIn sx={{ fontSize: 32 }} />,
      color: "#4caf50",
    },
    {
      title: "Con CONADIS",
      value: conConadis.toLocaleString(),
      icon: <Badge sx={{ fontSize: 32 }} />,
      color: "#00a3a8",
    },
    {
      title: "Con Diagnóstico",
      value: conDiagnostico.toLocaleString(),
      icon: <Accessible sx={{ fontSize: 32 }} />,
      color: "#ff9800",
    },
  ];

  // Distribución por grado de discapacidad
  const gradoDistribucion: { label: string; cantidad: number; color: string }[] = [];
  const gradoMap = new Map<string, number>();

  beneficiariosData.forEach((b) => {
    const label = b.degree ? (DEGREE_LABELS[b.degree] || b.degree) : "Sin dato";
    gradoMap.set(label, (gradoMap.get(label) || 0) + 1);
  });

  gradoMap.forEach((cantidad, label) => {
    gradoDistribucion.push({
      label,
      cantidad,
      color: DEGREE_COLORS[label] || "#94a3b8",
    });
  });

  // Ordenar por cantidad descendente
  gradoDistribucion.sort((a, b) => b.cantidad - a.cantidad);

  const totalGrado = gradoDistribucion.reduce((sum, g) => sum + g.cantidad, 0);

  // Calcular segmentos del donut
  let currentAngle = -Math.PI / 2;
  const donutSegments = gradoDistribucion.map((grado) => {
    const angle = totalGrado > 0 ? (grado.cantidad / totalGrado) * 2 * Math.PI : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...grado,
      startAngle,
      endAngle,
      path: generateDonutSegment(startAngle, endAngle, 90, 50, 100, 100),
    };
  });

  // Distribución por rango de edad
  const edadDistribucion = AGE_RANGES.map((range) => {
    const cantidad = beneficiariosData.filter((b) => {
      const edad = calcularEdad(b.birthday);
      return edad >= range.min && edad <= range.max;
    }).length;
    return { ...range, cantidad };
  });

  const maxEdad = Math.max(...edadDistribucion.map((e) => e.cantidad), 1);

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: OMAPED_COLOR }}>
          OMAPED - Oficina Municipal de Atención a la Persona con Discapacidad
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Dashboard del módulo OMAPED
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
          <Box key={index} sx={{ position: "relative", height: "100%" }}>
            {/* Sombra difuminada debajo */}
            <Box
              sx={{
                position: "absolute",
                bottom: "-15px",
                left: "10%",
                right: "10%",
                height: "30px",
                background: `linear-gradient(to bottom, ${OMAPED_COLOR}4D, ${OMAPED_COLOR}00)`,
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
                  background: `linear-gradient(to bottom, #f472b6, ${OMAPED_COLOR}, #be185d)`,
                  borderRadius: "12px",
                  boxShadow: `0 4px 10px ${OMAPED_COLOR}59`,
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

      {/* Gráficos */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Donut Chart - Distribución por Grado de Discapacidad */}
        <Paper
          sx={{
            p: 3,
            height: "420px",
            borderRadius: "20px",
            boxShadow: `0 8px 20px ${OMAPED_COLOR}26, 0 4px 8px rgba(0, 0, 0, 0.08)`,
            background:
              "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: "#334155" }}>
            Grado de Discapacidad
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Distribución de beneficiarios por grado
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: OMAPED_COLOR }} />
            </Box>
          ) : gradoDistribucion.length === 0 ? (
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
                  <circle
                    cx="100"
                    cy="100"
                    r="92"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  {donutSegments.map((segment, index) => (
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
                    >
                      <title>{`${segment.label}: ${segment.cantidad} (${((segment.cantidad / totalGrado) * 100).toFixed(1)}%)`}</title>
                    </path>
                  ))}
                  <circle cx="100" cy="100" r="45" fill="white" />
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
                    fill={OMAPED_COLOR}
                  >
                    {totalGrado.toLocaleString()}
                  </text>
                </svg>
              </Box>

              {/* Leyenda */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  flex: 1,
                  overflowY: "auto",
                  px: 1,
                }}
              >
                {gradoDistribucion.map((grado) => (
                  <Box
                    key={grado.label}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "3px",
                          backgroundColor: grado.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: "#475569", fontWeight: 500 }}>
                        {grado.label}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ color: "#334155", fontWeight: 700 }}>
                        {grado.cantidad.toLocaleString()}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#64748b",
                          minWidth: 40,
                          textAlign: "right",
                        }}
                      >
                        {((grado.cantidad / totalGrado) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>

        {/* Gráfico de Barras - Distribución por Rango de Edad */}
        <Paper
          sx={{
            p: 3,
            height: "420px",
            borderRadius: "20px",
            boxShadow: `0 8px 20px ${OMAPED_COLOR}26, 0 4px 8px rgba(0, 0, 0, 0.08)`,
            background:
              "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: "#334155" }}>
            Distribución por Edad
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Beneficiarios agrupados por rango de edad
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: OMAPED_COLOR }} />
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              {/* Barras */}
              <Box
                sx={{
                  height: "240px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 2,
                  px: 2,
                }}
              >
                {edadDistribucion.map((range) => {
                  const maxBarHeight = 200;
                  const barHeight = Math.max(
                    (range.cantidad / maxEdad) * maxBarHeight,
                    8
                  );
                  return (
                    <Box
                      key={range.label}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      {/* Valor */}
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#334155",
                          fontWeight: 700,
                          mb: 0.5,
                        }}
                      >
                        {range.cantidad.toLocaleString()}
                      </Typography>
                      {/* Barra */}
                      <Box
                        sx={{
                          width: "70%",
                          height: `${barHeight}px`,
                          backgroundColor: range.color,
                          borderRadius: "6px 6px 0 0",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          "&:hover": {
                            opacity: 0.85,
                            transform: "scaleX(1.1)",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                          },
                        }}
                        title={`${range.label} años: ${range.cantidad} personas`}
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
                  mx: 2,
                }}
              />
              {/* Etiquetas */}
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  px: 2,
                  mt: 1,
                }}
              >
                {edadDistribucion.map((range) => (
                  <Box key={range.label} sx={{ flex: 1, textAlign: "center" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      {range.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#94a3b8",
                        fontSize: "0.65rem",
                        display: "block",
                      }}
                    >
                      años
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
