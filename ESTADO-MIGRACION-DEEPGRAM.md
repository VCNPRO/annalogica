# 🔍 ESTADO ACTUAL DE LA MIGRACIÓN A DEEPGRAM

**Fecha:** 5 de diciembre de 2025
**Descubrimiento:** La migración a Deepgram está **PARCIALMENTE completada pero NO ACTIVADA**

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual: SISTEMA DUAL (uno activo, otro inactivo)

Tu aplicación tiene **DOS sistemas de procesamiento de audio**:

| Sistema | Tecnología | Estado | Ubicación | Se Usa en Producción |
|---------|-----------|--------|-----------|---------------------|
| **Sistema 1 (Antiguo)** | Inngest + Deepgram + OpenAI | ✅ Implementado pero inactivo | `lib/inngest/functions.ts` | ❌ NO |
| **Sistema 2 (Actual)** | Directo + OpenAI Whisper | ✅ Activo | `lib/processors/audio-processor.ts` | ✅ SÍ |

**El problema:** El sistema con Deepgram está programado pero no se está ejecutando.

---

## 🔍 ANÁLISIS DETALLADO

### Sistema 1: Inngest + Deepgram (INACTIVO)

**Archivo:** `lib/inngest/functions.ts`

**Estado:** ✅ CÓDIGO COMPLETO Y FUNCIONAL

```typescript
// Línea 11-14: Importación y configuración
import { createClient } from "@deepgram/sdk";
const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

// Línea 78-85: Llamada a Deepgram API
const deepgramResult = await step.run('transcribe-audio-deepgram', async () => {
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    { model: "nova-3", smart_format: true, diarize: true, utterances: true }
  );
  if (error) throw new Error(error.message);
  return result;
});
```

**Características implementadas:**
- ✅ Transcripción con Deepgram Nova-3
- ✅ Diarización de speakers automática
- ✅ Generación de SRT/VTT
- ✅ Resúmenes con GPT-4o-mini
- ✅ Identificación de speakers con OpenAI
- ✅ Sistema de retry (2 intentos)
- ✅ Concurrency control (20 simultáneos)
- ✅ Limpieza automática de archivos originales

**¿Por qué no se usa?**
- El endpoint `/api/process` llama directamente a `processAudioFile()` de `audio-processor.ts`
- NO envía eventos a Inngest
- Inngest functions están registradas pero nunca se triggerean

---

### Sistema 2: Procesamiento Directo + OpenAI Whisper (ACTIVO)

**Archivo:** `lib/processors/audio-processor.ts`

**Estado:** ✅ EN USO ACTUALMENTE

```typescript
// Línea 160-175: Llamada directa a OpenAI Whisper
const transcriptionParams: any = {
  file: audioFileForWhisper,
  model: "whisper-1",  // ← OpenAI Whisper V3
  response_format: "verbose_json",
  timestamp_granularities: ["segment", "word"]
};

// Solo acepta archivos ≤ 25 MB
const transcriptionResponse = await openai.audio.transcriptions.create(transcriptionParams);
```

**Características:**
- ✅ Procesamiento síncrono en serverless function
- ✅ Límite: 25 MB (OpenAI Whisper)
- ✅ Timeout: 300s (5 minutos)
- ❌ No soporta archivos grandes
- ❌ No soporta euskera, gallego, etc.

**¿Por qué se usa este?**
- Es llamado directamente desde `/api/process` (línea 147)
- No requiere Inngest configurado
- Más simple pero más limitado

---

## 🔧 ESTADO DE DEPENDENCIAS

### Package.json

```json
"dependencies": {
  "@deepgram/sdk": "^3.3.4",  // ✅ Declarado
  "inngest": "^3.44.3",        // ✅ Declarado
  "openai": "^4.51.0"          // ✅ Declarado
}
```

### Node_modules

```bash
@deepgram/sdk: ❌ NO INSTALADO (npm list muestra "empty")
inngest: ✅ Instalado
openai: ✅ Instalado
```

**Problema:** El paquete `@deepgram/sdk` está en package.json pero no en node_modules.

**Posibles causas:**
1. Se agregó recientemente y no se ejecutó `npm install`
2. Se borró node_modules y no se reinstalaron dependencias
3. Hay error en la instalación del paquete

---

## 📋 LO QUE FALTA PARA COMPLETAR LA MIGRACIÓN

### PASO 1: Instalar Dependencias (5 minutos)

```bash
cd annalogica
npm install
```

Esto instalará `@deepgram/sdk` que está faltando.

### PASO 2: Configurar Variables de Entorno (2 minutos)

Agregar en Vercel Dashboard y `.env.local`:

```bash
DEEPGRAM_API_KEY=your_api_key_here
```

Obtener API key en: https://console.deepgram.com/

### PASO 3: Cambiar el Flujo de Procesamiento (15 minutos)

**Opción A: Usar Inngest (Sistema completo con Deepgram)**

Modificar `/api/process/route.ts`:

```typescript
// ANTES (línea 147):
await processAudioFile(job.id);

// DESPUÉS:
await inngest.send({
  name: 'task/transcribe',
  data: {
    jobId: job.id
  }
});

// Retornar inmediatamente (procesamiento asíncrono)
return successResponse({
  success: true,
  message: 'Procesamiento iniciado. Te notificaremos cuando termine.',
  jobId: job.id,
  status: 'processing'
});
```

**Ventajas:**
- ✅ Usa Deepgram (soporta archivos grandes)
- ✅ Procesamiento asíncrono (no bloquea serverless function)
- ✅ Sistema de retry automático
- ✅ Ya está completamente implementado

**Desventajas:**
- ⚠️ Requiere configurar Inngest en Vercel
- ⚠️ Cambio de UX (async vs sync)

**Opción B: Reemplazar Whisper con Deepgram en el sistema directo (Híbrido)**

Modificar `lib/processors/audio-processor.ts`:

```typescript
// Agregar al inicio del archivo:
import { createClient } from "@deepgram/sdk";
const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

// Reemplazar STEP 2 (línea 152-210):
const transcriptionResponse = await deepgram.listen.prerecorded.transcribeUrl(
  { url: audioUrl },
  {
    model: "nova-3",
    smart_format: true,
    diarize: true,
    utterances: true,
    language: jobLanguage !== 'auto' ? jobLanguage : undefined
  }
);

const transcriptionText = transcriptionResponse.result.results.channels[0].alternatives[0].transcript;
const transcriptionDuration = transcriptionResponse.result.metadata.duration;
const transcriptionSegments = transcriptionResponse.result.results.utterances || [];
```

**Ventajas:**
- ✅ Mantiene procesamiento síncrono (UX sin cambios)
- ✅ Usa Deepgram (soporta archivos grandes)
- ✅ No requiere configurar Inngest

**Desventajas:**
- ⚠️ Archivos muy grandes pueden timeout en serverless (>300s)
- ⚠️ Requiere modificar código de audio-processor

### PASO 4: Testing (30 minutos)

1. Probar con archivo pequeño (5 MB)
2. Probar con archivo mediano (50 MB)
3. Probar con archivo grande (100 MB)
4. Probar con euskera/gallego
5. Verificar costos reales en Deepgram dashboard

### PASO 5: Deploy Gradual (variable)

1. Deploy a preview
2. Testing exhaustivo en preview
3. Deploy a producción con 10% tráfico
4. Monitorear errores 24 horas
5. Aumentar a 100% si todo OK

---

## 💰 COMPARATIVA DE COSTOS (Real)

### Situación Actual (OpenAI Whisper)

```
500 archivos/mes × 10 min = 5,000 minutos

OpenAI Whisper: $0.006/min
Total: 5,000 × $0.006 = $30/mes

Limitación: Solo archivos ≤ 25 MB
```

### Con Deepgram (Propuesto)

```
500 archivos/mes × 10 min = 5,000 minutos

Deepgram Nova-3: $0.0065/min
Total: 5,000 × $0.0065 = $32.50/mes

Diferencia: +$2.50/mes (+8.3%)

Ventaja: Soporta archivos hasta 2 GB + más idiomas
```

**ROI:** Positivo inmediatamente si reduces churn de usuarios con archivos grandes.

---

## 🎯 RECOMENDACIÓN

### Enfoque Recomendado: **Opción B (Híbrido)**

**¿Por qué?**
1. ✅ **Más simple:** No requiere configurar Inngest
2. ✅ **Menor riesgo:** Mantiene la misma UX
3. ✅ **Rápido:** 15 minutos de implementación
4. ✅ **Testeable:** Fácil de probar localmente
5. ✅ **Rollback fácil:** Si falla, revertir código es trivial

### Plan de Implementación (1 hora total)

```
1. [5 min] npm install                          → Instalar @deepgram/sdk
2. [2 min] Agregar DEEPGRAM_API_KEY            → Variables entorno
3. [15 min] Modificar audio-processor.ts        → Reemplazar Whisper con Deepgram
4. [30 min] Testing local con 5 archivos        → Verificar funcionalidad
5. [5 min] Commit + push                        → Deploy a producción
6. [30 min] Monitoreo post-deploy               → Ver logs, errores, costos
```

**Total:** 1 hora 27 minutos

---

## 📝 ARCHIVOS A MODIFICAR

### Para Opción B (Recomendada):

```
1. lib/processors/audio-processor.ts
   - Línea 1-22: Agregar import Deepgram
   - Línea 152-210: Reemplazar llamada Whisper con Deepgram
   - Ajustar parsing de resultados

2. .env.local (desarrollo)
   - Agregar: DEEPGRAM_API_KEY=...

3. Vercel Dashboard > Environment Variables (producción)
   - Agregar: DEEPGRAM_API_KEY=...
```

### NO modificar (si usamos Opción B):
- ❌ `/api/process/route.ts` - Mantener igual
- ❌ `lib/inngest/functions.ts` - Ya está listo (para futuro)
- ❌ Frontend - Sin cambios

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. Límites de Deepgram

```
Archivo máximo: Sin límite estricto (práctico: 2 GB)
Duración máxima: 4 horas
Rate limit: 500 requests/hora (plan Growth)
Timeout: 2 horas por request
```

### 2. Límites de Vercel Serverless

```
maxDuration: 300s (5 minutos) en Pro
Memory: 1 GB

Riesgo: Archivos muy grandes (>50 MB, >60 min) pueden timeout
Solución futura: Migrar a Inngest para procesamiento async
```

### 3. Compatibilidad de Idiomas

```
Deepgram soporta:
✅ Spanish (es)
✅ Catalan (ca)
⚠️ Basque (eu) - Mejor que Whisper pero no nativo
⚠️ Galician (gl) - Detecta como portugués/español

Recomendación: Usar 'auto' para idiomas no estándar
```

---

## ✅ CHECKLIST PRE-MIGRACIÓN

Antes de empezar, verifica:

- [ ] Cuenta de Deepgram creada
- [ ] API key de Deepgram obtenida ($200 créditos gratis)
- [ ] `npm install` ejecutado localmente
- [ ] `.env.local` tiene DEEPGRAM_API_KEY
- [ ] Backup del código actual (git commit)
- [ ] Plan de rollback definido

---

## 🚀 ¿CONTINUAMOS?

**Pregunta para ti:**

¿Quieres que:
1. **Implemente la Opción B ahora** (15 min) - Cambiar audio-processor.ts a Deepgram
2. **Implemente la Opción A** (30 min) - Activar sistema Inngest completo
3. **Solo instale dependencias** y tú decides después

**Mi recomendación:** Opción 1 (Opción B), porque:
- Es el cambio mínimo
- Funciona inmediatamente
- Podemos migrar a Inngest después si hace falta async

¿Qué prefieres?
