// Endpoint de webhook para recibir eventos de Stripe
// Este endpoint es llamado por Stripe cuando ocurren eventos (pagos, cancelaciones, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';
import { constructWebhookEvent, mapStripePriceToPlan, getQuotaForPlan } from '@/lib/stripe/client';
import { STRIPE_WEBHOOK_EVENTS } from '@/lib/stripe/config';
import { logger } from '@/lib/logger';

// IMPORTANTE: Deshabilitar bodyParser para webhooks de Stripe
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 1. Obtener el cuerpo de la petición y la firma de verificación
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.security('Webhook request without signature', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // 2. Verificar y construir el evento
    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature);
    } catch (error) {
      logger.security('Webhook signature verification failed', { error });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    logger.info('Webhook event received', {
      eventId: event.id,
      eventType: event.type,
    });

    // 3. Manejar cada tipo de evento de Stripe
    switch (event.type) {
      case STRIPE_WEBHOOK_EVENTS.CHECKOUT_COMPLETED:
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_CREATED:
      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED:
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_DELETED:
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAID:
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case STRIPE_WEBHOOK_EVENTS.INVOICE_FAILED:
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info('Unhandled webhook event type', { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Manejador: Checkout completado exitosamente
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.info('Processing checkout.session.completed', {
    sessionId: session.id,
    customerId: session.customer,
  });

  const userId = session.metadata?.userId;

  if (!userId) {
    logger.error('No userId in checkout session metadata', { sessionId: session.id });
    return;
  }

  // El evento subscription_created se encargará de actualizar la base de datos
  // Aquí solo registramos que el checkout fue exitoso
  logger.info('Checkout completed successfully', {
    userId,
    customerId: session.customer,
    subscriptionId: session.subscription,
  });
}

// Manejador: Suscripción creada o actualizada
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  logger.info('Processing subscription update', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });

  const customerId = subscription.customer as string;

  // Obtener usuario por stripe_customer_id
  const userResult = await sql`
    SELECT id, email
    FROM users
    WHERE stripe_customer_id = ${customerId}
  `;

  if (userResult.rows.length === 0) {
    logger.error('User not found for customer', { customerId });
    return;
  }

  const user = userResult.rows[0];
  const userId = user.id;

  // Obtener el plan desde el price_id
  const priceId = subscription.items.data[0]?.price.id;
  const plan = mapStripePriceToPlan(priceId);

  if (!plan) {
    logger.error('Could not map price to plan', { priceId });
    return;
  }

  const quota = getQuotaForPlan(plan);

  // Calcular fechas
  const subscriptionStartDate = new Date(subscription.current_period_start * 1000);
  const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
  const quotaResetDate = new Date(subscription.current_period_end * 1000);

  // Actualizar base de datos
  await sql`
    UPDATE users
    SET
      stripe_subscription_id = ${subscription.id},
      subscription_status = ${subscription.status},
      subscription_plan = ${plan},
      subscription_start_date = ${subscriptionStartDate.toISOString()},
      subscription_end_date = ${subscriptionEndDate.toISOString()},
      subscription_cancel_at_period_end = ${subscription.cancel_at_period_end},
      monthly_quota = ${quota},
      monthly_usage = 0,
      quota_reset_date = ${quotaResetDate.toISOString()}
    WHERE id = ${userId}
  `;

  logger.info('User subscription updated', {
    userId,
    subscriptionId: subscription.id,
    plan,
    status: subscription.status,
    quota,
  });
}

// Handler: Suscripción cancelada/eliminada
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info('Processing subscription deletion', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  const customerId = subscription.customer as string;

  // Obtener usuario
  const userResult = await sql`
    SELECT id, email
    FROM users
    WHERE stripe_customer_id = ${customerId}
  `;

  if (userResult.rows.length === 0) {
    logger.error('User not found for customer', { customerId });
    return;
  }

  const user = userResult.rows[0];

  // Resetear a plan free
  await sql`
    UPDATE users
    SET
      subscription_status = 'canceled',
      subscription_plan = 'free',
      subscription_cancel_at_period_end = FALSE,
      monthly_quota = 10,
      monthly_usage = 0
    WHERE id = ${user.id}
  `;

  logger.info('User subscription canceled, reverted to free plan', {
    userId: user.id,
    email: user.email,
  });
}

// Handler: Factura pagada exitosamente
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  logger.info('Processing invoice.payment_succeeded', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid / 100,
  });

  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  // Obtener usuario
  const userResult = await sql`
    SELECT id, email, subscription_plan
    FROM users
    WHERE stripe_customer_id = ${customerId}
  `;

  if (userResult.rows.length === 0) {
    logger.error('User not found for customer', { customerId });
    return;
  }

  const user = userResult.rows[0];

  // Guardar en historial de pagos
  await sql`
    INSERT INTO payment_history (
      user_id,
      stripe_payment_id,
      stripe_invoice_id,
      amount,
      currency,
      status,
      plan,
      payment_date,
      period_start,
      period_end
    ) VALUES (
      ${user.id},
      ${invoice.payment_intent as string},
      ${invoice.id},
      ${invoice.amount_paid / 100},
      ${invoice.currency.toUpperCase()},
      'paid',
      ${user.subscription_plan},
      ${new Date(invoice.created * 1000).toISOString()},
      ${invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null},
      ${invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null}
    )
    ON CONFLICT (stripe_payment_id) DO NOTHING
  `;

  logger.info('Payment recorded in history', {
    userId: user.id,
    invoiceId: invoice.id,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
  });
}

// Handler: Fallo en pago de factura
async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  logger.info('Processing invoice.payment_failed', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_due / 100,
  });

  const customerId = invoice.customer as string;

  // Obtener usuario
  const userResult = await sql`
    SELECT id, email
    FROM users
    WHERE stripe_customer_id = ${customerId}
  `;

  if (userResult.rows.length === 0) {
    logger.error('User not found for customer', { customerId });
    return;
  }

  const user = userResult.rows[0];

  // Actualizar estado de suscripción a past_due
  await sql`
    UPDATE users
    SET subscription_status = 'past_due'
    WHERE id = ${user.id}
  `;

  logger.security('Payment failed, subscription marked as past_due', {
    userId: user.id,
    email: user.email,
    invoiceId: invoice.id,
  });

  // TODO: Enviar email al usuario notificando el fallo en el pago
}
