// DÓNDE: app/api/admin/dashboard-data/route.ts
import { NextResponse } from 'next/server';
// import { auth } from '@/auth'; // Descomenta cuando actives la seguridad
// import { getUserIsAdmin, getAdminDashboardData } from '@/lib/db/queries'; // Descomenta después

export async function GET() {
  // --- PROTECCIÓN DE API (Temporalmente desactivada para construir la UI) ---
  // const session = await auth();
  // if (!session?.user?.id) { return NextResponse.json({ error: 'No autorizado' }, { status: 401 }); }
  // const isAdmin = await getUserIsAdmin(session.user.id);
  // if (!isAdmin) { return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }); }
  // --- FIN DE LA PROTECCIÓN ---

  // POR AHORA, usamos datos de ejemplo para que puedas construir la interfaz
  const data = {
    kpis: { activeUsers: '1,245', revenue: '4,820.75', apiCosts: '372.50', grossMargin: '92.27' },
    users: [
      { id: '1', email: 'juan.perez@betatester.com', plan: 'Pro', registeredAt: '15/10/2025', usage: { totalFiles: 25, breakdown: 'A:15, P:8, D:2' } },
      { id: '2', email: 'nuevo.usuario@gmail.com', plan: 'Free', registeredAt: '19/10/2025', usage: { totalFiles: 5, breakdown: 'A:3, P:2' } },
    ]
  };

  return NextResponse.json(data);
}

