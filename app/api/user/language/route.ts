import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAuth } from '@/lib/auth';

const SUPPORTED_LANGUAGES = ['es', 'ca', 'eu', 'gl', 'en', 'fr', 'pt', 'it', 'de'];

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { language } = await request.json();

    // Validate language
    if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: 'Idioma no válido' },
        { status: 400 }
      );
    }

    // Update user's preferred language in database
    await sql`
      UPDATE users
      SET preferred_language = ${language}
      WHERE id = ${user.userId}
    `;

    return NextResponse.json({
      success: true,
      language
    });

  } catch (error) {
    console.error('Error updating language:', error);
    return NextResponse.json(
      { error: 'Error al actualizar idioma' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Get user's preferred language from database
    const result = await sql`
      SELECT preferred_language
      FROM users
      WHERE id = ${user.userId}
    `;

    const language = result.rows[0]?.preferred_language || 'es';

    return NextResponse.json({
      language
    });

  } catch (error) {
    console.error('Error getting language:', error);
    return NextResponse.json(
      { error: 'Error al obtener idioma' },
      { status: 500 }
      );
  }
}
