# 💰 ANÁLISIS DETALLADO DE COSTES - ANNALOGICA

## 📊 RESUMEN EJECUTIVO

**Coste por transcripción típica (audio 30 min):**
- Storage: $0.007
- Transcripción Whisper: $0.014
- Resumen Claude: $0.02
- Bandwidth (3 descargas): $0.015
- **TOTAL: ~$0.056 USD** (5.6 centavos)

---

## 1️⃣ VERCEL BLOB STORAGE

### Costes base:
| Concepto | Precio | Incluido Gratis |
|----------|--------|-----------------|
| **Storage** | $0.023/GB-mes | 1 GB (Hobby) / 100 GB (Pro) |
| **Bandwidth** | $0.05/GB | 100 GB/mes (Hobby) / 1 TB (Pro) |
| **Operaciones** | $0.40/millón ops | 100K ops/mes |

### Ejemplos reales:

**Archivo de audio (100 MB):**
- Upload: 1 operación = $0.0000004
- Storage 1 mes: 0.1 GB × $0.023 = **$0.0023**
- Download (1 vez): 0.1 GB × $0.05 = **$0.005**

**Archivo de video HD (500 MB):**
- Upload: 1 operación = $0.0000004
- Storage 1 mes: 0.5 GB × $0.023 = **$0.0115**
- Download (1 vez): 0.5 GB × $0.05 = **$0.025**

**Transcripción completa (audio 100MB + TXT + SRT + Summary):**
- Storage: ~105 MB = **$0.0024/mes**
- 3 descargas (TXT, SRT, PDF): 0.3 MB × $0.05 = **$0.015**

### Proyección mensual (100 usuarios activos):

| Escenario | Archivos/mes | Storage usado | Coste Storage | Coste Bandwidth | **Total** |
|-----------|-------------|---------------|---------------|-----------------|-----------|
| Beta (100 users, 2 archivos/user) | 200 archivos (20 GB) | 20 GB | $0.46 | $10 (200 GB down) | **$10.46** |
| Producción (500 users, 5 archivos/user) | 2,500 archivos (250 GB) | 250 GB | $5.75 | $62.50 (1.25 TB down) | **$68.25** |

---

## 2️⃣ REPLICATE (WHISPER TRANSCRIPTION)

### Costes por predicción:
- **~$0.00046 por ejecución** (audio cualquier duración)
- Hardware: Nvidia T4 GPU
- Tiempo: ~3-30 segundos para completar

### ⚠️ IMPORTANTE:
Replicate cobra **por ejecución**, NO por minuto de audio. El coste es **fijo** independientemente de si transcribes 1 minuto o 2 horas.

### Ejemplos reales:

| Duración audio | Coste Whisper | Coste/minuto |
|----------------|---------------|--------------|
| 5 minutos | $0.00046 | $0.000092 |
| 30 minutos | $0.00046 | $0.000015 |
| 1 hora (60 min) | $0.00046 | $0.0000077 |
| 2 horas (120 min) | $0.00046 | $0.0000038 |

**Conclusión:** Whisper es **extremadamente barato** en Replicate. Incluso con 10,000 transcripciones/mes = **$4.60 USD**

### Proyección mensual:

| Usuarios | Transcripciones/mes | Coste Total Whisper |
|----------|---------------------|---------------------|
| 100 | 200 | **$0.092** |
| 500 | 2,500 | **$1.15** |
| 5,000 | 25,000 | **$11.50** |

---

## 3️⃣ ANTHROPIC CLAUDE API (RESÚMENES)

### Precios actuales (2025):

| Modelo | Input ($/1M tokens) | Output ($/1M tokens) | Uso Annalogica |
|--------|---------------------|----------------------|----------------|
| **Claude Sonnet 4.5** | $3 | $15 | ✅ Actual |
| Claude Haiku 3.5 | $0.80 | $4 | Alternativa barata |
| Claude Opus 4.1 | $15 | $75 | Overkill |

### Cálculo para resúmenes:

**Transcripción típica (30 min audio = ~4,500 palabras = ~6,000 tokens):**
- Input: 6,000 tokens × $3 / 1M = **$0.018**
- Output (resumen 300 palabras = ~400 tokens): 400 × $15 / 1M = **$0.006**
- **Total por resumen: $0.024**

**Transcripción larga (2 horas = ~18,000 palabras = ~24,000 tokens):**
- Input: 24,000 × $3 / 1M = **$0.072**
- Output: 600 tokens × $15 / 1M = **$0.009**
- **Total: $0.081**

### 💡 Optimización con Haiku:
- Mismo resumen con **Claude Haiku 3.5:**
- Input: 6,000 × $0.80 / 1M = **$0.0048**
- Output: 400 × $4 / 1M = **$0.0016**
- **Total: $0.0064** (73% más barato)

### Proyección mensual:

| Usuarios | Resúmenes/mes | Coste Sonnet 4.5 | Coste Haiku 3.5 |
|----------|---------------|------------------|-----------------|
| 100 | 200 | **$4.80** | **$1.28** |
| 500 | 2,500 | **$60** | **$16** |
| 5,000 | 25,000 | **$600** | **$160** |

---

## 4️⃣ VERCEL SERVERLESS FUNCTIONS

### Límites y costes:

| Plan | Ejecuciones gratis | Coste adicional | Duración máx | GB-Hours incluidos |
|------|-------------------|-----------------|--------------|-------------------|
| **Hobby** | 100,000/mes | N/A (sin upgrade) | 10s | 100 |
| **Pro** | 1,000,000/mes | $0.40/millón | 60s (300s config) | 1,000 |

### Uso en Annalogica:
- `/api/auth/login`: ~50ms ejecución
- `/api/process`: ~5-30s (espera Whisper + Claude)
- `/api/files`: ~200ms

**Proyección beta (100 users):**
- ~10,000 ejecuciones/mes
- Todas dentro del tier gratuito ✅

---

## 📈 COSTE TOTAL POR USUARIO

### Usuario típico (2 archivos/mes, 30 min cada uno):

| Componente | Coste unitario | Cantidad | Total |
|------------|---------------|----------|-------|
| Upload archivos (100 MB c/u) | $0.0023 storage | 2 | $0.0046 |
| Transcripción Whisper | $0.00046 | 2 | $0.00092 |
| Resumen Claude Sonnet | $0.024 | 2 | $0.048 |
| Bandwidth (3 descargas/archivo) | $0.015 | 2 | $0.030 |
| **TOTAL POR USUARIO/MES** | | | **$0.083** |

### Proyección según escala:

| Escenario | Usuarios | Coste mensual | Coste/usuario |
|-----------|----------|---------------|---------------|
| **Beta** | 100 | **$8.30** | $0.083 |
| **Lanzamiento** | 500 | **$41.50** | $0.083 |
| **Crecimiento** | 2,000 | **$166** | $0.083 |
| **Scale** | 10,000 | **$830** | $0.083 |

---

## 🎯 OPTIMIZACIONES RECOMENDADAS

### 1. Cambiar a Claude Haiku para resúmenes:
- **Ahorro: 73%** en costes de IA
- Coste usuario: $0.083 → **$0.053** (-36% total)

### 2. Limitar descargas:
- Cachear PDFs/TXT generados
- Usar URLs firmadas con expiración
- **Ahorro potencial: 40%** en bandwidth

### 3. Comprimir archivos:
- Audio: Convertir WAV → MP3 (reducción 90%)
- Video: Reducir bitrate antes de storage
- **Ahorro storage: 60-80%**

### 4. Tier gratuito hasta 120 usuarios:
Con optimizaciones, puedes mantenerte en **Hobby plan** hasta:
- Storage: 1 GB = ~100 archivos
- Bandwidth: 100 GB/mes = ~2,000 descargas

---

## 🚨 PUNTOS DE QUIEBRE (UPGRADE NECESARIO)

| Métrica | Hobby Limit | Cuándo upgrader |
|---------|-------------|-----------------|
| Storage | 1 GB | 100-150 usuarios activos |
| Bandwidth | 100 GB/mes | 2,000 descargas/mes |
| Function executions | 100K/mes | Nunca (suficiente) |

**Recomendación:** Planea upgrade a **Pro ($20/mes)** cuando tengas ~120-150 usuarios beta activos.

---

## 💡 DASHBOARD DE COSTES - PLANIFICACIÓN

### Métricas a trackear en tiempo real:

1. **Por usuario:**
   - Archivos subidos (count + MB)
   - Transcripciones procesadas
   - Resúmenes generados
   - Descargas realizadas
   - **Coste total acumulado**

2. **Global:**
   - Storage total usado
   - Bandwidth mensual
   - API calls a Replicate
   - Tokens consumidos (Claude)
   - **Coste proyectado mes actual**

3. **Por tipo de IA:**
   - Whisper: # predicciones + coste
   - Claude: tokens in/out + coste
   - **Comparativa Sonnet vs Haiku**

### Implementación técnica:
- Tabla `usage_tracking` en Neon
- Cron job diario para calcular costes
- Dashboard admin con gráficas
- Alertas cuando se acerca al límite del plan

**¿Implementamos el dashboard de costes después de resolver los puntos críticos de seguridad?**

---

## 📋 RESUMEN FINAL

✅ **Whisper es SÚPER barato** (~$0.0005 por audio)
⚠️ **Claude es el coste principal** ($0.024-$0.081 por resumen)
💰 **Storage + Bandwidth** crecen con escala ($10-$70/mes para 100-500 users)

**Estrategia recomendada:**
1. Beta con Haiku (más barato)
2. Limitar archivos a 500 MB (audio) / 2 GB (video)
3. Implementar dashboard de costes
4. Ofrecer planes premium para usuarios heavy
