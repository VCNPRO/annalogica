#!/usr/bin/env node

/**
 * Script para aplicar migración de Client ID con variables de entorno
 * Carga .env.local automáticamente
 */

// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  console.log('🚀 Iniciando migración de Client ID...\n');

  // Verificar que POSTGRES_URL está disponible
  if (!process.env.POSTGRES_URL) {
    console.error('❌ ERROR: POSTGRES_URL no encontrado en .env.local');
    console.error('   Verifica que el archivo .env.local existe y contiene POSTGRES_URL\n');
    process.exit(1);
  }

  console.log('✅ Variables de entorno cargadas correctamente\n');

  try {
    // Leer archivo SQL
    const migrationPath = path.join(__dirname, '../migrations/db-migration-client-id.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Leyendo archivo de migración:', migrationPath);
    console.log('📊 Tamaño:', migrationSQL.length, 'caracteres\n');

    // Ejecutar migración
    console.log('⚙️  Ejecutando migración en la base de datos...');
    const result = await sql.query(migrationSQL);

    console.log('✅ Migración aplicada exitosamente!\n');

    // Verificar resultados
    console.log('🔍 Verificando client_ids asignados...');
    const verification = await sql`
      SELECT
        COUNT(*) as total_users,
        MIN(client_id) as min_id,
        MAX(client_id) as max_id,
        COUNT(DISTINCT client_id) as unique_ids
      FROM users
    `;

    const stats = verification.rows[0];
    console.log('📊 Estadísticas:');
    console.log(`   - Total de usuarios: ${stats.total_users}`);
    console.log(`   - Rango de IDs: ${stats.min_id} - ${stats.max_id}`);
    console.log(`   - IDs únicos: ${stats.unique_ids}`);

    // Verificar que todos tienen client_id
    const nullCheck = await sql`
      SELECT COUNT(*) as users_without_id
      FROM users
      WHERE client_id IS NULL
    `;

    if (nullCheck.rows[0].users_without_id > 0) {
      console.log(`\n⚠️  ADVERTENCIA: ${nullCheck.rows[0].users_without_id} usuarios sin client_id`);
    } else {
      console.log('\n✅ Todos los usuarios tienen client_id asignado');
    }

    // Mostrar algunos ejemplos
    console.log('\n📋 Ejemplos de usuarios con client_id:');
    const examples = await sql`
      SELECT client_id, email, created_at
      FROM users
      ORDER BY created_at
      LIMIT 5
    `;

    examples.rows.forEach(user => {
      console.log(`   - ID ${user.client_id}: ${user.email}`);
    });

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('\n📝 Siguiente paso: Mover el archivo a migrations/applied/');
    console.log(`   mv migrations/db-migration-client-id.sql migrations/applied/\n`);

  } catch (error) {
    console.error('❌ Error al aplicar migración:', error);
    console.error('\nDetalles del error:', error.message);

    if (error.message.includes('column "client_id" of relation "users" already exists')) {
      console.log('\n💡 La columna client_id ya existe. La migración puede haber sido aplicada anteriormente.');
      console.log('   Verificando estado actual...\n');

      try {
        const check = await sql`SELECT client_id FROM users LIMIT 1`;
        console.log('✅ La columna client_id existe y está accesible.');
      } catch (e) {
        console.error('❌ Problema accediendo a la columna client_id:', e.message);
      }
    }

    process.exit(1);
  }
}

// Ejecutar migración
applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
