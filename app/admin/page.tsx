// DÓNDE: app/admin/page.tsx
// MISIÓN: Proteger la ruta y renderizar el panel de control.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { verifyToken } from '@/lib/auth';
import { UserDB } from '@/lib/db';

export default async function AdminPage() {
  // Get auth token from cookies
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token');

  if (!authToken) {
    redirect('/login'); // Si no está logueado, fuera
  }

  // Verify token and get user info
  const payload = verifyToken(authToken.value);
  if (!payload) {
    redirect('/login'); // Token inválido
  }

  // Verify admin role
  const user = await UserDB.findById(payload.userId);
  if (!user || user.role !== 'admin') {
    redirect('/'); // Si no es admin, a la página principal
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto">
        <AdminDashboard />
      </div>
    </div>
  );
}

