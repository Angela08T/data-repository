"use client";

import dynamic from "next/dynamic";
import { CircularProgress, Box } from "@mui/material";

// Importar MapaBase dinámicamente para evitar SSR (Leaflet no funciona en servidor)
const MapaBase = dynamic(() => import("./MapaBase"), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "100%",
        bgcolor: "grey.100",
      }}
    >
      <CircularProgress />
    </Box>
  ),
});

interface MapaJurisdiccionesProps {
  className?: string;
}

export default function MapaJurisdicciones({ className = "" }: MapaJurisdiccionesProps) {
  return (
    <div className={`w-full h-full min-h-[400px] ${className}`}>
      <MapaBase showJurisdicciones={true} />
    </div>
  );
}
