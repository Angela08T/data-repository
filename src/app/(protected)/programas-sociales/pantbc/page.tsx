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
import { People, Male, Female, LocalHospital } from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import { calcularEdad } from "@/lib/utils/formatters";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];
const PANTBC_COLOR = subgerencia.color;

// ============================================
// TRADUCCIONES
// ============================================
const TRADUCCIONES: Record<string, Record<string, string>> = {
  sex: { MALE: "Masculino", FEMALE: "Femenino" },
  patient_type: {
    NEW: "Nuevo",
    RELAPSE: "Recaída",
    TREATMENT_AFTER_FAILURE: "Fracaso de Tto.",
    TREATMENT_AFTER_LOSS: "Abandono recuperado",
    OTHER: "Otro",
  },
};

const traducir = (cat: string, val: string | null | undefined): string =>
  val ? (TRADUCCIONES[cat]?.[val] ?? val) : "-";

// ============================================
// INTERFACES
// ============================================
interface CensusEntity {
  id: string;
  name: string;
}

interface PacienteBackend {
  id: string;
  doc_num: string;
  name: string;
  lastname: string;
  phone: string | null;
  start_at: string;
  birthday: string;
  doc_type: string;
  patient_type: string;
  sector: string | null;
  sex: string;
  census: CensusEntity | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: PacienteBackend[];
    totalCount: number;
    currentPage: number;
    pageCount: number;
    totalPages: number;
  };
}

// ============================================
// COLORES
// ============================================
const TIPO_COLORS: Record<string, string> = {
  Nuevo: "#d81b7e",
  Recaída: "#ff9800",
  "Fracaso de Tto.": "#f44336",
  "Abandono recuperado": "#4caf50",
  Otro: "#9c27b0",
  "-": "#94a3b8",
};

const AGE_RANGES = [
  { label: "0-17", min: 0, max: 17, color: "#38bdf8" },
  { label: "18-29", min: 18, max: 29, color: "#34d399" },
  { label: "30-44", min: 30, max: 44, color: "#fbbf24" },
  { label: "45-59", min: 45, max: 59, color: "#fb923c" },
  { label: "60+", min: 60, max: 200, color: "#f87171" },
];


const generateDonutSegment = (
  startAngle: number,
  endAngle: number,
  outerRadius: number,
  innerRadius: number,
  cx: number,
  cy: number
) => {
  const s0x = cx + outerRadius * Math.cos(startAngle);
  const s0y = cy + outerRadius * Math.sin(startAngle);
  const e0x = cx + outerRadius * Math.cos(endAngle);
  const e0y = cy + outerRadius * Math.sin(endAngle);
  const s1x = cx + innerRadius * Math.cos(endAngle);
  const s1y = cy + innerRadius * Math.sin(endAngle);
  const e1x = cx + innerRadius * Math.cos(startAngle);
  const e1y = cy + innerRadius * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${s0x} ${s0y} A ${outerRadius} ${outerRadius} 0 ${large} 1 ${e0x} ${e0y} L ${s1x} ${s1y} A ${innerRadius} ${innerRadius} 0 ${large} 0 ${e1x} ${e1y} Z`;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function PANTBCDashboardPage() {
  const { getData } = useFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [pacientes, setPacientes] = useState<PacienteBackend[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const first = await getData<BackendResponse>("pantbc/patient?page=1&limit=1");
      const total = first?.data?.totalCount || 0;
      if (total > 0) {
        const res = await getData<BackendResponse>(
          `pantbc/patient?page=1&limit=${total}`
        );
        if (res?.data?.data) setPacientes(res.data.data);
      }
    } catch (e) {
      console.error("Error cargando PANTBC:", e);
    } finally {
      setIsLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // === ESTADÍSTICAS ===
  const total = pacientes.length;
  const masculinos = pacientes.filter((p) => p.sex === "MALE").length;
  const femeninos = pacientes.filter((p) => p.sex === "FEMALE").length;
  const establecimientos = new Set(
    pacientes.map((p) => p.census?.name).filter(Boolean)
  ).size;

  const stats = [
    {
      title: "Total Pacientes",
      value: total.toLocaleString(),
      icon: <People sx={{ fontSize: 32 }} />,
      color: PANTBC_COLOR,
    },
    {
      title: "Masculino",
      value: masculinos.toLocaleString(),
      icon: <Male sx={{ fontSize: 32 }} />,
      color: "#1e88e5",
    },
    {
      title: "Femenino",
      value: femeninos.toLocaleString(),
      icon: <Female sx={{ fontSize: 32 }} />,
      color: "#e91e63",
    },
    {
      title: "Establecimientos",
      value: establecimientos.toLocaleString(),
      icon: <LocalHospital sx={{ fontSize: 32 }} />,
      color: "#00897b",
    },
  ];

  // === TIPO PACIENTE DONUT ===
  const tipoMap = new Map<string, number>();
  pacientes.forEach((p) => {
    const label = traducir("patient_type", p.patient_type);
    tipoMap.set(label, (tipoMap.get(label) || 0) + 1);
  });
  const tipoDistribucion = Array.from(tipoMap.entries())
    .map(([label, cantidad]) => ({
      label,
      cantidad,
      color: TIPO_COLORS[label] || "#94a3b8",
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
  const totalTipo = tipoDistribucion.reduce((sum, t) => sum + t.cantidad, 0);

  let currentAngle = -Math.PI / 2;
  const tipoSegments = tipoDistribucion.map((t) => {
    const angle = totalTipo > 0 ? (t.cantidad / totalTipo) * 2 * Math.PI : 0;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    return {
      ...t,
      startAngle: start,
      endAngle: end,
      path: generateDonutSegment(start, end, 90, 50, 100, 100),
    };
  });

  // === RANGO DE EDAD ===
  const edadDistribucion = AGE_RANGES.map((range) => ({
    ...range,
    cantidad: pacientes.filter((p) => {
      const e = calcularEdad(p.birthday);
      return e >= range.min && e <= range.max;
    }).length,
  }));
  const maxEdad = Math.max(...edadDistribucion.map((e) => e.cantidad), 1);

  // === TOP ESTABLECIMIENTOS ===
  const censusMap = new Map<string, number>();
  pacientes.forEach((p) => {
    const name = p.census?.name || "Sin establecimiento";
    censusMap.set(name, (censusMap.get(name) || 0) + 1);
  });
  const topEstablecimientos = Array.from(censusMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxCensusCount = Math.max(...topEstablecimientos.map((e) => e.count), 1);

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Typography
          variant="h4"
          gutterBottom
          fontWeight="bold"
          sx={{ color: PANTBC_COLOR }}
        >
          PANTBC - Programa de Alimentación y Nutrición para TBC
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Dashboard del módulo PANTBC
        </Typography>
      </Box>

      {/* Tarjetas de estadísticas */}
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
                background: `linear-gradient(to bottom, ${PANTBC_COLOR}4D, ${PANTBC_COLOR}00)`,
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
                "&:hover": { transform: "translateY(-4px)" },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  right: "-6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "12px",
                  height: "60%",
                  background: `linear-gradient(to bottom, #f472b6, ${PANTBC_COLOR}, #be185d)`,
                  borderRadius: "12px",
                  boxShadow: `0 4px 10px ${PANTBC_COLOR}59`,
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

      {/* Gráficos - fila 1 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Donut - Tipo de Paciente */}
        <Paper
          sx={{
            p: 3,
            height: "420px",
            borderRadius: "20px",
            boxShadow: `0 8px 20px ${PANTBC_COLOR}26, 0 4px 8px rgba(0,0,0,0.08)`,
            background:
              "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            fontWeight="bold"
            sx={{ color: "#334155" }}
          >
            Tipo de Paciente
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Distribución por categoría de tratamiento
          </Typography>

          {isLoading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              flex={1}
            >
              <CircularProgress sx={{ color: PANTBC_COLOR }} />
            </Box>
          ) : tipoDistribucion.length === 0 ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              flex={1}
            >
              <Typography variant="body2" color="text.secondary">
                No hay datos disponibles
              </Typography>
            </Box>
          ) : (
            <>
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
                  {tipoSegments.map((seg, i) => (
                    <path
                      key={i}
                      d={seg.path}
                      fill={seg.color}
                      stroke="white"
                      strokeWidth="2"
                      style={{ transition: "all 0.3s ease", cursor: "pointer" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.02)";
                        e.currentTarget.style.transformOrigin = "100px 100px";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <title>{`${seg.label}: ${seg.cantidad} (${((seg.cantidad / totalTipo) * 100).toFixed(1)}%)`}</title>
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
                    fill={PANTBC_COLOR}
                  >
                    {totalTipo.toLocaleString()}
                  </text>
                </svg>
              </Box>

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
                {tipoDistribucion.map((t) => (
                  <Box
                    key={t.label}
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
                          backgroundColor: t.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ color: "#475569", fontWeight: 500 }}
                      >
                        {t.label}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: "#334155", fontWeight: 700 }}
                      >
                        {t.cantidad.toLocaleString()}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#64748b",
                          minWidth: 40,
                          textAlign: "right",
                        }}
                      >
                        {((t.cantidad / totalTipo) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>

        {/* Bar - Distribución por Edad */}
        <Paper
          sx={{
            p: 3,
            height: "420px",
            borderRadius: "20px",
            boxShadow: `0 8px 20px ${PANTBC_COLOR}26, 0 4px 8px rgba(0,0,0,0.08)`,
            background:
              "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            fontWeight="bold"
            sx={{ color: "#334155" }}
          >
            Distribución por Edad
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Pacientes agrupados por rango de edad
          </Typography>

          {isLoading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              flex={1}
            >
              <CircularProgress sx={{ color: PANTBC_COLOR }} />
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
                  const barHeight = Math.max(
                    (range.cantidad / maxEdad) * 200,
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
                      <Typography
                        variant="body2"
                        sx={{ color: "#334155", fontWeight: 700, mb: 0.5 }}
                      >
                        {range.cantidad.toLocaleString()}
                      </Typography>
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
                        title={`${range.label} años: ${range.cantidad} pacientes`}
                      />
                    </Box>
                  );
                })}
              </Box>
              <Box
                sx={{
                  height: "2px",
                  backgroundColor: "#94a3b8",
                  borderRadius: "1px",
                  mx: 2,
                }}
              />
              <Box sx={{ display: "flex", gap: 2, px: 2, mt: 1 }}>
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

      {/* Gráfico - Establecimientos (ancho completo) */}
      <Paper
        sx={{
          p: 3,
          borderRadius: "20px",
          boxShadow: `0 8px 20px ${PANTBC_COLOR}26, 0 4px 8px rgba(0,0,0,0.08)`,
          background:
            "linear-gradient(145deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: "#334155" }}
        >
          Establecimientos de Salud
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
          Pacientes por establecimiento (Top {topEstablecimientos.length})
        </Typography>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: PANTBC_COLOR }} />
          </Box>
        ) : topEstablecimientos.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={4}
          >
            No hay datos disponibles
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {topEstablecimientos.map((est) => {
              const pct = (est.count / maxCensusCount) * 100;
              return (
                <Box key={est.name}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#334155",
                        fontWeight: 500,
                        maxWidth: "75%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={est.name}
                    >
                      {est.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: PANTBC_COLOR, fontWeight: 700 }}
                    >
                      {est.count.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 8,
                      backgroundColor: "#e2e8f0",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${PANTBC_COLOR}80, ${PANTBC_COLOR})`,
                        borderRadius: 4,
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
  );
}
