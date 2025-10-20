// DÓNDE: app/admin/page.tsx
// MISIÓN: El archivo final que une todo.

import { redirect } from 'next/navigation';
// import { auth } from '@/auth'; // Descomenta cuando tengas tu sistema de auth
// import { getUserIsAdmin } from '@/lib/db/queries'; // Descomenta después
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
