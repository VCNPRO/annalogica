// Script para ejecutar migración de processing_progress
// Uso: node scripts/run-migration.js

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  if (!process.env.POSTGRES_URL) {
    console.error('❌ Error: POSTGRES_URL no está configurada');
    console.error('Por favor, asegúrate de tener un archivo .env.local con POSTGRES_URL');
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_URL);

  try {
    console.log('🚀 Ejecutando migración: db-migration-processing-progress.sql');

    // Agregar columna
    console.log('📝 Agregando columna processing_progress...');
    await sql`
      ALTER TABLE transcription_jobs
      ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0
    `;
    console.log('✅ Columna agregada');

    // Actualizar registros existentes
    console.log('📝 Actualizando registros existentes...');
    const updateResult = await sql`
      UPDATE transcription_jobs
      SET processing_progress = CASE
        WHEN status = 'completed' THEN 100
        WHEN status = 'processing' THEN 50
        ELSE 0
      END
      WHERE processing_progress IS NULL
    `;
    console.log(`✅ ${updateResult.length} registros actualizados`);

    // Verificar
    console.log('📝 Verificando columna...');
    const result = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'transcription_jobs'
      AND column_name = 'processing_progress'
    `;

    if (result.length > 0) {
      console.log('✅ Migración completada exitosamente');
      console.log('📊 Columna creada:', result[0]);
    } else {
      console.error('❌ Error: La columna no se creó correctamente');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();
