'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Zap, Building2, GraduationCap, Radio, Package } from 'lucide-react';
import { PRICING_PLANS, PlanType } from '@/lib/stripe/config';
import { useNotification } from '@/hooks/useNotification';
import { Toast } from '@/components/Toast';

type TargetType = 'all' | 'individual' | 'empresa' | 'institucional';

export default function PricingPage() {
  const router = useRouter();
  const { notification, showNotification } = useNotification();
  const [selectedTarget, setSelectedTarget] = useState<TargetType>('all');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si el usuario está autenticado
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSelectPlan = async (planId: PlanType) => {
    if (planId === 'free') {
      // Si no está autenticado, redirigir a registro
      if (!user) {
        router.push('/register');
        return;
      }
      // Si ya tiene plan free, ir al dashboard
      router.push('/');
      return;
    }

    if (planId === 'empresarial') {
      // Redirigir a contacto para plan empresarial
      window.location.href = 'mailto:infopreus@annalogica.eu?subject=Consulta Plan Empresarial';
      return;
    }

    // Si no está autenticado, guardar el plan seleccionado y redirigir a login
    if (!user) {
      localStorage.setItem('selectedPlan', planId);
      router.push('/login?redirect=pricing');
      return;
    }

    // Crear sesión de checkout llamando a la API
    try {
      setLoading(true);
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear sesión de pago');
      }

      // Redirigir a Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error al iniciar el proceso de pago. Por favor, inténtalo de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = Object.values(PRICING_PLANS).filter(plan => {
    if (selectedTarget === 'all') return true;
    return plan.target === selectedTarget;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Toast notification={notification} />

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Annalogica
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Planes y Precios
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(user ? '/' : '/login')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {user ? 'Ir al Dashboard' : 'Iniciar Sesión'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Elige el plan perfecto para ti
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
          Transcripción profesional con IA. Sin compromisos. Cancela cuando quieras.
        </p>

        {/* Target Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <button
            onClick={() => setSelectedTarget('all')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedTarget === 'all'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedTarget('individual')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedTarget === 'individual'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
            }`}
          >
            <Zap className="h-4 w-4" />
            Individual
          </button>
          <button
            onClick={() => setSelectedTarget('empresa')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedTarget === 'empresa'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Empresa
          </button>
          <button
            onClick={() => setSelectedTarget('institucional')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedTarget === 'institucional'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Institucional
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlans.map((plan) => {
            const isPopular = plan.popular;
            const isRecommended = plan.recommended;
            const isEnterprise = plan.id === 'empresarial';

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all hover:shadow-2xl ${
                  isRecommended
                    ? 'border-orange-500 shadow-xl scale-105'
                    : isPopular
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
                }`}
              >
                {/* Badge */}
                {(isRecommended || isPopular) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span
                      className={`px-4 py-1 rounded-full text-xs font-bold text-white ${
                        isRecommended ? 'bg-orange-500' : 'bg-blue-500'
                      }`}
                    >
                      {isRecommended ? '✨ RECOMENDADO' : '🔥 POPULAR'}
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Icon */}
                  <div className="mb-4">
                    {plan.target === 'individual' && (
                      <Zap className="h-8 w-8 text-orange-500" />
                    )}
                    {plan.target === 'empresa' && (
                      <Building2 className="h-8 w-8 text-blue-500" />
                    )}
                    {plan.target === 'institucional' && plan.id === 'universidad' && (
                      <GraduationCap className="h-8 w-8 text-purple-500" />
                    )}
                    {plan.target === 'institucional' && plan.id === 'medios' && (
                      <Radio className="h-8 w-8 text-red-500" />
                    )}
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    {isEnterprise ? (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          Personalizado
                        </span>
                      </div>
                    ) : plan.id === 'free' ? (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          Gratis
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          €{plan.price}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          /mes
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {plan.hours === 999999
                        ? 'Horas ilimitadas'
                        : `Hasta ${plan.hours} horas de transcripción`}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                      isRecommended
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl'
                        : isPopular
                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading
                      ? 'Cargando...'
                      : plan.id === 'free'
                      ? user
                        ? 'Plan Actual'
                        : 'Comenzar Gratis'
                      : isEnterprise
                      ? 'Contactar Ventas'
                      : 'Seleccionar Plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modules Section */}
        <div className="mt-24 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Package className="h-8 w-8 text-orange-500" />
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                Módulos Individuales
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Contrata solo lo que necesitas. Cada módulo se puede activar de forma independiente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 'extraction', name: 'Extracción de Datos', desc: 'Extracción IA de documentos PDF/imagen', price: 29 },
              { id: 'rag', name: 'Pregúntale al Documento', desc: 'Búsqueda semántica RAG sobre documentos', price: 19 },
              { id: 'review', name: 'Revisión de Documentos', desc: 'Panel de revisión y aprobación', price: 15 },
              { id: 'excel_master', name: 'Excel Master', desc: 'Consolidación y descarga Excel', price: 15 },
              { id: 'batch', name: 'Procesamiento en Lote', desc: 'Procesamiento masivo multi-documento', price: 25 },
              { id: 'templates', name: 'Plantillas Personalizadas', desc: 'Crear y gestionar plantillas propias', price: 10 },
            ].map(mod => (
              <div key={mod.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{mod.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{mod.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-orange-500">{mod.price}€</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4 bg-gradient-to-r from-orange-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-xl p-6 border border-orange-200 dark:border-gray-700">
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Paquetes sugeridos</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Básico:</strong> Extracción (29€) · <strong>Pro:</strong> Extracción + RAG + Batch (73€) · <strong>Completo:</strong> Todos (113€)
                </p>
              </div>
              <a
                href="mailto:infopreus@annalogica.eu?subject=Consulta Módulos"
                className="self-center px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Contactar
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Preguntas Frecuentes
          </h3>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                ¿Puedo cambiar de plan en cualquier momento?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Sí, puedes actualizar o reducir tu plan cuando quieras. Los cambios se
                aplican inmediatamente y se ajusta la facturación de forma prorrateada.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                ¿Qué métodos de pago aceptan?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Aceptamos todas las tarjetas de crédito y débito principales (Visa,
                Mastercard, American Express). Los pagos son procesados de forma segura
                por Stripe.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                ¿Emiten facturas?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Sí, emitimos facturas automáticamente cada mes con todos los datos fiscales.
                Puedes descargarlas desde tu panel de control.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                ¿Qué pasa si supero mi cuota mensual?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Puedes actualizar a un plan superior en cualquier momento. También ofrecemos
                paquetes adicionales de horas si lo necesitas ocasionalmente.
              </p>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            ¿Tienes alguna pregunta? Estamos aquí para ayudarte.
          </p>
          <a
            href="mailto:support@annalogica.eu"
            className="text-orange-500 hover:text-orange-600 font-semibold"
          >
            support@annalogica.eu
          </a>
        </div>
      </div>
    </div>
  );
}
