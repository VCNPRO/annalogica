// DÓNDE: app/admin/page.tsx
// MISIÓN: Proteger la ruta y renderizar el panel de control.

import { redirect } from 'next/navigation';
// import { auth } from '@/auth'; // Asume que tienes un sistema de autenticación, ajusta si es necesario
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getUserIsAdmin } from '@/lib/data'; // Usamos nuestro nuevo archivo de datos

// Simulación de una función auth para que el código funcione
async function auth() {
    // En tu app real, esto vendrá de tu librería de autenticación (ej. NextAuth.js)
    // Para la prueba, asegúrate que este ID corresponde a un usuario que sea admin en tu DB
    return { user: { id: 'd4f39938-7756-4f83-82f0-feb7dfd498d0' } }; // ID del usuario test@test.com que es admin
}


export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login'); // Si no está logueado, fuera
  }

  // ¡GUARDIA DE SEGURIDAD ACTIVADO!
  const isAdmin = await getUserIsAdmin(session.user.id);
  if (!isAdmin) {
    redirect('/dashboard'); // Si no es admin, a su dashboard normal
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto">
        <AdminDashboard />
      </div>
    </div>
  );
}

