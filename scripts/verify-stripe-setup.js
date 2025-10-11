#!/usr/bin/env node

/**
 * Script de verificación pre-configuración de Stripe
 * Verifica que todos los archivos necesarios existan antes de comenzar la configuración
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando implementación de Stripe...\n');

let allGood = true;
let warningsCount = 0;
let errorsCount = 0;

// Función helper para verificar archivos
function checkFile(filePath, description, required = true) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    const stats = fs.statSync(fullPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`✅ ${description}`);
    console.log(`   ${filePath} (${sizeKB} KB)\n`);
    return true;
  } else {
    if (required) {
      console.log(`❌ ERROR: ${description}`);
      console.log(`   Archivo faltante: ${filePath}\n`);
      errorsCount++;
      allGood = false;
      return false;
    } else {
      console.log(`⚠️  ADVERTENCIA: ${description}`);
      console.log(`   Archivo faltante: ${filePath}\n`);
      warningsCount++;
      return false;
    }
  }
}

// Función helper para verificar directorio
function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, '..', dirPath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    const files = fs.readdirSync(fullPath);
    console.log(`✅ ${description}`);
    console.log(`   ${dirPath} (${files.length} archivos)\n`);
    return true;
  } else {
    console.log(`❌ ERROR: ${description}`);
    console.log(`   Directorio faltante: ${dirPath}\n`);
    errorsCount++;
    allGood = false;
    return false;
  }
}

console.log('📦 ARCHIVOS DE CONFIGURACIÓN\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

checkFile('lib/stripe/config.ts', 'Configuración de planes de Stripe');
checkFile('lib/stripe/client.ts', 'Cliente de Stripe y funciones helper');
checkFile('lib/subscription-guard.ts', 'Middleware de validación de cuotas');
checkFile('lib/db-migration-stripe.sql', 'Migración SQL para base de datos');

console.log('\n📄 PÁGINAS Y COMPONENTES\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

checkFile('app/pricing/page.tsx', 'Página de planes y precios');
checkFile('app/checkout/success/page.tsx', 'Página de éxito tras pago');
checkFile('app/settings/page.tsx', 'Página de ajustes (con sección de suscripción)');

console.log('\n🔌 API ENDPOINTS\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

checkFile('app/api/stripe/checkout/route.ts', 'API: Crear sesión de checkout');
checkFile('app/api/stripe/portal/route.ts', 'API: Abrir customer portal');
checkFile('app/api/stripe/webhook/route.ts', 'API: Recibir eventos de Stripe');
checkFile('app/api/subscription/status/route.ts', 'API: Estado de suscripción');
checkFile('app/api/cron/reset-quotas/route.ts', 'Cron job: Reset cuotas mensuales');

console.log('\n📚 DOCUMENTACIÓN\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

checkFile('docs/STRIPE-SETUP.md', 'Guía paso a paso de configuración');
checkFile('docs/STRIPE-IMPLEMENTATION-SUMMARY.md', 'Resumen de implementación');
checkFile('docs/STRIPE-GUIDE.md', 'Guía conceptual de Stripe', false); // Opcional - creado en sesión anterior
checkFile('docs/PRICING-STRATEGY.md', 'Estrategia de precios y ventas');
checkFile('STRIPE-READY.md', 'Instrucciones de inicio rápido');

console.log('\n⚙️  CONFIGURACIÓN\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

checkFile('vercel.json', 'Configuración de Vercel (con cron job)');
checkFile('package.json', 'Dependencias del proyecto');

console.log('\n🔍 VERIFICANDO DEPENDENCIAS\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

  const hasStripe = packageJson.dependencies && packageJson.dependencies.stripe;
  const hasStripeJs = packageJson.dependencies && packageJson.dependencies['@stripe/stripe-js'];

  if (hasStripe) {
    console.log(`✅ Dependencia 'stripe' instalada (${packageJson.dependencies.stripe})\n`);
  } else {
    console.log('❌ ERROR: Dependencia \'stripe\' NO instalada\n');
    console.log('   Ejecuta: npm install stripe\n');
    errorsCount++;
    allGood = false;
  }

  if (hasStripeJs) {
    console.log(`✅ Dependencia '@stripe/stripe-js' instalada (${packageJson.dependencies['@stripe/stripe-js']})\n`);
  } else {
    console.log('❌ ERROR: Dependencia \'@stripe/stripe-js\' NO instalada\n');
    console.log('   Ejecuta: npm install @stripe/stripe-js\n');
    errorsCount++;
    allGood = false;
  }
} catch (error) {
  console.log('❌ ERROR: No se pudo leer package.json\n');
  errorsCount++;
  allGood = false;
}

console.log('\n🔧 VERIFICANDO CONFIGURACIÓN DE VERCEL\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));

  const hasCrons = vercelJson.crons && Array.isArray(vercelJson.crons);
  const hasResetQuotas = hasCrons && vercelJson.crons.some(c => c.path === '/api/cron/reset-quotas');

  if (hasCrons) {
    console.log(`✅ Cron jobs configurados (${vercelJson.crons.length} jobs)\n`);
  } else {
    console.log('⚠️  ADVERTENCIA: No hay cron jobs configurados\n');
    warningsCount++;
  }

  if (hasResetQuotas) {
    const cron = vercelJson.crons.find(c => c.path === '/api/cron/reset-quotas');
    console.log(`✅ Cron job de reset de cuotas configurado\n`);
    console.log(`   Ruta: ${cron.path}\n`);
    console.log(`   Schedule: ${cron.schedule} (1º de cada mes a las 00:00 UTC)\n`);
  } else {
    console.log('❌ ERROR: Cron job de reset de cuotas NO configurado\n');
    console.log('   Añade a vercel.json:\n');
    console.log('   {\n');
    console.log('     "path": "/api/cron/reset-quotas",\n');
    console.log('     "schedule": "0 0 1 * *"\n');
    console.log('   }\n');
    errorsCount++;
    allGood = false;
  }
} catch (error) {
  console.log('❌ ERROR: No se pudo leer vercel.json\n');
  errorsCount++;
  allGood = false;
}

console.log('\n📊 RESUMEN DE VERIFICACIÓN\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (allGood && warningsCount === 0) {
  console.log('🎉 ¡PERFECTO! Todos los archivos están en su lugar.\n');
  console.log('✅ La implementación de Stripe está completa y lista para configurar.\n');
  console.log('\n📖 SIGUIENTE PASO:\n');
  console.log('   Abre y lee: docs/STRIPE-SETUP.md\n');
  console.log('   Sigue los pasos desde el inicio.\n');
} else {
  if (errorsCount > 0) {
    console.log(`❌ Se encontraron ${errorsCount} error(es) crítico(s).\n`);
    console.log('   Por favor, corrige estos problemas antes de continuar.\n');
  }

  if (warningsCount > 0) {
    console.log(`⚠️  Se encontraron ${warningsCount} advertencia(s).\n`);
    console.log('   Puedes continuar, pero revisa estos puntos.\n');
  }
}

console.log('\n💡 RECURSOS DISPONIBLES:\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📖 Guía de configuración: docs/STRIPE-SETUP.md');
console.log('📝 Resumen técnico: docs/STRIPE-IMPLEMENTATION-SUMMARY.md');
console.log('💳 Conceptos de Stripe: docs/STRIPE-GUIDE.md');
console.log('💰 Estrategia de precios: docs/PRICING-STRATEGY.md');
console.log('🚀 Inicio rápido: STRIPE-READY.md\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(allGood ? 0 : 1);
