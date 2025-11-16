#!/usr/bin/env node

/**
 * Script de verificación de configuración
 * Verifica que todas las variables de entorno críticas estén configuradas
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN - ANNALOGICA\n');
console.log('='.repeat(60));

// Cargar variables de entorno desde .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('\n❌ ERROR CRÍTICO: .env.local no encontrado\n');
  console.log('Ejecuta: cp .env.example .env.local');
  process.exit(1);
}

// Parse .env.local
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

console.log(`\n✅ Archivo .env.local encontrado en: ${envPath}\n`);

// Definir variables requeridas por categoría
const requiredEnvVars = {
  critical: {
    label: '🔴 VARIABLES CRÍTICAS (OBLIGATORIAS)',
    vars: [
      { name: 'POSTGRES_URL', desc: 'Conexión a PostgreSQL' },
      { name: 'BLOB_READ_WRITE_TOKEN', desc: 'Vercel Blob Storage' },
      { name: 'JWT_SECRET', desc: 'Secret para tokens JWT' },
      { name: 'OPENAI_API_KEY', desc: 'API de OpenAI (Whisper)' },
      { name: 'INNGEST_EVENT_KEY', desc: 'Inngest - Event Key' },
      { name: 'INNGEST_SIGNING_KEY', desc: 'Inngest - Signing Key' }
    ]
  },
  important: {
    label: '🟡 VARIABLES IMPORTANTES (Recomendadas)',
    vars: [
      { name: 'UPSTASH_REDIS_REST_URL', desc: 'Redis para rate limiting' },
      { name: 'UPSTASH_REDIS_REST_TOKEN', desc: 'Redis token' },
      { name: 'CRON_SECRET', desc: 'Seguridad para cron jobs' },
      { name: 'RESEND_API_KEY', desc: 'Emails con Resend' },
      { name: 'ADMIN_EMAIL', desc: 'Email del administrador' }
    ]
  },
  optional: {
    label: '🟢 VARIABLES OPCIONALES',
    vars: [
      { name: 'STRIPE_SECRET_KEY', desc: 'Pagos con Stripe' },
      { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', desc: 'Stripe (público)' },
      { name: 'SENTRY_AUTH_TOKEN', desc: 'Monitoreo de errores' },
      { name: 'GEMINI_API_KEY', desc: 'Google Gemini (asistente IA)' }
    ]
  }
};

let hasErrors = false;
let hasCriticalErrors = false;

// Función para verificar si una variable está configurada
function isConfigured(value) {
  return value && value.trim() !== '' && value !== 'undefined' && value !== 'null';
}

// Verificar cada categoría
Object.keys(requiredEnvVars).forEach(category => {
  const { label, vars } = requiredEnvVars[category];

  console.log(`\n${label}`);
  console.log('-'.repeat(60));

  let categoryMissing = 0;

  vars.forEach(({ name, desc }) => {
    const value = envVars[name];
    const configured = isConfigured(value);

    if (configured) {
      // Mostrar parcialmente el valor (primeros 10 caracteres)
      const displayValue = value.length > 20
        ? `${value.substring(0, 20)}...`
        : value;
      console.log(`  ✅ ${name.padEnd(35)} ${desc}`);
      console.log(`     ${displayValue}`);
    } else {
      console.log(`  ❌ ${name.padEnd(35)} ${desc}`);
      console.log(`     [NO CONFIGURADO]`);
      categoryMissing++;

      if (category === 'critical') {
        hasCriticalErrors = true;
      }
      hasErrors = true;
    }
  });

  if (categoryMissing > 0) {
    console.log(`\n  ⚠️  ${categoryMissing} variable(s) sin configurar en esta categoría`);
  } else {
    console.log(`\n  ✨ Todas las variables de esta categoría están configuradas`);
  }
});

// Resumen final
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMEN DE CONFIGURACIÓN\n');

if (!hasCriticalErrors && !hasErrors) {
  console.log('✅ ¡Perfecto! Todas las variables están configuradas correctamente.');
  console.log('\nPuedes iniciar el servidor con: npm run dev');
  process.exit(0);
} else if (hasCriticalErrors) {
  console.log('❌ HAY VARIABLES CRÍTICAS SIN CONFIGURAR');
  console.log('\nEl servidor no funcionará correctamente sin estas variables.');
  console.log('\n📝 SIGUIENTE PASO:');
  console.log('1. Ve a: https://vercel.com/solammedia-9886s-projects/annalogica/settings/environment-variables');
  console.log('2. Copia las variables de "Production" a tu .env.local');
  console.log('3. Guarda el archivo y reinicia el servidor');
  process.exit(1);
} else {
  console.log('⚠️  Algunas variables opcionales no están configuradas');
  console.log('\nEl servidor funcionará, pero algunas características estarán limitadas:');
  console.log('- Sin Redis: No habrá rate limiting');
  console.log('- Sin Stripe: No se podrán procesar pagos');
  console.log('- Sin Resend: No se enviarán emails');
  console.log('- Sin Sentry: No se monitorizarán errores');
  console.log('\n✅ Puedes iniciar el servidor con: npm run dev');
  process.exit(0);
}
