# 📦 Política de Almacenamiento de Archivos

## ✅ Archivos que SÍ se Guardan (Permanentemente)

Los siguientes archivos se almacenan en **Vercel Blob** por 30 días:

1. **Transcripciones** (`txt_url`)
   - Texto completo de la transcripción
   - Formato: `.txt`

2. **Subtítulos SRT** (`srt_url`)
   - Subtítulos con timestamps
   - Formato: `.srt`

3. **Subtítulos VTT** (`vtt_url`)
   - Subtítulos formato WebVTT
   - Formato: `.vtt`

4. **Reporte de Hablantes** (`speakers_url`)
   - Lista de quién dijo qué
   - Formato: `.txt`

5. **Resúmenes** (`summary_url`)
   - Resumen generado por Claude
   - Formato: `.txt`

## ❌ Archivos que NO se Guardan (Eliminados Inmediatamente)

**Archivos de audio/video originales** (`audio_url`):
- ❌ **NO se almacenan** después del procesamiento
- 🔄 Se usan **temporalmente** solo durante la transcripción
- 🗑️ Se **eliminan automáticamente** en cuanto la transcripción termina
- ⚡ Esto ahorra espacio y costos de almacenamiento

## 🔧 Implementación Técnica

### Cuándo se Elimina el Original

```typescript
// En lib/inngest/functions.ts - transcribeFile()
await step.run('delete-original-audio', async () => {
  const { del } = await import('@vercel/blob');
  await del(audioUrl);
  console.log('✅ Deleted original audio file');
});
```

**Esto ocurre:**
1. ✅ Después de que la transcripción se complete exitosamente
2. ✅ Después de guardar todos los resultados (TXT, SRT, VTT)
3. ✅ Antes de marcar el job como "transcribed"

### APIs No Exponen audio_url

Los siguientes endpoints **NO devuelven** `audio_url`:

- `GET /api/files` - Lista de transcripciones del usuario
- `GET /api/jobs/[jobId]` - Detalles de un job específico
- `GET /api/jobs/[jobId]/[id]` - Status de un job

### Cleanup Cron Ignora audio_url

El cron job de limpieza (`/api/cron/cleanup`):
- ✅ Elimina archivos viejos de TXT, SRT, VTT, summary
- ❌ NO intenta eliminar audio_url (ya fue eliminado)

## 📊 Columna audio_url en Base de Datos

La columna `audio_url` en `transcription_jobs`:
- ✅ **SÍ existe** en la base de datos
- ⚠️ Solo contiene URLs temporales durante procesamiento
- 🗑️ La URL apunta a un archivo que **ya no existe** después de transcripción
- 📝 Se mantiene para historial/debugging, pero el archivo está eliminado

## 💰 Ahorro de Costos

**Antes:**
- Archivo original: 10 MB
- Resultados (TXT + SRT + VTT + Summary): ~500 KB
- **Total almacenado:** 10.5 MB por 30 días

**Después (actual):**
- Archivo original: ❌ Eliminado
- Resultados (TXT + SRT + VTT + Summary): ~500 KB
- **Total almacenado:** 0.5 MB por 30 días
- **Ahorro:** ~95% de espacio

## ⚠️ Importante para Desarrollo

Si necesitas cambiar el flujo de procesamiento:

1. ❌ **NO guardes** el archivo original en otras columnas
2. ❌ **NO devuelvas** `audio_url` en respuestas de API
3. ❌ **NO intentes** acceder a `audio_url` después de transcripción
4. ✅ **SÍ usa** `audio_url` temporalmente durante procesamiento (es válido durante transcripción)

## 🔍 Verificación

Para verificar que esto funciona:

```sql
-- Ver un job completado
SELECT
  id,
  filename,
  status,
  audio_url,  -- Esta URL existe en BD pero archivo eliminado
  txt_url     -- Esta URL sí apunta a archivo real
FROM transcription_jobs
WHERE status = 'completed'
LIMIT 1;
```

Luego intenta acceder manualmente a `audio_url` - debería dar error 404.
La `txt_url` debería funcionar correctamente.
