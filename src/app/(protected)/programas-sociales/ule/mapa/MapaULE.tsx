"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { PathOptions, Layer, Path } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setupLeafletIcons } from "@/lib/utils/mapSetup";

if (typeof window !== "undefined") setupLeafletIcons(L);

export interface SolicitudULE {
  id: string;
  codigo: string;
  solicitante: string;
  direccion: string;
  jurisdiccion: string;
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  tipoSolicitud: string;
  fechaSolicitud: string;
  contacto: {
    nombre: string;
    telefono: string;
  };
  estado: "pendiente" | "atendido" | "en_proceso";
}

interface CapasVisibles {
  sectores: boolean;
  jurisdicciones: boolean;
  solicitudes: boolean;
}

interface MapaULEProps {
  solicitudes: SolicitudULE[];
  solicitudSeleccionada: SolicitudULE | null;
  onSolicitudClick: (solicitud: SolicitudULE) => void;
  limiteVisible: number;
  filterOpen?: boolean;
  capasVisibles?: CapasVisibles;
}

// Icono personalizado - Documento/Persona (naranja)
const createCustomIcon = (isSelected: boolean) => {
  const size = isSelected ? 42 : 34;

  const documentSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <defs>
        <radialGradient id="uleDocGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffb74d"/>
          <stop offset="100%" style="stop-color:#ff9800"/>
        </radialGradient>
        <radialGradient id="uleHeadGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffecd2"/>
          <stop offset="100%" style="stop-color:#e8c9a0"/>
        </radialGradient>
        <linearGradient id="ulePaperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff"/>
          <stop offset="100%" style="stop-color:#f5f5f5"/>
        </linearGradient>
      </defs>

      <!-- Documento/Papel base -->
      <path d="M25 10 L65 10 L75 20 L75 90 L25 90 Z" fill="url(#ulePaperGrad)" stroke="#e65100" stroke-width="2"/>

      <!-- Esquina doblada -->
      <path d="M65 10 L65 20 L75 20" fill="#ffcc80" stroke="#e65100" stroke-width="1.5"/>

      <!-- Líneas de texto simuladas -->
      <line x1="32" y1="30" x2="68" y2="30" stroke="#bdbdbd" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="40" x2="60" y2="40" stroke="#bdbdbd" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="50" x2="65" y2="50" stroke="#bdbdbd" stroke-width="2" stroke-linecap="round"/>

      <!-- Círculo de perfil persona -->
      <circle cx="50" cy="70" r="15" fill="url(#uleDocGrad)" stroke="#e65100" stroke-width="2"/>

      <!-- Silueta de persona -->
      <circle cx="50" cy="65" r="6" fill="url(#uleHeadGrad)"/>
      <path d="M40 80 Q40 72 50 70 Q60 72 60 80" fill="url(#uleHeadGrad)"/>

      <!-- Check de verificación -->
      <circle cx="70" cy="25" r="10" fill="#4caf50"/>
      <path d="M65 25 L68 28 L75 21" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Sello/Badge naranja -->
      <circle cx="30" cy="75" r="8" fill="url(#uleDocGrad)" stroke="#e65100" stroke-width="1.5"/>
      <text x="30" y="78" text-anchor="middle" fill="white" font-size="8" font-weight="bold">ULE</text>
    </svg>
  `;

  return L.divIcon({
    className: "custom-marker-ule",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ${isSelected ? "transform: scale(1.15); filter: drop-shadow(0 4px 8px rgba(255, 152, 0, 0.5));" : ""}
    ">
      ${documentSvg}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MAP_CENTER: [number, number] = [-11.9699, -76.998];
const MAP_ZOOM = 13;

function CentrarMapa({ solicitud }: { solicitud: SolicitudULE | null }) {
  const map = useMap();
  useEffect(() => {
    if (solicitud) {
      map.flyTo([solicitud.coordenadas.latitud, solicitud.coordenadas.longitud], 16, { duration: 0.5 });
    }
  }, [solicitud, map]);
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

export default function MapaULE({
  solicitudes,
  solicitudSeleccionada,
  onSolicitudClick,
  limiteVisible,
  filterOpen = false,
  capasVisibles = { sectores: true, jurisdicciones: false, solicitudes: true }
}: MapaULEProps) {
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

  const solicitudesMostradas = solicitudes.slice(0, limiteVisible);

  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: "100%", width: "100%" }} minZoom={11} maxZoom={18} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {sectoresData && capasVisibles.sectores && <GeoJSON key="sectores" data={sectoresData} style={estiloSector} onEachFeature={onEachSector} />}
      {jurisdiccionesData && capasVisibles.jurisdicciones && <GeoJSON key="jurisdicciones" data={jurisdiccionesData} style={estiloJurisdiccion} onEachFeature={onEachJurisdiccion} />}
      {capasVisibles.solicitudes && solicitudesMostradas.map((solicitud) => (
        <Marker
          key={solicitud.id}
          position={[solicitud.coordenadas.latitud, solicitud.coordenadas.longitud]}
          icon={createCustomIcon(solicitudSeleccionada?.id === solicitud.id)}
          eventHandlers={{ click: () => onSolicitudClick(solicitud) }}
        >
          <Popup><strong>{solicitud.solicitante}</strong><br />{solicitud.direccion}</Popup>
        </Marker>
      ))}
      <CentrarMapa solicitud={solicitudSeleccionada} />
      <ZoomControlPosition filterOpen={filterOpen} />
    </MapContainer>
  );
}
