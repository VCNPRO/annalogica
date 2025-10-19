# 📋 Guía Completa de Testing - Annalogica

## 🤖 Modelos de IA Utilizados

### 1. **Transcripción: AssemblyAI**
- **Modelo:** AssemblyAI Transcription API (Universal-1)
- **Ubicación:** `lib/assemblyai-client.ts` línea 52
- **Características:**
  - ✅ Detección automática de idioma
  - ✅ Diarización de hablantes (speaker labels)
  - ✅ Soporte multiidioma (ES, EN, AUTO)
  - ✅ Timestamps a nivel de palabra
  - ✅ Dual channel support
  - ✅ Auto highlights (solo EN)

**¿Es el mejor?**
- ✅ **SÍ** - AssemblyAI Universal-1 es uno de los mejores modelos del mercado
- Competidores: Whisper (OpenAI), Deepgram, Google Speech-to-Text
- Ventajas vs Whisper: Mejor diarización, API más estable, procesamiento más rápido
- Coste: $0.25 por hora de audio (competitivo)

### 2. **Resúmenes: Claude 3.7 Sonnet**
- **Modelo:** `claude-3-7-sonnet-20250219`
- **Ubicación:** `lib/assemblyai-client.ts` línea 254
- **Características:**
  - ✅ Resúmenes contextuales de alta calidad
  - ✅ Extracción de tags/categorías
  - ✅ Multiidioma (optimizado para ES)
  - ✅ 200K tokens de contexto
  - ✅ Bajo coste ($3/M input, $15/M output)

**¿Es el mejor?**
- ✅ **SÍ** - Claude 3.7 Sonnet es el modelo más avanzado de Anthropic
- Competidores: GPT-4, Gemini Pro 1.5
- Ventajas: Mejor comprensión contextual, más consistente en español
- Alternativa disponible: Claude Haiku (más barato, menos preciso)

---

## 📂 Formatos de Archivo Soportados

### **Entrada (Audio/Video)**
```
✅ MP3  - Audio comprimido (más común)
✅ MP4  - Video (extrae audio automáticamente)
✅ WAV  - Audio sin comprimir (alta calidad)
✅ M4A  - Audio AAC (Apple)
✅ FLAC - Audio sin pérdida
✅ OGG  - Audio Vorbis
✅ WEBM - Video web
✅ AVI  - Video legacy
```

### **Entrada (Documentos)**
```
✅ TXT  - Texto plano
✅ PDF  - Documentos PDF
✅ DOCX - Microsoft Word
```

### **Salida Generada**
```
📄 TXT  - Transcripción completa en texto plano
📄 SRT  - Subtítulos con timestamps y hablantes
📄 VTT  - Subtítulos WebVTT (web-compatible)
📄 PDF  - Transcripción formateada con metadata
📝 Summary (TXT) - Resumen ejecutivo
👥 Speakers (TXT) - Análisis de oradores/intervinientes
🏷️ Tags (TXT) - Categorías y tags extraídos
```

---

## 🧪 Plan de Testing

### **Fase 1: Carga de Archivos**

#### Test 1.1: Archivos Individuales
```
✓ MP4 pequeño (< 5MB)
✓ MP4 mediano (5-50MB)
✓ MP4 grande (50-200MB)
✓ MP3 pequeño
✓ MP3 mediano
✓ WAV sin comprimir
✓ M4A (Apple)
✓ PDF texto
✓ TXT simple
```

**Métricas a verificar:**
- Tiempo de carga (debería ser < 5s para < 50MB)
- Progreso de upload (0% → 100%)
- Conversión a Blob URL exitosa
- Detección correcta del tipo de archivo

#### Test 1.2: Archivos Múltiples
```
✓ 2 archivos simultáneos
✓ 5 archivos simultáneos
✓ 10 archivos simultáneos
✓ Tipos mezclados (MP3 + MP4 + PDF)
```

**Métricas a verificar:**
- Uploads en paralelo
- Sin bloqueos
- Todos completan exitosamente

#### Test 1.3: Detección de Errores
```
✗ Archivo corrupto
✗ Formato no soportado (.rar, .zip)
✗ Archivo > 500MB (límite Vercel Blob)
✗ Audio sin contenido (silencio)
```

**Esperado:**
- Mensaje de error claro
- No rompe la aplicación
- Otros archivos continúan procesándose

---

### **Fase 2: Procesamiento y Tiempos**

#### Test 2.1: Duración del Audio vs Tiempo de Procesamiento

**Estimación actual:**
- AssemblyAI: ~0.15-0.20x real-time
- Claude resumen: ~5-10 segundos fijos

**Tabla de tiempos esperados:**
```
Duración Audio | Transcripción | Resumen | Total
1 min          | ~10-15s       | ~5s     | ~20s
5 min          | ~45-60s       | ~5s     | ~65s
10 min         | ~90-120s      | ~10s    | ~130s
30 min         | ~270-360s     | ~10s    | ~380s (6.3min)
60 min         | ~540-720s     | ~10s    | ~730s (12min)
```

**Tests a realizar:**
```bash
# Audio 1 minuto
- Iniciar: [timestamp]
- Transcripción completa: [timestamp]
- Resumen completo: [timestamp]
- Tiempo total: [calcular]

# Audio 5 minutos
... repetir

# Audio 10 minutos
... repetir
```

#### Test 2.2: Indicadores de Progreso

**Verificar:**
- ✓ Barra de progreso 0-90% durante transcripción
- ✓ Indicador "Finalizando..." al 90-98%
- ✓ Salto a 100% al completarse
- ✓ Tiempo estimado restante actualizado
- ✓ Tiempo transcurrido en tiempo real

---

### **Fase 3: Calidad de Resultados**

#### Test 3.1: Transcripción

**Aspectos a evaluar:**
```
✓ Precisión del texto (> 95% correcto)
✓ Detección de idioma correcta
✓ Puntuación adecuada
✓ Párrafos bien formateados
✓ Nombres propios reconocidos
```

#### Test 3.2: Diarización de Hablantes

**Verificar:**
```
✓ Número de hablantes detectado
✓ Cambios de hablante correctos
✓ Labels consistentes (Speaker A, B, C...)
✓ Timestamps precisos de intervenciones
```

#### Test 3.3: Subtítulos (SRT/VTT)

**Verificar:**
```
✓ Sincronización correcta con audio/video
✓ Formato válido (cargar en VLC/YouTube)
✓ Labels de hablantes incluidos
✓ Longitud de líneas razonable
```

#### Test 3.4: Resumen (Claude)

**Evaluar:**
```
✓ Captura puntos principales
✓ Longitud apropiada (3-4 párrafos)
✓ Coherencia y claridad
✓ Tags relevantes (5-7)
✓ Idioma correcto (español)
```

#### Test 3.5: Reporte de Oradores

**Verificar:**
```
✓ Estadísticas por hablante:
  - Número de intervenciones
  - Palabras pronunciadas
  - Tiempo total (MM:SS)
  - Porcentaje del total
  - Promedio por intervención
✓ Línea de tiempo detallada
✓ Ordenado por participación (más activo primero)
```

---

### **Fase 4: Descarga de Archivos**

#### Test 4.1: Descarga Individual

**Formatos TXT:**
```
✓ Transcripción.txt
✓ Resumen.txt
✓ Oradores.txt
✓ Tags.txt
✓ Subtítulos.srt
✓ Subtítulos.vtt
```

**Formato PDF:**
```
✓ Transcripción.pdf (con metadata, tags, fecha)
```

**Verificar:**
- Descarga correcta
- Nombre del archivo apropiado
- Contenido legible
- Encoding UTF-8 correcto (tildes, ñ)

#### Test 4.2: Descarga en Carpetas (File System API)

**Estructura esperada:**
```
nombre-archivo/
  ├── nombre-archivo-transcripcion.txt
  ├── nombre-archivo-transcripcion.pdf
  ├── nombre-archivo.srt
  ├── nombre-archivo.vtt
  ├── nombre-archivo-resumen.txt
  ├── nombre-archivo-oradores.txt
  └── nombre-archivo-tags.txt
```

**Tests:**
```
✓ Seleccionar carpeta destino
✓ Creación de subcarpeta con nombre del archivo
✓ Todos los archivos generados dentro
✓ Sin archivos faltantes
✓ Permisos de escritura correctos
```

---

## 🎯 Criterios de Éxito

### **Rendimiento**
- ✅ Upload < 5s para archivos < 50MB
- ✅ Procesamiento ~0.2x duración del audio
- ✅ Sin timeouts
- ✅ UI responsive durante procesamiento

### **Calidad**
- ✅ Transcripción > 95% precisión
- ✅ Resumen captura puntos clave
- ✅ Diarización > 90% correcta
- ✅ Subtítulos sincronizados

### **Estabilidad**
- ✅ No crashes con archivos grandes
- ✅ Manejo de errores gracefully
- ✅ Múltiples archivos en paralelo
- ✅ Reintentos automáticos en caso de fallo

### **UX**
- ✅ Progreso visible en todo momento
- ✅ Tiempos estimados precisos
- ✅ Descarga fácil e intuitiva
- ✅ Mensajes de error claros

---

## 🔧 Posibles Mejoras Identificadas

### **Optimizaciones de Timing**
1. **Procesamiento en paralelo**: Transcripción + análisis de hablantes simultáneo
2. **Streaming de resultados**: Mostrar transcripción parcial mientras procesa
3. **Cache de resultados**: Evitar reprocesar archivos idénticos

### **Mejoras de Calidad**
1. **Custom vocabulary**: Entrenar con términos específicos del dominio
2. **Post-procesamiento**: Corrección ortográfica automática
3. **Formato enriquecido**: Markdown en lugar de TXT plano

### **Features Adicionales**
1. **Búsqueda en transcripciones**: Full-text search
2. **Edición inline**: Corregir transcripciones manualmente
3. **Export adicionales**: DOCX, JSON, XML

---

## 📊 Métricas a Recopilar

```markdown
| Métrica | Valor Actual | Objetivo | Estado |
|---------|--------------|----------|--------|
| Tiempo upload 50MB | ? | < 5s | ⏳ |
| Precisión transcripción | ? | > 95% | ⏳ |
| Tiempo proceso 10min audio | ? | < 3min | ⏳ |
| Tasa de error | ? | < 1% | ⏳ |
| Diarización correcta | ? | > 90% | ⏳ |
```

---

## ✅ Checklist de Testing

- [ ] Upload MP3
- [ ] Upload MP4
- [ ] Upload WAV
- [ ] Upload M4A
- [ ] Upload PDF
- [ ] Upload TXT
- [ ] Múltiples archivos simultáneos
- [ ] Verificar progreso de upload
- [ ] Verificar progreso de transcripción
- [ ] Medir tiempo: 1min audio
- [ ] Medir tiempo: 5min audio
- [ ] Medir tiempo: 10min audio
- [ ] Calidad transcripción
- [ ] Detección de hablantes
- [ ] Generación SRT
- [ ] Generación VTT
- [ ] Generación resumen
- [ ] Generación reporte oradores
- [ ] Tags extraídos
- [ ] Descarga TXT individual
- [ ] Descarga PDF
- [ ] Descarga en carpeta
- [ ] Manejo de errores
- [ ] Límites de cuota
- [ ] Cleanup de archivos originales
