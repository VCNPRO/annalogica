# Implementación de Detección de Oradores/Intervinientes

## 📋 Resumen

Se ha implementado la detección y análisis de oradores/intervinientes como funcionalidad fundamental en Annalogica.

**Fecha**: 2025-10-10
**Estado**: ✅ Código implementado - Pendiente migración SQL y deploy

## 🎯 Funcionalidades Implementadas

### 1. Análisis de Oradores

La función `generateSpeakersReport()` genera un reporte detallado que incluye:

- **Resumen general:**
  - Total de oradores detectados
  - Duración total del audio

- **Estadísticas por orador:**
  - Número de intervenciones
  - Palabras pronunciadas
  - Tiempo total de habla
  - Porcentaje del total
  - Promedio por intervención

- **Línea de tiempo detallada:**
  - Marca de tiempo de inicio y fin de cada intervención
  - Orador identificado
  - Texto completo de la intervención

### 2. Archivos Modificados

#### `lib/assemblyai-client.ts`
✅ Agregadas funciones:
- `generateSpeakersReport(result: TranscriptionResult): string`
- `saveSpeakersReport(result: TranscriptionResult, filename: string): Promise<string>`
- Funciones helper: `formatDuration()`, `formatTimestampSimple()`

#### `lib/inngest/functions.ts`
✅ Modificado:
- Importada función `saveSpeakersReport`
- Integrado en el step `save-results-and-metadata`
- El reporte de oradores se genera y guarda automáticamente después de cada transcripción

#### `lib/db.ts`
✅ Actualizado:
- Interface `TranscriptionJob`: agregado campo `speakers_url: string | null`
- Función `updateResults`: agregado parámetro `speakersUrl?: string`

#### `lib/blob-cleanup.ts`
✅ Actualizado:
- Query SQL incluye `speakers_url` en la lista de URLs a eliminar
- El cron job limpiará automáticamente los reportes de oradores junto con otros archivos

#### `app/page.tsx`
✅ Actualizado:
- Función `downloadFilesOrganized`: descarga archivo de oradores en carpeta organizada
- Función `downloadFilesIndividually`: descarga archivo de oradores individualmente

## 🔧 Pasos de Configuración Pendientes

### 1. Ejecutar Migración SQL

**IMPORTANTE**: Debes ejecutar la migración SQL en la base de datos Neon antes de desplegar.

```bash
# 1. Ve a Neon Dashboard: https://console.neon.tech/
# 2. Selecciona tu proyecto
# 3. Ve a la sección SQL Editor
# 4. Ejecuta el siguiente script:
```

```sql
-- Migración: Agregar columna speakers_url a transcription_jobs
ALTER TABLE transcription_jobs
ADD COLUMN IF NOT EXISTS speakers_url TEXT;

-- Comentario para documentación
COMMENT ON COLUMN transcription_jobs.speakers_url IS 'URL del reporte de análisis de oradores/intervinientes';

-- Verificar la columna
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transcription_jobs'
AND column_name = 'speakers_url';
```

**Archivo de migración**: `lib/db-migration-speakers.sql`

### 2. Desplegar a Producción

Una vez ejecutada la migración SQL:

```bash
git add .
git commit -m "feat: Add speaker/participant detection as core feature

- Generate detailed speaker analysis report
- Track speakers in metadata
- Include speakers report in downloads
- Add speakers_url to database schema
- Update cleanup job to handle speakers files"

git push
```

Vercel desplegará automáticamente los cambios.

## 📊 Cómo Funciona

### Flujo de Procesamiento

1. **Usuario sube audio** → Archivo se carga a Vercel Blob
2. **Transcripción** → AssemblyAI transcribe con `speaker_labels: true` (ya estaba habilitado)
3. **Generación de reporte** → Se crea automáticamente el análisis de oradores
4. **Guardado** → El reporte se guarda en Vercel Blob como `{filename}-oradores.txt`
5. **Base de datos** → La URL se guarda en `speakers_url`
6. **Descarga** → El archivo se incluye automáticamente en las descargas

### Ejemplo de Reporte Generado

```
============================================================
ANÁLISIS DE ORADORES / INTERVINIENTES
============================================================

Total de oradores detectados: 3
Duración total del audio: 15:30

------------------------------------------------------------
RESUMEN POR ORADOR
------------------------------------------------------------

1. Speaker A
   Intervenciones: 25
   Palabras pronunciadas: 1,250
   Tiempo total: 8:45 (56.5% del total)
   Promedio por intervención: 0:21

2. Speaker B
   Intervenciones: 18
   Palabras pronunciadas: 890
   Tiempo total: 5:20 (34.4% del total)
   Promedio por intervención: 0:18

3. Speaker C
   Intervenciones: 5
   Palabras pronunciadas: 210
   Tiempo total: 1:25 (9.1% del total)
   Promedio por intervención: 0:17

------------------------------------------------------------
LÍNEA DE TIEMPO DETALLADA
------------------------------------------------------------

[0:00 → 0:25] (0:25)
Speaker A: Bienvenidos a esta reunión...

[0:26 → 0:45] (0:19)
Speaker B: Gracias por la introducción...

...
```

## 🔍 Formato de Archivo

- **Nombre**: `{audio-basename}-oradores.txt`
- **Codificación**: UTF-8
- **Formato**: Texto plano con estructura jerárquica
- **Ubicación**: Vercel Blob Storage (público)

## 🗑️ Retención de Datos

Los reportes de oradores siguen la misma política de retención:
- **30 días** desde la fecha de completado
- Limpieza automática via cron job (`/api/cron/cleanup`)
- Se eliminan junto con transcripciones, SRT, VTT y resúmenes

## 📱 Interfaz de Usuario

En el dashboard, los reportes de oradores:
- ✅ Se descargan automáticamente con otros archivos
- ✅ Se incluyen en descargas organizadas por carpetas
- ✅ Se incluyen en descargas individuales

**Futuras mejoras sugeridas**:
- Mostrar número de oradores detectados en la UI
- Previsualización del análisis de oradores antes de descargar
- Filtrar por número de oradores

## 🧪 Testing

Para probar manualmente:

1. Ejecuta la migración SQL en Neon
2. Despliega a producción
3. Sube un archivo de audio con múltiples oradores
4. Espera a que se complete el procesamiento
5. Descarga los resultados
6. Verifica que el archivo `{nombre}-oradores.txt` esté incluido

## ⚠️ Notas Importantes

1. **AssemblyAI ya tenía speaker detection habilitado** - Solo se agregó la generación del reporte
2. **El reporte se genera SIEMPRE** - Aunque no haya múltiples oradores detectados
3. **Formato en español** - Títulos y etiquetas en español para consistencia con la app
4. **No requiere configuración adicional** - Funciona automáticamente para todos los usuarios

## 📚 Referencias

- Archivo principal: `lib/assemblyai-client.ts:310-429`
- Integración Inngest: `lib/inngest/functions.ts:45-69`
- Descargas: `app/page.tsx:516-524` (carpetas), `app/page.tsx:582` (individual)
- Cleanup: `lib/blob-cleanup.ts:82-96`
