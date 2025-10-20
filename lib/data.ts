// DÓNDE: lib/data.ts
// MISIÓN: Centralizar las consultas a la base de datos.

import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';

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

// --- ¡FUNCIÓN ACTUALIZADA CON DATOS REALES! ---
export async function getAdminDashboardData() {
    noStore(); // Asegura que los datos sean siempre frescos
    try {
        // Ejecutamos ambas consultas a la base de datos en paralelo para más eficiencia
        const [usersData, kpiData] = await Promise.all([
            sql`SELECT id, email, subscription_plan, created_at, monthly_usage, monthly_quota FROM users ORDER BY created_at DESC;`,
            sql`SELECT 
                    COUNT(*) as total_users,
                    SUM(total_cost_usd::numeric) as total_costs
                 FROM users;`
        ]);

        // Mapeamos los datos de los usuarios al formato que espera el frontend
        const formattedUsers = usersData.rows.map(user => ({
            id: user.id,
            email: user.email,
            plan: user.subscription_plan || 'Free',
            registeredAt: new Date(user.created_at).toLocaleDateString('es-ES'),
            usage: {
                totalFiles: user.monthly_usage,
                breakdown: `Uso: ${user.monthly_usage}/${user.monthly_quota}` // Desglose simple por ahora
            }
        }));

        // Calculamos los KPIs
        // NOTA: Los ingresos (revenue) deberían venir de Stripe. Por ahora, es un valor de ejemplo.
        const totalCosts = parseFloat(kpiData.rows[0].total_costs) || 0;
        const totalRevenue = 4820.75; // Valor de ejemplo, a reemplazar con datos de Stripe
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
        console.error('Error de base de datos al obtener los datos del dashboard:', error);
        throw new Error('No se pudieron obtener los datos del panel de control.');
    }
}

