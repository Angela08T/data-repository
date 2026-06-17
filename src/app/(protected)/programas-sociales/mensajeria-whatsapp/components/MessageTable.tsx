"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
} from "@mui/material";
import { Refresh, Visibility, Reply } from "@mui/icons-material";
import { WhatsAppMessage, MessageStatus, MODULO_CONFIG } from "../types";
import MessageStatusChip from "./MessageStatusChip";

interface MessageTableProps {
  messages: WhatsAppMessage[];
  totalCount: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRetry?: (messageId: string) => void;
  onViewReply?: (message: WhatsAppMessage) => void;
}

export default function MessageTable({
  messages,
  totalCount,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onViewReply,
}: MessageTableProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Paper
      sx={{
        borderRadius: "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
      }}
    >
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 300,
          }}
        >
          <CircularProgress sx={{ color: "#25D366" }} />
        </Box>
      ) : (
        <>
          <TableContainer sx={{ maxHeight: "calc(100vh - 380px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>
                    Destinatario
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>
                    Teléfono
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>
                    Módulo
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>
                    Entidad
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>
                    Estado
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>
                    Fecha Envío
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }} align="center">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay mensajes para mostrar
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((message) => (
                    <TableRow
                      key={message.id}
                      hover
                      sx={{
                        "&:hover": { backgroundColor: "#f8fafc" },
                        ...(message.status === MessageStatus.REPLIED && {
                          backgroundColor: "#faf5ff",
                        }),
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {message.nombre} {message.apellido}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {message.edad} años
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                          {message.telefono}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={MODULO_CONFIG[message.modulo]?.label || message.moduloLabel}
                          sx={{
                            backgroundColor: MODULO_CONFIG[message.modulo]?.color || "#666",
                            color: "white",
                            fontSize: "0.7rem",
                            height: 24,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 150,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {message.entidadNombre}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <MessageStatusChip
                          status={message.status}
                          statusMessage={message.statusMessage}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(message.sentAt || message.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={0.5}>
                          {message.status === MessageStatus.FAILED && onRetry && (
                            <Tooltip title="Reintentar envío">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => onRetry(message.id)}
                              >
                                <Refresh fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {message.status === MessageStatus.REPLIED && message.replyContent && onViewReply && (
                            <Tooltip title="Ver respuesta">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => onViewReply(message)}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {message.replyContent && (
                            <Tooltip title={`Respuesta: "${message.replyContent}"`}>
                              <Reply fontSize="small" sx={{ color: "#8b5cf6", ml: 0.5 }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => onPageChange(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        </>
      )}
    </Paper>
  );
}
