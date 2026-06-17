"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import type { PathOptions, Layer, Path } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setupLeafletIcons } from "@/lib/utils/mapSetup";

if (typeof window !== "undefined") setupLeafletIcons(L);

// Tipo para los comités
export interface Comite {
  id: string;
  codigo: string;
  ruta: string;
  centroAcopio: string;
  comite: string;
  pueblo: string;
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  inspector: string;
  beneficiarios: number;
  socios: number;
  comuna: number;
  coordinadora: {
    nombre: string;
    dni: string;
    celular: string;
    fechaNacimiento?: string;
  };
  beneficiariosExtranjeros: number;
  discapacitados: number;
  direccion: string;
  observacion: string | null;
}

interface CapasVisibles {
  sectores: boolean;
  jurisdicciones: boolean;
  comites: boolean;
}

interface MapaPVLProps {
  comites: Comite[];
  comiteSeleccionado: Comite | null;
  onComiteClick: (comite: Comite) => void;
  limiteVisible: number;
  filterOpen?: boolean;
  capasVisibles?: CapasVisibles;
}

// Icono personalizado para los marcadores - Vaquita estilo 3D cartoon
const createCustomIcon = (isSelected: boolean) => {
  const size = isSelected ? 38 : 30;

  // SVG de vaquita estilo 3D cute similar a la imagen de referencia
  const cowSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <defs>
        <!-- Gradientes para efecto 3D -->
        <radialGradient id="faceGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffffff"/>
          <stop offset="100%" style="stop-color:#e8e8e8"/>
        </radialGradient>
        <radialGradient id="snoutGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffd4cc"/>
          <stop offset="100%" style="stop-color:#f5b5a8"/>
        </radialGradient>
        <radialGradient id="earGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffb8b0"/>
          <stop offset="100%" style="stop-color:#e89990"/>
        </radialGradient>
        <radialGradient id="hornGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#4a4a4a"/>
          <stop offset="100%" style="stop-color:#1a1a1a"/>
        </radialGradient>
        <radialGradient id="spotGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" style="stop-color:#3d3d3d"/>
          <stop offset="100%" style="stop-color:#1a1a1a"/>
        </radialGradient>
      </defs>

      <!-- Orejas (detrás) -->
      <ellipse cx="18" cy="38" rx="14" ry="10" fill="#2a2a2a" transform="rotate(-25 18 38)"/>
      <ellipse cx="18" cy="38" rx="10" ry="7" fill="url(#earGrad)" transform="rotate(-25 18 38)"/>
      <ellipse cx="82" cy="38" rx="14" ry="10" fill="#2a2a2a" transform="rotate(25 82 38)"/>
      <ellipse cx="82" cy="38" rx="10" ry="7" fill="url(#earGrad)" transform="rotate(25 82 38)"/>

      <!-- Cuernos -->
      <ellipse cx="28" cy="18" rx="6" ry="10" fill="url(#hornGrad)" transform="rotate(-15 28 18)"/>
      <ellipse cx="72" cy="18" rx="6" ry="10" fill="url(#hornGrad)" transform="rotate(15 72 18)"/>

      <!-- Cabeza principal (forma de huevo) -->
      <ellipse cx="50" cy="52" rx="38" ry="42" fill="url(#faceGrad)"/>

      <!-- Mancha negra grande lado derecho -->
      <path d="M55 25 Q80 30 78 55 Q75 70 60 65 Q50 55 55 35 Z" fill="url(#spotGrad)"/>

      <!-- Mancha pequeña lado izquierdo -->
      <ellipse cx="32" cy="40" rx="8" ry="10" fill="url(#spotGrad)" transform="rotate(-10 32 40)"/>

      <!-- Hocico/nariz grande rosado -->
      <ellipse cx="50" cy="72" rx="22" ry="16" fill="url(#snoutGrad)"/>

      <!-- Fosas nasales -->
      <ellipse cx="42" cy="72" rx="4" ry="5" fill="#4a4a4a"/>
      <ellipse cx="58" cy="72" rx="4" ry="5" fill="#4a4a4a"/>

      <!-- Boca sonriente -->
      <path d="M42 82 Q50 88 58 82" stroke="#4a4a4a" stroke-width="2.5" fill="none" stroke-linecap="round"/>

      <!-- Lengua -->
      <ellipse cx="50" cy="86" rx="4" ry="3" fill="#e85050"/>

      <!-- Ojos - fondo blanco -->
      <ellipse cx="35" cy="48" rx="10" ry="11" fill="white"/>
      <ellipse cx="65" cy="48" rx="10" ry="11" fill="white"/>

      <!-- Ojos - iris marrón -->
      <circle cx="36" cy="50" r="6" fill="#5c4033"/>
      <circle cx="64" cy="50" r="6" fill="#5c4033"/>

      <!-- Ojos - pupila -->
      <circle cx="37" cy="51" r="3.5" fill="#1a1a1a"/>
      <circle cx="63" cy="51" r="3.5" fill="#1a1a1a"/>

      <!-- Ojos - brillo -->
      <circle cx="34" cy="47" r="2.5" fill="white"/>
      <circle cx="62" cy="47" r="2.5" fill="white"/>
      <circle cx="38" cy="52" r="1.2" fill="white"/>
      <circle cx="64" cy="52" r="1.2" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    className: "custom-marker-pvl",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ${isSelected ? "transform: scale(1.1); filter: drop-shadow(0 4px 8px rgba(216, 27, 126, 0.5));" : ""}
    ">
      ${cowSvg}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MAP_CENTER: [number, number] = [-11.9699, -76.998];
const MAP_ZOOM = 13;

// Lista de comunas para la leyenda
const COMUNAS_LEYENDA = [
  { name: "ZARATE", color: "#9f004c" },
  { name: "CAMPOY", color: "#52f9eb" },
  { name: "MANGOMARCA", color: "#54cdd3" },
  { name: "SALSAS", color: "#6119f9" },
  { name: "HUAYRONA", color: "#d16567" },
  { name: "CANTO REY", color: "#ac9da9" },
  { name: "HUANCARAY", color: "#ecc20f" },
  { name: "MARISCAL CACERES", color: "#72427c" },
  { name: "MOTUPE", color: "#eb147c" },
  { name: "JICAMARCA", color: "#db63b2" },
  { name: "MARIATEGUI", color: "#d6a59c"},
  { name: "CASA BLANCA", color: "#fdd15d"},
  { name: "BAYOVAR", color: "#5c335d" },
  { name: "HUASCAR", color: "#efaeac" },
  { name: "CANTO GRANDE", color: "#8768c9" },
  { name: "SAN HILARION", color: "#73165f" },
  { name: "LAS FLORES", color: "#ab83cf"},
  { name: "CAJA DE AGUA", color: "#72cfdf" },
  
];

// Componente para centrar el mapa en un comité seleccionado
function CentrarMapa({ comite }: { comite: Comite | null }) {
  const map = useMap();

  useEffect(() => {
    if (comite) {
      map.flyTo([comite.coordenadas.latitud, comite.coordenadas.longitud], 16, {
        duration: 0.5,
      });
    }
  }, [comite, map]);

  return null;
}

// Componente para ajustar posición de controles de zoom
function ZoomControlPosition({ filterOpen }: { filterOpen: boolean }) {
  const map = useMap();

  useEffect(() => {
    // Mover el control de zoom al lado derecho
    const zoomControl = document.querySelector(".leaflet-control-zoom");
    if (zoomControl) {
      const parent = zoomControl.parentElement;
      if (parent) {
        // Mover al contenedor de la derecha
        const rightContainer = document.querySelector(".leaflet-right.leaflet-top");
        if (rightContainer && !rightContainer.contains(zoomControl)) {
          rightContainer.appendChild(zoomControl);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Ajustar posición cuando se abre/cierra el filtro
    const zoomControl = document.querySelector(".leaflet-control-zoom") as HTMLElement;
    if (zoomControl) {
      zoomControl.style.transition = "margin-right 0.3s ease";
      zoomControl.style.marginRight = filterOpen ? "330px" : "10px";
    }
  }, [filterOpen]);

  return null;
}

// Interfaz para las propiedades del sector
interface SectorProperties {
  id: number;
  name: string;
  numero: number;
  color: string;
}

// Interfaz para las propiedades de jurisdicción
interface JurisdiccionProperties {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function MapaPVL({
  comites,
  comiteSeleccionado,
  onComiteClick,
  limiteVisible,
  filterOpen = false,
  capasVisibles = { sectores: true, jurisdicciones: true, comites: true }
}: MapaPVLProps) {
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

  // Cargar GeoJSON de sectores/comunas
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

  // Estilo para las jurisdicciones basado en su color definido
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

      // Efecto hover
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

  // Estilo para cada sector basado en su color definido
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

      // Efecto hover
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

  // Limitar los comités mostrados
  const comitesMostrados = comites.slice(0, limiteVisible);

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

      {/* Sectores/Comunas con colores */}
      {sectoresData && capasVisibles.sectores && (
        <GeoJSON
          key="sectores"
          data={sectoresData}
          style={estiloSector}
          onEachFeature={onEachSector}
        />
      )}

      {/* Jurisdicciones (límite exterior) */}
      {jurisdiccionesData && capasVisibles.jurisdicciones && (
        <GeoJSON
          key="jurisdicciones"
          data={jurisdiccionesData}
          style={estiloJurisdiccion}
          onEachFeature={onEachJurisdiccion}
        />
      )}

      {/* Marcadores de comités */}
      {capasVisibles.comites && comitesMostrados.map((comite) => (
        <Marker
          key={comite.id}
          position={[comite.coordenadas.latitud, comite.coordenadas.longitud]}
          icon={createCustomIcon(comiteSeleccionado?.id === comite.id)}
          eventHandlers={{
            click: () => onComiteClick(comite),
          }}
        >
          <Popup>
            <strong>{comite.comite}</strong>
            <br />
            {comite.pueblo}
          </Popup>
        </Marker>
      ))}

      {/* Centrar en comité seleccionado */}
      <CentrarMapa comite={comiteSeleccionado} />

      {/* Controlar posición del zoom */}
      <ZoomControlPosition filterOpen={filterOpen} />

      
      {/* aqui iba la tarjeta de las leyendas de los sectores pero se quito */}
    </MapContainer>
  );
}
