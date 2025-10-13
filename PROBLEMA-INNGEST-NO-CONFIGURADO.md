# 🚨 PROBLEMA CRÍTICO: Inngest No Configurado en Producción

## ❌ Síntoma

Los jobs de transcripción se crean pero **nunca se procesan**:
- Status se queda en "pending" por más de 300 segundos
- Auto-restart detecta "Job appears stuck"
- Los archivos no se transcriben

## 🔍 Causa Raíz

**Inngest NO está configurado en producción**. Falta la variable `INNGEST_EVENT_KEY`.

```typescript
// lib/inngest/client.ts
export const inngest = new Inngest({
  id: 'annalogica',
  name: 'Annalogica Transcription Service',
  eventKey: process.env.INNGEST_EVENT_KEY, // ❌ NO CONFIGURADA
});
```

Sin esta key:
- Los eventos NO se envían a Inngest
- Los jobs NO se procesan
- Todo se queda atascado en "pending"

## ✅ Solución: Configurar Inngest

### Paso 1: Registrarse en Inngest

1. Ve a: https://www.inngest.com/
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto llamado "Annalogica"

### Paso 2: Obtener Event Key

1. En el dashboard de Inngest, ve a **Settings → Keys**
2. Copia el **Event Key** (empieza con algo como `inngest_...`)

### Paso 3: Configurar en Vercel

1. Ve a: https://vercel.com/vcnpro/annalogica/settings/environment-variables
2. Agrega una nueva variable:
   - **Name:** `INNGEST_EVENT_KEY`
   - **Value:** (pega el Event Key de Inngest)
   - **Environment:** Producción, Preview, Development (seleccionar todos)
3. Click en **Save**

### Paso 4: Conectar Inngest con Vercel

1. En el dashboard de Inngest, ve a **Apps → Create App**
2. Name: `Annalogica Production`
3. **App URL:** `https://annalogica.vercel.app/api/inngest`
4. Click en **Create App**
5. Inngest verificará la conexión y debería mostrar:
   - ✅ **2 functions discovered:**
     - `task-transcribe-file`
     - `task-summarize-file`

### Paso 5: Re-deployar en Vercel

1. Ve a: https://vercel.com/vcnpro/annalogica
2. Click en **Deployments**
3. Click en el deployment más reciente → **⋯ (tres puntos)** → **Redeploy**
4. Selecciona **Redeploy**

## 🧪 Verificar que Funciona

### Test 1: Endpoint de Inngest
```bash
curl https://annalogica.vercel.app/api/inngest
```

Debería responder con JSON (no "Error"):
```json
{
  "function_count": 2,
  "mode": "cloud",
  "has_event_key": true
}
```

### Test 2: Procesar un Archivo

1. Sube un archivo de audio corto (~30 segundos)
2. Click en "Transcribir"
3. Debería completarse en ~1-2 minutos (no quedarse atascado)

## 📊 Plan Gratuito de Inngest

- ✅ **25,000 steps/mes** (más que suficiente para comenzar)
- ✅ Sin límite de tiempo de ejecución
- ✅ Soporte para funciones asíncronas
- ✅ Dashboard de monitoreo

## 🔄 Alternativa: Sin Inngest (Procesamiento Síncrono)

Si no quieres usar Inngest ahora, puedo modificar el código para que procese todo síncronamente (sin queue). Esto significa:

**Pros:**
- ✅ No requiere configuración de Inngest
- ✅ Más simple

**Cons:**
- ❌ Usuario debe esperar ~2-5 minutos mirando la pantalla
- ❌ Si cierra el navegador, pierde el progreso
- ❌ Timeouts de Vercel (max 10 segundos en plan free)

**Para esto necesitaría:**
1. Eliminar Inngest
2. Usar Edge Functions con streaming
3. O usar un endpoint de webhook que procese todo en una sola llamada

## ❓ ¿Qué Prefieres?

1. **Configurar Inngest** (recomendado) - 10 minutos de setup
2. **Alternativa sin Inngest** - requiere reescribir código

Déjame saber y puedo ayudarte con cualquiera de las dos opciones.
