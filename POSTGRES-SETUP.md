# 🗄️ Configuración de Vercel Postgres

## Paso 1: Crear la base de datos en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto `annalogica`
3. Ve a la pestaña **Storage**
4. Click en **Create Database**
5. Selecciona **Postgres**
6. Nombre sugerido: `annalogica-db`
7. Región: Selecciona **Europe (Frankfurt)** (más cercano a España)
8. Click **Create**

## Paso 2: Configurar variables de entorno

Vercel configurará automáticamente estas variables en producción:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Paso 3: Ejecutar el schema SQL

### Opción A: Desde Vercel Dashboard (Recomendado)
1. En Storage → Tu base de datos → **Query**
2. Copia y pega el contenido de `lib/db-schema.sql`
3. Click **Execute**

### Opción B: Desde línea de comandos
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Conectar a tu base de datos
vercel env pull .env.local

# Luego usar cualquier cliente PostgreSQL con las credenciales de .env.local
```

## Paso 4: Verificar la instalación

La base de datos creará:
- Tabla `users` con índice en email
- Tabla `transcriptions` con relación a users
- UUIDs automáticos para IDs

## Paso 5: Testing local (Opcional)

Para desarrollo local, puedes usar las mismas credenciales:
1. Copia las variables de entorno: `vercel env pull .env.local`
2. Reinicia tu servidor de desarrollo: `npm run dev`

## ⚠️ IMPORTANTE

- La base de datos FREE tier tiene límites:
  - 256 MB storage
  - 60 horas compute/mes
  - Suficiente para beta testing

- Para producción con más usuarios, considera upgrade a plan Pro

## 🔒 Seguridad

- Las credenciales NUNCA deben estar en el código
- Vercel maneja las variables de entorno automáticamente
- En local usa `.env.local` (ya está en .gitignore)
