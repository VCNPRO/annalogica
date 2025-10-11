// API endpoint para crear sesión del portal de cliente de Stripe
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verify } from 'jsonwebtoken';
import { createCustomerPortalSession } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    let userId: number;

    try {
      const decoded = verify(token, JWT_SECRET) as { userId: number };
      userId = decoded.userId;
    } catch (error) {
      logger.security('Invalid JWT token in portal', { error });
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // 2. Obtener stripe_customer_id del usuario
    const userResult = await sql`
      SELECT id, email, stripe_customer_id
      FROM users
      WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (!user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No tienes una suscripción activa' },
        { status: 400 }
      );
    }

    // 3. Crear sesión del portal
    const session = await createCustomerPortalSession({
      customerId: user.stripe_customer_id,
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://annalogica.eu'}/settings`,
    });

    logger.info('Customer portal session created', {
      userId,
      customerId: user.stripe_customer_id,
      sessionId: session.id,
    });

    // 4. Retornar URL del portal
    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    logger.error('Error creating portal session', error);

    return NextResponse.json(
      {
        error: 'Error al crear sesión del portal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
