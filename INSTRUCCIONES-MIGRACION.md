# 🔧 URGENTE: Ejecutar Migración de Base de Datos

## ❌ Error Actual
**"Error interno del servidor"** al registrarse

## 🔍 Causa
La columna `name` no existe todavía en la tabla `users` de la base de datos.

## ✅ Solución: Ejecutar Migración

### Opción 1: Desde Vercel Dashboard (Recomendado)

1. Ve a: https://vercel.com/tu-proyecto/storage
2. Selecciona tu base de datos Postgres
3. Haz clic en "Query" o "Data"
4. Copia y pega este SQL:

```sql
-- Migration: Add name field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Create index for name searches
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
```

5. Ejecuta la query

### Opción 2: Desde Terminal (Si tienes acceso directo)

```bash
# Usando psql
psql $POSTGRES_URL -f lib/db-migration-add-user-name.sql

# O usando la CLI de Vercel
vercel env pull
psql $(grep POSTGRES_URL .env.local | cut -d '=' -f2-) -f lib/db-migration-add-user-name.sql
```

### Opción 3: Desde pgAdmin u otra herramienta GUI

1. Conecta a tu base de datos con los credentials de Vercel
2. Abre el archivo `lib/db-migration-add-user-name.sql`
3. Ejecuta el contenido

## 🔄 Verificación

Después de ejecutar la migración, verifica que la columna existe:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'name';
```

Deberías ver:
```
column_name | data_type
------------|-------------
name        | varchar
```

## 📝 Después de la Migración

1. Refresca la página de registro
2. Prueba crear una cuenta nueva con nombre
3. Verifica que el nombre aparece en el dashboard

## ⚠️ Notas Importantes

- ✅ La migración es **segura** y **no destructiva**
- ✅ Usa `IF NOT EXISTS` por lo que es **idempotente**
- ✅ Los usuarios existentes no se verán afectados
- ✅ El campo `name` es **opcional** (permite NULL)
- ✅ Usuarios antiguos seguirán funcionando normalmente

## 🆘 Si No Puedes Ejecutar la Migración Ahora

Puedes usar la versión anterior del código temporalmente:

```bash
# Revertir el commit
git revert HEAD

# O crear una rama temporal sin el campo name
git checkout -b temp-without-name
git revert dcb3182
```

Pero lo ideal es ejecutar la migración cuanto antes.
