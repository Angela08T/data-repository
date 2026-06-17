"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { PathOptions, Layer, Path } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setupLeafletIcons } from "@/lib/utils/mapSetup";

if (typeof window !== "undefined") setupLeafletIcons(L);

export interface CentroOMAPED {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  jurisdiccion: string;
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  beneficiarios: number;
  servicios: number;
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

interface MapaOMAPEDProps {
  centros: CentroOMAPED[];
  centroSeleccionado: CentroOMAPED | null;
  onCentroClick: (centro: CentroOMAPED) => void;
  limiteVisible: number;
  filterOpen?: boolean;
  capasVisibles?: CapasVisibles;
}

// Icono personalizado - Persona con discapacidad (azul)
const createCustomIcon = (isSelected: boolean) => {
  const size = isSelected ? 42 : 34;

  const wheelchairSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <defs>
        <radialGradient id="omapedBodyGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#42a5f5"/>
          <stop offset="100%" style="stop-color:#1976d2"/>
        </radialGradient>
        <radialGradient id="omapedHeadGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffecd2"/>
          <stop offset="100%" style="stop-color:#e8c9a0"/>
        </radialGradient>
        <radialGradient id="omapedWheelGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#424242"/>
          <stop offset="100%" style="stop-color:#212121"/>
        </radialGradient>
      </defs>

      <!-- Rueda grande trasera -->
      <circle cx="55" cy="75" r="20" fill="url(#omapedWheelGrad)" stroke="#1565c0" stroke-width="2"/>
      <circle cx="55" cy="75" r="15" fill="none" stroke="#64b5f6" stroke-width="2"/>
      <circle cx="55" cy="75" r="5" fill="#64b5f6"/>

      <!-- Radios de la rueda -->
      <line x1="55" y1="55" x2="55" y2="95" stroke="#64b5f6" stroke-width="1.5"/>
      <line x1="35" y1="75" x2="75" y2="75" stroke="#64b5f6" stroke-width="1.5"/>
      <line x1="41" y1="61" x2="69" y2="89" stroke="#64b5f6" stroke-width="1.5"/>
      <line x1="41" y1="89" x2="69" y2="61" stroke="#64b5f6" stroke-width="1.5"/>

      <!-- Rueda pequeña delantera -->
      <circle cx="25" cy="85" r="8" fill="url(#omapedWheelGrad)" stroke="#1565c0" stroke-width="2"/>
      <circle cx="25" cy="85" r="3" fill="#64b5f6"/>

      <!-- Estructura de la silla -->
      <path d="M30 55 L25 80" stroke="#1565c0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M30 55 L55 55 L55 60" stroke="#1565c0" stroke-width="4" fill="none" stroke-linecap="round"/>

      <!-- Asiento -->
      <rect x="28" y="50" width="30" height="8" rx="2" fill="url(#omapedBodyGrad)"/>

      <!-- Respaldo -->
      <rect x="55" y="25" width="6" height="30" rx="2" fill="url(#omapedBodyGrad)"/>

      <!-- Cuerpo de la persona -->
      <path d="M38 45 Q42 35 45 45" fill="url(#omapedBodyGrad)" stroke="#1565c0" stroke-width="1"/>

      <!-- Cabeza -->
      <circle cx="42" cy="25" r="12" fill="url(#omapedHeadGrad)" stroke="#d4a574" stroke-width="1"/>

      <!-- Cabello -->
      <path d="M30 22 Q32 12 42 10 Q52 12 54 22" fill="#5d4037"/>

      <!-- Ojos -->
      <circle cx="38" cy="24" r="2" fill="#5c4033"/>
      <circle cx="46" cy="24" r="2" fill="#5c4033"/>
      <circle cx="37" cy="23" r="1" fill="white"/>
      <circle cx="45" cy="23" r="1" fill="white"/>

      <!-- Sonrisa -->
      <path d="M38 30 Q42 34 46 30" stroke="#8d6e63" stroke-width="1.5" fill="none" stroke-linecap="round"/>

      <!-- Mejillas -->
      <ellipse cx="34" cy="28" rx="3" ry="2" fill="#ffcdd2" opacity="0.6"/>
      <ellipse cx="50" cy="28" rx="3" ry="2" fill="#ffcdd2" opacity="0.6"/>

      <!-- Brazo saludando -->
      <path d="M48 40 Q60 30 65 20" stroke="url(#omapedHeadGrad)" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="65" cy="18" r="5" fill="url(#omapedHeadGrad)"/>

      <!-- Corazón -->
      <path d="M75 30 C75 27 72 25 70 27 C68 25 65 27 65 30 C65 34 70 37 70 37 C70 37 75 34 75 30" fill="#e91e63" opacity="0.9"/>
    </svg>
  `;

  return L.divIcon({
    className: "custom-marker-omaped",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ${isSelected ? "transform: scale(1.15); filter: drop-shadow(0 4px 8px rgba(33, 150, 243, 0.5));" : ""}
    ">
      ${wheelchairSvg}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MAP_CENTER: [number, number] = [-11.9699, -76.998];
const MAP_ZOOM = 13;

function CentrarMapa({ centro }: { centro: CentroOMAPED | null }) {
  const map = useMap();
  useEffect(() => {
    if (centro) {
      map.flyTo([centro.coordenadas.latitud, centro.coordenadas.longitud], 16, { duration: 0.5 });
    }
  }, [centro, map]);
  return null;
}

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

interface SectorProperties { id: number; name: string; numero: number; color: string; }
interface JurisdiccionProperties { id: string; name: string; description: string; color: string; }

export default function MapaOMAPED({
  centros,
  centroSeleccionado,
  onCentroClick,
  limiteVisible,
  filterOpen = false,
  capasVisibles = { sectores: true, jurisdicciones: false, centros: true }
}: MapaOMAPEDProps) {
  const [jurisdiccionesData, setJurisdiccionesData] = useState<FeatureCollection | null>(null);
  const [sectoresData, setSectoresData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/data/jurisdicciones.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => { if (data?.features) setJurisdiccionesData(data); })
      .catch((err) => console.error("Error cargando jurisdicciones:", err));
  }, []);

  useEffect(() => {
    fetch("/data/sectores-pvl.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => { if (data?.features) setSectoresData(data); })
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
      layer.bindTooltip(props.name, { permanent: false, direction: "center" });
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
      layer.bindTooltip(props.name, { permanent: false, direction: "center" });
      const pathLayer = layer as Path;
      layer.on({
        mouseover: () => pathLayer.setStyle({ fillOpacity: 0.6, weight: 3 }),
        mouseout: () => pathLayer.setStyle({ fillOpacity: 0.35, weight: 2 }),
      });
    }
  };

  const centrosMostrados = centros.slice(0, limiteVisible);

  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: "100%", width: "100%" }} minZoom={11} maxZoom={18} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {sectoresData && capasVisibles.sectores && <GeoJSON key="sectores" data={sectoresData} style={estiloSector} onEachFeature={onEachSector} />}
      {jurisdiccionesData && capasVisibles.jurisdicciones && <GeoJSON key="jurisdicciones" data={jurisdiccionesData} style={estiloJurisdiccion} onEachFeature={onEachJurisdiccion} />}
      {capasVisibles.centros && centrosMostrados.map((centro) => (
        <Marker
          key={centro.id}
          position={[centro.coordenadas.latitud, centro.coordenadas.longitud]}
          icon={createCustomIcon(centroSeleccionado?.id === centro.id)}
          eventHandlers={{ click: () => onCentroClick(centro) }}
        >
          <Popup><strong>{centro.nombre}</strong><br />{centro.direccion}</Popup>
        </Marker>
      ))}
      <CentrarMapa centro={centroSeleccionado} />
      <ZoomControlPosition filterOpen={filterOpen} />
    </MapContainer>
  );
}
