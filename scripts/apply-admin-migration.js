#!/usr/bin/env node

/**
 * Script para aplicar la migración de base de datos del sistema de administración
 *
 * Uso:
 *   node scripts/apply-admin-migration.js
 *
 * Requisitos:
 *   - Variable de entorno POSTGRES_URL configurada
 *   - Conexión a la base de datos de Vercel Postgres
 */

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

const MIGRATION_FILE = path.join(__dirname, '..', 'lib', 'db-migration-admin-management.sql');

async function applyMigration() {
  console.log('==============================================');
  console.log('  Aplicación de Migración - Admin Dashboard  ');
  console.log('==============================================\n');

  // Verificar que existe la variable de entorno
  if (!process.env.POSTGRES_URL) {
    console.error('❌ ERROR: Variable de entorno POSTGRES_URL no configurada');
    console.error('\nPara configurarla:');
    console.error('  1. En desarrollo: añadir a .env.local');
    console.error('  2. En producción: configurar en Vercel Dashboard > Settings > Environment Variables\n');
    process.exit(1);
  }

  // Verificar que existe el archivo de migración
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`❌ ERROR: No se encuentra el archivo de migración: ${MIGRATION_FILE}\n`);
    process.exit(1);
  }

  console.log('📄 Leyendo archivo de migración...');
  const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');

  try {
    console.log('🔄 Conectando a la base de datos...');

    // Dividir el SQL en statements individuales (por punto y coma)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Se ejecutarán ${statements.length} statements SQL\n`);

    let successCount = 0;
    let skipCount = 0;

    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');

      try {
        console.log(`[${i + 1}/${statements.length}] Ejecutando: ${preview}...`);
        await sql.query(statement);
        successCount++;
        console.log(`✅ Éxito\n`);
      } catch (error) {
        // Algunos errores son esperados (ej: columna ya existe)
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            error.message.includes('does not exist')) {
          skipCount++;
          console.log(`⚠️  Omitido (ya existe): ${error.message}\n`);
        } else {
          console.error(`❌ Error: ${error.message}\n`);
          throw error;
        }
      }
    }

    console.log('==============================================');
    console.log('           Migración Completada              ');
    console.log('==============================================\n');
    console.log(`✅ Statements ejecutados correctamente: ${successCount}`);
    console.log(`⚠️  Statements omitidos (ya existían): ${skipCount}`);
    console.log(`📊 Total procesado: ${statements.length}\n`);

    console.log('📝 Siguiente paso: Asignar rol de administrador a un usuario');
    console.log('   Ejecuta desde tu terminal:');
    console.log(`   psql $POSTGRES_URL -c "UPDATE users SET role = 'admin' WHERE email = 'tu-email@annalogica.eu';"\n`);

    console.log('📚 Consulta la documentación completa:');
    console.log('   - ADMIN-DASHBOARD.md (guía completa)');
    console.log('   - QUICKSTART-ADMIN.md (inicio rápido)\n');

  } catch (error) {
    console.error('\n❌ ERROR AL APLICAR LA MIGRACIÓN:\n');
    console.error(error);
    console.error('\nLa migración ha fallado. Por favor, revisa el error y vuelve a intentarlo.\n');
    process.exit(1);
  }
}

// Ejecutar la migración
applyMigration()
  .then(() => {
    console.log('✅ Script completado exitosamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:\n', error);
    process.exit(1);
  });
