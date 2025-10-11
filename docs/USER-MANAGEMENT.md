# 👥 Gestión de Usuarios y Autenticación

**Fecha:** 11 de Octubre, 2025
**Versión:** 1.0.0

Guía completa para controlar quién accede a tu aplicación, cómo gestionar usuarios, y configurar pruebas gratuitas.

---

## 📋 Índice

1. [Sistema de Autenticación](#1-sistema-de-autenticación)
2. [Roles y Permisos](#2-roles-y-permisos)
3. [Gestión de Usuarios](#3-gestión-de-usuarios)
4. [Pruebas Gratuitas](#4-pruebas-gratuitas)
5. [Dashboard de Administración](#5-dashboard-de-administración)
6. [Control de Acceso](#6-control-de-acceso)

---

## 1. Sistema de Autenticación

### 1.1 ¿Cómo Funciona?

```
Usuario se registra
       │
       ↓
Contraseña hasheada con bcrypt (seguro)
       │
       ↓
Se crea registro en base de datos
       │
       ↓
Se genera JWT (token)
       │
       ↓
Token guardado en cookie httpOnly (no accesible por JavaScript)
       │
       ↓
Usuario autenticado ✅
```

**Seguridad implementada:**
- ✅ Contraseñas nunca se guardan en texto plano
- ✅ JWT en cookie httpOnly (protección contra XSS)
- ✅ Cookie con flag `secure` (solo HTTPS)
- ✅ Cookie con `SameSite: lax` (protección CSRF)
- ✅ Expiración de 7 días

### 1.2 Flujo de Login

```typescript
1. Usuario envía email + password
2. Sistema busca usuario por email
3. Compara password con hash guardado (bcrypt)
4. Si coincide:
   - Genera JWT con { userId, email, role }
   - Guarda en cookie httpOnly
   - Redirige a dashboard
5. Si NO coincide:
   - Error: "Credenciales inválidas"
   - Log de seguridad registrado
```

### 1.3 Verificación de Autenticación

**En cada request protegido:**
```typescript
// lib/auth.ts
export function verifyRequestAuth(request: Request) {
  // 1. Leer cookie
  const token = request.cookies.get('auth-token')?.value;

  // 2. Verificar JWT
  const decoded = jwt.verify(token, JWT_SECRET);

  // 3. Devolver datos del usuario
  return { userId, email, role };
}
```

---

## 2. Roles y Permisos

### 2.1 Roles Disponibles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **`user`** | Usuario normal | - Subir archivos<br>- Ver sus archivos<br>- Descargar resultados<br>- Ver su perfil |
| **`admin`** | Administrador | - **Todo lo de user**<br>- Ver todos los usuarios<br>- Ver estadísticas globales<br>- Acceder a `/api/admin/*`<br>- Gestionar usuarios |

**Valor por defecto:** Todos los nuevos usuarios son `user`

### 2.2 Cómo Funciona la Verificación de Roles

```typescript
// Para endpoints admin
export async function verifyAdmin(request: Request): Promise<boolean> {
  const auth = verifyRequestAuth(request);
  if (!auth) return false;

  // Verificar rol
  if (auth.role === 'admin') return true;

  // Por seguridad, también verificar en BD
  const user = await UserDB.findById(auth.userId);
  return user?.role === 'admin';
}
```

**Uso en API:**
```typescript
// app/api/admin/usage/route.ts
export async function GET(request: NextRequest) {
  // Verificar que sea admin
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Acceso denegado' },
      { status: 403 }
    );
  }

  // Admin verificado, continuar...
}
```

### 2.3 Cómo Convertir Usuario a Admin

**Opción 1: Desde Neon SQL Editor**
```sql
-- Ver todos los usuarios
SELECT id, email, name, role FROM users;

-- Convertir a admin
UPDATE users
SET role = 'admin'
WHERE email = 'tu@email.com';

-- Verificar
SELECT email, role FROM users WHERE email = 'tu@email.com';
```

**Opción 2: Desde código (futuro endpoint)**
```typescript
// POST /api/admin/users/[userId]/role
// Body: { role: 'admin' }
```

---

## 3. Gestión de Usuarios

### 3.1 Ver Todos los Usuarios

**SQL Query:**
```sql
SELECT
  id,
  email,
  name,
  role,
  created_at,
  (SELECT COUNT(*) FROM transcription_jobs WHERE user_id = users.id) as total_files
FROM users
ORDER BY created_at DESC;
```

**Resultado:**
```
┌──────────────────────┬─────────────────────────┬────────┬──────┬─────────────┬─────────────┐
│ id                   │ email                   │ name   │ role │ created_at  │ total_files │
├──────────────────────┼─────────────────────────┼────────┼──────┼─────────────┼─────────────┤
│ d4f39938-7756...     │ test@test.com           │ NULL   │ admin│ 2025-10-06  │ 15          │
│ 4c69c6fb-da14...     │ test@biblioteca.cat     │ NULL   │ user │ 2025-10-07  │ 3           │
│ 66e794eb-f212...     │ vcnproduccion@gmail.com │ NULL   │ user │ 2025-10-08  │ 8           │
│ bec99040-77c4...     │ demo@demo.com           │ VCN Lab│ user │ 2025-10-09  │ 1           │
└──────────────────────┴─────────────────────────┴────────┴──────┴─────────────┴─────────────┘
```

### 3.2 Estadísticas por Usuario

**SQL Query:**
```sql
SELECT
  u.email,
  u.role,
  COUNT(tj.id) as total_jobs,
  SUM(CASE WHEN tj.status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN tj.status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(tj.audio_duration_seconds) / 60 as total_minutes,
  u.created_at as member_since
FROM users u
LEFT JOIN transcription_jobs tj ON tj.user_id = u.id
GROUP BY u.id, u.email, u.role, u.created_at
ORDER BY total_jobs DESC;
```

### 3.3 Usuarios Activos vs Inactivos

**SQL Query:**
```sql
-- Usuarios con actividad en últimos 30 días
SELECT COUNT(DISTINCT user_id) as active_users
FROM transcription_jobs
WHERE created_at > NOW() - INTERVAL '30 days';

-- Usuarios sin actividad en 30+ días
SELECT u.email, u.created_at, MAX(tj.created_at) as last_activity
FROM users u
LEFT JOIN transcription_jobs tj ON tj.user_id = u.id
GROUP BY u.id, u.email, u.created_at
HAVING MAX(tj.created_at) < NOW() - INTERVAL '30 days'
   OR MAX(tj.created_at) IS NULL;
```

### 3.4 Bloquear/Desbloquear Usuario

**Opción 1: Agregar columna `active` (recomendado)**

```sql
-- Migración
ALTER TABLE users
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Bloquear usuario
UPDATE users SET active = false WHERE email = 'user@example.com';

-- Desbloquear
UPDATE users SET active = true WHERE email = 'user@example.com';
```

**Actualizar verificación de auth:**
```typescript
// lib/auth.ts
export function verifyRequestAuth(request: Request) {
  const decoded = jwt.verify(token, JWT_SECRET);

  // Verificar en BD que usuario está activo
  const user = await UserDB.findById(decoded.userId);
  if (!user || !user.active) {
    throw new Error('Usuario inactivo o eliminado');
  }

  return decoded;
}
```

---

## 4. Pruebas Gratuitas

### 4.1 Conceptos Clave

**Modelo de negocio sugerido:**
```
Plan Free:
- 10 transcripciones/mes
- Archivos hasta 30 minutos
- Retención 30 días

Plan Pro ($5/mes):
- 100 transcripciones/mes
- Archivos hasta 2 horas
- Retención 90 días
- Soporte prioritario

Plan Premium ($15/mes):
- Ilimitado
- Sin límite de duración
- Retención 1 año
- API access
```

### 4.2 Implementar Sistema de Cuotas

**Paso 1: Agregar columnas a users**
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS monthly_quota INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS quota_used_this_month INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMP DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

CREATE INDEX idx_users_plan ON users(subscription_plan);
```

**Paso 2: Verificar cuota antes de procesar**
```typescript
// app/api/process/route.ts
export async function POST(request: NextRequest) {
  const auth = verifyRequestAuth(request);
  const user = await UserDB.findById(auth.userId);

  // Verificar cuota
  if (user.quota_used_this_month >= user.monthly_quota) {
    return NextResponse.json({
      error: 'Cuota mensual agotada',
      quota: {
        used: user.quota_used_this_month,
        limit: user.monthly_quota,
        resetsAt: user.quota_reset_at
      },
      upgrade: {
        message: 'Actualiza a Pro para más transcripciones',
        url: '/pricing'
      }
    }, { status: 402 }); // 402 Payment Required
  }

  // Incrementar contador
  await UserDB.incrementQuota(user.id);

  // Continuar con procesamiento...
}
```

**Paso 3: Reset mensual automático**
```typescript
// app/api/cron/reset-quotas/route.ts
export async function GET(request: NextRequest) {
  // Verificar CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Reset cuotas de usuarios cuya fecha de reset ya pasó
  await sql`
    UPDATE users
    SET quota_used_this_month = 0,
        quota_reset_at = quota_reset_at + INTERVAL '1 month'
    WHERE quota_reset_at < NOW();
  `;

  return NextResponse.json({ success: true });
}
```

**Paso 4: Configurar cron mensual**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/reset-quotas",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

### 4.3 Dar Acceso Gratuito Temporal

**Caso de uso:** Quieres que alguien pruebe gratis por 1 mes

**Opción 1: Extender cuota por 1 mes**
```sql
UPDATE users
SET monthly_quota = 100,  -- Normalmente tiene 10
    quota_reset_at = NOW() + INTERVAL '1 month'
WHERE email = 'cliente@empresa.com';
```

**Opción 2: Upgrade temporal a plan Pro**
```sql
-- Agregar columnas de trial
ALTER TABLE users
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP NULL;

-- Dar trial de 30 días
UPDATE users
SET subscription_plan = 'pro',
    monthly_quota = 100,
    trial_ends_at = NOW() + INTERVAL '30 days'
WHERE email = 'cliente@empresa.com';
```

**Verificación de trial:**
```typescript
export async function checkUserAccess(userId: string) {
  const user = await UserDB.findById(userId);

  // Si trial expiró, downgrade a free
  if (user.trial_ends_at && user.trial_ends_at < new Date()) {
    await sql`
      UPDATE users
      SET subscription_plan = 'free',
          monthly_quota = 10,
          trial_ends_at = NULL
      WHERE id = ${userId};
    `;
    user.subscription_plan = 'free';
    user.monthly_quota = 10;
  }

  return user;
}
```

### 4.4 Códigos de Promoción

**Implementación:**

```sql
-- Tabla de promo codes
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL, -- 'free_month', 'extra_quota', 'percent_off'
  discount_value INT NOT NULL,
  max_uses INT,
  times_used INT DEFAULT 0,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promo_code ON promo_codes(code);

-- Usar promo code
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, valid_until)
VALUES ('LAUNCH2025', 'free_month', 1, 100, '2025-12-31');
```

**Endpoint para aplicar código:**
```typescript
// POST /api/promo/apply
// Body: { code: 'LAUNCH2025' }
export async function POST(request: NextRequest) {
  const auth = verifyRequestAuth(request);
  const { code } = await request.json();

  // Verificar código
  const promo = await sql`
    SELECT * FROM promo_codes
    WHERE code = ${code}
      AND (max_uses IS NULL OR times_used < max_uses)
      AND (valid_until IS NULL OR valid_until > NOW());
  `;

  if (!promo.rows[0]) {
    return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 });
  }

  // Aplicar beneficio
  if (promo.rows[0].discount_type === 'free_month') {
    await sql`
      UPDATE users
      SET subscription_plan = 'pro',
          monthly_quota = 100,
          trial_ends_at = NOW() + INTERVAL '1 month'
      WHERE id = ${auth.userId};
    `;
  }

  // Incrementar uso
  await sql`
    UPDATE promo_codes
    SET times_used = times_used + 1
    WHERE code = ${code};
  `;

  return NextResponse.json({
    success: true,
    message: '¡Código aplicado! Tienes 1 mes de Plan Pro gratis.'
  });
}
```

---

## 5. Dashboard de Administración

### 5.1 Métricas Clave para Mostrar

**Dashboard debe mostrar:**

1. **Métricas Generales:**
   - Total usuarios registrados
   - Usuarios activos (últimos 30 días)
   - Total transcripciones procesadas
   - Tasa de éxito (completed / total)

2. **Métricas de Uso:**
   - Minutos transcritos (mes actual)
   - Archivos procesados (hoy, semana, mes)
   - Promedio de duración por archivo
   - Horas pico de uso

3. **Métricas Financieras:**
   - Costo de APIs (AssemblyAI + Claude)
   - Ingresos (cuando haya pagos)
   - MRR (Monthly Recurring Revenue)
   - Costo por usuario

4. **Usuarios:**
   - Últimos registros
   - Usuarios más activos
   - Usuarios bloqueados o inactivos
   - Distribución por plan (free/pro/premium)

### 5.2 Queries para Dashboard

**Total de usuarios:**
```sql
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN subscription_plan = 'free' THEN 1 END) as free_users,
  COUNT(CASE WHEN subscription_plan = 'pro' THEN 1 END) as pro_users
FROM users;
```

**Usuarios activos (últimos 30 días):**
```sql
SELECT COUNT(DISTINCT user_id) as active_users
FROM transcription_jobs
WHERE created_at > NOW() - INTERVAL '30 days';
```

**Estadísticas de transcripciones:**
```sql
SELECT
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
  ROUND(AVG(audio_duration_seconds) / 60, 2) as avg_duration_minutes,
  SUM(audio_duration_seconds) / 60 as total_minutes
FROM transcription_jobs;
```

**Top 10 usuarios más activos:**
```sql
SELECT
  u.email,
  u.subscription_plan,
  COUNT(tj.id) as total_files,
  SUM(tj.audio_duration_seconds) / 60 as total_minutes,
  MAX(tj.created_at) as last_activity
FROM users u
LEFT JOIN transcription_jobs tj ON tj.user_id = u.id
GROUP BY u.id, u.email, u.subscription_plan
ORDER BY total_files DESC
LIMIT 10;
```

**Ingresos por día (últimos 30 días):**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as files_processed,
  SUM(audio_duration_seconds) / 60 as minutes_transcribed,
  -- Costo AssemblyAI: $0.03/min
  ROUND((SUM(audio_duration_seconds) / 60 * 0.03), 2) as cost_assemblyai,
  -- Costo Claude: $0.03/resumen
  ROUND(COUNT(*) * 0.03, 2) as cost_claude
FROM transcription_jobs
WHERE created_at > NOW() - INTERVAL '30 days'
  AND status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 5.3 Estructura de Dashboard Admin

**Página: `/admin`**

```typescript
// app/admin/page.tsx
export default async function AdminDashboard() {
  // Verificar admin
  const auth = verifyRequestAuth(request);
  if (!auth || auth.role !== 'admin') {
    redirect('/');
  }

  // Obtener métricas
  const stats = await getAdminStats();

  return (
    <div className="admin-dashboard">
      <h1>Dashboard Administrativo</h1>

      {/* Métricas generales */}
      <div className="metrics-grid">
        <MetricCard title="Total Usuarios" value={stats.totalUsers} />
        <MetricCard title="Activos (30d)" value={stats.activeUsers} />
        <MetricCard title="Transcripciones" value={stats.totalJobs} />
        <MetricCard title="Tasa Éxito" value={`${stats.successRate}%`} />
      </div>

      {/* Gráficas */}
      <div className="charts">
        <UsageChart data={stats.dailyUsage} />
        <CostsChart data={stats.dailyCosts} />
      </div>

      {/* Tablas */}
      <div className="tables">
        <UsersTable users={stats.topUsers} />
        <RecentJobsTable jobs={stats.recentJobs} />
      </div>
    </div>
  );
}
```

---

## 6. Control de Acceso

### 6.1 Niveles de Acceso

**Público (sin auth):**
- `/` - Homepage
- `/login` - Login/Register
- `/pricing` - Planes y precios (futuro)

**Usuario (auth requerida):**
- `/dashboard` - Panel principal
- `/results` - Lista de archivos
- `/files/[id]` - Detalle de archivo
- `/settings` - Ajustes de cuenta

**Admin (auth + role=admin):**
- `/admin` - Dashboard administrativo
- `/admin/users` - Gestión de usuarios
- `/admin/stats` - Estadísticas avanzadas
- `/api/admin/*` - Endpoints admin

### 6.2 Middleware de Protección

**Futuro: Middleware global**
```typescript
// middleware.ts (Next.js 15)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas
  const publicRoutes = ['/', '/login', '/pricing'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Verificar auth
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verificar admin
  if (pathname.startsWith('/admin')) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 6.3 Auditoría de Accesos

**Implementar logging de accesos:**

```sql
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user ON access_logs(user_id);
CREATE INDEX idx_access_logs_created ON access_logs(created_at DESC);
```

**Log eventos importantes:**
```typescript
// lib/audit-log.ts
export async function logAccess(
  userId: string | null,
  action: string,
  resource?: string,
  request?: NextRequest
) {
  const ip = request?.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request?.headers.get('user-agent') || 'unknown';

  await sql`
    INSERT INTO access_logs (user_id, action, resource, ip_address, user_agent)
    VALUES (${userId}, ${action}, ${resource || null}, ${ip}, ${userAgent});
  `;
}

// Uso:
await logAccess(auth.userId, 'login_success', '/api/auth/login', request);
await logAccess(auth.userId, 'file_upload', filename, request);
await logAccess(auth.userId, 'admin_access', '/admin/users', request);
```

---

## 📊 Resumen

### Sistema Actual
- ✅ Auth con JWT en httpOnly cookies
- ✅ Roles: user y admin
- ✅ 4 usuarios registrados
- ⚠️ Sin sistema de cuotas aún
- ⚠️ Sin dashboard admin completo

### Próximos Pasos

**Alta prioridad (1 semana):**
1. Implementar sistema de cuotas
2. Agregar columna `active` para bloquear usuarios
3. Crear endpoint `/api/admin/users`

**Media prioridad (2-3 semanas):**
4. Dashboard admin completo
5. Sistema de promo codes
6. Audit logs

**Baja prioridad (1-2 meses):**
7. Integración con Stripe
8. 2FA para admins
9. Roles personalizados

---

**Autor:** Claude Code (Anthropic)
**Fecha:** 11 de Octubre, 2025
