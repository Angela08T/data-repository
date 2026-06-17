"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
} from "@mui/material";
import { Layers, Place, MyLocation } from "@mui/icons-material";
import MapaJurisdicciones from "@/components/map/MapaJurisdicciones";

interface LayerConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  defaultVisible?: boolean;
}

interface ModuleMapaProps {
  title: string;
  subtitle: string;
  layers?: LayerConfig[];
  mainColor?: string;
}

const defaultLayers: LayerConfig[] = [
  { id: "jurisdicciones", name: "Jurisdicciones", description: "Límites territoriales", color: "#34b429", defaultVisible: true },
  { id: "puntos", name: "Puntos de Atención", description: "Ubicaciones de servicio", color: "#d81b7e", defaultVisible: true },
  { id: "beneficiarios", name: "Beneficiarios", description: "Distribución geográfica", color: "#1976d2", defaultVisible: false },
];

export default function ModuleMapa({
  title,
  subtitle,
  layers = defaultLayers,
  mainColor = "#d81b7e",
}: ModuleMapaProps) {
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(
    layers.reduce((acc, layer) => ({ ...acc, [layer.id]: layer.defaultVisible ?? true }), {})
  );

  const toggleLayer = (layerId: string) => {
    setVisibleLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4">
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Panel de Control de Capas */}
        <Paper sx={{ width: 280, flexShrink: 0, overflow: "auto" }}>
          <Box p={2}>
            <Typography variant="subtitle1" fontWeight="bold" display="flex" alignItems="center" gap={1}>
              <Layers fontSize="small" />
              Control de Capas
            </Typography>
          </Box>
          <Divider />
          <List dense>
            {layers.map((layer) => (
              <ListItem key={layer.id}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {layer.id === "jurisdicciones" ? (
                    <Place sx={{ color: layer.color }} fontSize="small" />
                  ) : (
                    <MyLocation sx={{ color: layer.color }} fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText primary={layer.name} secondary={layer.description} />
                <Switch
                  checked={visibleLayers[layer.id] ?? false}
                  onChange={() => toggleLayer(layer.id)}
                  size="small"
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box px={2} pb={2}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>
              Leyenda
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {layers.map((layer) => (
                <Box key={layer.id} display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      bgcolor: layer.color,
                      borderRadius: layer.id === "jurisdicciones" ? 0.5 : "50%",
                    }}
                  />
                  <Typography variant="caption">{layer.name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>

        {/* Mapa */}
        <Card sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <CardContent sx={{ flex: 1, p: 0, "&:last-child": { pb: 0 }, height: "100%" }}>
            <MapaJurisdicciones className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
