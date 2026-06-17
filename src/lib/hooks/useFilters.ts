"use client";

import { useState } from "react";

export type FilterType = "edad" | "cumpleanos" | "telefono" | "sexo" | "genero";
export type CumpleanosModo = "mes" | "dia";

export interface UseFiltersReturn {
  // Anchor del Popover de filtros
  filterAnchor: HTMLButtonElement | null;
  filterOpen: boolean;
  // Tipo de filtro activo en el Popover
  filterType: FilterType;
  // Rango de edad
  edadRange: number[];
  // Cumpleaños
  cumpleanosModo: CumpleanosModo;
  mesSeleccionado: number | null;
  diaCumpleanos: string;
  // Teléfono (draft = pendiente de aplicar)
  filtroTelefono: "" | "con" | "sin";
  filtroTelefonoDraft: "" | "con" | "sin";
  // Sexo (draft = pendiente de aplicar)
  filtroSexo: "" | "MALE" | "FEMALE";
  filtroSexoDraft: "" | "MALE" | "FEMALE";
  // Setters
  setFilterType: (t: FilterType) => void;
  setEdadRange: (r: number[]) => void;
  setCumpleanosModo: (m: CumpleanosModo) => void;
  setMesSeleccionado: (m: number | null) => void;
  setDiaCumpleanos: (d: string) => void;
  setFiltroTelefono: (v: "" | "con" | "sin") => void;
  setFiltroTelefonoDraft: (v: "" | "con" | "sin") => void;
  setFiltroSexo: (v: "" | "MALE" | "FEMALE") => void;
  setFiltroSexoDraft: (v: "" | "MALE" | "FEMALE") => void;
  // Handlers
  handleFilterClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleFilterClose: () => void;
  handleApplyFilters: () => void;
  limpiarFiltros: () => void;
}

interface UseFiltersOptions {
  edadMin?: number;
  edadMax?: number;
  onApply?: () => void;
}

export function useFilters(options: UseFiltersOptions = {}): UseFiltersReturn {
  const { edadMin = 0, edadMax = 120, onApply } = options;

  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("edad");
  const [edadRange, setEdadRange] = useState<number[]>([edadMin, edadMax]);
  const [cumpleanosModo, setCumpleanosModo] = useState<CumpleanosModo>("mes");
  const [mesSeleccionado, setMesSeleccionado] = useState<number | null>(null);
  const [diaCumpleanos, setDiaCumpleanos] = useState<string>("");
  const [filtroTelefono, setFiltroTelefono] = useState<"" | "con" | "sin">("");
  const [filtroTelefonoDraft, setFiltroTelefonoDraft] = useState<"" | "con" | "sin">("");
  const [filtroSexo, setFiltroSexo] = useState<"" | "MALE" | "FEMALE">("");
  const [filtroSexoDraft, setFiltroSexoDraft] = useState<"" | "MALE" | "FEMALE">("");

  const filterOpen = Boolean(filterAnchor);

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const handleApplyFilters = () => {
    setFiltroTelefono(filtroTelefonoDraft);
    setFiltroSexo(filtroSexoDraft);
    setFilterAnchor(null);
    onApply?.();
  };

  const limpiarFiltros = () => {
    setEdadRange([edadMin, edadMax]);
    setMesSeleccionado(null);
    setDiaCumpleanos("");
    setCumpleanosModo("mes");
    setFiltroTelefono("");
    setFiltroTelefonoDraft("");
    setFiltroSexo("");
    setFiltroSexoDraft("");
    setFilterAnchor(null);
    onApply?.();
  };

  return {
    filterAnchor,
    filterOpen,
    filterType,
    edadRange,
    cumpleanosModo,
    mesSeleccionado,
    diaCumpleanos,
    filtroTelefono,
    filtroTelefonoDraft,
    filtroSexo,
    filtroSexoDraft,
    setFilterType,
    setEdadRange,
    setCumpleanosModo,
    setMesSeleccionado,
    setDiaCumpleanos,
    setFiltroTelefono,
    setFiltroTelefonoDraft,
    setFiltroSexo,
    setFiltroSexoDraft,
    handleFilterClick,
    handleFilterClose,
    handleApplyFilters,
    limpiarFiltros,
  };
}
