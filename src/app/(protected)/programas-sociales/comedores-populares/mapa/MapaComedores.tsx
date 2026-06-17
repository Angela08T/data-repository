"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { PathOptions, Layer, Path } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setupLeafletIcons } from "@/lib/utils/mapSetup";

if (typeof window !== "undefined") setupLeafletIcons(L);

// Tipo para los comedores populares (datos del backend)
export interface Comedor {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  socios: number;
  sociosHombres: number;
  sociosMujeres: number;
  situacion: string;
  presidenta: {
    nombre: string;
    dni: string;
    celular: string;
    fechaNacimiento?: string;
    sexo?: "MALE" | "FEMALE";
  };
  resolucion: string;
  vigencia?: {
    inicio: string;
    fin: string;
  };
  comuna?: number;
}

interface CapasVisibles {
  sectores: boolean;
  jurisdicciones: boolean;
  comedores: boolean;
}

interface MapaComedoresProps {
  comedores: Comedor[];
  comedorSeleccionado: Comedor | null;
  onComedorClick: (comedor: Comedor) => void;
  limiteVisible: number;
  filterOpen?: boolean;
  capasVisibles?: CapasVisibles;
}

// Icono personalizado - Plato con cubiertos estilo cute (azul/celeste)
const createCustomIcon = (isSelected: boolean) => {
  const size = isSelected ? 42 : 34;

  const platoSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <defs>
        <radialGradient id="plateGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#7dd3fc"/>
          <stop offset="100%" style="stop-color:#0ea5e9"/>
        </radialGradient>
        <radialGradient id="plateInnerGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#e0f2fe"/>
          <stop offset="100%" style="stop-color:#bae6fd"/>
        </radialGradient>
        <linearGradient id="utensilGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#94a3b8"/>
          <stop offset="100%" style="stop-color:#cbd5e1"/>
        </linearGradient>
        <linearGradient id="foodComedorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#fcd34d"/>
          <stop offset="100%" style="stop-color:#f59e0b"/>
        </linearGradient>
      </defs>

      <!-- Vapor/steam -->
      <path d="M40 18 Q37 12 40 6 Q43 0 40 -6" stroke="#e5e5e5" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
      <path d="M50 15 Q47 8 50 2 Q53 -4 50 -10" stroke="#e5e5e5" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85"/>
      <path d="M60 18 Q63 12 60 6 Q57 0 60 -6" stroke="#e5e5e5" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>

      <!-- Tenedor (izquierda) -->
      <rect x="8" y="25" width="3" height="50" rx="1.5" fill="url(#utensilGrad)" stroke="#64748b" stroke-width="1"/>
      <rect x="5" y="25" width="2" height="18" rx="1" fill="url(#utensilGrad)" stroke="#64748b" stroke-width="0.5"/>
      <rect x="9" y="25" width="2" height="18" rx="1" fill="url(#utensilGrad)" stroke="#64748b" stroke-width="0.5"/>
      <rect x="13" y="25" width="2" height="18" rx="1" fill="url(#utensilGrad)" stroke="#64748b" stroke-width="0.5"/>

      <!-- Cuchara (derecha) -->
      <rect x="89" y="45" width="3" height="30" rx="1.5" fill="url(#utensilGrad)" stroke="#64748b" stroke-width="1"/>
      <ellipse cx="90.5" cy="32" rx="6" ry="14" fill="url(#utensilGrad)" stroke="#64748b" stroke-width="1"/>
      <ellipse cx="90.5" cy="32" rx="3.5" ry="10" fill="#f1f5f9"/>

      <!-- Plato exterior -->
      <ellipse cx="50" cy="60" rx="38" ry="18" fill="url(#plateGrad)" stroke="#0284c7" stroke-width="2"/>

      <!-- Plato interior (donde va la comida) -->
      <ellipse cx="50" cy="55" rx="28" ry="12" fill="url(#plateInnerGrad)" stroke="#7dd3fc" stroke-width="1"/>

      <!-- Comida en el plato -->
      <ellipse cx="50" cy="52" rx="22" ry="8" fill="url(#foodComedorGrad)"/>

      <!-- Decoración de comida (arroz, vegetales) -->
      <circle cx="42" cy="50" r="3.5" fill="#ffffff" opacity="0.9"/>
      <circle cx="48" cy="52" r="3" fill="#ffffff" opacity="0.9"/>
      <circle cx="55" cy="50" r="3.5" fill="#ffffff" opacity="0.9"/>
      <circle cx="38" cy="53" r="2.5" fill="#22c55e"/>
      <circle cx="58" cy="54" r="3" fill="#ef4444"/>
      <circle cx="50" cy="55" r="2" fill="#22c55e"/>
      <circle cx="62" cy="51" r="2.5" fill="#fbbf24"/>

      <!-- Brillo en el plato -->
      <path d="M25 55 Q30 50 35 55" stroke="rgba(255,255,255,0.6)" stroke-width="2" fill="none" stroke-linecap="round"/>

      <!-- Corazón pequeño -->
      <path d="M75 30 C75 27 72 25 70 27 C68 25 65 27 65 30 C65 34 70 37 70 37 C70 37 75 34 75 30" fill="#ef4444" opacity="0.95"/>
    </svg>
  `;

  return L.divIcon({
    className: "custom-marker-comedores",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ${isSelected ? "transform: scale(1.15); filter: drop-shadow(0 4px 8px rgba(14, 165, 233, 0.5));" : ""}
    ">
      ${platoSvg}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MAP_CENTER: [number, number] = [-11.9699, -76.998];
const MAP_ZOOM = 13;

// Componente para centrar el mapa en un comedor seleccionado
function CentrarMapa({ comedor }: { comedor: Comedor | null }) {
  const map = useMap();

  useEffect(() => {
    if (comedor) {
      map.flyTo([comedor.coordenadas.latitud, comedor.coordenadas.longitud], 16, {
        duration: 0.5,
      });
    }
  }, [comedor, map]);

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

export default function MapaComedores({
  comedores,
  comedorSeleccionado,
  onComedorClick,
  limiteVisible,
  filterOpen = false,
  capasVisibles = { sectores: true, jurisdicciones: false, comedores: true }
}: MapaComedoresProps) {
  const [jurisdiccionesData, setJurisdiccionesData] = useState<FeatureCollection | null>(null);
  const [sectoresData, setSectoresData] = useState<FeatureCollection | null>(null);

  // Cargar GeoJSON de jurisdicciones
  useEffect(() => {
    fetch("/data/jurisdicciones.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        if (data?.features) {
          setJurisdiccionesData(data);
        }
      })
      .catch((err) => console.error("Error cargando jurisdicciones:", err));
  }, []);

  // Cargar GeoJSON de sectores
  useEffect(() => {
    fetch("/data/sectores-pvl.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        if (data?.features) {
          setSectoresData(data);
        }
      })
      .catch((err) => console.error("Error cargando sectores:", err));
  }, []);

  // Estilo para las jurisdicciones
  const estiloJurisdiccion = (feature: Feature | undefined): PathOptions => {
    const props = feature?.properties as JurisdiccionProperties | undefined;
    const color = props?.color || "#34b429";
    return {
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.35,
      interactive: true,
    };
  };

  // Función para manejar eventos de cada jurisdicción
  const onEachJurisdiccion = (feature: Feature, layer: Layer) => {
    const props = feature.properties as JurisdiccionProperties;
    if (props?.name) {
      layer.bindTooltip(props.name, {
        permanent: false,
        direction: "center",
        className: "jurisdiccion-tooltip",
      });

      const pathLayer = layer as Path;
      layer.on({
        mouseover: () => {
          pathLayer.setStyle({
            fillOpacity: 0.6,
            weight: 3,
          });
        },
        mouseout: () => {
          pathLayer.setStyle({
            fillOpacity: 0.35,
            weight: 2,
          });
        },
      });
    }
  };

  // Estilo para cada sector
  const estiloSector = (feature: Feature | undefined): PathOptions => {
    const props = feature?.properties as SectorProperties | undefined;
    const color = props?.color || "#888888";
    return {
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.35,
      interactive: true,
    };
  };

  // Función para manejar eventos de cada sector
  const onEachSector = (feature: Feature, layer: Layer) => {
    const props = feature.properties as SectorProperties;
    if (props?.name) {
      layer.bindTooltip(props.name, {
        permanent: false,
        direction: "center",
        className: "sector-tooltip",
      });

      const pathLayer = layer as Path;
      layer.on({
        mouseover: () => {
          pathLayer.setStyle({
            fillOpacity: 0.6,
            weight: 3,
          });
        },
        mouseout: () => {
          pathLayer.setStyle({
            fillOpacity: 0.35,
            weight: 2,
          });
        },
      });
    }
  };

  // Limitar los comedores mostrados
  const comedoresMostrados = comedores.slice(0, limiteVisible);

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      style={{ height: "100%", width: "100%" }}
      minZoom={11}
      maxZoom={18}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Sectores/Comunas */}
      {sectoresData && capasVisibles.sectores && (
        <GeoJSON
          key="sectores"
          data={sectoresData}
          style={estiloSector}
          onEachFeature={onEachSector}
        />
      )}

      {/* Jurisdicciones */}
      {jurisdiccionesData && capasVisibles.jurisdicciones && (
        <GeoJSON
          key="jurisdicciones"
          data={jurisdiccionesData}
          style={estiloJurisdiccion}
          onEachFeature={onEachJurisdiccion}
        />
      )}

      {/* Marcadores de comedores */}
      {capasVisibles.comedores && comedoresMostrados.map((comedor) => (
        <Marker
          key={comedor.id}
          position={[comedor.coordenadas.latitud, comedor.coordenadas.longitud]}
          icon={createCustomIcon(comedorSeleccionado?.id === comedor.id)}
          eventHandlers={{
            click: () => onComedorClick(comedor),
          }}
        >
          <Popup>
            <strong>{comedor.nombre}</strong>
            <br />
            <span style={{ fontSize: '11px', color: '#666' }}>{comedor.codigo}</span>
            <br />
            {comedor.direccion}
          </Popup>
        </Marker>
      ))}

      {/* Centrar en comedor seleccionado */}
      <CentrarMapa comedor={comedorSeleccionado} />

      {/* Controlar posición del zoom */}
      <ZoomControlPosition filterOpen={filterOpen} />
    </MapContainer>
  );
}
