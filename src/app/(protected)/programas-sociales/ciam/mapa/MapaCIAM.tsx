"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { PathOptions, Layer, Path } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setupLeafletIcons } from "@/lib/utils/mapSetup";

if (typeof window !== "undefined") setupLeafletIcons(L);

// Tipo para los centros CIAM
export interface CentroCIAM {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  jurisdiccion: string;
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  adultosMayores: number;
  actividades: number;
  responsable: {
    nombre: string;
    telefono: string;
  };
  estado: "activo" | "inactivo";
}

interface CapasVisibles {
  sectores: boolean;
  jurisdicciones: boolean;
  centros: boolean;
}

interface MapaCIAMProps {
  centros: CentroCIAM[];
  centroSeleccionado: CentroCIAM | null;
  onCentroClick: (centro: CentroCIAM) => void;
  limiteVisible: number;
  filterOpen?: boolean;
  capasVisibles?: CapasVisibles;
}

// Icono personalizado - Adulto mayor estilo cute (morado)
const createCustomIcon = (isSelected: boolean) => {
  const size = isSelected ? 42 : 34;

  const elderSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <defs>
        <radialGradient id="ciamHeadGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffecd2"/>
          <stop offset="100%" style="stop-color:#e8c9a0"/>
        </radialGradient>
        <radialGradient id="ciamBodyGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ab47bc"/>
          <stop offset="100%" style="stop-color:#7b1fa2"/>
        </radialGradient>
        <radialGradient id="ciamHairGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#e0e0e0"/>
          <stop offset="100%" style="stop-color:#bdbdbd"/>
        </radialGradient>
      </defs>

      <!-- Cuerpo/Ropa -->
      <path d="M30 95 Q30 65 50 60 Q70 65 70 95 Z" fill="url(#ciamBodyGrad)" stroke="#7b1fa2" stroke-width="2"/>

      <!-- Cuello -->
      <rect x="42" y="55" width="16" height="10" fill="url(#ciamHeadGrad)"/>

      <!-- Cabeza -->
      <ellipse cx="50" cy="35" rx="25" ry="28" fill="url(#ciamHeadGrad)" stroke="#d4a574" stroke-width="1"/>

      <!-- Cabello canoso -->
      <path d="M25 35 Q25 15 50 10 Q75 15 75 35 Q70 20 50 18 Q30 20 25 35" fill="url(#ciamHairGrad)"/>

      <!-- Orejas -->
      <ellipse cx="25" cy="38" rx="5" ry="8" fill="url(#ciamHeadGrad)"/>
      <ellipse cx="75" cy="38" rx="5" ry="8" fill="url(#ciamHeadGrad)"/>

      <!-- Lentes -->
      <ellipse cx="38" cy="38" rx="10" ry="8" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <ellipse cx="62" cy="38" rx="10" ry="8" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <line x1="48" y1="38" x2="52" y2="38" stroke="#4a4a4a" stroke-width="2"/>
      <line x1="28" y1="38" x2="24" y2="35" stroke="#4a4a4a" stroke-width="2"/>
      <line x1="72" y1="38" x2="76" y2="35" stroke="#4a4a4a" stroke-width="2"/>

      <!-- Ojos detrás de lentes -->
      <circle cx="38" cy="38" r="3" fill="#5c4033"/>
      <circle cx="62" cy="38" r="3" fill="#5c4033"/>
      <circle cx="37" cy="37" r="1.5" fill="white"/>
      <circle cx="61" cy="37" r="1.5" fill="white"/>

      <!-- Nariz -->
      <path d="M50 42 Q48 48 50 50 Q52 48 50 42" fill="#d4a574"/>

      <!-- Sonrisa amable -->
      <path d="M40 55 Q50 62 60 55" stroke="#8d6e63" stroke-width="2" fill="none" stroke-linecap="round"/>

      <!-- Mejillas sonrojadas -->
      <ellipse cx="32" cy="48" rx="5" ry="3" fill="#ffcdd2" opacity="0.6"/>
      <ellipse cx="68" cy="48" rx="5" ry="3" fill="#ffcdd2" opacity="0.6"/>

      <!-- Arrugas de expresión (sonrisa) -->
      <path d="M30 42 Q28 45 30 48" stroke="#d4a574" stroke-width="1" fill="none"/>
      <path d="M70 42 Q72 45 70 48" stroke="#d4a574" stroke-width="1" fill="none"/>

      <!-- Corazoncito -->
      <path d="M78 55 C78 52 75 50 73 52 C71 50 68 52 68 55 C68 59 73 62 73 62 C73 62 78 59 78 55" fill="#e91e63" opacity="0.9"/>
    </svg>
  `;

  return L.divIcon({
    className: "custom-marker-ciam",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ${isSelected ? "transform: scale(1.15); filter: drop-shadow(0 4px 8px rgba(156, 39, 176, 0.5));" : ""}
    ">
      ${elderSvg}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MAP_CENTER: [number, number] = [-11.9699, -76.998];
const MAP_ZOOM = 13;

// Componente para centrar el mapa
function CentrarMapa({ centro }: { centro: CentroCIAM | null }) {
  const map = useMap();

  useEffect(() => {
    if (centro) {
      map.flyTo([centro.coordenadas.latitud, centro.coordenadas.longitud], 16, {
        duration: 0.5,
      });
    }
  }, [centro, map]);

  return null;
}

// Componente para ajustar posición de controles de zoom
function ZoomControlPosition({ filterOpen }: { filterOpen: boolean }) {
  useEffect(() => {
    const zoomControl = document.querySelector(".leaflet-control-zoom");
    if (zoomControl) {
      const rightContainer = document.querySelector(".leaflet-right.leaflet-top");
      if (rightContainer && !rightContainer.contains(zoomControl)) {
        rightContainer.appendChild(zoomControl);
      }
    }
  }, []);

  useEffect(() => {
    const zoomControl = document.querySelector(".leaflet-control-zoom") as HTMLElement;
    if (zoomControl) {
      zoomControl.style.transition = "margin-right 0.3s ease";
      zoomControl.style.marginRight = filterOpen ? "330px" : "10px";
    }
  }, [filterOpen]);

  return null;
}

// Interfaces para propiedades GeoJSON
interface SectorProperties {
  id: number;
  name: string;
  numero: number;
  color: string;
}

interface JurisdiccionProperties {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function MapaCIAM({
  centros,
  centroSeleccionado,
  onCentroClick,
  limiteVisible,
  filterOpen = false,
  capasVisibles = { sectores: true, jurisdicciones: false, centros: true }
}: MapaCIAMProps) {
  const [jurisdiccionesData, setJurisdiccionesData] = useState<FeatureCollection | null>(null);
  const [sectoresData, setSectoresData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/data/jurisdicciones.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        if (data?.features) setJurisdiccionesData(data);
      })
      .catch((err) => console.error("Error cargando jurisdicciones:", err));
  }, []);

  useEffect(() => {
    fetch("/data/sectores-pvl.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        if (data?.features) setSectoresData(data);
      })
      .catch((err) => console.error("Error cargando sectores:", err));
  }, []);

  const estiloJurisdiccion = (feature: Feature | undefined): PathOptions => {
    const props = feature?.properties as JurisdiccionProperties | undefined;
    const color = props?.color || "#34b429";
    return { color, weight: 2, fillColor: color, fillOpacity: 0.35, interactive: true };
  };

  const onEachJurisdiccion = (feature: Feature, layer: Layer) => {
    const props = feature.properties as JurisdiccionProperties;
    if (props?.name) {
      layer.bindTooltip(props.name, { permanent: false, direction: "center", className: "jurisdiccion-tooltip" });
      const pathLayer = layer as Path;
      layer.on({
        mouseover: () => pathLayer.setStyle({ fillOpacity: 0.6, weight: 3 }),
        mouseout: () => pathLayer.setStyle({ fillOpacity: 0.35, weight: 2 }),
      });
    }
  };

  const estiloSector = (feature: Feature | undefined): PathOptions => {
    const props = feature?.properties as SectorProperties | undefined;
    const color = props?.color || "#888888";
    return { color, weight: 2, fillColor: color, fillOpacity: 0.35, interactive: true };
  };

  const onEachSector = (feature: Feature, layer: Layer) => {
    const props = feature.properties as SectorProperties;
    if (props?.name) {
      layer.bindTooltip(props.name, { permanent: false, direction: "center", className: "sector-tooltip" });
      const pathLayer = layer as Path;
      layer.on({
        mouseover: () => pathLayer.setStyle({ fillOpacity: 0.6, weight: 3 }),
        mouseout: () => pathLayer.setStyle({ fillOpacity: 0.35, weight: 2 }),
      });
    }
  };

  const centrosMostrados = centros.slice(0, limiteVisible);

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      style={{ height: "100%", width: "100%" }}
      minZoom={11}
      maxZoom={18}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {sectoresData && capasVisibles.sectores && (
        <GeoJSON key="sectores" data={sectoresData} style={estiloSector} onEachFeature={onEachSector} />
      )}

      {jurisdiccionesData && capasVisibles.jurisdicciones && (
        <GeoJSON key="jurisdicciones" data={jurisdiccionesData} style={estiloJurisdiccion} onEachFeature={onEachJurisdiccion} />
      )}

      {capasVisibles.centros && centrosMostrados.map((centro) => (
        <Marker
          key={centro.id}
          position={[centro.coordenadas.latitud, centro.coordenadas.longitud]}
          icon={createCustomIcon(centroSeleccionado?.id === centro.id)}
          eventHandlers={{ click: () => onCentroClick(centro) }}
        >
          <Popup>
            <strong>{centro.nombre}</strong>
            <br />
            {centro.direccion}
          </Popup>
        </Marker>
      ))}

      <CentrarMapa centro={centroSeleccionado} />
      <ZoomControlPosition filterOpen={filterOpen} />
    </MapContainer>
  );
}
