# Cómo Ejecutar la Migración SQL

## Método 1: Neon Console (RECOMENDADO - MÁS FÁCIL)

1. Abre: https://console.neon.tech/
2. Inicia sesión (con tu cuenta de GitHub/email)
3. Selecciona tu proyecto de Annalogica
4. Click en "SQL Editor" en el menú izquierdo
5. Copia TODO el contenido de `migrations/separate-quotas.sql`
6. Pégalo en el editor
7. Click en "Run" o presiona Ctrl+Enter

---

## Método 2: Desde Vercel Dashboard

### Paso A: Encontrar tu base de datos
1. Ve a: https://vercel.com
2. Selecciona tu proyecto
3. Click en "Storage" (en el menú superior)
4. Busca tu base de datos Postgres (debería decir "Neon")

### Paso B: Acceder al SQL Editor
Verás uno de estos botones:
- "Open in Neon" → Click ahí → Te lleva a Neon Console (método 1)
- "Manage" → Click → Busca "SQL Editor" o "Query"
- "..." (tres puntos) → "SQL Editor"

### Paso C: Ejecutar
1. Se abrirá un editor SQL
2. Copia TODO el contenido de `migrations/separate-quotas.sql`
3. Pega y ejecuta

---

## Método 3: Con Variables de Entorno

### Paso 1: Obtener conexión string
1. Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Busca: `POSTGRES_URL` o `DATABASE_URL`
3. Click en el ojo para ver el valor
4. Cópialo (empieza con `postgres://` o `postgresql://`)

### Paso 2: Guardar localmente
Abre `.env.local` y agrega:
```
POSTGRES_URL=tu-conexion-string-aqui
```

### Paso 3: Ejecutar script
```bash
cd "C:\Users\La Bestia\annalogica"
node scripts/run-migration-separate-quotas.js
```

---

## SQL a Ejecutar

Copia este SQL completo:

```sql
-- Migración: Sistema de cuotas separadas (docs + audio)
-- Date: 2025-10-24

-- 1. Agregar nuevas columnas de cuotas separadas
ALTER TABLE users
ADD COLUMN IF NOT EXISTS monthly_quota_docs INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS monthly_quota_audio_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS monthly_usage_docs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_usage_audio_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_pages_per_pdf INTEGER DEFAULT 50;

-- 2. Migrar datos existentes
UPDATE users
SET
  monthly_quota_docs = CASE
    WHEN subscription_plan = 'basico' THEN 200
    WHEN subscription_plan = 'pro' THEN 500
    WHEN subscription_plan = 'business' THEN 1000
    ELSE 10
  END,
  monthly_quota_audio_minutes = CASE
    WHEN subscription_plan = 'basico' THEN 120
    WHEN subscription_plan = 'pro' THEN 300
    WHEN subscription_plan = 'business' THEN 600
    ELSE 10
  END,
  max_pages_per_pdf = CASE
    WHEN subscription_plan = 'basico' THEN 150
    WHEN subscription_plan = 'pro' THEN 200
    WHEN subscription_plan = 'business' THEN 300
    ELSE 50
  END,
  monthly_usage_docs = 0,
  monthly_usage_audio_minutes = 0
WHERE monthly_quota_docs IS NULL;

-- 3. Configurar Beta Testers
UPDATE users
SET
  monthly_quota_docs = 100,
  monthly_quota_audio_minutes = 60,
  max_pages_per_pdf = 100
WHERE tags @> ARRAY['beta']::text[];

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_users_quota_docs ON users(monthly_quota_docs);
CREATE INDEX IF NOT EXISTS idx_users_usage_docs ON users(monthly_usage_docs);
CREATE INDEX IF NOT EXISTS idx_users_usage_audio_minutes ON users(monthly_usage_audio_minutes);

-- 5. Comentarios
COMMENT ON COLUMN users.monthly_quota_docs IS 'Cuota mensual de documentos (PDFs, DOCX, TXT)';
COMMENT ON COLUMN users.monthly_quota_audio_minutes IS 'Cuota mensual de minutos de audio/video';
COMMENT ON COLUMN users.monthly_usage_docs IS 'Uso actual de documentos este mes';
COMMENT ON COLUMN users.monthly_usage_audio_minutes IS 'Uso actual de minutos de audio este mes';
COMMENT ON COLUMN users.max_pages_per_pdf IS 'Máximo de páginas permitidas por PDF';
COMMENT ON COLUMN users.monthly_quota IS 'DEPRECATED: Usar monthly_quota_docs y monthly_quota_audio_minutes';
COMMENT ON COLUMN users.monthly_usage IS 'DEPRECATED: Usar monthly_usage_docs y monthly_usage_audio_minutes';
```

---

## ✅ Verificar que Funcionó

Después de ejecutar, corre este query:

```sql
SELECT
  email,
  subscription_plan,
  monthly_quota_docs,
  monthly_quota_audio_minutes,
  max_pages_per_pdf
FROM users
LIMIT 5;
```

Deberías ver las nuevas columnas con valores.

---

## ❌ Si Tienes Problemas

**Error: "column already exists"**
✅ Esto es normal si ya ejecutaste parte de la migración. Ignóralo.

**Error: "table users does not exist"**
❌ Estás en la base de datos incorrecta. Verifica que estás conectado a la BD correcta.

**No encuentro Neon Console**
1. Busca en tu email el mensaje de bienvenida de Neon
2. O recupera la cuenta en: https://console.neon.tech/

---

¿Tienes dudas? Dime en qué paso te quedaste.
