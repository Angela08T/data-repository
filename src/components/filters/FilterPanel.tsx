"use client";

import {
  Box,
  Button,
  Divider,
  Popover,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Female, Male, PhoneDisabled, PhoneEnabled } from "@mui/icons-material";
import { MESES_LABELS } from "@/lib/utils/formatters";
import type { CumpleanosModo, FilterType } from "@/lib/hooks/useFilters";

export interface FilterPanelProps {
  // Popover control
  anchor: HTMLButtonElement | null;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;

  // Tipo de filtro activo
  filterType: FilterType;
  onFilterTypeChange: (type: FilterType) => void;

  // Filtros de edad
  showEdad?: boolean;
  edadRange: number[];
  edadMax?: number;
  onEdadChange: (range: number[]) => void;

  // Filtros de cumpleaños
  showCumpleanos?: boolean;
  cumpleanosModo: CumpleanosModo;
  onCumpleanosModoChange: (modo: CumpleanosModo) => void;
  mesSeleccionado: number | null;
  onMesToggle: (index: number) => void;
  diaCumpleanos: string;
  onDiaCumpleanosChange: (dia: string) => void;

  // Filtros de teléfono
  showTelefono?: boolean;
  filtroTelefonoDraft: "" | "con" | "sin";
  onTelefonoDraftChange: (val: "" | "con" | "sin") => void;

  // Filtros de sexo/género
  showGenero?: boolean;
  filtroSexoDraft: "" | "MALE" | "FEMALE";
  onSexoDraftChange: (val: "" | "MALE" | "FEMALE") => void;

  // Color del tema
  accentColor?: string;
  accentBg?: string;
}

export function FilterPanel({
  anchor,
  onClose,
  onApply,
  onClear,
  filterType,
  onFilterTypeChange,
  showEdad = true,
  edadRange,
  edadMax = 120,
  onEdadChange,
  showCumpleanos = true,
  cumpleanosModo,
  onCumpleanosModoChange,
  mesSeleccionado,
  onMesToggle,
  diaCumpleanos,
  onDiaCumpleanosChange,
  showTelefono = true,
  filtroTelefonoDraft,
  onTelefonoDraftChange,
  showGenero = true,
  filtroSexoDraft,
  onSexoDraftChange,
  accentColor = "#475569",
  accentBg = "#f1f5f9",
}: FilterPanelProps) {
  const open = Boolean(anchor);

  const toggleBtnSx = (selectedBg: string, selectedColor: string) => ({
    textTransform: "none" as const,
    fontSize: "0.7rem",
    "&.Mui-selected": {
      backgroundColor: selectedBg,
      color: selectedColor,
      "&:hover": { backgroundColor: selectedBg },
    },
  });

  return (
    <Popover
      open={open}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      sx={{ mt: 1 }}
    >
      <Box sx={{ p: 2.5, width: 320 }}>
        {/* Selector de tipo de filtro */}
        <Typography variant="subtitle2" fontWeight={600} color="#334155" mb={1.5}>
          Tipo de filtro
        </Typography>
        <ToggleButtonGroup
          value={filterType}
          exclusive
          onChange={(_e, v) => v && onFilterTypeChange(v as FilterType)}
          size="small"
          fullWidth
          sx={{ mb: 2.5 }}
        >
          {showEdad && (
            <ToggleButton value="edad" sx={toggleBtnSx(accentBg, accentColor)}>
              Edad
            </ToggleButton>
          )}
          {showCumpleanos && (
            <ToggleButton value="cumpleanos" sx={toggleBtnSx(accentBg, accentColor)}>
              Cumpleaños
            </ToggleButton>
          )}
          {showTelefono && (
            <ToggleButton value="telefono" sx={toggleBtnSx("#dcfce7", "#16a34a")}>
              Teléfono
            </ToggleButton>
          )}
          {showGenero && (
            <ToggleButton value="sexo" sx={toggleBtnSx("#ede9fe", "#7c3aed")}>
              Sexo
            </ToggleButton>
          )}
        </ToggleButtonGroup>

        <Divider sx={{ mb: 2 }} />

        {/* Filtro por edad */}
        {filterType === "edad" && showEdad && (
          <>
            <Typography variant="body2" color="#475569" mb={1.5}>
              Rango de edad
            </Typography>
            <Slider
              value={edadRange}
              onChange={(_e, v) => onEdadChange(v as number[])}
              valueLabelDisplay="auto"
              min={0}
              max={edadMax}
              sx={{ color: accentColor }}
            />
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Typography variant="caption" color="text.secondary">
                {edadRange[0]} años
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {edadRange[1]} años
              </Typography>
            </Box>
          </>
        )}

        {/* Filtro por cumpleaños */}
        {filterType === "cumpleanos" && showCumpleanos && (
          <>
            <Typography variant="body2" color="#475569" mb={1.5}>
              Cumpleaños
            </Typography>
            <ToggleButtonGroup
              value={cumpleanosModo}
              exclusive
              onChange={(_e, v) => v && onCumpleanosModoChange(v)}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="mes" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: accentBg, color: accentColor } }}>
                Por mes
              </ToggleButton>
              <ToggleButton value="dia" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: accentBg, color: accentColor } }}>
                Día específico
              </ToggleButton>
            </ToggleButtonGroup>

            {cumpleanosModo === "mes" ? (
              <>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75 }}>
                  {MESES_LABELS.map((mes, index) => (
                    <Button
                      key={mes}
                      size="small"
                      variant={mesSeleccionado === index ? "contained" : "outlined"}
                      onClick={() => onMesToggle(index)}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.7rem",
                        py: 0.5,
                        px: 1,
                        minWidth: 0,
                        borderColor: mesSeleccionado === index ? accentColor : "#e2e8f0",
                        backgroundColor: mesSeleccionado === index ? accentColor : "transparent",
                        color: mesSeleccionado === index ? "white" : "#64748b",
                        "&:hover": {
                          backgroundColor: mesSeleccionado === index ? accentColor : accentBg,
                          borderColor: accentColor,
                        },
                      }}
                    >
                      {mes.slice(0, 3)}
                    </Button>
                  ))}
                </Box>
                {mesSeleccionado !== null && (
                  <Typography variant="caption" color={accentColor} sx={{ mt: 1, display: "block" }}>
                    Mes seleccionado: {MESES_LABELS[mesSeleccionado]}
                  </Typography>
                )}
              </>
            ) : (
              <TextField
                type="date"
                value={diaCumpleanos}
                onChange={(e) => onDiaCumpleanosChange(e.target.value)}
                fullWidth
                size="small"
                helperText="Filtra por día y mes de nacimiento"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "&.Mui-focused fieldset": { borderColor: accentColor } } }}
              />
            )}
          </>
        )}

        {/* Filtro por teléfono */}
        {filterType === "telefono" && showTelefono && (
          <>
            <Typography variant="body2" color="#475569" mb={1.5}>
              Filtrar por número de celular
            </Typography>
            <ToggleButtonGroup
              value={filtroTelefonoDraft}
              exclusive
              onChange={(_e, val) => { if (val !== null) onTelefonoDraftChange(val); }}
              size="small"
              fullWidth
            >
              <ToggleButton value="" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#f1f5f9", color: "#334155" } }}>
                Todos
              </ToggleButton>
              <ToggleButton value="con" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#dcfce7", color: "#16a34a" } }}>
                <PhoneEnabled sx={{ fontSize: 15, mr: 0.5 }} />Con celular
              </ToggleButton>
              <ToggleButton value="sin" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#fee2e2", color: "#dc2626" } }}>
                <PhoneDisabled sx={{ fontSize: 15, mr: 0.5 }} />Sin celular
              </ToggleButton>
            </ToggleButtonGroup>
          </>
        )}

        {/* Filtro por sexo */}
        {(filterType === "sexo" || filterType === "genero") && showGenero && (
          <>
            <Typography variant="body2" color="#475569" mb={1.5}>
              Filtrar por sexo
            </Typography>
            <ToggleButtonGroup
              value={filtroSexoDraft}
              exclusive
              onChange={(_e, val) => { if (val !== null) onSexoDraftChange(val); }}
              size="small"
              fullWidth
            >
              <ToggleButton value="" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#f1f5f9", color: "#334155" } }}>
                Todos
              </ToggleButton>
              <ToggleButton value="FEMALE" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#fce7f3", color: "#be185d" } }}>
                <Female sx={{ fontSize: 15, mr: 0.5 }} />Mujeres
              </ToggleButton>
              <ToggleButton value="MALE" sx={{ textTransform: "none", fontSize: "0.75rem", "&.Mui-selected": { backgroundColor: "#dbeafe", color: "#1d4ed8" } }}>
                <Male sx={{ fontSize: 15, mr: 0.5 }} />Hombres
              </ToggleButton>
            </ToggleButtonGroup>
          </>
        )}

        {/* Botones de acción */}
        <Box display="flex" justifyContent="flex-end" mt={2.5} gap={1}>
          <Button
            size="small"
            onClick={onClear}
            sx={{ color: "#64748b", textTransform: "none" }}
          >
            Limpiar todo
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={onApply}
            sx={{
              backgroundColor: "#475569",
              textTransform: "none",
              "&:hover": { backgroundColor: "#334155" },
            }}
          >
            Aplicar
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}
