// Script para aplicar la migración de columnas faltantes
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');
const fs = require('fs');

async function applyMigration() {
  console.log('\n🔧 APLICANDO MIGRACIÓN: Agregar columnas faltantes a transcriptions\n');
  console.log('='.repeat(80));

  try {
    // Leer el archivo SQL
    const migrationSQL = fs.readFileSync('./migrations/fix-transcriptions-columns.sql', 'utf8');

    // Dividir en statements individuales
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\n📝 Ejecutando ${statements.length} statements...\n`);

    let successCount = 0;
    for (const statement of statements) {
      // Saltar comentarios y líneas vacías
      if (statement.startsWith('--') || statement.trim() === '') continue;

      try {
        console.log(`   Ejecutando: ${statement.substring(0, 60)}...`);
        await sql.query(statement);
        successCount++;
        console.log('   ✅ Éxito');
      } catch (error) {
        // Si el error es que la columna ya existe, está bien
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('   ⚠️  Ya existe (ignorado)');
          successCount++;
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Migración completada: ${successCount}/${statements.length} statements exitosos\n`);

    // Verificar las columnas ahora
    console.log('🔍 Verificando columnas actualizadas...\n');
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transcriptions'
      ORDER BY ordinal_position
    `;

    const requiredColumns = ['language', 'vtt_url', 'speakers_url', 'tags', 'audio_duration_seconds', 'metadata'];
    console.log('Columnas en la tabla:\n');
    for (const row of result.rows) {
      const isRequired = requiredColumns.includes(row.column_name);
      const mark = isRequired ? '✅' : '  ';
      console.log(`   ${mark} ${row.column_name.padEnd(30)} ${row.data_type}`);
    }

    // Verificar que todas las columnas requeridas existan
    const existingColumns = result.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log('\n✅ Todas las columnas requeridas están presentes\n');
      console.log('='.repeat(80));
      console.log('\n✅ MIGRACIÓN EXITOSA - Puedes reintentar el procesamiento\n');
    } else {
      console.log(`\n❌ Faltan columnas: ${missingColumns.join(', ')}\n`);
    }

  } catch (error) {
    console.error('\n❌ Error aplicando migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
