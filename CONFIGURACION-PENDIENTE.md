# ⚙️ CONFIGURACIÓN PENDIENTE EN VERCEL

## 🚨 CRÍTICO - Hacer ANTES de beta:

### 1. Upstash Redis (Rate Limiting)

**Pasos en Vercel:**
1. Ve a https://vercel.com/dashboard
2. Selecciona proyecto `annalogica`
3. **Storage** → **Marketplace**
4. Busca **Upstash** (Serverless DB - Redis)
5. Click **Add Integration**
6. Configuración:
   - Region: **Europe (Dublin o Frankfurt)**
   - Plan: **Free** (10K comandos/día)
   - Entornos: **✓ Production, ✓ Preview, ✓ Development**
7. Click **Create**

**Auto-configura estas variables:**
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Verificación:**
- Después del deploy, intenta hacer login 6 veces con contraseña incorrecta
- Deberías ver: "Demasiados intentos. Intenta en X minutos"

---

### 2. Ejecutar Schema SQL en Neon (Ya hecho ✅)

Ya ejecutaste:
```sql
CREATE TABLE users (...);
CREATE TABLE transcriptions (...);
```

---

### 3. Variables de entorno actuales en Vercel

Verifica que tienes:
- ✅ `JWT_SECRET`
- ✅ `BLOB_READ_WRITE_TOKEN`
- ✅ `CLAUDE_API_KEY`
- ✅ `REPLICATE_API_TOKEN`
- ✅ `POSTGRES_URL` (y otras de Neon)
- 🔲 `UPSTASH_REDIS_REST_URL` ← **Pendiente**
- 🔲 `UPSTASH_REDIS_REST_TOKEN` ← **Pendiente**

---

## 📊 Después de Upstash: Dashboard de Costes

Implementaremos:
- Tabla `usage_logs` para trackear todo
- Endpoint `/api/admin/usage` con métricas
- Página `/admin/dashboard` con gráficas

**Métricas que registraremos:**
- Archivos subidos (MB por usuario)
- Transcripciones procesadas (duración, coste Whisper)
- Resúmenes generados (tokens, coste Claude)
- Descargas realizadas (bandwidth)
- **Coste estimado por usuario**

---

## ✅ Lista de verificación Beta Launch

- [x] Base de datos Neon Postgres
- [x] Autenticación JWT
- [x] Validación archivos
- [x] Rate limiting (código listo)
- [ ] Upstash Redis configurado ← **TÚ HACES ESTO**
- [x] Páginas legales
- [ ] Dashboard costes ← **LO HAGO YO AHORA**
- [ ] Testing beta con 5 usuarios
- [ ] Monitoreo errores (opcional)

---

## 🎯 ACCIÓN INMEDIATA

**TÚ:** Configura Upstash Redis en Vercel (5 minutos)
**YO:** Mientras tanto, empiezo el dashboard de costes
