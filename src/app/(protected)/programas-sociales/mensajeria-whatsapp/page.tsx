"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  WhatsApp,
  Refresh,
  Search,
  Clear,
  FiberManualRecord,
  Close,
} from "@mui/icons-material";
import { SUBGERENCIAS, SubgerenciaType } from "@/lib/constants";
import { useMessages } from "./hooks/useMessages";
import { MessageStatus, MODULO_CONFIG, WhatsAppMessage, ModuloType } from "./types";
import MessageTable from "./components/MessageTable";
import MessageStatusChip from "./components/MessageStatusChip";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];

// Tabs de filtro rápido
const TABS = [
  { id: "all", label: "Todos", status: undefined },
  { id: "in_progress", label: "En Proceso", statuses: [MessageStatus.PENDING, MessageStatus.SENDING, MessageStatus.SENT] },
  { id: "replied", label: "Respondidos", status: MessageStatus.REPLIED },
  { id: "failed", label: "Fallidos", status: MessageStatus.FAILED },
];

export default function MensajeriaWhatsAppPage() {
  const {
    messages,
    totalCount,
    loading,
    error,
    filters,
    setFilters,
    clearFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    retryMessage,
    refetch,
    isConnected,
  } = useMessages();

  const [activeTab, setActiveTab] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [replyDialog, setReplyDialog] = useState<WhatsAppMessage | null>(null);

  // Manejar cambio de tab
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const tab = TABS[newValue];

    if (tab.status) {
      setFilters({ status: tab.status });
    } else if (tab.statuses) {
      // Para "En Proceso", manejamos múltiples estados
      // Por ahora solo filtramos por el primero, el backend debería soportar múltiples
      setFilters({ status: tab.statuses[0] });
    } else {
      setFilters({ status: "" });
    }
  };

  // Buscar
  const handleSearch = () => {
    setFilters({ search: searchInput });
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setSearchInput("");
    setFilters({ search: "" });
  };

  // Contar mensajes por estado
  const statusCounts = useMemo(() => {
    const counts = {
      all: totalCount,
      in_progress: 0,
      replied: 0,
      failed: 0,
    };

    messages.forEach((msg) => {
      if ([MessageStatus.PENDING, MessageStatus.SENDING, MessageStatus.SENT].includes(msg.status)) {
        counts.in_progress++;
      }
      if (msg.status === MessageStatus.REPLIED) {
        counts.replied++;
      }
      if (msg.status === MessageStatus.FAILED) {
        counts.failed++;
      }
    });

    return counts;
  }, [messages, totalCount]);

  const hayFiltrosActivos = filters.modulo || filters.search || filters.dateFrom || filters.dateTo;

  return (
    <Box>
      {/* Encabezado */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <WhatsApp sx={{ color: "#25D366", fontSize: 32 }} />
            <Typography
              variant="h4"
              sx={{
                color: subgerencia.color,
                fontWeight: 700,
                fontFamily: "'Poppins', 'Roboto', sans-serif",
              }}
            >
              Mensajería WhatsApp
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            Historial de mensajes de saludo de cumpleaños enviados
          </Typography>
        </Box>

        {/* Indicador de conexión */}
        <Chip
          icon={
            <FiberManualRecord
              sx={{
                fontSize: 12,
                color: isConnected ? "#22c55e" : "#ef4444",
                animation: isConnected ? "pulse 2s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                  "100%": { opacity: 1 },
                },
              }}
            />
          }
          label={isConnected ? "Conectado" : "Desconectado"}
          variant="outlined"
          size="small"
          sx={{
            borderColor: isConnected ? "#22c55e" : "#ef4444",
            color: isConnected ? "#22c55e" : "#ef4444",
          }}
        />
      </Box>

      {/* Tabs */}
      <Paper
        sx={{
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            px: 2,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              minHeight: 48,
            },
            "& .Mui-selected": {
              color: "#25D366",
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#25D366",
            },
          }}
        >
          {TABS.map((tab, index) => (
            <Tab
              key={tab.id}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  {tab.label}
                  {index === 2 && statusCounts.replied > 0 && (
                    <Chip
                      size="small"
                      label={statusCounts.replied}
                      sx={{
                        height: 20,
                        fontSize: "0.7rem",
                        backgroundColor: "#8b5cf6",
                        color: "white",
                      }}
                    />
                  )}
                  {index === 3 && statusCounts.failed > 0 && (
                    <Chip
                      size="small"
                      label={statusCounts.failed}
                      sx={{
                        height: 20,
                        fontSize: "0.7rem",
                        backgroundColor: "#ef4444",
                        color: "white",
                      }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Filtros */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 0,
          boxShadow: "none",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          {/* Búsqueda */}
          <TextField
            size="small"
            placeholder="Buscar por nombre, teléfono..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            sx={{ minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Filtro por módulo */}
          <TextField
            select
            size="small"
            label="Módulo"
            value={filters.modulo || ""}
            onChange={(e) => setFilters({ modulo: e.target.value as ModuloType | "" })}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todos los módulos</MenuItem>
            {Object.entries(MODULO_CONFIG).map(([id, config]) => (
              <MenuItem key={id} value={id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: config.color,
                    }}
                  />
                  {config.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {/* Fecha desde */}
          <TextField
            size="small"
            label="Desde"
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => setFilters({ dateFrom: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />

          {/* Fecha hasta */}
          <TextField
            size="small"
            label="Hasta"
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => setFilters({ dateTo: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />

          {/* Espaciador */}
          <Box sx={{ flex: 1 }} />

          {/* Botones */}
          {hayFiltrosActivos && (
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={() => {
                clearFilters();
                setSearchInput("");
                setActiveTab(0);
              }}
            >
              Limpiar
            </Button>
          )}

          <Tooltip title="Actualizar">
            <IconButton onClick={refetch} disabled={loading} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Chips de filtros activos */}
        {hayFiltrosActivos && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Filtros:
            </Typography>
            {filters.modulo && (
              <Chip
                size="small"
                label={MODULO_CONFIG[filters.modulo as ModuloType]?.label}
                onDelete={() => setFilters({ modulo: "" })}
                sx={{
                  backgroundColor: MODULO_CONFIG[filters.modulo as ModuloType]?.color,
                  color: "white",
                }}
              />
            )}
            {filters.search && (
              <Chip
                size="small"
                label={`"${filters.search}"`}
                onDelete={() => {
                  setFilters({ search: "" });
                  setSearchInput("");
                }}
              />
            )}
            {filters.dateFrom && (
              <Chip
                size="small"
                label={`Desde: ${filters.dateFrom}`}
                onDelete={() => setFilters({ dateFrom: "" })}
              />
            )}
            {filters.dateTo && (
              <Chip
                size="small"
                label={`Hasta: ${filters.dateTo}`}
                onDelete={() => setFilters({ dateTo: "" })}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Error */}
      {error && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            borderRadius: 0,
          }}
        >
          <Typography variant="body2">{error}</Typography>
        </Paper>
      )}

      {/* Tabla */}
      <Box sx={{ borderRadius: "0 0 16px 16px", overflow: "hidden" }}>
        <MessageTable
          messages={messages}
          totalCount={totalCount}
          loading={loading}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onRetry={retryMessage}
          onViewReply={(msg) => setReplyDialog(msg)}
        />
      </Box>

      {/* Dialog para ver respuesta */}
      <Dialog
        open={!!replyDialog}
        onClose={() => setReplyDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "#ede9fe",
            borderBottom: "1px solid #ddd6fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <WhatsApp sx={{ color: "#8b5cf6" }} />
            <Typography fontWeight={600} color="#6d28d9">
              Respuesta de {replyDialog?.nombre}
            </Typography>
          </Box>
          <IconButton onClick={() => setReplyDialog(null)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          {replyDialog && (
            <Box>
              <Box display="flex" gap={2} mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Destinatario
                  </Typography>
                  <Typography fontWeight={500}>
                    {replyDialog.nombre} {replyDialog.apellido}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Teléfono
                  </Typography>
                  <Typography fontFamily="monospace">
                    {replyDialog.telefono}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>
                  <Box mt={0.5}>
                    <MessageStatusChip status={replyDialog.status} />
                  </Box>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Respuesta recibida
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  mt: 0.5,
                  backgroundColor: "#f0fdf4",
                  borderLeft: "4px solid #22c55e",
                }}
              >
                <Typography>{replyDialog.replyContent || "Sin contenido"}</Typography>
              </Paper>

              {replyDialog.repliedAt && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Recibido: {new Date(replyDialog.repliedAt).toLocaleString("es-PE")}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={() => setReplyDialog(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
