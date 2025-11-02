const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    console.log('🔄 Applying language preference migration...');

    const migrationPath = path.join(__dirname, '../migrations/add_preferred_language.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by statements and execute each one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await sql.query(statement);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('   - Added preferred_language column to users table');
    console.log('   - Default value: "es"');
    console.log('   - Supported languages: es, ca, eu, gl, en, fr, pt, it, de');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
