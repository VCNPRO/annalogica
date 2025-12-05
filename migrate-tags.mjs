import { sql } from '@vercel/postgres';

// Obtener DATABASE_URL del archivo .env
import { readFileSync } from 'fs';
const envContent = readFileSync('.env', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL="(.+?)"/);
if (!dbUrlMatch) {
  console.error('❌ No se encontró DATABASE_URL en .env');
  process.exit(1);
}

process.env.POSTGRES_URL = dbUrlMatch[1];

async function migrate() {
  try {
    console.log('🔄 Aplicando migración de tags...');
    
    await sql`ALTER TABLE transcription_jobs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';`;
    console.log('✅ Columna tags agregada correctamente');
    
    await sql`COMMENT ON COLUMN transcription_jobs.tags IS 'Array of generated tags for the transcription';`;
    console.log('✅ Comentario agregado');
    
    // Verificar
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transcription_jobs' AND column_name = 'tags';
    `;
    
    if (result.rows.length > 0) {
      console.log('✅ Verificación exitosa: Columna tags existe');
      console.log('   Tipo de datos:', result.rows[0].data_type);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrate();
