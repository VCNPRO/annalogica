// DÓNDE: app/admin/page.tsx
// MISIÓN: Proteger la ruta y renderizar el panel de control.

import { redirect } from 'next/navigation';
// import { auth } from '@/auth'; // Asume que tienes un sistema de autenticación
// import { getUserIsAdmin } from '@/lib/db/queries'; // Necesitarás una función para verificar si el usuario es admin

// --- LÍNEA CORREGIDA ---
// Aseguramos que la importación sea correcta para un componente con "exportación nombrada"
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default async function AdminPage() {
  // --- PROTECCIÓN DE RUTA (Temporalmente desactivada para construir la UI) ---
  // const session = await auth();
  // if (!session?.user?.id) { redirect('/login'); }
  //
  // const isAdmin = await getUserIsAdmin(session.user.id);
  // if (!isAdmin) { redirect('/dashboard'); }
  // --- FIN DE LA PROTECCIÓN ---

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto">
        <AdminDashboard />
      </div>
    </div>
  );
}

