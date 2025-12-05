// Verificar esquema de la base de datos
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkSchema() {
  console.log('\n📊 VERIFICANDO ESQUEMA DE LA BASE DE DATOS\n');
  console.log('=' .repeat(60));

  // Ver todas las tablas
  console.log('\n📋 Tablas existentes:\n');
  const tablesResult = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  for (const row of tablesResult.rows) {
    console.log(`   - ${row.table_name}`);
  }

  // Ver estructura de tabla users
  console.log('\n\n👤 Estructura de la tabla "users":\n');
  const usersSchema = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `;

  for (const row of usersSchema.rows) {
    console.log(`   ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  }

  // Ver si hay columna subscription_tier en users
  const hasSubTier = usersSchema.rows.find(r => r.column_name === 'subscription_tier');

  if (hasSubTier) {
    console.log('\n   ✅ La tabla "users" tiene la columna "subscription_tier"');

    // Ver valores de subscription_tier
    const tiersResult = await sql`
      SELECT subscription_tier, COUNT(*) as count
      FROM users
      GROUP BY subscription_tier
    `;

    console.log('\n   📊 Distribución de planes:');
    for (const row of tiersResult.rows) {
      console.log(`      ${(row.subscription_tier || 'NULL').padEnd(15)} - ${row.count} usuarios`);
    }
  } else {
    console.log('\n   ❌ La tabla "users" NO tiene la columna "subscription_tier"');
    console.log('   ⚠️  Esto podría causar problemas con el sistema de cuotas');
  }

  // Verificar sistema de cuotas
  console.log('\n\n💰 Verificando sistema de cuotas:\n');

  const quotaColumns = ['audio_minutes_used', 'docs_processed', 'subscription_tier'];
  for (const col of quotaColumns) {
    const hasColumn = usersSchema.rows.find(r => r.column_name === col);
    if (hasColumn) {
      console.log(`   ✅ Columna "${col}" existe`);
    } else {
      console.log(`   ❌ Columna "${col}" NO existe`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

checkSchema().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
