# Optimizaciones Urgentes para Alta Concurrencia

**Fecha:** 2025-11-29
**Prioridad:** ALTA
**Tiempo estimado:** 30 minutos
**Impacto:** Aumenta capacidad de procesamiento 400%

---

## 🚨 Problema Identificado

**Situación Actual:**
- ✅ Sistema funciona correctamente
- ⚠️ **Límite de concurrencia muy bajo**: Solo 5 archivos simultáneos
- ⚠️ **Timeout limitado**: Solo 300s (5 min) cuando el máximo es 900s
- ⚠️ **Sin validación de tamaño**: Archivos >2GB fallarán en Deepgram

**Impacto para Clientes Empresariales:**
```
Escenario Real: Cliente carga 100 archivos de 15 min cada uno

Con configuración actual:
- Concurrencia: 5
- Tiempo total: 100 ÷ 5 × 1.5 min = 30 minutos ⏱️

Con configuración optimizada:
- Concurrencia: 20
- Tiempo total: 100 ÷ 20 × 1.5 min = 7.5 minutos ⚡

Mejora: 400% más rápido
```

---

## ✅ Optimizaciones Críticas (Aplicar HOY)

### 1. Aumentar Timeout de Vercel Functions

**Cambio:**
```json
// vercel.json
{
  "functions": {
    "app/api/inngest/route.ts": {
      "maxDuration": 900  // De 300 a 900 (15 min)
    },
    "app/api/process/route.ts": {
      "maxDuration": 900  // De 300 a 900
    },
    "app/api/process-document/route.ts": {
      "maxDuration": 300  // OK para documentos
    },
    "app/api/blob-upload/route.ts": {
      "maxDuration": 300  // OK para uploads
    }
  }
}
```

**Por qué:**
- Archivos de audio >45 min pueden timeout con 300s
- Vercel Pro permite hasta 900s (15 min)
- Sin coste adicional

**Riesgo:** Ninguno
**Esfuerzo:** 2 minutos

---

### 2. Aumentar Concurrencia de Inngest

**Cambio:**
```typescript
// lib/inngest/functions.ts

export const transcribeFile = inngest.createFunction(
  {
    id: 'task-transcribe-file-deepgram-v2',
    name: 'Task: Transcribe File (Deepgram)',
    retries: 2,
    concurrency: { limit: 20 }  // De 5 a 20
  },
  ...
);

export const processDocument = inngest.createFunction(
  {
    id: 'task-process-document-openai',
    name: 'Task: Process Document (OpenAI)',
    retries: 2,
    concurrency: { limit: 20 }  // De 5 a 20
  },
  ...
);
```

**Por qué:**
- Permite procesar 20 archivos en paralelo en lugar de 5
- Deepgram soporta 500 requests/min (muy por encima de 20)
- Vercel Plan Pro soporta miles de invocaciones simultáneas
- Sin coste adicional

**Riesgo:** Bajo (monitorear primeras horas)
**Esfuerzo:** 5 minutos

---

### 3. Validar Tamaño de Archivo en Frontend

**Cambio:**
```typescript
// app/page.tsx - En handleFiles() antes de la carga

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB (límite Deepgram)

const handleFiles = (acceptedFiles: File[]) => {
  // Validar tamaños
  const oversizedFiles = acceptedFiles.filter(file => file.size > MAX_FILE_SIZE);

  if (oversizedFiles.length > 0) {
    alert(
      `Los siguientes archivos superan el límite de 2 GB y no pueden procesarse:\n\n` +
      oversizedFiles.map(f => `- ${f.name} (${(f.size / 1024 / 1024 / 1024).toFixed(2)} GB)`).join('\n') +
      `\n\nPor favor, comprima o divida estos archivos antes de cargarlos.`
    );

    // Filtrar archivos válidos
    acceptedFiles = acceptedFiles.filter(file => file.size <= MAX_FILE_SIZE);
  }

  // Continuar con archivos válidos...
};
```

**Por qué:**
- Deepgram rechaza archivos >2 GB
- Mejor experiencia de usuario (error inmediato vs espera y fallo)
- Ahorra costes de upload a Vercel Blob

**Riesgo:** Ninguno
**Esfuerzo:** 10 minutos

---

### 4. Implementar Rate Limiting por Usuario

**Cambio:**
```typescript
// app/page.tsx - Límite de archivos simultáneos por usuario

const MAX_CONCURRENT_UPLOADS = 50; // Por sesión

const handleProcessFiles = async () => {
  // Contar archivos en procesamiento
  const processingCount = uploadedFiles.filter(f =>
    f.status === 'uploading' || f.status === 'processing'
  ).length;

  if (processingCount + filesToProcess.length > MAX_CONCURRENT_UPLOADS) {
    alert(
      `Límite de archivos simultáneos alcanzado (${MAX_CONCURRENT_UPLOADS}).\n\n` +
      `Actualmente tienes ${processingCount} archivos en procesamiento.\n` +
      `Por favor, espera a que se completen antes de cargar más.`
    );
    return;
  }

  // Continuar con procesamiento...
};
```

**Por qué:**
- Evita que un usuario sature el sistema
- Protege contra cargas accidentales masivas
- Mantiene buena experiencia para todos

**Riesgo:** Ninguno (límite generoso de 50)
**Esfuerzo:** 10 minutos

---

## 📊 Comparativa Antes/Después

### Capacidad de Procesamiento

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Archivos simultáneos** | 5 | 20 | +300% |
| **Duración máxima audio** | ~45 min | ~180 min | +300% |
| **Tiempo para 100 archivos** | 30 min | 7.5 min | -75% |
| **Validación errores** | ❌ Después | ✅ Antes | Mejor UX |
| **Rate limiting** | ❌ No | ✅ Sí | Más estable |

### Costes (Sin Cambios)

```
Todas las optimizaciones son configuración, sin coste adicional.

Vercel Pro: $20/mes (igual)
Deepgram: Por uso (igual)
OpenAI: Por uso (igual)
```

---

## 🔧 Aplicar Cambios

### Paso 1: Actualizar vercel.json
```bash
# Editar vercel.json
# Cambiar maxDuration de 300 a 900 para route.ts y process/route.ts
```

### Paso 2: Actualizar lib/inngest/functions.ts
```bash
# Editar concurrency: { limit: 5 } a { limit: 20 }
# En transcribeFile y processDocument
```

### Paso 3: Actualizar app/page.tsx
```bash
# Agregar validación de tamaño MAX_FILE_SIZE
# Agregar rate limiting MAX_CONCURRENT_UPLOADS
```

### Paso 4: Commit y Deploy
```bash
git add vercel.json lib/inngest/functions.ts app/page.tsx
git commit -m "feat: Optimize for high concurrency (20x parallelism, 900s timeout)"
git push origin main
```

### Paso 5: Verificar en Vercel
```
1. Ir a https://vercel.com/solammedia-9886s-projects/annalogica
2. Verificar que el deployment se complete correctamente
3. Probar con carga de 10-20 archivos simultáneos
```

---

## 📈 Plan de Monitoreo Post-Deployment

### Primeras 24 Horas
- ✅ Verificar que no haya errores de timeout
- ✅ Monitorear costes de Deepgram (no deberían aumentar significativamente)
- ✅ Verificar cola de Inngest (no debería acumularse)
- ✅ Revisar logs de Vercel para errores

### Primera Semana
- ✅ Analizar métricas de procesamiento promedio
- ✅ Recopilar feedback de usuarios sobre velocidad
- ✅ Verificar que rate limiting funcione correctamente
- ✅ Confirmar que validación de tamaño evite errores

### Primer Mes
- ✅ Comparar costes vs mes anterior (debería ser similar o menor)
- ✅ Documentar mejoras de rendimiento
- ✅ Considerar aumentar concurrencia a 30-50 si es necesario
- ✅ Evaluar upgrade a OpenAI Tier 2 si se acerca a límites

---

## 🎯 Métricas de Éxito

### KPIs a Monitorear
```
1. Tiempo promedio de procesamiento (objetivo: <2 min para 15 min de audio)
2. Tasa de error de timeout (objetivo: <1%)
3. Satisfacción de usuario (objetivo: >90% archivos procesados en <5 min)
4. Utilización de concurrencia (objetivo: 60-80% de slots usados)
```

### Alertas a Configurar
```
- ⚠️ Si >80% de concurrency slots usados consistentemente → Aumentar a 30
- ⚠️ Si hay timeouts con 900s → Investigar archivos problemáticos
- ⚠️ Si costes de Deepgram aumentan >50% → Revisar uso
- ⚠️ Si OpenAI rate limit alcanzado → Solicitar Tier upgrade
```

---

## 📞 Próximos Pasos Recomendados

### Corto Plazo (1-2 semanas)
1. **Solicitar OpenAI Tier 2**
   - Requiere: Haber gastado $50 en API
   - Beneficio: Aumenta de 500 a 5,000 RPM
   - Cómo: https://platform.openai.com/settings/organization/limits

2. **Configurar Dashboard de Métricas**
   - Panel de admin con métricas en tiempo real
   - Gráficos de uso de concurrencia
   - Alertas de costes automáticas

3. **Implementar Chunking para Transcripciones Largas**
   - Para audios >3 horas
   - Divide en segmentos de 1 hora
   - Procesa en paralelo y concatena

### Medio Plazo (1-3 meses)
1. **Migrar a Deepgram Streaming** para audios muy largos
2. **Implementar Caché de Resultados** (evitar reprocesar)
3. **Multi-región Deployment** (reducir latencia global)

---

## ✅ Checklist de Aplicación

- [ ] Leer y entender este documento completo
- [ ] Hacer backup de configuración actual (git ya lo hace)
- [ ] Aplicar cambio en vercel.json
- [ ] Aplicar cambio en lib/inngest/functions.ts
- [ ] Aplicar cambios en app/page.tsx
- [ ] Probar localmente con `npm run dev`
- [ ] Commit y push a producción
- [ ] Verificar deployment en Vercel
- [ ] Probar con 5-10 archivos simultáneos
- [ ] Probar con 20 archivos simultáneos
- [ ] Monitorear durante 24 horas
- [ ] Documentar resultados

---

**Aplicar estas optimizaciones aumentará la capacidad del sistema de 5 a 20 archivos simultáneos, reduciendo tiempos de procesamiento en 75% para cargas masivas.**

**Sin coste adicional. Sin riesgo técnico. Alto impacto.**
