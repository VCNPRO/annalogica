# 🎛️ Dashboard de Administración - Annalogica

## 📋 Índice

1. [Introducción](#introducción)
2. [Instalación y Configuración](#instalación-y-configuración)
3. [Base de Datos](#base-de-datos)
4. [Funcionalidades](#funcionalidades)
5. [Uso del Dashboard](#uso-del-dashboard)
6. [APIs Disponibles](#apis-disponibles)
7. [Sistema de Alertas](#sistema-de-alertas)
8. [Gestión de Usuarios](#gestión-de-usuarios)

---

## 🎯 Introducción

El Dashboard de Administración de Annalogica es un sistema completo para:

- **Gestionar usuarios** con categorización avanzada (producción, demo, test, trial)
- **Monitorear costes** en tiempo real por usuario y globalmente
- **Configurar alertas** automáticas para costes altos, cuotas excedidas, errores
- **Analizar métricas** detalladas de uso de la plataforma
- **Auditoría completa** de todas las acciones administrativas

---

## 🚀 Instalación y Configuración

### Paso 1: Aplicar Migraciones de Base de Datos

Ejecuta el siguiente script SQL en tu base de datos PostgreSQL (Vercel Postgres):

```bash
# Conectar a tu base de datos
psql $POSTGRES_URL

# Ejecutar la migración
\i lib/db-migration-admin-management.sql
```

O desde el dashboard de Vercel Postgres, copia y ejecuta el contenido de:
- `lib/db-migration-admin-management.sql`

### Paso 2: Crear un Usuario Administrador

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'tu-email@annalogica.eu';
```

### Paso 3: Configurar Variables de Entorno (Opcional)

Para notificaciones por email de alertas:

```bash
# .env.local
RESEND_API_KEY=tu_api_key_de_resend
ADMIN_EMAIL=admin@annalogica.eu
```

---

## 🗄️ Base de Datos

### Nuevas Tablas Creadas

#### 1. Campos Agregados a `users`

```sql
account_type VARCHAR(20) DEFAULT 'production'
  -- Valores: production, demo, test, trial

account_status VARCHAR(20) DEFAULT 'active'
  -- Valores: active, suspended, cancelled, pending

internal_notes TEXT
  -- Notas internas del admin sobre el usuario

tags TEXT[]
  -- Tags: ['vip', 'beta', 'partner', 'priority', 'demo', etc.]

last_activity_at TIMESTAMP
  -- Última actividad del usuario

total_cost_usd DECIMAL(10, 2)
  -- Coste total acumulado

monthly_budget_usd DECIMAL(10, 2)
  -- Presupuesto mensual asignado (opcional)
```

#### 2. Tabla `system_alerts`

Registro de alertas del sistema:

```sql
CREATE TABLE system_alerts (
  id UUID PRIMARY KEY,
  alert_type VARCHAR(50),
  severity VARCHAR(20),
  title VARCHAR(200),
  message TEXT,
  user_id UUID,
  metadata JSONB,
  is_resolved BOOLEAN,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  created_at TIMESTAMP
);
```

#### 3. Tabla `alert_config`

Configuración de alertas:

```sql
CREATE TABLE alert_config (
  id UUID PRIMARY KEY,
  alert_type VARCHAR(50) UNIQUE,
  is_enabled BOOLEAN,
  threshold_value DECIMAL(10, 2),
  notification_emails TEXT[],
  check_interval_minutes INT,
  metadata JSONB
);
```

#### 4. Vista Materializada `user_metrics_summary`

Métricas precalculadas para consultas rápidas:

```sql
CREATE MATERIALIZED VIEW user_metrics_summary AS
SELECT
  u.id,
  u.email,
  u.account_type,
  COUNT(ul.id) as total_operations,
  SUM(ul.cost_usd) as total_cost,
  ...
FROM users u
LEFT JOIN usage_logs ul ON u.id = ul.user_id
GROUP BY u.id;
```

---

## ✨ Funcionalidades

### 1. **Gestión de Usuarios**

#### Categorización por Tipo de Cuenta

- **Production**: Clientes pagando en producción
- **Demo**: Cuentas de demostración para ventas
- **Test**: Cuentas de prueba internas
- **Trial**: Usuarios en período de prueba

#### Estados de Cuenta

- **Active**: Cuenta activa y funcionando
- **Suspended**: Suspendida (no puede usar el servicio)
- **Cancelled**: Cancelada (puede reactivarse)
- **Pending**: Pendiente de activación

#### Tags Personalizados

Etiqueta usuarios con tags como:
- `vip` - Cliente VIP
- `beta` - Usuario beta tester
- `partner` - Socio comercial
- `high-volume` - Alto volumen de uso
- `support` - Requiere soporte especial

### 2. **Monitoreo de Costes**

#### Tracking Automático

El sistema registra automáticamente en `usage_logs`:
- ✅ Subida de archivos → Coste de storage
- ✅ Transcripciones → $0.00046 por archivo (Whisper)
- ✅ Resúmenes → Coste calculado por tokens (LeMUR/Claude)
- ✅ Descargas → Coste de bandwidth

#### Alertas de Costes

- **Alerta por Usuario**: Se activa cuando un usuario supera el umbral configurado ($10 por defecto)
- **Alerta por Presupuesto**: Se activa cuando supera su presupuesto mensual asignado
- **Alerta Plataforma**: Monitorea el coste total de la plataforma

### 3. **Sistema de Alertas**

#### Tipos de Alertas

1. **high_cost_user** - Usuario con coste elevado
2. **quota_exceeded** - Cuota mensual excedida
3. **service_error** - Error en el servicio
4. **storage_high** - Almacenamiento alto
5. **api_rate_limit** - Límite de API alcanzado
6. **payment_failed** - Fallo en pago
7. **unusual_activity** - Actividad inusual

#### Severidad

- **Low** (Informativa)
- **Medium** (Atención requerida)
- **High** (Urgente)
- **Critical** (Inmediata)

#### Configuración

```typescript
// Ejemplo: Configurar umbral de coste alto
await updateAlertConfig('high_cost_user', {
  is_enabled: true,
  threshold_value: 15.00, // $15
  notification_emails: ['admin@annalogica.eu', 'ops@annalogica.eu'],
  check_interval_minutes: 60
});
```

### 4. **Métricas y Estadísticas**

#### Vista General Plataforma

- Total de usuarios (activos, suspendidos, etc.)
- Coste total acumulado
- Coste del mes actual
- Archivos procesados
- Promedio de coste por usuario

#### Por Usuario

- Coste últimos 30 días
- Número de archivos procesados
- Operaciones realizadas
- Última actividad
- Plan actual y estado

---

## 🖥️ Uso del Dashboard

### Acceso al Dashboard

```
https://annalogica.eu/admin
```

Requiere estar autenticado con una cuenta de rol `admin`.

### Pantalla Principal

#### 1. Cards de Estadísticas

- **Total Usuarios**: Con count de activos
- **Coste Total**: Con coste del mes actual
- **Archivos Procesados**: Histórico
- **Alertas Activas**: Con count de críticas

#### 2. Panel de Alertas

Muestra las alertas activas con:
- Severidad (color-coded)
- Fecha y hora
- Usuario afectado
- Botón "Resolver"

#### 3. Filtros y Búsqueda

- **Buscar por email**: Busca usuarios por email
- **Filtrar por tipo**: production, demo, test, trial
- **Filtrar por estado**: active, suspended, cancelled, pending
- **Ordenar por**: coste, actividad, fecha registro, email
- **Orden**: ascendente / descendente

#### 4. Tabla de Usuarios

Cada fila muestra:
- Email y tags
- Tipo de cuenta (badge color)
- Estado (badge color)
- Plan actual
- Coste últimos 30 días (y presupuesto si existe)
- Total de archivos
- Última actividad
- Botón "Ver Detalles"

### Acciones sobre Usuarios

#### Cambiar Tipo de Cuenta

```typescript
// Cambiar a demo
await updateUserAccountType(userId, 'demo', adminUserId);
```

#### Cambiar Estado

```typescript
// Suspender usuario
await updateUserAccountStatus(userId, 'suspended', adminUserId, 'Falta de pago');
```

#### Agregar Notas Internas

```typescript
await updateUserNotes(userId, 'Cliente VIP - Contactar antes de suspender', adminUserId);
```

#### Establecer Tags

```typescript
await updateUserTags(userId, ['vip', 'high-volume', 'partner'], adminUserId);
```

#### Establecer Presupuesto Mensual

```typescript
// $50 mensuales
await setUserMonthlyBudget(userId, 50.00, adminUserId);
```

---

## 🔌 APIs Disponibles

### GET /api/admin/stats

Obtiene estadísticas generales de la plataforma.

**Response:**
```json
{
  "totalUsers": 150,
  "activeUsers": 120,
  "usersByType": {
    "production": 100,
    "demo": 30,
    "test": 15,
    "trial": 5
  },
  "usersByStatus": {
    "active": 120,
    "suspended": 10,
    "cancelled": 15,
    "pending": 5
  },
  "totalCostAllTime": 1250.50,
  "totalCostThisMonth": 380.25,
  "totalFilesProcessed": 5420,
  "avgCostPerUser": 8.34
}
```

### GET /api/admin/users

Obtiene lista de usuarios con métricas.

**Query Parameters:**
- `accountType` - Filtrar por tipo
- `accountStatus` - Filtrar por estado
- `search` - Buscar por email
- `tags` - Filtrar por tags (comma-separated)
- `sortBy` - cost | activity | created | email
- `sortOrder` - asc | desc
- `limit` - Límite de resultados (default: 50)
- `offset` - Offset para paginación

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "account_type": "production",
      "account_status": "active",
      "tags": ["vip", "high-volume"],
      "subscription_plan": "pro",
      "total_cost_usd": 45.30,
      "monthly_budget_usd": 50.00,
      "cost_last_30_days": 15.20,
      "total_files": 120,
      "last_activity_at": "2025-01-10T10:30:00Z"
    }
  ],
  "total": 150
}
```

### PATCH /api/admin/users

Actualiza un campo de usuario.

**Request Body:**
```json
{
  "userId": "uuid",
  "field": "accountType", // accountType | accountStatus | notes | tags | monthlyBudget
  "value": "demo",
  "reason": "Cuenta convertida a demo" // Opcional, para accountStatus
}
```

### GET /api/admin/alerts

Obtiene alertas activas.

**Query Parameters:**
- `type` - Tipo de alerta
- `severity` - Severidad
- `userId` - Filtrar por usuario
- `limit` - Límite de resultados

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "alert_type": "high_cost_user",
      "severity": "high",
      "title": "Coste elevado: user@example.com",
      "message": "El usuario ha generado un coste de $25.50 en los últimos 30 días",
      "user_email": "user@example.com",
      "created_at": "2025-01-15T14:30:00Z"
    }
  ]
}
```

### POST /api/admin/alerts

Ejecuta verificación manual de alertas.

**Request Body:**
```json
{
  "action": "check_all" // check_high_cost | check_quota | check_all
}
```

**Response:**
```json
{
  "success": true,
  "alertsCreated": 3
}
```

### PATCH /api/admin/alerts

Resuelve una alerta.

**Request Body:**
```json
{
  "alertId": "uuid",
  "notes": "Contactado con el usuario, todo OK"
}
```

---

## 🔔 Sistema de Alertas

### Verificaciones Automáticas

Puedes configurar un cron job en Vercel para ejecutar verificaciones periódicas:

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-alerts",
      "schedule": "0 */2 * * *" // Cada 2 horas
    }
  ]
}
```

```typescript
// app/api/cron/check-alerts/route.ts
import { checkHighCostUsers, checkQuotaExceeded } from '@/lib/admin-alerts';

export async function GET(request: Request) {
  // Verificar CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const highCostAlerts = await checkHighCostUsers();
  const quotaAlerts = await checkQuotaExceeded();

  return Response.json({
    success: true,
    highCostAlerts,
    quotaAlerts,
  });
}
```

### Notificaciones por Email

Para implementar notificaciones por email, descomenta el código en `lib/admin-alerts.ts` función `sendAlertNotification()` e instala Resend:

```bash
npm install resend
```

```typescript
// En sendAlertNotification()
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'alerts@annalogica.eu',
  to: emails,
  subject: `[${alertData.severity.toUpperCase()}] ${alertData.title}`,
  html: `
    <h2>${alertData.title}</h2>
    <p><strong>Severidad:</strong> ${alertData.severity}</p>
    <p>${alertData.message}</p>
    ${alertData.user_email ? `<p><strong>Usuario:</strong> ${alertData.user_email}</p>` : ''}
    <hr>
    <p><small>Alerta generada automáticamente por Annalogica</small></p>
  `,
});
```

---

## 📊 Gestión de Usuarios

### Flujo Típico de Gestión

#### 1. **Nuevo Usuario Se Registra**

```sql
-- Por defecto se crea como:
account_type = 'production'
account_status = 'active'
```

#### 2. **Convertir a Demo para Pruebas**

Desde el dashboard admin o API:
```typescript
await updateUserAccountType(userId, 'demo', adminUserId);
await updateUserTags(userId, ['demo', 'sales-prospect'], adminUserId);
```

#### 3. **Establecer Presupuesto**

```typescript
await setUserMonthlyBudget(userId, 100.00, adminUserId); // $100/mes
```

#### 4. **Monitoreo Automático**

El sistema verificará cada hora (o según configuración) si:
- El usuario ha superado su presupuesto
- El usuario ha excedido su cuota de archivos
- El usuario tiene actividad inusual

#### 5. **Recibir Alerta**

```
🚨 ALERTA: Coste elevado
Usuario: demo-user@company.com
Coste 30d: $125.00 (Presupuesto: $100.00)
Severidad: HIGH
```

#### 6. **Tomar Acción**

Opciones:
- Contactar al usuario
- Aumentar presupuesto
- Suspender temporalmente
- Convertir a plan superior

```typescript
// Opción 1: Aumentar presupuesto
await setUserMonthlyBudget(userId, 150.00, adminUserId);

// Opción 2: Suspender
await updateUserAccountStatus(userId, 'suspended', adminUserId, 'Presupuesto excedido');

// Opción 3: Agregar nota
await updateUserNotes(userId, 'Contactado 15/01 - Acepta upgrade a plan Business', adminUserId);
```

#### 7. **Resolver Alerta**

```typescript
await resolveAlert(alertId, adminUserId, 'Usuario actualizado a plan Business');
```

---

## 🎨 Personalización

### Colores y Estilos

Los colores se definen en el componente según tipo y estado:

```typescript
// Tipo de cuenta
production: 'bg-green-100 text-green-800'
demo: 'bg-purple-100 text-purple-800'
test: 'bg-yellow-100 text-yellow-800'
trial: 'bg-blue-100 text-blue-800'

// Estado
active: 'bg-green-100 text-green-800'
suspended: 'bg-red-100 text-red-800'
cancelled: 'bg-gray-100 text-gray-800'
pending: 'bg-yellow-100 text-yellow-800'

// Severidad alertas
critical: 'bg-red-100 text-red-800'
high: 'bg-orange-100 text-orange-800'
medium: 'bg-yellow-100 text-yellow-800'
low: 'bg-blue-100 text-blue-800'
```

---

## 🔒 Seguridad

### Control de Acceso

Todos los endpoints del admin requieren:
1. Autenticación JWT válida
2. Rol = 'admin'

```typescript
const auth = await verifyAuth(request);
if (!auth || auth.role !== 'admin') {
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}
```

### Auditoría

Todas las acciones admin se registran en `admin_logs`:
- Quién realizó la acción
- Qué acción se realizó
- Sobre qué usuario
- IP y User-Agent
- Timestamp

```typescript
await logAdminAction({
  adminUserId,
  action: 'update_user',
  targetUserId: userId,
  details: { field: 'account_status', newValue: 'suspended' },
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
});
```

---

## 📝 Mantenimiento

### Refrescar Vista Materializada

La vista `user_metrics_summary` debe refrescarse periódicamente:

```sql
-- Manual
REFRESH MATERIALIZED VIEW CONCURRENTLY user_metrics_summary;

-- O llamar a la función
SELECT refresh_user_metrics();
```

Configura un cron para refrescarla cada hora:

```typescript
// app/api/cron/refresh-metrics/route.ts
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  await sql`SELECT refresh_user_metrics()`;
  return Response.json({ success: true });
}
```

### Limpieza de Logs Antiguos

```typescript
import { cleanupOldLogs } from '@/lib/admin-logs';

// Eliminar logs de más de 1 año
const deleted = await cleanupOldLogs(365);
console.log(`Eliminados ${deleted} logs antiguos`);
```

---

## 🚀 Próximos Pasos Recomendados

1. **Gráficos Avanzados**: Integrar Chart.js o Recharts para visualizaciones
2. **Exportar Reportes**: Generar PDFs con reportes mensuales
3. **Webhooks**: Notificar a servicios externos cuando hay alertas
4. **Dashboard en Tiempo Real**: WebSockets para actualización live
5. **Análisis Predictivo**: ML para predecir costes futuros
6. **Comparativas**: Comparar costes mes a mes, año a año

---

## 📞 Soporte

Para soporte técnico sobre el dashboard de administración:

- Email: admin@annalogica.eu
- Documentación: `/ADMIN-DASHBOARD.md`
- Logs: Vercel Dashboard → Functions → Logs

---

**Última actualización**: Enero 2025
**Versión**: 1.0.0
