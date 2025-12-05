// Verificar usuarios y cuotas
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkUsers() {
  console.log('\n👥 VERIFICANDO USUARIOS Y CUOTAS\n');
  console.log('=' .repeat(80));

  // Ver todos los usuarios
  const usersResult = await sql`
    SELECT
      id,
      email,
      name,
      role,
      subscription_plan,
      subscription_status,
      monthly_quota_docs,
      monthly_quota_audio_minutes,
      monthly_usage_docs,
      monthly_usage_audio_minutes,
      max_pages_per_pdf,
      quota_reset_date
    FROM users
    ORDER BY created_at DESC
  `;

  console.log(`\n📊 Total de usuarios: ${usersResult.rows.length}\n`);

  if (usersResult.rows.length === 0) {
    console.log('⚠️  No hay usuarios en la base de datos');
    console.log('   Solución: Registra al menos un usuario en https://annalogica.eu/register\n');
    return;
  }

  for (const user of usersResult.rows) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`👤 Usuario: ${user.email} (${user.name || 'Sin nombre'})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   Plan: ${user.subscription_plan || 'NULL ❌'}`);
    console.log(`   Estado: ${user.subscription_status || 'NULL ❌'}`);
    console.log(`\n   📦 Cuota Documentos: ${user.monthly_quota_docs || 'NULL ❌'} / Uso: ${user.monthly_usage_docs || 0}`);
    console.log(`   🎵 Cuota Audio (min): ${user.monthly_quota_audio_minutes || 'NULL ❌'} / Uso: ${user.monthly_usage_audio_minutes || 0}`);
    console.log(`   📄 Max Páginas PDF: ${user.max_pages_per_pdf || 'NULL ❌'}`);
    console.log(`   🔄 Reset Date: ${user.quota_reset_date || 'NULL ❌'}`);

    // Verificar si tiene valores NULL en campos críticos
    const nullFields = [];
    if (!user.subscription_plan) nullFields.push('subscription_plan');
    if (!user.subscription_status) nullFields.push('subscription_status');
    if (!user.monthly_quota_docs) nullFields.push('monthly_quota_docs');
    if (!user.monthly_quota_audio_minutes) nullFields.push('monthly_quota_audio_minutes');
    if (!user.max_pages_per_pdf) nullFields.push('max_pages_per_pdf');

    if (nullFields.length > 0) {
      console.log(`\n   ⚠️  PROBLEMA: Este usuario tiene campos NULL que bloquearán el procesamiento:`);
      console.log(`      ${nullFields.join(', ')}`);
      console.log(`\n   ✅ SOLUCIÓN: Ejecuta la siguiente consulta SQL:`);
      console.log(`\n   UPDATE users SET`);
      console.log(`     subscription_plan = 'free',`);
      console.log(`     subscription_status = 'free',`);
      console.log(`     monthly_quota_docs = 10,`);
      console.log(`     monthly_quota_audio_minutes = 10,`);
      console.log(`     monthly_usage_docs = 0,`);
      console.log(`     monthly_usage_audio_minutes = 0,`);
      console.log(`     max_pages_per_pdf = 50,`);
      console.log(`     quota_reset_date = CURRENT_DATE + INTERVAL '1 month'`);
      console.log(`   WHERE id = '${user.id}';\n`);
    } else {
      console.log(`\n   ✅ Este usuario tiene todas las cuotas configuradas correctamente`);
    }
  }

  console.log(`\n${'='.repeat(80)}\n`);

  // Verificar si hay jobs pendientes o en procesamiento
  const jobsResult = await sql`
    SELECT status, COUNT(*) as count
    FROM transcriptions
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY status
  `;

  console.log('\n📊 Estado de jobs (últimos 7 días):\n');
  if (jobsResult.rows.length === 0) {
    console.log('   No hay jobs recientes');
  } else {
    for (const row of jobsResult.rows) {
      console.log(`   ${row.status.padEnd(20)} - ${row.count} jobs`);
    }
  }

  console.log('\n');
}

checkUsers().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
