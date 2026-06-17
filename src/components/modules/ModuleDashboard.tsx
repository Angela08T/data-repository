"use client";

import { Card, CardContent, Typography, Box } from "@mui/material";
import { People, LocalDrink, Map, TrendingUp, Restaurant, SoupKitchen, Accessible, Elderly } from "@mui/icons-material";

interface Stat {
  title: string;
  value: string;
  color: string;
}

interface ModuleDashboardProps {
  title: string;
  subtitle: string;
  stats?: Stat[];
  color?: string;
  icon?: "drink" | "restaurant" | "soup" | "accessible" | "elderly";
}

const iconMap = {
  drink: <LocalDrink sx={{ fontSize: 40 }} />,
  restaurant: <Restaurant sx={{ fontSize: 40 }} />,
  soup: <SoupKitchen sx={{ fontSize: 40 }} />,
  accessible: <Accessible sx={{ fontSize: 40 }} />,
  elderly: <Elderly sx={{ fontSize: 40 }} />,
};

export default function ModuleDashboard({
  title,
  subtitle,
  stats,
  color = "#d81b7e",
  icon = "drink",
}: ModuleDashboardProps) {
  const defaultStats: Stat[] = [
    { title: "Total Beneficiarios", value: "1,234", color: color },
    { title: "Activos", value: "1,100", color: "#4caf50" },
    { title: "Jurisdicciones", value: "18", color: "#00a3a8" },
    { title: "Crecimiento", value: "+2.5%", color: "#ff9800" },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {subtitle}
      </Typography>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map((stat, index) => (
          <Card key={index} sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color }}>
                    {stat.value}
                  </Typography>
                </Box>
                {index === 0 && <Box sx={{ color: stat.color, opacity: 0.8 }}>{iconMap[icon]}</Box>}
                {index === 1 && (
                  <Box sx={{ color: stat.color, opacity: 0.8 }}>
                    <People sx={{ fontSize: 40 }} />
                  </Box>
                )}
                {index === 2 && (
                  <Box sx={{ color: stat.color, opacity: 0.8 }}>
                    <Map sx={{ fontSize: 40 }} />
                  </Box>
                )}
                {index === 3 && (
                  <Box sx={{ color: stat.color, opacity: 0.8 }}>
                    <TrendingUp sx={{ fontSize: 40 }} />
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2">
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Beneficiarios por Mes
              </Typography>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
                color="text.secondary"
              >
                Gráfico de beneficiarios (próximamente)
              </Box>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribución por Jurisdicción
              </Typography>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
                color="text.secondary"
              >
                Gráfico circular (próximamente)
              </Box>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
