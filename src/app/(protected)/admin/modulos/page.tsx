"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, MenuItem,
  Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { Add, Delete, Edit, Refresh, Search, Extension, Sync } from "@mui/icons-material";
import { useFetch } from "@/lib/hooks/useFetch";
import { showSuccess } from "@/lib/utils/swalConfig";
import Swal from "sweetalert2";

interface ModuleRow {
  id: string;
  name: string;
  program?: { id: string; name: string } | null;
  deleted_at: string | null;
}

interface ProgramRow { id: string; name: string; }

const EMPTY_FORM = { name: "", program_id: "" };

export default function ModulosPage() {
  const { getData, postData, patchData, deleteData } = useFetch();

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editModule, setEditModule] = useState<ModuleRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        ...(search ? { search } : {}),
      });
      const res = await getData<any>(`module?${params}`);
      setModules(res.data?.data ?? []);
      setTotal(res.data?.totalCount ?? 0);
    } catch { /* handled */ } finally { setLoading(false); }
  }, [page, rowsPerPage, search, getData]);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await getData<any>("program?page=0");
      setPrograms(res.data?.data ?? []);
    } catch { /* handled */ }
  }, [getData]);

  useEffect(() => { fetchModules(); }, [fetchModules]);
  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.program_id) return;
    setSaving(true);
    try {
      await postData("module", { name: form.name.trim().toUpperCase(), program_id: form.program_id });
      showSuccess("Módulo creado", `El módulo "${form.name.toUpperCase()}" fue creado`);
      setOpenCreate(false);
      setForm(EMPTY_FORM);
      fetchModules();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editModule || !form.name.trim() || !form.program_id) return;
    setSaving(true);
    try {
      await patchData(`module/${editModule.id}`, { name: form.name.trim().toUpperCase(), program_id: form.program_id });
      showSuccess("Módulo actualizado", "");
      setOpenEdit(false);
      setEditModule(null);
      setForm(EMPTY_FORM);
      fetchModules();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleToggleDelete = async (mod: ModuleRow) => {
    const isDeleted = !!mod.deleted_at;
    const result = await Swal.fire({
      title: isDeleted ? "¿Restaurar módulo?" : "¿Eliminar módulo?",
      text: mod.name,
      icon: isDeleted ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: isDeleted ? "Restaurar" : "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: isDeleted ? "#2e7d32" : "#d32f2f",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteData(`module/${mod.id}`);
      showSuccess(isDeleted ? "Restaurado" : "Eliminado", "");
      fetchModules();
    } catch { /* handled */ }
  };

  const handleSyncSup = async () => {
    const result = await Swal.fire({
      title: "¿Sincronizar Apoyo → Lista General?",
      html: "Copiará todos los registros existentes del módulo <b>Apoyo (SUP)</b> a la tabla general para que aparezcan en la lista general junto a los otros módulos.<br/><br/>Esta operación es segura y solo añade registros que faltan.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Sí, sincronizar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1565c0",
    });
    if (!result.isConfirmed) return;
    setSyncing(true);
    try {
      const res = await postData<{ synced: number; skipped: number }>("support/sup/sync-general", {});
      const { synced, skipped } = res ?? { synced: 0, skipped: 0 };
      showSuccess("Sincronización completada", `${synced} registros sincronizados, ${skipped} omitidos (ya existían o DNI duplicado)`);
    } catch { /* handled by useFetch */ } finally { setSyncing(false); }
  };

  const openEditDialog = (mod: ModuleRow) => {
    setEditModule(mod);
    setForm({ name: mod.name, program_id: mod.program?.id ?? "" });
    setOpenEdit(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Gestión de Módulos
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Los módulos son las unidades de acceso del sistema. Créalos aquí para luego asignarles permisos en los roles.
      </Typography>

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small" placeholder="Buscar módulo..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ flexGrow: 1, maxWidth: 320 }}
        />
        <Button startIcon={<Refresh />} onClick={fetchModules} variant="outlined" size="small">
          Actualizar
        </Button>
        <Button
          startIcon={<Add />}
          onClick={() => { setForm(EMPTY_FORM); setOpenCreate(true); }}
          variant="contained"
          sx={{ bgcolor: "#1565c0" }}
        >
          Nuevo Módulo
        </Button>
        <Button
          startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <Sync />}
          onClick={handleSyncSup}
          variant="outlined"
          size="small"
          disabled={syncing}
          color="secondary"
        >
          Sincronizar Apoyo → Lista General
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell><b>Nombre del Módulo</b></TableCell>
              <TableCell><b>Programa</b></TableCell>
              <TableCell><b>Estado</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={28} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : modules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                  Sin módulos
                </TableCell>
              </TableRow>
            ) : modules.map((mod) => (
              <TableRow key={mod.id} sx={{ opacity: mod.deleted_at ? 0.5 : 1 }}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Extension fontSize="small" sx={{ color: "#1565c0" }} />
                    <b>{mod.name}</b>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: "text.secondary", fontSize: 13 }}>
                  {mod.program?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={mod.deleted_at ? "Inactivo" : "Activo"}
                    color={mod.deleted_at ? "default" : "success"}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar nombre">
                    <IconButton size="small" onClick={() => openEditDialog(mod)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={mod.deleted_at ? "Restaurar" : "Eliminar"}>
                    <IconButton
                      size="small"
                      color={mod.deleted_at ? "success" : "error"}
                      onClick={() => handleToggleDelete(mod)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPageOptions={[10, 25, 50]}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          labelRowsPerPage="Filas:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Dialog: Crear */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo Módulo</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            label="Nombre del módulo *"
            fullWidth
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            helperText="Ej: SUP, OMAPED, PVL — se guardará en mayúsculas"
            autoFocus
          />
          <FormControl fullWidth size="small">
            <InputLabel>Programa *</InputLabel>
            <Select
              label="Programa *"
              value={form.program_id}
              onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}
            >
              {programs.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={saving || !form.name.trim() || !form.program_id}
            sx={{ bgcolor: "#1565c0" }}
          >
            {saving ? <CircularProgress size={20} /> : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Editar */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar Módulo: {editModule?.name}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            label="Nombre del módulo *"
            fullWidth
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <FormControl fullWidth size="small">
            <InputLabel>Programa *</InputLabel>
            <Select
              label="Programa *"
              value={form.program_id}
              onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}
            >
              {programs.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancelar</Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={saving || !form.name.trim() || !form.program_id}
            sx={{ bgcolor: "#1565c0" }}
          >
            {saving ? <CircularProgress size={20} /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
