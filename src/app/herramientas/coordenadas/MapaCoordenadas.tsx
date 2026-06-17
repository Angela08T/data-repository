"use client";

import { useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Polygon, useMapEvents, Marker, Polyline } from "react-leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import type { PathOptions, Layer, Path, LeafletMouseEvent, DragEndEvent } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setupLeafletIcons } from "@/lib/utils/mapSetup";

if (typeof window !== "undefined") setupLeafletIcons(L);

// Iconos personalizados para los puntos - más pequeños
const createPointIcon = (color: string, size: number = 8) => {
  return L.divIcon({
    className: "custom-point-icon",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 1px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      cursor: grab;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Icono para puntos intermedios (para agregar nuevos puntos) - creado dinámicamente
const getMidpointIcon = () => L.divIcon({
  className: "midpoint-icon",
  html: `<div style="
    width: 6px;
    height: 6px;
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #666;
    border-radius: 50%;
    cursor: pointer;
  "></div>`,
  iconSize: [6, 6],
  iconAnchor: [3, 3],
});

interface JurisdiccionProperties {
  id?: string;
  name?: string;
  color?: string;
}

interface ComunaProperties {
  id?: number;
  name?: string;
  numero?: number;
  color?: string;
}

interface Coordenada {
  lng: number;
  lat: number;
}

interface MapaCoordenadasProps {
  jurisdiccionesData: FeatureCollection | null;
  comunasData: FeatureCollection | null;
  coordenadas: Coordenada[];
  comunaSeleccionada: number | null;
  mostrarPoligono: boolean;
  mostrarJurisdicciones: boolean;
  mostrarComunas: boolean;
  modoEdicion: boolean;
  modoLapiz: boolean;
  onMapClick: (e: LeafletMouseEvent) => void;
  onComunaClick: (id: number | null) => void;
  onMovePoint: (index: number, lat: number, lng: number) => void;
  onInsertPoint: (afterIndex: number, lat: number, lng: number) => void;
  onDeletePoint: (index: number) => void;
  onAddPoint: (lat: number, lng: number) => void;
}

const MAP_CENTER: [number, number] = [-11.9699, -76.998];
const MAP_ZOOM = 14;
const MAX_ZOOM = 22; // Zoom máximo para precisión

// Componente para capturar clics y dibujo con lápiz
function ClickCapture({
  onMapClick,
  enabled,
  modoLapiz,
  onAddPoint
}: {
  onMapClick: (e: LeafletMouseEvent) => void;
  enabled: boolean;
  modoLapiz: boolean;
  onAddPoint: (lat: number, lng: number) => void;
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const MIN_DISTANCE = 0.00015; // Distancia mínima entre puntos para evitar demasiados

  useMapEvents({
    click: (e) => {
      if (enabled && !modoLapiz) {
        onMapClick(e);
      }
    },
    mousedown: (e) => {
      if (enabled && modoLapiz) {
        setIsDrawing(true);
        const { lat, lng } = e.latlng;
        onAddPoint(lat, lng);
        lastPointRef.current = { lat, lng };
      }
    },
    mousemove: (e) => {
      if (enabled && modoLapiz && isDrawing) {
        const { lat, lng } = e.latlng;
        // Solo agregar punto si hay suficiente distancia del último
        if (lastPointRef.current) {
          const dist = Math.sqrt(
            Math.pow(lat - lastPointRef.current.lat, 2) +
            Math.pow(lng - lastPointRef.current.lng, 2)
          );
          if (dist >= MIN_DISTANCE) {
            onAddPoint(lat, lng);
            lastPointRef.current = { lat, lng };
          }
        }
      }
    },
    mouseup: () => {
      if (modoLapiz) {
        setIsDrawing(false);
        lastPointRef.current = null;
      }
    },
  });
  return null;
}

// Componente para marcador arrastrable
function DraggablePoint({
  position,
  index,
  total,
  onDragEnd,
  onDelete,
}: {
  position: [number, number];
  index: number;
  total: number;
  onDragEnd: (index: number, lat: number, lng: number) => void;
  onDelete: (index: number) => void;
}) {
  const color = index === 0 ? "#00ff00" : index === total - 1 ? "#ff0000" : "#ffff00";

  return (
    <Marker
      position={position}
      icon={createPointIcon(color, 10)}
      draggable={true}
      eventHandlers={{
        dragend: (e: DragEndEvent) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onDragEnd(index, pos.lat, pos.lng);
        },
        contextmenu: (e) => {
          e.originalEvent.preventDefault();
          if (total > 3) {
            onDelete(index);
          }
        },
      }}
    />
  );
}

// Componente para punto intermedio (para insertar nuevos puntos)
function MidPoint({
  position,
  afterIndex,
  onInsert,
}: {
  position: [number, number];
  afterIndex: number;
  onInsert: (afterIndex: number, lat: number, lng: number) => void;
}) {
  return (
    <Marker
      position={position}
      icon={getMidpointIcon()}
      eventHandlers={{
        click: () => {
          onInsert(afterIndex, position[0], position[1]);
        },
      }}
    />
  );
}

export default function MapaCoordenadas({
  jurisdiccionesData,
  comunasData,
  coordenadas,
  comunaSeleccionada,
  mostrarPoligono,
  mostrarJurisdicciones,
  mostrarComunas,
  modoEdicion,
  modoLapiz,
  onMapClick,
  onComunaClick,
  onMovePoint,
  onInsertPoint,
  onDeletePoint,
  onAddPoint,
}: MapaCoordenadasProps) {

  // Estilo para las jurisdicciones (capa base de referencia)
  const estiloJurisdicciones = (feature: Feature<Geometry, JurisdiccionProperties> | undefined): PathOptions => ({
    color: feature?.properties?.color || "#3388ff",
    weight: 2,
    fillOpacity: 0.15,
    opacity: 0.8,
    interactive: false, // No interactivo, solo referencia visual
  });

  // Popup para cada jurisdicción
  const onEachJurisdiccion = (feature: Feature<Geometry, JurisdiccionProperties>, layer: Layer) => {
    const nombre = feature.properties?.name || "Jurisdicción";
    if ("bindTooltip" in layer) {
      (layer as Path).bindTooltip(nombre, { permanent: false, direction: "center" });
    }
  };

  // Estilo para las comunas
  const estiloComunas = (feature: Feature<Geometry, ComunaProperties> | undefined): PathOptions => ({
    color: feature?.properties?.id === comunaSeleccionada
      ? "#ff0000"
      : feature?.properties?.color || "#34b429",
    weight: feature?.properties?.id === comunaSeleccionada ? 4 : 3,
    fillOpacity: feature?.properties?.id === comunaSeleccionada ? 0.4 : 0.25,
    dashArray: feature?.properties?.id === comunaSeleccionada ? undefined : "5, 5",
    interactive: true,
  });

  // Popup para cada comuna
  const onEachComuna = (feature: Feature<Geometry, ComunaProperties>, layer: Layer) => {
    const nombre = feature.properties?.name || "Comuna";
    const numero = feature.properties?.numero || "";
    if ("bindPopup" in layer) {
      (layer as Path).bindPopup(`<b>Comuna ${numero}: ${nombre}</b>`);
    }
    layer.on({
      click: () => {
        onComunaClick(feature.properties?.id || null);
      }
    });
  };

  // Calcular puntos intermedios para inserción
  const getMidpoints = (): { position: [number, number]; afterIndex: number }[] => {
    if (coordenadas.length < 2) return [];
    const midpoints: { position: [number, number]; afterIndex: number }[] = [];

    for (let i = 0; i < coordenadas.length; i++) {
      const current = coordenadas[i];
      const next = coordenadas[(i + 1) % coordenadas.length];
      const midLat = (current.lat + next.lat) / 2;
      const midLng = (current.lng + next.lng) / 2;
      midpoints.push({
        position: [midLat, midLng],
        afterIndex: i,
      });
    }
    return midpoints;
  };

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      style={{ height: "100%", width: "100%" }}
      minZoom={11}
      maxZoom={MAX_ZOOM}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Capa 1: Jurisdicciones como referencia (fondo) */}
      {mostrarJurisdicciones && jurisdiccionesData && (
        <GeoJSON
          key="jurisdicciones"
          data={jurisdiccionesData}
          style={estiloJurisdicciones as (feature?: Feature) => PathOptions}
          onEachFeature={onEachJurisdiccion as (feature: Feature, layer: Layer) => void}
        />
      )}

      {/* Capa 2: Comunas existentes */}
      {mostrarComunas && comunasData && (
        <GeoJSON
          key={`comunas-${comunaSeleccionada}`}
          data={comunasData}
          style={estiloComunas as (feature?: Feature) => PathOptions}
          onEachFeature={onEachComuna as (feature: Feature, layer: Layer) => void}
        />
      )}

      {/* Polígono en construcción/edición */}
      {mostrarPoligono && coordenadas.length >= 3 && (
        <Polygon
          positions={coordenadas.map((c) => [c.lat, c.lng])}
          pathOptions={{
            color: modoEdicion ? "#00aaff" : "#ff00ff",
            weight: 3,
            fillOpacity: 0.3,
            dashArray: modoEdicion ? undefined : "5, 10",
          }}
        />
      )}

      {/* Líneas cuando hay menos de 3 puntos */}
      {mostrarPoligono && coordenadas.length >= 2 && coordenadas.length < 3 && (
        <Polyline
          positions={coordenadas.map((c) => [c.lat, c.lng])}
          pathOptions={{
            color: modoEdicion ? "#00aaff" : "#ff00ff",
            weight: 3,
            dashArray: "5, 10",
          }}
        />
      )}

      {/* Marcadores arrastrables para modo edición */}
      {modoEdicion && coordenadas.map((c, i) => (
        <DraggablePoint
          key={`point-${i}`}
          position={[c.lat, c.lng]}
          index={i}
          total={coordenadas.length}
          onDragEnd={onMovePoint}
          onDelete={onDeletePoint}
        />
      ))}

      {/* Puntos intermedios para insertar nuevos puntos (solo en modo edición) */}
      {modoEdicion && coordenadas.length >= 2 && getMidpoints().map((mp, i) => (
        <MidPoint
          key={`mid-${i}`}
          position={mp.position}
          afterIndex={mp.afterIndex}
          onInsert={onInsertPoint}
        />
      ))}

      {/* Marcadores simples para modo creación - puntos pequeños y transparentes */}
      {!modoEdicion && coordenadas.map((c, i) => (
        <Polygon
          key={i}
          positions={[[c.lat - 0.00006, c.lng - 0.00006], [c.lat - 0.00006, c.lng + 0.00006], [c.lat + 0.00006, c.lng + 0.00006], [c.lat + 0.00006, c.lng - 0.00006]]}
          pathOptions={{
            color: i === 0 ? "#00ff00" : i === coordenadas.length - 1 ? "#ff0000" : "#ffff00",
            weight: 1,
            fillOpacity: 0.4,
            opacity: 0.6,
          }}
        />
      ))}

      <ClickCapture onMapClick={onMapClick} enabled={!modoEdicion} modoLapiz={modoLapiz} onAddPoint={onAddPoint} />
    </MapContainer>
  );
}
