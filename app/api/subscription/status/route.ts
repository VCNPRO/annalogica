// API endpoint para obtener el estado de suscripción del usuario
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { checkSubscriptionStatus, getUserUsageStats, shouldSuggestUpgrade } from '@/lib/subscription-guard';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get('auth-token')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    let userId: string | number;

    try {
      const decoded = verify(token, JWT_SECRET) as { userId: string | number };
      userId = decoded.userId;
    } catch (error) {
      logger.security('Invalid JWT token in subscription status check', { error });
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Obtener estado de suscripción
    const status = await checkSubscriptionStatus(userId);
    const stats = await getUserUsageStats(userId);
    const suggestUpgrade = shouldSuggestUpgrade(stats);

    return NextResponse.json({
      ...status,
      stats,
      suggestUpgrade,
    });
  } catch (error) {
    logger.error('Error getting subscription status', error);

    return NextResponse.json(
      {
        error: 'Error al obtener estado de suscripción',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
