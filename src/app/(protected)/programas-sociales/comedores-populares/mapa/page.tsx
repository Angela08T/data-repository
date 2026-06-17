"use client";

import { useState, useEffect, useCallback } from "react";
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
  ExpandMore,
  Close,
  Map as MapIcon,
  Layers,
  TuneRounded,
  Place,
  Person,
  Phone,
  Group,
  Restaurant,
  Edit,
  MoreVert,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import type { Comedor } from "./MapaComedores";
import { useFetch } from "@/lib/hooks/useFetch";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from "geojson";

// Importar el mapa dinámicamente para evitar SSR
const MapaComedores = dynamic(() => import("./MapaComedores"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
    </div>
  ),
});

// Lista de comunas basada en el GeoJSON sectores-pvl (igual que PVL)
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
    return 0;
  }

  const punto = turfPoint([lng, lat]);

  for (const feature of sectoresGeoJSON.features) {
    if (booleanPointInPolygon(punto, feature as Feature<Polygon | MultiPolygon>)) {
      return feature.properties.id || feature.properties.numero || 0;
    }
  }

  return 0;
};

// Configuración de filtros
const FILTROS_CONFIG = [
  {
    id: "situacion",
    label: "Situación",
    opciones: [
      { id: "Transitado", label: "Transitado" },
      { id: "Pendiente", label: "Pendiente" },
    ],
  },
];

// Interface para los datos del backend de comedores populares
interface ComedorBackend {
  id: string;
  code: string;
  name: string;
  address: string;
  members: number;
  members_male: number;
  members_female: number;
  situation: string | null;
  latitude: number;
  longitude: number;
  modality: string;
  president_id: string;
  directive_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  directive: {
    id: string;
    resolution: string;
    start_at: string;
    end_at: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  } | null;
  president: {
    id: string;
    name: string;
    lastname: string;
    dni: string;
    phone: string;
    birthday: string;
    sex: "MALE" | "FEMALE";
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  } | null;
}

// Opciones de límite
const LIMITE_OPCIONES = [50, 100, 200, 500];

export default function ComedoresMapaPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filtrosSeleccionados, setFiltrosSeleccionados] = useState<Record<string, string[]>>({});
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>("estado");

  // Control de comunas seleccionadas
  const [comunasSeleccionadas, setComunasSeleccionadas] = useState<number[]>([]);

  // GeoJSON de sectores para point-in-polygon
  const [sectoresGeoJSON, setSectoresGeoJSON] = useState<SectoresGeoJSON | null>(null);

  // Control de límite de visualización
  const [limiteVisible, setLimiteVisible] = useState(100);
  const [limiteAnchorEl, setLimiteAnchorEl] = useState<HTMLElement | null>(null);

  // Control de capas
  const [capasAnchorEl, setCapasAnchorEl] = useState<HTMLElement | null>(null);
  const [capasVisibles, setCapasVisibles] = useState({
    sectores: true,
    jurisdicciones: false,
    comedores: true,
  });
  const capasPopoverOpen = Boolean(capasAnchorEl);

  // Comedor seleccionado para el panel de información
  const [comedorSeleccionado, setComedorSeleccionado] = useState<Comedor | null>(null);

  const limitePopoverOpen = Boolean(limiteAnchorEl);

  // Datos de comedores del backend
  const [comedores, setComedores] = useState<Comedor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtrar comedores
  const comedoresFiltrados = comedores.filter((comedor) => {
    // Filtro por situación
    const situacionesFiltro = filtrosSeleccionados["situacion"] || [];
    if (situacionesFiltro.length > 0 && !situacionesFiltro.includes(comedor.situacion)) {
      return false;
    }
    // Filtro por comuna
    if (comunasSeleccionadas.length > 0) {
      if (!comunasSeleccionadas.includes(comedor.comuna || 0)) {
        return false;
      }
    }
    return true;
  });

  // Función para mapear datos del backend al formato del frontend
  const mapBackendToComedor = (item: ComedorBackend): Comedor => ({
    id: item.id,
    codigo: item.code,
    nombre: item.name,
    direccion: item.address,
    coordenadas: {
      latitud: item.latitude,
      longitud: item.longitude,
    },
    socios: item.members,
    sociosHombres: item.members_male,
    sociosMujeres: item.members_female,
    situacion: item.situation || "Sin información",
    presidenta: {
      nombre: item.president
        ? `${item.president.name} ${item.president.lastname}`
        : "",
      dni: item.president?.dni || "",
      celular: item.president?.phone || "",
      fechaNacimiento: item.president?.birthday || undefined,
      sexo: item.president?.sex || undefined,
    },
    resolucion: item.directive?.resolution || "",
    vigencia: item.directive
      ? {
          inicio: item.directive.start_at,
          fin: item.directive.end_at,
        }
      : undefined,
  });

  // Calcular valores
  const totalFiltrados = comedoresFiltrados.length;
  const comedoresMostrados = Math.min(limiteVisible, totalFiltrados);

  // Contar filtros activos
  const contarFiltrosActivos = () => {
    const filtrosBasicos = Object.values(filtrosSeleccionados).reduce((acc, arr) => acc + arr.length, 0);
    const filtroComunas = comunasSeleccionadas.length > 0 ? 1 : 0;
    return filtrosBasicos + filtroComunas;
  };

  const hayFiltrosActivos = () => contarFiltrosActivos() > 0;

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
    setFilterOpen(false);
  };

  // Manejar clic en comedor
  const handleComedorClick = (comedor: Comedor) => {
    setComedorSeleccionado(comedor);
  };

  // Cerrar panel de información
  const cerrarPanelInfo = () => {
    setComedorSeleccionado(null);
  };

  const filtrosActivos = contarFiltrosActivos();

  // Hook para peticiones al backend
  const { getData } = useFetch();

  // Interface para la respuesta del backend
  interface BackendResponse {
    message: string;
    data: {
      data: ComedorBackend[];
      currentPage: number;
      pageCount: number;
      totalCount: number;
      totalPages: number;
    };
  }

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
  const cargarComedores = useCallback(async () => {
    // Esperar a que el GeoJSON esté cargado
    if (!sectoresGeoJSON) {
      console.log("Esperando carga del GeoJSON de sectores...");
      return;
    }

    try {
      setLoading(true);
      const response = await getData<BackendResponse>("pca/center?page=0&modality=EATER");
      if (response?.data?.data) {
        // Mapear datos del backend al formato del frontend y calcular comuna
        const comedoresMapeados = response.data.data.map((item) => {
          const comedorBase = mapBackendToComedor(item);

          // Calcular la comuna usando las coordenadas y el GeoJSON de sectores
          const comunaCalculada = determinarComunaDesdeCoordenadas(
            item.latitude,
            item.longitude,
            sectoresGeoJSON
          );

          return {
            ...comedorBase,
            comuna: comunaCalculada,
          };
        });
        setComedores(comedoresMapeados);
        console.log("Comedores populares cargados:", comedoresMapeados.length);
      }
    } catch (err) {
      console.error("Error cargando comedores populares:", err);
    } finally {
      setLoading(false);
    }
  }, [getData, sectoresGeoJSON]);

  // Cargar comedores cuando el GeoJSON esté listo
  useEffect(() => {
    if (sectoresGeoJSON) {
      cargarComedores();
    }
  }, [sectoresGeoJSON, cargarComedores]);

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
          <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}>
            Mapa de Comedores
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
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Mostrando <strong>{comedoresMostrados}</strong> de <strong>{totalFiltrados}</strong> comedores
              {hayFiltrosActivos() && totalFiltrados < comedores.length && (
                <Typography component="span" variant="caption" sx={{ ml: 1, color: "#d81b7e" }}>
                  (filtrado de {comedores.length})
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
              <Typography variant="subtitle2" fontWeight="bold" mb={1} sx={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}>
                Límite de visualización
              </Typography>

              {hayFiltrosActivos() && (
                <Box sx={{ mb: 2, p: 1, bgcolor: "#fce4ec", borderRadius: 1 }}>
                  <Typography variant="caption" color="#d81b7e">
                    Filtros activos: {totalFiltrados} comedores coinciden de {comedores.length} total
                  </Typography>
                </Box>
              )}

              <Box sx={{ px: 1 }}>
                <Slider
                  value={Math.min(limiteVisible, totalFiltrados)}
                  onChange={(_, value) => setLimiteVisible(value as number)}
                  min={10}
                  max={totalFiltrados || 500}
                  step={10}
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
                  <Typography variant="caption" color="text.secondary">10</Typography>
                  <Typography variant="caption" color="text.secondary">{totalFiltrados}</Typography>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, mb: 1 }}>
                Opciones rápidas:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {LIMITE_OPCIONES.filter(op => op <= (totalFiltrados || 500)).map((opcion) => (
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
                  onClick={() => setLimiteVisible(totalFiltrados || 500)}
                  sx={{
                    bgcolor: limiteVisible >= totalFiltrados ? "#d81b7e" : "grey.200",
                    color: limiteVisible >= totalFiltrados ? "white" : "text.primary",
                    "&:hover": { bgcolor: limiteVisible >= totalFiltrados ? "#b8176b" : "grey.300" },
                  }}
                />
              </Box>

              <Box sx={{ mt: 2, p: 1.5, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" textAlign="center">
                  Mostrando <strong>{comedoresMostrados}</strong> de <strong>{totalFiltrados}</strong> comedores
                </Typography>
              </Box>
            </Box>
          </Popover>
        </Box>

        {/* Lado derecho - Iconos de acción */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Actualizar">
            <IconButton size="small" onClick={cargarComedores}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filtros">
            <IconButton
              size="small"
              onClick={() => setFilterOpen(true)}
              sx={{
                bgcolor: filtrosActivos > 0 ? "#d81b7e" : "transparent",
                color: filtrosActivos > 0 ? "white" : "inherit",
                "&:hover": { bgcolor: filtrosActivos > 0 ? "#b8176b" : "action.hover" },
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
                {/* Capa de Zonas */}
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
                        Zonas
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Sectores del distrito
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
                        Límites territoriales
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

                {/* Capa de Comedores */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: capasVisibles.comedores ? "rgba(30, 41, 59, 0.08)" : "transparent",
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: capasVisibles.comedores ? "rgba(30, 41, 59, 0.12)" : "grey.50" },
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
                        opacity: capasVisibles.comedores ? 1 : 0.4,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Restaurant sx={{ fontSize: 18, color: "white" }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Comedores
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ubicación de comedores
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    size="small"
                    checked={capasVisibles.comedores}
                    onChange={(e) => setCapasVisibles(prev => ({ ...prev, comedores: e.target.checked }))}
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
                  onClick={() => setCapasVisibles({ sectores: true, jurisdicciones: true, comedores: true })}
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
                  onClick={() => setCapasVisibles({ sectores: false, jurisdicciones: false, comedores: false })}
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
        {/* Panel de información del comedor seleccionado */}
        {comedorSeleccionado && (
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
                bgcolor: "#d81b7e",
                color: "white",
                p: 2,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ flex: 1, pr: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2, fontFamily: "'Poppins', 'Roboto', sans-serif" }}>
                  {comedorSeleccionado.nombre}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Código: {comedorSeleccionado.codigo}
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
              {/* Situación */}
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "inline-block",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "12px",
                    backgroundColor: comedorSeleccionado.situacion === "Transitado" ? "#dcfce7" : "#fef3c7",
                    color: comedorSeleccionado.situacion === "Transitado" ? "#166534" : "#92400e",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {comedorSeleccionado.situacion}
                </Box>
              </Box>

              {/* Dirección */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Dirección
                </Typography>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 0.5 }}>
                  <Place fontSize="small" color="action" />
                  <Typography variant="body2">
                    {comedorSeleccionado.direccion}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Presidenta */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Presidenta
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                  <Avatar sx={{ bgcolor: "#1E293B", width: 40, height: 40 }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {comedorSeleccionado.presidenta.nombre}
                    </Typography>
                    {comedorSeleccionado.presidenta.dni && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        DNI: {comedorSeleccionado.presidenta.dni}
                      </Typography>
                    )}
                    {comedorSeleccionado.presidenta.celular && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Phone fontSize="inherit" sx={{ color: "text.secondary", fontSize: 14 }} />
                        <Typography variant="caption" color="text.secondary">
                          {comedorSeleccionado.presidenta.celular}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Estadísticas de Socios */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Socios
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, mt: 1 }}>
                  <Box sx={{ bgcolor: "#e0f2fe", p: 1.5, borderRadius: 1, textAlign: "center" }}>
                    <Group sx={{ color: "#0284c7", mb: 0.5, fontSize: 20 }} />
                    <Typography variant="h6" fontWeight="bold" color="#0284c7">
                      {comedorSeleccionado.socios}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: "#dbeafe", p: 1.5, borderRadius: 1, textAlign: "center" }}>
                    <Typography variant="h6" fontWeight="bold" color="#2563eb">
                      {comedorSeleccionado.sociosHombres}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hombres
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: "#fce7f3", p: 1.5, borderRadius: 1, textAlign: "center" }}>
                    <Typography variant="h6" fontWeight="bold" color="#db2777">
                      {comedorSeleccionado.sociosMujeres}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mujeres
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Resolución y Vigencia */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">
                  Resolución
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {comedorSeleccionado.resolucion || "Sin resolución"}
                </Typography>
                {comedorSeleccionado.vigencia && (
                  <Box sx={{ mt: 1, bgcolor: "grey.50", p: 1, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Vigencia:</strong> {new Date(comedorSeleccionado.vigencia.inicio).toLocaleDateString()} - {new Date(comedorSeleccionado.vigencia.fin).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Coordenadas */}
              <Box sx={{ bgcolor: "grey.50", p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Coordenadas:</strong> {comedorSeleccionado.coordenadas.latitud.toFixed(6)}, {comedorSeleccionado.coordenadas.longitud.toFixed(6)}
                </Typography>
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
            <MapaComedores
              comedores={comedoresFiltrados}
              comedorSeleccionado={comedorSeleccionado}
              onComedorClick={handleComedorClick}
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
            <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}>
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
            const cantidadFiltros = filtrosSeleccionados[categoria.id]?.length || 0;

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
