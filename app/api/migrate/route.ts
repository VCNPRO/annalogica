import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

/**
 * POST /api/migrate
 * Add missing speakers_url column to transcription_jobs table
 *
 * IMPORTANT: This should only be run ONCE
 */
export async function POST(request: Request) {
  try {
    // Security: Check for admin authorization
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET || 'migration-secret-2025';

    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Migration] Starting migration: Add speakers_url column...');

    // Add speakers_url column if it doesn't exist
    await sql`
      ALTER TABLE transcription_jobs
      ADD COLUMN IF NOT EXISTS speakers_url TEXT;
    `;

    console.log('[Migration] speakers_url column added successfully');

    // Verify the column was added
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transcription_jobs'
      ORDER BY ordinal_position;
    `;

    console.log('[Migration] Current columns:', columns.rows);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      columns: columns.rows.map(c => c.column_name)
    });

  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migrate
 * Check if migration is needed
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET || 'migration-secret-2025';

    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if speakers_url column exists
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transcription_jobs'
      AND column_name = 'speakers_url';
    `;

    const exists = result.rows.length > 0;

    return NextResponse.json({
      migrationNeeded: !exists,
      speakersUrlExists: exists,
      message: exists
        ? 'speakers_url column already exists. Migration not needed.'
        : 'speakers_url column missing. Migration needed.'
    });

  } catch (error) {
    console.error('[Migration Check] Error:', error);
    return NextResponse.json(
      {
        error: 'Check failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
