// Script para ejecutar la migración de la base de datos
// Uso: node run-migration.js

const { sql } = require('@vercel/postgres');

// Load environment variables manually
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value) {
        process.env[key] = value;
      }
    }
  }
});

console.log('📝 POSTGRES_URL cargada:', process.env.POSTGRES_URL ? 'Sí ✅' : 'No ❌');

async function runMigration() {
  console.log('🔧 Ejecutando migración: Agregar columna "name" a tabla users...\n');

  try {
    // Add name column
    console.log('1️⃣ Agregando columna "name"...');
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)
    `;
    console.log('   ✅ Columna "name" agregada exitosamente');

    // Create index
    console.log('\n2️⃣ Creando índice en columna "name"...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)
    `;
    console.log('   ✅ Índice creado exitosamente');

    // Verify
    console.log('\n3️⃣ Verificando que la columna existe...');
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'name'
    `;

    if (result.rows.length > 0) {
      console.log('   ✅ Verificación exitosa:');
      console.log('      - Columna:', result.rows[0].column_name);
      console.log('      - Tipo:', result.rows[0].data_type);
      console.log('      - Permite NULL:', result.rows[0].is_nullable);
    } else {
      console.log('   ⚠️  No se pudo verificar la columna');
    }

    console.log('\n🎉 Migración completada exitosamente!\n');
    console.log('✅ Ahora puedes registrarte con nombre en la aplicación\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

runMigration();
