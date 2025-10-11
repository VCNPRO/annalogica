// Configuración de Stripe y planes de precios
// Basado en PRICING-STRATEGY.md

export const STRIPE_CONFIG = {
  // Estas claves se configurarán en variables de entorno de Vercel
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
} as const;

export type PlanType = 'free' | 'basico' | 'pro' | 'business' | 'universidad' | 'medios' | 'empresarial';

export interface PricingPlan {
  id: PlanType;
  name: string;
  description: string;
  price: number; // En euros
  currency: 'EUR';
  interval: 'month' | 'year';
  hours: number; // Horas de transcripción incluidas
  features: string[];
  quota: number; // Número de archivos permitidos por mes
  stripePriceId?: string; // Se configurará en Stripe Dashboard
  popular?: boolean;
  recommended?: boolean;
  target: 'individual' | 'empresa' | 'institucional';
}

export const PRICING_PLANS: Record<PlanType, PricingPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Prueba nuestro servicio gratis',
    price: 0,
    currency: 'EUR',
    interval: 'month',
    hours: 1,
    quota: 10,
    features: [
      '10 archivos al mes',
      'Hasta 1 hora de transcripción',
      'Transcripción básica',
      'Identificación de hablantes',
      'Exportar SRT, VTT, TXT',
      'Resumen con IA',
      'Soporte por email',
    ],
    target: 'individual',
  },

  basico: {
    id: 'basico',
    name: 'Básico',
    description: 'Para usuarios individuales y pequeños proyectos',
    price: 49,
    currency: 'EUR',
    interval: 'month',
    hours: 10,
    quota: 100,
    features: [
      '100 archivos al mes',
      'Hasta 10 horas de transcripción',
      'Transcripción de alta calidad',
      'Identificación de hablantes',
      'Exportar SRT, VTT, TXT',
      'Resúmenes con IA avanzada',
      'Soporte prioritario',
      'Sin publicidad',
    ],
    stripePriceId: process.env.STRIPE_PRICE_BASICO,
    popular: true,
    target: 'individual',
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para profesionales y pequeñas empresas',
    price: 99,
    currency: 'EUR',
    interval: 'month',
    hours: 30,
    quota: 300,
    features: [
      '300 archivos al mes',
      'Hasta 30 horas de transcripción',
      'Transcripción premium',
      'Identificación de hablantes avanzada',
      'Todos los formatos de exportación',
      'Resúmenes personalizables',
      'API de integración',
      'Soporte prioritario 24/7',
      'Informes de uso',
    ],
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    recommended: true,
    target: 'empresa',
  },

  business: {
    id: 'business',
    name: 'Business',
    description: 'Para equipos y empresas medianas',
    price: 249,
    currency: 'EUR',
    interval: 'month',
    hours: 100,
    quota: 1000,
    features: [
      '1000 archivos al mes',
      'Hasta 100 horas de transcripción',
      'Transcripción premium',
      'Múltiples usuarios (hasta 5)',
      'Dashboard de equipo',
      'API completa',
      'Integraciones personalizadas',
      'Facturación centralizada',
      'Soporte dedicado',
      'SLA garantizado',
    ],
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS,
    target: 'empresa',
  },

  universidad: {
    id: 'universidad',
    name: 'Universidad',
    description: 'Para instituciones educativas',
    price: 999,
    currency: 'EUR',
    interval: 'month',
    hours: 300,
    quota: 5000,
    features: [
      '5000 archivos al mes',
      'Hasta 300 horas de transcripción',
      'Transcripción académica especializada',
      'Usuarios ilimitados',
      'Portal institucional',
      'Dashboard de administración',
      'API completa',
      'Integraciones con LMS',
      'Soporte técnico dedicado',
      'Formación incluida',
      'SLA garantizado 99.9%',
    ],
    stripePriceId: process.env.STRIPE_PRICE_UNIVERSIDAD,
    target: 'institucional',
  },

  medios: {
    id: 'medios',
    name: 'Medios',
    description: 'Para emisoras de radio/TV y productoras',
    price: 2999,
    currency: 'EUR',
    interval: 'month',
    hours: 1000,
    quota: 10000,
    features: [
      '10000 archivos al mes',
      'Hasta 1000 horas de transcripción',
      'Transcripción broadcast premium',
      'Usuarios ilimitados',
      'Procesamiento en tiempo real',
      'API dedicada',
      'Integraciones MAM/DAM',
      'White label disponible',
      'Account manager dedicado',
      'Soporte 24/7/365',
      'SLA 99.99%',
      'Almacenamiento extendido',
    ],
    stripePriceId: process.env.STRIPE_PRICE_MEDIOS,
    target: 'institucional',
  },

  empresarial: {
    id: 'empresarial',
    name: 'Empresarial',
    description: 'Soluciones personalizadas para grandes organizaciones',
    price: 0, // Precio personalizado
    currency: 'EUR',
    interval: 'month',
    hours: 0, // Ilimitado
    quota: 999999,
    features: [
      'Archivos ilimitados',
      'Horas ilimitadas',
      'Todo incluido de plan Medios',
      'Infraestructura dedicada',
      'Contrato personalizado',
      'On-premise disponible',
      'Cumplimiento normativo garantizado',
      'Auditorías de seguridad',
      'Account manager ejecutivo',
      'Soporte enterprise 24/7/365',
      'SLA personalizado',
    ],
    target: 'institucional',
  },
};

// Función helper para obtener plan por ID
export function getPlan(planId: PlanType): PricingPlan {
  return PRICING_PLANS[planId];
}

// Función para obtener todos los planes ordenados por precio
export function getAllPlans(): PricingPlan[] {
  return Object.values(PRICING_PLANS).filter(plan => plan.id !== 'empresarial');
}

// Función para obtener planes por target
export function getPlansByTarget(target: 'individual' | 'empresa' | 'institucional'): PricingPlan[] {
  return Object.values(PRICING_PLANS).filter(plan => plan.target === target);
}

// Cuotas por plan (número de archivos por mes)
export const PLAN_QUOTAS: Record<PlanType, number> = {
  free: 10,
  basico: 100,
  pro: 300,
  business: 1000,
  universidad: 5000,
  medios: 10000,
  empresarial: 999999,
};

// Horas de transcripción incluidas por plan
export const PLAN_HOURS: Record<PlanType, number> = {
  free: 1,
  basico: 10,
  pro: 30,
  business: 100,
  universidad: 300,
  medios: 1000,
  empresarial: 999999,
};

// Costos variables por hora (según PRICING-STRATEGY.md)
export const COST_PER_HOUR = {
  transcription: 1.50, // AssemblyAI: $0.03/min × 50 min = $1.50/hora
  summary: 0.25, // Claude: ~$0.03-0.05 por resumen
  total: 1.75, // Total variable cost
} as const;

// Webhooks de Stripe que debemos manejar
export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_COMPLETED: 'checkout.session.completed',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAID: 'invoice.payment_succeeded',
  INVOICE_FAILED: 'invoice.payment_failed',
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
} as const;

export type StripeWebhookEvent = typeof STRIPE_WEBHOOK_EVENTS[keyof typeof STRIPE_WEBHOOK_EVENTS];
