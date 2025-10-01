'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '0',
    limit: 10,
    features: ['10 archivos/mes', 'Transcripción automática', 'Resúmenes básicos', 'Subtítulos SRT']
  },
  {
    name: 'Pro',
    price: '9.99',
    limit: 100,
    features: ['100 archivos/mes', 'PDFs profesionales', 'Prioridad en procesamiento', 'Soporte por email']
  },
  {
    name: 'Business',
    price: '29.99',
    limit: 500,
    features: ['500 archivos/mes', 'API dedicada', 'Procesamiento por lotes', 'Soporte prioritario']
  }
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planName: string) => {
    if (planName === 'Free') return;
    
    setLoading(planName);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.plan = planName.toLowerCase();
    user.monthlyLimit = plans.find(p => p.name === planName)?.limit || 10;
    localStorage.setItem('user', JSON.stringify(user));

    alert(`Plan ${planName} activado`);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <Link href="/" className="text-4xl font-bold text-orange-600 mb-2 inline-block">
            anna logica
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mt-4">Planes y Precios</h2>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`bg-white rounded-lg shadow-lg p-8 ${plan.name === 'Pro' ? 'border-2 border-orange-500' : ''}`}>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                <span className="text-gray-600">/mes</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.name)}
                disabled={loading !== null || plan.name === 'Free'}
                className={`w-full py-3 rounded-lg font-semibold ${
                  plan.name === 'Free' ? 'bg-gray-200 text-gray-500' :
                  plan.name === 'Pro' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                  'bg-gray-800 hover:bg-gray-900 text-white'
                }`}
              >
                {loading === plan.name ? 'Procesando...' : plan.name === 'Free' ? 'Plan Actual' : 'Seleccionar'}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/" className="text-orange-600 hover:underline">← Volver</Link>
        </div>
      </div>
    </div>
  );
}
