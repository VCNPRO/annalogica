# Análisis de Rendimiento y Límites - Annalogica

**Fecha:** 2025-11-29
**Versión:** 1.0
**Para:** Clientes empresariales, instituciones y administraciones públicas
**Entorno:** Producción en Vercel Pro + Deepgram + OpenAI

---

## 📊 Resumen Ejecutivo

Annalogica está configurada para **alta concurrencia empresarial** con los siguientes límites operacionales:

### Límites por Archivo Individual
| Tipo | Tamaño Máximo | Duración Máxima | Tiempo Procesamiento |
|------|---------------|-----------------|---------------------|
| **Audio** | 5 GB | ∞ (ilimitado) | ~0.1x duración real |
| **Video** | 5 GB | ∞ (ilimitado) | ~0.1x duración real |
| **PDF** | 5 GB | N/A | 5-30 segundos |
| **DOCX** | 5 GB | N/A | 3-20 segundos |
| **TXT** | 5 GB | N/A | 1-5 segundos |

### Límites de Concurrencia
- **Procesamiento simultáneo**: 5 archivos en paralelo (audio/video)
- **Procesamiento simultáneo**: 5 documentos en paralelo (PDF/DOCX)
- **Carga de archivos**: Ilimitada (solo limitada por Vercel Blob)

---

## 🏗️ Infraestructura Actual

### 1. Vercel (Plan Pro)
**Características:**
- ✅ Functions timeout: **300 segundos (5 min)** configurados
- ✅ Máximo disponible: **900 segundos (15 min)** en plan Pro
- ✅ Región: Multi-región global con edge network
- ✅ Escalado: Automático e ilimitado

**Límites:**
```
Plan Pro:
- 1,000 GB-Hrs de ejecución/mes
- 1M invocaciones serverless/mes
- Sin límite de bandwidth
```

**Recomendación para alta concurrencia:**
- ✅ Actualmente configurado para 5 min (suficiente para la mayoría de archivos)
- ⚠️ Para audios >60 min, considerar aumentar a 900s en vercel.json

### 2. Vercel Blob Storage
**Características:**
- ✅ Tamaño máximo por archivo: **5 GB**
- ✅ Almacenamiento total: **1 TB**
- ✅ Operaciones PUT: **1M/mes**

**Política de retención (configurada):**
- ✅ Archivos originales eliminados tras procesamiento
- ✅ Resultados (TXT, SRT, VTT, Summary) retenidos 30 días
- ✅ Limpieza automática diaria (9:00 AM UTC)

**Consumo estimado:**
```
Escenario: 1000 archivos/día
- Audio promedio: 50 MB × 1000 = 50 GB temporales
- Resultados: ~5 MB × 1000 = 5 GB/día × 30 días = 150 GB
- Total: ~200 GB/mes (bien dentro del límite de 1TB)
```

### 3. Inngest (Procesamiento Asíncrono)
**Configuración actual:**
```typescript
transcribeFile: {
  concurrency: { limit: 5 },  // 5 trabajos simultáneos
  retries: 2
}

processDocument: {
  concurrency: { limit: 5 },   // 5 trabajos simultáneos
  retries: 2
}

summarizeFile: {
  retries: 3
}
```

**Límites efectivos:**
- ✅ **5 transcripciones de audio/video** en paralelo
- ✅ **5 procesamientos de documentos** en paralelo
- ✅ Cola ilimitada (archivos adicionales esperan su turno)

**Rendimiento esperado:**
| Escenario | Archivos | Duración Promedio | Tiempo Total |
|-----------|----------|-------------------|--------------|
| Baja carga | 10 audio | 15 min cada uno | ~30 min |
| Media carga | 50 audio | 15 min cada uno | ~2.5 horas |
| Alta carga | 200 audio | 15 min cada uno | ~10 horas |
| Pico extremo | 1000 audio | 15 min cada uno | ~50 horas |

### 4. Deepgram (Transcripción)
**Modelo:** Nova-3 (última generación)

**Características:**
- ✅ Precisión: ~95% en español/inglés
- ✅ Velocidad: **~0.1x** (10 min de audio = 1 min de procesamiento)
- ✅ Diarización: Identifica múltiples hablantes
- ✅ Formato: Smart formatting automático

**Límites:**
```
Deepgram Pay-as-you-go:
- Tamaño archivo: 2 GB máximo por archivo
- Duración: Sin límite
- Rate limit: 500 peticiones/min
- Concurrencia: Ilimitada (según plan)
```

**Coste estimado:**
```
Nova-3: $0.0043/minuto
- Audio 10 min: $0.043
- Audio 60 min: $0.258
- Audio 120 min: $0.516

Escenario empresarial (1000 archivos/mes, 15 min promedio):
1000 × 15 min × $0.0043 = $64.50/mes
```

### 5. OpenAI (Resúmenes, Tags, Speakers)
**Modelo:** GPT-4o-mini

**Características:**
- ✅ Contexto: 128K tokens (~384K caracteres)
- ✅ Velocidad: ~1000 tokens/segundo
- ✅ Multiidioma: Español, inglés, catalán, etc.

**Límites según Tier:**
```
Tier 1 (cuenta nueva):
- 500 RPM (requests/min)
- 30,000 TPM (tokens/min)
- $100/mes límite de gasto

Tier 2 (después de $50 gastados):
- 5,000 RPM
- 450,000 TPM
- $500/mes límite de gasto

Tier 5 (empresarial):
- 10,000 RPM
- 10,000,000 TPM
- Sin límite de gasto
```

**Coste estimado:**
```
GPT-4o-mini:
- Input: $0.15/1M tokens
- Output: $0.60/1M tokens

Resumen típico (transcripción 15 min = ~10K palabras):
- Input: 40K tokens = $0.006
- Output: 500 tokens = $0.0003
- Total: ~$0.0063 por resumen

Escenario empresarial (1000 archivos/mes):
1000 × $0.0063 = $6.30/mes
```

---

## 🧪 Plan de Pruebas Recomendado

### Fase 1: Archivos Individuales (Validación Funcional)

#### Audio
| Test | Duración | Tamaño | Formato | Objetivo |
|------|----------|--------|---------|----------|
| A1 | 1 min | 1 MB | MP3 | Validar flujo básico |
| A2 | 5 min | 5 MB | WAV | Validar calidad alta |
| A3 | 15 min | 15 MB | M4A | Validar duración media |
| A4 | 30 min | 30 MB | MP3 | Validar duración estándar |
| A5 | 60 min | 60 MB | MP3 | Validar duración larga |
| A6 | 120 min | 120 MB | MP3 | Validar límite superior |
| A7 | 180 min | 180 MB | MP3 | Prueba de estrés duración |

#### Video
| Test | Duración | Tamaño | Formato | Objetivo |
|------|----------|--------|---------|----------|
| V1 | 1 min | 10 MB | MP4 | Validar extracción audio |
| V2 | 5 min | 50 MB | MOV | Validar formato Apple |
| V3 | 15 min | 200 MB | MP4 1080p | Validar HD |
| V4 | 30 min | 500 MB | MP4 | Validar tamaño medio |
| V5 | 60 min | 1 GB | MP4 | Validar archivos grandes |
| V6 | 120 min | 2 GB | MP4 | Prueba de estrés |

#### Documentos
| Test | Páginas | Tamaño | Formato | Objetivo |
|------|---------|--------|---------|----------|
| D1 | 1 | 100 KB | PDF | Validar básico |
| D2 | 10 | 1 MB | PDF | Validar medio |
| D3 | 50 | 5 MB | PDF | Validar grande |
| D4 | 100 | 10 MB | PDF | Validar muy grande |
| D5 | 500 | 50 MB | PDF | Prueba de estrés |
| D6 | 10 | 500 KB | DOCX | Validar Word |
| D7 | 1 | 10 KB | TXT | Validar texto plano |

### Fase 2: Concurrencia (Validación de Carga)

#### Escenario 1: Carga Baja (5 archivos simultáneos)
```
5 archivos de audio de 15 min cada uno
- Esperado: Todos procesados en paralelo
- Tiempo: ~1.5 min (0.1x)
- Estado: ✅ Dentro de límites
```

#### Escenario 2: Carga Media (25 archivos simultáneos)
```
25 archivos de audio de 15 min cada uno
- Esperado: 5 en paralelo, 5 tandas
- Tiempo: ~7.5 min (5 × 1.5 min)
- Estado: ✅ Dentro de límites
```

#### Escenario 3: Carga Alta (100 archivos simultáneos)
```
100 archivos de audio de 15 min cada uno
- Esperado: 5 en paralelo, 20 tandas
- Tiempo: ~30 min (20 × 1.5 min)
- Estado: ✅ Dentro de límites
```

#### Escenario 4: Carga Extrema (500 archivos simultáneos)
```
500 archivos de audio de 15 min cada uno
- Esperado: 5 en paralelo, 100 tandas
- Tiempo: ~2.5 horas (100 × 1.5 min)
- Estado: ⚠️ Verificar rate limits de Deepgram
```

### Fase 3: Tipos Mixtos (Validación Real)

#### Escenario Empresa Típica
```
Carga simultánea:
- 10 audios (15 min cada uno)
- 5 videos (30 min cada uno)
- 20 PDFs (10 páginas cada uno)

Pipeline esperado:
1. PDFs procesados en ~1 min (5 en paralelo, 4 tandas)
2. Audios procesados en ~3 min (5 en paralelo, 2 tandas)
3. Videos procesados en ~6 min (5 en paralelo, 1 tanda)

Tiempo total: ~6 min
Estado: ✅ Excelente para uso empresarial
```

---

## ⚠️ Límites y Restricciones Identificados

### Límites Técnicos (Hard Limits)
1. **Tamaño de archivo**: 5 GB (Vercel Blob)
2. **Deepgram**: 2 GB por archivo (si audio >2GB, fallará)
3. **Function timeout**: 300s actual, 900s máximo
4. **Concurrencia Inngest**: 5 trabajos simultáneos

### Límites de Costes (Soft Limits)
1. **Deepgram**: Sin límite de facturación (pay-as-you-go)
2. **OpenAI**:
   - Tier 1: $100/mes
   - Tier 2: $500/mes
   - Tier 5: Ilimitado
3. **Vercel**: 1,000 GB-Hrs/mes (Plan Pro)

### Límites de Rate (API)
1. **Deepgram**: 500 requests/min
2. **OpenAI Tier 1**: 500 requests/min, 30K tokens/min
3. **OpenAI Tier 2**: 5,000 requests/min, 450K tokens/min

---

## 💡 Recomendaciones para Alta Concurrencia

### Inmediatas (Ya Implementadas)
- ✅ Concurrencia de 5 trabajos (Inngest)
- ✅ Reintentos automáticos (2-3 retries)
- ✅ Eliminación de archivos originales
- ✅ Limpieza automática de archivos antiguos

### Corto Plazo (1-2 semanas)
1. **Aumentar timeout de functions a 900s** para audios largos
   ```json
   // vercel.json
   "functions": {
     "app/api/inngest/route.ts": {
       "maxDuration": 900  // De 300 a 900
     }
   }
   ```

2. **Aumentar concurrencia de Inngest a 10-20** para picos de carga
   ```typescript
   concurrency: { limit: 20 }  // De 5 a 20
   ```

3. **Implementar rate limiting en frontend** para evitar sobrecargas
   ```typescript
   // Límite sugerido: 50 archivos/usuario/hora
   ```

### Medio Plazo (1-3 meses)
1. **Migrar a Deepgram streaming** para audios >60 min
   - Reduce latencia
   - Permite progreso en tiempo real
   - Sin límite de duración

2. **Implementar queue prioritization** en Inngest
   - Clientes VIP primero
   - Archivos pequeños primero
   - Procesamiento nocturno para grandes

3. **Solicitar Tier 2+ de OpenAI** anticipadamente
   - Requiere haber gastado $50 primero
   - Aumenta límites de 500 a 5,000 RPM

4. **CDN para resultados** (opcional)
   - Cloudflare R2 para archivos >30 días
   - Reduce costes de Vercel Blob

### Largo Plazo (3-6 meses)
1. **Considerar Vercel Enterprise** si superan:
   - 1,000 GB-Hrs/mes
   - 100M requests/mes
   - Necesitan SLA garantizado

2. **Implementar caché de resultados**
   - Redis para metadatos
   - Evita reprocesar archivos duplicados

3. **Multi-región deployment**
   - Europa (Frankfurt/Amsterdam)
   - América (Virginia/São Paulo)
   - Reduce latencia global

---

## 📈 Capacidad Estimada por Escenario

### Escenario 1: Startup (0-100 archivos/día)
```
Infraestructura actual: ✅ Perfecta
Coste mensual estimado:
- Vercel Pro: $20/mes
- Deepgram: ~$200/mes (100 archivos × 15 min × 30 días)
- OpenAI: ~$20/mes
- Total: ~$240/mes
```

### Escenario 2: Empresa Mediana (100-500 archivos/día)
```
Infraestructura actual: ✅ Adecuada (con ajustes recomendados)
Ajustes necesarios:
- ✅ Aumentar concurrency a 20
- ✅ Aumentar maxDuration a 900s
- ✅ Solicitar OpenAI Tier 2

Coste mensual estimado:
- Vercel Pro: $20/mes
- Deepgram: ~$1,000/mes (500 archivos × 15 min × 30 días)
- OpenAI: ~$100/mes
- Total: ~$1,120/mes
```

### Escenario 3: Empresa Grande (500-2000 archivos/día)
```
Infraestructura actual: ⚠️ Requiere upgrades
Ajustes necesarios:
- ✅ Aumentar concurrency a 50
- ✅ Vercel Enterprise (SLA + soporte)
- ✅ OpenAI Tier 4-5
- ✅ Implementar CDN

Coste mensual estimado:
- Vercel Enterprise: ~$500/mes
- Deepgram: ~$4,000/mes (2000 archivos × 15 min × 30 días)
- OpenAI: ~$400/mes
- Total: ~$4,900/mes
```

### Escenario 4: Administración Pública (volumen variable)
```
Características:
- Picos de carga irregulares
- Audios muy largos (sesiones parlamentarias de 3-6 horas)
- Requisitos de seguridad y auditoría

Infraestructura actual: ⚠️ Requiere configuración específica
Ajustes necesarios:
- ✅ maxDuration: 900s
- ✅ concurrency: 10 (evitar saturación)
- ✅ Priority queue para archivos urgentes
- ✅ Backup y retención extendida (90 días)

Coste mensual estimado:
- Vercel Pro/Enterprise: $20-500/mes
- Deepgram: Variable ($500-2000/mes)
- OpenAI: Variable ($50-200/mes)
- Total: ~$570-2,700/mes
```

---

## 🎯 Puntos de Fallo Potenciales

### Críticos (Requieren Atención Inmediata)
1. ⚠️ **Archivos de audio >2GB**: Deepgram rechazará
   - **Solución**: Validar tamaño antes de subir
   - **Implementar**: Frontend warning

2. ⚠️ **Transcripciones >128K tokens**: OpenAI truncará para resúmenes
   - **Solución**: Implementar chunking para textos largos
   - **Estado**: Pendiente

3. ⚠️ **Rate limit OpenAI Tier 1**: 500 RPM puede saturarse con >500 archivos/hora
   - **Solución**: Solicitar upgrade a Tier 2
   - **Estado**: Pendiente

### Moderados (Monitorear)
1. ⚙️ **Concurrencia de 5**: Puede crear colas largas en picos
   - **Solución**: Aumentar a 10-20 según demanda
   - **Estado**: Fácil de ajustar

2. ⚙️ **Timeout de 300s**: Puede fallar con audios >45 min
   - **Solución**: Aumentar a 900s
   - **Estado**: Fácil de ajustar

3. ⚙️ **Almacenamiento Blob 1TB**: Puede llenarse con >10K archivos/mes
   - **Solución**: Limpieza automática ya configurada
   - **Estado**: ✅ Implementado

### Bajos (No Urgentes)
1. 💡 **Latencia global**: Usuarios fuera de US pueden tener delays
   - **Solución**: Multi-región deployment
   - **Estado**: Optimización futura

2. 💡 **Duplicados**: No hay detección de archivos repetidos
   - **Solución**: Implementar hashing y caché
   - **Estado**: Feature futuro

---

## ✅ Checklist de Preparación para Alta Concurrencia

### Pre-Lanzamiento
- [x] ✅ Configurar concurrencia Inngest (actual: 5)
- [x] ✅ Configurar timeouts Vercel (actual: 300s)
- [x] ✅ Configurar limpieza automática Blob
- [x] ✅ Configurar retries en procesamiento
- [ ] ⏳ Aumentar timeout a 900s
- [ ] ⏳ Aumentar concurrencia a 10-20
- [ ] ⏳ Implementar validación de tamaño de archivo
- [ ] ⏳ Solicitar OpenAI Tier 2+
- [ ] ⏳ Implementar rate limiting en frontend

### Monitoreo
- [ ] ⏳ Configurar alertas de coste (Vercel + Deepgram + OpenAI)
- [x] ✅ Sistema de alertas admin (ya implementado)
- [ ] ⏳ Dashboard de métricas en tiempo real
- [ ] ⏳ Logs centralizados (Sentry ya configurado)
- [ ] ⏳ Notificaciones de errores críticos

### Documentación
- [x] ✅ Guía de usuario (ya generada)
- [x] ✅ Documentación admin (ADMIN-DASHBOARD.md)
- [x] ✅ Este análisis de rendimiento
- [ ] ⏳ Guía de escalado para DevOps
- [ ] ⏳ Runbook de incidentes

---

## 📞 Contactos y Soporte

### Proveedores
- **Vercel Support**: https://vercel.com/support (Plan Pro incluye soporte)
- **Deepgram Support**: support@deepgram.com
- **OpenAI Support**: https://help.openai.com

### Límites de Soporte según Plan
```
Vercel Pro:
- Email support
- 24-48h response time

Vercel Enterprise:
- Priority support
- Dedicated Slack channel
- <4h response time SLA
```

---

## 🔄 Actualización y Mantenimiento

**Este documento debe revisarse:**
- ✅ Antes de cada upgrade de plan
- ✅ Mensualmente (revisar costes y uso)
- ✅ Después de cada pico de carga inesperado
- ✅ Cuando se agreguen nuevas features

**Última actualización:** 2025-11-29
**Próxima revisión programada:** 2025-12-29
**Responsable:** Equipo DevOps / Admin
