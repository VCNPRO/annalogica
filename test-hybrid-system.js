// Script de testing para verificar el sistema híbrido Speechmatics + Deepgram
require('dotenv').config({ path: '.env.local' });

async function testHybridSystem() {
  console.log('\n🧪 TEST: VERIFICACIÓN SISTEMA HÍBRIDO (Speechmatics + Deepgram)\n');
  console.log('='.repeat(80));

  const checks = {
    passed: [],
    failed: [],
    warnings: []
  };

  // TEST 1: Verificar que @speechmatics/batch-client está instalado
  console.log('\n1️⃣  Verificando instalación de @speechmatics/batch-client...');
  try {
    const { BatchClient } = require('@speechmatics/batch-client');
    if (BatchClient) {
      checks.passed.push('✅ @speechmatics/batch-client instalado correctamente');
      console.log('   ✅ Paquete @speechmatics/batch-client encontrado');
    }
  } catch (error) {
    checks.failed.push('❌ @speechmatics/batch-client no está instalado');
    console.log('   ❌ Error:', error.message);
  }

  // TEST 2: Verificar que @deepgram/sdk está instalado
  console.log('\n2️⃣  Verificando instalación de @deepgram/sdk...');
  try {
    const { createClient } = require('@deepgram/sdk');
    if (createClient) {
      checks.passed.push('✅ @deepgram/sdk instalado correctamente');
      console.log('   ✅ Paquete @deepgram/sdk encontrado');
    }
  } catch (error) {
    checks.failed.push('❌ @deepgram/sdk no está instalado');
    console.log('   ❌ Error:', error.message);
  }

  // TEST 3: Verificar variable SPEECHMATICS_API_KEY
  console.log('\n3️⃣  Verificando variable SPEECHMATICS_API_KEY...');
  if (process.env.SPEECHMATICS_API_KEY) {
    const key = process.env.SPEECHMATICS_API_KEY;
    if (key === 'your_speechmatics_api_key_here') {
      checks.warnings.push('⚠️  SPEECHMATICS_API_KEY es el valor por defecto (no configurada)');
      console.log('   ⚠️  Variable existe pero no está configurada');
      console.log('   📝 Debes reemplazarla con tu API key de Speechmatics');
    } else if (key.length > 20) {
      checks.passed.push('✅ SPEECHMATICS_API_KEY configurada correctamente');
      console.log('   ✅ Variable configurada:', key.substring(0, 10) + '...');
    } else {
      checks.warnings.push('⚠️  SPEECHMATICS_API_KEY parece incorrecta (muy corta)');
      console.log('   ⚠️  La API key parece incorrecta');
    }
  } else {
    checks.failed.push('❌ SPEECHMATICS_API_KEY no existe en .env.local');
    console.log('   ❌ Variable no encontrada en .env.local');
  }

  // TEST 4: Verificar variable DEEPGRAM_API_KEY
  console.log('\n4️⃣  Verificando variable DEEPGRAM_API_KEY...');
  if (process.env.DEEPGRAM_API_KEY) {
    const key = process.env.DEEPGRAM_API_KEY;
    if (key === 'your_deepgram_api_key_here') {
      checks.warnings.push('⚠️  DEEPGRAM_API_KEY es el valor por defecto (no configurada)');
      console.log('   ⚠️  Variable existe pero no está configurada');
    } else if (key.length > 20) {
      checks.passed.push('✅ DEEPGRAM_API_KEY configurada correctamente');
      console.log('   ✅ Variable configurada:', key.substring(0, 10) + '...');
    }
  } else {
    checks.failed.push('❌ DEEPGRAM_API_KEY no existe');
    console.log('   ❌ Variable no encontrada');
  }

  // TEST 5: Verificar código de audio-processor.ts
  console.log('\n5️⃣  Verificando código de audio-processor.ts...');
  try {
    const fs = require('fs');
    const processorCode = fs.readFileSync('lib/processors/audio-processor.ts', 'utf-8');

    // Verificar imports
    if (processorCode.includes("import { BatchClient } from '@speechmatics/batch-client'")) {
      checks.passed.push('✅ audio-processor.ts importa Speechmatics BatchClient');
      console.log('   ✅ Import de Speechmatics encontrado');
    } else {
      checks.failed.push('❌ audio-processor.ts no importa Speechmatics');
      console.log('   ❌ Import de Speechmatics no encontrado');
    }

    if (processorCode.includes("import { createClient } from '@deepgram/sdk'")) {
      checks.passed.push('✅ audio-processor.ts importa Deepgram');
      console.log('   ✅ Import de Deepgram encontrado');
    } else {
      checks.failed.push('❌ audio-processor.ts no importa Deepgram');
      console.log('   ❌ Import de Deepgram no encontrado');
    }

    // Verificar lógica híbrida
    if (processorCode.includes("jobLanguage === 'eu' || jobLanguage === 'gl'")) {
      checks.passed.push('✅ Lógica híbrida implementada (eu/gl → Speechmatics)');
      console.log('   ✅ Condición para euskera/gallego encontrada');
    } else {
      checks.failed.push('❌ Lógica híbrida no implementada');
      console.log('   ❌ Condición para idiomas no encontrada');
    }

    if (processorCode.includes('speechmatics.transcribe')) {
      checks.passed.push('✅ Llamada a Speechmatics API implementada');
      console.log('   ✅ Método transcribe de Speechmatics encontrado');
    } else {
      checks.failed.push('❌ Llamada a Speechmatics API no encontrada');
      console.log('   ❌ Método transcribe no encontrado');
    }

    if (processorCode.includes('deepgram.listen.prerecorded.transcribeUrl')) {
      checks.passed.push('✅ Llamada a Deepgram API mantenida');
      console.log('   ✅ Método transcribeUrl de Deepgram encontrado');
    } else {
      checks.failed.push('❌ Llamada a Deepgram API no encontrada');
      console.log('   ❌ Método transcribeUrl no encontrado');
    }

  } catch (error) {
    checks.failed.push('❌ No se pudo leer audio-processor.ts');
    console.log('   ❌ Error:', error.message);
  }

  // TEST 6: Verificar package.json
  console.log('\n6️⃣  Verificando package.json...');
  try {
    const fs = require('fs');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

    if (packageJson.dependencies['@speechmatics/batch-client']) {
      checks.passed.push('✅ @speechmatics/batch-client en package.json');
      console.log('   ✅ Dependencia encontrada:', packageJson.dependencies['@speechmatics/batch-client']);
    } else {
      checks.failed.push('❌ @speechmatics/batch-client no en package.json');
      console.log('   ❌ Dependencia no encontrada');
    }

    if (packageJson.dependencies['@deepgram/sdk']) {
      checks.passed.push('✅ @deepgram/sdk en package.json');
      console.log('   ✅ Dependencia encontrada:', packageJson.dependencies['@deepgram/sdk']);
    } else {
      checks.failed.push('❌ @deepgram/sdk no en package.json');
      console.log('   ❌ Dependencia no encontrada');
    }

  } catch (error) {
    checks.failed.push('❌ No se pudo leer package.json');
    console.log('   ❌ Error:', error.message);
  }

  // RESUMEN FINAL
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESUMEN DE TESTS\n');

  if (checks.passed.length > 0) {
    console.log('✅ TESTS PASADOS:');
    checks.passed.forEach(check => console.log('   ' + check));
    console.log('');
  }

  if (checks.warnings.length > 0) {
    console.log('⚠️  ADVERTENCIAS:');
    checks.warnings.forEach(check => console.log('   ' + check));
    console.log('');
  }

  if (checks.failed.length > 0) {
    console.log('❌ TESTS FALLIDOS:');
    checks.failed.forEach(check => console.log('   ' + check));
    console.log('');
  }

  // Estado final
  const totalTests = checks.passed.length + checks.failed.length + checks.warnings.length;
  const passRate = ((checks.passed.length / totalTests) * 100).toFixed(0);

  console.log('='.repeat(80));
  console.log(`\n📈 RESULTADO: ${checks.passed.length}/${totalTests} tests pasados (${passRate}%)\n`);

  if (checks.failed.length === 0) {
    console.log('🎉 ¡SISTEMA HÍBRIDO CONFIGURADO!');
    console.log('');
    console.log('Próximos pasos:');
    console.log('   1. Si hay warnings, configura las API keys pendientes');
    console.log('   2. Obtén API key de Speechmatics: https://portal.speechmatics.com/api-keys');
    console.log('   3. Ejecuta "npm run build" para verificar TypeScript');
    console.log('   4. Prueba con archivos en euskera/gallego');
    console.log('   5. Deploy a producción: git push && vercel --prod');
    console.log('');
    console.log('📋 FUNCIONAMIENTO:');
    console.log('   • Euskera (eu) → Speechmatics ($0.24/hora)');
    console.log('   • Gallego (gl) → Speechmatics ($0.24/hora)');
    console.log('   • Otros idiomas → Deepgram ($0.39/hora)');
    console.log('');
  } else {
    console.log('⚠️  CONFIGURACIÓN INCOMPLETA');
    console.log('');
    console.log('Acciones requeridas:');
    console.log('   1. Resuelve los tests fallidos arriba');
    console.log('   2. Ejecuta este script nuevamente');
    console.log('   3. Una vez que todos los tests pasen, continúa con build y deploy');
    console.log('');
  }
}

// Ejecutar tests
testHybridSystem().catch(error => {
  console.error('\n❌ Error fatal en tests:', error);
  process.exit(1);
});
