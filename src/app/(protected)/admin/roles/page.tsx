"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, InputAdornment, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography, FormControl,
} from "@mui/material";
import { Add, Delete, Edit, Refresh, Search, Security } from "@mui/icons-material";
import { useFetch } from "@/lib/hooks/useFetch";
import { showSuccess } from "@/lib/utils/swalConfig";
import Swal from "sweetalert2";

interface RoleRow { id: string; name: string; is_super: boolean; deleted_at: string | null; }

type Ability = "CREATE" | "READ" | "UPDATE" | "DELETE";
const ABILITIES: Ability[] = ["READ", "CREATE", "UPDATE", "DELETE"];
const ABILITY_LABELS: Record<Ability, string> = {
  READ: "Ver", CREATE: "Crear", UPDATE: "Editar", DELETE: "Eliminar",
};

interface PermInfo { access_id: string | null; enabled: boolean; }
interface ModuleMatrix {
  id: string; name: string; program: string | null;
  permissions: Record<Ability, PermInfo>;
}
interface PermissionsMatrix { role: RoleRow; modules: ModuleMatrix[]; }

export default function RolesPage() {
  const { getData, postData, patchData, deleteData, putData } = useFetch();

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openPerms, setOpenPerms] = useState(false);
  const [editRole, setEditRole] = useState<RoleRow | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Permissions matrix state
  const [permMatrix, setPermMatrix] = useState<PermissionsMatrix | null>(null);
  const [permChecked, setPermChecked] = useState<Record<string, Record<Ability, boolean>>>({});
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        ...(search ? { search } : {}),
      });
      const res = await getData<any>(`initial/role?${params}`);
      setRoles(res.data?.data ?? []);
      setTotal(res.data?.totalCount ?? 0);
    } catch { /* handled */ } finally { setLoading(false); }
  }, [page, rowsPerPage, search, getData]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await postData("initial/role", { name: name.trim().toUpperCase() });
      showSuccess("Rol creado", `Rol "${name}" creado`);
      setOpenCreate(false);
      setName("");
      fetchRoles();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editRole || !name.trim()) return;
    setSaving(true);
    try {
      await patchData(`initial/role/${editRole.id}`, { name: name.trim().toUpperCase() });
      showSuccess("Rol actualizado", "");
      setOpenEdit(false);
      setEditRole(null);
      setName("");
      fetchRoles();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleToggleDelete = async (role: RoleRow) => {
    if (role.is_super) return;
    const isDeleted = !!role.deleted_at;
    const result = await Swal.fire({
      title: isDeleted ? "¿Restaurar rol?" : "¿Eliminar rol?",
      text: role.name,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: isDeleted ? "Restaurar" : "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: isDeleted ? "#2e7d32" : "#d32f2f",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteData(`initial/role/${role.id}`);
      showSuccess(isDeleted ? "Restaurado" : "Eliminado", "");
      fetchRoles();
    } catch { /* handled */ }
  };

  const openPermissionsDialog = async (role: RoleRow) => {
    setPermMatrix(null);
    setPermChecked({});
    setOpenPerms(true);
    setLoadingPerms(true);
    try {
      const res = await getData<any>(`initial/role/${role.id}/permissions`);
      const matrix: PermissionsMatrix = res.data;
      setPermMatrix(matrix);
      // Initialize checked state from matrix
      const checked: Record<string, Record<Ability, boolean>> = {};
      for (const mod of matrix.modules) {
        checked[mod.id] = {} as Record<Ability, boolean>;
        for (const ab of ABILITIES) {
          checked[mod.id][ab] = mod.permissions[ab]?.enabled ?? false;
        }
      }
      setPermChecked(checked);
    } catch { setOpenPerms(false); } finally { setLoadingPerms(false); }
  };

  const handleTogglePerm = (moduleId: string, ability: Ability) => {
    setPermChecked((prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [ability]: !prev[moduleId]?.[ability] },
    }));
  };

  const handleToggleAll = (moduleId: string, allEnabled: boolean) => {
    setPermChecked((prev) => ({
      ...prev,
      [moduleId]: Object.fromEntries(ABILITIES.map((a) => [a, !allEnabled])) as Record<Ability, boolean>,
    }));
  };

  const handleSavePermissions = async () => {
    if (!permMatrix) return;
    setSavingPerms(true);
    try {
      const permissions: { module_id: string; ability: Ability }[] = [];
      for (const mod of permMatrix.modules) {
        for (const ab of ABILITIES) {
          if (permChecked[mod.id]?.[ab]) {
            permissions.push({ module_id: mod.id, ability: ab });
          }
        }
      }
      const res = await putData<any>(`initial/role/${permMatrix.role.id}/permissions`, { permissions });
      showSuccess("Permisos guardados", `Permisos del rol "${permMatrix.role.name}" actualizados`);
      // Refresh matrix
      const updated: PermissionsMatrix = res.data;
      setPermMatrix(updated);
      const checked: Record<string, Record<Ability, boolean>> = {};
      for (const mod of updated.modules) {
        checked[mod.id] = {} as Record<Ability, boolean>;
        for (const ab of ABILITIES) {
          checked[mod.id][ab] = mod.permissions[ab]?.enabled ?? false;
        }
      }
      setPermChecked(checked);
    } catch { /* handled */ } finally { setSavingPerms(false); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Gestión de Roles
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small" placeholder="Buscar rol..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ flexGrow: 1, maxWidth: 300 }}
        />
        <Button startIcon={<Refresh />} onClick={fetchRoles} variant="outlined" size="small">
          Actualizar
        </Button>
        <Button startIcon={<Add />} onClick={() => { setName(""); setOpenCreate(true); }}
          variant="contained" sx={{ bgcolor: "#1565c0" }}>
          Nuevo Rol
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell><b>Nombre del Rol</b></TableCell>
              <TableCell><b>Tipo</b></TableCell>
              <TableCell><b>Estado</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={28} sx={{ my: 2 }} /></TableCell></TableRow>
            ) : roles.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>Sin roles</TableCell></TableRow>
            ) : roles.map((r) => (
              <TableRow key={r.id} sx={{ opacity: r.deleted_at ? 0.5 : 1 }}>
                <TableCell><b>{r.name}</b></TableCell>
                <TableCell>
                  <Chip size="small" label={r.is_super ? "Super Admin" : "Estándar"}
                    color={r.is_super ? "error" : "primary"} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={r.deleted_at ? "Inactivo" : "Activo"}
                    color={r.deleted_at ? "default" : "success"} />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Permisos por módulo">
                    <IconButton size="small" color="info" onClick={() => openPermissionsDialog(r)}>
                      <Security fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!r.is_super && (
                    <>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => { setEditRole(r); setName(r.name); setOpenEdit(true); }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={r.deleted_at ? "Restaurar" : "Eliminar"}>
                        <IconButton size="small" color={r.deleted_at ? "success" : "error"}
                          onClick={() => handleToggleDelete(r)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[10, 25, 50]}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          labelRowsPerPage="Filas:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Dialog Crear */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo Rol</DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <TextField label="Nombre del rol *" fullWidth size="small"
            value={name} onChange={(e) => setName(e.target.value)}
            helperText="Ej: COMEDORES, ULE, OMAPED" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button onClick={handleCreate} variant="contained" disabled={saving || !name.trim()}
            sx={{ bgcolor: "#1565c0" }}>
            {saving ? <CircularProgress size={20} /> : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar Rol</DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <TextField label="Nombre del rol *" fullWidth size="small"
            value={name} onChange={(e) => setName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancelar</Button>
          <Button onClick={handleEdit} variant="contained" disabled={saving || !name.trim()}
            sx={{ bgcolor: "#1565c0" }}>
            {saving ? <CircularProgress size={20} /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Permisos */}
      <Dialog open={openPerms} onClose={() => setOpenPerms(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Permisos por Módulo — <b>{permMatrix?.role?.name ?? "..."}</b>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {loadingPerms ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : permMatrix ? (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#e3f2fd" }}>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 180 }}>Módulo</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 80 }}>Programa</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", width: 60 }}>Todo</TableCell>
                    {ABILITIES.map((ab) => (
                      <TableCell key={ab} align="center" sx={{ fontWeight: "bold", width: 80 }}>
                        {ABILITY_LABELS[ab]}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permMatrix.modules.map((mod) => {
                    const allEnabled = ABILITIES.every((ab) => permChecked[mod.id]?.[ab]);
                    const someEnabled = ABILITIES.some((ab) => permChecked[mod.id]?.[ab]);
                    return (
                      <TableRow key={mod.id} hover>
                        <TableCell sx={{ fontSize: 13 }}><b>{mod.name}</b></TableCell>
                        <TableCell sx={{ fontSize: 12, color: "#666" }}>{mod.program ?? "—"}</TableCell>
                        <TableCell align="center">
                          <Checkbox
                            size="small"
                            checked={allEnabled}
                            indeterminate={someEnabled && !allEnabled}
                            onChange={() => handleToggleAll(mod.id, allEnabled)}
                          />
                        </TableCell>
                        {ABILITIES.map((ab) => (
                          <TableCell key={ab} align="center">
                            <Checkbox
                              size="small"
                              checked={permChecked[mod.id]?.[ab] ?? false}
                              onChange={() => handleTogglePerm(mod.id, ab)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPerms(false)}>Cerrar</Button>
          {permMatrix && !permMatrix.role.is_super && (
            <Button onClick={handleSavePermissions} variant="contained" disabled={savingPerms}
              sx={{ bgcolor: "#1565c0" }}>
              {savingPerms ? <CircularProgress size={20} /> : "Guardar Permisos"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
