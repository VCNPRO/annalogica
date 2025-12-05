// Script para aplicar la migración de tags en producción
import { sql } from '@vercel/postgres';

async function applyTagsMigration() {
  try {
    console.log('Aplicando migración de tags...');
    
    // Agregar columna tags
    await sql`
      ALTER TABLE transcription_jobs
      ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `;
    
    console.log('✅ Columna tags agregada');
    
    // Agregar comentario
    await sql`
      COMMENT ON COLUMN transcription_jobs.tags IS 'Array of generated tags for the transcription';
    `;
    
    console.log('✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

applyTagsMigration();
