import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    // Security: Check for a secret token
    const authHeader = request.headers.get('authorization');
    const secret = process.env.MIGRATION_SECRET || 'temp-secret-2025';

    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔧 Running migration: Add name column to users table...');

    // Add name column
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)
    `;
    console.log('✅ Column "name" added successfully');

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)
    `;
    console.log('✅ Index created successfully');

    // Verify
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'name'
    `;

    if (result.rows.length > 0) {
      console.log('✅ Verification successful:', result.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      column: result.rows[0] || null
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}
