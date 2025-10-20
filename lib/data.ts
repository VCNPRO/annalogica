// DÓNDE: lib/data.ts
// MISIÓN: Centralizar las consultas a la base de datos.

import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';

export async function getUserIsAdmin(userId: string) {
  noStore();
  try {
    // ACTUALIZADO: Seleccionamos la columna 'role'
    const data = await sql`
      SELECT role FROM users WHERE id = ${userId};
    `;
    // ACTUALIZADO: Comprobamos si el rol es 'admin'
    return data.rows[0]?.role === 'admin';
  } catch (error) {
    console.error('Error en la base de datos al verificar el rol de admin:', error);
    return false;
  }
}

export async function getAdminDashboardData() {
    noStore();
    try {
        // En el futuro, aquí harás consultas SQL complejas
        // Por ahora, devolvemos datos de ejemplo para que la UI funcione
        const data = {
            kpis: { activeUsers: '1,245', revenue: '4,820.75', apiCosts: '372.50', grossMargin: '92.27' },
            users: [
              { id: '1', email: 'juan.perez@betatester.com', plan: 'Pro', registeredAt: '15/10/2025', usage: { totalFiles: 25, breakdown: 'A:15, P:8, D:2' } },
              { id: '2', email: 'nuevo.usuario@gmail.com', plan: 'Free', registeredAt: '19/10/2025', usage: { totalFiles: 5, breakdown: 'A:3, P:2' } },
            ]
        };
        return data;
    } catch (error) {
        console.error('Error de base de datos al obtener los datos del dashboard:', error);
        throw new Error('No se pudieron obtener los datos del panel de control.');
    }
}


