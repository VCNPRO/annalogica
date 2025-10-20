// DÓNDE: components/admin/ClientTable.tsx
'use client';
import { MoreHorizontal } from 'lucide-react';
interface UserData { id: string; email: string; plan: string; registeredAt: string; usage: { totalFiles: number; breakdown: string; }; }
export function ClientTable({ users }: { users: UserData[] }) {
  return (
    <div className="mt-8 bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700"><h2 className="text-xl font-semibold">Gestión de Clientes</h2><input type="text" placeholder="Buscar por email..." className="mt-4 block w-full sm:w-1/3 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm p-2" /></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">Usuario</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Plan</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Uso Detallado</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha Registro</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.plan === 'Pro' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{user.plan}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{`${user.usage.totalFiles} archivos (${user.usage.breakdown})`}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.registeredAt}</td>
                <td className="px-6 py-4 whitespace-nowrap"><button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"><MoreHorizontal /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
