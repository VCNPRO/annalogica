# Sistema de Notificaciones por Email - Annalogica

## 📧 Descripción General

Sistema automatizado de notificaciones por email para usuarios y administradores de Annalogica, implementado con **Resend** y ejecutado mediante cron jobs de Vercel.

## 🎯 Tipos de Notificaciones

### 1. **Advertencia de Cuota (80%+)**
- **Cuándo**: Usuario alcanza 80% o más de su cuota mensual
- **Frecuencia**: Máximo 1 email cada 24 horas
- **Contenido**:
  - Porcentaje de uso actual
  - Minutos consumidos vs. cuota total
  - Minutos restantes
  - Barra de progreso visual
  - Opciones para actualizar plan

### 2. **Expiración de Trial**
- **Cuándo**: Trial está por expirar (3 días antes y 1 día antes)
- **Frecuencia**: Solo en días 3 y 1 antes de expiración
- **Contenido**:
  - Días restantes de trial
  - Fecha exacta de expiración
  - Beneficios del plan que se perderán
  - Botón para actualizar plan

### 3. **Errores Críticos al Admin**
- **Cuándo**: Errores graves en el sistema
- **Destinatario**: Email del administrador (`ADMIN_EMAIL`)
- **Contenido**:
  - Tipo de error
  - Mensaje de error
  - Stack trace completo
  - Usuario afectado (si aplica)
  - Timestamp del error

### 4. **Bienvenida a Nuevos Usuarios**
- **Cuándo**: Nuevo usuario se registra
- **Contenido**:
  - Saludo personalizado
  - Plan asignado
  - Características principales
  - Guía de inicio rápido
  - Botón para ir al dashboard

## ⚙️ Configuración

### Variables de Entorno Requeridas

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxx

# Email del administrador para alertas
ADMIN_EMAIL=admin@annalogica.eu

# Secret para cron job (ya existente)
CRON_SECRET=tu_secret_aqui
```

### Obtener API Key de Resend

1. Crear cuenta en [resend.com](https://resend.com)
2. Verificar dominio `annalogica.eu`
3. Agregar registros DNS:
   ```
   TXT @ "resend-verification=xxxxx"
   MX @ mx1.resend.com (priority 10)
   MX @ mx2.resend.com (priority 20)
   ```
4. Generar API key en dashboard
5. Agregar a `.env.local` y Vercel

## 🗄️ Migración de Base de Datos

Ejecutar en Neon Database:

```sql
-- Agregar columnas para tracking de notificaciones
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_quota_warning_sent TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_trial_warning_sent TIMESTAMP;

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_users_quota_check
  ON users(monthly_usage, monthly_quota, subscription_status, last_quota_warning_sent)
  WHERE monthly_quota > 0 AND subscription_status IN ('active', 'trialing');

CREATE INDEX IF NOT EXISTS idx_users_trial_check
  ON users(subscription_status, subscription_end_date, last_trial_warning_sent)
  WHERE subscription_status = 'trialing' AND subscription_end_date IS NOT NULL;
```

**Archivo:** `lib/db-migration-notification-columns.sql`

## 🔧 Componentes del Sistema

### 1. **Módulo de Emails** (`lib/email-notifications.ts`)

Funciones disponibles:

```typescript
// Advertencia de cuota al 80%+
await sendQuotaWarningEmail({
  userEmail: 'user@example.com',
  userName: 'Juan Pérez',
  currentUsage: 240,      // minutos
  monthlyQuota: 300,      // minutos
  usagePercent: 80,
});

// Advertencia de expiración de trial
await sendTrialExpiringEmail({
  userEmail: 'user@example.com',
  userName: 'María García',
  plan: 'pro',
  daysRemaining: 3,
  endDate: new Date('2025-10-16'),
});

// Alerta de error al admin
await sendAdminErrorEmail({
  errorType: 'TranscriptionError',
  errorMessage: 'Whisper API timeout after 30s',
  userId: 'user_id_here',
  userEmail: 'user@example.com',
  stackTrace: error.stack,
  timestamp: new Date(),
});

// Email de bienvenida
await sendWelcomeEmail({
  userEmail: 'newuser@example.com',
  userName: 'Pedro López',
  plan: 'basico',
});
```

### 2. **Cron Job** (`app/api/cron/check-notifications/route.ts`)

**Endpoint:** `GET /api/cron/check-notifications`

**Frecuencia:** Cada 6 horas (`0 */6 * * *`)

**Proceso:**
1. Verificar `CRON_SECRET` para seguridad
2. Buscar usuarios con cuota ≥ 80% (no notificados en últimas 24h)
3. Enviar emails de advertencia de cuota
4. Buscar trials expirando en 3 días o 1 día
5. Enviar emails de expiración de trial
6. Buscar trials ya expirados
7. Downgrade automático a plan free
8. Registrar todas las acciones en logs

**Respuesta:**
```json
{
  "success": true,
  "message": "Notification checks completed",
  "notifications": {
    "quotaWarnings": 5,
    "trialExpirations": 2,
    "errors": []
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

### 3. **Configuración Vercel** (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/check-notifications",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## 📊 Plantillas de Email

Todas las plantillas incluyen:
- ✅ Diseño responsive
- ✅ Branding de Annalogica (gradiente morado/azul)
- ✅ Botones de call-to-action
- ✅ Estilos inline (mejor compatibilidad)
- ✅ Información de contacto (soporte@annalogica.eu)
- ✅ Footer con copyright

### Paleta de Colores

```css
--primary: #667eea (azul)
--secondary: #764ba2 (morado)
--warning: #f59e0b (amarillo)
--success: #10b981 (verde)
--error: #dc2626 (rojo)
```

## 🔍 Testing

### Probar Email de Cuota

```bash
# Desde consola de Vercel o local
curl -X GET http://localhost:3000/api/cron/check-notifications \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Probar Email Individual

```typescript
// Desde un API route o script
import { sendQuotaWarningEmail } from '@/lib/email-notifications';

await sendQuotaWarningEmail({
  userEmail: 'test@annalogica.eu',
  userName: 'Test User',
  currentUsage: 240,
  monthlyQuota: 300,
  usagePercent: 80,
});
```

### Simular Usuario con Cuota Alta

```sql
-- En Neon Database
UPDATE users
SET
  monthly_usage = 240,
  monthly_quota = 300,
  last_quota_warning_sent = NULL
WHERE email = 'test@annalogica.eu';
```

## 🚀 Deployment Checklist

- [ ] **1. Configurar Resend**
  - [ ] Crear cuenta en Resend
  - [ ] Verificar dominio annalogica.eu
  - [ ] Agregar registros DNS
  - [ ] Generar API key

- [ ] **2. Variables de Entorno en Vercel**
  - [ ] Agregar `RESEND_API_KEY`
  - [ ] Agregar `ADMIN_EMAIL`
  - [ ] Verificar `CRON_SECRET` existe

- [ ] **3. Migración de Base de Datos**
  - [ ] Ejecutar `lib/db-migration-notification-columns.sql` en Neon
  - [ ] Verificar columnas creadas: `last_quota_warning_sent`, `last_trial_warning_sent`
  - [ ] Verificar índices creados

- [ ] **4. Deploy**
  - [ ] Commit y push cambios
  - [ ] Verificar deploy en Vercel
  - [ ] Verificar cron job configurado en Vercel Dashboard

- [ ] **5. Testing**
  - [ ] Probar endpoint manualmente con curl
  - [ ] Simular usuario con cuota alta
  - [ ] Verificar recepción de email
  - [ ] Verificar logs en Vercel

## 📈 Monitoreo

### Logs en Vercel

```bash
# Ver logs del cron job
vercel logs --project=annalogica --filter=/api/cron/check-notifications

# Ver logs de emails enviados
vercel logs --project=annalogica --filter="email sent"
```

### Métricas Importantes

- Total de emails enviados por día
- Tasa de fallo en envío de emails
- Usuarios que alcanzan 80% de cuota
- Trials que expiran por mes
- Downgrade automáticos (trial → free)

### Queries SQL Útiles

```sql
-- Usuarios cerca del límite de cuota
SELECT
  email,
  name,
  monthly_usage,
  monthly_quota,
  ROUND((monthly_usage::float / monthly_quota) * 100) as percent_used,
  last_quota_warning_sent
FROM users
WHERE monthly_quota > 0
  AND monthly_usage >= (monthly_quota * 0.8)
ORDER BY percent_used DESC;

-- Trials expirando pronto
SELECT
  email,
  name,
  subscription_plan,
  subscription_end_date,
  subscription_end_date - NOW() as time_remaining
FROM users
WHERE subscription_status = 'trialing'
  AND subscription_end_date <= NOW() + INTERVAL '7 days'
ORDER BY subscription_end_date ASC;

-- Historial de notificaciones
SELECT
  COUNT(*) FILTER (WHERE last_quota_warning_sent IS NOT NULL) as quota_warnings_sent,
  COUNT(*) FILTER (WHERE last_trial_warning_sent IS NOT NULL) as trial_warnings_sent
FROM users;
```

## 🛡️ Seguridad

### Prevención de Spam

- ✅ Máximo 1 email de cuota cada 24 horas
- ✅ Emails de trial solo en días específicos (3 y 1)
- ✅ Timestamp tracking en base de datos
- ✅ Validación de `CRON_SECRET` en endpoint

### Rate Limits de Resend

**Plan Gratuito:**
- 100 emails/día
- 3,000 emails/mes

**Plan Pro ($20/mes):**
- 50,000 emails/mes
- Sin límite diario

### Recomendaciones

1. Monitorear uso de API de Resend
2. Implementar circuit breaker si API falla
3. Agregar retry logic con backoff exponencial
4. Loggear todos los errores de envío
5. No exponer `RESEND_API_KEY` en frontend

## 🐛 Troubleshooting

### Email no se envía

**Verificar:**
1. `RESEND_API_KEY` está configurada correctamente
2. Dominio verificado en Resend
3. Registros DNS configurados
4. Logs de Vercel para errores
5. Rate limit de Resend no alcanzado

```bash
# Ver logs de errores
vercel logs --project=annalogica --filter="Error sending"
```

### Cron job no ejecuta

**Verificar:**
1. `vercel.json` tiene configuración correcta
2. Cron job visible en Vercel Dashboard > Cron Jobs
3. `CRON_SECRET` configurado en variables de entorno
4. Endpoint responde correctamente con auth header

```bash
# Test manual del endpoint
curl -X GET https://annalogica.eu/api/cron/check-notifications \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Usuario recibe múltiples emails

**Causa:** No se actualiza `last_*_warning_sent`

**Solución:**
```sql
-- Verificar timestamps
SELECT id, email, last_quota_warning_sent, last_trial_warning_sent
FROM users
WHERE last_quota_warning_sent IS NOT NULL;

-- Forzar actualización si es necesario
UPDATE users
SET last_quota_warning_sent = NOW()
WHERE email = 'user@example.com';
```

## 📝 Próximas Mejoras

1. **Dashboard de Notificaciones**
   - Ver historial de emails enviados
   - Estadísticas de open rate y clicks
   - Configurar preferencias de usuario

2. **Más Tipos de Notificaciones**
   - Confirmación de pago
   - Factura mensual
   - Recordatorio de renovación
   - Actualización de plan confirmada

3. **Personalización**
   - Plantillas dinámicas
   - Idioma basado en preferencias
   - Frecuencia configurable por usuario

4. **Integración con Marketing**
   - Newsletter mensual
   - Anuncios de nuevas features
   - Casos de uso y tips

## 📞 Soporte

**Email:** soporte@annalogica.eu
**Documentación Resend:** https://resend.com/docs
**Vercel Cron Jobs:** https://vercel.com/docs/cron-jobs
