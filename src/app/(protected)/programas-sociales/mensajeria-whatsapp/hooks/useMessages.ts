"use client";

import { useState, useCallback, useEffect } from "react";
import { useFetch } from "@/lib/hooks/useFetch";
import { useWebSocket } from "./useWebSocket";
import {
  WhatsAppMessage,
  MessageStatus,
  SendMessagePayload,
  SendMessageResponse,
  MessagesListResponse,
  MessageFilters,
  WebSocketStatusUpdate,
  WebSocketReplyEvent,
} from "../types";

interface MessagesState {
  messages: WhatsAppMessage[];
  totalCount: number;
  loading: boolean;
  error: string | null;
}

export const useMessages = () => {
  const { getData, postData, patchData } = useFetch();
  const { subscribe, isConnected } = useWebSocket();

  const [state, setState] = useState<MessagesState>({
    messages: [],
    totalCount: 0,
    loading: false,
    error: null,
  });

  const [filters, setFilters] = useState<MessageFilters>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Cargar mensajes desde el backend
  const fetchMessages = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const queryParams = new URLSearchParams({
        page: String(page + 1),
        limit: String(pageSize),
      });

      if (filters.status) queryParams.append("status", filters.status);
      if (filters.modulo) queryParams.append("modulo", filters.modulo);
      if (filters.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) queryParams.append("dateTo", filters.dateTo);
      if (filters.search) queryParams.append("search", filters.search);

      const response = await getData<MessagesListResponse>(
        `whatsapp/messages?${queryParams}`,
        { showErrorAlert: false }
      );

      if (response?.data) {
        setState({
          messages: response.data.data || [],
          totalCount: response.data.totalCount || 0,
          loading: false,
          error: null,
        });
      } else {
        setState({
          messages: [],
          totalCount: 0,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar mensajes";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [getData, page, pageSize, filters]);

  // Enviar mensajes masivos
  const sendMessages = useCallback(async (payload: SendMessagePayload): Promise<SendMessageResponse> => {
    const response = await postData<SendMessageResponse>(
      "whatsapp/messages/send",
      payload
    );
    // Recargar lista después de enviar
    await fetchMessages();
    return response;
  }, [postData, fetchMessages]);

  // Reintentar mensaje fallido
  const retryMessage = useCallback(async (messageId: string) => {
    await patchData(`whatsapp/messages/${messageId}/retry`, {});
    await fetchMessages();
  }, [patchData, fetchMessages]);

  // Actualizar mensaje localmente (para WebSocket)
  const updateMessageLocally = useCallback((messageId: string, updates: Partial<WhatsAppMessage>) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  }, []);

  // Suscribirse a eventos WebSocket
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeStatus = subscribe("message_status_update", (data) => {
      const update = data as WebSocketStatusUpdate;
      updateMessageLocally(update.messageId, {
        status: update.status,
        ...(update.status === MessageStatus.SENT && { sentAt: update.timestamp }),
        ...(update.status === MessageStatus.DELIVERED && { deliveredAt: update.timestamp }),
        ...(update.status === MessageStatus.READ && { readAt: update.timestamp }),
        ...(update.status === MessageStatus.FAILED && { statusMessage: update.error }),
      });
    });

    const unsubscribeReply = subscribe("message_reply", (data) => {
      const reply = data as WebSocketReplyEvent;
      updateMessageLocally(reply.messageId, {
        status: MessageStatus.REPLIED,
        repliedAt: reply.timestamp,
        replyContent: reply.replyContent,
      });
    });

    return () => {
      unsubscribeStatus();
      unsubscribeReply();
    };
  }, [isConnected, subscribe, updateMessageLocally]);

  // Cargar al montar y cuando cambian filtros/paginación
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Cambiar filtros y resetear página
  const updateFilters = useCallback((newFilters: Partial<MessageFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(0);
  }, []);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(0);
  }, []);

  return {
    ...state,
    filters,
    setFilters: updateFilters,
    clearFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    sendMessages,
    retryMessage,
    refetch: fetchMessages,
    isConnected,
  };
};
