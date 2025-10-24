import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { getUnresolvedErrors, getErrorStats24h, resolveError } from '@/lib/error-tracker';

/**
 * GET /api/admin/errors
 * Obtener errores del sistema
 */
export async function GET(request: NextRequest) {
  try {
    const auth = verifyRequestAuth(request);

    if (!auth || auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Obtener estadísticas
      const stats = await getErrorStats24h();
      return NextResponse.json({ success: true, stats });
    }

    // Obtener errores no resueltos
    const limit = parseInt(searchParams.get('limit') || '50');
    const errors = await getUnresolvedErrors(limit);

    return NextResponse.json({
      success: true,
      errors,
      count: errors.length,
    });
  } catch (error: any) {
    console.error('[Admin Errors API] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/errors
 * Marcar error como resuelto
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = verifyRequestAuth(request);

    if (!auth || auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { errorId, resolutionNotes } = body;

    if (!errorId) {
      return NextResponse.json(
        { error: 'errorId es requerido' },
        { status: 400 }
      );
    }

    const success = await resolveError(errorId, auth.userId, resolutionNotes);

    if (!success) {
      return NextResponse.json(
        { error: 'Error al resolver el error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Error marcado como resuelto',
    });
  } catch (error: any) {
    console.error('[Admin Errors API] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
