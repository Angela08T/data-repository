"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

interface UseExcelExportReturn {
  isExporting: boolean;
  exportar: (data: Record<string, unknown>[], filename: string, sheetName?: string) => void;
}

/**
 * Hook para exportar datos a Excel con XLSX.
 *
 * Uso:
 * ```tsx
 * const { isExporting, exportar } = useExcelExport();
 *
 * const handleExport = () => {
 *   const rows = data.map(item => ({ "Nombre": item.nombre, "Edad": item.edad }));
 *   exportar(rows, "mi_archivo", "Hoja1");
 * };
 * ```
 */
export function useExcelExport(): UseExcelExportReturn {
  const [isExporting, setIsExporting] = useState(false);

  const exportar = (
    data: Record<string, unknown>[],
    filename: string,
    sheetName: string = "Datos"
  ) => {
    if (!data || data.length === 0) return;

    setIsExporting(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Ancho automático de columnas (22 caracteres por defecto)
      const keys = Object.keys(data[0] || {});
      worksheet["!cols"] = keys.map(() => ({ wch: 22 }));

      const fecha = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `${filename}_${fecha}.xlsx`);
    } catch (error) {
      console.error("Error exportando a Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, exportar };
}
