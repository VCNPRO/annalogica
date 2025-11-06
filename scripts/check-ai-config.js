// Script para verificar la configuración del Asistente de IA
require('dotenv').config({ path: '.env.local' });

console.log('\n🤖 Verificando configuración del Asistente de IA...\n');

const checks = [
  {
    name: 'Feature Flag',
    key: 'NEXT_PUBLIC_ENABLE_AI_ASSISTANT',
    value: process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT,
    expected: 'true',
  },
  {
    name: 'API Key de Gemini',
    key: 'GEMINI_API_KEY',
    value: process.env.GEMINI_API_KEY,
    expected: 'una API key válida (no "tu_api_key_aqui")',
  },
];

let allGood = true;

checks.forEach(check => {
  const isConfigured = check.value && check.value !== 'tu_api_key_aqui' && check.value !== 'tu_gemini_api_key_aqui';
  const status = isConfigured ? '✅' : '❌';

  console.log(`${status} ${check.name}:`);

  if (isConfigured) {
    if (check.key === 'GEMINI_API_KEY') {
      console.log(`   ${check.key}=${check.value.substring(0, 20)}... (oculto por seguridad)`);
    } else {
      console.log(`   ${check.key}=${check.value}`);
    }
  } else {
    console.log(`   ${check.key}=${check.value || 'NO CONFIGURADO'}`);
    console.log(`   ⚠️  Se esperaba: ${check.expected}`);
    allGood = false;
  }
  console.log();
});

if (allGood) {
  console.log('🎉 ¡Todo configurado correctamente!\n');
  console.log('📋 Próximos pasos:');
  console.log('   1. Ejecuta: npm run dev');
  console.log('   2. Abre: http://localhost:3000');
  console.log('   3. Busca el botón flotante azul en la esquina inferior derecha\n');
} else {
  console.log('⚠️  Configuración incompleta\n');
  console.log('📋 Para configurar:');
  console.log('   1. Obtén tu API key: https://aistudio.google.com/app/apikey');
  console.log('   2. Edita .env.local y reemplaza "tu_api_key_aqui" con tu API key real');
  console.log('   3. Ejecuta este script de nuevo: node scripts/check-ai-config.js\n');
  console.log('📖 Más información en: setup-ai-assistant.md\n');
}
