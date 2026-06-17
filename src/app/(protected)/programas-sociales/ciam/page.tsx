"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  CircularProgress,
  Skeleton,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  Elderly,
  HealthAndSafety,
  CalendarMonth,
  Male,
  Female,
  Home,
  Favorite,
  School,
} from "@mui/icons-material";
import { useFetch } from "@/lib/hooks/useFetch";
import { calcularEdad } from "@/lib/utils/formatters";

const BATCH_SIZE = 500;

// ============================================
// INTERFACES
// ============================================
interface RelatedEntity {
  id: string;
  name: string;
}

interface BeneficiarioBackend {
  id: string;
  name: string;
  lastname: string;
  cellphone: string | null;
  birthday: string;
  civil: string;
  doc_type: string;
  health: string;
  poverty_level: string | null;
  housing_status: string;
  mode: string;
  sex: string;
  country: RelatedEntity | null;
  department_birth: RelatedEntity | null;
  department_live: RelatedEntity | null;
  district_live: RelatedEntity | null;
  education: RelatedEntity | null;
  ethnic: RelatedEntity | null;
  housing: RelatedEntity | null;
  language_learned: RelatedEntity | null;
  language_native: RelatedEntity | null;
  province_birth: RelatedEntity | null;
  province_live: RelatedEntity | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: BeneficiarioBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

// ============================================
// COLORES Y CONFIGURACIÓN
// ============================================
const CIAM_COLOR = "#9c27b0";
const CIAM_GRADIENT = "linear-gradient(to bottom, rgba(156, 39, 176, 0.3), rgba(156, 39, 176, 0))";
const CIAM_BAR_GRADIENT = "linear-gradient(135deg, #ce93d8, #9c27b0, #7b1fa2)";

const HEALTH_COLORS: Record<string, string> = {
  SIS: "#2196f3",
  ESSALUD: "#4caf50",
  PRIVATE: "#9c27b0",
  NONE: "#f44336",
  OTHER: "#ff9800",
};

const HEALTH_LABELS: Record<string, string> = {
  SIS: "SIS",
  ESSALUD: "EsSalud",
  PRIVATE: "Privado",
  NONE: "Sin seguro",
  OTHER: "Otro",
};

const CIVIL_COLORS: Record<string, string> = {
  SINGLE: "#2196f3",
  MARRIED: "#4caf50",
  DIVORCED: "#ff9800",
  WIDOWED: "#607d8b",
  COHABITANT: "#9c27b0",
};

const CIVIL_LABELS: Record<string, string> = {
  SINGLE: "Soltero(a)",
  MARRIED: "Casado(a)",
  DIVORCED: "Divorciado(a)",
  WIDOWED: "Viudo(a)",
  COHABITANT: "Conviviente",
};

const MODE_COLORS: Record<string, string> = {
  HIGH: "#4caf50",
  MEDIUM: "#ff9800",
  LOW: "#f44336",
};

const MODE_LABELS: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

const HOUSING_COLORS: Record<string, string> = {
  OWN: "#4caf50",
  RENTED: "#2196f3",
  BORROWED: "#ff9800",
  OTHER: "#607d8b",
};

const HOUSING_LABELS: Record<string, string> = {
  OWN: "Propia",
  RENTED: "Alquilada",
  BORROWED: "Prestada",
  OTHER: "Otro",
};

const AGE_RANGE_COLORS = [
  "#7b1fa2",
  "#9c27b0",
  "#ab47bc",
  "#ce93d8",
  "#e1bee7",
  "#ba68c8",
  "#8e24aa",
];


const getRangoEdad = (edad: number): string => {
  if (edad < 65) return "60-64";
  if (edad < 70) return "65-69";
  if (edad < 75) return "70-74";
  if (edad < 80) return "75-79";
  if (edad < 85) return "80-84";
  if (edad < 90) return "85-89";
  return "90+";
};

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

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function CIAMDashboardPage() {
  const { getData } = useFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioBackend[]>([]);

  // Cargar datos del backend en lotes
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);

    try {
      // Primero obtener el total
      const firstResponse = await getData<BackendResponse>(`pam/benefited?page=1&limit=1`);
      const totalCount = firstResponse?.data?.totalCount || 0;

      if (totalCount === 0) {
        setBeneficiarios([]);
        setIsLoading(false);
        return;
      }

      // Calcular número de páginas necesarias
      const totalPages = Math.ceil(totalCount / BATCH_SIZE);
      const allData: BeneficiarioBackend[] = [];

      // Cargar en lotes de 500
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const response = await getData<BackendResponse>(
          `pam/benefited?page=${pageNum}&limit=${BATCH_SIZE}`
        );

        if (response?.data?.data) {
          allData.push(...response.data.data);
        }

        // Actualizar progreso
        setLoadingProgress(Math.round((pageNum / totalPages) * 100));
      }

      setBeneficiarios(allData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setBeneficiarios([]);
    } finally {
      setIsLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // CÁLCULOS ESTADÍSTICOS
  // ============================================
  const estadisticas = useMemo(() => {
    if (beneficiarios.length === 0) {
      return {
        total: 0,
        masculino: 0,
        femenino: 0,
        conSeguro: 0,
        edadPromedio: 0,
        edades: [] as number[],
      };
    }

    const edades = beneficiarios.map((b) => calcularEdad(b.birthday));
    const masculino = beneficiarios.filter((b) => b.sex === "MALE").length;
    const femenino = beneficiarios.filter((b) => b.sex === "FEMALE").length;
    const conSeguro = beneficiarios.filter(
      (b) => b.health && b.health !== "NONE"
    ).length;
    const edadPromedio =
      edades.length > 0
        ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length)
        : 0;

    return {
      total: beneficiarios.length,
      masculino,
      femenino,
      conSeguro,
      edadPromedio,
      edades,
    };
  }, [beneficiarios]);

  // Distribución por seguro de salud
  const distribucionSeguro = useMemo(() => {
    const conteo: Record<string, number> = {};
    beneficiarios.forEach((b) => {
      const seguro = b.health || "NONE";
      conteo[seguro] = (conteo[seguro] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([key, cantidad]) => ({
        key,
        nombre: HEALTH_LABELS[key] || key,
        cantidad,
        color: HEALTH_COLORS[key] || "#9e9e9e",
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [beneficiarios]);

  // Distribución por estado civil
  const distribucionCivil = useMemo(() => {
    const conteo: Record<string, number> = {};
    beneficiarios.forEach((b) => {
      const civil = b.civil || "SINGLE";
      conteo[civil] = (conteo[civil] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([key, cantidad]) => ({
        key,
        nombre: CIVIL_LABELS[key] || key,
        cantidad,
        color: CIVIL_COLORS[key] || "#9e9e9e",
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [beneficiarios]);

  // Distribución por modo de atención
  const distribucionModo = useMemo(() => {
    const conteo: Record<string, number> = {};
    beneficiarios.forEach((b) => {
      const modo = b.mode || "LOW";
      conteo[modo] = (conteo[modo] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([key, cantidad]) => ({
        key,
        nombre: MODE_LABELS[key] || key,
        cantidad,
        color: MODE_COLORS[key] || "#9e9e9e",
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [beneficiarios]);

  // Distribución por condición de vivienda
  const distribucionVivienda = useMemo(() => {
    const conteo: Record<string, number> = {};
    beneficiarios.forEach((b) => {
      const vivienda = b.housing_status || "OTHER";
      conteo[vivienda] = (conteo[vivienda] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([key, cantidad]) => ({
        key,
        nombre: HOUSING_LABELS[key] || key,
        cantidad,
        color: HOUSING_COLORS[key] || "#9e9e9e",
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [beneficiarios]);

  // Distribución por rango de edad
  const distribucionEdad = useMemo(() => {
    const rangos = ["60-64", "65-69", "70-74", "75-79", "80-84", "85-89", "90+"];
    const conteo: Record<string, number> = {};
    rangos.forEach((r) => (conteo[r] = 0));

    estadisticas.edades.forEach((edad) => {
      const rango = getRangoEdad(edad);
      conteo[rango] = (conteo[rango] || 0) + 1;
    });

    return rangos.map((rango, i) => ({
      rango,
      cantidad: conteo[rango] || 0,
      color: AGE_RANGE_COLORS[i],
    }));
  }, [estadisticas.edades]);

  // Distribución por sexo
  const distribucionSexo = useMemo(() => {
    return [
      { nombre: "Masculino", cantidad: estadisticas.masculino, color: "#1565c0" },
      { nombre: "Femenino", cantidad: estadisticas.femenino, color: "#c2185b" },
    ];
  }, [estadisticas.masculino, estadisticas.femenino]);

  // Top distritos
  const topDistritos = useMemo(() => {
    const conteo: Record<string, number> = {};
    beneficiarios.forEach((b) => {
      const distrito = b.district_live?.name || "Sin distrito";
      conteo[distrito] = (conteo[distrito] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);
  }, [beneficiarios]);

  // Top educación
  const topEducacion = useMemo(() => {
    const conteo: Record<string, number> = {};
    beneficiarios.forEach((b) => {
      const educacion = b.education?.name || "Sin información";
      conteo[educacion] = (conteo[educacion] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);
  }, [beneficiarios]);

  // ============================================
  // STAT CARDS
  // ============================================
  const stats = [
    {
      title: "Total Adultos Mayores",
      value: estadisticas.total.toLocaleString(),
      icon: <Elderly sx={{ fontSize: 32 }} />,
      color: CIAM_COLOR,
    },
    {
      title: "Masculino",
      value: estadisticas.masculino.toLocaleString(),
      icon: <Male sx={{ fontSize: 32 }} />,
      color: "#1565c0",
    },
    {
      title: "Femenino",
      value: estadisticas.femenino.toLocaleString(),
      icon: <Female sx={{ fontSize: 32 }} />,
      color: "#c2185b",
    },
    {
      title: "Edad Promedio",
      value: `${estadisticas.edadPromedio} años`,
      icon: <CalendarMonth sx={{ fontSize: 32 }} />,
      color: "#ff9800",
    },
  ];

  // ============================================
  // DONUT CHART HELPERS
  // ============================================
  const buildDonutSegments = (
    data: { nombre: string; cantidad: number; color: string }[]
  ) => {
    const total = data.reduce((s, d) => s + d.cantidad, 0);
    if (total === 0) return [];
    let currentAngle = -Math.PI / 2;
    return data.map((item) => {
      const angle = (item.cantidad / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      return {
        ...item,
        startAngle,
        endAngle,
        path: generateDonutSegment(startAngle, endAngle, 90, 50, 100, 100),
        porcentaje: ((item.cantidad / total) * 100).toFixed(1),
      };
    });
  };

  const seguroSegments = buildDonutSegments(distribucionSeguro);
  const civilSegments = buildDonutSegments(distribucionCivil);
  const sexoSegments = buildDonutSegments(distribucionSexo);
  const viviendaSegments = buildDonutSegments(distribucionVivienda);

  const totalSeguro = distribucionSeguro.reduce((s, d) => s + d.cantidad, 0);
  const totalCivil = distribucionCivil.reduce((s, d) => s + d.cantidad, 0);
  const totalVivienda = distribucionVivienda.reduce((s, d) => s + d.cantidad, 0);

  const maxEdadRango = Math.max(...distribucionEdad.map((e) => e.cantidad), 1);
  const maxDistrito = Math.max(...topDistritos.map((d) => d.cantidad), 1);
  const maxEducacion = Math.max(...topEducacion.map((e) => e.cantidad), 1);

  // ============================================
  // ESTILOS COMPARTIDOS
  // ============================================
  const paperStyle = {
    p: 3,
    borderRadius: "20px",
    boxShadow: `0 8px 20px rgba(156, 39, 176, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06)`,
    background:
      "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
    backdropFilter: "blur(8px)",
    display: "flex",
    flexDirection: "column" as const,
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Typography
          variant="h4"
          gutterBottom
          fontWeight="bold"
          sx={{ color: CIAM_COLOR }}
        >
          CIAM - Centro Integral de Atención al Adulto Mayor
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Dashboard estadístico del programa CIAM - Datos en tiempo real
        </Typography>
      </Box>

      {/* Barra de progreso de carga */}
      {isLoading && loadingProgress > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Cargando datos del servidor...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {loadingProgress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={loadingProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "#e0e0e0",
              "& .MuiLinearProgress-bar": {
                backgroundColor: CIAM_COLOR,
                borderRadius: 4,
              },
            }}
          />
        </Box>
      )}

      {/* ============================================ */}
      {/* TARJETAS DE ESTADÍSTICAS */}
      {/* ============================================ */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 3,
          mb: 4,
        }}
      >
        {stats.map((stat, index) => (
          <Box key={index} sx={{ position: "relative", height: "100%" }}>
            <Box
              sx={{
                position: "absolute",
                bottom: "-15px",
                left: "10%",
                right: "10%",
                height: "30px",
                background: CIAM_GRADIENT,
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
                  background: CIAM_BAR_GRADIENT,
                  borderRadius: "12px",
                  boxShadow: "0 4px 10px rgba(156, 39, 176, 0.35)",
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

      {/* ============================================ */}
      {/* FILA 1: Sexo + Seguro de Salud */}
      {/* ============================================ */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Distribución por Sexo */}
        <Paper sx={{ ...paperStyle, minHeight: "380px", height: "auto" }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: "#334155" }}>
            Distribución por Sexo
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Género de los adultos mayores registrados
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: CIAM_COLOR }} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
                <svg width="160" height="160" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="92" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                  {sexoSegments.map((segment, i) => (
                    <path
                      key={i}
                      d={segment.path}
                      fill={segment.color}
                      stroke="white"
                      strokeWidth="2"
                      style={{ transition: "all 0.3s ease", cursor: "pointer" }}
                    />
                  ))}
                  <circle cx="100" cy="100" r="45" fill="white" />
                  <text x="100" y="95" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">Total</text>
                  <text x="100" y="112" textAnchor="middle" fontSize="14" fontWeight="700" fill={CIAM_COLOR}>
                    {estadisticas.total.toLocaleString()}
                  </text>
                </svg>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 3, flexWrap: "wrap" }}>
                {sexoSegments.map((item, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: item.color }} />
                    <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.8rem" }}>
                      {item.nombre}: {item.cantidad} ({item.porcentaje}%)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>

        {/* Seguro de Salud */}
        <Paper sx={{ ...paperStyle, minHeight: "380px", height: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <HealthAndSafety sx={{ color: "#2196f3", fontSize: 24 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: "#334155" }}>
              Seguro de Salud
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Cobertura de seguro de salud
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: CIAM_COLOR }} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
                <svg width="160" height="160" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="92" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                  {seguroSegments.map((segment, i) => (
                    <path key={i} d={segment.path} fill={segment.color} stroke="white" strokeWidth="2" />
                  ))}
                  <circle cx="100" cy="100" r="45" fill="white" />
                  <text x="100" y="95" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">Total</text>
                  <text x="100" y="112" textAnchor="middle" fontSize="14" fontWeight="700" fill="#2196f3">
                    {totalSeguro.toLocaleString()}
                  </text>
                </svg>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, px: 1 }}>
                {seguroSegments.map((item, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: item.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.8rem" }}>{item.nombre}</Typography>
                    </Box>
                    <Chip
                      label={`${item.cantidad} (${item.porcentaje}%)`}
                      size="small"
                      sx={{ backgroundColor: `${item.color}15`, color: item.color, fontWeight: 600, fontSize: "0.7rem", height: 22 }}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* ============================================ */}
      {/* FILA 2: Estado Civil + Vivienda */}
      {/* ============================================ */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Estado Civil */}
        <Paper sx={{ ...paperStyle, minHeight: "380px", height: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Favorite sx={{ color: "#e91e63", fontSize: 24 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: "#334155" }}>
              Estado Civil
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Distribución por estado civil
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: CIAM_COLOR }} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
                <svg width="160" height="160" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="92" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                  {civilSegments.map((segment, i) => (
                    <path key={i} d={segment.path} fill={segment.color} stroke="white" strokeWidth="2" />
                  ))}
                  <circle cx="100" cy="100" r="45" fill="white" />
                  <text x="100" y="95" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">Total</text>
                  <text x="100" y="112" textAnchor="middle" fontSize="14" fontWeight="700" fill="#e91e63">
                    {totalCivil.toLocaleString()}
                  </text>
                </svg>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, px: 1 }}>
                {civilSegments.map((item, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: item.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.8rem" }}>{item.nombre}</Typography>
                    </Box>
                    <Chip
                      label={`${item.cantidad} (${item.porcentaje}%)`}
                      size="small"
                      sx={{ backgroundColor: `${item.color}15`, color: item.color, fontWeight: 600, fontSize: "0.7rem", height: 22 }}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>

        {/* Condición de Vivienda */}
        <Paper sx={{ ...paperStyle, minHeight: "380px", height: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Home sx={{ color: "#4caf50", fontSize: 24 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: "#334155" }}>
              Condición de Vivienda
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Situación de vivienda de los adultos mayores
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: CIAM_COLOR }} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
                <svg width="160" height="160" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="92" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                  {viviendaSegments.map((segment, i) => (
                    <path key={i} d={segment.path} fill={segment.color} stroke="white" strokeWidth="2" />
                  ))}
                  <circle cx="100" cy="100" r="45" fill="white" />
                  <text x="100" y="95" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">Total</text>
                  <text x="100" y="112" textAnchor="middle" fontSize="14" fontWeight="700" fill="#4caf50">
                    {totalVivienda.toLocaleString()}
                  </text>
                </svg>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, px: 1 }}>
                {viviendaSegments.map((item, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: item.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.8rem" }}>{item.nombre}</Typography>
                    </Box>
                    <Chip
                      label={`${item.cantidad} (${item.porcentaje}%)`}
                      size="small"
                      sx={{ backgroundColor: `${item.color}15`, color: item.color, fontWeight: 600, fontSize: "0.7rem", height: 22 }}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* ============================================ */}
      {/* FILA 3: Distribución por Edad */}
      {/* ============================================ */}
      <Paper sx={{ ...paperStyle, height: "350px", mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: "#334155" }}>
          Distribución por Edad
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
          Rangos de edad de los adultos mayores
        </Typography>

        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
            <CircularProgress sx={{ color: CIAM_COLOR }} />
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Box sx={{ height: "200px", display: "flex", alignItems: "flex-end", gap: 1.5, px: 2 }}>
              {distribucionEdad.map((item) => {
                const barHeight = Math.max((item.cantidad / maxEdadRango) * 180, 8);
                return (
                  <Box key={item.rango} sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <Typography variant="caption" sx={{ color: "#334155", fontWeight: 700, fontSize: "0.75rem", mb: 0.5 }}>
                      {item.cantidad}
                    </Typography>
                    <Box
                      sx={{
                        width: "70%",
                        height: `${barHeight}px`,
                        background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}90 100%)`,
                        borderRadius: "6px 6px 0 0",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        boxShadow: `0 2px 6px ${item.color}40`,
                        "&:hover": { opacity: 0.85, transform: "scaleX(1.1)" },
                      }}
                      title={`${item.rango} años: ${item.cantidad} personas`}
                    />
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ height: "2px", backgroundColor: "#94a3b8", borderRadius: "1px", mx: 2 }} />
            <Box sx={{ display: "flex", gap: 1.5, px: 2, mt: 0.5 }}>
              {distribucionEdad.map((item) => (
                <Box key={item.rango} sx={{ flex: 1, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 600 }}>
                    {item.rango}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* ============================================ */}
      {/* FILA 4: Distritos + Nivel Educativo */}
      {/* ============================================ */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Top Distritos */}
        <Paper sx={{ ...paperStyle, height: "auto", minHeight: "350px" }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: "#334155" }}>
            Top Distritos de Residencia
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
            Distritos con más adultos mayores registrados
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1} py={4}>
              <CircularProgress sx={{ color: CIAM_COLOR }} />
            </Box>
          ) : topDistritos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No hay datos disponibles
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {topDistritos.map((item, i) => {
                const porcentaje = (item.cantidad / maxDistrito) * 100;
                const barColor = AGE_RANGE_COLORS[i % AGE_RANGE_COLORS.length];
                return (
                  <Box key={item.nombre}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: "#475569", fontWeight: 500, fontSize: "0.85rem" }}>
                        {item.nombre}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#334155", fontWeight: 700, fontSize: "0.85rem" }}>
                        {item.cantidad}
                      </Typography>
                    </Box>
                    <Box sx={{ width: "100%", height: "20px", backgroundColor: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                      <Box
                        sx={{
                          width: `${porcentaje}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${barColor}80 0%, ${barColor} 100%)`,
                          borderRadius: "10px",
                          transition: "width 0.6s ease",
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>

        {/* Nivel Educativo */}
        <Paper sx={{ ...paperStyle, height: "auto", minHeight: "350px" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <School sx={{ color: "#ff9800", fontSize: 24 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: "#334155" }}>
              Nivel Educativo
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
            Distribución por nivel de educación
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1} py={4}>
              <CircularProgress sx={{ color: CIAM_COLOR }} />
            </Box>
          ) : topEducacion.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No hay datos disponibles
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {topEducacion.map((item, i) => {
                const porcentaje = (item.cantidad / maxEducacion) * 100;
                const colors = ["#ff9800", "#ffc107", "#ffca28", "#ffd54f", "#ffe082", "#ffecb3"];
                const barColor = colors[i % colors.length];
                return (
                  <Box key={item.nombre}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: "#475569", fontWeight: 500, fontSize: "0.85rem" }}>
                        {item.nombre}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#334155", fontWeight: 700, fontSize: "0.85rem" }}>
                        {item.cantidad}
                      </Typography>
                    </Box>
                    <Box sx={{ width: "100%", height: "20px", backgroundColor: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                      <Box
                        sx={{
                          width: `${porcentaje}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${barColor}90 0%, ${barColor} 100%)`,
                          borderRadius: "10px",
                          transition: "width 0.6s ease",
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
