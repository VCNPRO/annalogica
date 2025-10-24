// Página temporal de debug para verificar autenticación admin
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { UserDB } from '@/lib/db';

export default async function AdminDebugPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token');

  let debugInfo: any = {
    hasCookie: !!authToken,
    cookieValue: authToken ? 'Existe (oculto por seguridad)' : 'No existe',
    tokenValid: false,
    userId: null,
    email: null,
    userExists: false,
    userRole: null,
    isAdmin: false,
  };

  if (authToken) {
    const payload = verifyToken(authToken.value);
    debugInfo.tokenValid = !!payload;

    if (payload) {
      debugInfo.userId = payload.userId;
      debugInfo.email = payload.email;

      const user = await UserDB.findById(payload.userId);
      debugInfo.userExists = !!user;
      debugInfo.userRole = user?.role || 'no encontrado';
      debugInfo.isAdmin = user?.role === 'admin';
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Admin Debug Info
        </h1>

        <div className="space-y-3">
          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">Cookie auth-token:</span>
            <span className={debugInfo.hasCookie ? 'text-green-600' : 'text-red-600'}>
              {debugInfo.hasCookie ? '✓ Existe' : '✗ No existe'}
            </span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">Token válido:</span>
            <span className={debugInfo.tokenValid ? 'text-green-600' : 'text-red-600'}>
              {debugInfo.tokenValid ? '✓ Válido' : '✗ Inválido'}
            </span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">User ID:</span>
            <span className="font-mono text-sm">{debugInfo.userId || 'N/A'}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">Email:</span>
            <span>{debugInfo.email || 'N/A'}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">Usuario existe en BD:</span>
            <span className={debugInfo.userExists ? 'text-green-600' : 'text-red-600'}>
              {debugInfo.userExists ? '✓ Existe' : '✗ No existe'}
            </span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">Role del usuario:</span>
            <span className="font-bold">{debugInfo.userRole}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">¿Es admin?:</span>
            <span className={debugInfo.isAdmin ? 'text-green-600 text-xl' : 'text-red-600 text-xl'}>
              {debugInfo.isAdmin ? '✓ SÍ - Puede acceder' : '✗ NO - No puede acceder'}
            </span>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h2 className="font-bold mb-2">Solución:</h2>
          <p className="text-sm mb-2">Si tu role NO es 'admin', ejecuta esto en Vercel/Neon SQL Editor:</p>
          <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
            UPDATE users SET role = 'admin' WHERE email = '{debugInfo.email || 'tu-email@ejemplo.com'}';
          </pre>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/admin"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Intentar acceder a /admin
          </a>
        </div>
      </div>
    </div>
  );
}
