"use client";

import { Box, Card, CardContent, Typography, Paper } from "@mui/material";
import {
  Groups,
  Diversity3,
  VolunteerActivism,
  Description,
} from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];

// Datos de ejemplo para las tarjetas de estadísticas
const statsCards = [
  {
    title: "Total Beneficiarios",
    value: "12,345",
    icon: <Groups sx={{ fontSize: 32 }} />,
    color: "#3f51b5",
  },
  {
    title: "Programas Activos",
    value: "7",
    icon: <Diversity3 sx={{ fontSize: 32 }} />,
    color: "#4caf50",
  },
  {
    title: "Atenciones del Mes",
    value: "1,234",
    icon: <VolunteerActivism sx={{ fontSize: 32 }} />,
    color: "#ff9800",
  },
  {
    title: "Reportes Generados",
    value: "45",
    icon: <Description sx={{ fontSize: 32 }} />,
    color: "#f44336",
  },
];

export default function ProgramasSocialesDashboard() {
  return (
    <Box>
      {/* Encabezado */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: subgerencia.color }}>
          Dashboard - Programas Sociales
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido al panel de control de la Subgerencia de Programas Sociales
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
        {statsCards.map((card, index) => (
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
                    background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}30 100%)`,
                    color: card.color,
                    width: 56,
                    height: 56,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "16px",
                    mr: 2,
                    boxShadow: `0 4px 12px ${card.color}25`,
                    border: `1px solid ${card.color}20`,
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {card.value}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {card.title}
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
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
          gap: 3,
        }}
      >
        <Paper sx={{ p: 3, height: "400px", borderRadius: "20px", boxShadow: "0 8px 20px rgba(216, 27, 126, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08)" }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Actividad Reciente
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aquí se mostrará un gráfico de actividad reciente
          </Typography>
          <Box
            sx={{
              height: "300px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
              borderRadius: 2,
              mt: 2,
            }}
          >
            <Typography color="text.secondary">Gráfico de actividad</Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, height: "400px", borderRadius: "20px", boxShadow: "0 8px 20px rgba(216, 27, 126, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08)" }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Distribución por Programa
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gráfico de distribución
          </Typography>
          <Box
            sx={{
              height: "300px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
              borderRadius: 2,
              mt: 2,
            }}
          >
            <Typography color="text.secondary">Gráfico circular</Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
