# 🏗️ Infraestructura Annalogica - Documentación Completa

**Última actualización:** 2025-10-11
**Estado:** ✅ Producción - Limpia, Segura y Escalable

---

## 📊 Stack Tecnológico

### Frontend
- **Framework:** Next.js 15.5.4 (App Router)
- **UI:** React 19.1.0 + TypeScript + Tailwind CSS
- **Hosting:** Vercel (edge functions + CDN global)

### Backend
- **API:** Next.js API Routes (serverless)
- **Base de Datos:** PostgreSQL (Neon - Serverless)
- **Almacenamiento:** Vercel Blob Storage
- **Cache/Rate Limiting:** Upstash Redis (opcional)
- **Procesamiento Async:** Inngest

### IA y Procesamiento
- **Transcripción:** AssemblyAI (Whisper)
- **Resúmenes:** Claude API (Anthropic)
- **Procesamiento:** Inngest (background jobs)

---

## 🗄️ Base de Datos

### Proveedor: Neon (Serverless Postgres)
- **Proyecto:** `annalogica_01`
- **Región:** AWS US East 1 (N. Virginia)
- **Branch:** Production (main)
- **Backups:** Automáticos (Neon managed)

### Tablas Principales:

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### `transcription_jobs`
```sql
CREATE TABLE transcription_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  filename VARCHAR(500) NOT NULL,
  audio_url TEXT NOT NULL,
  audio_size_bytes BIGINT,
  audio_duration_seconds NUMERIC(10,2),
  assemblyai_id VARCHAR(255),
  txt_url TEXT,
  srt_url TEXT,
  vtt_url TEXT,
  speakers_url TEXT,
  summary_url TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_user ON transcription_jobs(user_id);
CREATE INDEX idx_jobs_status ON transcription_jobs(status);
CREATE INDEX idx_jobs_created ON transcription_jobs(created_at DESC);
```

---

## 🔐 Variables de Entorno

### Variables Requeridas en Vercel:

#### Autenticación
```bash
JWT_SECRET=<token_aleatorio_64_caracteres>
```

#### Base de Datos (Neon)
```bash
POSTGRES_URL=<conexion_completa_neon>
POSTGRES_PRISMA_URL=<con_pgbouncer>
POSTGRES_URL_NON_POOLING=<sin_pooling>
# Neon genera automáticamente: DATABASE_URL, PGHOST, PGUSER, etc.
```

#### Almacenamiento (Vercel Blob)
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXX
```

#### IA y Procesamiento
```bash
ASSEMBLYAI_API_KEY=aai_XXXXX
CLAUDE_API_KEY=sk-ant-api-XXXXX
```

#### Inngest (Background Jobs)
```bash
INNGEST_EVENT_KEY=xxxxx
INNGEST_SIGNING_KEY=signkey-xxxxx
```

#### Seguridad
```bash
CRON_SECRET=<token_aleatorio_64_caracteres>
```

#### Opcional (Rate Limiting)
```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```
> **Nota:** Si no están configuradas, rate limiting se desactiva automáticamente.

---

## 🔒 Seguridad

### Implementado ✅

1. **Autenticación:**
   - JWT en cookies httpOnly (protección contra XSS)
   - Secure flag en producción
   - SameSite: Lax
   - Expiración: 7 días

2. **Headers de Seguridad:**
   - HSTS (Strict-Transport-Security)
   - X-Frame-Options: SAMEORIGIN
   - Content-Security-Policy (CSP completo)
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection

3. **Rate Limiting (Opcional con Upstash):**
   - Login: 5 intentos / 5 minutos
   - Register: 3 registros / 1 hora
   - Upload: 10 archivos / 1 hora
   - Process: 5 transcripciones / 1 hora
   - Download: 30 descargas / 1 hora

4. **Roles y Permisos:**
   - `user`: Acceso estándar
   - `admin`: Acceso a `/api/admin/*`

5. **Cron Jobs Protegidos:**
   - Header: `Authorization: Bearer ${CRON_SECRET}`

6. **Logging de Seguridad:**
   - Intentos de login fallidos
   - Accesos no autorizados
   - Eventos críticos del sistema

---

## 📡 Endpoints API

### Autenticación (`/api/auth/`)

#### `POST /api/auth/register`
Crea nueva cuenta de usuario.
- **Body:** `{ email, password, name? }`
- **Response:** `{ success, user, message }`
- **Cookie:** `auth-token` (httpOnly)

#### `POST /api/auth/login`
Inicia sesión.
- **Body:** `{ email, password }`
- **Response:** `{ success, user, message }`
- **Cookie:** `auth-token` (httpOnly)

#### `POST /api/auth/logout`
Cierra sesión y elimina cookie.
- **Response:** `{ success, message }`

#### `GET /api/auth/me`
Verifica autenticación actual.
- **Auth:** Cookie requerida
- **Response:** `{ user }`

### Procesamiento (`/api/`)

#### `POST /api/blob-upload`
Sube archivo de audio/video a Blob Storage.
- **Auth:** Requerida
- **Body:** FormData con archivo
- **Response:** `{ url, pathname, size }`

#### `POST /api/process`
Inicia procesamiento de transcripción.
- **Auth:** Requerida
- **Body:** `{ audioUrl, filename, audioSize? }`
- **Response:** `{ jobId, status }`

#### `GET /api/files`
Lista todos los archivos del usuario.
- **Auth:** Requerida
- **Response:** `{ files: [...] }`

#### `GET /api/jobs/[jobId]`
Obtiene estado y resultados de un job.
- **Auth:** Requerida (solo propietario)
- **Response:** `{ job, files }`

### Admin (`/api/admin/`)

#### `GET /api/admin/usage?mode=all|user|platform`
Obtiene estadísticas de uso.
- **Auth:** Admin requerido
- **Response:** Métricas detalladas

### Sistema (`/api/`)

#### `GET /api/health`
Health check del sistema.
- **Response:** `{ status, checks: { server, database, env } }`

#### `GET /api/cron/cleanup`
Limpieza automática de archivos antiguos (30 días).
- **Auth:** `Authorization: Bearer ${CRON_SECRET}`
- **Trigger:** Cron diario (2:00 AM UTC)
- **Response:** `{ success, deletedFiles, deletedJobs }`

---

## ⚙️ Configuración Vercel

### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ],
  "functions": {
    "app/api/inngest/route.ts": {
      "maxDuration": 300
    },
    "app/api/process/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Headers de Seguridad
Configurados en `next.config.ts`:
- HSTS con preload
- CSP completo
- CORS configurado para https://annalogica.eu

---

## 🔄 Flujo de Procesamiento (Inngest)

### Job: `transcription/process`

1. **Inicio:** Usuario sube archivo → `/api/process`
2. **Transcripción:** Inngest → AssemblyAI (speaker diarization)
3. **Generación:** TXT, SRT, VTT, speakers report
4. **Resumen:** Claude API → genera resumen inteligente
5. **Guardado:** Todos los archivos → Vercel Blob
6. **Limpieza:** Audio original eliminado (ahorro de almacenamiento)
7. **Notificación:** Estado actualizado en BD

**Duración típica:** 2-10 minutos (dependiendo del audio)

---

## 📦 Almacenamiento

### Vercel Blob Storage
- **Retención:** 30 días (limpieza automática)
- **Archivos guardados:**
  - ✅ Transcripciones (TXT)
  - ✅ Subtítulos (SRT, VTT)
  - ✅ Resúmenes (TXT)
  - ✅ Reportes de hablantes
  - ✅ Metadatos
- **Archivos eliminados:**
  - ❌ Audio/video original (tras transcripción exitosa)

**Ahorro de almacenamiento:** ~95%

---

## 🚀 Deployment

### Proceso Automático:
1. Push a `main` en GitHub
2. Vercel detecta cambio automáticamente
3. Build y deploy automático
4. Variables de entorno inyectadas
5. Health checks ejecutados
6. Rollback automático si falla

### Verificación Post-Deploy:
```bash
# 1. Health check
curl https://annalogica.eu/api/health

# 2. Login test
# Ir a https://annalogica.eu/login y probar

# 3. Verificar logs en Vercel Dashboard
```

---

## 📊 Monitoreo

### Health Checks
- **Endpoint:** `/api/health`
- **Verifica:**
  - Servidor activo
  - Conexión a base de datos
  - Variables de entorno críticas

### Logging
- **Sistema:** Centralizado en `lib/logger.ts`
- **Tipos:**
  - `info`: Eventos normales
  - `error`: Errores con stack trace
  - `security`: Eventos de seguridad
  - `performance`: Métricas de rendimiento

### Logs en Vercel:
- Dashboard → Logs → Filter by errors
- Real-time streaming
- Búsqueda por endpoint

---

## 🛠️ Mantenimiento

### Tareas Automáticas:
- ✅ Limpieza de archivos antiguos (diaria, 2:00 AM UTC)
- ✅ Backups de BD (Neon automático)

### Tareas Manuales:
- 🔄 Revisar logs semanalmente
- 🔄 Monitorear uso de Blob Storage
- 🔄 Actualizar dependencias mensualmente

---

## 📈 Escalabilidad

### Actual (Plan Gratuito):
- **Usuarios:** Ilimitados
- **Transcripciones:** 10 archivos/mes por usuario
- **Almacenamiento:** ~1GB (con limpieza)
- **Función:** 100 GB-hours/mes (Vercel)

### Próxima Fase (Premium):
- Implementar Stripe para pagos
- Planes: Free (10), Pro (100), Business (ilimitado)
- Auto-scaling en Vercel
- Multi-región con Neon

---

## 🐛 Troubleshooting

### Login falla con 500
**Causa:** Columna `role` no existe en BD
**Solución:** Ejecutar migración en Neon (ver `DEPLOYMENT-SECURITY.md`)

### Upload falla con 401
**Causa:** Cookie no se envía
**Solución:** Verificar `credentials: 'include'` en fetch

### Cron job falla con 401
**Causa:** `CRON_SECRET` no configurado
**Solución:** Agregar variable en Vercel

### Health check devuelve 503
**Causa:** BD desconectada o variables faltantes
**Solución:** Verificar logs y variables de entorno

---

## 📚 Recursos

- **Producción:** https://annalogica.eu
- **Vercel Dashboard:** https://vercel.com/solammedia-9886s-projects/annalogica
- **Neon Console:** https://console.neon.tech/app/projects/lucky-surf-17443478
- **GitHub:** https://github.com/VCNPRO/annalogica
- **Inngest:** https://app.inngest.com/env/production/apps

---

**✅ Infraestructura lista para producción: Limpia, Segura, Confiable y Escalable**
