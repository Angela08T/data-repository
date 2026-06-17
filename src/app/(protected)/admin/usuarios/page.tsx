"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography, FormControl, InputLabel,
} from "@mui/material";
import {
  Add, Delete, Edit, PersonOff, PersonAdd, Search, Refresh,
} from "@mui/icons-material";
import { useFetch } from "@/lib/hooks/useFetch";
import { showError, showSuccess } from "@/lib/utils/swalConfig";
import Swal from "sweetalert2";

interface Role { id: string; name: string; is_super: boolean; }
interface Module { id: string; name: string; }
interface Assignment { id: string; role: Role; module?: Module; program?: { id: string; name: string }; }
interface UserRow {
  id: string;
  username: string;
  name: string;
  lastname: string;
  email: string;
  dni?: string;
  phone?: string;
  deleted_at: string | null;
  assignments: Assignment[];
}

const EMPTY_FORM = { username: "", password: "", name: "", lastname: "", email: "", dni: "", phone: "" };
const EMPTY_ASSIGN = { role_id: "", module_id: "" };

export default function UsuariosPage() {
  const { getData, postData, patchData, deleteData } = useFetch();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  // Dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [assignUser, setAssignUser] = useState<UserRow | null>(null);
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        ...(search ? { search } : {}),
      });
      const res = await getData<any>(`user?${params}`);
      setUsers(res.data?.data ?? []);
      setTotal(res.data?.totalCount ?? 0);
    } catch {
      /* handled by useFetch */
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, getData]);

  const fetchRolesModules = useCallback(async () => {
    try {
      const rolesRes = await getData<any>("initial/role?page=0");
      setRoles(rolesRes.data?.data ?? []);
    } catch { /* ignore */ }
    try {
      const modsRes = await getData<any>("module?page=0");
      setModules(modsRes.data?.data ?? []);
    } catch { /* ignore */ }
  }, [getData]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchRolesModules(); }, [fetchRolesModules]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await postData("/auth/register", form);
      showSuccess("Usuario creado", `El usuario "${form.username}" fue creado`);
      setOpenCreate(false);
      setForm(EMPTY_FORM);
      fetchUsers();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const payload: any = { name: form.name, lastname: form.lastname, email: form.email };
      if (form.password) payload.password = form.password;
      if (form.dni) payload.dni = form.dni;
      if (form.phone) payload.phone = form.phone;
      await patchData(`user/${editUser.id}`, payload);
      showSuccess("Usuario actualizado", "");
      setOpenEdit(false);
      setEditUser(null);
      fetchUsers();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleToggleDelete = async (user: UserRow) => {
    const isDeleted = !!user.deleted_at;
    const result = await Swal.fire({
      title: isDeleted ? "¿Restaurar usuario?" : "¿Eliminar usuario?",
      text: `${user.name} ${user.lastname} (${user.username})`,
      icon: isDeleted ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: isDeleted ? "Restaurar" : "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: isDeleted ? "#2e7d32" : "#d32f2f",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteData(`user/${user.id}`);
      showSuccess(isDeleted ? "Restaurado" : "Eliminado", "");
      fetchUsers();
    } catch { /* handled */ }
  };

  const handleAssign = async () => {
    if (!assignUser) return;
    setSaving(true);
    try {
      const payload: any = { user_id: assignUser.id, role_id: assignForm.role_id };
      if (assignForm.module_id) payload.module_id = assignForm.module_id;
      await postData("initial/assignment", payload);
      showSuccess("Rol asignado", "");
      setOpenAssign(false);
      setAssignUser(null);
      setAssignForm(EMPTY_ASSIGN);
      fetchUsers();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const openEditDialog = (u: UserRow) => {
    setEditUser(u);
    setForm({ username: u.username, password: "", name: u.name, lastname: u.lastname, email: u.email, dni: u.dni ?? "", phone: u.phone ?? "" });
    setOpenEdit(true);
  };

  const openAssignDialog = (u: UserRow) => {
    setAssignUser(u);
    setAssignForm(EMPTY_ASSIGN);
    setOpenAssign(true);
    fetchRolesModules();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Gestión de Usuarios
      </Typography>

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small" placeholder="Buscar usuario..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ flexGrow: 1, maxWidth: 320 }}
        />
        <Button startIcon={<Refresh />} onClick={fetchUsers} variant="outlined" size="small">
          Actualizar
        </Button>
        <Button startIcon={<Add />} onClick={() => { setForm(EMPTY_FORM); setOpenCreate(true); }}
          variant="contained" sx={{ bgcolor: "#d81b7e" }}>
          Nuevo Usuario
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell><b>Usuario</b></TableCell>
              <TableCell><b>Nombre</b></TableCell>
              <TableCell><b>Email</b></TableCell>
              <TableCell><b>Rol / Módulo</b></TableCell>
              <TableCell><b>Estado</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={28} sx={{ my: 2 }} /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>Sin usuarios</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id} sx={{ opacity: u.deleted_at ? 0.5 : 1 }}>
                <TableCell><b>{u.username}</b></TableCell>
                <TableCell>{u.name} {u.lastname}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{u.email}</TableCell>
                <TableCell>
                  {u.assignments.length === 0
                    ? <Chip label="Sin rol" size="small" color="default" />
                    : u.assignments.map((a) => (
                      <Chip key={a.id} size="small" color={a.role.is_super ? "error" : "primary"}
                        label={`${a.role.name}${a.module ? ` / ${a.module.name}` : ""}`}
                        sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                </TableCell>
                <TableCell>
                  <Chip size="small" label={u.deleted_at ? "Inactivo" : "Activo"}
                    color={u.deleted_at ? "default" : "success"} />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar"><IconButton size="small" onClick={() => openEditDialog(u)}><Edit fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Asignar rol"><IconButton size="small" onClick={() => openAssignDialog(u)}><PersonAdd fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={u.deleted_at ? "Restaurar" : "Desactivar"}>
                    <IconButton size="small" color={u.deleted_at ? "success" : "error"} onClick={() => handleToggleDelete(u)}>
                      {u.deleted_at ? <PersonAdd fontSize="small" /> : <PersonOff fontSize="small" />}
                    </IconButton>
                  </Tooltip>
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

      {/* Dialog: Crear usuario */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {[
            { label: "Usuario *", key: "username" },
            { label: "Contraseña *", key: "password", type: "password" },
            { label: "Nombre *", key: "name" },
            { label: "Apellido *", key: "lastname" },
            { label: "Email *", key: "email", type: "email" },
            { label: "DNI", key: "dni" },
            { label: "Teléfono", key: "phone" },
          ].map(({ label, key, type }) => (
            <TextField key={key} label={label} type={type ?? "text"} size="small" fullWidth
              value={(form as any)[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button onClick={handleCreate} variant="contained" disabled={saving}
            sx={{ bgcolor: "#d81b7e" }}>
            {saving ? <CircularProgress size={20} /> : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Editar usuario */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Usuario: {editUser?.username}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {[
            { label: "Nombre", key: "name" },
            { label: "Apellido", key: "lastname" },
            { label: "Email", key: "email", type: "email" },
            { label: "Nueva Contraseña (dejar vacío para no cambiar)", key: "password", type: "password" },
            { label: "DNI", key: "dni" },
            { label: "Teléfono", key: "phone" },
          ].map(({ label, key, type }) => (
            <TextField key={key} label={label} type={type ?? "text"} size="small" fullWidth
              value={(form as any)[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancelar</Button>
          <Button onClick={handleEdit} variant="contained" disabled={saving} sx={{ bgcolor: "#d81b7e" }}>
            {saving ? <CircularProgress size={20} /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Asignar rol */}
      <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Asignar Rol — {assignUser?.username}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <FormControl fullWidth size="small">
            <InputLabel>Rol *</InputLabel>
            <Select label="Rol *" value={assignForm.role_id}
              onChange={(e) => setAssignForm((f) => ({ ...f, role_id: e.target.value }))}>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.name}{r.is_super ? " (Super Admin)" : ""}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Módulo (opcional)</InputLabel>
            <Select label="Módulo (opcional)" value={assignForm.module_id}
              onChange={(e) => setAssignForm((f) => ({ ...f, module_id: e.target.value }))}>
              <MenuItem value="">Sin módulo</MenuItem>
              {modules.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssign(false)}>Cancelar</Button>
          <Button onClick={handleAssign} variant="contained" disabled={saving || !assignForm.role_id}
            sx={{ bgcolor: "#d81b7e" }}>
            {saving ? <CircularProgress size={20} /> : "Asignar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
