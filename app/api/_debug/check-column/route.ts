import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Check if column exists
    const columnCheck = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'preferred_language'
    `;

    const columnExists = columnCheck.rows.length > 0;

    // Check sample users
    let users: any[] = [];
    let nullCount: number = 0;

    if (columnExists) {
      const usersResult = await sql`
        SELECT id, email, preferred_language
        FROM users
        LIMIT 5
      `;
      users = usersResult.rows;

      const nullCountResult = await sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE preferred_language IS NULL
      `;
      nullCount = parseInt(nullCountResult.rows[0].count);
    }

    return NextResponse.json({
      columnExists,
      columnInfo: columnCheck.rows[0] || null,
      sampleUsers: users,
      usersWithNullLanguage: nullCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
