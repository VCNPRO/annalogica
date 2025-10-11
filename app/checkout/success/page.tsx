'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const session = searchParams.get('session_id');
    setSessionId(session);

    // Countdown para redirigir automáticamente
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams, router]);

  const handleGoToDashboard = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-ping"></div>
              <div className="relative bg-green-500 rounded-full p-6">
                <CheckCircle className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            ¡Pago Exitoso!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Tu suscripción ha sido activada correctamente. Ya puedes disfrutar de todos los
            beneficios de tu nuevo plan.
          </p>

          {/* Session ID (for debugging) */}
          {sessionId && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-8">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID de sesión</p>
              <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                {sessionId}
              </code>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Próximos pasos:
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Tu cuota mensual se ha actualizado según tu nuevo plan
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Recibirás un email de confirmación con tu factura
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Puedes gestionar tu suscripción desde la página de ajustes
                </span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleGoToDashboard}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mx-auto"
          >
            Ir al Dashboard
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Auto-redirect message */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirigiendo automáticamente en {countdown} segundos...
          </p>
        </div>

        {/* Support Link */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            ¿Tienes alguna pregunta?
          </p>
          <a
            href="mailto:soporte@annalogica.eu"
            className="text-orange-500 hover:text-orange-600 font-semibold"
          >
            Contacta con soporte
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
