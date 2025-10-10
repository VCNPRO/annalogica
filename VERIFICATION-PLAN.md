# Plan de Verificación - Detección de Oradores

## 🎯 Objetivo
Verificar que la funcionalidad de detección de oradores funciona correctamente en producción.

---

## ✅ Pre-requisitos Completados
- [x] Código pusheado a GitHub
- [x] Migración SQL ejecutada en Neon
- [x] Deployment iniciado en Vercel

---

## 🧪 Plan de Pruebas

### Fase 1: Verificación de Deployment
**Objetivo:** Confirmar que el deployment se completó exitosamente

**Pasos:**
1. Ve a: https://vercel.com/solammedia-9886s-projects/annalogica
2. Verifica que el último deployment tenga:
   - ✅ Estado: "Ready" (círculo verde)
   - ✅ Commit: "7913d9d - fix: Add production-ready error handling..."
   - ✅ Branch: main
   - ✅ Sin errores de build

**Resultado Esperado:** Deployment completado sin errores

---

### Fase 2: Verificación de Funcionalidad Básica
**Objetivo:** Confirmar que la app funciona correctamente

**Pasos:**
1. Abre: https://annalogica.eu
2. Inicia sesión con tu cuenta
3. Verifica que el dashboard carga correctamente
4. Verifica que puedes acceder a Ajustes

**Resultado Esperado:** App funciona normalmente

---

### Fase 3: Prueba de Detección de Oradores (CRÍTICA)
**Objetivo:** Verificar que la detección de oradores funciona end-to-end

**Pasos:**

#### 3.1 Preparar Audio de Prueba
- **Opción A:** Usa un archivo de audio propio con 2+ oradores
- **Opción B:** Descarga un sample de conversación en español
- **Formato sugerido:** MP3, M4A, WAV (cualquier formato de audio)
- **Duración sugerida:** 1-3 minutos (para prueba rápida)

#### 3.2 Subir y Procesar
1. En dashboard, arrastra el archivo de audio
2. Selecciona el archivo cargado (checkbox)
3. Click en "📝 Transcribir" (botón naranja)
4. Click en "🚀 Procesar Archivos" (botón verde)
5. Espera a que el status cambie:
   - `Subiendo` → `Pendiente` → `Procesando` → `Completado`

**Tiempo estimado:** 2-5 minutos (depende de duración del audio)

#### 3.3 Verificar Resultados
Cuando el archivo aparezca en "Todos los Archivos Completados":

1. **Selecciona el archivo completado**
2. **Click en "📥 Descargar"**
3. **Elige carpeta de descarga** (si usa descarga organizada)

#### 3.4 Verificar Archivos Descargados
Deberías tener estos archivos en la carpeta:

**Archivos Esperados:**
- ✅ `nombrearchivo-transcripcion.txt` (o .pdf según configuración)
- ✅ `nombrearchivo.srt`
- ✅ `nombrearchivo.vtt`
- ✅ `nombrearchivo-resumen.txt`
- ✅ **`nombrearchivo-oradores.txt`** ← **¡NUEVO! VERIFICAR ESTE**
- ✅ `nombrearchivo-tags.txt`

#### 3.5 Verificar Contenido del Archivo de Oradores
Abre `nombrearchivo-oradores.txt` y verifica:

**Estructura esperada:**
```
============================================================
ANÁLISIS DE ORADORES / INTERVINIENTES
============================================================

Total de oradores detectados: [NÚMERO]
Duración total del audio: [MM:SS]

------------------------------------------------------------
RESUMEN POR ORADOR
------------------------------------------------------------

1. Speaker A
   Intervenciones: [NÚMERO]
   Palabras pronunciadas: [NÚMERO]
   Tiempo total: [MM:SS] ([%]% del total)
   Promedio por intervención: [MM:SS]

2. Speaker B
   ...

------------------------------------------------------------
LÍNEA DE TIEMPO DETALLADA
------------------------------------------------------------

[MM:SS → MM:SS] (MM:SS)
Speaker A: [Texto de la intervención]

[MM:SS → MM:SS] (MM:SS)
Speaker B: [Texto de la intervención]

...
```

**Validaciones:**
- ✅ El archivo existe y no está vacío
- ✅ Contiene al menos 1 orador detectado
- ✅ Los porcentajes suman ~100%
- ✅ No hay valores "NaN", "Infinity", "undefined", "null"
- ✅ Los timestamps están en orden cronológico
- ✅ El texto de las intervenciones es coherente

---

### Fase 4: Pruebas de Casos Edge

#### 4.1 Audio con 1 Solo Orador
**Objetivo:** Verificar que funciona con monólogo

**Pasos:**
1. Sube audio con una sola persona hablando
2. Procesa
3. Verifica que el reporte muestre 1 orador o mensaje apropiado

**Resultado Esperado:** Reporte con 1 orador o mensaje informativo

#### 4.2 Audio Muy Corto
**Objetivo:** Verificar que no rompe con audios cortos

**Pasos:**
1. Sube audio de <30 segundos
2. Procesa
3. Verifica que se complete sin errores

**Resultado Esperado:** Transcripción completa, reporte puede ser breve pero válido

#### 4.3 Descarga Individual (sin carpeta)
**Objetivo:** Verificar descarga cuando el navegador no soporta File System Access API

**Pasos:**
1. En navegador, deniega permiso de carpeta si se pide
2. Click en descargar
3. Verifica que se abran múltiples tabs con cada archivo

**Resultado Esperado:** Todos los archivos se descargan, incluido oradores.txt

---

### Fase 5: Verificación de Base de Datos

**Objetivo:** Confirmar que speakers_url se guarda correctamente

**Pasos:**
1. Ve a Neon Console: https://console.neon.tech/
2. Abre SQL Editor
3. Ejecuta esta query:
   ```sql
   SELECT
     id,
     filename,
     status,
     speakers_url,
     created_at
   FROM transcription_jobs
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Resultado Esperado:**
- ✅ Campo `speakers_url` contiene una URL de Vercel Blob
- ✅ URL termina en `-oradores.txt`
- ✅ URL contiene sufijo aleatorio

**Ejemplo de URL válida:**
```
https://abc123.public.blob.vercel-storage.com/nombrearchivo-oradores-xyz456.txt
```

---

### Fase 6: Verificación de Cleanup Job (Opcional)

**Objetivo:** Confirmar que el cron job incluye speakers_url

**Pasos:**
1. Verifica que el cron job está configurado en Vercel
2. Ve a: Settings → Cron Jobs
3. Verifica que existe: `/api/cron/cleanup` programado diariamente

**Resultado Esperado:** Cron job configurado y activo

---

## 📊 Checklist de Resultados

### ✅ Funcionalidad Core
- [ ] Deployment completado sin errores
- [ ] App carga correctamente
- [ ] Login funciona
- [ ] Subida de archivos funciona
- [ ] Procesamiento completa sin errores
- [ ] Archivo de oradores se genera
- [ ] Archivo de oradores se descarga

### ✅ Calidad del Reporte
- [ ] Estructura correcta del reporte
- [ ] Número de oradores detectados es correcto
- [ ] Estadísticas tienen sentido (sin NaN/Infinity)
- [ ] Porcentajes suman ~100%
- [ ] Línea de tiempo en orden cronológico
- [ ] Texto de intervenciones es coherente

### ✅ Integración
- [ ] speakers_url guardado en base de datos
- [ ] URL de Vercel Blob válida y accesible
- [ ] Archivo incluido en descargas organizadas
- [ ] Archivo incluido en descargas individuales
- [ ] Otros archivos (TXT, SRT, VTT, resumen) no afectados

### ✅ Robustez
- [ ] Funciona con múltiples oradores
- [ ] Funciona con 1 solo orador
- [ ] Funciona con audio corto
- [ ] No rompe transcripción si falla
- [ ] Logs informativos en caso de error

---

## 🐛 Si Encuentras Problemas

### Problema: Archivo de oradores no se genera
**Debug:**
1. Ve a Vercel Dashboard → Functions → Logs
2. Busca logs con `[Inngest]` y `speakers`
3. Verifica si hay errores de tipo:
   - `Failed to save speakers report`
   - `BLOB_READ_WRITE_TOKEN not configured`

### Problema: Archivo vacío o con errores
**Debug:**
1. Verifica que AssemblyAI detectó oradores (revisa metadata)
2. Busca en logs: `No se detectaron oradores en esta transcripción`
3. Verifica que el audio tiene múltiples voces claramente distinguibles

### Problema: URL de speakers_url es null
**Debug:**
1. Verifica logs de Inngest
2. Busca: `Failed to save speakers report (non-fatal)`
3. Esto es normal si hay error, pero transcripción debe completarse

---

## 📞 Próximos Pasos

Una vez completadas las pruebas:

1. **Si todo funciona:** ✅ Feature lista para producción
2. **Si hay problemas menores:** 🔧 Documentar y crear fixes
3. **Si hay problemas críticos:** 🚨 Rollback y debug

---

## 📝 Notas

- Esta es una feature **suplementaria**: Si falla, no debe romper transcripciones
- El reporte se genera **automáticamente** para todos los audios
- Los usuarios **no necesitan configurar nada**
- El archivo se elimina automáticamente después de **30 días**

---

**Creado:** 2025-10-10
**Última actualización:** 2025-10-10
