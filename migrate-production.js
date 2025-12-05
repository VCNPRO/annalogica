// Aplicar migración en base de datos de PRODUCCIÓN
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function migrateProduction() {
  console.log('\n🚀 APLICANDO MIGRACIÓN EN PRODUCCIÓN\n');
  console.log('='.repeat(60));
  console.log(`\nBase de datos: ${process.env.POSTGRES_URL?.substring(0, 50)}...\n`);

  try {
    const results = [];

    // 1. language
    console.log('1️⃣  Agregando columna language...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'auto'`;
      results.push('✅ language');
      console.log('   ✅ Agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push('⚠️  language (ya existía)');
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 2. vtt_url
    console.log('\n2️⃣  Agregando columna vtt_url...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS vtt_url TEXT`;
      results.push('✅ vtt_url');
      console.log('   ✅ Agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push('⚠️  vtt_url (ya existía)');
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 3. speakers_url
    console.log('\n3️⃣  Agregando columna speakers_url...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS speakers_url TEXT`;
      results.push('✅ speakers_url');
      console.log('   ✅ Agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push('⚠️  speakers_url (ya existía)');
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 4. tags
    console.log('\n4️⃣  Agregando columna tags...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS tags JSONB`;
      results.push('✅ tags');
      console.log('   ✅ Agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push('⚠️  tags (ya existía)');
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 5. audio_duration_seconds
    console.log('\n5️⃣  Agregando columna audio_duration_seconds...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER`;
      results.push('✅ audio_duration_seconds');
      console.log('   ✅ Agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push('⚠️  audio_duration_seconds (ya existía)');
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    // 6. metadata
    console.log('\n6️⃣  Agregando columna metadata...');
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS metadata JSONB`;
      results.push('✅ metadata');
      console.log('   ✅ Agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push('⚠️  metadata (ya existía)');
        console.log('   ⚠️  Ya existe');
      } else {
        throw e;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ MIGRACIÓN EN PRODUCCIÓN COMPLETADA\n');
    console.log('Resultados:');
    for (const result of results) {
      console.log(`   ${result}`);
    }

    // Verificar columnas
    console.log('\n🔍 Verificando columnas en producción...\n');
    const columnsResult = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transcriptions'
      ORDER BY ordinal_position
    `;

    const requiredColumns = ['language', 'vtt_url', 'speakers_url', 'tags', 'audio_duration_seconds', 'metadata'];
    console.log('Columnas en la tabla transcriptions:\n');
    for (const row of columnsResult.rows) {
      const isRequired = requiredColumns.includes(row.column_name);
      const mark = isRequired ? '✅' : '  ';
      console.log(`   ${mark} ${row.column_name.padEnd(30)} ${row.data_type}`);
    }

    // Verificar que todas existan
    const existingColumns = columnsResult.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log('\n' + '='.repeat(60));
      console.log('\n🎉 ¡TODO LISTO! La base de datos está actualizada.\n');
      console.log('Ahora puedes probar el procesamiento de archivos en:');
      console.log('👉 https://annalogica.eu\n');
    } else {
      console.log(`\n❌ Aún faltan columnas: ${missingColumns.join(', ')}\n`);
    }

  } catch (error) {
    console.error('\n❌ Error en migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateProduction();
