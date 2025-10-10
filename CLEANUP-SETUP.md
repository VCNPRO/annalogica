# Configuración de Limpieza Automática de Archivos

## 📋 Resumen

Annalogica limpia automáticamente archivos procesados después de **30 días** para:
- Garantizar privacidad de datos
- Cumplir con regulaciones GDPR/LOPD
- Optimizar costos de almacenamiento en Vercel Blob

## 🔧 Configuración en Vercel

### 1. Agregar Variable de Entorno

1. Ve a tu proyecto en Vercel Dashboard: https://vercel.com/solammedia-9886s-projects/annalogica
2. Click en **Settings** → **Environment Variables**
3. Agrega la siguiente variable:
   - **Name**: `CRON_SECRET`
   - **Value**: Genera un token aleatorio fuerte (ej: `openssl rand -base64 32`)
   - **Environment**: Production, Preview, Development (selecciona todos)
4. Click en **Save**

### 2. Verificar Configuración de Cron

El archivo `vercel.json` ya está configurado con:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Horario**: Todos los días a las 2:00 AM UTC

### 3. Deploy y Activación

1. Haz commit y push de los cambios:
   ```bash
   git add .
   git commit -m "Add automatic file cleanup cron job"
   git push
   ```

2. El cron job se activará automáticamente en el próximo deploy

3. Vercel ejecutará el endpoint `/api/cron/cleanup` diariamente a las 2:00 AM UTC

## 🧪 Probar el Cron Job Manualmente

Puedes probar el endpoint manualmente:

```bash
# Reemplaza YOUR_CRON_SECRET con el valor que configuraste
curl -X POST https://annalogica.eu/api/cron/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Cleanup completed",
  "jobsProcessed": 5,
  "filesDeleted": 20,
  "jobsDeleted": 5,
  "errors": []
}
```

## 📊 Monitoreo

### Vercel Dashboard

1. Ve a **Deployments** → Click en tu deployment
2. Navega a **Functions** → Encuentra `/api/cron/cleanup`
3. Revisa logs y ejecuciones

### Logs del Cron Job

Los logs mostrarán:
- `[Cron] Starting cleanup job...` - Inicio de limpieza
- `[Cleanup] Found X old jobs to clean up` - Trabajos encontrados
- `[Cleanup] Deleted blob: [URL]` - Cada archivo eliminado
- `[Cron] Cleanup job completed` - Finalización exitosa

## 🔒 Seguridad

- **Autenticación**: El endpoint requiere `Authorization: Bearer CRON_SECRET`
- **Solo Vercel Cron**: El header de autorización evita acceso no autorizado
- **Rate limiting**: Vercel Cron está limitado a 1 ejecución por minuto

## ⚙️ Personalización

### Cambiar el período de retención

Edita `app/api/cron/cleanup/route.ts`:

```typescript
// En lugar de 30 días, usa 60 días
const result = await cleanupOldFilesAndRecords(60);
```

### Cambiar el horario

Edita `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"  // 3:00 AM UTC en lugar de 2:00 AM
    }
  ]
}
```

**Formato de schedule**:
- `0 2 * * *` = Todos los días a las 2:00 AM UTC
- `0 2 * * 0` = Todos los domingos a las 2:00 AM UTC
- `0 */6 * * *` = Cada 6 horas

Más info: https://crontab.guru/

## ⚠️ Notas Importantes

1. **Archivos de audio originales**: Se eliminan inmediatamente después de procesamiento, NO se guardan
2. **Solo resultados**: Los archivos TXT, SRT, VTT y resúmenes se conservan por 30 días
3. **Sin recuperación**: Los archivos eliminados NO se pueden recuperar
4. **Aviso al usuario**: Los usuarios ven el aviso de 30 días en la página de Ajustes

## 🐛 Troubleshooting

### El cron job no se ejecuta

1. Verifica que `CRON_SECRET` esté configurado en Vercel
2. Verifica que `vercel.json` esté en el root del proyecto
3. Revisa que hayas hecho deploy después de agregar `vercel.json`
4. Vercel Cron solo funciona en **Production**, no en Preview/Development

### Errores de "BLOB_READ_WRITE_TOKEN not configured"

1. Verifica que `BLOB_READ_WRITE_TOKEN` esté en Environment Variables de Vercel
2. Asegúrate de que esté disponible en Production

### "Unauthorized" al probar manualmente

- Verifica que estés usando el mismo `CRON_SECRET` configurado en Vercel
- El header debe ser exactamente: `Authorization: Bearer YOUR_SECRET`

## 📚 Recursos

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Crontab Schedule Expression](https://crontab.guru/)
