"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  Box,
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Edit,
  Delete,
  Search,
  Visibility,
} from "@mui/icons-material";
import { PAGINATION_CONFIG } from "@/lib/constants";

export interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: "left" | "center" | "right";
  format?: (value: any) => string | React.ReactNode;
}

interface CRUDTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onView?: (row: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canView?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: boolean;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
  noDataText?: string;
}

export default function CRUDTable({
  columns,
  data,
  loading = false,
  onEdit,
  onDelete,
  onView,
  canEdit = true,
  canDelete = true,
  canView = false,
  searchable = true,
  searchPlaceholder = "Buscar...",
  pagination = true,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = PAGINATION_CONFIG.PAGE_SIZE_OPTIONS,
  noDataText = "No hay datos disponibles",
}: CRUDTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGINATION_CONFIG.DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar datos localmente si no hay paginación del servidor
  const filteredData = searchable && !onPageChange
    ? data.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  // Datos paginados localmente si no hay paginación del servidor
  const paginatedData = !onPageChange && pagination
    ? filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : filteredData;

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    if (onRowsPerPageChange) {
      onRowsPerPageChange(newRowsPerPage);
    }
  };

  const showActions = canEdit || canDelete || canView;

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      {/* Búsqueda */}
      {searchable && (
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      )}

      {/* Tabla */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sx={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}
                >
                  {column.label}
                </TableCell>
              ))}
              {showActions && (
                <TableCell
                  align="center"
                  sx={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}
                >
                  Acciones
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (showActions ? 1 : 0)} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (showActions ? 1 : 0)} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {noDataText}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow hover key={index}>
                  {columns.map((column) => {
                    const value = row[column.id];
                    return (
                      <TableCell key={column.id} align={column.align}>
                        {column.format ? column.format(value) : value}
                      </TableCell>
                    );
                  })}
                  {showActions && (
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                        {canView && onView && (
                          <Tooltip title="Ver">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => onView(row)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canEdit && onEdit && (
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => onEdit(row)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && onDelete && (
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onDelete(row)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginación */}
      {pagination && !loading && paginatedData.length > 0 && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={totalCount || filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </Paper>
  );
}
