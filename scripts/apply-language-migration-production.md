# Aplicar Migración de preferred_language en Producción

## ⚠️ PROBLEMA ACTUAL

Error 500 en `/api/user/language` porque la columna `preferred_language` no existe en la tabla `users` de producción.

## ✅ SOLUCIÓN

### Opción 1: Desde Vercel Dashboard (MÁS FÁCIL)

1. Ve a: https://vercel.com/solammedia-9886s-projects/annalogica
2. Click en **Storage** → **Postgres** → **Data** → **Query**
3. Pega este SQL y ejecuta:

```sql
-- Add preferred_language column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'es';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- Update existing users to have default language 'es'
UPDATE users
SET preferred_language = 'es'
WHERE preferred_language IS NULL;
```

4. Verifica que funcionó:

```sql
SELECT id, email, preferred_language FROM users LIMIT 5;
```

Deberías ver la columna `preferred_language` con valor 'es'.

### Opción 2: Usando Vercel CLI

```bash
# 1. Conectar a la base de datos
vercel env pull .env.production

# 2. Conectar con psql
psql $(grep POSTGRES_URL .env.production | cut -d '=' -f2-)

# 3. Ejecutar la migración
\i migrations/add_preferred_language.sql

# 4. Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'preferred_language';
```

### Opción 3: Usar el script automático

```bash
# Ejecutar el script de migración
npm run migrate:language
```

## 🧪 Verificar que funcionó

Después de aplicar la migración, prueba:

```bash
curl https://annalogica.eu/api/user/language \
  -H "Cookie: auth-token=TU_TOKEN_REAL"
```

Debería devolver: `{"language":"es"}` en lugar de error 500.

## 📝 Mover a aplicadas

Una vez aplicada en producción, mueve el archivo:

```bash
mv migrations/add_preferred_language.sql migrations/applied/
```

---

**Fecha:** 2025-11-16
**Estado:** Pendiente de aplicar
