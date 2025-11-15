/**
 * ERROR DETECTOR - Sistema de detección y notificación de errores
 *
 * Monitorea la aplicación en busca de errores y envía alertas por email
 *
 * Uso:
 *   node monitoring/error-detector.js
 */

const https = require('https');

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  productionUrl: process.env.PRODUCTION_URL || 'https://annalogica.eu',
  checkInterval: 60000, // 1 minuto entre checks
  alertEmail: process.env.ALERT_EMAIL || 'santi@annalogica.eu',
  resendApiKey: process.env.RESEND_API_KEY,

  // Umbrales para alertas
  thresholds: {
    responseTime: 5000,      // 5 segundos
    errorRate: 10,           // 10%
    consecutiveFailures: 3,  // 3 fallos seguidos
    healthCheckTimeout: 10000 // 10 segundos timeout
  }
};

// Endpoints críticos a monitorear
const CRITICAL_ENDPOINTS = [
  { path: '/api/health', name: 'Health Check', critical: true },
  { path: '/api/version', name: 'Version API', critical: true },
  { path: '/', name: 'Homepage', critical: true },
  { path: '/api/auth/login', name: 'Login API', critical: true, method: 'OPTIONS' }
];

// ============================================
// ESTADO DEL SISTEMA
// ============================================

class SystemState {
  constructor() {
    this.consecutiveFailures = {};
    this.lastAlertTime = {};
    this.errorHistory = [];
    this.uptimeStart = Date.now();
    this.totalChecks = 0;
    this.failedChecks = 0;
  }

  recordFailure(endpoint) {
    if (!this.consecutiveFailures[endpoint]) {
      this.consecutiveFailures[endpoint] = 0;
    }
    this.consecutiveFailures[endpoint]++;
    this.failedChecks++;
  }

  recordSuccess(endpoint) {
    this.consecutiveFailures[endpoint] = 0;
  }

  shouldAlert(endpoint) {
    const failures = this.consecutiveFailures[endpoint] || 0;
    const lastAlert = this.lastAlertTime[endpoint] || 0;
    const timeSinceLastAlert = Date.now() - lastAlert;

    // Alertar si:
    // 1. Hay fallos consecutivos >= threshold
    // 2. Ha pasado al menos 5 minutos desde la última alerta
    return failures >= CONFIG.thresholds.consecutiveFailures &&
           timeSinceLastAlert > 300000; // 5 minutos
  }

  markAlerted(endpoint) {
    this.lastAlertTime[endpoint] = Date.now();
  }

  addError(error) {
    this.errorHistory.push({
      timestamp: Date.now(),
      ...error
    });

    // Mantener solo últimos 100 errores
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }
  }

  getStats() {
    const uptime = Date.now() - this.uptimeStart;
    const uptimeHours = (uptime / 3600000).toFixed(2);
    const errorRate = this.totalChecks > 0
      ? ((this.failedChecks / this.totalChecks) * 100).toFixed(2)
      : 0;

    return {
      uptime: uptimeHours,
      totalChecks: this.totalChecks,
      failedChecks: this.failedChecks,
      errorRate,
      recentErrors: this.errorHistory.slice(-10)
    };
  }
}

// ============================================
// FUNCIONES DE MONITOREO
// ============================================

async function checkEndpoint(url, timeout = CONFIG.thresholds.healthCheckTimeout) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = https.get(url, {
      timeout: timeout,
      headers: {
        'User-Agent': 'Annalogica-ErrorDetector/1.0'
      }
    }, (res) => {
      const responseTime = Date.now() - startTime;
      let body = '';

      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          responseTime,
          body: body.substring(0, 1000) // Primeros 1000 caracteres
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        statusCode: 0,
        responseTime: timeout,
        error: 'Timeout'
      });
    });
  });
}

async function sendAlertEmail(subject, message) {
  if (!CONFIG.resendApiKey) {
    console.log('⚠️  RESEND_API_KEY no configurado, no se puede enviar email');
    console.log('📧 Email que se hubiera enviado:');
    console.log(`   To: ${CONFIG.alertEmail}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Message: ${message}`);
    return false;
  }

  const emailData = JSON.stringify({
    from: 'Annalogica Error Detector <alerts@annalogica.eu>',
    to: [CONFIG.alertEmail],
    subject: subject,
    text: message
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.resendApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': emailData.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Email de alerta enviado correctamente');
          resolve(true);
        } else {
          console.log(`❌ Error enviando email: ${res.statusCode} ${body}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Error enviando email: ${error.message}`);
      resolve(false);
    });

    req.write(emailData);
    req.end();
  });
}

async function monitorSystem(state) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  Monitoring Check - ${new Date().toLocaleString()}`);
  console.log('='.repeat(70));

  state.totalChecks++;
  const results = [];

  for (const endpoint of CRITICAL_ENDPOINTS) {
    const url = `${CONFIG.productionUrl}${endpoint.path}`;
    console.log(`\n📡 Checking: ${endpoint.name} (${url})`);

    const result = await checkEndpoint(url);
    results.push({ endpoint, result });

    if (result.success) {
      console.log(`   ✅ OK - ${result.statusCode} (${result.responseTime}ms)`);
      state.recordSuccess(endpoint.name);

      // Advertencia si es lento
      if (result.responseTime > CONFIG.thresholds.responseTime) {
        console.log(`   ⚠️  WARNING: Tiempo de respuesta alto (${result.responseTime}ms)`);
      }
    } else {
      console.log(`   ❌ FAIL - ${result.statusCode} (${result.error || 'Unknown'})`);
      state.recordFailure(endpoint.name);

      const error = {
        endpoint: endpoint.name,
        url: url,
        statusCode: result.statusCode,
        error: result.error,
        responseTime: result.responseTime
      };

      state.addError(error);

      // Enviar alerta si aplica
      if (endpoint.critical && state.shouldAlert(endpoint.name)) {
        console.log(`   🚨 ENVIANDO ALERTA - ${state.consecutiveFailures[endpoint.name]} fallos consecutivos`);

        const subject = `🚨 ALERTA CRÍTICA: ${endpoint.name} DOWN`;
        const message = `
🚨 ALERTA CRÍTICA - Annalogica

Endpoint: ${endpoint.name}
URL: ${url}
Estado: CAÍDO
Fallos consecutivos: ${state.consecutiveFailures[endpoint.name]}

Detalles del último error:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status Code: ${result.statusCode || 'N/A'}
Error: ${result.error || 'Unknown'}
Response Time: ${result.responseTime}ms
Timestamp: ${new Date().toISOString()}

Estadísticas del sistema:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(state.getStats(), null, 2)}

ACCIÓN REQUERIDA:
1. Verificar Vercel Dashboard
2. Revisar logs de aplicación
3. Verificar servicios externos

---
Annalogica Error Detection System
https://annalogica.eu
        `.trim();

        await sendAlertEmail(subject, message);
        state.markAlerted(endpoint.name);
      }
    }
  }

  // Resumen del check
  const failedCount = results.filter(r => !r.result.success).length;
  const stats = state.getStats();

  console.log(`\n${'='.repeat(70)}`);
  console.log('  RESUMEN DEL CHECK');
  console.log('='.repeat(70));
  console.log(`  Endpoints OK: ${results.length - failedCount}/${results.length}`);
  console.log(`  Endpoints FAIL: ${failedCount}/${results.length}`);
  console.log(`  Error Rate Global: ${stats.errorRate}%`);
  console.log(`  Uptime: ${stats.uptime} horas`);
  console.log('='.repeat(70));
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          ANNALOGICA - ERROR DETECTION SYSTEM                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Monitoring: ${CONFIG.productionUrl}`);
  console.log(`📧 Alerts to: ${CONFIG.alertEmail}`);
  console.log(`⏱️  Check interval: ${CONFIG.checkInterval / 1000}s`);
  console.log(`🚨 Alert threshold: ${CONFIG.thresholds.consecutiveFailures} consecutive failures`);
  console.log('');
  console.log('Presiona Ctrl+C para detener...');
  console.log('');

  const state = new SystemState();

  // Check inicial
  await monitorSystem(state);

  // Loop de monitoreo
  setInterval(async () => {
    await monitorSystem(state);
  }, CONFIG.checkInterval);

  // Reporte cada hora
  setInterval(() => {
    const stats = state.getStats();
    console.log('\n📊 REPORTE HORARIO:');
    console.log(JSON.stringify(stats, null, 2));
  }, 3600000); // 1 hora

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n📊 ESTADÍSTICAS FINALES:');
    console.log(JSON.stringify(state.getStats(), null, 2));
    console.log('\n👋 Error detector detenido\n');
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}

module.exports = { checkEndpoint, sendAlertEmail };
