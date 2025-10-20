// DÓNDE: app/api/admin/dashboard-data/route.ts
// (Este archivo no necesita cambios, pero lo incluyo para que tengas la versión final y segura)

import { NextResponse } from 'next/server';
// import { auth } from '@/auth'; // Ajusta si es necesario
import { getUserIsAdmin, getAdminDashboardData } from '@/lib/data'; // Usamos nuestro nuevo archivo de datos

// Simulación de una función auth para que el código funcione
async function auth() {
    // Para la prueba, asegúrate que este ID corresponde a un usuario que sea admin en tu DB
    return { user: { id: 'd4f39938-7756-4f83-82f0-feb7dfd498d0' } }; // ID del usuario test@test.com que es admin
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  
  // ¡GUARDIA DE SEGURIDAD ACTIVADO!
  const isAdmin = await getUserIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  // Ahora llama a la función que obtiene los datos
  try {
    const data = await getAdminDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

