# 🚀 Batch Polling - Instrucciones de Implementación

## ✅ Ya Implementado

1. **Endpoint de batch status**: `app/api/jobs/batch-status/route.ts`
2. **Hook personalizado**: `hooks/useJobBatchPolling.ts`
3. **Índices de BD optimizados**: Ya aplicados ✅

## 📝 Cómo Usar en el Dashboard

### Opción 1: Reemplazar polling actual en `app/page.tsx`

Encuentra este código (líneas ~150-260):

```typescript
// ❌ CÓDIGO ANTIGUO (individual polling)
useEffect(() => {
  const activeJobs = uploadedFiles.filter(
    f => f.jobId && (f.status === 'pending' || f.status === 'processing')
  );

  if (activeJobs.length === 0) return;

  const pollJobs = async () => {
    for (const file of activeJobs) {
      try {
        const res = await fetch(`/api/jobs/${file.jobId}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        // ... actualizar estado
      } catch (err) {
        console.error('[Polling] Error:', err);
      }
    }
  };

  pollJobs();
  const interval = setInterval(pollJobs, 5000);

  return () => clearInterval(interval);
}, [uploadedFiles]);
```

Reemplázalo con:

```typescript
// ✅ CÓDIGO NUEVO (batch polling optimizado)
import { useJobBatchPollingAuto } from '@/hooks/useJobBatchPolling';

// Dentro del componente Dashboard:
const activeJobs = uploadedFiles.filter(
  f => f.jobId && (f.status === 'pending' || f.status === 'processing')
);

const activeJobIds = activeJobs.map(f => f.jobId).filter(Boolean) as string[];

useJobBatchPollingAuto(
  activeJobIds,
  (updatedJobs) => {
    // Actualizar estado con jobs actualizados
    setUploadedFiles(prev => {
      const jobsMap = new Map(updatedJobs.map((j: any) => [j.id, j]));
      return prev.map(file => {
        if (!file.jobId) return file;
        const updatedJob = jobsMap.get(file.jobId);
        if (!updatedJob) return file;

        return {
          ...file,
          status: updatedJob.status,
          processing_progress: updatedJob.processing_progress,
          txt_url: updatedJob.txt_url,
          srt_url: updatedJob.srt_url,
          vtt_url: updatedJob.vtt_url,
          summary_url: updatedJob.summary_url,
          speakers_url: updatedJob.speakers_url,
          pdf_url: updatedJob.pdf_url,
          error_message: updatedJob.error_message
        };
      });
    });
  },
  {
    processingInterval: 3000, // 3s para jobs activos
    idleInterval: 10000,      // 10s cuando no hay jobs
    onError: (error) => {
      console.error('[BatchPolling] Error:', error);
      // Opcional: mostrar toast de error
    }
  }
);
```

### Opción 2: Uso Manual (con control)

```typescript
import { useJobBatchPolling } from '@/hooks/useJobBatchPolling';

const { startPolling, stopPolling } = useJobBatchPolling(
  activeJobIds,
  (updatedJobs) => {
    // Tu lógica de actualización
    updateJobsInState(updatedJobs);
  }
);

// Iniciar manualmente
useEffect(() => {
  if (shouldStartPolling) {
    startPolling();
  }
  return () => stopPolling();
}, [shouldStartPolling]);
```

## 📊 Beneficios Esperados

### Antes (Polling Individual)
- **Requests/minuto**: 120 (10 jobs × 12 polls/min)
- **Latencia total**: 1000ms (100ms × 10 jobs)
- **Function executions**: 7,200/hora
- **Costo estimado**: ~$100/mes

### Después (Batch Polling)
- **Requests/minuto**: 12 (1 batch × 12 polls/min)
- **Latencia total**: 150ms
- **Function executions**: 720/hora
- **Costo estimado**: ~$10/mes

### Ahorro Total
- ✅ **-90% requests** (120 → 12)
- ✅ **-85% latencia** (1000ms → 150ms)
- ✅ **-90% function costs** ($100 → $10/mes)
- ✅ **Mejor UX** (updates más rápidos)

## 🧪 Testing

1. **Verificar que el endpoint funciona**:
```bash
curl -X POST http://localhost:3000/api/jobs/batch-status \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{"jobIds": ["job1", "job2"]}'
```

2. **Verificar en DevTools**:
- Abrir Network tab
- Filtrar por "batch-status"
- Verificar que solo hay 1 request cada 3-10 segundos
- Verificar que el payload incluye todos los jobIds

3. **Verificar performance**:
```typescript
// Agregar console.time en el hook
console.time('[BatchPolling] Request time');
const res = await fetch('/api/jobs/batch-status', ...);
console.timeEnd('[BatchPolling] Request time');
// Debe mostrar <200ms
```

## 🔧 Troubleshooting

### Error: "jobIds debe ser un array"
- Verificar que estás enviando `{ jobIds: [...] }` en el body

### Error: "Máximo 50 jobs por request"
- Dividir en múltiples batches si tienes >50 jobs activos

### Polling no se detiene
- Verificar que el hook está en un useEffect con cleanup
- Verificar que `stopPolling()` se llama en el return

### Jobs no se actualizan
- Verificar que `onUpdate` actualiza el estado correctamente
- Verificar que los jobIds son válidos y existen en BD
- Verificar autenticación (cookie auth-token)

## 📈 Próximos Pasos (Opcional)

### 1. Agregar Server-Sent Events (SSE)
Para updates en tiempo real sin polling:

```typescript
// app/api/jobs/[jobId]/stream/route.ts
export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      // Enviar updates cuando cambien
      // controller.enqueue(...)
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

### 2. Agregar caché con Redis
Para reducir queries a BD:

```typescript
import { kv } from '@vercel/kv';

// Cachear status por 5 segundos
const cached = await kv.get(`job:${jobId}:status`);
if (cached) return cached;

const job = await TranscriptionJobDB.findById(jobId);
await kv.set(`job:${jobId}:status`, job, { ex: 5 });
```

### 3. Implementar WebSockets
Para updates bidireccionales en tiempo real.

---

**Creado**: 2025-12-06
**Versión**: 1.0
**Estado**: ✅ Listo para implementar
