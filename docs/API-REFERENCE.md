# 📡 API Reference - Annalogica

**Última actualización:** 19 Octubre 2025

---

## 🔐 Autenticación

Todas las APIs requieren autenticación via **JWT cookies httpOnly**, excepto:
- Endpoints públicos (health, version)
- Webhooks (inngest, stripe)
- Cron jobs (requieren `CRON_SECRET`)

---

## 📁 Estructura de APIs

### `/api/auth` - Autenticación de Usuarios

#### `POST /api/auth/register`
**Descripción:** Registrar nuevo usuario
**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "name": "John Doe"
}
```
**Response:** `{ success: true, user: {...} }`

#### `POST /api/auth/login`
**Descripción:** Iniciar sesión
**Body:** `{ email, password }`
**Response:** Cookie httpOnly + `{ success: true, user: {...} }`

#### `POST /api/auth/logout`
**Descripción:** Cerrar sesión
**Response:** `{ success: true }`

#### `GET /api/auth/me`
**Descripción:** Obtener usuario actual
**Response:** `{ user: {...} }`

---

### `/api/blob-upload` - Upload de Archivos

#### `POST /api/blob-upload`
**Descripción:** Maneja uploads a Vercel Blob (usado por `@vercel/blob/client`)
**Autenticación:** JWT required
**Callbacks:**
- `onBeforeGenerateToken`: Valida archivo y cuota
- `onUploadCompleted`: Crea job en DB

---

### `/api/process` - Procesamiento de Audio/Video

#### `POST /api/process`
**Descripción:** Procesa audio/video (transcripción + opcional resumen/tags)
**Body:**
```json
{
  "blobUrl": "https://...",
  "fileName": "audio.mp3",
  "actions": ["Subtítulos", "Resumir", "Etiquetas", "Oradores"],
  "summaryType": "detailed" | "short",
  "language": "es"
}
```
**Response:** `{ success: true, jobId: "..." }`

---

### `/api/process-document` - Procesamiento de Documentos

#### `POST /api/process-document`
**Descripción:** Procesa documentos PDF/DOCX/TXT (extracción + resumen/tags)
**Body:**
```json
{
  "blobUrl": "https://...",
  "fileName": "doc.pdf",
  "actions": ["Resumir", "Etiquetas"],
  "summaryType": "detailed",
  "language": "es"
}
```
**Response:** `{ success: true, jobId: "...", status: "processing" }`

---

### `/api/jobs` - Estado de Jobs

#### `GET /api/jobs/[jobId]`
**Descripción:** Obtener estado de un job específico
**Response:**
```json
{
  "job": {
    "id": "...",
    "status": "processing" | "transcribed" | "completed" | "failed",
    "filename": "...",
    "txt_url": "...",
    "srt_url": "...",
    "summary_url": "...",
    "metadata": { ... }
  }
}
```

---

### `/api/files` - Gestión de Archivos

#### `GET /api/files`
**Descripción:** Lista archivos/jobs del usuario
**Response:** Array de jobs

---

### `/api/processed-files` - Archivos Procesados

#### `GET /api/processed-files`
**Descripción:** Lista archivos completados con resultados
**Response:** Array de jobs completados

#### `GET /api/processed-files/[jobId]`
**Descripción:** Detalles de archivo procesado específico

---

### `/api/tasks` - Control Manual de Tareas

#### `POST /api/tasks`
**Descripción:** Reiniciar tareas manualmente (transcripción o resumen)
**Body:**
```json
{
  "jobId": "...",
  "task": "transcribe" | "summarize"
}
```
**Response:** `{ success: true, message: "..." }`

---

### `/api/translate` - Traducción de Transcripciones

#### `POST /api/translate`
**Descripción:** Traduce transcripción a otro idioma usando AssemblyAI LeMUR
**Body:**
```json
{
  "jobId": "...",
  "targetLanguage": "en"
}
```
**Response:**
```json
{
  "success": true,
  "translatedText": "...",
  "targetLanguage": "en"
}
```
**Idiomas soportados:** en, es, ca, eu, gl, pt, fr, de, it, zh, ja, ko, ar, ru

---

### `/api/admin` - Panel de Administración

Requiere rol `admin` en el usuario.

#### `GET /api/admin/stats`
**Descripción:** Estadísticas de la plataforma

#### `GET /api/admin/users`
**Descripción:** Lista usuarios con métricas

#### `PATCH /api/admin/users`
**Descripción:** Actualizar configuración de usuario
**Body:**
```json
{
  "userId": "...",
  "accountType": "production" | "demo" | "test" | "trial",
  "monthlyBudgetUsd": 100.00,
  "tags": ["vip", "beta"],
  "isActive": true
}
```

#### `GET /api/admin/alerts`
**Descripción:** Obtener alertas activas

#### `POST /api/admin/alerts`
**Descripción:** Ejecutar verificación manual de alertas

#### `PATCH /api/admin/alerts`
**Descripción:** Resolver alerta
**Body:** `{ alertId: "...", resolvedBy: "..." }`

---

### `/api/stripe` - Pagos y Suscripciones

#### `POST /api/stripe/checkout`
**Descripción:** Crear sesión de checkout de Stripe
**Body:**
```json
{
  "priceId": "price_xxx",
  "planName": "Pro"
}
```

#### `POST /api/stripe/webhook`
**Descripción:** Webhook de eventos de Stripe
**Autenticación:** Stripe signature validation

---

### `/api/subscription` - Estado de Suscripción

#### `GET /api/subscription/status`
**Descripción:** Estado de suscripción del usuario actual
**Response:**
```json
{
  "plan": "free" | "basic" | "pro" | "business",
  "status": "active" | "inactive",
  "usage": 5,
  "quota": 100,
  "canUpload": true
}
```

---

### `/api/inngest` - Worker Background

#### `GET/POST/PUT /api/inngest`
**Descripción:** Endpoint para Inngest workers
**Autenticación:** Inngest signing key
**No llamar directamente** - Solo para Inngest

**Funciones registradas:**
- `task-transcribe-file` - Procesa audio/video
- `task-summarize-file` - Genera resumen/tags de audio
- `task-process-document` - Procesa documentos PDF/DOCX/TXT
- `task-summarize-document` - Legacy (backward compat)

---

### `/api/cron` - Cron Jobs

#### `GET /api/cron/daily-checks`
**Descripción:** Cron job consolidado diario (9:00 AM UTC)
**Autenticación:** `CRON_SECRET` via Bearer token
**Tareas:**
1. Actualizar costes de usuarios
2. Limpieza blobs >30 días
3. Refrescar métricas
4. Verificar alertas costes altos
5. Verificar cuotas excedidas
6. Enviar notificaciones email

**Configuración:** `vercel.json`

---

### `/api/health` - Health Check

#### `GET /api/health`
**Descripción:** Verificar estado de la API
**Response:** `{ status: "ok", timestamp: "..." }`
**Público:** No requiere autenticación

---

### `/api/version` - Versión de la API

#### `GET /api/version`
**Descripción:** Información de versión y deployment
**Response:**
```json
{
  "version": "1.0.0",
  "environment": "production",
  "commit": "...",
  "uptime": 12345
}
```
**Público:** No requiere autenticación

---

### `/api/user-guide` - Guía de Usuario

#### `GET /api/user-guide`
**Descripción:** Descarga PDF de guía de usuario
**Response:** PDF file

---

## 🔒 Seguridad

### Headers Requeridos

**Autenticación:**
```
Cookie: auth_token=<jwt>
```

**Cron Jobs:**
```
Authorization: Bearer <CRON_SECRET>
```

**Webhooks Stripe:**
```
Stripe-Signature: <signature>
```

### Rate Limiting

Implementado via **Upstash Redis**:
- Auth endpoints: 5 req/min
- Upload endpoints: 10 req/min
- Otros: 100 req/min

---

## 📊 Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validación fallida) |
| 401 | Unauthorized (no autenticado) |
| 403 | Forbidden (sin permisos/cuota) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

## 🔄 Flujo de Procesamiento

### Audio/Video:
```
1. Cliente → POST /api/blob-upload (upload archivo)
2. onUploadCompleted → Crea job en DB
3. Cliente → POST /api/process (con blobUrl)
4. API → Trigger Inngest worker
5. Worker → Descarga, transcribe (AssemblyAI), guarda resultados
6. Cliente → Poll GET /api/jobs/[jobId] (cada 5s)
7. Job completed → Cliente descarga resultados
```

### Documentos:
```
1. Cliente → POST /api/blob-upload (upload PDF/DOCX/TXT)
2. Cliente → POST /api/process-document (con blobUrl)
3. API → Trigger Inngest worker
4. Worker → Descarga, extrae texto, genera resumen/tags
5. Cliente → Poll GET /api/jobs/[jobId]
6. Job completed → Cliente descarga resultados
```

---

## 📝 Notas

- Todos los blobs se eliminan después de 30 días (cron diario)
- Archivos originales de audio se eliminan inmediatamente tras transcripción
- Archivos de documentos se eliminan tras 5min de completar
- Transcripciones/resultados se mantienen 30 días

---

**Mantenido por:** Equipo Annalogica
**Contacto:** <admin@annalogica.eu>
