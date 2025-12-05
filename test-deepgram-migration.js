// Script de testing para verificar la migración a Deepgram
require('dotenv').config({ path: '.env.local' });

async function testDeepgramMigration() {
  console.log('\n🧪 TEST: VERIFICACIÓN DE MIGRACIÓN A DEEPGRAM\n');
  console.log('='.repeat(70));

  const checks = {
    passed: [],
    failed: [],
    warnings: []
  };

  // TEST 1: Verificar que @deepgram/sdk está instalado
  console.log('\n1️⃣  Verificando instalación de @deepgram/sdk...');
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

  // TEST 2: Verificar variable de entorno DEEPGRAM_API_KEY
  console.log('\n2️⃣  Verificando variable DEEPGRAM_API_KEY...');
  if (process.env.DEEPGRAM_API_KEY) {
    const key = process.env.DEEPGRAM_API_KEY;
    if (key === 'your_deepgram_api_key_here') {
      checks.warnings.push('⚠️  DEEPGRAM_API_KEY es el valor por defecto (no configurada)');
      console.log('   ⚠️  Variable existe pero no está configurada');
      console.log('   📝 Debes reemplazarla con tu API key real de Deepgram');
    } else if (key.length > 20) {
      checks.passed.push('✅ DEEPGRAM_API_KEY configurada correctamente');
      console.log('   ✅ Variable configurada:', key.substring(0, 10) + '...');
    } else {
      checks.warnings.push('⚠️  DEEPGRAM_API_KEY parece incorrecta (muy corta)');
      console.log('   ⚠️  La API key parece incorrecta');
    }
  } else {
    checks.failed.push('❌ DEEPGRAM_API_KEY no existe en .env.local');
    console.log('   ❌ Variable no encontrada en .env.local');
  }

  // TEST 3: Verificar que OpenAI API key sigue configurada
  console.log('\n3️⃣  Verificando variable OPENAI_API_KEY...');
  if (process.env.OPENAI_API_KEY) {
    const key = process.env.OPENAI_API_KEY;
    if (key.startsWith('sk-')) {
      checks.passed.push('✅ OPENAI_API_KEY configurada (para resúmenes)');
      console.log('   ✅ Variable configurada:', key.substring(0, 10) + '...');
    } else {
      checks.warnings.push('⚠️  OPENAI_API_KEY no tiene formato esperado');
      console.log('   ⚠️  La API key no empieza con sk-');
    }
  } else {
    checks.failed.push('❌ OPENAI_API_KEY no configurada (necesaria para resúmenes)');
    console.log('   ❌ Variable no encontrada');
  }

  // TEST 4: Verificar que audio-processor.ts importa Deepgram
  console.log('\n4️⃣  Verificando código de audio-processor.ts...');
  try {
    const fs = require('fs');
    const processorCode = fs.readFileSync('lib/processors/audio-processor.ts', 'utf-8');

    if (processorCode.includes("import { createClient } from '@deepgram/sdk'")) {
      checks.passed.push('✅ audio-processor.ts importa Deepgram');
      console.log('   ✅ Import de Deepgram encontrado');
    } else {
      checks.failed.push('❌ audio-processor.ts no importa Deepgram');
      console.log('   ❌ Import de Deepgram no encontrado');
    }

    if (processorCode.includes('deepgram.listen.prerecorded.transcribeUrl')) {
      checks.passed.push('✅ audio-processor.ts usa Deepgram API');
      console.log('   ✅ Llamada a Deepgram API encontrada');
    } else {
      checks.failed.push('❌ audio-processor.ts no usa Deepgram API');
      console.log('   ❌ Llamada a Deepgram API no encontrada');
    }

    if (processorCode.includes('model: "whisper-1"')) {
      checks.warnings.push('⚠️  audio-processor.ts aún tiene código de Whisper');
      console.log('   ⚠️  Código de Whisper encontrado (debería estar eliminado)');
    }

    if (processorCode.includes("model: 'nova-3'")) {
      checks.passed.push('✅ audio-processor.ts usa modelo Deepgram Nova-3');
      console.log('   ✅ Modelo Nova-3 configurado');
    }
  } catch (error) {
    checks.failed.push('❌ No se pudo leer audio-processor.ts');
    console.log('   ❌ Error:', error.message);
  }

  // TEST 5: Verificar conexión a Deepgram (opcional, solo si API key está configurada)
  if (process.env.DEEPGRAM_API_KEY && process.env.DEEPGRAM_API_KEY !== 'your_deepgram_api_key_here') {
    console.log('\n5️⃣  Probando conexión a Deepgram API...');
    try {
      const { createClient } = require('@deepgram/sdk');
      const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

      // Test con un audio de ejemplo público
      const testUrl = 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav';

      console.log('   📡 Enviando request de prueba a Deepgram...');
      const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
        { url: testUrl },
        {
          model: 'nova-3',
          smart_format: true
        }
      );

      if (error) {
        checks.failed.push('❌ Error al conectar con Deepgram API');
        console.log('   ❌ Error de API:', error.message);
      } else if (result) {
        const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        if (transcript) {
          checks.passed.push('✅ Conexión exitosa a Deepgram API');
          console.log('   ✅ Transcripción de prueba recibida');
          console.log('   📝 Texto:', transcript.substring(0, 50) + '...');
        }
      }
    } catch (error) {
      checks.failed.push('❌ Error al probar Deepgram API');
      console.log('   ❌ Error:', error.message);
    }
  } else {
    console.log('\n5️⃣  Test de conexión a Deepgram API omitido');
    console.log('   ⏭️  API key no configurada, saltando test de conexión');
    checks.warnings.push('⏭️  Test de conexión omitido (API key no configurada)');
  }

  // RESUMEN FINAL
  console.log('\n' + '='.repeat(70));
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

  console.log('='.repeat(70));
  console.log(`\n📈 RESULTADO: ${checks.passed.length}/${totalTests} tests pasados (${passRate}%)\n`);

  if (checks.failed.length === 0) {
    console.log('🎉 ¡MIGRACIÓN COMPLETA!');
    console.log('');
    console.log('Próximos pasos:');
    console.log('   1. Si hay warnings, resuelve las configuraciones pendientes');
    console.log('   2. Ejecuta "npm run dev" para probar localmente');
    console.log('   3. Sube un archivo de audio de prueba');
    console.log('   4. Verifica que la transcripción funciona correctamente');
    console.log('   5. Deploy a producción: git push && vercel --prod');
    console.log('');
  } else {
    console.log('⚠️  MIGRACIÓN INCOMPLETA');
    console.log('');
    console.log('Acciones requeridas:');
    console.log('   1. Resuelve los tests fallidos arriba');
    console.log('   2. Ejecuta este script nuevamente');
    console.log('   3. Una vez que todos los tests pasen, continúa con deploy');
    console.log('');
  }

  console.log('📖 Para más información, revisa: INSTRUCCIONES-DEEPGRAM.md\n');
}

// Ejecutar tests
testDeepgramMigration().catch(error => {
  console.error('\n❌ Error fatal en tests:', error);
  process.exit(1);
});
