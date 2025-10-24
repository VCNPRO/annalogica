// Script para ejecutar migración de cuotas separadas
// Uso: node scripts/run-migration-separate-quotas.js

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Iniciando migración de cuotas separadas...\n');

  try {
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', 'separate-quotas.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Archivo de migración leído:', migrationPath);
    console.log('📏 Tamaño:', migrationSQL.length, 'caracteres\n');

    // Dividir en statements individuales (por líneas que empiezan con --)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Ejecutando ${statements.length} statements SQL...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        console.log(`[${i + 1}/${statements.length}] Ejecutando...`);
        await sql.query(statement + ';');
        console.log(`✅ Statement ${i + 1} completado\n`);
        successCount++;
      } catch (error) {
        // Algunos errores son esperados (como "column already exists")
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} - Columna ya existe (OK)\n`);
          successCount++;
        } else {
          console.error(`❌ Error en statement ${i + 1}:`, error.message);
          console.error('Statement:', statement.substring(0, 100) + '...\n');
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Verificar que las columnas existen
    console.log('🔍 Verificando columnas creadas...\n');
    const result = await sql`
      SELECT
        column_name,
        data_type,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN (
          'monthly_quota_docs',
          'monthly_quota_audio_minutes',
          'monthly_usage_docs',
          'monthly_usage_audio_minutes',
          'max_pages_per_pdf'
        )
      ORDER BY column_name
    `;

    if (result.rows.length === 5) {
      console.log('✅ Todas las columnas creadas correctamente:\n');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.warn(`⚠️  Solo ${result.rows.length} de 5 columnas encontradas`);
    }

    // Mostrar un usuario de ejemplo
    console.log('\n🔍 Usuario de ejemplo (primero en la BD):\n');
    const userSample = await sql`
      SELECT
        email,
        subscription_plan,
        monthly_quota_docs,
        monthly_quota_audio_minutes,
        monthly_usage_docs,
        monthly_usage_audio_minutes,
        max_pages_per_pdf
      FROM users
      LIMIT 1
    `;

    if (userSample.rows.length > 0) {
      const user = userSample.rows[0];
      console.log('   Email:', user.email);
      console.log('   Plan:', user.subscription_plan);
      console.log('   Cuota Docs:', user.monthly_quota_docs);
      console.log('   Cuota Audio:', user.monthly_quota_audio_minutes, 'min');
      console.log('   Uso Docs:', user.monthly_usage_docs);
      console.log('   Uso Audio:', user.monthly_usage_audio_minutes, 'min');
      console.log('   Max Páginas PDF:', user.max_pages_per_pdf);
    }

    console.log('\n✅ Migración completada exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
runMigration();
