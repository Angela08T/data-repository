"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/redux/hooks";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ||
                   process.env.NEXT_PUBLIC_PVL_API_URL?.replace("/api/", "") ||
                   "https://sgdh-backend.onrender.com";

type EventCallback = (data: unknown) => void;

export const useWebSocket = () => {
  const { token } = useAppSelector((state) => state.auth);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Listeners registrados
  const listenersRef = useRef<Map<string, EventCallback[]>>(new Map());

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socketRef.current.on("connect", () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log("[WebSocket] Conectado a:", SOCKET_URL);
      });

      socketRef.current.on("disconnect", (reason) => {
        setIsConnected(false);
        console.log("[WebSocket] Desconectado:", reason);
      });

      socketRef.current.on("connect_error", (error) => {
        setConnectionError(error.message);
        setIsConnected(false);
        console.error("[WebSocket] Error de conexión:", error.message);
      });

      // Eventos de mensajes WhatsApp
      socketRef.current.on("message_status_update", (data) => {
        console.log("[WebSocket] message_status_update:", data);
        listenersRef.current.get("message_status_update")?.forEach((cb) => cb(data));
      });

      socketRef.current.on("message_reply", (data) => {
        console.log("[WebSocket] message_reply:", data);
        listenersRef.current.get("message_reply")?.forEach((cb) => cb(data));
      });

      socketRef.current.on("bulk_status_update", (data) => {
        console.log("[WebSocket] bulk_status_update:", data);
        listenersRef.current.get("bulk_status_update")?.forEach((cb) => cb(data));
      });

    } catch (error) {
      console.error("[WebSocket] Error al conectar:", error);
      setConnectionError("Error al inicializar conexión");
    }
  }, [token]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      console.log("[WebSocket] Desconexión manual");
    }
  }, []);

  const subscribe = useCallback((event: string, callback: EventCallback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event)!.push(callback);

    // Retornar función de unsubscribe
    return () => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }, []);

  // Emitir evento al servidor
  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn("[WebSocket] No conectado, no se puede emitir:", event);
    }
  }, []);

  // Conectar cuando hay token
  useEffect(() => {
    if (token) {
      connect();
    }
    return () => disconnect();
  }, [token, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    subscribe,
    emit,
    connect,
    disconnect,
  };
};
