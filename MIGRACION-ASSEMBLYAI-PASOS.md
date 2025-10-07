# 🚀 MIGRACIÓN A ASSEMBLYAI - Pasos Finales

## ✅ Lo que ya está hecho (desarrollo completado):

1. ✅ Dependencias instaladas (`assemblyai`, `inngest`)
2. ✅ Schema SQL para tabla `transcription_jobs` creado
3. ✅ Funciones DB para manejar jobs (`TranscriptionJobDB`)
4. ✅ Helper AssemblyAI (`lib/assemblyai-client.ts`)
5. ✅ Inngest configurado (queue asíncrono)
6. ✅ API `/api/process` migrada a arquitectura async
7. ✅ API `/api/jobs/[id]` para polling de estado
8. ✅ Variables de entorno actualizadas

---

## 🔴 PASOS QUE DEBES HACER TÚ:

### **PASO 1: Obtener AssemblyAI API Key** (2 minutos)

1. Ve a: https://www.assemblyai.com/
2. Click en **"Sign Up"** o **"Get API Key"**
3. Crea cuenta (gratis, sin tarjeta de crédito)
4. Ve a Dashboard → **Account** → **API Keys**
5. Copia tu API Key (empieza con `aai_...`)

**Plan Free incluye:**
- ✅ 185 horas de transcripción/mes GRATIS
- ✅ Speaker labels incluidos
- ✅ Todas las features que necesitamos

---

### **PASO 2: Configurar Variable de Entorno Local** (1 minuto)

Edita el archivo `.env.local`:

```bash
# Reemplaza esto:
ASSEMBLYAI_API_KEY=tu_assemblyai_api_key_aqui

# Con tu API key real:
ASSEMBLYAI_API_KEY=aai_tu_clave_aqui
```

---

### **PASO 3: Ejecutar Schema SQL en Neon** (2 minutos)

1. Ve a: https://console.neon.tech/
2. Selecciona tu proyecto **Annalogica**
3. Click en **SQL Editor**
4. Copia y pega el contenido de `lib/db-schema-jobs.sql`
5. Click **Run Query**

Deberías ver: ✅ `CREATE TABLE` successful

---

### **PASO 4: Configurar Inngest Dev Server** (1 minuto)

En terminal, ejecuta:

```bash
cd annalogica
npm install -g inngest-cli
inngest dev
```

Esto abrirá el dashboard de Inngest en http://localhost:8288

**Déjalo corriendo** mientras desarrollas. En producción no es necesario.

---

### **PASO 5: Probar en Desarrollo** (5 minutos)

1. Abre nueva terminal y ejecuta:
```bash
cd annalogica
npm run dev
```

2. Ve a http://localhost:3000

3. Login con tu usuario

4. Sube un audio pequeño (< 5 min para testing rápido)

5. **IMPORTANTE:** Ahora verás un mensaje:
   ```
   "Transcripción en proceso. Esto puede tardar 1-3 minutos."
   ```

6. El dashboard de Inngest (http://localhost:8288) mostrará el job procesándose

7. La transcripción se completará en **background** (3-8 segundos con AssemblyAI)

---

### **PASO 6: Verificar que funciona** (2 minutos)

Deberías ver en consola:

```
[AssemblyAI] Starting transcription...
[AssemblyAI] Transcription completed: aai_xxxxx
[Inngest] Files saved: .txt, .srt, .vtt
[Inngest] Summary generated
[Inngest] Job completed successfully
```

En la web, la transcripción aparecerá en "Archivos Procesados" con:
- ✅ Texto completo
- ✅ SRT subtítulos
- ✅ VTT subtítulos (NUEVO)
- ✅ Resumen IA
- ✅ Speaker labels (A, B, C...)

---

## 🌐 DEPLOY A PRODUCCIÓN (Vercel)

### **Paso 1: Configurar Variables de Entorno en Vercel**

1. Ve a: https://vercel.com/solammedia-9886s-projects/annalogica
2. **Settings** → **Environment Variables**
3. Agrega:

```
ASSEMBLYAI_API_KEY = tu_clave_aqui
```

4. Aplica a: ✅ Production, ✅ Preview, ✅ Development

---

### **Paso 2: Configurar Inngest en Producción**

1. Ve a: https://www.inngest.com/
2. Sign up (gratis hasta 200K eventos/mes)
3. Crea nuevo proyecto: **"Annalogica"**
4. Ve a **Settings** → **Keys**
5. Copia **Event Key** y **Signing Key**

Agrega a Vercel Environment Variables:

```
INNGEST_EVENT_KEY = tu_inngest_event_key
INNGEST_SIGNING_KEY = tu_inngest_signing_key
```

---

### **Paso 3: Deploy**

```bash
git add .
git commit -m "Migrate to AssemblyAI with async architecture"
git push origin main
```

Vercel hará deploy automático.

---

### **Paso 4: Conectar Inngest con Vercel**

1. En Inngest Dashboard:
   - Ve a **Settings** → **Webhooks**
   - Agrega URL: `https://annalogica.eu/api/inngest`
   - Guarda

2. Vercel detectará automáticamente el endpoint

3. ✅ ¡Listo! Los jobs se procesarán en background en producción

---

## 📊 MONITOREO

### **En Desarrollo:**
- Inngest Dashboard: http://localhost:8288
- Ver jobs en tiempo real
- Retry automático si falla

### **En Producción:**
- Inngest Cloud Dashboard: https://app.inngest.com
- Logs de cada job
- Métricas de performance

---

## 🔄 DIFERENCIAS vs SISTEMA ANTERIOR

| Aspecto | Antes (Replicate) | Ahora (AssemblyAI) |
|---------|-------------------|---------------------|
| **Latencia** | 30-60 segundos | 3-8 segundos |
| **Arquitectura** | Síncrona (bloqueante) | Asíncrona (no bloqueante) |
| **Speaker Labels** | ❌ No | ✅ Gratis incluido |
| **Formato VTT** | ❌ Manual | ✅ Nativo |
| **Retry automático** | ❌ No | ✅ 3 intentos |
| **SLA** | 99.46% | 99.9% garantizado |
| **Coste** | $0.00046/audio | $0.104/audio 30min |
| **Timeout Vercel** | ⚠️ Riesgo | ✅ Sin riesgo (async) |

---

## 🐛 TROUBLESHOOTING

### **Error: "ASSEMBLYAI_API_KEY not configured"**
→ Verifica que agregaste la clave en `.env.local`
→ Reinicia el servidor (`npm run dev`)

### **Error: "tabla transcription_jobs no existe"**
→ Ejecuta el SQL en Neon (`lib/db-schema-jobs.sql`)

### **Inngest dashboard no abre**
→ Verifica que `inngest dev` esté corriendo
→ Puerto debe ser 8288

### **Jobs quedan en "pending" forever**
→ Verifica que Inngest dev esté corriendo
→ Revisa logs de Inngest dashboard

### **AssemblyAI retorna error 401**
→ API key incorrecta
→ Verifica en https://www.assemblyai.com/app/account

---

## ✅ CHECKLIST FINAL

Antes de considerarlo completo, verifica:

- [ ] AssemblyAI API key configurada
- [ ] SQL schema ejecutado en Neon
- [ ] Inngest dev server corriendo
- [ ] Test con audio real exitoso
- [ ] Aparece TXT, SRT, VTT, y resumen
- [ ] Speaker labels funcionan (A, B, C...)
- [ ] Variables configuradas en Vercel
- [ ] Inngest conectado a producción
- [ ] Deploy a Vercel exitoso
- [ ] Test en producción exitoso

---

## 🎯 PRÓXIMOS PASOS (FASE 2)

Una vez que esto funcione:

1. ⏳ Actualizar frontend con mejor UI de progreso
2. ⏳ Agregar polling automático cada 3 segundos
3. ⏳ Mostrar porcentaje de progreso estimado
4. ⏳ Implementar sistema de pagos (Stripe)
5. ⏳ Configurar planes (Free, Basic, Pro)

**¿Listo para comenzar FASE 2?**
