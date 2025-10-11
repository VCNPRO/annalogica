// API endpoint para crear sesiones de Checkout de Stripe
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verify } from 'jsonwebtoken';
import {
  stripe,
  createStripeCustomer,
  createCheckoutSession,
  mapStripePriceToPlan,
  getQuotaForPlan,
} from '@/lib/stripe/client';
import { PRICING_PLANS, PlanType } from '@/lib/stripe/config';
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
    let userEmail: string;

    try {
      const decoded = verify(token, JWT_SECRET) as { userId: number; email: string };
      userId = decoded.userId;
      userEmail = decoded.email;
    } catch (error) {
      logger.security('Invalid JWT token in checkout', { error });
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // 2. Obtener datos del body
    const { planId } = await request.json();

    if (!planId || planId === 'free' || planId === 'empresarial') {
      return NextResponse.json(
        { error: 'Plan inválido' },
        { status: 400 }
      );
    }

    // Verificar que el plan existe
    const plan = PRICING_PLANS[planId as PlanType];
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que tiene stripePriceId configurado
    if (!plan.stripePriceId) {
      logger.error('Plan does not have stripePriceId configured', { planId });
      return NextResponse.json(
        { error: 'Plan no disponible temporalmente' },
        { status: 503 }
      );
    }

    // 3. Obtener o crear cliente de Stripe
    const userResult = await sql`
      SELECT id, email, name, stripe_customer_id
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
    let stripeCustomerId = user.stripe_customer_id;

    // Si no tiene customer_id, crear uno nuevo en Stripe
    if (!stripeCustomerId) {
      logger.info('Creating new Stripe customer', { userId, email: user.email });

      const customer = await createStripeCustomer({
        email: user.email,
        name: user.name || user.email,
        userId: user.id,
      });

      stripeCustomerId = customer.id;

      // Guardar customer_id en la base de datos
      await sql`
        UPDATE users
        SET stripe_customer_id = ${stripeCustomerId}
        WHERE id = ${userId}
      `;

      logger.info('Stripe customer created', {
        userId,
        customerId: stripeCustomerId,
      });
    }

    // 4. Crear sesión de Checkout
    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId: plan.stripePriceId,
      userId: user.id,
      userEmail: user.email,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://annalogica.eu'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://annalogica.eu'}/pricing`,
    });

    logger.info('Checkout session created', {
      userId,
      planId,
      sessionId: session.id,
      customerId: stripeCustomerId,
    });

    // 5. Retornar URL de checkout
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Error creating checkout session', error);

    return NextResponse.json(
      {
        error: 'Error al crear sesión de pago',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
