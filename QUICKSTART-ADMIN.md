# 🚀 Quick Start - Dashboard de Administración

## ⚡ Inicio Rápido en 5 Minutos

### 1. Aplicar Migración de Base de Datos

Ejecuta esto en tu consola de Vercel Postgres:

```sql
-- Ir a: https://vercel.com/tu-proyecto/stores/postgres/[tu-db]/sql

-- Copiar y ejecutar el contenido de:
-- lib/db-migration-admin-management.sql
```

O desde terminal:

```bash
psql $POSTGRES_URL < lib/db-migration-admin-management.sql
```

### 2. Crear Usuario Admin

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'tu-email@annalogica.eu';
```

### 3. Acceder al Dashboard

```
https://annalogica.eu/admin
```

### 4. Configurar Primera Alerta (Opcional)

El sistema ya viene con configuraciones por defecto. Para personalizarlas:

```sql
UPDATE alert_config
SET threshold_value = 20.00,
    notification_emails = ARRAY['admin@annalogica.eu', 'ops@annalogica.eu']
WHERE alert_type = 'high_cost_user';
```

---

## 📊 Primeros Pasos en el Dashboard

### Ver Estadísticas Generales

El dashboard muestra automáticamente:
- 📊 Total de usuarios
- 💰 Costes acumulados
- 📁 Archivos procesados
- 🚨 Alertas activas

### Gestionar un Usuario

1. Busca el usuario por email
2. Click en "Ver Detalles"
3. Modifica:
   - Tipo de cuenta (production/demo/test/trial)
   - Estado (active/suspended/cancelled)
   - Tags (vip, beta, partner, etc.)
   - Presupuesto mensual

### Configurar Alertas Automáticas

El sistema verifica automáticamente cada hora:
- ✅ Usuarios con coste >$10
- ✅ Usuarios que exceden su presupuesto
- ✅ Cuotas de archivos excedidas

Para ejecutar verificación manual:
- Click en "Verificar Alertas" en el dashboard

---

## 📁 Archivos Creados

### Backend

```
lib/
├── db-migration-admin-management.sql  ← Migración BD
├── admin-users.ts                     ← Gestión usuarios
├── admin-alerts.ts                    ← Sistema alertas
├── admin-logs.ts                      ← Logs auditoría (ya existía)
└── usage-tracking.ts                  ← Tracking costes (ya existía)

app/api/admin/
├── users/route.ts                     ← API usuarios
├── stats/route.ts                     ← API estadísticas
└── alerts/route.ts                    ← API alertas
```

### Frontend

```
app/admin/
└── page.tsx                           ← Dashboard visual
```

### Documentación

```
ADMIN-DASHBOARD.md                     ← Documentación completa
QUICKSTART-ADMIN.md                    ← Esta guía rápida
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Usuario Demo para Ventas

```typescript
// Crear cuenta demo
await updateUserAccountType(userId, 'demo', adminUserId);
await updateUserTags(userId, ['demo', 'sales-prospect'], adminUserId);
await setUserMonthlyBudget(userId, 50.00, adminUserId);
await updateUserNotes(userId, 'Demo para empresa XYZ - Contacto: john@xyz.com', adminUserId);
```

### Caso 2: Usuario Supera Presupuesto

El sistema genera alerta automáticamente. Acciones:

1. **Revisar alerta** en dashboard
2. **Contactar usuario** si es necesario
3. **Aumentar presupuesto** o **suspender cuenta**
4. **Resolver alerta** con notas

### Caso 3: Separar Clientes de Producción vs. Test

```sql
-- Ver todos los clientes de producción
SELECT * FROM users WHERE account_type = 'production' AND account_status = 'active';

-- Ver costes solo de producción
SELECT
  SUM(cost_last_30_days) as total_cost_prod
FROM user_metrics_summary
WHERE account_type = 'production';
```

### Caso 4: Análisis de Costes

```sql
-- Top 10 usuarios por coste
SELECT
  email,
  account_type,
  cost_last_30_days,
  total_files
FROM user_metrics_summary
ORDER BY cost_last_30_days DESC
LIMIT 10;

-- Coste promedio por tipo de cuenta
SELECT
  account_type,
  AVG(cost_last_30_days) as avg_cost,
  COUNT(*) as user_count
FROM user_metrics_summary
GROUP BY account_type;
```

---

## 🔔 Configurar Notificaciones por Email

### 1. Instalar Resend

```bash
npm install resend
```

### 2. Configurar Variable de Entorno

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 3. Descomentar Código

En `lib/admin-alerts.ts`, función `sendAlertNotification()`, descomenta el código de Resend.

### 4. Configurar Emails

```sql
UPDATE alert_config
SET notification_emails = ARRAY['admin@annalogica.eu', 'ops@annalogica.eu', 'ceo@annalogica.eu']
WHERE alert_type = 'high_cost_user';
```

---

## 🤖 Automatización con Cron Jobs

### 1. Crear Cron Job para Verificar Alertas

```typescript
// app/api/cron/check-alerts/route.ts
import { checkHighCostUsers, checkQuotaExceeded } from '@/lib/admin-alerts';

export async function GET(request: Request) {
  // Verificar CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await checkHighCostUsers();
  await checkQuotaExceeded();

  return Response.json({ success: true });
}
```

### 2. Configurar en Vercel

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-alerts",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 3. Agregar Variable de Entorno

```bash
# En Vercel Dashboard → Settings → Environment Variables
CRON_SECRET=tu_secreto_aleatorio_aqui
```

---

## 📈 Métricas que Puedes Obtener

### Por Usuario

- ✅ Coste total histórico
- ✅ Coste últimos 30 días
- ✅ Número de archivos procesados
- ✅ Operaciones realizadas
- ✅ Última actividad
- ✅ Presupuesto vs. gasto real

### Por Tipo de Cliente

```sql
SELECT
  account_type,
  COUNT(*) as usuarios,
  SUM(cost_last_30_days) as coste_total,
  AVG(cost_last_30_days) as coste_promedio,
  SUM(total_files) as archivos_totales
FROM user_metrics_summary
GROUP BY account_type;
```

### Tendencias Temporales

```sql
-- Coste por día del mes actual
SELECT
  DATE(created_at) as fecha,
  SUM(cost_usd) as coste_dia
FROM usage_logs
WHERE created_at >= date_trunc('month', NOW())
GROUP BY DATE(created_at)
ORDER BY fecha;
```

---

## 🎨 Personalización del Dashboard

### Cambiar Colores de Tags

Edita en `app/admin/page.tsx`:

```typescript
const getTypeColor = (type: string) => {
  switch (type) {
    case 'production': return 'bg-green-100 text-green-800';
    case 'demo': return 'bg-purple-100 text-purple-800';
    // ... personaliza aquí
  }
};
```

### Agregar Nuevos Filtros

```typescript
// Filtro por plan de suscripción
const [filterPlan, setFilterPlan] = useState<string>('');

// En la interfaz
<select
  value={filterPlan}
  onChange={(e) => setFilterPlan(e.target.value)}
>
  <option value="">Todos los planes</option>
  <option value="free">Free</option>
  <option value="pro">Pro</option>
  <option value="business">Business</option>
</select>
```

---

## ⚠️ Troubleshooting

### Error: "No autorizado"

- ✅ Verifica que tu usuario tenga `role = 'admin'`
- ✅ Cierra sesión y vuelve a iniciar

### Alertas no se generan automáticamente

- ✅ Verifica que la configuración de alertas esté habilitada:

```sql
SELECT * FROM alert_config WHERE is_enabled = TRUE;
```

- ✅ Ejecuta verificación manual: Click en "Verificar Alertas"

### Métricas desactualizadas

- ✅ Refresca la vista materializada:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY user_metrics_summary;
```

### No aparecen estadísticas

- ✅ Verifica que las migraciones se ejecutaron correctamente
- ✅ Verifica que hay datos en `usage_logs`:

```sql
SELECT COUNT(*) FROM usage_logs;
```

---

## 📞 Soporte

- 📖 Documentación completa: `ADMIN-DASHBOARD.md`
- 📧 Email: admin@annalogica.eu
- 🐛 Reportar bugs: GitHub Issues

---

## ✅ Checklist de Implementación

- [ ] Migración de BD ejecutada
- [ ] Usuario admin creado
- [ ] Dashboard accesible en `/admin`
- [ ] Alertas configuradas
- [ ] (Opcional) Emails de notificación configurados
- [ ] (Opcional) Cron jobs configurados
- [ ] Equipo capacitado en uso del dashboard

---

**¡Listo para gestionar Annalogica como un profesional! 🚀**
