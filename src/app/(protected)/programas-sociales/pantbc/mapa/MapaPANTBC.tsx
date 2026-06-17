"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { PathOptions, Layer, Path } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setupLeafletIcons } from "@/lib/utils/mapSetup";

if (typeof window !== "undefined") setupLeafletIcons(L);

export interface EstablecimientoPANTBC {
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
  canastasEntregadas: number;
  responsable: {
    nombre: string;
    telefono: string;
  };
  estado: "activo" | "inactivo";
}

interface CapasVisibles {
  sectores: boolean;
  jurisdicciones: boolean;
  establecimientos: boolean;
}

interface MapaPANTBCProps {
  establecimientos: EstablecimientoPANTBC[];
  establecimientoSeleccionado: EstablecimientoPANTBC | null;
  onEstablecimientoClick: (establecimiento: EstablecimientoPANTBC) => void;
  limiteVisible: number;
  filterOpen?: boolean;
  capasVisibles?: CapasVisibles;
}

// Icono personalizado - Corazón/Salud (rojo)
const createCustomIcon = (isSelected: boolean) => {
  const size = isSelected ? 42 : 34;

  const healthSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <defs>
        <radialGradient id="pantbcHeartGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ef5350"/>
          <stop offset="100%" style="stop-color:#c62828"/>
        </radialGradient>
        <radialGradient id="pantbcCrossGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffffff"/>
          <stop offset="100%" style="stop-color:#f5f5f5"/>
        </radialGradient>
        <linearGradient id="pantbcShineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,0.6)"/>
          <stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
        </linearGradient>
      </defs>

      <!-- Sombra del corazón -->
      <path d="M50 90 C50 90 15 60 15 38 C15 20 30 10 50 25 C70 10 85 20 85 38 C85 60 50 90 50 90" fill="rgba(0,0,0,0.2)" transform="translate(2, 3)"/>

      <!-- Corazón principal -->
      <path d="M50 88 C50 88 12 58 12 35 C12 15 28 5 50 22 C72 5 88 15 88 35 C88 58 50 88 50 88" fill="url(#pantbcHeartGrad)" stroke="#b71c1c" stroke-width="2"/>

      <!-- Brillo del corazón -->
      <path d="M30 30 Q35 20 45 25 Q50 28 48 35" fill="url(#pantbcShineGrad)" opacity="0.7"/>

      <!-- Cruz médica en el centro -->
      <rect x="42" y="30" width="16" height="40" rx="3" fill="url(#pantbcCrossGrad)"/>
      <rect x="30" y="42" width="40" height="16" rx="3" fill="url(#pantbcCrossGrad)"/>

      <!-- Borde de la cruz -->
      <rect x="42" y="30" width="16" height="40" rx="3" fill="none" stroke="#c62828" stroke-width="1" opacity="0.5"/>
      <rect x="30" y="42" width="40" height="16" rx="3" fill="none" stroke="#c62828" stroke-width="1" opacity="0.5"/>

      <!-- Latido/pulso -->
      <path d="M20 50 L30 50 L35 35 L40 65 L45 45 L50 55 L55 50 L80 50" stroke="#ffcdd2" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>

      <!-- Pequeño corazón decorativo -->
      <path d="M78 20 C78 18 76 16 74 17 C72 16 70 18 70 20 C70 23 74 26 74 26 C74 26 78 23 78 20" fill="#ffcdd2"/>
    </svg>
  `;

  return L.divIcon({
    className: "custom-marker-pantbc",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ${isSelected ? "transform: scale(1.15); filter: drop-shadow(0 4px 8px rgba(244, 67, 54, 0.5));" : ""}
    ">
      ${healthSvg}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MAP_CENTER: [number, number] = [-11.9699, -76.998];
const MAP_ZOOM = 13;

function CentrarMapa({ establecimiento }: { establecimiento: EstablecimientoPANTBC | null }) {
  const map = useMap();
  useEffect(() => {
    if (establecimiento) {
      map.flyTo([establecimiento.coordenadas.latitud, establecimiento.coordenadas.longitud], 16, { duration: 0.5 });
    }
  }, [establecimiento, map]);
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

export default function MapaPANTBC({
  establecimientos,
  establecimientoSeleccionado,
  onEstablecimientoClick,
  limiteVisible,
  filterOpen = false,
  capasVisibles = { sectores: true, jurisdicciones: false, establecimientos: true }
}: MapaPANTBCProps) {
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

  const establecimientosMostrados = establecimientos.slice(0, limiteVisible);

  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: "100%", width: "100%" }} minZoom={11} maxZoom={18} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {sectoresData && capasVisibles.sectores && <GeoJSON key="sectores" data={sectoresData} style={estiloSector} onEachFeature={onEachSector} />}
      {jurisdiccionesData && capasVisibles.jurisdicciones && <GeoJSON key="jurisdicciones" data={jurisdiccionesData} style={estiloJurisdiccion} onEachFeature={onEachJurisdiccion} />}
      {capasVisibles.establecimientos && establecimientosMostrados.map((establecimiento) => (
        <Marker
          key={establecimiento.id}
          position={[establecimiento.coordenadas.latitud, establecimiento.coordenadas.longitud]}
          icon={createCustomIcon(establecimientoSeleccionado?.id === establecimiento.id)}
          eventHandlers={{ click: () => onEstablecimientoClick(establecimiento) }}
        >
          <Popup><strong>{establecimiento.nombre}</strong><br />{establecimiento.direccion}</Popup>
        </Marker>
      ))}
      <CentrarMapa establecimiento={establecimientoSeleccionado} />
      <ZoomControlPosition filterOpen={filterOpen} />
    </MapContainer>
  );
}
