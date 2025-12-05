// Verificar estructura de tabla transcriptions
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkTable() {
  console.log('\n📊 ESTRUCTURA DE TABLA TRANSCRIPTIONS\n');
  console.log('='.repeat(80));

  // Ver columnas de la tabla
  const result = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'transcriptions'
    ORDER BY ordinal_position
  `;

  console.log('\nColumnas existentes:\n');
  for (const row of result.rows) {
    console.log(`   ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  }

  // Verificar si existe la columna "language"
  const hasLanguage = result.rows.find(r => r.column_name === 'language');

  if (!hasLanguage) {
    console.log('\n❌ PROBLEMA: La columna "language" NO existe');
    console.log('\n✅ SOLUCIÓN: Agregar columna "language" a la tabla');
    console.log('\nSQL para agregar la columna:');
    console.log('```sql');
    console.log('ALTER TABLE transcriptions ADD COLUMN language VARCHAR(10) DEFAULT \'auto\';');
    console.log('```\n');
  } else {
    console.log('\n✅ La columna "language" existe');
  }

  console.log('='.repeat(80) + '\n');
}

checkTable().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
