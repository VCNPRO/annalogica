# 🛡️ Configuración de Upstash Redis (Rate Limiting)

## ⚡ Rate Limiting implementado

**Límites configurados:**
- **Login:** 5 intentos / 5 minutos (anti-brute force)
- **Registro:** 3 usuarios / 1 hora por IP (anti-spam)
- **Upload:** 10 archivos / 1 hora por usuario
- **Procesamiento:** 5 transcripciones / 1 hora por usuario
- **Descargas:** 30 archivos / 1 hora por usuario

---

## 📋 Pasos para configurar Upstash Redis

### Opción 1: Desde Vercel Marketplace (Recomendado)

1. Ve a **Vercel Dashboard** → Proyecto `annalogica`
2. **Storage** → **Marketplace**
3. Busca **Upstash** (Serverless DB - Redis)
4. Click **Add Integration**
5. Selecciona:
   - Region: **Europe (Dublin o Frankfurt)**
   - Plan: **Free** (10,000 comandos/día)
   - Entornos: Production, Preview, Development
6. Click **Create**

Vercel configurará automáticamente:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Opción 2: Manual desde Upstash

1. Ve a https://console.upstash.com/
2. Crea cuenta (gratis con GitHub)
3. **Create Database**:
   - Name: `annalogica-ratelimit`
   - Type: **Global** (multi-region)
   - Region: **EU-West-1** (Irlanda)
4. Copia las credenciales:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. Agrégalas en **Vercel** → Settings → Environment Variables

---

## 🔧 Plan Free de Upstash

**Incluido gratis:**
- 10,000 comandos/día
- 256 MB storage
- TLS/SSL incluido
- Multi-region replication

**Para Annalogica beta (100 usuarios):**
- ~500-1,000 comandos/día
- Totalmente cubierto por plan free ✅

---

## 🚨 Comportamiento sin Redis

Si no configuras Upstash (desarrollo local):
- Rate limiting se **desactiva automáticamente**
- La app funciona normalmente
- Solo activo en producción cuando Redis esté configurado

---

## ✅ Verificación

Después de configurar:
1. Intenta hacer login 6 veces con contraseña incorrecta
2. Deberías ver: `"Demasiados intentos de login. Intenta de nuevo en X minutos"`
3. Check headers de respuesta:
   ```
   X-RateLimit-Limit: 5
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1234567890
   ```

---

## 📊 Monitoring

Dashboard de Upstash muestra:
- Comandos usados/día
- Latencia promedio
- Errores
- Storage usado

**Alertas recomendadas:**
- 80% de límite diario alcanzado
- Upgrade a plan Pro si superas 10K/día
