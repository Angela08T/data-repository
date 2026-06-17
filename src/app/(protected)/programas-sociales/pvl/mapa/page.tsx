"use client";

import { useState, useEffect,useCallback  } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  IconButton,
  Typography,
  Drawer,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Badge,
  Tooltip,
  Slider,
  Popover,
  Chip,
  Paper,
  Avatar,
  Switch,
} from "@mui/material";
import {
  FilterList,
  Refresh,
  Search,
  ExpandMore,
  Close,
  Map as MapIcon,
  Layers,
  MyLocation,
  TuneRounded,
  Place,
  Person,
  Phone,
  Badge as BadgeIcon,
  Group,
  Home,
  Edit,
  MoreVert,
  LocalShipping,
  AssignmentInd,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import type { Comite } from "./MapaPVL";
import { useFetch } from "@/lib/hooks/useFetch";
import { Cake } from "@mui/icons-material";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from "geojson";
import { calcularEdad, formatearFecha } from "@/lib/utils/formatters";

// Importar el mapa dinámicamente para evitar SSR
const MapaPVL = dynamic(() => import("./MapaPVL"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
    </div>
  ),
});

// Lista de comunas basada en el GeoJSON sectores-pvl
const COMUNAS_MAPA = [
  { id: 1, name: "ZARATE" },
  { id: 2, name: "CAMPOY" },
  { id: 3, name: "MANGOMARCA" },
  { id: 4, name: "SAUCES" },
  { id: 5, name: "HUAYRONA" },
  { id: 6, name: "CANTO REY" },
  { id: 7, name: "HUANCARAY" },
  { id: 8, name: "MARISCAL CACERES" },
  { id: 9, name: "MOTUPE" },
  { id: 10, name: "JICAMARCA" },
  { id: 11, name: "MARIATEGUI" },
  { id: 12, name: "CASA BLANCA" },
  { id: 13, name: "BAYOVAR" },
  { id: 14, name: "HUASCAR" },
  { id: 15, name: "CANTO GRANDE" },
  { id: 16, name: "SAN HILARION" },
  { id: 17, name: "LAS FLORES" },
  { id: 18, name: "CAJA DE AGUA" },
];

// Configuración de filtros
const FILTROS_CONFIG = [
  {
    id: "estado",
    label: "Estado",
    opciones: [
      { id: "activo", label: "Activo" },
      { id: "inactivo", label: "Inactivo" },
      { id: "suspendido", label: "Suspendido" },
    ],
  },
  {
    id: "tipo_beneficiario",
    label: "Tipo de Beneficiario",
    opciones: [
      { id: "gestante", label: "Gestante" },
      { id: "lactante", label: "Madre Lactante" },
      { id: "adulto_mayor", label: "Adulto Mayor" },

    ],
  },
  {
    id: "ruta",
    label: "Ruta",
    opciones: [
      { id: "A", label: "Ruta A" },
      { id: "B", label: "Ruta B" },
      { id: "C", label: "Ruta C" },
      { id: "D", label: "Ruta D" },
    ],
  },
];

// Configuración de rango de edad
interface RangoEdadState {
  activo: boolean;
  min: number;
  max: number;
}

// Opciones preestablecidas para el límite
const LIMITE_OPCIONES = [100, 300, 500, 1000];

// Interface para los datos del backend
interface CommitteeBackend {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  beneficiaries: number;
  beneficiaries_foreign: number;
  members: number;
  handicappeds: number;
  commune: number;
  observation: string | null;
  route: string;
  couple: { id: string; name: string } | null;
  town: { id: string; name: string } | null;
  coordinator: {
    id: string;
    name: string;
    lastname: string;
    dni: string;
    phone: string;
    birthday?: string;
  } | null;
}

interface BackendResponse {
  message: string;
  data: {
    data: CommitteeBackend[];
    currentPage: number;
    pageCount: number;
    totalCount: number;
    totalPages: number;
  };
}

// Interface para las propiedades del sector en el GeoJSON
interface SectorProperties {
  id: number;
  name: string;
  numero: number;
  color: string;
}

// Tipo para el GeoJSON de sectores
type SectoresGeoJSON = FeatureCollection<Polygon | MultiPolygon, SectorProperties>;

// Función para determinar la comuna de un punto usando point-in-polygon
const determinarComunaDesdeCoordenadas = (
  lat: number,
  lng: number,
  sectoresGeoJSON: SectoresGeoJSON | null
): number => {
  if (!sectoresGeoJSON || !sectoresGeoJSON.features) {
    return 0; // Retornar 0 si no hay datos de sectores
  }

  // Crear punto con turf (lng, lat - orden GeoJSON)
  const punto = turfPoint([lng, lat]);

  // Buscar en qué polígono cae el punto
  for (const feature of sectoresGeoJSON.features) {
    if (booleanPointInPolygon(punto, feature as Feature<Polygon | MultiPolygon>)) {
      return feature.properties.id || feature.properties.numero || 0;
    }
  }

  return 0; // Retornar 0 si no se encontró en ningún sector
};

// Función para mapear datos del backend al formato del frontend
const mapBackendToComite = (item: CommitteeBackend): Comite => ({
  id: item.id,
  codigo: item.code,
  ruta: item.route || "",
  centroAcopio: item.couple?.name || "",
  comite: item.name,
  pueblo: item.town?.name || "",
  coordenadas: {
    latitud: item.latitude,
    longitud: item.longitude,
  },
  inspector: "",
  beneficiarios: item.beneficiaries,
  socios: item.members,
  comuna: item.commune,
  coordinadora: {
    nombre: item.coordinator ? `${item.coordinator.name} ${item.coordinator.lastname}` : "",
    dni: item.coordinator?.dni || "",
    celular: item.coordinator?.phone || "",
    fechaNacimiento: item.coordinator?.birthday || undefined,
  },
  beneficiariosExtranjeros: item.beneficiaries_foreign,
  discapacitados: item.handicappeds,
  direccion: item.address,
  observacion: item.observation,
});

export default function PVLMapaPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filtrosSeleccionados, setFiltrosSeleccionados] = useState<Record<string, string[]>>({});
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>("estado");

  // Control de rango de edad de coordinadora (dentro de Tipo de Beneficiario)
  const [rangoEdad, setRangoEdad] = useState<RangoEdadState>({
    activo: false,
    min: 18,
    max: 80,
  });

  // Control de rango de edad de coordinadora
  const [rangoEdadCoordinadora, setRangoEdadCoordinadora] = useState<RangoEdadState>({
    activo: false,
    min: 18,
    max: 80,
  });

  // Control de comunas seleccionadas
  const [comunasSeleccionadas, setComunasSeleccionadas] = useState<number[]>([]);

  // Control de límite de visualización
  const [limiteVisible, setLimiteVisible] = useState(300);
  const [limiteAnchorEl, setLimiteAnchorEl] = useState<HTMLElement | null>(null);

  // Control de capas
  const [capasAnchorEl, setCapasAnchorEl] = useState<HTMLElement | null>(null);
  const [capasVisibles, setCapasVisibles] = useState({
    sectores: true,
    jurisdicciones: false,
    comites: true,
  });
  const capasPopoverOpen = Boolean(capasAnchorEl);

  // Datos de comités
  const [comites, setComites] = useState<Comite[]>([]);
  const [loading, setLoading] = useState(true);

  // Comité seleccionado para el panel de información
  const [comiteSeleccionado, setComiteSeleccionado] = useState<Comite | null>(null);

  const limitePopoverOpen = Boolean(limiteAnchorEl);

  // GeoJSON de sectores para point-in-polygon
  const [sectoresGeoJSON, setSectoresGeoJSON] = useState<SectoresGeoJSON | null>(null);

  // Hook para peticiones al backend
  const { getData } = useFetch();

  // Cargar GeoJSON de sectores al montar el componente
  useEffect(() => {
    const cargarSectoresGeoJSON = async () => {
      try {
        const response = await fetch("/data/sectores-pvl.geojson");
        const data = await response.json();
        setSectoresGeoJSON(data as SectoresGeoJSON);
        console.log("GeoJSON de sectores cargado:", data.features?.length, "sectores");
      } catch (error) {
        console.error("Error cargando GeoJSON de sectores:", error);
      }
    };
    cargarSectoresGeoJSON();
  }, []);

  // Cargar datos del backend
  const cargarComites = useCallback(async () => {
    // Esperar a que el GeoJSON esté cargado
    if (!sectoresGeoJSON) {
      console.log("Esperando carga del GeoJSON de sectores...");
      return;
    }

    try {
      setLoading(true);
      const response = await getData<BackendResponse>("pvl/committee?page=0");
      if (response?.data?.data) {
        // Mapear datos y calcular comuna usando point-in-polygon
        const comitesMapeados = response.data.data.map((item) => {
          const comiteBase = mapBackendToComite(item);

          // Calcular la comuna usando las coordenadas y el GeoJSON de sectores
          const comunaCalculada = determinarComunaDesdeCoordenadas(
            item.latitude,
            item.longitude,
            sectoresGeoJSON
          );

          // Usar la comuna calculada si se encontró, si no usar la del backend
          return {
            ...comiteBase,
            comuna: comunaCalculada > 0 ? comunaCalculada : comiteBase.comuna,
          };
        });

        setComites(comitesMapeados);

        // Debug: Ver comparación de comunas
        const comparacion = response.data.data.slice(0, 10).map((c) => {
          const comunaCalculada = determinarComunaDesdeCoordenadas(
            c.latitude,
            c.longitude,
            sectoresGeoJSON
          );
          return {
            name: c.name,
            comunaBackend: c.commune,
            comunaCalculada,
            lat: c.latitude,
            lng: c.longitude,
          };
        });
        console.log("Comparación de comunas (backend vs calculada):", comparacion);
      }
    } catch (err) {
      console.error("Error cargando comités:", err);
    } finally {
      setLoading(false);
    }
  }, [getData, sectoresGeoJSON]);

  // Cargar comités cuando el GeoJSON esté listo
  useEffect(() => {
    if (sectoresGeoJSON) {
      cargarComites();
    }
  }, [sectoresGeoJSON, cargarComites]);

  // Filtrar comités por edad de coordinadora y comuna
  const comitesFiltrados = comites.filter((comite) => {
    // Filtro por rango de edad (dentro de Tipo de Beneficiario) - ahora filtra por coordinadora
    if (rangoEdad.activo) {
      if (!comite.coordinadora.fechaNacimiento) {
        return false;
      }
      const edadCoord = calcularEdad(comite.coordinadora.fechaNacimiento);
      if (edadCoord < rangoEdad.min || edadCoord > rangoEdad.max) {
        return false;
      }
    }
    // Filtro por edad de coordinadora (acordeón separado)
    if (rangoEdadCoordinadora.activo) {
      if (!comite.coordinadora.fechaNacimiento) {
        return false;
      }
      const edadCoord = calcularEdad(comite.coordinadora.fechaNacimiento);
      if (edadCoord < rangoEdadCoordinadora.min || edadCoord > rangoEdadCoordinadora.max) {
        return false;
      }
    }
    // Filtro por comuna
    if (comunasSeleccionadas.length > 0) {
      if (!comunasSeleccionadas.includes(comite.comuna)) {
        return false;
      }
    }
    return true;
  });

  // Calcular valores
  const totalFiltrados = comitesFiltrados.length;
  const comitesMostrados = Math.min(limiteVisible, totalFiltrados);

  // Contar filtros activos (incluyendo rango de edad y comunas)
  const contarFiltrosActivos = () => {
    const filtrosBasicos = Object.values(filtrosSeleccionados).reduce((acc, arr) => acc + arr.length, 0);
    const filtroEdad = rangoEdad.activo ? 1 : 0;
    const filtroEdadCoordinadora = rangoEdadCoordinadora.activo ? 1 : 0;
    const filtroComunas = comunasSeleccionadas.length > 0 ? 1 : 0;
    return filtrosBasicos + filtroEdad + filtroEdadCoordinadora + filtroComunas;
  };

  // Verificar si hay filtros activos
  const hayFiltrosActivos = () => {
    return contarFiltrosActivos() > 0;
  };

  // Manejar cambio de filtro
  const handleFilterChange = (categoriaId: string, opcionId: string, checked: boolean) => {
    setFiltrosSeleccionados((prev) => {
      const current = prev[categoriaId] || [];
      if (checked) {
        return { ...prev, [categoriaId]: [...current, opcionId] };
      } else {
        return { ...prev, [categoriaId]: current.filter((id) => id !== opcionId) };
      }
    });
  };

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltrosSeleccionados({});
    setRangoEdad({ activo: false, min: 18, max: 80 });
    setRangoEdadCoordinadora({ activo: false, min: 18, max: 80 });
    setComunasSeleccionadas([]);
  };

  // Manejar toggle de comuna
  const handleComunaToggle = (comunaId: number) => {
    setComunasSeleccionadas((prev) =>
      prev.includes(comunaId) ? prev.filter((c) => c !== comunaId) : [...prev, comunaId]
    );
  };

  // Aplicar filtros
  const aplicarFiltros = () => {
    console.log("Filtros aplicados:", filtrosSeleccionados);
    console.log("Rango de edad:", rangoEdad);
    setFilterOpen(false);
  };

  // Manejar clic en comité
  const handleComiteClick = (comite: Comite) => {
    setComiteSeleccionado(comite);
  };

  // Cerrar panel de información
  const cerrarPanelInfo = () => {
    setComiteSeleccionado(null);
  };

  const filtrosActivos = contarFiltrosActivos();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px + 32px)",
        marginLeft: "-16px",
        marginRight: "-16px",
        marginBottom: "-16px",
        marginTop: "-16px",
        overflow: "hidden",
        "@media (min-width: 768px)": {
          height: "calc(100vh - 64px + 48px)",
          marginLeft: "-24px",
          marginRight: "-24px",
          marginBottom: "-24px",
          marginTop: "-24px",
        },
      }}
    >
      {/* Header del mapa */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          bgcolor: "white",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: 10,
        }}
      >
        {/* Lado izquierdo - Título */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MapIcon sx={{ color: "#d81b7e" }} />
          <Typography variant="h6" fontWeight="bold">
            Mapa PVL
          </Typography>
        </Box>

        {/* Centro - Contador y control de límite */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "grey.100",
              px: 2,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Mostrando <strong>{comitesMostrados}</strong> de <strong>{totalFiltrados}</strong> comités
              {hayFiltrosActivos() && totalFiltrados < comites.length && (
                <Typography component="span" variant="caption" sx={{ ml: 1, color: "#d81b7e" }}>
                  (filtrado de {comites.length})
                </Typography>
              )}
            </Typography>
          </Box>

          {/* Botón de control de límite */}
          <Tooltip title="Ajustar cantidad visible">
            <Box
              onClick={(e) => setLimiteAnchorEl(e.currentTarget)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "#d81b7e",
                color: "white",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": { bgcolor: "#b8176b" },
              }}
            >
              <TuneRounded fontSize="small" />
              <Typography variant="body2" fontWeight="medium">
                {limiteVisible}
              </Typography>
            </Box>
          </Tooltip>

          {/* Popover de límite */}
          <Popover
            open={limitePopoverOpen}
            anchorEl={limiteAnchorEl}
            onClose={() => setLimiteAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Box sx={{ p: 2, width: 300 }}>
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                Límite de visualización
              </Typography>

              {hayFiltrosActivos() && (
                <Box sx={{ mb: 2, p: 1, bgcolor: "#fce4ec", borderRadius: 1 }}>
                  <Typography variant="caption" color="#d81b7e">
                    Filtros activos: {totalFiltrados} comités coinciden de {comites.length} total
                  </Typography>
                </Box>
              )}

              <Box sx={{ px: 1 }}>
                <Slider
                  value={Math.min(limiteVisible, totalFiltrados)}
                  onChange={(_, value) => setLimiteVisible(value as number)}
                  min={50}
                  max={totalFiltrados || 1500}
                  step={50}
                  valueLabelDisplay="auto"
                  sx={{
                    color: "#d81b7e",
                    "& .MuiSlider-thumb": {
                      "&:hover, &.Mui-focusVisible": {
                        boxShadow: "0 0 0 8px rgba(216, 27, 126, 0.16)",
                      },
                    },
                  }}
                />
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: -1 }}>
                  <Typography variant="caption" color="text.secondary">50</Typography>
                  <Typography variant="caption" color="text.secondary">{totalFiltrados}</Typography>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, mb: 1 }}>
                Opciones rápidas:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {LIMITE_OPCIONES.filter(op => op <= (totalFiltrados || 1500)).map((opcion) => (
                  <Chip
                    key={opcion}
                    label={opcion}
                    size="small"
                    onClick={() => setLimiteVisible(opcion)}
                    sx={{
                      bgcolor: limiteVisible === opcion ? "#d81b7e" : "grey.200",
                      color: limiteVisible === opcion ? "white" : "text.primary",
                      "&:hover": { bgcolor: limiteVisible === opcion ? "#b8176b" : "grey.300" },
                    }}
                  />
                ))}
                <Chip
                  label={`Todos (${totalFiltrados})`}
                  size="small"
                  onClick={() => setLimiteVisible(totalFiltrados || 1500)}
                  sx={{
                    bgcolor: limiteVisible >= totalFiltrados ? "#d81b7e" : "grey.200",
                    color: limiteVisible >= totalFiltrados ? "white" : "text.primary",
                    "&:hover": { bgcolor: limiteVisible >= totalFiltrados ? "#b8176b" : "grey.300" },
                  }}
                />
              </Box>

              <Box sx={{ mt: 2, p: 1.5, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" textAlign="center">
                  Mostrando <strong>{comitesMostrados}</strong> de <strong>{totalFiltrados}</strong> comités
                </Typography>
              </Box>
            </Box>
          </Popover>
        </Box>

        {/* Lado derecho - Iconos de acción */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Actualizar">
            <IconButton size="small" onClick={cargarComites}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filtros">
            <IconButton
              size="small"
              onClick={() => setFilterOpen(true)}
              sx={{
                bgcolor: filtrosActivos > 0 ? "primary.main" : "transparent",
                color: filtrosActivos > 0 ? "white" : "inherit",
                "&:hover": { bgcolor: filtrosActivos > 0 ? "primary.dark" : "action.hover" },
              }}
            >
              <Badge badgeContent={filtrosActivos} color="error">
                <FilterList />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Capas">
            <IconButton
              size="small"
              onClick={(e) => setCapasAnchorEl(e.currentTarget)}
              sx={{
                bgcolor: capasPopoverOpen ? "grey.200" : "transparent",
              }}
            >
              <Layers />
            </IconButton>
          </Tooltip>

          {/* Popover de capas */}
          <Popover
            open={capasPopoverOpen}
            anchorEl={capasAnchorEl}
            onClose={() => setCapasAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                borderRadius: 2,
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                overflow: "hidden",
              }
            }}
          >
            <Box sx={{ width: 280 }}>
              {/* Header del popover */}
              <Box
                sx={{
                  bgcolor: "#1E293B",
                  color: "white",
                  px: 2,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Layers fontSize="small" />
                <Typography variant="subtitle2" fontWeight="bold">
                  Control de Capas
                </Typography>
              </Box>

              {/* Lista de capas */}
              <Box sx={{ p: 1 }}>
                {/* Capa de Comunas */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: capasVisibles.sectores ? "rgba(216, 27, 126, 0.08)" : "transparent",
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: capasVisibles.sectores ? "rgba(216, 27, 126, 0.12)" : "grey.50" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: "#d81b7e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: capasVisibles.sectores ? 1 : 0.4,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          bgcolor: "rgba(255,255,255,0.9)",
                          borderRadius: 0.5,
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Comunas
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Zonas del distrito
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    size="small"
                    checked={capasVisibles.sectores}
                    onChange={(e) => setCapasVisibles(prev => ({ ...prev, sectores: e.target.checked }))}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#d81b7e",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#d81b7e",
                      },
                    }}
                  />
                </Box>

                {/* Capa de Jurisdicciones */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: capasVisibles.jurisdicciones ? "rgba(52, 180, 41, 0.08)" : "transparent",
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: capasVisibles.jurisdicciones ? "rgba(52, 180, 41, 0.12)" : "grey.50" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: "#34b429",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: capasVisibles.jurisdicciones ? 1 : 0.4,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          border: "2px solid rgba(255,255,255,0.9)",
                          borderRadius: 0.5,
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Jurisdicciones
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Límites del distrito
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    size="small"
                    checked={capasVisibles.jurisdicciones}
                    onChange={(e) => setCapasVisibles(prev => ({ ...prev, jurisdicciones: e.target.checked }))}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#34b429",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#34b429",
                      },
                    }}
                  />
                </Box>

                {/* Capa de Comités */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: capasVisibles.comites ? "rgba(30, 41, 59, 0.08)" : "transparent",
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: capasVisibles.comites ? "rgba(30, 41, 59, 0.12)" : "grey.50" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: "#1E293B",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: capasVisibles.comites ? 1 : 0.4,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Place sx={{ fontSize: 18, color: "white" }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Comités
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Marcadores de ubicación
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    size="small"
                    checked={capasVisibles.comites}
                    onChange={(e) => setCapasVisibles(prev => ({ ...prev, comites: e.target.checked }))}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#1E293B",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#1E293B",
                      },
                    }}
                  />
                </Box>
              </Box>

              {/* Footer con acciones rápidas */}
              <Divider />
              <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={() => setCapasVisibles({ sectores: true, jurisdicciones: true, comites: true })}
                  startIcon={<Visibility sx={{ fontSize: 16 }} />}
                  sx={{
                    textTransform: "none",
                    borderColor: "grey.300",
                    color: "text.secondary",
                    "&:hover": { borderColor: "grey.400", bgcolor: "grey.50" },
                  }}
                >
                  Mostrar todas
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={() => setCapasVisibles({ sectores: false, jurisdicciones: false, comites: false })}
                  startIcon={<VisibilityOff sx={{ fontSize: 16 }} />}
                  sx={{
                    textTransform: "none",
                    borderColor: "grey.300",
                    color: "text.secondary",
                    "&:hover": { borderColor: "grey.400", bgcolor: "grey.50" },
                  }}
                >
                  Ocultar todas
                </Button>
              </Box>
            </Box>
          </Popover>
        </Box>
      </Box>

      {/* Contenedor del mapa con panel de información */}
      <Box sx={{ flex: 1, position: "relative", display: "flex" }}>
        {/* Panel de información del comité seleccionado */}
        {comiteSeleccionado && (
          <Paper
            elevation={4}
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 350,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header del panel */}
            <Box
              sx={{
                bgcolor: "#a62651",
                color: "white",
                p: 2,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ flex: 1, pr: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                  {comiteSeleccionado.comite}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Código: {comiteSeleccionado.codigo}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <IconButton size="small" sx={{ color: "white" }}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" sx={{ color: "white" }}>
                  <MoreVert fontSize="small" />
                </IconButton>
                <IconButton size="small" sx={{ color: "white" }} onClick={cerrarPanelInfo}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Contenido del panel */}
            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
              {/* Dirección */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Dirección
                </Typography>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 0.5 }}>
                  <Place fontSize="small" color="action" />
                  <Typography variant="body2">
                    {comiteSeleccionado.direccion}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 3.5 }}>
                  {comiteSeleccionado.pueblo} - Comuna {comiteSeleccionado.comuna}
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Coordinadora */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Coordinadora
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                  <Avatar sx={{ bgcolor: "#1E293B", width: 40, height: 40 }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {comiteSeleccionado.coordinadora.nombre}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <BadgeIcon fontSize="inherit" sx={{ color: "text.secondary", fontSize: 14 }} />
                      <Typography variant="caption" color="text.secondary">
                        DNI: {comiteSeleccionado.coordinadora.dni}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Phone fontSize="inherit" sx={{ color: "text.secondary", fontSize: 14 }} />
                      <Typography variant="caption" color="text.secondary">
                        {comiteSeleccionado.coordinadora.celular}
                      </Typography>
                    </Box>
                    {comiteSeleccionado.coordinadora.fechaNacimiento && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Cake fontSize="inherit" sx={{ color: "text.secondary", fontSize: 14 }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatearFecha(comiteSeleccionado.coordinadora.fechaNacimiento)} ({calcularEdad(comiteSeleccionado.coordinadora.fechaNacimiento)} años)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Estadísticas */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Estadísticas
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1 }}>
                  <Box sx={{ bgcolor: "grey.100", p: 1.5, borderRadius: 1, textAlign: "center" }}>
                    <Typography variant="h5" fontWeight="bold" color="#1E293B">
                      {comiteSeleccionado.beneficiarios}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Beneficiarios
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: "grey.100", p: 1.5, borderRadius: 1, textAlign: "center" }}>
                    <Typography variant="h5" fontWeight="bold" color="#1E293B">
                      {comiteSeleccionado.socios}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Socios
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Información adicional */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Información Adicional
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <LocalShipping fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Centro de Acopio:</strong> {comiteSeleccionado.centroAcopio}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <AssignmentInd fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Inspector:</strong> {comiteSeleccionado.inspector}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Home fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Ruta:</strong> {comiteSeleccionado.ruta}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Otros datos */}
              <Box sx={{ bgcolor: "grey.50", p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Beneficiarios extranjeros: {comiteSeleccionado.beneficiariosExtranjeros} |
                  Discapacitados: {comiteSeleccionado.discapacitados}
                </Typography>
                {comiteSeleccionado.observacion && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    <strong>Obs:</strong> {comiteSeleccionado.observacion}
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        )}

        {/* Mapa */}
        <Box sx={{ flex: 1, position: "relative" }}>
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </Box>
          ) : (
            <MapaPVL
              comites={comitesFiltrados}
              comiteSeleccionado={comiteSeleccionado}
              onComiteClick={handleComiteClick}
              limiteVisible={limiteVisible}
              filterOpen={filterOpen}
              capasVisibles={capasVisibles}
            />
          )}
        </Box>
      </Box>

      {/* Drawer de filtros */}
      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        PaperProps={{ sx: { width: 320, maxWidth: "100%" } }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FilterList />
            <Typography variant="h6" fontWeight="bold">
              Filtros
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setFilterOpen(false)}>
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", gap: 1, p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Button variant="outlined" fullWidth onClick={limpiarFiltros} disabled={filtrosActivos === 0}>
            LIMPIAR
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={aplicarFiltros}
            sx={{ bgcolor: "#d81b7e", "&:hover": { bgcolor: "#b8176b" } }}
          >
            APLICAR
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {FILTROS_CONFIG.map((categoria) => {
            const cantidadFiltros = categoria.id === "tipo_beneficiario"
              ? (filtrosSeleccionados[categoria.id]?.length || 0) + (rangoEdad.activo ? 1 : 0)
              : filtrosSeleccionados[categoria.id]?.length || 0;

            return (
              <Accordion
                key={categoria.id}
                expanded={expandedAccordion === categoria.id}
                onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? categoria.id : false)}
                disableGutters
                elevation={0}
                sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}
              >
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 48, "& .MuiAccordionSummary-content": { my: 0 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography fontWeight="medium">{categoria.label}</Typography>
                    {cantidadFiltros > 0 && (
                      <Box
                        sx={{
                          bgcolor: "#d81b7e",
                          color: "white",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                        }}
                      >
                        {cantidadFiltros}
                      </Box>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {categoria.id === "tipo_beneficiario" && (
                    <Box sx={{ mb: 2, pb: 2, borderBottom: "1px dashed", borderColor: "divider" }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={rangoEdad.activo}
                            onChange={() => setRangoEdad((prev) => ({ ...prev, activo: !prev.activo }))}
                            sx={{ color: "#d81b7e", "&.Mui-checked": { color: "#d81b7e" } }}
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Edad coordinadora: <strong>{rangoEdad.min} - {rangoEdad.max} años</strong>
                          </Typography>
                        }
                      />
                      {rangoEdad.activo && (
                        <Box sx={{ px: 2, mt: 1 }}>
                          <Slider
                            value={[rangoEdad.min, rangoEdad.max]}
                            onChange={(_, value) => {
                              const [min, max] = value as number[];
                              setRangoEdad((prev) => ({ ...prev, min, max }));
                            }}
                            min={18}
                            max={100}
                            valueLabelDisplay="auto"
                            marks={[
                              { value: 18, label: "18" },
                              { value: 40, label: "40" },
                              { value: 60, label: "60" },
                              { value: 80, label: "80" },
                              { value: 100, label: "100" },
                            ]}
                            sx={{
                              color: "#d81b7e",
                              "& .MuiSlider-thumb": {
                                "&:hover, &.Mui-focusVisible": {
                                  boxShadow: "0 0 0 8px rgba(216, 27, 126, 0.16)",
                                },
                              },
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}

                  <FormGroup>
                    {categoria.opciones.map((opcion) => (
                      <FormControlLabel
                        key={opcion.id}
                        control={
                          <Checkbox
                            size="small"
                            checked={filtrosSeleccionados[categoria.id]?.includes(opcion.id) || false}
                            onChange={(e) => handleFilterChange(categoria.id, opcion.id, e.target.checked)}
                            sx={{ color: "#d81b7e", "&.Mui-checked": { color: "#d81b7e" } }}
                          />
                        }
                        label={<Typography variant="body2">{opcion.label}</Typography>}
                      />
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* Filtro de Edad de Coordinadora */}
          <Accordion
            expanded={expandedAccordion === "edad_coordinadora"}
            onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? "edad_coordinadora" : false)}
            disableGutters
            elevation={0}
            sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 48, "& .MuiAccordionSummary-content": { my: 0 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography fontWeight="medium">Edad Coordinadora</Typography>
                {rangoEdadCoordinadora.activo && (
                  <Box
                    sx={{
                      bgcolor: "#d81b7e",
                      color: "white",
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    1
                  </Box>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={rangoEdadCoordinadora.activo}
                    onChange={() => setRangoEdadCoordinadora((prev) => ({ ...prev, activo: !prev.activo }))}
                    sx={{ color: "#d81b7e", "&.Mui-checked": { color: "#d81b7e" } }}
                  />
                }
                label={
                  <Typography variant="body2">
                    Rango de edad: <strong>{rangoEdadCoordinadora.min} - {rangoEdadCoordinadora.max} años</strong>
                  </Typography>
                }
              />
              {rangoEdadCoordinadora.activo && (
                <Box sx={{ px: 2, mt: 1 }}>
                  <Slider
                    value={[rangoEdadCoordinadora.min, rangoEdadCoordinadora.max]}
                    onChange={(_, value) => {
                      const [min, max] = value as number[];
                      setRangoEdadCoordinadora((prev) => ({ ...prev, min, max }));
                    }}
                    min={18}
                    max={100}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 18, label: "18" },
                      { value: 40, label: "40" },
                      { value: 60, label: "60" },
                      { value: 80, label: "80" },
                      { value: 100, label: "100" },
                    ]}
                    sx={{
                      color: "#d81b7e",
                      "& .MuiSlider-thumb": {
                        "&:hover, &.Mui-focusVisible": {
                          boxShadow: "0 0 0 8px rgba(216, 27, 126, 0.16)",
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Filtro de Comunas */}
          <Accordion
            expanded={expandedAccordion === "comunas"}
            onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? "comunas" : false)}
            disableGutters
            elevation={0}
            sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 48, "& .MuiAccordionSummary-content": { my: 0 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography fontWeight="medium">Comunas</Typography>
                {comunasSeleccionadas.length > 0 && (
                  <Box
                    sx={{
                      bgcolor: "#0369a1",
                      color: "white",
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    {comunasSeleccionadas.length}
                  </Box>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 0.5,
                  maxHeight: 280,
                  overflowY: "auto",
                }}
              >
                {COMUNAS_MAPA.map((comuna) => (
                  <FormControlLabel
                    key={comuna.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={comunasSeleccionadas.includes(comuna.id)}
                        onChange={() => handleComunaToggle(comuna.id)}
                        sx={{ color: "#0369a1", "&.Mui-checked": { color: "#0369a1" }, py: 0.25 }}
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                        {comuna.id}. {comuna.name}
                      </Typography>
                    }
                    sx={{ mr: 0 }}
                  />
                ))}
              </Box>
              {comunasSeleccionadas.length > 0 && (
                <Typography variant="caption" color="#0369a1" sx={{ mt: 1, display: "block" }}>
                  {comunasSeleccionadas.length} comuna(s) seleccionada(s)
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>
      </Drawer>
    </Box>
  );
}
