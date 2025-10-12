# 🔧 Ejecutar Migración de Base de Datos

## Problema Resuelto
Añade la columna `speakers_url` faltante que causa el error:
```
NeonDbError: column "speakers_url" does not exist
```

## Pasos para ejecutar la migración:

### 1. Espera a que Vercel despliegue (2 min)
Ve a: https://vercel.com/vcnpro/annalogica/deployments
Espera a que diga "Ready"

### 2. Ejecuta la migración desde terminal:

**En Windows (PowerShell):**
```powershell
curl.exe -X POST https://annalogica.eu/api/migrate `
  -H "Authorization: Bearer migration-secret-2025" `
  -H "Content-Type: application/json"
```

**En Mac/Linux:**
```bash
curl -X POST https://annalogica.eu/api/migrate \
  -H "Authorization: Bearer migration-secret-2025" \
  -H "Content-Type: application/json"
```

### 3. Verifica que funcionó

Deberías ver una respuesta como:
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "columns": ["id", "user_id", "filename", ..., "speakers_url"]
}
```

### 4. Prueba de nuevo

1. Recarga tu app (Ctrl + Shift + R)
2. Sube un archivo
3. Procesar
4. **Esta vez debería funcionar completamente** ✅

## Verificar si la migración es necesaria

Antes de ejecutar, puedes verificar:

```powershell
curl.exe -X GET https://annalogica.eu/api/migrate `
  -H "Authorization: Bearer migration-secret-2025"
```

Respuesta:
- `"migrationNeeded": true` → Ejecuta la migración
- `"migrationNeeded": false` → Ya está arreglado

## ⚠️ Nota de Seguridad

Después de ejecutar la migración, este endpoint quedará disponible.
Si quieres deshabilitarlo, elimina el archivo:
`app/api/migrate/route.ts`

O cambia el `ADMIN_SECRET` en variables de entorno de Vercel.
