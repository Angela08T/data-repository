# Documentación Backend - Mensajería WhatsApp

Esta documentación describe los endpoints y eventos WebSocket que el backend debe implementar para la funcionalidad de mensajería WhatsApp.

---

## Endpoints HTTP

### 1. Enviar Mensajes Masivos

```
POST /api/whatsapp/messages/send
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "personas": [
    {
      "personaId": "pvl-123-456",
      "nombre": "Juan",
      "apellido": "Pérez",
      "telefono": "987654321",
      "edad": 45,
      "modulo": "PVL",
      "entidadNombre": "Comité Las Flores"
    }
  ]
}
```

**Response 200:**
```json
{
  "message": "Mensajes encolados para envío",
  "data": {
    "messageIds": ["msg-uuid-1", "msg-uuid-2"],
    "count": 2
  }
}
```

---

### 2. Listar Mensajes

```
GET /api/whatsapp/messages?page=1&limit=25&status=replied&modulo=PVL
Authorization: Bearer {token}
```

**Query Parameters:**
| Parámetro | Tipo   | Descripción |
|-----------|--------|-------------|
| page      | number | Página (default: 1) |
| limit     | number | Registros por página (default: 25) |
| status    | string | Filtrar por estado: pending, sending, sent, delivered, read, replied, failed |
| modulo    | string | Filtrar por módulo: PVL, OLLAS_COMUNES, COMEDORES_POPULARES |
| search    | string | Buscar por nombre o teléfono |
| dateFrom  | string | Fecha desde (YYYY-MM-DD) |
| dateTo    | string | Fecha hasta (YYYY-MM-DD) |

**Response 200:**
```json
{
  "message": "Mensajes obtenidos",
  "data": {
    "data": [
      {
        "id": "msg-uuid-1",
        "personaId": "pvl-123-456",
        "nombre": "Juan",
        "apellido": "Pérez",
        "telefono": "987654321",
        "edad": 45,
        "modulo": "PVL",
        "moduloLabel": "PVL",
        "entidadNombre": "Comité Las Flores",
        "status": "replied",
        "statusMessage": null,
        "createdAt": "2026-01-30T10:00:00Z",
        "sentAt": "2026-01-30T10:01:00Z",
        "deliveredAt": "2026-01-30T10:02:00Z",
        "readAt": "2026-01-30T10:10:00Z",
        "repliedAt": "2026-01-30T10:15:00Z",
        "replyContent": "Gracias por el saludo!"
      }
    ],
    "totalCount": 150
  }
}
```

---

### 3. Reintentar Mensaje Fallido

```
PATCH /api/whatsapp/messages/{messageId}/retry
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "message": "Mensaje reencolado para reintento"
}
```

---

## WebSocket (Socket.io)

### Conexión

El frontend se conecta con autenticación:

```javascript
import { io } from "socket.io-client";

const socket = io("https://sgdh-backend.onrender.com", {
  auth: { token: "jwt-token-del-usuario" },
  transports: ["websocket", "polling"]
});
```

---

### Eventos Server → Client

#### `message_status_update`
Emitir cuando cambia el estado de un mensaje individual.

```javascript
socket.emit("message_status_update", {
  messageId: "msg-uuid-1",
  status: "delivered",  // pending | sending | sent | delivered | read | replied | failed
  timestamp: "2026-01-30T10:02:00Z",
  error: null  // Solo si status = "failed", contiene el mensaje de error
});
```

#### `message_reply`
Emitir cuando se recibe una respuesta del destinatario.

```javascript
socket.emit("message_reply", {
  messageId: "msg-uuid-1",
  status: "replied",
  timestamp: "2026-01-30T10:15:00Z",
  replyContent: "Gracias por el saludo!"
});
```

#### `bulk_status_update`
Emitir para actualización masiva de estados (opcional, para optimización).

```javascript
socket.emit("bulk_status_update", {
  messageIds: ["msg-uuid-1", "msg-uuid-2", "msg-uuid-3"],
  status: "sent",
  timestamp: "2026-01-30T10:01:00Z"
});
```

---

## Flujo Backend → n8n

### 1. Recibir solicitud de envío

Cuando el frontend llama `POST /api/whatsapp/messages/send`:

1. Guardar cada mensaje en la base de datos con `status: "pending"`
2. Retornar los IDs de los mensajes creados
3. Para cada mensaje, enviar a n8n via webhook:

```json
POST https://tu-n8n.com/webhook/whatsapp-send
{
  "messageId": "msg-uuid-1",
  "telefono": "987654321",
  "nombre": "Juan",
  "apellido": "Pérez",
  "edad": 45,
  "mensaje": "¡Feliz cumpleaños Juan! La Municipalidad de SJL te desea un excelente día. 🎂"
}
```

### 2. Recibir callback de n8n (status update)

n8n debe llamar a tu backend cuando el mensaje cambia de estado:

```
POST /api/whatsapp/webhook/status
{
  "messageId": "msg-uuid-1",
  "status": "sent",  // o "delivered", "read", "failed"
  "timestamp": "2026-01-30T10:01:00Z",
  "error": null  // mensaje de error si status = "failed"
}
```

Luego el backend:
1. Actualiza el mensaje en la base de datos
2. Emite evento WebSocket `message_status_update`

---

## Flujo n8n → Backend (Respuestas)

Cuando n8n detecta que el destinatario respondió:

```
POST /api/whatsapp/webhook/reply
{
  "messageId": "msg-uuid-1",
  "telefono": "987654321",
  "replyContent": "Gracias por el saludo!",
  "timestamp": "2026-01-30T10:15:00Z"
}
```

Luego el backend:
1. Actualiza el mensaje en BD: `status: "replied"`, `replyContent`, `repliedAt`
2. Emite evento WebSocket `message_reply`

---

## Estados de Mensaje

| Estado    | Valor      | Descripción |
|-----------|------------|-------------|
| Pendiente | `pending`  | Creado, esperando envío |
| Enviando  | `sending`  | En proceso de envío |
| Enviado   | `sent`     | Enviado a WhatsApp |
| Entregado | `delivered`| Entregado al dispositivo |
| Leído     | `read`     | Leído por el destinatario |
| Respondido| `replied`  | El destinatario respondió |
| Error     | `failed`   | Error en el envío |

---

## Modelo de Base de Datos Sugerido

```typescript
interface WhatsAppMessage {
  id: string;           // UUID
  personaId: string;    // ID de la persona (pvl-xxx, ollas-xxx, etc.)
  nombre: string;
  apellido: string;
  telefono: string;
  edad: number;
  modulo: "PVL" | "OLLAS_COMUNES" | "COMEDORES_POPULARES";
  moduloLabel: string;
  entidadNombre: string;
  status: "pending" | "sending" | "sent" | "delivered" | "read" | "replied" | "failed";
  statusMessage?: string;   // Mensaje de error si falló
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  repliedAt?: Date;
  replyContent?: string;    // Contenido de la respuesta
  createdBy: string;        // ID del usuario que envió
}
```

---

## Variable de Entorno Frontend

Agregar en `.env.local`:

```
NEXT_PUBLIC_SOCKET_URL=https://sgdh-backend.onrender.com
```

Si no está configurada, el frontend usará `NEXT_PUBLIC_PVL_API_URL` sin el `/api/`.
