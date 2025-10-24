# Sistema de Cuotas Separadas v2

## 📋 Resumen

Implementación completa del sistema de cuotas separadas para Annalogica, permitiendo un control independiente de documentos y minutos de audio.

**Fecha de implementación:** 2025-10-24
**Versión:** v2.0
**Estado:** ✅ Código implementado, pendiente migración SQL

---

## 🎯 Características Implementadas

### 1. **Cuotas Independientes**
- ✅ **Documentos**: Cuota mensual en número de archivos (PDFs, DOCX, TXT)
- ✅ **Audio**: Cuota mensual en minutos de transcripción
- ✅ **Límite de páginas**: Máximo de páginas por PDF según plan

### 2. **Planes Configurados**

| Plan         | Docs/mes | Audio/mes | Páginas/PDF | Precio  |
|--------------|----------|-----------|-------------|---------|
| **Free**     | 10       | 10 min    | 50          | Gratis  |
| **Beta**     | 100      | 60 min    | 100         | Gratis  |
| **Básico**   | 200      | 120 min   | 150         | €49/mes |
| **Pro**      | 500      | 300 min   | 200         | €99/mes |
| **Business** | 1000     | 600 min   | 300         | €249/mes|

### 3. **Backend Implementado**

#### Archivos Creados/Modificados:

**Migración de Base de Datos:**
- ✅ `migrations/separate-quotas.sql` - Agrega nuevas columnas a tabla `users`

**Nuevas Librerías:**
- ✅ `lib/subscription-guard-v2.ts` - Sistema de cuotas separadas
  - `checkSeparateQuotas()` - Verificar estado de cuotas
  - `incrementDocUsage()` - Incrementar uso de documentos
  - `incrementAudioUsage()` - Incrementar uso de audio (minutos)
  - `validatePdfPages()` - Validar límite de páginas de PDF
  - `resetSeparateUsage()` - Resetear uso mensual
  - `getSeparateUsageStats()` - Obtener estadísticas de uso

**APIs Modificadas:**
- ✅ `app/api/process/route.ts` - Audio ahora cuenta minutos (no archivos)
- ✅ `app/api/process-document/route.ts` - Validación de cuota de docs y páginas
- ✅ `lib/processors/document-processor.ts` - Validación de páginas después de parsear PDF

**APIs Nuevas:**
- ✅ `app/api/admin/user-quotas-v2/route.ts` - PATCH/POST para gestionar cuotas separadas

**Admin Dashboard:**
- ✅ `components/admin/AdminDashboard.tsx` - Muestra cuotas separadas
- ✅ `lib/admin-users.ts` - Query actualizada para nuevas columnas
- ✅ `app/api/admin/user-stats/route.ts` - Stats con cuotas separadas

### 4. **Validaciones Implementadas**

#### Documentos:
```typescript
// Verificar cuota antes de procesar
const quotaStatus = await checkSeparateQuotas(userId);
if (!quotaStatus.canUploadDocs) {
  return error('Has alcanzado el límite de documentos');
}

// Validar páginas de PDF
if (isPDF) {
  const pageValidation = await validatePdfPages(userId, pageCount);
  if (!pageValidation.allowed) {
    return error('PDF excede el límite de páginas');
  }
}

// Incrementar uso después de procesar
await incrementDocUsage(userId, 1);
```

#### Audio:
```typescript
// Verificar cuota antes de procesar
const quotaStatus = await checkSeparateQuotas(userId);
if (!quotaStatus.canUploadAudio) {
  return error('Has alcanzado el límite de minutos de audio');
}

// Incrementar uso por duración real
const durationMinutes = audio_duration_seconds / 60;
await incrementAudioUsage(userId, durationMinutes); // Se redondea hacia arriba
```

---

## 🚀 Cómo Activar el Sistema

### Paso 1: Ejecutar Migración SQL

Opción A - **Vercel Dashboard** (Recomendado):
```bash
1. Ve a: https://vercel.com/tu-proyecto/storage
2. Selecciona tu base de datos Postgres
3. Click en "Query" tab
4. Copia y pega el contenido de: migrations/separate-quotas.sql
5. Click "Run Query"
```

Opción B - **Línea de comandos**:
```bash
psql $POSTGRES_URL -f migrations/separate-quotas.sql
```

### Paso 2: Verificar Migración
```sql
-- Verificar que las nuevas columnas existen
SELECT
  monthly_quota_docs,
  monthly_quota_audio_minutes,
  monthly_usage_docs,
  monthly_usage_audio_minutes,
  max_pages_per_pdf
FROM users
LIMIT 1;
```

### Paso 3: Configurar Beta Testers
```sql
-- Asignar cuotas especiales a beta testers
UPDATE users
SET
  monthly_quota_docs = 100,
  monthly_quota_audio_minutes = 60,
  max_pages_per_pdf = 100,
  tags = ARRAY['beta']::text[]
WHERE email IN (
  'beta1@ejemplo.com',
  'beta2@ejemplo.com'
);
```

### Paso 4: Deploy a Producción
```bash
git add .
git commit -m "feat: Sistema de cuotas separadas (docs + audio)"
git push origin main
```

---

## 📊 Admin Dashboard

### Nuevas Columnas en Tabla de Usuarios:

| Campo                      | Descripción                           |
|----------------------------|---------------------------------------|
| **Docs (uso/cuota)**       | Muestra: `5 / 100` (docs usados/mes) |
| **Audio min (uso/cuota)**  | Muestra: `45 / 60` (minutos usados)  |

### Panel "Ver Stats" Actualizado:

```
Información del Usuario
├─ Cuota Docs: 100 docs/mes
├─ Uso Docs: 25
├─ Cuota Audio: 60 min/mes
├─ Uso Audio: 45 min
└─ Reset: 01/11/2025
```

### API Admin para Editar Cuotas:

```bash
# Actualizar cuotas separadas
curl -X PATCH https://annalogica.eu/api/admin/user-quotas-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "quotaDocs": 200,
    "quotaAudioMinutes": 120,
    "maxPagesPerPdf": 150
  }'

# Resetear uso
curl -X POST https://annalogica.eu/api/admin/user-quotas-v2 \
  -H "Content-Type: application/json" \
  -d '{"userId": "123"}'
```

---

## 🔄 Migración de Usuarios Existentes

**Comportamiento automático de la migración:**

1. Usuarios **Free** → 10 docs + 10 min audio
2. Usuarios **Básico** → 200 docs + 120 min audio
3. Usuarios **Pro** → 500 docs + 300 min audio
4. Usuarios **Business** → 1000 docs + 600 min audio
5. Usuarios con tag `beta` → 100 docs + 60 min audio

**Uso anterior se resetea a 0** para empezar de cero con el nuevo sistema.

---

## 📈 Métricas y Monitoreo

### Consultas Útiles:

```sql
-- Usuarios cerca del límite de docs
SELECT email, monthly_usage_docs, monthly_quota_docs
FROM users
WHERE monthly_usage_docs >= monthly_quota_docs * 0.8
ORDER BY monthly_usage_docs DESC;

-- Usuarios cerca del límite de audio
SELECT email, monthly_usage_audio_minutes, monthly_quota_audio_minutes
FROM users
WHERE monthly_usage_audio_minutes >= monthly_quota_audio_minutes * 0.8
ORDER BY monthly_usage_audio_minutes DESC;

-- Top 10 usuarios por consumo de docs
SELECT email, monthly_usage_docs, monthly_quota_docs
FROM users
ORDER BY monthly_usage_docs DESC
LIMIT 10;

-- Top 10 usuarios por consumo de audio
SELECT email, monthly_usage_audio_minutes, monthly_quota_audio_minutes
FROM users
ORDER BY monthly_usage_audio_minutes DESC
LIMIT 10;
```

---

## 🎛️ Configuración Avanzada

### Personalizar Cuotas por Usuario:

```sql
-- Usuario VIP con cuotas ilimitadas
UPDATE users
SET
  monthly_quota_docs = 999999,
  monthly_quota_audio_minutes = 999999,
  max_pages_per_pdf = 999999,
  tags = array_append(tags, 'vip')
WHERE email = 'vip@cliente.com';

-- Beta tester con límites específicos
UPDATE users
SET
  monthly_quota_docs = 50,
  monthly_quota_audio_minutes = 30,
  max_pages_per_pdf = 75,
  tags = array_append(tags, 'beta-limited')
WHERE email = 'beta@tester.com';
```

### Cron Job de Reset Mensual:

El reset automático se ejecuta el primer día de cada mes via:
```
/api/cron/daily-checks
```

Configurado en `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/daily-checks",
    "schedule": "0 9 * * *"
  }]
}
```

---

## 🐛 Troubleshooting

### Problema: "Column does not exist"
**Solución:** Ejecutar migración SQL en la base de datos de producción

### Problema: Usuario no puede subir documentos
**Verificar:**
```sql
SELECT
  email,
  monthly_quota_docs,
  monthly_usage_docs,
  monthly_quota_docs - monthly_usage_docs as remaining
FROM users
WHERE email = 'usuario@ejemplo.com';
```

### Problema: PDF rechazado por límite de páginas
**Verificar:**
```sql
SELECT email, max_pages_per_pdf, subscription_plan
FROM users
WHERE email = 'usuario@ejemplo.com';
```

---

## 🔮 Próximos Pasos (Post-MVP)

1. **Sistema de Créditos** (Producción)
   - 1 documento = 1 crédito
   - 1 minuto audio = 3 créditos
   - Paquetes de créditos prepagados

2. **Alertas Automáticas**
   - Email cuando uso > 80% de cuota
   - Webhook para integraciones

3. **Métricas Avanzadas**
   - Dashboard con gráficos de consumo
   - Exportar reportes CSV/PDF

4. **Rollover de Cuotas**
   - Minutos no usados pasan al mes siguiente

---

## 📝 Changelog

### v2.0 (2025-10-24)
- ✅ Sistema de cuotas separadas (docs + audio)
- ✅ Límites de páginas por PDF
- ✅ Validación en API y processor
- ✅ Admin dashboard actualizado
- ✅ APIs v2 para gestión de cuotas

### v1.0 (Anterior)
- Cuota única mensual (todos los archivos contaban igual)

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar logs en Vercel Dashboard
2. Ejecutar queries SQL de diagnóstico (ver sección Troubleshooting)
3. Contactar: admin@annalogica.eu

---

**Última actualización:** 2025-10-24
**Autor:** Claude Code + Annalogica Team
