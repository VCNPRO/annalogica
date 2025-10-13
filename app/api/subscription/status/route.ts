import { NextResponse } from 'next/server';
import { getUserUsageStats } from '@/lib/subscription-guard';
import { verifyRequestAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const payload = verifyRequestAuth(request);
    if (!payload) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // Obtener estadísticas de uso
    const stats = await getUserUsageStats(userId);

    return NextResponse.json({
      plan: stats.plan,
      usage: stats.usage,
      quota: stats.quota,
      resetDate: stats.resetDate,
      stats: {
        remaining: stats.remaining,
        usagePercent: stats.usagePercent,
        daysUntilReset: stats.daysUntilReset,
      },
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de suscripción' },
      { status: 500 }
    );
  }
}
