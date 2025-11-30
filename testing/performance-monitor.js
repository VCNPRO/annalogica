/**
 * PERFORMANCE MONITOR - Monitoreo en tiempo real de Annalogica
 *
 * Monitorea métricas clave de rendimiento en producción
 *
 * Uso:
 *   node testing/performance-monitor.js [duration_in_minutes]
 *
 * Ejemplo:
 *   node testing/performance-monitor.js 60   # Monitorear durante 1 hora
 */

const https = require('https');
const http = require('http');

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  targetUrl: process.env.TARGET_URL || 'https://annalogica.eu',
  checkInterval: 30000, // 30 segundos entre checks
  alertThresholds: {
    responseTime: 3000,    // Alert si > 3s
    errorRate: 5,          // Alert si > 5% errores
    availability: 99.9     // Alert si < 99.9% disponibilidad
  }
};

const ENDPOINTS_TO_MONITOR = [
  { path: '/', name: 'Homepage' },
  { path: '/api/health', name: 'Health Check' },
  { path: '/api/version', name: 'Version API' },
  { path: '/pricing', name: 'Pricing Page' },
  { path: '/login', name: 'Login Page' }
];

// ============================================
// CLASE DE MÉTRICAS
// ============================================

class PerformanceMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now()
    };
  }

  recordRequest(endpoint, responseTime, success, error = null) {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.totalResponseTime += responseTime;
      this.metrics.responseTimes.push({
        endpoint,
        time: responseTime,
        timestamp: Date.now()
      });
    } else {
      this.metrics.failedRequests++;
      this.metrics.errors.push({
        endpoint,
        error: error?.message || 'Unknown error',
        timestamp: Date.now()
      });
    }
  }

  getStats() {
    const { totalRequests, successfulRequests, failedRequests, totalResponseTime, responseTimes } = this.metrics;

    if (totalRequests === 0) {
      return {
        availability: 100,
        errorRate: 0,
        avgResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        totalRequests: 0
      };
    }

    // Calcular percentiles
    const sortedTimes = responseTimes.map(r => r.time).sort((a, b) => a - b);
    const p50Index = Math.floor(sortedTimes.length * 0.50);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      availability: ((successfulRequests / totalRequests) * 100).toFixed(2),
      errorRate: ((failedRequests / totalRequests) * 100).toFixed(2),
      avgResponseTime: Math.round(totalResponseTime / successfulRequests) || 0,
      p50: sortedTimes[p50Index] || 0,
      p95: sortedTimes[p95Index] || 0,
      p99: sortedTimes[p99Index] || 0,
      totalRequests,
      successfulRequests,
      failedRequests
    };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now()
    };
  }
}

// ============================================
// FUNCIONES DE MONITOREO
// ============================================

async function checkEndpoint(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, (res) => {
      const responseTime = Date.now() - startTime;

      // Consumir respuesta para liberar conexión
      res.on('data', () => {});
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 400;
        resolve({
          success,
          responseTime,
          statusCode: res.statusCode,
          error: success ? null : new Error(`HTTP ${res.statusCode}`)
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        responseTime,
        statusCode: 0,
        error
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        success: false,
        responseTime: 10000,
        statusCode: 0,
        error: new Error('Timeout')
      });
    });
  });
}

async function monitorEndpoints(metrics) {
  const results = [];

  for (const endpoint of ENDPOINTS_TO_MONITOR) {
    const url = `${CONFIG.targetUrl}${endpoint.path}`;
    const result = await checkEndpoint(url);

    metrics.recordRequest(
      endpoint.name,
      result.responseTime,
      result.success,
      result.error
    );

    results.push({
      ...endpoint,
      ...result
    });
  }

  return results;
}

function displayResults(results, stats) {
  console.clear();

  // Header
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         ANNALOGICA - PERFORMANCE MONITOR                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Estadísticas globales
  console.log('📊 ESTADÍSTICAS GLOBALES');
  console.log('─'.repeat(65));
  console.log(`  Disponibilidad:    ${stats.availability}%  ${getStatusIcon(stats.availability, 99.9)}`);
  console.log(`  Tasa de error:     ${stats.errorRate}%  ${getStatusIcon(100 - stats.errorRate, 95)}`);
  console.log(`  Requests totales:  ${stats.totalRequests}`);
  console.log(`    ✅ Exitosos:     ${stats.successfulRequests}`);
  console.log(`    ❌ Fallidos:     ${stats.failedRequests}`);
  console.log('');

  // Tiempos de respuesta
  console.log('⏱️  TIEMPOS DE RESPUESTA');
  console.log('─'.repeat(65));
  console.log(`  Promedio:          ${stats.avgResponseTime}ms`);
  console.log(`  P50 (mediana):     ${stats.p50}ms`);
  console.log(`  P95:               ${stats.p95}ms ${getResponseTimeIcon(stats.p95)}`);
  console.log(`  P99:               ${stats.p99}ms ${getResponseTimeIcon(stats.p99)}`);
  console.log('');

  // Estado por endpoint
  console.log('🌐 ESTADO POR ENDPOINT');
  console.log('─'.repeat(65));
  console.log('  Endpoint                    Status    Time      Code');
  console.log('─'.repeat(65));

  for (const result of results) {
    const statusIcon = result.success ? '✅' : '❌';
    const timePadded = `${result.responseTime}ms`.padEnd(9);
    const namePadded = result.name.padEnd(25);
    const code = result.statusCode || 'ERR';

    console.log(`  ${namePadded} ${statusIcon}   ${timePadded} ${code}`);
  }

  console.log('');
  console.log(`📅 Última actualización: ${new Date().toLocaleTimeString()}`);
  console.log(`⏳ Próxima actualización en ${CONFIG.checkInterval / 1000}s`);
  console.log('');

  // Alertas
  checkAlerts(stats);
}

function getStatusIcon(value, threshold) {
  return value >= threshold ? '✅' : '⚠️';
}

function getResponseTimeIcon(time) {
  if (time < 1000) return '🟢';
  if (time < 2000) return '🟡';
  return '🔴';
}

function checkAlerts(stats) {
  const alerts = [];

  if (stats.avgResponseTime > CONFIG.alertThresholds.responseTime) {
    alerts.push(`⚠️  ALERTA: Tiempo de respuesta alto (${stats.avgResponseTime}ms > ${CONFIG.alertThresholds.responseTime}ms)`);
  }

  if (parseFloat(stats.errorRate) > CONFIG.alertThresholds.errorRate) {
    alerts.push(`⚠️  ALERTA: Tasa de error alta (${stats.errorRate}% > ${CONFIG.alertThresholds.errorRate}%)`);
  }

  if (parseFloat(stats.availability) < CONFIG.alertThresholds.availability) {
    alerts.push(`🚨 ALERTA CRÍTICA: Disponibilidad baja (${stats.availability}% < ${CONFIG.alertThresholds.availability}%)`);
  }

  if (alerts.length > 0) {
    console.log('🔔 ALERTAS ACTIVAS');
    console.log('─'.repeat(65));
    alerts.forEach(alert => console.log(`  ${alert}`));
    console.log('');
  }
}

// ============================================
// EXPORTAR MÉTRICAS A JSON
// ============================================

function exportMetricsToFile(metrics, filename = 'performance-metrics.json') {
  const fs = require('fs');
  const stats = metrics.getStats();
  const data = {
    timestamp: new Date().toISOString(),
    stats,
    rawMetrics: metrics.metrics
  };

  fs.writeFileSync(
    filename,
    JSON.stringify(data, null, 2)
  );

  console.log(`📁 Métricas exportadas a: ${filename}`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const durationMinutes = parseInt(process.argv[2]) || 60;
  const endTime = Date.now() + (durationMinutes * 60 * 1000);

  console.log(`🚀 Iniciando monitoreo de: ${CONFIG.targetUrl}`);
  console.log(`⏱️  Duración: ${durationMinutes} minutos`);
  console.log(`📊 Intervalo de checks: ${CONFIG.checkInterval / 1000}s`);
  console.log('');
  console.log('Presiona Ctrl+C para detener...');
  console.log('');

  const metrics = new PerformanceMetrics();

  // Manejar Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n📊 RESUMEN FINAL\n');
    const finalStats = metrics.getStats();
    console.log(JSON.stringify(finalStats, null, 2));
    exportMetricsToFile(metrics);
    process.exit(0);
  });

  // Loop principal
  while (Date.now() < endTime) {
    const results = await monitorEndpoints(metrics);
    const stats = metrics.getStats();
    displayResults(results, stats);

    // Esperar antes del siguiente check
    await new Promise(resolve => setTimeout(resolve, CONFIG.checkInterval));
  }

  // Exportar métricas finales
  console.log('\n\n✅ Monitoreo completado\n');
  const finalStats = metrics.getStats();
  console.log(JSON.stringify(finalStats, null, 2));
  exportMetricsToFile(metrics);
}

if (require.main === module) {
  main();
}

module.exports = { PerformanceMetrics, checkEndpoint };
