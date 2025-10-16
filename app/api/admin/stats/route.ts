import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getPlatformStatistics } from '@/lib/admin-users';

// GET /api/admin/stats - Obtener estadísticas de la plataforma
export async function GET(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
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
