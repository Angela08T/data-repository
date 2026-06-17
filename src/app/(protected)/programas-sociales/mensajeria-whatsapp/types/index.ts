/**
 * Tipos e interfaces para el módulo de Mensajería WhatsApp
 */

// Estados posibles de un mensaje
export enum MessageStatus {
  PENDING = "pending",       // Esperando envío
  SENDING = "sending",       // En proceso de envío
  SENT = "sent",             // Enviado a WhatsApp
  DELIVERED = "delivered",   // Entregado al dispositivo
  READ = "read",             // Leído por el destinatario
  REPLIED = "replied",       // El destinatario respondió
  FAILED = "failed",         // Error en el envío
}

// Tipo de módulo
export type ModuloType = "PVL" | "OLLAS_COMUNES" | "COMEDORES_POPULARES" | "ULE" | "CIAM";

// Interface para un mensaje de WhatsApp
export interface WhatsAppMessage {
  id: string;
  personaId: string;
  nombre: string;
  apellido: string;
  telefono: string;
  edad: number;
  modulo: ModuloType;
  moduloLabel: string;
  entidadNombre: string;
  status: MessageStatus;
  statusMessage?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  repliedAt?: string;
  replyContent?: string;
}

// Payload para enviar mensajes
export interface SendMessagePayload {
  personas: PersonaParaEnvio[];
}

export interface PersonaParaEnvio {
  personaId: string;
  nombre: string;
  apellido: string;
  telefono: string;
  edad: number;
  modulo: string;
  entidadNombre: string;
}

// Respuesta del endpoint de envío
export interface SendMessageResponse {
  message: string;
  data: {
    messageIds: string[];
    count: number;
  };
}

// Respuesta del endpoint de listado
export interface MessagesListResponse {
  message: string;
  data: {
    data: WhatsAppMessage[];
    totalCount: number;
  };
}

// Eventos de WebSocket
export interface WebSocketStatusUpdate {
  messageId: string;
  status: MessageStatus;
  timestamp: string;
  error?: string;
}

export interface WebSocketReplyEvent {
  messageId: string;
  status: MessageStatus;
  timestamp: string;
  replyContent: string;
}

export interface WebSocketBulkUpdate {
  messageIds: string[];
  status: MessageStatus;
  timestamp: string;
}

// Filtros para la lista de mensajes
export interface MessageFilters {
  status?: MessageStatus | "";
  modulo?: ModuloType | "";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Configuración de colores por estado
export const STATUS_CONFIG: Record<MessageStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  [MessageStatus.PENDING]: {
    label: "Pendiente",
    color: "#94a3b8",
    bgColor: "#f1f5f9",
  },
  [MessageStatus.SENDING]: {
    label: "Enviando...",
    color: "#f59e0b",
    bgColor: "#fef3c7",
  },
  [MessageStatus.SENT]: {
    label: "Enviado",
    color: "#3b82f6",
    bgColor: "#dbeafe",
  },
  [MessageStatus.DELIVERED]: {
    label: "Entregado",
    color: "#22c55e",
    bgColor: "#dcfce7",
  },
  [MessageStatus.READ]: {
    label: "Leído",
    color: "#0ea5e9",
    bgColor: "#e0f2fe",
  },
  [MessageStatus.REPLIED]: {
    label: "Respondido",
    color: "#8b5cf6",
    bgColor: "#ede9fe",
  },
  [MessageStatus.FAILED]: {
    label: "Error",
    color: "#ef4444",
    bgColor: "#fee2e2",
  },
};

// Configuración de colores por módulo
export const MODULO_CONFIG: Record<ModuloType, {
  label: string;
  color: string;
}> = {
  PVL: { label: "PVL", color: "#d81b7e" },
  OLLAS_COMUNES: { label: "Ollas Comunes", color: "#4caf50" },
  COMEDORES_POPULARES: { label: "Comedores Populares", color: "#ff9800" },
  ULE: { label: "ULE", color: "#2196f3" },
  CIAM: { label: "CIAM", color: "#9c27b0" },
};
