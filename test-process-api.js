// Test para simular el procesamiento de audio
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const { sql } = require('@vercel/postgres');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testProcessing() {
  console.log('\n🧪 SIMULANDO PROCESAMIENTO DE AUDIO\n');
  console.log('='.repeat(60));

  // Test 1: Verificar que OpenAI funciona
  console.log('\n1️⃣  Probando OpenAI API...\n');
  try {
    const models = await openai.models.list();
    console.log('   ✅ OpenAI API funciona');
  } catch (error) {
    console.log('   ❌ Error en OpenAI:', error.message);
    return;
  }

  // Test 2: Verificar creación de job
  console.log('\n2️⃣  Probando creación de job en BD...\n');
  try {
    // Obtener un usuario de prueba
    const usersResult = await sql`
      SELECT id, email FROM users LIMIT 1
    `;

    if (usersResult.rows.length === 0) {
      console.log('   ❌ No hay usuarios en la BD');
      return;
    }

    const testUser = usersResult.rows[0];
    console.log(`   Usuario de prueba: ${testUser.email}`);

    // Intentar crear un job de prueba
    const testAudioUrl = 'https://example.com/test.mp3';
    const testFilename = 'test-audio.mp3';
    const testLanguage = 'es';

    const jobResult = await sql`
      INSERT INTO transcriptions (
        user_id,
        filename,
        audio_url,
        language,
        status,
        created_at
      ) VALUES (
        ${testUser.id},
        ${testFilename},
        ${testAudioUrl},
        ${testLanguage},
        'pending',
        NOW()
      )
      RETURNING id, status
    `;

    const jobId = jobResult.rows[0].id;
    console.log(`   ✅ Job de prueba creado: ${jobId}`);

    // Limpiar job de prueba
    await sql`DELETE FROM transcriptions WHERE id = ${jobId}`;
    console.log('   ✅ Job de prueba eliminado');

  } catch (error) {
    console.log('   ❌ Error creando job:', error.message);
    console.log('   Detalles:', error);
    return;
  }

  // Test 3: Verificar imports del procesador
  console.log('\n3️⃣  Verificando módulo de procesamiento...\n');
  try {
    const { processAudioFile } = require('./lib/processors/audio-processor.ts');
    console.log('   ✅ Módulo de procesamiento cargado correctamente');
  } catch (error) {
    console.log('   ❌ Error cargando módulo:', error.message);
    console.log('   Esto podría ser el problema principal');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Todos los tests básicos pasaron\n');
  console.log('El error debe estar en el procesamiento específico del archivo.');
  console.log('Revisa los logs de Vercel para más detalles.\n');
}

testProcessing().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
