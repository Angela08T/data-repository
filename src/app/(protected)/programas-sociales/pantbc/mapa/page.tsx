"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Box, IconButton, Typography, Drawer, Button, Accordion, AccordionSummary,
  AccordionDetails, FormGroup, FormControlLabel, Checkbox, Divider, Badge,
  Tooltip, Slider, Popover, Chip, Paper, Avatar, Switch,
} from "@mui/material";
import {
  FilterList, Refresh, ExpandMore, Close, Map as MapIcon, Layers,
  TuneRounded, Place, Person, Phone, Group, Edit, MoreVert,
  Visibility, VisibilityOff, Favorite, ShoppingBasket,
} from "@mui/icons-material";
import type { EstablecimientoPANTBC } from "./MapaPANTBC";

const MapaPANTBC = dynamic(() => import("./MapaPANTBC"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>
  ),
});

const JURISDICCIONES_MAPA = [
  { id: 1, name: "ZARATE" }, { id: 2, name: "CAMPOY" }, { id: 3, name: "MANGOMARCA" },
  { id: 4, name: "HUAYRONA" }, { id: 5, name: "CANTO REY" }, { id: 6, name: "HUANCARAY" },
  { id: 7, name: "MARISCAL CACERES" }, { id: 8, name: "MOTUPE" }, { id: 9, name: "JICAMARCA" },
  { id: 10, name: "BAYOVAR" }, { id: 11, name: "CANTO GRANDE" }, { id: 12, name: "SAN HILARION" },
];

const FILTROS_CONFIG = [
  { id: "estado", label: "Estado", opciones: [{ id: "activo", label: "Activo" }, { id: "inactivo", label: "Inactivo" }] },
  { id: "beneficiarios", label: "Beneficiarios", opciones: [{ id: "menos50", label: "Menos de 50" }, { id: "50-100", label: "50 - 100" }, { id: "mas100", label: "Más de 100" }] },
];

const ESTABLECIMIENTOS_EJEMPLO: EstablecimientoPANTBC[] = [
  { id: "1", codigo: "PANTBC-001", nombre: "Centro de Salud Zarate", direccion: "Av. Próceres 1234, Zarate", jurisdiccion: "ZARATE", coordenadas: { latitud: -11.9650, longitud: -76.9950 }, beneficiarios: 85, canastasEntregadas: 340, responsable: { nombre: "Dr. Miguel Ángel Rojas", telefono: "987654321" }, estado: "activo" },
  { id: "2", codigo: "PANTBC-002", nombre: "Posta Médica Campoy", direccion: "Jr. Los Jazmines 456, Campoy", jurisdiccion: "CAMPOY", coordenadas: { latitud: -11.9720, longitud: -76.9900 }, beneficiarios: 62, canastasEntregadas: 248, responsable: { nombre: "Dra. Carmen Luz Mendoza", telefono: "912345678" }, estado: "activo" },
  { id: "3", codigo: "PANTBC-003", nombre: "Centro PANTBC Mangomarca", direccion: "Calle Los Rosales 789, Mangomarca", jurisdiccion: "MANGOMARCA", coordenadas: { latitud: -11.9680, longitud: -77.0020 }, beneficiarios: 78, canastasEntregadas: 312, responsable: { nombre: "Dr. Juan Pablo Torres", telefono: "945678123" }, estado: "activo" },
  { id: "4", codigo: "PANTBC-004", nombre: "Puesto de Salud Canto Rey", direccion: "Av. Central 321, Canto Rey", jurisdiccion: "CANTO REY", coordenadas: { latitud: -11.9750, longitud: -76.9850 }, beneficiarios: 45, canastasEntregadas: 180, responsable: { nombre: "Dra. Ana María Sánchez", telefono: "956789234" }, estado: "activo" },
  { id: "5", codigo: "PANTBC-005", nombre: "Centro de Salud Huayrona", direccion: "Jr. Las Palmeras 654, Huayrona", jurisdiccion: "HUAYRONA", coordenadas: { latitud: -11.9630, longitud: -77.0080 }, beneficiarios: 30, canastasEntregadas: 120, responsable: { nombre: "Dr. Roberto Castillo", telefono: "967890345" }, estado: "inactivo" },
];

const LIMITE_OPCIONES = [50, 100, 200, 500];

export default function PANTBCMapaPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filtrosSeleccionados, setFiltrosSeleccionados] = useState<Record<string, string[]>>({});
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>("estado");
  const [jurisdiccionesSeleccionadas, setJurisdiccionesSeleccionadas] = useState<number[]>([]);
  const [limiteVisible, setLimiteVisible] = useState(100);
  const [limiteAnchorEl, setLimiteAnchorEl] = useState<HTMLElement | null>(null);
  const [capasAnchorEl, setCapasAnchorEl] = useState<HTMLElement | null>(null);
  const [capasVisibles, setCapasVisibles] = useState({ sectores: true, jurisdicciones: false, establecimientos: true });
  const [establecimientoSeleccionado, setEstablecimientoSeleccionado] = useState<EstablecimientoPANTBC | null>(null);

  const capasPopoverOpen = Boolean(capasAnchorEl);
  const limitePopoverOpen = Boolean(limiteAnchorEl);
  const establecimientos = ESTABLECIMIENTOS_EJEMPLO;
  const loading = false;

  const establecimientosFiltrados = establecimientos.filter((est) => {
    if (jurisdiccionesSeleccionadas.length > 0) {
      const jurisdiccionId = JURISDICCIONES_MAPA.find(j => j.name === est.jurisdiccion)?.id;
      if (!jurisdiccionId || !jurisdiccionesSeleccionadas.includes(jurisdiccionId)) return false;
    }
    const estadosFiltro = filtrosSeleccionados["estado"] || [];
    if (estadosFiltro.length > 0 && !estadosFiltro.includes(est.estado)) return false;
    return true;
  });

  const totalFiltrados = establecimientosFiltrados.length;
  const establecimientosMostrados = Math.min(limiteVisible, totalFiltrados);
  const contarFiltrosActivos = () => Object.values(filtrosSeleccionados).reduce((acc, arr) => acc + arr.length, 0) + (jurisdiccionesSeleccionadas.length > 0 ? 1 : 0);
  const hayFiltrosActivos = () => contarFiltrosActivos() > 0;
  const handleFilterChange = (categoriaId: string, opcionId: string, checked: boolean) => {
    setFiltrosSeleccionados((prev) => {
      const current = prev[categoriaId] || [];
      if (checked) return { ...prev, [categoriaId]: [...current, opcionId] };
      return { ...prev, [categoriaId]: current.filter((id) => id !== opcionId) };
    });
  };
  const limpiarFiltros = () => { setFiltrosSeleccionados({}); setJurisdiccionesSeleccionadas([]); };
  const handleJurisdiccionToggle = (jurisdiccionId: number) => {
    setJurisdiccionesSeleccionadas((prev) => prev.includes(jurisdiccionId) ? prev.filter((c) => c !== jurisdiccionId) : [...prev, jurisdiccionId]);
  };
  const filtrosActivos = contarFiltrosActivos();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px + 32px)", marginLeft: "-16px", marginRight: "-16px", marginBottom: "-16px", marginTop: "-16px", overflow: "hidden", "@media (min-width: 768px)": { height: "calc(100vh - 64px + 48px)", marginLeft: "-24px", marginRight: "-24px", marginBottom: "-24px", marginTop: "-24px" } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "white", borderBottom: "1px solid", borderColor: "divider", zIndex: 10 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MapIcon sx={{ color: "#f44336" }} />
          <Typography variant="h6" fontWeight="bold">Mapa PANTBC</Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", bgcolor: "grey.100", px: 2, py: 0.5, borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando <strong>{establecimientosMostrados}</strong> de <strong>{totalFiltrados}</strong> establecimientos
              {hayFiltrosActivos() && totalFiltrados < establecimientos.length && <Typography component="span" variant="caption" sx={{ ml: 1, color: "#f44336" }}>(filtrado de {establecimientos.length})</Typography>}
            </Typography>
          </Box>
          <Tooltip title="Ajustar cantidad visible">
            <Box onClick={(e) => setLimiteAnchorEl(e.currentTarget)} sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "#f44336", color: "white", px: 1.5, py: 0.5, borderRadius: 1, cursor: "pointer", "&:hover": { bgcolor: "#d32f2f" } }}>
              <TuneRounded fontSize="small" />
              <Typography variant="body2" fontWeight="medium">{limiteVisible}</Typography>
            </Box>
          </Tooltip>
          <Popover open={limitePopoverOpen} anchorEl={limiteAnchorEl} onClose={() => setLimiteAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} transformOrigin={{ vertical: "top", horizontal: "center" }}>
            <Box sx={{ p: 2, width: 300 }}>
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>Límite de visualización</Typography>
              <Box sx={{ px: 1 }}><Slider value={Math.min(limiteVisible, totalFiltrados)} onChange={(_, value) => setLimiteVisible(value as number)} min={10} max={totalFiltrados || 500} step={10} valueLabelDisplay="auto" sx={{ color: "#f44336" }} /></Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                {LIMITE_OPCIONES.filter(op => op <= (totalFiltrados || 500)).map((opcion) => (<Chip key={opcion} label={opcion} size="small" onClick={() => setLimiteVisible(opcion)} sx={{ bgcolor: limiteVisible === opcion ? "#f44336" : "grey.200", color: limiteVisible === opcion ? "white" : "text.primary" }} />))}
                <Chip label={`Todos (${totalFiltrados})`} size="small" onClick={() => setLimiteVisible(totalFiltrados || 500)} sx={{ bgcolor: limiteVisible >= totalFiltrados ? "#f44336" : "grey.200", color: limiteVisible >= totalFiltrados ? "white" : "text.primary" }} />
              </Box>
            </Box>
          </Popover>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Actualizar"><IconButton size="small"><Refresh /></IconButton></Tooltip>
          <Tooltip title="Filtros">
            <IconButton size="small" onClick={() => setFilterOpen(true)} sx={{ bgcolor: filtrosActivos > 0 ? "#f44336" : "transparent", color: filtrosActivos > 0 ? "white" : "inherit", "&:hover": { bgcolor: filtrosActivos > 0 ? "#d32f2f" : "action.hover" } }}>
              <Badge badgeContent={filtrosActivos} color="error"><FilterList /></Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Capas"><IconButton size="small" onClick={(e) => setCapasAnchorEl(e.currentTarget)} sx={{ bgcolor: capasPopoverOpen ? "grey.200" : "transparent" }}><Layers /></IconButton></Tooltip>
          <Popover open={capasPopoverOpen} anchorEl={capasAnchorEl} onClose={() => setCapasAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" } }}>
            <Box sx={{ width: 280 }}>
              <Box sx={{ bgcolor: "#1E293B", color: "white", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}><Layers fontSize="small" /><Typography variant="subtitle2" fontWeight="bold">Control de Capas</Typography></Box>
              <Box sx={{ p: 1 }}>
                {[{ key: "sectores", label: "Comunas", desc: "Sectores del distrito", color: "#f44336" }, { key: "jurisdicciones", label: "Jurisdicciones", desc: "Límites territoriales", color: "#34b429" }, { key: "establecimientos", label: "Establecimientos", desc: "Centros de salud", color: "#1E293B" }].map((capa) => (
                  <Box key={capa.key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: capa.key === "establecimientos" ? "50%" : 1, bgcolor: capa.color, display: "flex", alignItems: "center", justifyContent: "center", opacity: capasVisibles[capa.key as keyof typeof capasVisibles] ? 1 : 0.4 }}>
                        {capa.key === "establecimientos" ? <Favorite sx={{ fontSize: 18, color: "white" }} /> : <Box sx={{ width: 16, height: 16, bgcolor: "rgba(255,255,255,0.9)", borderRadius: 0.5 }} />}
                      </Box>
                      <Box><Typography variant="body2" fontWeight="medium">{capa.label}</Typography><Typography variant="caption" color="text.secondary">{capa.desc}</Typography></Box>
                    </Box>
                    <Switch size="small" checked={capasVisibles[capa.key as keyof typeof capasVisibles]} onChange={(e) => setCapasVisibles(prev => ({ ...prev, [capa.key]: e.target.checked }))} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: capa.color }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: capa.color } }} />
                  </Box>
                ))}
              </Box>
              <Divider />
              <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
                <Button size="small" variant="outlined" fullWidth onClick={() => setCapasVisibles({ sectores: true, jurisdicciones: true, establecimientos: true })} startIcon={<Visibility sx={{ fontSize: 16 }} />} sx={{ textTransform: "none", borderColor: "grey.300", color: "text.secondary" }}>Mostrar todas</Button>
                <Button size="small" variant="outlined" fullWidth onClick={() => setCapasVisibles({ sectores: false, jurisdicciones: false, establecimientos: false })} startIcon={<VisibilityOff sx={{ fontSize: 16 }} />} sx={{ textTransform: "none", borderColor: "grey.300", color: "text.secondary" }}>Ocultar todas</Button>
              </Box>
            </Box>
          </Popover>
        </Box>
      </Box>

      {/* Mapa */}
      <Box sx={{ flex: 1, position: "relative", display: "flex" }}>
        {establecimientoSeleccionado && (
          <Paper elevation={4} sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 350, zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Box sx={{ bgcolor: "#f44336", color: "white", p: 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box sx={{ flex: 1, pr: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{establecimientoSeleccionado.nombre}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Código: {establecimientoSeleccionado.codigo}</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <IconButton size="small" sx={{ color: "white" }}><Edit fontSize="small" /></IconButton>
                <IconButton size="small" sx={{ color: "white" }}><MoreVert fontSize="small" /></IconButton>
                <IconButton size="small" sx={{ color: "white" }} onClick={() => setEstablecimientoSeleccionado(null)}><Close fontSize="small" /></IconButton>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
              <Box sx={{ mb: 2 }}><Box sx={{ display: "inline-block", px: 1.5, py: 0.5, borderRadius: "12px", backgroundColor: establecimientoSeleccionado.estado === "activo" ? "#dcfce7" : "#fee2e2", color: establecimientoSeleccionado.estado === "activo" ? "#166534" : "#991b1b", fontSize: "0.75rem", fontWeight: 600 }}>{establecimientoSeleccionado.estado === "activo" ? "ACTIVO" : "INACTIVO"}</Box></Box>
              <Box sx={{ mb: 3 }}><Typography variant="overline" color="text.secondary" fontWeight="bold">Dirección</Typography><Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 0.5 }}><Place fontSize="small" color="action" /><Typography variant="body2">{establecimientoSeleccionado.direccion}</Typography></Box><Typography variant="caption" color="text.secondary" sx={{ ml: 3.5 }}>Jurisdicción: {establecimientoSeleccionado.jurisdiccion}</Typography></Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 3 }}><Typography variant="overline" color="text.secondary" fontWeight="bold">Responsable</Typography><Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}><Avatar sx={{ bgcolor: "#1E293B", width: 40, height: 40 }}><Person /></Avatar><Box><Typography variant="body2" fontWeight="medium">{establecimientoSeleccionado.responsable.nombre}</Typography><Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Phone fontSize="inherit" sx={{ color: "text.secondary", fontSize: 14 }} /><Typography variant="caption" color="text.secondary">{establecimientoSeleccionado.responsable.telefono}</Typography></Box></Box></Box></Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 3 }}><Typography variant="overline" color="text.secondary" fontWeight="bold">Estadísticas</Typography><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1 }}><Box sx={{ bgcolor: "#ffebee", p: 1.5, borderRadius: 1, textAlign: "center" }}><Group sx={{ color: "#f44336", mb: 0.5 }} /><Typography variant="h5" fontWeight="bold" color="#f44336">{establecimientoSeleccionado.beneficiarios}</Typography><Typography variant="caption" color="text.secondary">Beneficiarios</Typography></Box><Box sx={{ bgcolor: "#fff3e0", p: 1.5, borderRadius: 1, textAlign: "center" }}><ShoppingBasket sx={{ color: "#ff9800", mb: 0.5 }} /><Typography variant="h5" fontWeight="bold" color="#ff9800">{establecimientoSeleccionado.canastasEntregadas}</Typography><Typography variant="caption" color="text.secondary">Canastas</Typography></Box></Box></Box>
              <Box sx={{ bgcolor: "grey.50", p: 1.5, borderRadius: 1 }}><Typography variant="caption" color="text.secondary"><strong>Coordenadas:</strong> {establecimientoSeleccionado.coordenadas.latitud.toFixed(6)}, {establecimientoSeleccionado.coordenadas.longitud.toFixed(6)}</Typography></Box>
            </Box>
          </Paper>
        )}
        <Box sx={{ flex: 1, position: "relative" }}>
          {loading ? (<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></Box>) : (
            <MapaPANTBC establecimientos={establecimientosFiltrados} establecimientoSeleccionado={establecimientoSeleccionado} onEstablecimientoClick={setEstablecimientoSeleccionado} limiteVisible={limiteVisible} filterOpen={filterOpen} capasVisibles={capasVisibles} />
          )}
        </Box>
      </Box>

      {/* Drawer */}
      <Drawer anchor="right" open={filterOpen} onClose={() => setFilterOpen(false)} PaperProps={{ sx: { width: 320, maxWidth: "100%" } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, borderBottom: "1px solid", borderColor: "divider" }}><Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><FilterList /><Typography variant="h6" fontWeight="bold">Filtros</Typography></Box><IconButton size="small" onClick={() => setFilterOpen(false)}><Close /></IconButton></Box>
        <Box sx={{ display: "flex", gap: 1, p: 2, borderBottom: "1px solid", borderColor: "divider" }}><Button variant="outlined" fullWidth onClick={limpiarFiltros} disabled={filtrosActivos === 0}>LIMPIAR</Button><Button variant="contained" fullWidth onClick={() => setFilterOpen(false)} sx={{ bgcolor: "#f44336", "&:hover": { bgcolor: "#d32f2f" } }}>APLICAR</Button></Box>
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {FILTROS_CONFIG.map((categoria) => (
            <Accordion key={categoria.id} expanded={expandedAccordion === categoria.id} onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? categoria.id : false)} disableGutters elevation={0} sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}>
              <AccordionSummary expandIcon={<ExpandMore />}><Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Typography fontWeight="medium">{categoria.label}</Typography>{(filtrosSeleccionados[categoria.id]?.length || 0) > 0 && <Box sx={{ bgcolor: "#f44336", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{filtrosSeleccionados[categoria.id]?.length}</Box>}</Box></AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}><FormGroup>{categoria.opciones.map((opcion) => (<FormControlLabel key={opcion.id} control={<Checkbox size="small" checked={filtrosSeleccionados[categoria.id]?.includes(opcion.id) || false} onChange={(e) => handleFilterChange(categoria.id, opcion.id, e.target.checked)} sx={{ color: "#f44336", "&.Mui-checked": { color: "#f44336" } }} />} label={<Typography variant="body2">{opcion.label}</Typography>} />))}</FormGroup></AccordionDetails>
            </Accordion>
          ))}
          <Accordion expanded={expandedAccordion === "jurisdicciones"} onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? "jurisdicciones" : false)} disableGutters elevation={0} sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}>
            <AccordionSummary expandIcon={<ExpandMore />}><Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Typography fontWeight="medium">Jurisdicciones</Typography>{jurisdiccionesSeleccionadas.length > 0 && <Box sx={{ bgcolor: "#0369a1", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{jurisdiccionesSeleccionadas.length}</Box>}</Box></AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5, maxHeight: 280, overflowY: "auto" }}>{JURISDICCIONES_MAPA.map((jurisdiccion) => (<FormControlLabel key={jurisdiccion.id} control={<Checkbox size="small" checked={jurisdiccionesSeleccionadas.includes(jurisdiccion.id)} onChange={() => handleJurisdiccionToggle(jurisdiccion.id)} sx={{ color: "#0369a1", "&.Mui-checked": { color: "#0369a1" }, py: 0.25 }} />} label={<Typography variant="caption" sx={{ fontSize: "0.7rem" }}>{jurisdiccion.name}</Typography>} sx={{ mr: 0 }} />))}</Box></AccordionDetails>
          </Accordion>
        </Box>
      </Drawer>
    </Box>
  );
}
