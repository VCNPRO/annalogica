// Script de diagnóstico para verificar las APIs
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

async function testAPIs() {
  console.log('\n🔍 DIAGNÓSTICO DE APIs - Annalogica\n');
  console.log('=' .repeat(60));

  // 1. Verificar variables de entorno críticas
  console.log('\n1️⃣ Verificando variables de entorno...\n');

  const requiredEnvVars = {
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'BLOB_READ_WRITE_TOKEN': process.env.BLOB_READ_WRITE_TOKEN,
    'POSTGRES_URL': process.env.POSTGRES_URL,
    'JWT_SECRET': process.env.JWT_SECRET,
    'INNGEST_EVENT_KEY': process.env.INNGEST_EVENT_KEY,
    'INNGEST_SIGNING_KEY': process.env.INNGEST_SIGNING_KEY
  };

  let missingVars = [];
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      console.log(`   ❌ ${key}: NO CONFIGURADA`);
      missingVars.push(key);
    } else {
      console.log(`   ✅ ${key}: ${value.substring(0, 20)}...`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n⚠️  Variables faltantes: ${missingVars.join(', ')}`);
    console.log('   Solución: Configura estas variables en .env.local y en Vercel\n');
    return;
  }

  console.log('\n✅ Todas las variables de entorno están configuradas\n');

  // 2. Probar conexión con OpenAI
  console.log('2️⃣ Probando conexión con OpenAI Whisper...\n');

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Test simple: listar modelos
    const models = await openai.models.list();
    const whisperModel = models.data.find(m => m.id === 'whisper-1');

    if (whisperModel) {
      console.log('   ✅ Conexión exitosa con OpenAI');
      console.log('   ✅ Modelo Whisper disponible');
    } else {
      console.log('   ⚠️  Conexión exitosa, pero modelo Whisper no encontrado');
    }
  } catch (error) {
    console.log(`   ❌ Error conectando con OpenAI: ${error.message}`);
    console.log('   Solución: Verifica que tu API key de OpenAI sea válida');
    console.log('   URL: https://platform.openai.com/api-keys\n');
    return;
  }

  // 3. Probar conexión con PostgreSQL
  console.log('\n3️⃣ Probando conexión con PostgreSQL...\n');

  try {
    const { sql } = require('@vercel/postgres');
    const result = await sql`SELECT NOW() as current_time`;
    console.log(`   ✅ Conexión exitosa con PostgreSQL`);
    console.log(`   ✅ Hora del servidor: ${result.rows[0].current_time}`);
  } catch (error) {
    console.log(`   ❌ Error conectando con PostgreSQL: ${error.message}`);
    console.log('   Solución: Verifica que POSTGRES_URL esté configurado correctamente\n');
    return;
  }

  // 4. Verificar tabla de transcriptions
  console.log('\n4️⃣ Verificando tablas de la base de datos...\n');

  try {
    const { sql } = require('@vercel/postgres');
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('transcriptions', 'users', 'subscriptions')
      ORDER BY table_name
    `;

    const tables = result.rows.map(r => r.table_name);
    const requiredTables = ['transcriptions', 'users', 'subscriptions'];

    for (const table of requiredTables) {
      if (tables.includes(table)) {
        console.log(`   ✅ Tabla "${table}" existe`);
      } else {
        console.log(`   ❌ Tabla "${table}" NO existe`);
      }
    }

    // Contar jobs pendientes
    const jobsResult = await sql`
      SELECT status, COUNT(*) as count
      FROM transcriptions
      GROUP BY status
    `;

    console.log('\n   📊 Estado de jobs en la base de datos:');
    for (const row of jobsResult.rows) {
      console.log(`      ${row.status}: ${row.count} jobs`);
    }

  } catch (error) {
    console.log(`   ❌ Error verificando tablas: ${error.message}`);
  }

  // 5. Resumen
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');
  console.log('Si todas las pruebas pasaron, las APIs están funcionando correctamente.');
  console.log('Si ves errores arriba, sigue las soluciones propuestas.\n');
}

testAPIs().catch(err => {
  console.error('❌ Error fatal en diagnóstico:', err);
  process.exit(1);
});
