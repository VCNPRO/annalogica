# 🔍 Annalogica - Sistema de Monitoreo y Detección de Errores

Sistema completo de monitoreo 24/7 con alertas automáticas por email a **santi@annalogica.eu**

## 📋 Componentes del Sistema

### 1. **GitHub Actions** (Automático)
- ✅ Tests automáticos en cada push
- ✅ Health checks cada 15 minutos
- ✅ Alertas por email automáticas
- ✅ Tests de carga programados

### 2. **Error Detector** (Local/Servidor)
- 🔍 Monitoreo continuo de endpoints
- 📧 Alertas inmediatas por email
- 📊 Estadísticas en tiempo real
- 🚨 Detección de degradación de performance

---

## 🚀 GitHub Actions (Ya configurado)

### Workflows Activos

#### 1. **automated-tests.yml**

**Ejecuta automáticamente:**
- ✅ En cada push a `main`
- ✅ En cada pull request
- ✅ Cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)
- ✅ Manualmente desde GitHub

**Tests que ejecuta:**
1. **Smoke Tests** - Verificación rápida de endpoints críticos
2. **Language Fix Tests** - Verificación del fix de idiomas
3. **Build Test** - Compilación del proyecto
4. **Security Audit** - Búsqueda de vulnerabilidades
5. **Stress Test** - Solo en ejecución manual/programada

**Notificaciones:**
- 📧 Email a santi@annalogica.eu si algo falla
- 💬 Comentario en PRs con resultados
- 🏷️ Creación de issues si hay incidentes

#### 2. **health-check.yml**

**Ejecuta cada 15 minutos:**
- 🏥 Health check de `/api/health`
- 🌐 Verificación de homepage
- ⏱️ Medición de performance
- 🔍 Detección de endpoints lentos (>3s)

**Alertas:**
- 🚨 Email inmediato si health check falla
- ⚠️ Email si performance degrada
- 📋 Creación automática de issues con label `incident`

---

## 🔍 Error Detector (Ejecución Local)

### Instalación

No requiere instalación adicional, usa Node.js nativo.

### Configurar Variables de Entorno

Crea `.env.monitoring`:

```bash
# URL de producción
PRODUCTION_URL=https://annalogica.eu

# Email de alertas
ALERT_EMAIL=santi@annalogica.eu

# Resend API Key (para enviar emails)
RESEND_API_KEY=re_tu_api_key_aqui
```

### Ejecutar

```bash
# Con variables de entorno
RESEND_API_KEY=tu_key node monitoring/error-detector.js

# O usando .env
source .env.monitoring
node monitoring/error-detector.js

# En background (Linux/Mac)
nohup node monitoring/error-detector.js > error-detector.log 2>&1 &

# En background (Windows con pm2)
npm install -g pm2
pm2 start monitoring/error-detector.js --name annalogica-monitor
```

### Qué Monitorea

| Endpoint | Frecuencia | Acción si Falla |
|----------|------------|-----------------|
| `/api/health` | 1 min | Email después de 3 fallos consecutivos |
| `/api/version` | 1 min | Email después de 3 fallos consecutivos |
| `/` (homepage) | 1 min | Email después de 3 fallos consecutivos |
| `/api/auth/login` | 1 min | Email después de 3 fallos consecutivos |

### Ejemplo de Salida

```
╔════════════════════════════════════════════════════════════════╗
║          ANNALOGICA - ERROR DETECTION SYSTEM                  ║
╚════════════════════════════════════════════════════════════════╝

🌐 Monitoring: https://annalogica.eu
📧 Alerts to: santi@annalogica.eu
⏱️  Check interval: 60s
🚨 Alert threshold: 3 consecutive failures

======================================================================
  Monitoring Check - 14/11/2025, 15:23:45
======================================================================

📡 Checking: Health Check (https://annalogica.eu/api/health)
   ✅ OK - 200 (234ms)

📡 Checking: Version API (https://annalogica.eu/api/version)
   ✅ OK - 200 (189ms)

📡 Checking: Homepage (https://annalogica.eu/)
   ✅ OK - 200 (456ms)

📡 Checking: Login API (https://annalogica.eu/api/auth/login)
   ✅ OK - 200 (312ms)

======================================================================
  RESUMEN DEL CHECK
======================================================================
  Endpoints OK: 4/4
  Endpoints FAIL: 0/4
  Error Rate Global: 0.00%
  Uptime: 2.34 horas
======================================================================
```

### Cuando Detecta un Error

```
📡 Checking: Health Check (https://annalogica.eu/api/health)
   ❌ FAIL - 500 (Internal Server Error)
   🚨 ENVIANDO ALERTA - 3 fallos consecutivos
   ✅ Email de alerta enviado correctamente
```

---

## 📧 Emails de Alerta

### Tipos de Alertas

#### 1. **Test Failure** (automated-tests.yml)
**Asunto:** `❌ Annalogica Tests - failure`

```
Hola Santi,

Reporte de tests automáticos de Annalogica:

📊 RESUMEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estado: failure
Trigger: push
Branch: main
Commit: abc123...

🧪 RESULTADOS DE TESTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Smoke Tests: failure
Language Tests: success
Build Test: success
Security Audit: success

🔗 Ver detalles: https://github.com/...
```

#### 2. **Critical Health Check Failure** (health-check.yml)
**Asunto:** `🚨 ALERTA CRÍTICA: Annalogica Health Check Failed`

```
🚨 ALERTA CRÍTICA - ACCIÓN INMEDIATA REQUERIDA

Hola Santi,

El sistema de monitoreo ha detectado un problema crítico en producción.

📊 ESTADO DEL SISTEMA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Health API: 500
Homepage: 200 (2.3s)
Performance: false

⏰ DETECCIÓN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timestamp: 2025-11-14 15:30:00 UTC

🔗 ACCIONES INMEDIATAS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Vercel Dashboard: https://vercel.com/...
2. Logs detallados: https://github.com/...
3. Verificar servicios: OpenAI, Vercel Postgres, Stripe
```

#### 3. **Performance Warning** (health-check.yml)
**Asunto:** `⚠️ Annalogica: Performance Degradation Detected`

```
⚠️ ADVERTENCIA DE PERFORMANCE

Hola Santi,

Se ha detectado degradación en el rendimiento de algunos endpoints.

📊 ENDPOINTS LENTOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/api/health (4.2s)
/pricing (3.8s)

El sistema sigue operativo pero con tiempos de respuesta elevados (>3s).
```

#### 4. **Error Detector Alert** (error-detector.js)
**Asunto:** `🚨 ALERTA CRÍTICA: Health Check DOWN`

```
🚨 ALERTA CRÍTICA - Annalogica

Endpoint: Health Check
URL: https://annalogica.eu/api/health
Estado: CAÍDO
Fallos consecutivos: 3

Detalles del último error:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status Code: 500
Error: Internal Server Error
Response Time: 234ms
Timestamp: 2025-11-14T15:30:00.000Z

ACCIÓN REQUERIDA:
1. Verificar Vercel Dashboard
2. Revisar logs de aplicación
3. Verificar servicios externos
```

---

## ⚙️ Configuración en GitHub

### 1. **Agregar Secret RESEND_API_KEY**

Ve a GitHub repository → Settings → Secrets and variables → Actions → New repository secret

**Name:** `RESEND_API_KEY`
**Value:** Tu API key de Resend (obtener en https://resend.com/api-keys)

### 2. **Verificar que los Workflows estén activos**

GitHub repository → Actions → Deberías ver:
- ✅ 🧪 Automated Tests & Monitoring
- ✅ 🏥 Health Check & Error Detection

### 3. **Ejecutar Test Manual**

GitHub repository → Actions → 🧪 Automated Tests & Monitoring → Run workflow

---

## 📊 Monitoring Dashboard (GitHub)

Puedes ver el estado en tiempo real en:

https://github.com/VCNPRO/annalogica/actions

**Badges que puedes agregar al README:**

```markdown
![Tests](https://github.com/VCNPRO/annalogica/actions/workflows/automated-tests.yml/badge.svg)
![Health](https://github.com/VCNPRO/annalogica/actions/workflows/health-check.yml/badge.svg)
```

---

## 🚨 Procedimiento de Respuesta a Incidentes

### Cuando Recibes una Alerta

#### 1. **Verificar Severidad**
- 🚨 **CRÍTICA**: Health check caído → Revisar INMEDIATAMENTE
- ⚠️ **ALTA**: Performance degradada → Revisar en <1h
- ℹ️ **INFO**: Test fallido → Revisar en <24h

#### 2. **Verificar Vercel Dashboard**
https://vercel.com/solammedia-9886s-projects/annalogica
- Ver último deployment
- Revisar logs de errores
- Verificar métricas de uso

#### 3. **Revisar GitHub Actions**
- Clic en el enlace del email
- Ver logs completos
- Identificar el error específico

#### 4. **Verificar Servicios Externos**
- [OpenAI Status](https://status.openai.com/)
- [Vercel Status](https://www.vercel-status.com/)
- [Stripe Status](https://status.stripe.com/)

#### 5. **Acciones Correctivas**
- Si es código: hacer hotfix y push
- Si es configuración: ajustar en Vercel Dashboard
- Si es servicio externo: esperar resolución

---

## 🔧 Troubleshooting

### "No se envían emails"

```bash
# Verificar que RESEND_API_KEY esté configurado
echo $RESEND_API_KEY

# Probar envío manual
curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "alerts@annalogica.eu",
    "to": "santi@annalogica.eu",
    "subject": "Test",
    "text": "Test email"
  }'
```

### "GitHub Actions no se ejecuta"

1. Verifica que los workflows estén en `.github/workflows/`
2. Ve a Actions → Enable workflows
3. Haz un push de prueba

### "Demasiadas alertas"

Ajusta los umbrales en `monitoring/error-detector.js`:

```javascript
thresholds: {
  consecutiveFailures: 5,  // Cambiar de 3 a 5
  responseTime: 8000,      // Cambiar de 5s a 8s
}
```

---

## 📞 Soporte

Si algo no funciona:
1. Revisa los logs de GitHub Actions
2. Verifica la configuración de Resend
3. Contacta al equipo de desarrollo

---

**Sistema implementado y listo para usar** ✅
**Última actualización:** 15 noviembre 2025
