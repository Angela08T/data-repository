"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";
import type { LeafletMouseEvent } from "leaflet";

// Importar el mapa dinámicamente sin SSR
const MapaCoordenadas = dynamic(() => import("./MapaCoordenadas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-800">
      <p className="text-white">Cargando mapa...</p>
    </div>
  ),
});

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

// Extraer coordenadas de un feature GeoJSON
function extractCoordinatesFromFeature(feature: Feature): Coordenada[] {
  const geometry = feature.geometry;
  if (!geometry) return [];

  let coords: number[][] = [];

  if (geometry.type === "Polygon") {
    coords = (geometry as Polygon).coordinates[0];
  } else if (geometry.type === "MultiPolygon") {
    coords = (geometry as MultiPolygon).coordinates[0][0];
  }

  const result = coords.map((c) => ({
    lng: parseFloat(c[0].toFixed(6)),
    lat: parseFloat(c[1].toFixed(6)),
  }));

  // GeoJSON cierra el polígono repitiendo el primer punto, lo removemos
  if (result.length > 1) {
    const first = result[0];
    const last = result[result.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      result.pop();
    }
  }

  return result;
}

export default function CoordenadasPage() {
  const [jurisdiccionesData, setJurisdiccionesData] = useState<FeatureCollection | null>(null);
  const [comunasData, setComunasData] = useState<FeatureCollection | null>(null);
  const [coordenadas, setCoordenadas] = useState<Coordenada[]>([]);
  const [comunaSeleccionada, setComunaSeleccionada] = useState<number | null>(null);
  const [mostrarPoligono, setMostrarPoligono] = useState(true);
  const [mostrarJurisdicciones, setMostrarJurisdicciones] = useState(true);
  const [mostrarComunas, setMostrarComunas] = useState(true);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [modoLapiz, setModoLapiz] = useState(false);
  const [nombreNuevaComuna, setNombreNuevaComuna] = useState("");
  const [numeroNuevaComuna, setNumeroNuevaComuna] = useState<number>(1);

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

  // Cargar GeoJSON de comunas
  useEffect(() => {
    fetch("/data/comunas.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        if (!data?.features) {
          console.error("Error: comunas.geojson no tiene features válidas");
          return;
        }
        setComunasData(data);
        // Calcular el siguiente número de comuna disponible
        const maxNumero = data.features.reduce((max, f) => {
          const num = (f.properties as ComunaProperties)?.numero || 0;
          return num > max ? num : max;
        }, 0);
        setNumeroNuevaComuna(maxNumero + 1);
      })
      .catch((err) => console.error("Error cargando comunas:", err));
  }, []);

  // Cargar coordenadas de la comuna seleccionada
  const cargarCoordenadasComuna = useCallback(() => {
    if (!comunasData || !comunaSeleccionada) return;

    const feature = comunasData.features.find(
      (f) => (f.properties as ComunaProperties)?.id === comunaSeleccionada
    );

    if (feature) {
      const coords = extractCoordinatesFromFeature(feature);
      setCoordenadas(coords);
    }
  }, [comunasData, comunaSeleccionada]);

  // Activar modo edición
  const activarModoEdicion = () => {
    if (!comunaSeleccionada) {
      alert("Primero selecciona una comuna para editar");
      return;
    }
    cargarCoordenadasComuna();
    setModoEdicion(true);
  };

  // Desactivar modo edición
  const desactivarModoEdicion = () => {
    setModoEdicion(false);
    setCoordenadas([]);
  };

  // Manejar clic en el mapa (solo en modo creación)
  const handleMapClick = (e: LeafletMouseEvent) => {
    if (modoEdicion) return;
    const { lat, lng } = e.latlng;
    setCoordenadas((prev) => [...prev, { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }]);
  };

  // Agregar punto (usado por modo lápiz)
  const handleAddPoint = (lat: number, lng: number) => {
    setCoordenadas((prev) => [...prev, { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }]);
  };

  // Mover un punto existente
  const handleMovePoint = (index: number, lat: number, lng: number) => {
    setCoordenadas((prev) => {
      const updated = [...prev];
      updated[index] = {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
      };
      return updated;
    });
  };

  // Insertar un punto después de un índice
  const handleInsertPoint = (afterIndex: number, lat: number, lng: number) => {
    setCoordenadas((prev) => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
      });
      return updated;
    });
  };

  // Eliminar un punto
  const handleDeletePoint = (index: number) => {
    if (coordenadas.length <= 3) {
      alert("El polígono debe tener al menos 3 puntos");
      return;
    }
    setCoordenadas((prev) => prev.filter((_, i) => i !== index));
  };

  // Eliminar última coordenada
  const eliminarUltima = () => {
    setCoordenadas((prev) => prev.slice(0, -1));
  };

  // Limpiar todas las coordenadas
  const limpiarCoordenadas = () => {
    setCoordenadas([]);
    if (modoEdicion) {
      setModoEdicion(false);
    }
  };

  // Copiar coordenadas al portapapeles (formato GeoJSON)
  const copiarCoordenadas = () => {
    const formato = coordenadas.map((c) => `[${c.lng}, ${c.lat}]`).join(",\n          ");
    const resultado = `[[\n          ${formato}\n        ]]`;
    navigator.clipboard.writeText(resultado);
    alert("Coordenadas copiadas al portapapeles en formato GeoJSON");
  };

  // Copiar feature completo para agregar al archivo
  const copiarFeatureCompleto = () => {
    if (coordenadas.length < 3) {
      alert("Se necesitan al menos 3 puntos para crear un polígono");
      return;
    }

    const coordsConCierre = [...coordenadas, coordenadas[0]]; // Cerrar el polígono
    const coordsFormato = coordsConCierre.map((c) => `          [${c.lng}, ${c.lat}]`).join(",\n");

    const feature = `{
      "type": "Feature",
      "properties": {
        "id": ${numeroNuevaComuna},
        "name": "${nombreNuevaComuna.toUpperCase() || "NUEVA COMUNA"}",
        "numero": ${numeroNuevaComuna},
        "color": "#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
${coordsFormato}
        ]]
      }
    }`;

    navigator.clipboard.writeText(feature);
    alert("Feature completo copiado. Pégalo en el archivo comunas.geojson dentro del array 'features'");
  };

  // Lista de comunas para el selector
  const listaComunas = comunasData?.features.map((f) => ({
    id: (f.properties as ComunaProperties)?.id,
    name: (f.properties as ComunaProperties)?.name,
    numero: (f.properties as ComunaProperties)?.numero,
  })) || [];

  return (
    <div className="flex h-screen">
      {/* Panel lateral */}
      <div className="w-96 bg-gray-900 text-white p-4 overflow-y-auto">
        <h1 className="text-xl font-bold mb-4">Editor de Comunas</h1>

        {/* Controles de capas */}
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <p className="text-sm font-semibold mb-2">Capas visibles:</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarJurisdicciones}
                onChange={(e) => setMostrarJurisdicciones(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Jurisdicciones (referencia)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarComunas}
                onChange={(e) => setMostrarComunas(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Comunas existentes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarPoligono}
                onChange={(e) => setMostrarPoligono(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Polígono en construcción</span>
            </label>
          </div>
        </div>

        {/* Selector de comuna para editar */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Editar comuna existente:</label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
            value={comunaSeleccionada || ""}
            onChange={(e) => {
              const newId = e.target.value ? parseInt(e.target.value) : null;
              setComunaSeleccionada(newId);
              if (modoEdicion) {
                setModoEdicion(false);
                setCoordenadas([]);
              }
            }}
          >
            <option value="">-- Seleccionar comuna --</option>
            {listaComunas.sort((a, b) => (a.numero || 0) - (b.numero || 0)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero}. {c.name}
              </option>
            ))}
          </select>
          {comunaSeleccionada && !modoEdicion && (
            <button
              onClick={activarModoEdicion}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 rounded px-3 py-2 text-sm"
            >
              Cargar para editar
            </button>
          )}
        </div>

        {/* Modo actual */}
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${modoEdicion ? "bg-blue-500" : "bg-purple-500"}`}></span>
            <span className="text-sm font-semibold">
              {modoEdicion ? "Modo: Editando comuna existente" : "Modo: Creando nueva comuna"}
            </span>
          </div>
          {modoEdicion ? (
            <p className="text-xs text-gray-400">
              Arrastra puntos para mover, clic en puntos blancos para insertar, clic derecho para eliminar
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              {modoLapiz
                ? "Mantén presionado el mouse y arrastra para dibujar el contorno"
                : "Haz clic en el mapa para agregar puntos uno por uno"
              }
            </p>
          )}
        </div>

        {/* Toggle modo lápiz */}
        {!modoEdicion && (
          <div className="mb-4 p-3 bg-gray-800 rounded">
            <p className="text-sm font-semibold mb-2">Herramienta de dibujo:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setModoLapiz(false)}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  !modoLapiz
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Puntos (clic)
              </button>
              <button
                onClick={() => setModoLapiz(true)}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  modoLapiz
                    ? "bg-orange-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Lapiz (arrastrar)
              </button>
            </div>
          </div>
        )}

        {/* Datos para nueva comuna */}
        {!modoEdicion && (
          <div className="mb-4 p-3 bg-gray-800 rounded">
            <p className="text-sm font-semibold mb-2">Nueva comuna:</p>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Número"
                value={numeroNuevaComuna}
                onChange={(e) => setNumeroNuevaComuna(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm"
              />
              <input
                type="text"
                placeholder="Nombre de la comuna"
                value={nombreNuevaComuna}
                onChange={(e) => setNombreNuevaComuna(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex gap-2 mb-4">
          {modoEdicion ? (
            <>
              <button
                onClick={cargarCoordenadasComuna}
                className="flex-1 bg-orange-600 hover:bg-orange-700 rounded px-3 py-2 text-sm"
              >
                Restaurar
              </button>
              <button
                onClick={desactivarModoEdicion}
                className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-3 py-2 text-sm"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={eliminarUltima}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 rounded px-3 py-2 text-sm"
                disabled={coordenadas.length === 0}
              >
                Deshacer
              </button>
              <button
                onClick={limpiarCoordenadas}
                className="flex-1 bg-red-600 hover:bg-red-700 rounded px-3 py-2 text-sm"
                disabled={coordenadas.length === 0}
              >
                Limpiar
              </button>
            </>
          )}
        </div>

        {/* Lista de coordenadas */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Coordenadas ({coordenadas.length} puntos):</span>
          </div>
          <div className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto font-mono text-xs">
            {coordenadas.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {modoEdicion
                  ? "Cargando coordenadas..."
                  : "Haz clic en el mapa para dibujar"}
              </p>
            ) : (
              <pre className="whitespace-pre-wrap">
                {"[[\n"}
                {coordenadas.map((c, i) => (
                  <span key={i} className={modoEdicion ? "text-blue-400" : "text-green-400"}>
                    {"  "}[{c.lng}, {c.lat}]{i < coordenadas.length - 1 ? "," : ""}{"\n"}
                  </span>
                ))}
                {"]]"}
              </pre>
            )}
          </div>
        </div>

        {/* Botones de copiar */}
        <div className="space-y-2 mb-4">
          <button
            onClick={copiarCoordenadas}
            className="w-full bg-green-600 hover:bg-green-700 rounded px-3 py-2 text-sm"
            disabled={coordenadas.length < 3}
          >
            Copiar solo coordenadas
          </button>
          {!modoEdicion && (
            <button
              onClick={copiarFeatureCompleto}
              className="w-full bg-indigo-600 hover:bg-indigo-700 rounded px-3 py-2 text-sm"
              disabled={coordenadas.length < 3}
            >
              Copiar Feature completo (para pegar en JSON)
            </button>
          )}
        </div>

        {/* Leyenda */}
        <div className="p-3 bg-gray-800 rounded text-xs">
          <p className="font-semibold mb-2">Leyenda:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 bg-blue-500 opacity-30 border border-blue-500"></span>
              <span>Jurisdicciones (referencia)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 bg-green-500 opacity-40 border border-green-500 border-dashed"></span>
              <span>Comunas existentes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 bg-purple-500 opacity-40 border border-purple-500"></span>
              <span>Polígono en construcción</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Primer punto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>Último punto</span>
            </div>
          </div>
        </div>

        {/* Info jurisdicciones */}
        {jurisdiccionesData && (
          <div className="mt-4 p-3 bg-gray-800 rounded text-xs">
            <p className="font-semibold">Jurisdicciones cargadas: {jurisdiccionesData.features.length}</p>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1">
        <MapaCoordenadas
          jurisdiccionesData={jurisdiccionesData}
          comunasData={comunasData}
          coordenadas={coordenadas}
          comunaSeleccionada={comunaSeleccionada}
          mostrarPoligono={mostrarPoligono}
          mostrarJurisdicciones={mostrarJurisdicciones}
          mostrarComunas={mostrarComunas}
          modoEdicion={modoEdicion}
          modoLapiz={modoLapiz}
          onMapClick={handleMapClick}
          onComunaClick={setComunaSeleccionada}
          onMovePoint={handleMovePoint}
          onInsertPoint={handleInsertPoint}
          onDeletePoint={handleDeletePoint}
          onAddPoint={handleAddPoint}
        />
      </div>
    </div>
  );
}
