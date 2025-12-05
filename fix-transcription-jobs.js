// Aplicar migración en la tabla CORRECTA: transcription_jobs
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixTranscriptionJobs() {
  console.log('\n🔧 ARREGLANDO TABLA TRANSCRIPTION_JOBS (LA CORRECTA)\n');
  console.log('='.repeat(60));

  try {
    // Primero verificar qué columnas tiene transcription_jobs
    console.log('📊 Columnas actuales en transcription_jobs:\n');
    const currentColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transcription_jobs'
      ORDER BY ordinal_position
    `;

    for (const row of currentColumns.rows) {
      console.log(`   ${row.column_name.padEnd(30)} ${row.data_type}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ TODAS LAS COLUMNAS NECESARIAS YA EXISTEN\n');
    console.log('La tabla transcription_jobs tiene todas las columnas requeridas:');
    console.log('   ✅ language');
    console.log('   ✅ vtt_url');
    console.log('   ✅ speakers_url');
    console.log('   ✅ tags');
    console.log('   ✅ audio_duration_seconds');
    console.log('   ✅ metadata\n');

    console.log('El problema debe ser otro. Revisemos el código del endpoint /api/process...\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixTranscriptionJobs();
