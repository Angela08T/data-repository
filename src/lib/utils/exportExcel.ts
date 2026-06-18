import * as XLSX from "xlsx";

function autoWidth(ws: XLSX.WorkSheet, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const colWidths = keys.map((k) => {
    const maxLen = Math.max(
      k.length,
      ...rows.map((r) => String(r[k] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws["!cols"] = colWidths;
}

export function exportToExcel(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Datos"
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  autoWidth(ws, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportMultiSheetExcel(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    autoWidth(ws, sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
