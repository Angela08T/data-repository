"use client";

import { useState } from "react";
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
  Edit,
  MoreVert,
  Visibility,
  VisibilityOff,
  Elderly,
  Event,
} from "@mui/icons-material";
import type { CentroCIAM } from "./MapaCIAM";

const MapaCIAM = dynamic(() => import("./MapaCIAM"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  ),
});

const JURISDICCIONES_MAPA = [
  { id: 1, name: "ZARATE" },
  { id: 2, name: "CAMPOY" },
  { id: 3, name: "MANGOMARCA" },
  { id: 4, name: "HUAYRONA" },
  { id: 5, name: "CANTO REY" },
  { id: 6, name: "HUANCARAY" },
  { id: 7, name: "MARISCAL CACERES" },
  { id: 8, name: "MOTUPE" },
  { id: 9, name: "JICAMARCA" },
  { id: 10, name: "BAYOVAR" },
  { id: 11, name: "CANTO GRANDE" },
  { id: 12, name: "SAN HILARION" },
];

const FILTROS_CONFIG = [
  {
    id: "estado",
    label: "Estado",
    opciones: [
      { id: "activo", label: "Activo" },
      { id: "inactivo", label: "Inactivo" },
    ],
  },
  {
    id: "capacidad",
    label: "Capacidad",
    opciones: [
      { id: "menos50", label: "Menos de 50" },
      { id: "50-100", label: "50 - 100" },
      { id: "mas100", label: "Más de 100" },
    ],
  },
];

// Datos de ejemplo
const CENTROS_EJEMPLO: CentroCIAM[] = [
  {
    id: "1",
    codigo: "CIAM-001",
    nombre: "CIAM San Juan de Lurigancho",
    direccion: "Av. Próceres 1234, Zarate",
    jurisdiccion: "ZARATE",
    coordenadas: { latitud: -11.9650, longitud: -76.9950 },
    adultosMayores: 120,
    actividades: 8,
    responsable: { nombre: "Elena Rodríguez Vargas", telefono: "987654321" },
    estado: "activo",
  },
  {
    id: "2",
    codigo: "CIAM-002",
    nombre: "Centro Adulto Mayor Campoy",
    direccion: "Jr. Los Jazmines 456, Campoy",
    jurisdiccion: "CAMPOY",
    coordenadas: { latitud: -11.9720, longitud: -76.9900 },
    adultosMayores: 85,
    actividades: 6,
    responsable: { nombre: "Carlos Mendoza Quispe", telefono: "912345678" },
    estado: "activo",
  },
  {
    id: "3",
    codigo: "CIAM-003",
    nombre: "CIAM Mangomarca",
    direccion: "Calle Los Rosales 789, Mangomarca",
    jurisdiccion: "MANGOMARCA",
    coordenadas: { latitud: -11.9680, longitud: -77.0020 },
    adultosMayores: 95,
    actividades: 10,
    responsable: { nombre: "María Huamán Torres", telefono: "945678123" },
    estado: "activo",
  },
  {
    id: "4",
    codigo: "CIAM-004",
    nombre: "Centro Integral Canto Rey",
    direccion: "Av. Central 321, Canto Rey",
    jurisdiccion: "CANTO REY",
    coordenadas: { latitud: -11.9750, longitud: -76.9850 },
    adultosMayores: 70,
    actividades: 5,
    responsable: { nombre: "Pedro Pérez Sánchez", telefono: "956789234" },
    estado: "activo",
  },
  {
    id: "5",
    codigo: "CIAM-005",
    nombre: "CIAM Huayrona",
    direccion: "Jr. Las Palmeras 654, Huayrona",
    jurisdiccion: "HUAYRONA",
    coordenadas: { latitud: -11.9630, longitud: -77.0080 },
    adultosMayores: 45,
    actividades: 4,
    responsable: { nombre: "Ana Castillo Ramos", telefono: "967890345" },
    estado: "inactivo",
  },
];

const LIMITE_OPCIONES = [50, 100, 200, 500];

export default function CIAMMapaPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filtrosSeleccionados, setFiltrosSeleccionados] = useState<Record<string, string[]>>({});
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>("estado");
  const [jurisdiccionesSeleccionadas, setJurisdiccionesSeleccionadas] = useState<number[]>([]);
  const [limiteVisible, setLimiteVisible] = useState(100);
  const [limiteAnchorEl, setLimiteAnchorEl] = useState<HTMLElement | null>(null);
  const [capasAnchorEl, setCapasAnchorEl] = useState<HTMLElement | null>(null);
  const [capasVisibles, setCapasVisibles] = useState({
    sectores: true,
    jurisdicciones: false,
    centros: true,
  });
  const [centroSeleccionado, setCentroSeleccionado] = useState<CentroCIAM | null>(null);

  const capasPopoverOpen = Boolean(capasAnchorEl);
  const limitePopoverOpen = Boolean(limiteAnchorEl);

  const centros = CENTROS_EJEMPLO;
  const loading = false;

  const centrosFiltrados = centros.filter((centro) => {
    if (jurisdiccionesSeleccionadas.length > 0) {
      const jurisdiccionId = JURISDICCIONES_MAPA.find(j => j.name === centro.jurisdiccion)?.id;
      if (!jurisdiccionId || !jurisdiccionesSeleccionadas.includes(jurisdiccionId)) return false;
    }
    const estadosFiltro = filtrosSeleccionados["estado"] || [];
    if (estadosFiltro.length > 0 && !estadosFiltro.includes(centro.estado)) return false;
    return true;
  });

  const totalFiltrados = centrosFiltrados.length;
  const centrosMostrados = Math.min(limiteVisible, totalFiltrados);

  const contarFiltrosActivos = () => {
    const filtrosBasicos = Object.values(filtrosSeleccionados).reduce((acc, arr) => acc + arr.length, 0);
    return filtrosBasicos + (jurisdiccionesSeleccionadas.length > 0 ? 1 : 0);
  };

  const hayFiltrosActivos = () => contarFiltrosActivos() > 0;

  const handleFilterChange = (categoriaId: string, opcionId: string, checked: boolean) => {
    setFiltrosSeleccionados((prev) => {
      const current = prev[categoriaId] || [];
      if (checked) return { ...prev, [categoriaId]: [...current, opcionId] };
      return { ...prev, [categoriaId]: current.filter((id) => id !== opcionId) };
    });
  };

  const limpiarFiltros = () => {
    setFiltrosSeleccionados({});
    setJurisdiccionesSeleccionadas([]);
  };

  const handleJurisdiccionToggle = (jurisdiccionId: number) => {
    setJurisdiccionesSeleccionadas((prev) =>
      prev.includes(jurisdiccionId) ? prev.filter((c) => c !== jurisdiccionId) : [...prev, jurisdiccionId]
    );
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
      {/* Header */}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MapIcon sx={{ color: "#9c27b0" }} />
          <Typography variant="h6" fontWeight="bold">Mapa CIAM</Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", bgcolor: "grey.100", px: 2, py: 0.5, borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando <strong>{centrosMostrados}</strong> de <strong>{totalFiltrados}</strong> centros
              {hayFiltrosActivos() && totalFiltrados < centros.length && (
                <Typography component="span" variant="caption" sx={{ ml: 1, color: "#9c27b0" }}>
                  (filtrado de {centros.length})
                </Typography>
              )}
            </Typography>
          </Box>

          <Tooltip title="Ajustar cantidad visible">
            <Box
              onClick={(e) => setLimiteAnchorEl(e.currentTarget)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "#9c27b0",
                color: "white",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": { bgcolor: "#7b1fa2" },
              }}
            >
              <TuneRounded fontSize="small" />
              <Typography variant="body2" fontWeight="medium">{limiteVisible}</Typography>
            </Box>
          </Tooltip>

          <Popover
            open={limitePopoverOpen}
            anchorEl={limiteAnchorEl}
            onClose={() => setLimiteAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Box sx={{ p: 2, width: 300 }}>
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>Límite de visualización</Typography>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={Math.min(limiteVisible, totalFiltrados)}
                  onChange={(_, value) => setLimiteVisible(value as number)}
                  min={10}
                  max={totalFiltrados || 500}
                  step={10}
                  valueLabelDisplay="auto"
                  sx={{ color: "#9c27b0" }}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                {LIMITE_OPCIONES.filter(op => op <= (totalFiltrados || 500)).map((opcion) => (
                  <Chip
                    key={opcion}
                    label={opcion}
                    size="small"
                    onClick={() => setLimiteVisible(opcion)}
                    sx={{
                      bgcolor: limiteVisible === opcion ? "#9c27b0" : "grey.200",
                      color: limiteVisible === opcion ? "white" : "text.primary",
                    }}
                  />
                ))}
                <Chip
                  label={`Todos (${totalFiltrados})`}
                  size="small"
                  onClick={() => setLimiteVisible(totalFiltrados || 500)}
                  sx={{
                    bgcolor: limiteVisible >= totalFiltrados ? "#9c27b0" : "grey.200",
                    color: limiteVisible >= totalFiltrados ? "white" : "text.primary",
                  }}
                />
              </Box>
            </Box>
          </Popover>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Actualizar">
            <IconButton size="small"><Refresh /></IconButton>
          </Tooltip>
          <Tooltip title="Filtros">
            <IconButton
              size="small"
              onClick={() => setFilterOpen(true)}
              sx={{
                bgcolor: filtrosActivos > 0 ? "#9c27b0" : "transparent",
                color: filtrosActivos > 0 ? "white" : "inherit",
                "&:hover": { bgcolor: filtrosActivos > 0 ? "#7b1fa2" : "action.hover" },
              }}
            >
              <Badge badgeContent={filtrosActivos} color="error"><FilterList /></Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Capas">
            <IconButton
              size="small"
              onClick={(e) => setCapasAnchorEl(e.currentTarget)}
              sx={{ bgcolor: capasPopoverOpen ? "grey.200" : "transparent" }}
            >
              <Layers />
            </IconButton>
          </Tooltip>

          <Popover
            open={capasPopoverOpen}
            anchorEl={capasAnchorEl}
            onClose={() => setCapasAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" } }}
          >
            <Box sx={{ width: 280 }}>
              <Box sx={{ bgcolor: "#1E293B", color: "white", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <Layers fontSize="small" />
                <Typography variant="subtitle2" fontWeight="bold">Control de Capas</Typography>
              </Box>
              <Box sx={{ p: 1 }}>
                {[
                  { key: "sectores", label: "Comunas", desc: "Sectores del distrito", color: "#9c27b0" },
                  { key: "jurisdicciones", label: "Jurisdicciones", desc: "Límites territoriales", color: "#34b429" },
                  { key: "centros", label: "Centros CIAM", desc: "Ubicación de centros", color: "#1E293B" },
                ].map((capa) => (
                  <Box
                    key={capa.key}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: capa.key === "centros" ? "50%" : 1,
                          bgcolor: capa.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: capasVisibles[capa.key as keyof typeof capasVisibles] ? 1 : 0.4,
                        }}
                      >
                        {capa.key === "centros" ? (
                          <Elderly sx={{ fontSize: 18, color: "white" }} />
                        ) : (
                          <Box sx={{ width: 16, height: 16, bgcolor: "rgba(255,255,255,0.9)", borderRadius: 0.5 }} />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">{capa.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{capa.desc}</Typography>
                      </Box>
                    </Box>
                    <Switch
                      size="small"
                      checked={capasVisibles[capa.key as keyof typeof capasVisibles]}
                      onChange={(e) => setCapasVisibles(prev => ({ ...prev, [capa.key]: e.target.checked }))}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: capa.color },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: capa.color },
                      }}
                    />
                  </Box>
                ))}
              </Box>
              <Divider />
              <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={() => setCapasVisibles({ sectores: true, jurisdicciones: true, centros: true })}
                  startIcon={<Visibility sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: "none", borderColor: "grey.300", color: "text.secondary" }}
                >
                  Mostrar todas
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={() => setCapasVisibles({ sectores: false, jurisdicciones: false, centros: false })}
                  startIcon={<VisibilityOff sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: "none", borderColor: "grey.300", color: "text.secondary" }}
                >
                  Ocultar todas
                </Button>
              </Box>
            </Box>
          </Popover>
        </Box>
      </Box>

      {/* Contenedor del mapa */}
      <Box sx={{ flex: 1, position: "relative", display: "flex" }}>
        {centroSeleccionado && (
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
            <Box
              sx={{
                bgcolor: "#9c27b0",
                color: "white",
                p: 2,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ flex: 1, pr: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                  {centroSeleccionado.nombre}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Código: {centroSeleccionado.codigo}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <IconButton size="small" sx={{ color: "white" }}><Edit fontSize="small" /></IconButton>
                <IconButton size="small" sx={{ color: "white" }}><MoreVert fontSize="small" /></IconButton>
                <IconButton size="small" sx={{ color: "white" }} onClick={() => setCentroSeleccionado(null)}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "inline-block",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "12px",
                    backgroundColor: centroSeleccionado.estado === "activo" ? "#dcfce7" : "#fee2e2",
                    color: centroSeleccionado.estado === "activo" ? "#166534" : "#991b1b",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {centroSeleccionado.estado === "activo" ? "ACTIVO" : "INACTIVO"}
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">Dirección</Typography>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 0.5 }}>
                  <Place fontSize="small" color="action" />
                  <Typography variant="body2">{centroSeleccionado.direccion}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 3.5 }}>
                  Jurisdicción: {centroSeleccionado.jurisdiccion}
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">Responsable</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                  <Avatar sx={{ bgcolor: "#1E293B", width: 40, height: 40 }}><Person /></Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">{centroSeleccionado.responsable.nombre}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Phone fontSize="inherit" sx={{ color: "text.secondary", fontSize: 14 }} />
                      <Typography variant="caption" color="text.secondary">{centroSeleccionado.responsable.telefono}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">Estadísticas</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1 }}>
                  <Box sx={{ bgcolor: "#f3e5f5", p: 1.5, borderRadius: 1, textAlign: "center" }}>
                    <Group sx={{ color: "#9c27b0", mb: 0.5 }} />
                    <Typography variant="h5" fontWeight="bold" color="#9c27b0">{centroSeleccionado.adultosMayores}</Typography>
                    <Typography variant="caption" color="text.secondary">Adultos Mayores</Typography>
                  </Box>
                  <Box sx={{ bgcolor: "#e3f2fd", p: 1.5, borderRadius: 1, textAlign: "center" }}>
                    <Event sx={{ color: "#1976d2", mb: 0.5 }} />
                    <Typography variant="h5" fontWeight="bold" color="#1976d2">{centroSeleccionado.actividades}</Typography>
                    <Typography variant="caption" color="text.secondary">Actividades</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ bgcolor: "grey.50", p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Coordenadas:</strong> {centroSeleccionado.coordenadas.latitud.toFixed(6)}, {centroSeleccionado.coordenadas.longitud.toFixed(6)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        <Box sx={{ flex: 1, position: "relative" }}>
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </Box>
          ) : (
            <MapaCIAM
              centros={centrosFiltrados}
              centroSeleccionado={centroSeleccionado}
              onCentroClick={setCentroSeleccionado}
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
            <Typography variant="h6" fontWeight="bold">Filtros</Typography>
          </Box>
          <IconButton size="small" onClick={() => setFilterOpen(false)}><Close /></IconButton>
        </Box>

        <Box sx={{ display: "flex", gap: 1, p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Button variant="outlined" fullWidth onClick={limpiarFiltros} disabled={filtrosActivos === 0}>LIMPIAR</Button>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setFilterOpen(false)}
            sx={{ bgcolor: "#9c27b0", "&:hover": { bgcolor: "#7b1fa2" } }}
          >
            APLICAR
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {FILTROS_CONFIG.map((categoria) => (
            <Accordion
              key={categoria.id}
              expanded={expandedAccordion === categoria.id}
              onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? categoria.id : false)}
              disableGutters
              elevation={0}
              sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography fontWeight="medium">{categoria.label}</Typography>
                  {(filtrosSeleccionados[categoria.id]?.length || 0) > 0 && (
                    <Box
                      sx={{
                        bgcolor: "#9c27b0",
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
                      {filtrosSeleccionados[categoria.id]?.length}
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
                          sx={{ color: "#9c27b0", "&.Mui-checked": { color: "#9c27b0" } }}
                        />
                      }
                      label={<Typography variant="body2">{opcion.label}</Typography>}
                    />
                  ))}
                </FormGroup>
              </AccordionDetails>
            </Accordion>
          ))}

          <Accordion
            expanded={expandedAccordion === "jurisdicciones"}
            onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? "jurisdicciones" : false)}
            disableGutters
            elevation={0}
            sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography fontWeight="medium">Jurisdicciones</Typography>
                {jurisdiccionesSeleccionadas.length > 0 && (
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
                    {jurisdiccionesSeleccionadas.length}
                  </Box>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5, maxHeight: 280, overflowY: "auto" }}>
                {JURISDICCIONES_MAPA.map((jurisdiccion) => (
                  <FormControlLabel
                    key={jurisdiccion.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={jurisdiccionesSeleccionadas.includes(jurisdiccion.id)}
                        onChange={() => handleJurisdiccionToggle(jurisdiccion.id)}
                        sx={{ color: "#0369a1", "&.Mui-checked": { color: "#0369a1" }, py: 0.25 }}
                      />
                    }
                    label={<Typography variant="caption" sx={{ fontSize: "0.7rem" }}>{jurisdiccion.name}</Typography>}
                    sx={{ mr: 0 }}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Drawer>
    </Box>
  );
}
