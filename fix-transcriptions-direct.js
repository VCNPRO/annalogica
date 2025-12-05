// Aplicar migración directamente con sql``
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixTable() {
  console.log('\n🔧 AGREGANDO COLUMNAS A TRANSCRIPTIONS\n');
  console.log('='.repeat(60));

  try {
    // 1. language
    console.log('\n1️⃣  Agregando columna language...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN language VARCHAR(10) DEFAULT 'auto'`;
      console.log('   ✅ Columna language agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 2. vtt_url
    console.log('\n2️⃣  Agregando columna vtt_url...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN vtt_url TEXT`;
      console.log('   ✅ Columna vtt_url agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 3. speakers_url
    console.log('\n3️⃣  Agregando columna speakers_url...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN speakers_url TEXT`;
      console.log('   ✅ Columna speakers_url agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 4. tags
    console.log('\n4️⃣  Agregando columna tags...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN tags JSONB`;
      console.log('   ✅ Columna tags agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 5. audio_duration_seconds
    console.log('\n5️⃣  Agregando columna audio_duration_seconds...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN audio_duration_seconds INTEGER`;
      console.log('   ✅ Columna audio_duration_seconds agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 6. metadata
    console.log('\n6️⃣  Agregando columna metadata...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN metadata JSONB`;
      console.log('   ✅ Columna metadata agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ MIGRACIÓN COMPLETADA\n');

    // Verificar columnas
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transcriptions'
      ORDER BY ordinal_position
    `;

    console.log('Columnas actuales:\n');
    const requiredColumns = ['language', 'vtt_url', 'speakers_url', 'tags', 'audio_duration_seconds', 'metadata'];
    for (const row of result.rows) {
      const isRequired = requiredColumns.includes(row.column_name);
      const mark = isRequired ? '✅' : '  ';
      console.log(`   ${mark} ${row.column_name.padEnd(30)} ${row.data_type}`);
    }

    console.log('\n✅ Todas las columnas necesarias están presentes\n');
    console.log('Ahora puedes intentar procesar archivos nuevamente en https://annalogica.eu\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixTable();
