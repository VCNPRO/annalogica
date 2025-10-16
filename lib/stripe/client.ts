// Cliente de Stripe para operaciones del lado del servidor
import Stripe from 'stripe';
import { STRIPE_CONFIG, PlanType, PLAN_QUOTAS } from './config';

// Inicializar cliente de Stripe solo si la clave está configurada
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    })
  : null;

// Helper para verificar que Stripe está configurado
function ensureStripeConfigured(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY no está configurada en las variables de entorno');
  }
  return stripe;
}

/**
 * Crea un nuevo cliente de Stripe
 * @param params - Email, nombre y ID del usuario
 * @returns Cliente de Stripe creado
 */
export async function createStripeCustomer(params: {
  email: string;
  name: string;
  userId: number;
}): Promise<Stripe.Customer> {
  try {
    const stripeClient = ensureStripeConfigured();
    const customer = await stripeClient.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        userId: params.userId.toString(),
      },
    });

    return customer;
  } catch (error) {
    console.error('[STRIPE] Error creating customer:', error);
    throw new Error('Error al crear cliente en Stripe');
  }
}

/**
 * Crea una sesión de Checkout para suscripción
 * @param params - Datos necesarios para crear la sesión de pago
 * @returns Sesión de Checkout de Stripe
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  userId: number;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  try {
    const stripeClient = ensureStripeConfigured();
    const session = await stripeClient.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId.toString(),
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
      },
      subscription_data: {
        metadata: {
          userId: params.userId.toString(),
        },
      },
    });

    return session;
  } catch (error) {
    console.error('[STRIPE] Error creating checkout session:', error);
    throw new Error('Error al crear sesión de pago');
  }
}

/**
 * Crea portal de gestión de cliente para que el usuario gestione su suscripción
 * @param params - ID del cliente y URL de retorno
 * @returns Sesión del portal de cliente
 */
export async function createCustomerPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  try {
    const stripeClient = ensureStripeConfigured();
    const session = await stripeClient.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    return session;
  } catch (error) {
    console.error('[STRIPE] Error creating portal session:', error);
    throw new Error('Error al crear portal de cliente');
  }
}

/**
 * Obtiene una suscripción de Stripe por su ID
 * @param subscriptionId - ID de la suscripción
 * @returns Suscripción de Stripe o null si no existe
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    const stripeClient = ensureStripeConfigured();
    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('[STRIPE] Error retrieving subscription:', error);
    return null;
  }
}

/**
 * Cancela una suscripción al final del período de facturación actual
 * @param subscriptionId - ID de la suscripción a cancelar
 * @returns Suscripción actualizada
 */
export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const stripeClient = ensureStripeConfigured();
    const subscription = await stripeClient.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return subscription;
  } catch (error) {
    console.error('[STRIPE] Error canceling subscription:', error);
    throw new Error('Error al cancelar suscripción');
  }
}

/**
 * Reactiva una suscripción que fue cancelada previamente
 * @param subscriptionId - ID de la suscripción a reactivar
 * @returns Suscripción actualizada
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const stripeClient = ensureStripeConfigured();
    const subscription = await stripeClient.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    return subscription;
  } catch (error) {
    console.error('[STRIPE] Error reactivating subscription:', error);
    throw new Error('Error al reactivar suscripción');
  }
}

/**
 * Obtiene el historial de facturas de un cliente
 * @param customerId - ID del cliente de Stripe
 * @param limit - Número máximo de facturas a obtener (por defecto 10)
 * @returns Array de facturas
 */
export async function getCustomerInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
  try {
    const stripeClient = ensureStripeConfigured();
    const invoices = await stripeClient.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  } catch (error) {
    console.error('[STRIPE] Error retrieving invoices:', error);
    return [];
  }
}

/**
 * Verifica el estado de una suscripción y retorna información útil
 * @param subscriptionId - ID de la suscripción
 * @returns Objeto con estado completo de la suscripción
 */
export async function getSubscriptionStatus(subscriptionId: string): Promise<{
  isActive: boolean;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan: string | null;
}> {
  const subscription = await getSubscription(subscriptionId);

  if (!subscription) {
    return {
      isActive: false,
      status: 'inactive',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      plan: null,
    };
  }

  const isActive = ['active', 'trialing'].includes(subscription.status);

  // @ts-ignore - Stripe types issue with current_period_end
  const periodEnd = subscription.current_period_end;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;

  return {
    isActive,
    status: subscription.status,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    plan: subscription.items.data[0]?.price.id || null,
  };
}

/**
 * Mapea un Stripe Price ID a un PlanType interno
 * @param priceId - ID del precio de Stripe
 * @returns Tipo de plan correspondiente o null si no se encuentra
 */
export function mapStripePriceToPlan(priceId: string): PlanType | null {
  const mapping: Record<string, PlanType> = {
    [process.env.STRIPE_PRICE_BASICO || '']: 'basico',
    [process.env.STRIPE_PRICE_PRO || '']: 'pro',
    [process.env.STRIPE_PRICE_BUSINESS || '']: 'business',
    [process.env.STRIPE_PRICE_UNIVERSIDAD || '']: 'universidad',
    [process.env.STRIPE_PRICE_MEDIOS || '']: 'medios',
  };

  return mapping[priceId] || null;
}

/**
 * Obtiene la cuota mensual de archivos según el plan
 * @param plan - Tipo de plan
 * @returns Número de archivos permitidos por mes
 */
export function getQuotaForPlan(plan: PlanType): number {
  return PLAN_QUOTAS[plan] || 10;
}

/**
 * Construye y verifica el evento de webhook de Stripe
 * @param payload - Cuerpo de la petición del webhook
 * @param signature - Firma del webhook de Stripe
 * @returns Evento verificado de Stripe
 * @throws Error si la verificación falla
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET no está configurada');
  }

  try {
    const stripeClient = ensureStripeConfigured();
    return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('[STRIPE] Webhook signature verification failed:', error);
    throw new Error('Verificación de webhook fallida');
  }
}
