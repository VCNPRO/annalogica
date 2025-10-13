# 🎛️ Panel de Control de Administración - Annalogica

**Fecha:** 2025-10-13
**Versión:** 1.0
**Dashboard URL:** `https://annalogica.eu/200830`

---

## 📋 Índice

1. [Acceso al Dashboard](#1-acceso-al-dashboard)
2. [Gestión de Usuarios](#2-gestión-de-usuarios)
3. [Gestión de Suscripciones](#3-gestión-de-suscripciones)
4. [Gestión de Contraseñas](#4-gestión-de-contraseñas)
5. [Cuentas de Prueba y Demos](#5-cuentas-de-prueba-y-demos)
6. [Consultas SQL Útiles](#6-consultas-sql-útiles)
7. [Seguridad](#7-seguridad)

---

## 1. Acceso al Dashboard

### URL del Dashboard
```
https://annalogica.eu/200830
```

**Nota de Seguridad:** La ruta `/200830` es privada. No compartas esta URL públicamente.

### Convertir Usuario a Admin

**Opción A: Desde Neon SQL Editor**

1. Accede a [console.neon.tech](https://console.neon.tech)
2. Selecciona tu proyecto Annalogica
3. Ve a la pestaña **SQL Editor**
4. Ejecuta:

```sql
-- Ver todos los usuarios
SELECT id, email, name, role, created_at
FROM users
ORDER BY created_at DESC;

-- Convertir usuario a admin
UPDATE users
SET role = 'admin'
WHERE email = 'tu@email.com';

-- Verificar
SELECT email, role FROM users WHERE email = 'tu@email.com';
```

**Opción B: Desde el código (futuro)**

```typescript
// POST /api/admin/users/[userId]/role
// Body: { role: 'admin' }
```

---

## 2. Gestión de Usuarios

### 2.1 Ver Todos los Usuarios

```sql
SELECT
  id,
  email,
  name,
  role,
  subscription_plan,
  subscription_status,
  monthly_quota,
  monthly_usage,
  created_at,
  (SELECT COUNT(*) FROM transcription_jobs WHERE user_id = users.id) as total_files
FROM users
ORDER BY created_at DESC;
```

### 2.2 Buscar Usuario por Email

```sql
SELECT
  id,
  email,
  name,
  role,
  subscription_plan,
  subscription_status,
  monthly_quota,
  monthly_usage,
  quota_reset_date,
  stripe_customer_id,
  stripe_subscription_id,
  created_at
FROM users
WHERE email = 'usuario@ejemplo.com';
```

### 2.3 Ver Actividad del Usuario

```sql
SELECT
  u.email,
  u.subscription_plan,
  COUNT(tj.id) as total_jobs,
  SUM(CASE WHEN tj.status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN tj.status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(tj.audio_duration_seconds) / 60 as total_minutes,
  MAX(tj.created_at) as last_activity
FROM users u
LEFT JOIN transcription_jobs tj ON tj.user_id = u.id
WHERE u.email = 'usuario@ejemplo.com'
GROUP BY u.id, u.email, u.subscription_plan;
```

### 2.4 Eliminar Usuario

```sql
-- ⚠️ CUIDADO: Esta acción es permanente

-- Primero eliminar trabajos del usuario
DELETE FROM transcription_jobs WHERE user_id = 'user-id-aqui';

-- Luego eliminar usuario
DELETE FROM users WHERE id = 'user-id-aqui';
```

---

## 3. Gestión de Suscripciones

### 3.1 Ver Estado de Suscripciones

```sql
SELECT
  subscription_plan,
  subscription_status,
  COUNT(*) as users_count,
  SUM(monthly_usage) as total_usage,
  AVG(monthly_usage) as avg_usage
FROM users
GROUP BY subscription_plan, subscription_status
ORDER BY users_count DESC;
```

### 3.2 Cambiar Plan de Usuario

```sql
-- Cambiar a plan Pro
UPDATE users
SET
  subscription_plan = 'pro',
  subscription_status = 'active',
  monthly_quota = 100,
  quota_reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
WHERE email = 'usuario@ejemplo.com';

-- Verificar cambio
SELECT email, subscription_plan, monthly_quota, subscription_status
FROM users
WHERE email = 'usuario@ejemplo.com';
```

### 3.3 Resetear Uso Mensual de Usuario

```sql
-- Resetear uso de un usuario específico
UPDATE users
SET
  monthly_usage = 0,
  quota_reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
WHERE email = 'usuario@ejemplo.com';
```

### 3.4 Aumentar Cuota Temporal

```sql
-- Dar cuota extra por este mes
UPDATE users
SET monthly_quota = monthly_quota + 50
WHERE email = 'usuario@ejemplo.com';
```

### 3.5 Cancelar Suscripción

```sql
-- Cancelar suscripción (volver a free)
UPDATE users
SET
  subscription_plan = 'free',
  subscription_status = 'free',
  monthly_quota = 10,
  stripe_subscription_id = NULL,
  subscription_end_date = NOW()
WHERE email = 'usuario@ejemplo.com';
```

---

## 4. Gestión de Contraseñas

### 4.1 Ver Hash de Contraseña (para debug)

```sql
-- Ver info de autenticación del usuario
SELECT id, email, password, created_at, updated_at
FROM users
WHERE email = 'usuario@ejemplo.com';
```

**Nota:** El campo `password` contiene el hash bcrypt. **NUNCA** se puede recuperar la contraseña original.

### 4.2 Resetear Contraseña Manualmente

**Método 1: Generar hash desde Node.js**

```javascript
const bcrypt = require('bcryptjs');
const newPassword = 'NuevaContraseña123';
const hash = await bcrypt.hash(newPassword, 10);
console.log('Hash:', hash);
// Copia el hash y úsalo en SQL
```

```sql
UPDATE users
SET
  password = '$2a$10$hashedpasswordaquí',
  updated_at = NOW()
WHERE email = 'usuario@ejemplo.com';
```

**Método 2: Endpoint API (futuro)**

```typescript
// POST /api/admin/users/[userId]/reset-password
// Body: { newPassword: 'NuevaContraseña123' }
```

### 4.3 Ver Usuarios sin Contraseña (OAuth)

```sql
-- Usuarios registrados vía OAuth (sin contraseña)
SELECT id, email, name, created_at
FROM users
WHERE password IS NULL OR password = '';
```

---

## 5. Cuentas de Prueba y Demos

### 5.1 Crear Cuenta de Prueba (Trial)

```sql
-- Crear usuario demo con 30 días de prueba Pro
INSERT INTO users (email, password, name, role, subscription_plan, subscription_status, monthly_quota, quota_reset_date)
VALUES (
  'demo@annalogica.eu',
  '$2a$10$hashedpassword',  -- Genera con bcrypt
  'Demo Account',
  'user',
  'pro',
  'trialing',
  100,
  NOW() + INTERVAL '30 days'
)
RETURNING id, email, subscription_plan, monthly_quota;
```

### 5.2 Dar Trial a Usuario Existente

```sql
-- Dar 30 días de trial Pro
UPDATE users
SET
  subscription_plan = 'pro',
  subscription_status = 'trialing',
  monthly_quota = 100,
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '30 days',
  subscription_cancel_at_period_end = FALSE
WHERE email = 'cliente@empresa.com';
```

### 5.3 Extender Trial

```sql
-- Extender trial 15 días más
UPDATE users
SET subscription_end_date = subscription_end_date + INTERVAL '15 days'
WHERE email = 'cliente@empresa.com';
```

### 5.4 Convertir Trial a Pago

```sql
-- Convertir de trial a suscripción activa
UPDATE users
SET
  subscription_status = 'active',
  subscription_cancel_at_period_end = FALSE
WHERE email = 'cliente@empresa.com';
```

### 5.5 Ver Trials Activos

```sql
SELECT
  email,
  name,
  subscription_plan,
  subscription_start_date,
  subscription_end_date,
  EXTRACT(DAY FROM (subscription_end_date - NOW())) as days_remaining,
  monthly_usage,
  monthly_quota
FROM users
WHERE subscription_status = 'trialing'
ORDER BY subscription_end_date ASC;
```

---

## 6. Consultas SQL Útiles

### 6.1 Estadísticas Generales

```sql
-- Resumen de plataforma
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN subscription_plan = 'free' THEN 1 END) as free_users,
  COUNT(CASE WHEN subscription_plan = 'basico' THEN 1 END) as basico_users,
  COUNT(CASE WHEN subscription_plan = 'pro' THEN 1 END) as pro_users,
  COUNT(CASE WHEN subscription_plan = 'business' THEN 1 END) as business_users,
  SUM(monthly_usage) as total_usage_this_month,
  AVG(monthly_usage) as avg_usage_per_user
FROM users;
```

### 6.2 Top 10 Usuarios Más Activos

```sql
SELECT
  u.email,
  u.name,
  u.subscription_plan,
  COUNT(tj.id) as total_files,
  SUM(tj.audio_duration_seconds) / 60 as total_minutes,
  MAX(tj.created_at) as last_activity
FROM users u
LEFT JOIN transcription_jobs tj ON tj.user_id = u.id
WHERE tj.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.name, u.subscription_plan
ORDER BY total_files DESC
LIMIT 10;
```

### 6.3 Usuarios Cerca del Límite

```sql
-- Usuarios que han usado >80% de su cuota
SELECT
  email,
  name,
  subscription_plan,
  monthly_usage,
  monthly_quota,
  ROUND((monthly_usage::NUMERIC / monthly_quota) * 100, 2) as usage_percent,
  monthly_quota - monthly_usage as remaining
FROM users
WHERE monthly_quota > 0
  AND (monthly_usage::NUMERIC / monthly_quota) >= 0.8
ORDER BY usage_percent DESC;
```

### 6.4 Usuarios Inactivos (90 días)

```sql
SELECT
  u.id,
  u.email,
  u.name,
  u.subscription_plan,
  u.created_at,
  MAX(tj.created_at) as last_activity,
  EXTRACT(DAY FROM (NOW() - MAX(tj.created_at))) as days_inactive
FROM users u
LEFT JOIN transcription_jobs tj ON tj.user_id = u.id
GROUP BY u.id, u.email, u.name, u.subscription_plan, u.created_at
HAVING MAX(tj.created_at) < NOW() - INTERVAL '90 days'
   OR MAX(tj.created_at) IS NULL
ORDER BY last_activity DESC NULLS LAST;
```

### 6.5 Revenue Potencial (MRR)

```sql
-- Calcular Monthly Recurring Revenue estimado
SELECT
  subscription_plan,
  COUNT(*) as users,
  CASE subscription_plan
    WHEN 'basico' THEN 12
    WHEN 'pro' THEN 24
    WHEN 'business' THEN 49
    WHEN 'universidad' THEN 199
    WHEN 'medios' THEN 299
    WHEN 'empresarial' THEN 499
    ELSE 0
  END as price_per_user,
  COUNT(*) * CASE subscription_plan
    WHEN 'basico' THEN 12
    WHEN 'pro' THEN 24
    WHEN 'business' THEN 49
    WHEN 'universidad' THEN 199
    WHEN 'medios' THEN 299
    WHEN 'empresarial' THEN 499
    ELSE 0
  END as total_mrr
FROM users
WHERE subscription_status = 'active'
  AND subscription_plan != 'free'
GROUP BY subscription_plan
ORDER BY total_mrr DESC;
```

### 6.6 Errores Recientes

```sql
-- Ver jobs fallidos recientes
SELECT
  tj.id,
  u.email,
  tj.filename,
  tj.status,
  tj.error_message,
  tj.retry_count,
  tj.created_at,
  tj.updated_at
FROM transcription_jobs tj
JOIN users u ON u.id = tj.user_id
WHERE tj.status = 'failed'
  AND tj.created_at > NOW() - INTERVAL '7 days'
ORDER BY tj.created_at DESC
LIMIT 20;
```

---

## 7. Seguridad

### 7.1 Verificación de Admin

El sistema verifica que el usuario sea admin de dos formas:

1. **JWT Token:** El token incluye el campo `role`
2. **Base de Datos:** Se verifica también en BD por seguridad

```typescript
// lib/auth.ts
export async function verifyAdmin(request: Request): Promise<boolean> {
  const auth = verifyRequestAuth(request);
  if (!auth) return false;

  // Verificar role en token
  if (auth.role === 'admin') return true;

  // Verificar en BD por seguridad
  const user = await UserDB.findById(auth.userId);
  return user?.role === 'admin';
}
```

### 7.2 Protección de Rutas

```typescript
// app/api/admin/**/route.ts
export async function GET(request: NextRequest) {
  // Verificar autenticación
  const user = verifyRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verificar admin
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Acceso denegado: se requieren permisos de administrador' },
      { status: 403 }
    );
  }

  // Continuar con lógica...
}
```

### 7.3 Auditoría de Acciones

**Recomendación:** Crear tabla de logs de admin

```sql
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,  -- 'update_user', 'delete_user', 'change_plan', etc.
  target_user_id UUID REFERENCES users(id),
  details JSONB,  -- Guardar detalles de la acción
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_user_id);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_user_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_created ON admin_logs(created_at);
```

### 7.4 Límites de Rate

**Implementar rate limiting para endpoints admin:**

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Continuar...
}
```

---

## 8. Estructura de la Base de Datos

### Tabla `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),

  -- Stripe
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255),

  -- Suscripción
  subscription_plan VARCHAR(50) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basico', 'pro', 'business', 'universidad', 'medios', 'empresarial')),
  subscription_status VARCHAR(50) DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')),
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Cuotas
  monthly_quota INTEGER DEFAULT 10,
  monthly_usage INTEGER DEFAULT 0,
  quota_reset_date TIMESTAMP DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 9. Comandos Rápidos de Mantenimiento

```bash
# Conectar a BD (desde local con psql)
psql $DATABASE_URL

# Backup de usuarios
psql $DATABASE_URL -c "COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER" > users_backup.csv

# Contar usuarios por plan
psql $DATABASE_URL -c "SELECT subscription_plan, COUNT(*) FROM users GROUP BY subscription_plan;"

# Ver usuarios activos hoy
psql $DATABASE_URL -c "SELECT COUNT(DISTINCT user_id) FROM transcription_jobs WHERE created_at::date = CURRENT_DATE;"
```

---

## 10. Sistema de Notificaciones Email

### 10.1 Notificaciones Automáticas

El sistema envía notificaciones automáticas vía email a usuarios y administradores:

**Tipos de Notificaciones:**
1. ⚠️ **Advertencia de Cuota (80%+)** - Cuando usuario alcanza 80% o más de su cuota
2. ⏰ **Expiración de Trial** - 3 días y 1 día antes de que expire el trial
3. 🚨 **Errores Críticos** - Notifica al administrador de errores graves
4. 👋 **Bienvenida** - Email de bienvenida a nuevos usuarios

### 10.2 Cron Job de Notificaciones

**Frecuencia:** Cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)

**Endpoint:** `/api/cron/check-notifications`

**Proceso Automático:**
- Verifica usuarios con cuota ≥ 80%
- Envía advertencias (máximo 1 cada 24h por usuario)
- Busca trials expirando en 3 días o 1 día
- Envía recordatorios de expiración
- Convierte trials expirados a plan free automáticamente

### 10.3 Configuración

**Variables de Entorno Requeridas:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
ADMIN_EMAIL=admin@annalogica.eu
```

**Ver más:** `/docs/SISTEMA-NOTIFICACIONES-EMAIL.md`

---

## 11. Próximas Mejoras

- [x] UI completa en `/200830` para gestión visual ✅
- [x] Endpoints API de gestión de usuarios ✅
- [x] Sistema de notificaciones por email ✅
- [x] Logs de auditoría de acciones admin ✅
- [ ] Rate limiting para endpoints admin
- [ ] Dashboard de métricas en tiempo real
- [ ] Sistema de backup automático
- [ ] Integración con Stripe webhooks

---

## 📞 Soporte

**Email:** soporte@annalogica.eu
**Documentación:** `/docs/USER-MANAGEMENT.md`
**Dashboard Admin:** https://annalogica.eu/200830

---

**Última actualización:** 2025-10-13
**Versión:** 1.0.0
