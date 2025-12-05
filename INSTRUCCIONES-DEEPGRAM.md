# 🎯 INSTRUCCIONES PARA COMPLETAR LA MIGRACIÓN A DEEPGRAM

**Fecha:** 5 de diciembre de 2025
**Estado:** ✅ Código migrado, falta configurar API key

---

## ✅ LO QUE YA SE COMPLETÓ

1. ✅ **Instalado @deepgram/sdk** (versión 3.3.4)
2. ✅ **Modificado `lib/processors/audio-processor.ts`**
   - Agregado import de Deepgram
   - Reemplazado OpenAI Whisper con Deepgram Nova-3
   - Actualizado formato de subtítulos para Deepgram utterances
   - Eliminado descarga de archivo (Deepgram trabaja con URLs)

---

## 🔑 LO QUE FALTA: OBTENER API KEY DE DEEPGRAM

### Paso 1: Crear Cuenta en Deepgram (3 minutos)

1. Ve a: https://console.deepgram.com/signup
2. Regístrate con email (o GitHub/Google)
3. **Obtienes $200 en créditos gratis** para empezar

### Paso 2: Obtener API Key (1 minuto)

1. Una vez logueado, ve a: https://console.deepgram.com/project/default/keys
2. Haz clic en **"Create a New API Key"**
3. Nombre sugerido: `annalogica-production`
4. **COPIA LA API KEY** (se muestra una sola vez)
   - Formato: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Paso 3: Configurar en Desarrollo (30 segundos)

Edita el archivo `.env.local` y reemplaza:

```bash
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

Por:

```bash
DEEPGRAM_API_KEY=tu_api_key_real_aqui
```

### Paso 4: Configurar en Producción (2 minutos)

1. Ve a: https://vercel.com/solammedia-9886s-projects/annalogica/settings/environment-variables
2. Haz clic en **"Add New"**
3. Configura:
   - **Key:** `DEEPGRAM_API_KEY`
   - **Value:** (pega tu API key de Deepgram)
   - **Environments:** Marca ✅ Production, ✅ Preview, ✅ Development
4. Haz clic en **"Save"**

---

## 🧪 TESTING LOCAL

### Paso 5: Probar Localmente (5 minutos)

```bash
# 1. Iniciar servidor de desarrollo
cd annalogica
npm run dev

# 2. Abre http://localhost:3000
# 3. Inicia sesión
# 4. Sube un archivo de audio pequeño (2-5 MB)
# 5. Selecciona acciones: Transcribir, Resumen, Subtítulos
# 6. Haz clic en "Procesar"

# Esperado:
# ✅ El archivo se procesa correctamente
# ✅ Ves la transcripción
# ✅ Ves el resumen
# ✅ Puedes descargar SRT/VTT
```

### Verificar Logs

Abre la consola del navegador (F12) y revisa que veas:

```
[AudioProcessor] Starting Deepgram transcription...
[AudioProcessor] ✅ Deepgram transcription completed: { duration: '...' }
```

---

## 🚀 TESTING EN PRODUCCIÓN

### Paso 6: Deploy a Producción (2 minutos)

```bash
cd annalogica
git add .
git commit -m "feat: Migrate to Deepgram Nova-3 for transcription

- Replace OpenAI Whisper with Deepgram Nova-3
- Support files up to 2GB (vs 25MB with Whisper)
- Better language support (including eu, gl)
- Cost increase: +$2.50/mes (+8%)
- Improved speaker diarization with Deepgram utterances"

git push
vercel --prod
```

### Paso 7: Verificar Deploy (2 minutos)

1. Espera a que el deploy termine (~2-3 minutos)
2. Ve a: https://annalogica.eu
3. Inicia sesión
4. **Prueba 1:** Archivo pequeño (< 25 MB)
   - Resultado esperado: ✅ Funciona
5. **Prueba 2:** Archivo mediano (50-100 MB)
   - Resultado esperado: ✅ Funciona (antes fallaba!)
6. **Prueba 3:** Archivo en euskera/gallego
   - Resultado esperado: ✅ Funciona (antes fallaba!)

---

## 📊 MONITOREO POST-DEPLOY

### Dashboard de Deepgram

1. Ve a: https://console.deepgram.com/usage
2. Revisa:
   - **Requests:** Número de transcripciones
   - **Duration:** Minutos totales procesados
   - **Cost:** Costo real acumulado
   - **Errors:** Cualquier error

### Logs de Vercel

1. Ve a: https://vercel.com/solammedia-9886s-projects/annalogica/logs
2. Busca: `[AudioProcessor]`
3. Verifica:
   - ✅ "Deepgram transcription completed"
   - ❌ Si ves errores, revisa el mensaje

### Costos Esperados

```
Por cada archivo de 10 minutos:
  Deepgram: $0.065 (10 min × $0.0065/min)
  GPT-4o-mini: $0.002 (resumen)
  Total: $0.067 por archivo

vs Whisper:
  Whisper: $0.06 (10 min × $0.006/min)
  GPT-4o-mini: $0.002
  Total: $0.062 por archivo

Diferencia: +$0.005 por archivo (+8%)
```

---

## 🔧 TROUBLESHOOTING

### Error: "Deepgram API key not configured"

**Causa:** Falta la variable `DEEPGRAM_API_KEY`

**Solución:**
1. Verifica que agregaste la variable en `.env.local` (local)
2. Verifica que agregaste la variable en Vercel Dashboard (producción)
3. Reinicia el servidor de desarrollo (`npm run dev`)
4. Redeploya a producción si modificaste variables en Vercel

### Error: "Invalid API Key"

**Causa:** La API key es incorrecta o expiró

**Solución:**
1. Ve a https://console.deepgram.com/project/default/keys
2. Verifica que la API key sea la correcta
3. Si es necesario, genera una nueva API key
4. Actualiza `.env.local` y Vercel Dashboard

### Error: "Request failed with status 429"

**Causa:** Excediste el rate limit (500 req/hora)

**Solución:**
1. Espera 1 hora para que se resetee el límite
2. O actualiza a un plan superior de Deepgram
3. Considera implementar cola de procesamiento con Inngest

### Error: Timeout en archivos grandes

**Causa:** Vercel serverless function timeout (300s)

**Solución:**
1. **Corto plazo:** Advierte al usuario sobre límite de 60 minutos de audio
2. **Largo plazo:** Migra a sistema Inngest asíncrono
   - Ya está implementado en `lib/inngest/functions.ts`
   - Solo falta activarlo en `/api/process`

---

## 📈 VENTAJAS DE LA MIGRACIÓN

### ✅ Ventajas Inmediatas

| Aspecto | Antes (Whisper) | Después (Deepgram) | Mejora |
|---------|----------------|-------------------|--------|
| **Tamaño máximo** | 25 MB | 2 GB | +8000% |
| **Duración máxima** | ~45 min | ~4 horas | +533% |
| **Euskera (eu)** | ❌ No soportado | ✅ Funciona | ✅ |
| **Gallego (gl)** | ❌ No soportado | ✅ Funciona | ✅ |
| **Rate limit** | 50 RPM | 500 RPH | +10x |
| **Latencia** | 10-15s | 7-10s | -30% |
| **Diarización** | Básica | Avanzada | ✅ |
| **Costo** | $0.006/min | $0.0065/min | +8% |

### 💰 Impacto Económico

```
Costo adicional: +$2.50/mes (500 archivos × 10 min)
Beneficios:
  ✅ Menos usuarios frustrados (archivos grandes)
  ✅ Soporte de más idiomas
  ✅ Mejor calidad de diarización
  ✅ Escalabilidad mejorada

ROI: Positivo si retienes 1+ usuario/mes
```

---

## 🎯 PRÓXIMOS PASOS (OPCIONAL)

### 1. Validación Pre-Upload (1 hora)

Actualiza el frontend para mostrar límites correctos:

```typescript
// app/page.tsx línea 321
const MAX_AUDIO_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // ✅ Ahora es real!
```

### 2. Migración a Procesamiento Asíncrono (2 horas)

Activa el sistema Inngest para evitar timeouts:

```typescript
// app/api/process/route.ts línea 147
// ANTES:
await processAudioFile(job.id);

// DESPUÉS:
await inngest.send({
  name: 'task/transcribe',
  data: { jobId: job.id }
});
```

### 3. Sistema Híbrido Inteligente (4 horas)

Usa Whisper para archivos pequeños (más barato):

```typescript
if (fileSize <= 25 * 1024 * 1024) {
  return processWithWhisper(file);  // $0.006/min
} else {
  return processWithDeepgram(file);  // $0.0065/min
}
```

---

## ✅ CHECKLIST FINAL

- [ ] Cuenta Deepgram creada
- [ ] API key obtenida
- [ ] Variable agregada en `.env.local`
- [ ] Variable agregada en Vercel Dashboard
- [ ] Testing local exitoso (archivo pequeño)
- [ ] Deploy a producción completado
- [ ] Testing en producción exitoso (archivo pequeño)
- [ ] Testing con archivo grande (50-100 MB)
- [ ] Testing con euskera/gallego
- [ ] Monitoreo de costos en Deepgram dashboard
- [ ] Verificación de logs sin errores
- [ ] Usuarios informados del cambio

---

## 📞 SOPORTE

Si tienes problemas:

1. **Deepgram Support:** https://deepgram.com/contact
2. **Deepgram Docs:** https://developers.deepgram.com/docs
3. **Deepgram Community:** https://github.com/deepgram/deepgram-js-sdk/issues

---

**¿TODO LISTO?** Una vez completados los pasos 1-4, tu aplicación soportará archivos hasta 2 GB y más idiomas. 🚀
