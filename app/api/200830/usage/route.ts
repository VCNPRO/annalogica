import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth, verifyAdmin } from '@/lib/auth';
import {
  getUserUsageSummary,
  getAllUsersUsage,
  getPlatformStats
} from '@/lib/usage-tracking';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const user = verifyRequestAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'user'; // 'user', 'all', 'platform'
    const userId = searchParams.get('userId') || user.userId;
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // SECURITY: Verificar permisos de admin para modos restringidos
    if (mode === 'all' || mode === 'platform') {
      const isAdmin = await verifyAdmin(request);
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Acceso denegado: se requieren permisos de administrador' },
          { status: 403 }
        );
      }
    }

    // SECURITY: Los usuarios solo pueden ver sus propias estadísticas
    if (mode === 'user' && userId !== user.userId) {
      const isAdmin = await verifyAdmin(request);
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Acceso denegado: no puedes ver estadísticas de otros usuarios' },
          { status: 403 }
        );
      }
    }

    let data;

    switch (mode) {
      case 'user':
        data = await getUserUsageSummary(userId, startDate, endDate);
        break;

      case 'all':
        data = await getAllUsersUsage(startDate, endDate);
        break;

      case 'platform':
        data = await getPlatformStats(startDate, endDate);
        break;

      default:
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      mode,
      period: { startDate, endDate, days },
      data
    });

  } catch (error: any) {
    console.error('Error in admin/usage:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
