"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Chip, CircularProgress, InputAdornment, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Typography, FormControl, InputLabel, Button,
} from "@mui/material";
import { Refresh, Search } from "@mui/icons-material";
import { useFetch } from "@/lib/hooks/useFetch";
import { formatearFecha } from "@/lib/utils/formatters";

const ACTION_LABELS: Record<string, { label: string; color: "default" | "success" | "error" | "warning" | "info" | "primary" }> = {
  CREATE:  { label: "Crear",     color: "success" },
  UPDATE:  { label: "Actualizar", color: "primary" },
  DELETE:  { label: "Eliminar",  color: "error" },
  RESTORE: { label: "Restaurar", color: "warning" },
  LOGIN:   { label: "Sesión",    color: "info" },
  LOGOUT:  { label: "Logout",    color: "default" },
  GET_ALL: { label: "Consulta",  color: "default" },
  GET_ONE: { label: "Consulta",  color: "default" },
};

const STATUS_COLORS: Record<string, "success" | "error" | "warning"> = {
  SUCCESS: "success",
  FAILED:  "error",
  BLOCKED: "warning",
};

interface AuditRow {
  id: string;
  description: string;
  action: string;
  status: string;
  register_id?: string;
  field?: string;
  preview_content?: string;
  new_content?: string;
  created_at: string;
  user?: { id: string; username: string; name: string; lastname: string };
}

export default function AuditoriaPage() {
  const { getData } = useFetch();

  const [records, setRecords] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        ...(search ? { search } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
      });
      const res = await getData<any>(`audit?${params}`);
      setRecords(res.data?.data ?? []);
      setTotal(res.data?.totalCount ?? 0);
    } catch { /* handled */ } finally { setLoading(false); }
  }, [page, rowsPerPage, search, actionFilter, getData]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Auditoría del Sistema
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small" placeholder="Buscar descripción..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ flexGrow: 1, maxWidth: 300 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Acción</InputLabel>
          <Select label="Acción" value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">Todas</MenuItem>
            {Object.keys(ACTION_LABELS).map((a) => (
              <MenuItem key={a} value={a}>{ACTION_LABELS[a].label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button startIcon={<Refresh />} onClick={fetchAudit} variant="outlined" size="small">
          Actualizar
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell><b>Fecha</b></TableCell>
              <TableCell><b>Usuario</b></TableCell>
              <TableCell><b>Acción</b></TableCell>
              <TableCell><b>Descripción</b></TableCell>
              <TableCell><b>Estado</b></TableCell>
              <TableCell><b>Antes → Después</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={28} sx={{ my: 2 }} /></TableCell></TableRow>
            ) : records.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>Sin registros de auditoría</TableCell></TableRow>
            ) : records.map((r) => {
              const act = ACTION_LABELS[r.action] ?? { label: r.action, color: "default" as const };
              return (
                <TableRow key={r.id}>
                  <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {formatearFecha(r.created_at)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {r.user ? (
                      <><b>{r.user.username}</b><br /><span style={{ color: "#666" }}>{r.user.name} {r.user.lastname}</span></>
                    ) : <span style={{ color: "#999" }}>Sistema</span>}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={act.label} color={act.color} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280, fontSize: 13 }}>
                    {r.description}
                    {r.field && <><br /><span style={{ color: "#888", fontSize: 11 }}>Campo: {r.field}</span></>}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} color={STATUS_COLORS[r.status] ?? "default"} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>
                    {r.preview_content && <><span style={{ color: "#c62828" }}>{r.preview_content}</span> → </>}
                    {r.new_content && <span style={{ color: "#2e7d32" }}>{r.new_content}</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[10, 25, 50, 100]}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          labelRowsPerPage="Filas:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>
    </Box>
  );
}
