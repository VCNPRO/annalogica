# 🚀 Guía para Configurar Inngest en Vercel

## Problema Actual
Los archivos se quedan en "procesando 0%" para siempre porque Inngest no está configurado.

## Solución en 3 Pasos

### 1️⃣ Crear cuenta en Inngest

1. Ve a: https://app.inngest.com/sign-up
2. Regístrate con tu email
3. Crea un nuevo proyecto/app

### 2️⃣ Obtener las claves de API

Dentro de Inngest:

1. Ve a **Settings** → **Keys** (o **Secrets**)
2. Copia estas dos claves:
   - **Event Key**: Empieza con `inngest_...`
   - **Signing Key**: Empieza con `signkey_...`

### 3️⃣ Configurar en Vercel

1. Ve a tu proyecto en Vercel:
   https://vercel.com/vcnpro/annalogica/settings/environment-variables

2. Añade estas variables:
   ```
   Variable Name: INNGEST_EVENT_KEY
   Value: [pegar tu Event Key de Inngest]
   Environments: ✓ Production ✓ Preview ✓ Development
   ```

   ```
   Variable Name: INNGEST_SIGNING_KEY
   Value: [pegar tu Signing Key de Inngest]
   Environments: ✓ Production ✓ Preview ✓ Development
   ```

3. Click en **Save**

### 4️⃣ Conectar Inngest con Vercel

1. En Inngest, ve a **Settings** → **Integrations** o **Webhooks**
2. Añade tu URL de producción:
   ```
   https://annalogica.eu/api/inngest
   ```
3. Esto permite que Inngest envíe eventos a tu app

### 5️⃣ Re-deploy en Vercel

1. Ve a: https://vercel.com/vcnpro/annalogica/deployments
2. Click en el último deployment
3. Click en **Redeploy**
4. Espera a que diga "Ready"

### 6️⃣ Configurar AssemblyAI (también necesario)

Para que la transcripción funcione, también necesitas:

1. Ve a: https://www.assemblyai.com/
2. Crea una cuenta (gratis con límite)
3. Ve a **Dashboard** → **API Keys**
4. Copia tu API Key

5. Añádela en Vercel:
   ```
   Variable Name: ASSEMBLYAI_API_KEY
   Value: [tu API key de AssemblyAI]
   Environments: ✓ Production ✓ Preview ✓ Development
   ```

6. Guarda y re-deploy de nuevo

## ✅ Verificar que funciona

1. Recarga tu app (Ctrl + Shift + R)
2. Sube un archivo de audio/video
3. Dale a "Transcribir" y "Procesar"
4. Esta vez debería:
   - ✅ Obtener jobId
   - ✅ Inngest procesará el job
   - ✅ El progreso irá aumentando (0% → 50% → 100%)
   - ✅ Se generarán todos los archivos

## 🆘 Si aún no funciona

Comparte los logs de:
- Vercel: https://vercel.com/vcnpro/annalogica/logs
- Inngest: https://app.inngest.com/apps/[tu-app]/runs

---

**Nota:** Sin Inngest y AssemblyAI configurados, el procesamiento NO puede funcionar.
Es como tener un coche sin gasolina - todo está listo pero falta lo esencial.
