// DÓNDE: lib/data.ts
// MISIÓN: Centralizar las consultas a la base de datos y a Stripe.

import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';

// --- ¡NUEVO! IMPORTAMOS LA LIBRERÍA DE STRIPE ---
import Stripe from 'stripe';

// --- ¡NUEVO! INICIALIZAMOS STRIPE CON TU API KEY ---
// Asegúrate de que tu STRIPE_SECRET_KEY está en las variables de entorno de Vercel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // --- LÍNEA CORREGIDA (LA DEFINITIVA) ---
  // Usamos la versión exacta que nos pide el error de compilación
  apiVersion: '2025-09-30.clover',
});


export async function getUserIsAdmin(userId: string) {
  noStore();
  try {
    const data = await sql`
      SELECT role FROM users WHERE id = ${userId};
    `;
    return data.rows[0]?.role === 'admin';
  } catch (error) {
    console.error('Error en la base de datos al verificar el rol de admin:', error);
    return false;
  }
}


export async function getAdminDashboardData() {
    noStore();
    try {
        // --- CONSULTA ACTUALIZADA ---
        // Ahora ejecutamos 3 consultas en paralelo: usuarios, costes y los ingresos de Stripe
        const [usersData, kpiData, balanceTransactions] = await Promise.all([
            sql`SELECT id, email, subscription_plan, created_at, monthly_usage, monthly_quota FROM users ORDER BY created_at DESC;`,
            sql`SELECT 
                    COUNT(*) as total_users,
                    SUM(total_cost_usd::numeric) as total_costs
                 FROM users;`,
            // --- ¡NUEVO! OBTENEMOS LAS TRANSACCIONES DE STRIPE DEL ÚLTIMO MES ---
            stripe.balanceTransactions.list({
                limit: 100, // Obtiene las últimas 100 transacciones
                created: {
                    // Filtra por el último mes
                    gte: Math.floor((new Date().getTime() - 30 * 24 * 60 * 60 * 1000) / 1000),
                }
            }),
        ]);

        const formattedUsers = usersData.rows.map(user => ({
            id: user.id,
            email: user.email,
            plan: user.subscription_plan || 'Free',
            registeredAt: new Date(user.created_at).toLocaleDateString('es-ES'),
            usage: {
                totalFiles: user.monthly_usage,
                breakdown: `Uso: ${user.monthly_usage}/${user.monthly_quota}`
            }
        }));

        // --- ¡NUEVO! CALCULAMOS LOS INGRESOS REALES DE STRIPE ---
        // Sumamos solo las transacciones que son pagos (charges) o pagos de suscripciones (payment)
        const totalRevenue = balanceTransactions.data
            .filter(tx => tx.type === 'charge' || tx.type === 'payment')
            .reduce((sum, tx) => sum + tx.amount, 0) / 100; // Dividimos por 100 para convertir de céntimos a euros

        const totalCosts = parseFloat(kpiData.rows[0].total_costs) || 0;
        const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

        const formattedKpis = {
            activeUsers: kpiData.rows[0].total_users || '0',
            revenue: totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 }),
            apiCosts: totalCosts.toLocaleString('es-ES', { minimumFractionDigits: 2 }),
            grossMargin: grossMargin.toFixed(2)
        };

        return {
            kpis: formattedKpis,
            users: formattedUsers
        };

    } catch (error) {
        console.error('Error al obtener los datos del dashboard:', error);
        throw new Error('No se pudieron obtener los datos del panel de control.');
    }
}

