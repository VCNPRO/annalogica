# 🚀 Configuración de Variables de Entorno en Vercel

## ⚠️ ACCIÓN URGENTE REQUERIDA

Para que tu aplicación funcione correctamente en producción, **DEBES** configurar las siguientes variables de entorno en Vercel.

---

## 📋 Paso a Paso

### 1. Accede al Dashboard de Vercel

```
https://vercel.com/solammedia-9886s-projects/annalogica/settings/environment-variables
```

### 2. Agrega las Variables Críticas

Haz clic en **"Add New"** y configura cada variable:

#### ✅ VARIABLES MÍNIMAS OBLIGATORIAS (sin estas, la app NO funciona)

| Variable | Dónde obtenerla | Ejemplo |
|----------|-----------------|---------|
| `POSTGRES_URL` | Vercel Dashboard > Storage > Postgres > Connection String | `postgresql://...` |
| `JWT_SECRET` | Generar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | String de 64 caracteres |
| `BLOB_READ_WRITE_TOKEN` | Vercel Dashboard > Storage > Blob > Token | `vercel_blob_...` |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys | `sk-...` (tu API key de OpenAI) |
| `INNGEST_EVENT_KEY` | https://app.inngest.com/env/production/apps > Event Key | `evt_...` |
| `INNGEST_SIGNING_KEY` | https://app.inngest.com/env/production/apps > Signing Key | `signkey_...` |

#### 🔐 CÓMO CONFIGURAR INNGEST (PASO CRÍTICO)

1. Ve a https://app.inngest.com/env/production/apps
2. Si no tienes cuenta, créala (es gratis)
3. Crea una nueva App llamada "annalogica"
4. Copia **Event Key** → pégalo en `INNGEST_EVENT_KEY`
5. Copia **Signing Key** → pégalo en `INNGEST_SIGNING_KEY`
6. En Inngest, configura el endpoint de tu app:
   ```
   https://annalogica.eu/api/inngest
   ```

---

#### 💳 STRIPE (para pagos)

| Variable | Dónde obtenerla |
|----------|-----------------|
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | https://dashboard.stripe.com/webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | https://dashboard.stripe.com/apikeys |
| `STRIPE_PRICE_BASICO` | https://dashboard.stripe.com/products |
| `STRIPE_PRICE_PRO` | https://dashboard.stripe.com/products |
| `STRIPE_PRICE_BUSINESS` | https://dashboard.stripe.com/products |
| `STRIPE_PRICE_UNIVERSIDAD` | https://dashboard.stripe.com/products |
| `STRIPE_PRICE_MEDIOS` | https://dashboard.stripe.com/products |

---

#### 📧 EMAILS (opcional pero recomendado)

| Variable | Dónde obtenerla |
|----------|-----------------|
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `ADMIN_EMAIL` | Tu email: `admin@annalogica.eu` |

---

#### 🛡️ RATE LIMITING (opcional)

| Variable | Dónde obtenerla |
|----------|-----------------|
| `UPSTASH_REDIS_REST_URL` | https://console.upstash.com/ |
| `UPSTASH_REDIS_REST_TOKEN` | https://console.upstash.com/ |

---

#### 🕐 CRON JOBS

| Variable | Cómo generarla |
|----------|----------------|
| `CRON_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

---

#### 🌐 CONFIGURACIÓN GENERAL

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_BASE_URL` | `https://annalogica.eu` |
| `NODE_ENV` | `production` |

---

## 3. Configurar para TODOS los Entornos

**IMPORTANTE:** Cuando agregues cada variable, selecciona:
- ✅ Production
- ✅ Preview
- ✅ Development

Esto asegura que la app funcione en todos los entornos.

---

## 4. Redesplegar la Aplicación

Después de configurar las variables:

1. Ve a **Deployments**
2. Encuentra el último deployment
3. Haz clic en los tres puntos (⋯)
4. Selecciona **"Redeploy"**
5. ✅ Marca "Use existing Build Cache" (opcional, más rápido)
6. Haz clic en **"Redeploy"**

---

## 5. Verificar que Funciona

Una vez desplegado:

1. Visita https://annalogica.eu
2. La página principal debería cargar sin error 404
3. Prueba subir un archivo de audio
4. Verifica que funcione la transcripción

---

## 🆘 Troubleshooting

### Error: "Neither apiKey nor config.authenticator provided"
**Causa:** Faltan `INNGEST_EVENT_KEY` o `INNGEST_SIGNING_KEY`
**Solución:** Configúralas siguiendo el paso de INNGEST arriba

### Error: "Database connection failed"
**Causa:** Falta `POSTGRES_URL` o es incorrecta
**Solución:** Copia la connection string correcta desde Vercel Storage > Postgres

### Error 500 al subir archivos
**Causa:** Falta `BLOB_READ_WRITE_TOKEN`
**Solución:** Copia el token desde Vercel Storage > Blob

### La transcripción no funciona
**Causa:** Falta `OPENAI_API_KEY`
**Solución:** Obtén tu API key de OpenAI y configúrala

---

## 📝 Checklist Final

Antes de considerar la configuración completa, verifica:

- [ ] `POSTGRES_URL` configurada
- [ ] `JWT_SECRET` configurada (64 caracteres aleatorios)
- [ ] `BLOB_READ_WRITE_TOKEN` configurada
- [ ] `OPENAI_API_KEY` configurada
- [ ] `INNGEST_EVENT_KEY` configurada
- [ ] `INNGEST_SIGNING_KEY` configurada
- [ ] App Inngest creada y endpoint configurado
- [ ] `STRIPE_SECRET_KEY` configurada (si usas pagos)
- [ ] `CRON_SECRET` configurada
- [ ] `NEXT_PUBLIC_BASE_URL` = `https://annalogica.eu`
- [ ] Redespliegue completado
- [ ] Sitio web carga sin error 404
- [ ] Funcionalidad de transcripción probada

---

## 🎯 Próximos Pasos

Una vez que la app esté funcionando:

1. Configura Stripe para pagos
2. Configura Resend para emails
3. Configura Upstash para rate limiting
4. Monitorea logs en Vercel para detectar errores

---

**¿Necesitas ayuda?** Revisa los logs en:
- Vercel: https://vercel.com/solammedia-9886s-projects/annalogica/logs
- Inngest: https://app.inngest.com/env/production/functions
