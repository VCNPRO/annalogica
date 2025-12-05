// Probar creación de job localmente
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function testJobCreation() {
  console.log('\n🧪 PROBANDO CREACIÓN DE JOB\n');
  console.log('='.repeat(60));

  try {
    // 1. Obtener un usuario de prueba
    const userResult = await sql`SELECT id, email FROM users LIMIT 1`;
    if (userResult.rows.length === 0) {
      console.log('❌ No hay usuarios en la BD');
      return;
    }

    const testUser = userResult.rows[0];
    console.log(`\n1️⃣  Usuario de prueba: ${testUser.email}`);

    // 2. Intentar crear un job (simulando lo que hace /api/process)
    const testData = {
      userId: testUser.id,
      filename: 'test-video.mp4',
      audioUrl: 'https://example.com/test-video.mp4',
      language: 'es'
    };

    console.log(`\n2️⃣  Creando job con datos:`);
    console.log(`   userId: ${testData.userId}`);
    console.log(`   filename: ${testData.filename}`);
    console.log(`   audioUrl: ${testData.audioUrl}`);
    console.log(`   language: ${testData.language}`);

    const jobResult = await sql`
      INSERT INTO transcription_jobs (
        user_id,
        filename,
        audio_url,
        language,
        audio_size_bytes,
        file_type,
        status
      ) VALUES (
        ${testData.userId},
        ${testData.filename},
        ${testData.audioUrl},
        ${testData.language},
        NULL,
        'audio',
        'pending'
      )
      RETURNING id, status, created_at
    `;

    const job = jobResult.rows[0];
    console.log(`\n3️⃣  ✅ Job creado exitosamente:`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Created: ${job.created_at}`);

    // 4. Limpiar job de prueba
    await sql`DELETE FROM transcription_jobs WHERE id = ${job.id}`;
    console.log(`\n4️⃣  ✅ Job de prueba eliminado`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ LA CREACIÓN DE JOBS FUNCIONA CORRECTAMENTE\n');
    console.log('El error debe estar en otra parte del código de /api/process\n');
    console.log('Posibles causas:');
    console.log('   1. Error en la autenticación (verifyRequestAuth)');
    console.log('   2. Error en checkSeparateQuotas');
    console.log('   3. Error en el procesamiento (processAudioFile)');
    console.log('   4. Error en algún import o dependencia\n');

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    console.error('\nDetalles completos:');
    console.error(error);
  }
}

testJobCreation();
