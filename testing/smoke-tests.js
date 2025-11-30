/**
 * SMOKE TESTS - Pruebas rápidas de funcionalidad básica
 *
 * Verifica que las funcionalidades críticas estén operativas
 *
 * Uso:
 *   node testing/smoke-tests.js [environment]
 *
 * Ejemplo:
 *   node testing/smoke-tests.js prod
 */

const https = require('https');
const http = require('http');

// ============================================
// CONFIGURACIÓN
// ============================================

const ENVIRONMENTS = {
  local: 'http://localhost:3000',
  prod: 'https://annalogica.eu',
  staging: 'https://annalogica-staging.vercel.app'
};

const TESTS = [
  {
    name: 'Homepage carga correctamente',
    url: '/',
    expectedStatus: 200,
    expectedContent: 'annalogica'
  },
  {
    name: 'API Health Check responde',
    url: '/api/health',
    expectedStatus: 200,
    expectedContent: 'ok'
  },
  {
    name: 'API Version responde',
    url: '/api/version',
    expectedStatus: 200
  },
  {
    name: 'Pricing page carga',
    url: '/pricing',
    expectedStatus: 200
  },
  {
    name: 'Login page carga',
    url: '/login',
    expectedStatus: 200
  },
  {
    name: 'Admin redirect funciona',
    url: '/admin',
    expectedStatus: [200, 302, 307, 401, 403]  // 307 = Temporary Redirect
  },
  {
    name: 'API requiere autenticación',
    url: '/api/processed-files',
    expectedStatus: [401, 403]
  },
  {
    name: 'Endpoint inexistente retorna 404',
    url: '/ruta-que-no-existe-12345',
    expectedStatus: 404
  }
];

// ============================================
// UTILIDADES
// ============================================

function request(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const startTime = Date.now();

    const req = client.get(url, (res) => {
      let body = '';

      res.on('data', chunk => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body,
          responseTime: Date.now() - startTime,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function runTest(baseUrl, test) {
  const url = `${baseUrl}${test.url}`;

  try {
    const response = await request(url);

    // Verificar status code
    const expectedStatuses = Array.isArray(test.expectedStatus)
      ? test.expectedStatus
      : [test.expectedStatus];

    const statusMatch = expectedStatuses.includes(response.statusCode);

    if (!statusMatch) {
      return {
        success: false,
        error: `Status code ${response.statusCode} no esperado (esperaba ${expectedStatuses.join(' o ')})`
      };
    }

    // Verificar contenido si está especificado
    if (test.expectedContent) {
      const contentMatch = response.body.toLowerCase().includes(test.expectedContent.toLowerCase());

      if (!contentMatch) {
        return {
          success: false,
          error: `Contenido esperado "${test.expectedContent}" no encontrado en la respuesta`
        };
      }
    }

    return {
      success: true,
      statusCode: response.statusCode,
      responseTime: response.responseTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const env = process.argv[2] || 'prod';
  const baseUrl = ENVIRONMENTS[env];

  if (!baseUrl) {
    console.error(`❌ Environment inválido: ${env}`);
    console.error(`   Opciones: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              ANNALOGICA - SMOKE TESTS                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Environment: ${env}`);
  console.log(`🔗 URL: ${baseUrl}`);
  console.log('');

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const test of TESTS) {
    process.stdout.write(`⏳ ${test.name}... `);

    const result = await runTest(baseUrl, test);

    if (result.success) {
      console.log(`✅ (${result.responseTime}ms)`);
      passed++;
    } else {
      console.log(`❌`);
      console.log(`   Error: ${result.error}`);
      failed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('═'.repeat(65));
  console.log('  RESUMEN');
  console.log('═'.repeat(65));
  console.log(`  ✅ Pasaron:  ${passed}/${TESTS.length}`);
  console.log(`  ❌ Fallaron: ${failed}/${TESTS.length}`);
  console.log(`  ⏱️  Duración: ${duration}s`);
  console.log('═'.repeat(65));
  console.log('');

  if (failed === 0) {
    console.log('🎉 TODOS LOS SMOKE TESTS PASARON\n');
    process.exit(0);
  } else {
    console.log('💥 ALGUNOS SMOKE TESTS FALLARON\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runTest, TESTS };
