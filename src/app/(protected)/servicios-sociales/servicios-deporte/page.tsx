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
import { People, SportsScore, ChildCare, Person } from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useFetch } from "@/lib/hooks/useFetch";
import { calcularEdad } from "@/lib/utils/formatters";

const subgerencia = SUBGERENCIAS[SubgerenciaType.SERVICIOS_SOCIALES];
const MODULE_COLOR = subgerencia.color; // #00a3a8

// ============================================
// TALLERES
// ============================================
const TALLERES = [
  { id: "8d36a33e-65e7-48bd-b513-978ad63b237a", name: "Ballet",         color: "#00897b" },
  { id: "56949f0f-9bd6-4b9f-aae0-e4abc00ab0b8", name: "Dibujo y Pintura", color: "#1e88e5" },
  { id: "6ffa2818-ac6a-4d59-8897-6b7425cac2d1", name: "Futbol",          color: "#8e24aa" },
  { id: "140bf549-1e37-431e-8372-3df0fe867903", name: "Taekwondo",       color: "#f4511e" },
];

const TALLER_MAP = Object.fromEntries(TALLERES.map((t) => [t.id, t]));

// ============================================
// RANGOS DE EDAD
// ============================================
const AGE_RANGES = [
  { label: "0-11",  min: 0,   max: 11,  color: "#38bdf8" },
  { label: "12-17", min: 12,  max: 17,  color: "#34d399" },
  { label: "18-29", min: 18,  max: 29,  color: "#fbbf24" },
  { label: "30-44", min: 30,  max: 44,  color: "#fb923c" },
  { label: "45-59", min: 45,  max: 59,  color: "#f87171" },
  { label: "60+",   min: 60,  max: 200, color: "#c084fc" },
];

// ============================================
// INTERFACES
// ============================================
interface WorkshopEntity {
  id: string;
  name: string;
}

interface ParticipanteBackend {
  id: string;
  dni: string;
  name: string;
  lastname: string;
  phone: string | null;
  birthday: string;
  workshop: WorkshopEntity | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: ParticipanteBackend[];
    totalCount: number;
    currentPage: number;
    pageCount: number;
    totalPages: number;
  };
}


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
export default function CulturaDeporteDashboardPage() {
  const { getData } = useFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [participantes, setParticipantes] = useState<ParticipanteBackend[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const first = await getData<BackendResponse>(
        "recreation/participant?page=1&limit=1"
      );
      const total = first?.data?.totalCount || 0;
      if (total > 0) {
        const res = await getData<BackendResponse>(
          `recreation/participant?page=1&limit=${total}`
        );
        if (res?.data?.data) setParticipantes(res.data.data);
      }
    } catch (e) {
      console.error("Error cargando Cultura y Deporte:", e);
    } finally {
      setIsLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // === ESTADÍSTICAS ===
  const total = participantes.length;
  const menores = participantes.filter((p) => calcularEdad(p.birthday) < 18).length;
  const adultos = participantes.filter((p) => calcularEdad(p.birthday) >= 18).length;
  const talleresActivos = new Set(
    participantes.map((p) => p.workshop?.id).filter(Boolean)
  ).size;

  const stats = [
    {
      title: "Total Participantes",
      value: total.toLocaleString(),
      icon: <People sx={{ fontSize: 32 }} />,
      color: MODULE_COLOR,
    },
    {
      title: "Talleres Activos",
      value: talleresActivos.toLocaleString(),
      icon: <SportsScore sx={{ fontSize: 32 }} />,
      color: "#f4511e",
    },
    {
      title: "Menores (0-17)",
      value: menores.toLocaleString(),
      icon: <ChildCare sx={{ fontSize: 32 }} />,
      color: "#1e88e5",
    },
    {
      title: "Adultos (18+)",
      value: adultos.toLocaleString(),
      icon: <Person sx={{ fontSize: 32 }} />,
      color: "#8e24aa",
    },
  ];

  // === DONUT - PARTICIPANTES POR TALLER ===
  const tallerMap = new Map<string, { name: string; color: string; cantidad: number }>();
  participantes.forEach((p) => {
    const wid = p.workshop?.id || "sin-taller";
    if (!tallerMap.has(wid)) {
      const info = wid !== "sin-taller"
        ? TALLER_MAP[wid] || { name: p.workshop?.name || "Otro", color: "#64748b" }
        : { name: "Sin taller", color: "#94a3b8" };
      tallerMap.set(wid, { ...info, cantidad: 0 });
    }
    tallerMap.get(wid)!.cantidad++;
  });

  const tallerDistribucion = Array.from(tallerMap.values())
    .sort((a, b) => b.cantidad - a.cantidad);
  const totalTaller = tallerDistribucion.reduce((s, t) => s + t.cantidad, 0);

  let currentAngle = -Math.PI / 2;
  const donutSegments = tallerDistribucion.map((t) => {
    const angle = totalTaller > 0 ? (t.cantidad / totalTaller) * 2 * Math.PI : 0;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    return {
      ...t,
      path: generateDonutSegment(start, end, 90, 50, 100, 100),
    };
  });

  // === BAR - RANGOS DE EDAD ===
  const edadDistribucion = AGE_RANGES.map((range) => ({
    ...range,
    cantidad: participantes.filter((p) => {
      const e = calcularEdad(p.birthday);
      return e >= range.min && e <= range.max;
    }).length,
  }));
  const maxEdad = Math.max(...edadDistribucion.map((e) => e.cantidad), 1);

  // === BAR HORIZONTAL - TALLERES ===
  const maxTaller = Math.max(...tallerDistribucion.map((t) => t.cantidad), 1);

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Typography
          variant="h4"
          gutterBottom
          fontWeight="bold"
          sx={{ color: MODULE_COLOR }}
        >
          Cultura y Deporte
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Dashboard del módulo de Cultura y Deporte
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
                background: `linear-gradient(to bottom, ${MODULE_COLOR}4D, ${MODULE_COLOR}00)`,
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
                transition: "transform 0.2s",
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
                  background: `linear-gradient(to bottom, #4dd0e1, ${MODULE_COLOR}, #00838f)`,
                  borderRadius: "12px",
                  boxShadow: `0 4px 10px ${MODULE_COLOR}59`,
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

      {/* Gráficos fila 1 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Donut - Participantes por Taller */}
        <Paper
          sx={{
            p: 3,
            height: "420px",
            borderRadius: "20px",
            boxShadow: `0 8px 20px ${MODULE_COLOR}26, 0 4px 8px rgba(0,0,0,0.08)`,
            background:
              "linear-gradient(145deg, rgba(241,245,249,0.95) 0%, rgba(226,232,240,0.85) 100%)",
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
            Participantes por Taller
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Distribución de participantes según taller inscrito
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: MODULE_COLOR }} />
            </Box>
          ) : tallerDistribucion.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
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
                  {donutSegments.map((seg, i) => (
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
                      <title>{`${seg.name}: ${seg.cantidad} (${((seg.cantidad / totalTaller) * 100).toFixed(1)}%)`}</title>
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
                    fill={MODULE_COLOR}
                  >
                    {totalTaller.toLocaleString()}
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
                {tallerDistribucion.map((t) => (
                  <Box
                    key={t.name}
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
                        {t.name}
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
                        sx={{ color: "#64748b", minWidth: 40, textAlign: "right" }}
                      >
                        {((t.cantidad / totalTaller) * 100).toFixed(1)}%
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
            boxShadow: `0 8px 20px ${MODULE_COLOR}26, 0 4px 8px rgba(0,0,0,0.08)`,
            background:
              "linear-gradient(145deg, rgba(241,245,249,0.95) 0%, rgba(226,232,240,0.85) 100%)",
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
            Participantes agrupados por rango de edad
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress sx={{ color: MODULE_COLOR }} />
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
                  gap: 1.5,
                  px: 1,
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
                        sx={{ color: "#334155", fontWeight: 700, mb: 0.5, fontSize: "0.75rem" }}
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
                        title={`${range.label} años: ${range.cantidad} participantes`}
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
                  mx: 1,
                }}
              />
              <Box sx={{ display: "flex", gap: 1.5, px: 1, mt: 1 }}>
                {edadDistribucion.map((range) => (
                  <Box key={range.label} sx={{ flex: 1, textAlign: "center" }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748b", fontWeight: 600, fontSize: "0.7rem" }}
                    >
                      {range.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8", fontSize: "0.6rem", display: "block" }}
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

      {/* Barras horizontales - Talleres (ancho completo) */}
      <Paper
        sx={{
          p: 3,
          borderRadius: "20px",
          boxShadow: `0 8px 20px ${MODULE_COLOR}26, 0 4px 8px rgba(0,0,0,0.08)`,
          background:
            "linear-gradient(145deg, rgba(241,245,249,0.95) 0%, rgba(226,232,240,0.85) 100%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: "#334155" }}
        >
          Participantes por Taller
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
          Cantidad de participantes inscritos en cada taller
        </Typography>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: MODULE_COLOR }} />
          </Box>
        ) : tallerDistribucion.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={4}
          >
            No hay datos disponibles
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {tallerDistribucion.map((t) => {
              const pct = (t.cantidad / maxTaller) * 100;
              return (
                <Box key={t.name}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.75,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: "4px",
                          backgroundColor: t.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ color: "#334155", fontWeight: 600 }}
                      >
                        {t.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: "#64748b", fontSize: "0.8rem" }}
                      >
                        {((t.cantidad / totalTaller) * 100).toFixed(1)}%
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: t.color,
                          fontWeight: 700,
                          minWidth: 40,
                          textAlign: "right",
                        }}
                      >
                        {t.cantidad.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      height: 10,
                      backgroundColor: "#e2e8f0",
                      borderRadius: 5,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${t.color}80, ${t.color})`,
                        borderRadius: 5,
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
