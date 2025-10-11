# 🏢 Servicios Externos - Guía Completa

**Fecha:** 11 de Octubre, 2025
**Versión:** 1.0.0

Esta guía explica cada servicio externo que usa Annalogica, qué hace, cuánto cuesta, y cómo controlarlo.

---

## 📋 Índice

1. [Vercel](#1-vercel) - Hosting y deployment
2. [GitHub](#2-github) - Control de versiones
3. [Neon](#3-neon) - Base de datos
4. [Inngest](#4-inngest) - Procesamiento asíncrono
5. [AssemblyAI](#5-assemblyai) - Transcripción IA
6. [Claude (Anthropic)](#6-claude-anthropic) - Resúmenes IA
7. [Upstash](#7-upstash) - Rate limiting (opcional)

---

## 1. Vercel

### ¿Qué es Vercel?

Vercel es la plataforma de **hosting** donde vive tu aplicación web. Es como el "servidor" pero moderno y automático.

**Analogía simple:** Si tu app fuera una tienda física, Vercel sería el edificio donde la tienda está ubicada.

### ¿Qué hace para Annalogica?

```
┌─────────────────────────────────────────┐
│           Usuario visita                │
│        https://annalogica.eu            │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│      VERCEL hace automáticamente:       │
│  1. Sirve la página web                 │
│  2. Ejecuta funciones API               │
│  3. Almacena archivos (Blob)            │
│  4. CDN global (velocidad)              │
│  5. HTTPS automático                    │
│  6. Deploy cuando haces push a GitHub   │
└─────────────────────────────────────────┘
```

### Componentes de Vercel que usas

#### 1.1 **Vercel Functions** (Backend)
- **Qué es:** Tu API (`/api/*`)
- **Límite Free:** 100 GB-hours/mes
- **Uso actual:** ~5 GB-hours/mes
- **Suficiente para:** ~2000 requests/día

#### 1.2 **Vercel Blob** (Almacenamiento)
- **Qué es:** Donde se guardan transcripciones y subtítulos
- **Límite Free:** 1 GB storage
- **Uso actual:** ~200 MB
- **Suficiente para:** ~500 archivos procesados

#### 1.3 **Vercel Edge Network** (CDN)
- **Qué es:** Copia tu app en 100+ ubicaciones globales
- **Beneficio:** Tu web carga rápido en todo el mundo
- **Límite Free:** 100 GB bandwidth/mes
- **Uso actual:** ~2 GB/mes

#### 1.4 **Vercel Analytics** (Métricas)
- **Qué es:** Estadísticas de visitantes
- **Estado:** No configurado aún
- **Costo:** Gratis hasta 2,500 pageviews/mes

### Dashboard de Vercel

**URL:** https://vercel.com/solammedia-9886s-projects/annalogica

**Qué puedes ver:**
- ✅ **Deployments:** Cada vez que actualizas el código
- ✅ **Analytics:** Cuánta gente visita
- ✅ **Logs:** Errores y actividad
- ✅ **Settings:** Variables de entorno, dominios
- ✅ **Usage:** Cuánto consumes del plan

### Costos

| Plan | Precio | Límites | Recomendado para |
|------|--------|---------|------------------|
| **Hobby** | **$0/mes** | 100 GB-hours<br>1 GB Blob<br>100 GB bandwidth | **Tu plan actual**<br>0-500 usuarios |
| Pro | $20/mes | 400 GB-hours<br>100 GB Blob<br>1 TB bandwidth | 500-5000 usuarios |
| Enterprise | Custom | Ilimitado | 10,000+ usuarios |

**Tu status:** Hobby plan → upgrade necesario cuando tengas ~400 usuarios activos.

### Cómo controlar Vercel

#### Ver uso actual
```bash
1. Ir a: https://vercel.com/solammedia-9886s-projects/annalogica/usage
2. Ver gráficas de:
   - Functions execution time
   - Bandwidth used
   - Blob storage used
```

#### Configurar límites
```bash
1. Settings → Limits
2. Activar alertas cuando llegues al 80% del plan
```

#### Ver costos proyectados
```bash
1. Dashboard → Usage
2. "Cost Estimate" te dice cuánto pagarías si excedieras free tier
```

---

## 2. GitHub

### ¿Qué es GitHub?

GitHub es donde se guarda el **código fuente** de tu aplicación. Es como Google Drive, pero para código.

**Analogía simple:** GitHub es el "archivo" donde guardas todas las versiones de tu proyecto.

### ¿Qué hace para Annalogica?

```
Tu computadora                    GitHub                    Vercel
     │                              │                         │
     │  git push                    │                         │
     ├─────────────────────────────>│                         │
     │                              │  Webhook automático     │
     │                              ├────────────────────────>│
     │                              │                         │
     │                              │                    Deploy ✅
     │                              │                    (2 min)
     │                              │                         │
```

### Características que usas

#### 2.1 **Repositorio**
- **URL:** https://github.com/VCNPRO/annalogica
- **Visibilidad:** Privado
- **Branches:** main (producción)

#### 2.2 **Git History**
- Cada cambio queda registrado
- Puedes ver quién cambió qué y cuándo
- Puedes volver a versiones anteriores

#### 2.3 **Integración con Vercel**
- Cada `git push` dispara deployment automático
- Vercel ejecuta `npm run build`
- Si falla, no se actualiza producción

### Dashboard de GitHub

**URL:** https://github.com/VCNPRO/annalogica

**Qué puedes ver:**
- ✅ **Code:** Todo el código fuente
- ✅ **Commits:** Historial de cambios
- ✅ **Issues:** Bug tracking (no usado aún)
- ✅ **Settings:** Configuración del repo

### Costos

| Plan | Precio | Límites | Tu caso |
|------|--------|---------|---------|
| **Free** | **$0/mes** | Repos privados ilimitados<br>2,000 minutos CI/CD | **Tu plan actual** |
| Pro | $4/mes | 3,000 minutos CI/CD | Solo si agregas CI/CD |

**Tu status:** Plan free es suficiente.

### Cómo controlar GitHub

#### Ver historial de cambios
```bash
1. Ir a: https://github.com/VCNPRO/annalogica/commits/main
2. Ver todos los commits con mensajes
```

#### Volver a versión anterior (rollback)
```bash
# En tu terminal
git log  # Ver historial
git checkout <commit-hash>  # Ir a versión específica
git checkout main  # Volver a la última versión
```

#### Colaboradores
```bash
1. Settings → Collaborators
2. Agregar email de persona
3. Dar permisos (Read/Write/Admin)
```

---

## 3. Neon

### ¿Qué es Neon?

Neon es tu **base de datos** PostgreSQL. Guarda toda la información persistente: usuarios, archivos, metadatos.

**Analogía simple:** Neon es el "archivo Excel" gigante donde se guarda todo (pero mucho más potente).

### ¿Qué hace para Annalogica?

```
┌────────────────────────────────────────┐
│          Base de Datos Neon            │
├────────────────────────────────────────┤
│  Tabla: users                          │
│  - Emails y contraseñas                │
│  - Roles (user/admin)                  │
│  - IDs únicos                          │
├────────────────────────────────────────┤
│  Tabla: transcription_jobs             │
│  - Estado de cada archivo              │
│  - URLs de resultados                  │
│  - Metadatos (speakers, duración)      │
└────────────────────────────────────────┘
```

### Características de Neon

#### 3.1 **Serverless**
- **Qué significa:** Se enciende y apaga solo según necesidad
- **Beneficio:** Pagas solo por lo que usas
- **Límite Free:** 191 compute hours/mes (suficiente para 24/7)

#### 3.2 **Branching**
- **Qué es:** Puedes crear "copias" de la BD para testing
- **Uso:** Desarrollo sin afectar producción
- **Ejemplo:**
  ```bash
  main (producción) ← Tu BD actual
  dev (desarrollo) ← Copia para probar cambios
  ```

#### 3.3 **Backups Automáticos**
- **Frecuencia:** Diarios
- **Retención:** 7 días (plan free)
- **Point-in-time recovery:** Volver a cualquier momento de los últimos 7 días

#### 3.4 **Connection Pooling**
- **Qué es:** Reutiliza conexiones para mayor velocidad
- **Beneficio:** Más rápido y eficiente
- **Automático:** Sí, con `pgBouncer`

### Dashboard de Neon

**URL:** https://console.neon.tech/app/projects/lucky-surf-17443478

**Qué puedes ver:**
- ✅ **Tables:** Ver estructura de datos
- ✅ **SQL Editor:** Ejecutar queries directamente
- ✅ **Monitoring:** CPU, memoria, queries lentas
- ✅ **Branches:** Crear/eliminar copias de BD
- ✅ **Backups:** Ver y restaurar backups

### Costos

| Plan | Precio | Storage | Compute | Tu caso |
|------|--------|---------|---------|---------|
| **Free** | **$0/mes** | 3 GB | 191 h/mes | **Tu plan actual**<br>0-1000 usuarios |
| Scale | $19/mes | 10 GB | 300 h/mes | 1000-10000 usuarios |
| Business | $69/mes | 50 GB | 750 h/mes | 10000+ usuarios |

**Tu status:** Free plan suficiente hasta ~800-1000 usuarios.

**Estimación de upgrade:**
- Con 500 usuarios: Free todavía OK
- Con 1500 usuarios: Scale plan ($19/mes)
- Con 5000+ usuarios: Business plan ($69/mes)

### Cómo controlar Neon

#### Ver uso de almacenamiento
```bash
1. Dashboard → Storage
2. Ver: 32.1 MB / 3 GB used (1% usado) ✅
```

#### Ver queries lentas
```bash
1. Dashboard → Monitoring → Queries
2. Ver cuáles queries tardan más de 100ms
3. Optimizar con índices si es necesario
```

#### Hacer backup manual
```bash
# Desde terminal local
pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql

# Restaurar
psql $POSTGRES_URL < backup-20251011.sql
```

#### Ver usuarios en la BD
```sql
-- En SQL Editor de Neon
SELECT id, email, role, created_at
FROM users
ORDER BY created_at DESC;
```

---

## 4. Inngest

### ¿Qué es Inngest?

Inngest maneja **trabajos largos** (transcripciones) que no pueden ejecutarse en requests HTTP normales (timeout de 10s).

**Analogía simple:** Si Vercel es una tienda con clientes, Inngest es el "almacén trasero" donde se hace el trabajo pesado.

### ¿Qué hace para Annalogica?

```
Usuario sube archivo
       │
       ↓
API crea job y responde rápido (1s)
       │
       ↓
Inngest procesa en background (5-10 min)
  ├─ Transcribe con AssemblyAI
  ├─ Genera SRT/VTT
  ├─ Crea resumen con Claude
  ├─ Guarda todo en Blob
  └─ Actualiza BD con resultados
       │
       ↓
Usuario ve resultados listos
```

### Ventajas de Inngest

1. **Sin timeouts:** Jobs pueden durar horas
2. **Retry automático:** Si falla, reintenta 3 veces
3. **Logs detallados:** Ver cada paso del proceso
4. **No requiere infraestructura:** No necesitas Redis, Bull, etc.

### Dashboard de Inngest

**URL:** https://app.inngest.com/env/production/apps

**Qué puedes ver:**
- ✅ **Runs:** Cada job ejecutado
- ✅ **Logs:** Output de cada paso
- ✅ **Errors:** Si algo falló, por qué
- ✅ **Metrics:** Tiempo promedio, tasa de error

### Costos

| Plan | Precio | Steps/mes | Duración | Tu caso |
|------|--------|-----------|----------|---------|
| **Hobby** | **$0/mes** | 25,000 | 60s max | **Plan actual**<br>0-400 transcripciones/mes |
| Pro | $20/mes | 250,000 | 300s max | 400-4000 transcripciones/mes |
| Scale | $200/mes | 2.5M | 600s max | 4000+ transcripciones/mes |

**Tu status:** Hobby plan suficiente para MVP.

**Nota:** Cada transcripción usa ~7 steps:
- Upload → Transcribe → Generate files → Summarize → Save → Cleanup → Update DB

**Cálculo:** 25,000 steps ÷ 7 = ~3,500 transcripciones/mes en plan free

### Cómo controlar Inngest

#### Ver jobs en ejecución
```bash
1. Dashboard → Runs → Running
2. Ver jobs activos en tiempo real
```

#### Ver jobs fallidos
```bash
1. Dashboard → Runs → Failed
2. Click en job → Ver error completo
3. "Replay" para reintentar manualmente
```

#### Ver métricas
```bash
1. Dashboard → Metrics
2. Ver:
   - Average duration
   - Success rate
   - Throughput (jobs/hora)
```

#### Cancelar job bloqueado
```bash
1. Dashboard → Runs → Find job
2. Click → "Cancel Run"
```

---

## 5. AssemblyAI

### ¿Qué es AssemblyAI?

AssemblyAI es el servicio que **transcribe** audio/video a texto usando IA.

**Analogía simple:** Le das un archivo de audio, y te devuelve todo lo que se dijo, palabra por palabra.

### ¿Qué hace para Annalogica?

```
Audio de 10 minutos
       │
       ↓
AssemblyAI procesa (2-3 min)
  ├─ Transcribe a texto
  ├─ Identifica hablantes (Speaker 1, Speaker 2...)
  ├─ Detecta idioma
  └─ Genera timestamps precisos
       │
       ↓
Devuelve:
  - Transcripción completa
  - SRT (subtítulos)
  - VTT (subtítulos web)
  - Speaker labels
```

### Características que usas

#### 5.1 **Speaker Diarization**
- **Qué es:** Identifica quién habla cuándo
- **Ejemplo:**
  ```
  [Speaker 1, 00:00:05]: Hola, ¿cómo estás?
  [Speaker 2, 00:00:07]: Muy bien, gracias.
  ```

#### 5.2 **Punctuation & Formatting**
- Agrega puntuación automáticamente
- Capitaliza nombres propios
- Formatea números

#### 5.3 **Language Detection**
- Detecta idioma automáticamente
- Soporta 95+ idiomas

### Dashboard de AssemblyAI

**URL:** https://www.assemblyai.com/dashboard

**Qué puedes ver:**
- ✅ **Usage:** Minutos transcritos
- ✅ **Billing:** Costo acumulado
- ✅ **API Keys:** Tokens de acceso
- ✅ **Playground:** Probar transcripciones

### Costos

**Modelo de pago: Por segundo de audio**

| Servicio | Precio | Tu uso |
|----------|--------|--------|
| **Transcripción** | $0.00025/seg | Core de la app |
| Speaker Diarization | $0.00025/seg | Activado ✅ |
| **TOTAL** | **$0.0005/seg** | **$0.03/minuto** |

**Cálculo de costos:**

```
Archivo de 10 minutos:
10 min × $0.03/min = $0.30

100 archivos/mes:
100 × $0.30 = $30/mes

1000 archivos/mes:
1000 × $0.30 = $300/mes
```

**Recomendación de precios:**
- Si cobras $5/mes por usuario con 10 transcripciones/mes
- Costo AssemblyAI: $3/usuario
- Otros costos: $1/usuario
- Margen: $1/usuario (20%)

### Cómo controlar AssemblyAI

#### Ver uso en tiempo real
```bash
1. Dashboard → Usage
2. Ver gráfica de:
   - Audio minutes transcribed
   - API calls
   - Costs this month
```

#### Configurar límites
```bash
1. Settings → Usage Limits
2. "Set spending limit" → $100/mes (por ejemplo)
3. "Email alerts" → Al llegar a $80
```

#### Ver transcripciones pasadas
```bash
1. Dashboard → Transcripts
2. Ver historial de archivos procesados
3. Re-descargar resultados si es necesario
```

---

## 6. Claude (Anthropic)

### ¿Qué es Claude?

Claude es la IA de Anthropic que genera **resúmenes inteligentes** de las transcripciones.

**Analogía simple:** Le das un texto largo, y te devuelve un resumen conciso con los puntos clave.

### ¿Qué hace para Annalogica?

```
Transcripción de 5000 palabras
       │
       ↓
Claude analiza (30s)
  ├─ Identifica temas principales
  ├─ Extrae puntos clave
  ├─ Resume en 200-300 palabras
  └─ Mantiene el contexto
       │
       ↓
Devuelve resumen estructurado
```

### Modelo que usas

**Claude 3.5 Sonnet** (recomendado para producción)

- **Velocidad:** Rápido (~30s para 5000 palabras)
- **Calidad:** Alta precisión
- **Contexto:** 200K tokens (~150K palabras)

### Dashboard de Anthropic

**URL:** https://console.anthropic.com/

**Qué puedes ver:**
- ✅ **Usage:** Tokens consumidos
- ✅ **Billing:** Costo mensual
- ✅ **API Keys:** Tokens de acceso
- ✅ **Playground:** Probar prompts

### Costos

**Modelo de pago: Por token**

| Modelo | Input | Output | Tu caso |
|--------|-------|--------|---------|
| Claude 3.5 Sonnet | $3/M tokens | $15/M tokens | Recomendado ✅ |
| Claude 3 Haiku | $0.25/M tokens | $1.25/M tokens | Más barato |
| Claude 3 Opus | $15/M tokens | $75/M tokens | Más preciso |

**Cálculo para tu app:**

```
Transcripción promedio: 5000 palabras ≈ 6500 tokens input
Resumen generado: 300 palabras ≈ 400 tokens output

Costo por resumen:
- Input: 6500 tokens × $3/1M = $0.0195
- Output: 400 tokens × $15/1M = $0.006
- TOTAL: $0.0255 (~$0.03 por resumen)

100 resúmenes/mes = $3/mes
1000 resúmenes/mes = $30/mes
```

### Cómo controlar Claude

#### Ver uso mensual
```bash
1. Dashboard → Usage
2. Ver:
   - Tokens used this month
   - API calls
   - Cost estimate
```

#### Optimizar costos
```bash
# Opción 1: Usar modelo más barato
"model": "claude-3-haiku-20240307"  # 10x más barato

# Opción 2: Reducir tokens de entrada
# Solo enviar primeras 3000 palabras para resumen

# Opción 3: Cachear resúmenes idénticos
# Si misma transcripción → mismo resumen (no llamar API)
```

#### Probar prompts
```bash
1. Console → Playground
2. Pegar transcripción de prueba
3. Ajustar prompt para mejor resumen
4. Copiar prompt optimizado al código
```

---

## 7. Upstash (Opcional)

### ¿Qué es Upstash?

Upstash proporciona **Redis** (base de datos en memoria) para **rate limiting** (limitar requests por usuario).

**Analogía simple:** Es un "contador" ultrarrápido que previene que alguien abuse de tu app haciendo 1000 requests por segundo.

### ¿Por qué es opcional en tu app?

Tu código está diseñado para funcionar **con o sin** Upstash:

```typescript
// Si no hay Redis configurado, rate limiting se desactiva
if (!rateLimit) {
  return null; // No limit
}
```

### Cuándo necesitas Upstash

**Escenarios:**
1. ⚠️ **Abuse:** Alguien hace script para crear 1000 cuentas/hora
2. ⚠️ **DDoS:** Ataque de denegación de servicio
3. ⚠️ **Costos:** Alguien sube 100 archivos seguidos → $30 en APIs

**Sin Upstash:**
- Riesgo bajo en etapa MVP con pocos usuarios
- Vercel tiene protecciones básicas

**Con Upstash:**
- Límites por IP/usuario
- Prevención de abuse
- Control de costos de APIs

### Dashboard de Upstash

**URL:** https://console.upstash.com/

**Qué puedes ver:**
- ✅ **Databases:** Redis instances
- ✅ **Commands:** Requests ejecutados
- ✅ **Bandwidth:** Datos transferidos

### Costos

| Plan | Precio | Commands | Storage | Tu caso |
|------|--------|----------|---------|---------|
| **Free** | **$0/mes** | 10,000/day | 256 MB | Suficiente para 0-500 usuarios |
| Pay as you go | $0.20/100K | Ilimitado | $0.25/GB | Upgrade solo si necesitas |

### Cómo configurar Upstash (si decides usarlo)

```bash
# 1. Crear cuenta en Upstash
https://console.upstash.com/

# 2. Crear Redis database
Dashboard → Create Database → Global → Create

# 3. Copiar credenciales
Copy "REST URL" y "REST TOKEN"

# 4. Agregar a Vercel
Settings → Environment Variables:
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx

# 5. Redeploy
El rate limiting se activará automáticamente
```

---

## 📊 Resumen de Costos Mensuales

### Escenario 1: MVP (0-100 usuarios)

| Servicio | Plan | Costo |
|----------|------|-------|
| Vercel | Hobby | $0 |
| GitHub | Free | $0 |
| Neon | Free | $0 |
| Inngest | Hobby | $0 |
| AssemblyAI | ~100 transcripciones | $30 |
| Claude | ~100 resúmenes | $3 |
| Upstash | No usado | $0 |
| **TOTAL** | | **$33/mes** |

---

### Escenario 2: Crecimiento (500 usuarios)

| Servicio | Plan | Costo |
|----------|------|-------|
| Vercel | Pro | $20 |
| GitHub | Free | $0 |
| Neon | Scale | $19 |
| Inngest | Pro | $20 |
| AssemblyAI | ~1000 transcripciones | $300 |
| Claude | ~1000 resúmenes | $30 |
| Upstash | Pay-as-go | $5 |
| **TOTAL** | | **$394/mes** |

**Ingreso necesario:** $394/mes
**Precio sugerido:** $5/mes × 500 usuarios = $2,500/mes
**Margen:** $2,106/mes (84%) ✅

---

### Escenario 3: Escala (2000 usuarios)

| Servicio | Plan | Costo |
|----------|------|-------|
| Vercel | Enterprise | $150 |
| GitHub | Free | $0 |
| Neon | Business | $69 |
| Inngest | Scale | $200 |
| AssemblyAI | ~4000 transcripciones | $1,200 |
| Claude | ~4000 resúmenes | $120 |
| Upstash | Pay-as-go | $20 |
| **TOTAL** | | **$1,759/mes** |

**Ingreso necesario:** $1,759/mes
**Precio sugerido:** $5/mes × 2000 usuarios = $10,000/mes
**Margen:** $8,241/mes (82%) ✅

---

## 🎯 Recomendaciones

### Para Controlar Costos

1. **Monitorear semanalmente:**
   - Vercel Usage
   - AssemblyAI Dashboard
   - Neon Storage

2. **Configurar alertas:**
   - AssemblyAI: Alerta a $80/mes
   - Vercel: Alerta al 80% del plan
   - Claude: Alerta a $25/mes

3. **Optimizar:**
   - Cachear resúmenes de Claude
   - Limpiar archivos viejos (ya implementado)
   - Rate limiting para prevenir abuse

### Para Escalar

**De 0 a 500 usuarios:**
- ✅ Mantener planes free
- ✅ Monitorear límites
- ✅ Upgrade solo cuando sea necesario

**De 500 a 2000 usuarios:**
- 🔄 Upgrade Vercel Pro ($20/mes)
- 🔄 Upgrade Neon Scale ($19/mes)
- 🔄 Considerar Inngest Pro ($20/mes)

**2000+ usuarios:**
- 🔄 Cotizar Vercel Enterprise
- 🔄 Optimizar costos de AssemblyAI (volumen)
- 🔄 Considerar contratos anuales (descuentos)

---

**Autor:** Claude Code (Anthropic)
**Fecha:** 11 de Octubre, 2025
