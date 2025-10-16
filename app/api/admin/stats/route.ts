import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPlatformStatistics } from '@/lib/admin-users';

// GET /api/admin/stats - Obtener estadísticas de la plataforma
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const stats = await getPlatformStatistics();

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error getting platform stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
