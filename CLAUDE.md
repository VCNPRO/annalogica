# Claude Code - Configuración para Annalogica

## 🚀 Comandos Rápidos

### Desarrollo
```bash
cd "C:\Users\Usuario\annalogica"
npm run dev
```

### Build y Test
```bash
npm run build
npm run start
```

## 🔧 Contexto para Claude

**Proyecto:** Annalogica - App transcripción audio con IA
**Estado:** Migración completa AWS → Replicate/Vercel ✅
**Puerto:** http://localhost:3000
**Framework:** Next.js 15.5.4 + TypeScript + Tailwind
**Última actualización:** 2025-10-06

### Archivos Clave
- `app/page.tsx` - Dashboard principal (refactorizado)
- `app/api/process/route.ts` - Procesamiento con Replicate + Claude
- `app/api/auth/` - Autenticación JWT
- `lib/users-db.ts` - Base datos usuarios (in-memory)
- `.env.local` - Variables entorno (configurado con JWT_SECRET)

### Funcionalidades
1. ✅ Carga archivos audio/video → Vercel Blob
2. ✅ Transcripción → AssemblyAI
3. ✅ Generación SRT + TXT + VTT + Speakers
4. ✅ Resúmenes y Tags → AssemblyAI LeMUR (multiidioma)
5. ✅ Descarga PDF
6. ✅ Dashboard con dark/light mode
7. ✅ Autenticación JWT

### Problemas Resueltos
1. Error sintaxis línea 566 → Refactorización completa
2. Error JSON/HTML → Rutas API corregidas
3. Conflictos puerto → App en 3000
4. Dependencias → Instaladas correctamente
5. Variables entorno → `.env.local` configurado

### Configuración Requerida
Editar `.env.local` con tus tokens:
- `ASSEMBLYAI_API_KEY` → https://www.assemblyai.com/dashboard/api-keys
- `BLOB_READ_WRITE_TOKEN` → Vercel Dashboard
- `JWT_SECRET` → ✅ Ya generado automáticamente
- `CRON_SECRET` → Generar token aleatorio para seguridad del cron job

**NOTA:** Ya NO se necesita `CLAUDE_API_KEY`. Se usa AssemblyAI LeMUR para resúmenes.

### Retención de Archivos
**IMPORTANTE**: Política de almacenamiento actualizada (2025-10-10)

**Archivos guardados en Vercel Blob (30 días):**
- ✅ Transcripciones (TXT)
- ✅ Subtítulos (SRT y VTT)
- ✅ Resúmenes (TXT)
- ✅ Reportes de hablantes
- ✅ Tags y metadatos

**Archivos que NO se guardan:**
- ❌ **Archivos de audio/video originales** → Eliminados inmediatamente tras transcripción exitosa
- ⚡ Implementado en: `lib/inngest/functions.ts` (step: 'delete-original-audio')
- 💰 Ahorro: ~95% de espacio de almacenamiento

**Limpieza automática:**
- Cron job diario (2:00 AM UTC) → `/api/cron/cleanup`
- Configurado en `vercel.json`
- Requiere `CRON_SECRET` en variables de entorno de Vercel
- Ver detalles completos en `INSTRUCCIONES-ALMACENAMIENTO.md`

## 📖 Guía de Usuario

### Generar PDF de Guía
```bash
npm run generate-guide
```

Esto genera `public/guia-usuario-annalogica.pdf` con:
- Información actualizada de precios desde annalogica.eu
- URLs correctas (annalogica.eu)
- Todos los planes: Free, Básico (€49), Pro (€99), Business (€249), Universidad (€999), Medios (€2.999), Empresarial

### Endpoints
- `GET /api/user-guide` - Descarga la guía de usuario en PDF
- `GET /guia-usuario-annalogica.pdf` - Acceso directo al PDF estático

## 🎛️ Dashboard de Administración

### Acceso Rápido
```
https://annalogica.eu/admin
```

### Instalación Rápida
```bash
# 1. Aplicar migración de BD (MÉTODO FÁCIL)
npm run migrate:admin

# 2. Crear usuario admin
psql $POSTGRES_URL -c "UPDATE users SET role = 'admin' WHERE email = 'tu-email@annalogica.eu';"

# 3. Configurar variables de entorno (para notificaciones por email)
# En .env.local o Vercel Dashboard:
RESEND_API_KEY=re_xxxxx        # Para enviar emails de alertas
ADMIN_EMAIL=admin@annalogica.eu # Email para recibir alertas
```

### Características
- ✅ **Gestión de Usuarios**: Categorizar por tipo (production, demo, test, trial)
- ✅ **Monitoreo de Costes**: Tracking automático por usuario y global
- ✅ **Sistema de Alertas**: Automáticas para costes altos, cuotas excedidas
- ✅ **Notificaciones Email**: Alertas automáticas por email con Resend
- ✅ **Gráficos Visuales**: Charts interactivos con Recharts
  - Tendencia de costes (últimos 30 días)
  - Distribución de usuarios por tipo
  - Estadísticas de uso (archivos, transcripciones, resúmenes)
  - Alertas por severidad
  - Costes por tipo de cuenta
- ✅ **Cron Jobs Automáticos**:
  - Verificación de alertas cada hora
  - Actualización de métricas cada 6 horas
  - Actualización de costes diaria (2:00 AM)
- ✅ **Métricas Avanzadas**: Estadísticas detalladas de uso
- ✅ **Auditoría Completa**: Logs de todas las acciones admin
- ✅ **Tags Personalizados**: Etiquetar usuarios (vip, beta, partner, etc.)
- ✅ **Presupuestos**: Asignar presupuesto mensual por usuario

### APIs Admin
```typescript
GET  /api/admin/stats              // Estadísticas plataforma
GET  /api/admin/users              // Lista usuarios con métricas
PATCH /api/admin/users             // Actualizar usuario
GET  /api/admin/alerts             // Obtener alertas activas
POST /api/admin/alerts             // Ejecutar verificación alertas
PATCH /api/admin/alerts            // Resolver alerta

// Cron Jobs (requieren CRON_SECRET)
GET  /api/cron/check-alerts        // Verificar alertas (cada hora)
GET  /api/cron/refresh-metrics     // Actualizar métricas (cada 6h)
GET  /api/cron/update-user-costs   // Actualizar costes (diario)
GET  /api/cron/cleanup             // Limpieza archivos (diario)
```

### Documentación
- 📘 Guía completa: `ADMIN-DASHBOARD.md`
- 🚀 Quick Start: `QUICKSTART-ADMIN.md`

### Archivos del Sistema Admin
```
lib/
├── admin-users.ts                    // Gestión usuarios
├── admin-alerts.ts                   // Sistema alertas + notificaciones Resend
└── db-migration-admin-management.sql // Migración BD

app/
├── admin/
│   ├── page.tsx                     // Dashboard visual con charts
│   └── components/
│       └── AdminCharts.tsx          // Componentes Recharts
└── api/
    ├── admin/
    │   ├── users/route.ts
    │   ├── stats/route.ts
    │   └── alerts/route.ts
    └── cron/
        ├── check-alerts/route.ts     // Cron alertas (cada hora)
        ├── refresh-metrics/route.ts  // Cron métricas (cada 6h)
        ├── update-user-costs/route.ts // Cron costes (diario)
        └── cleanup/route.ts          // Cron limpieza (diario)

scripts/
└── apply-admin-migration.js         // Script aplicación migración
```

### Uso Típico
```typescript
// Categorizar usuario como demo
await updateUserAccountType(userId, 'demo', adminUserId);

// Establecer presupuesto
await setUserMonthlyBudget(userId, 100.00, adminUserId);

// Agregar tags
await updateUserTags(userId, ['vip', 'high-volume'], adminUserId);

// Verificar alertas manualmente
await checkHighCostUsers();
await checkQuotaExceeded();
```
