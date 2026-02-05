import { sql } from '@vercel/postgres';

/**
 * Verificar si un usuario tiene acceso a un módulo específico.
 * Los admins tienen acceso a todos los módulos.
 */
export async function checkModuleAccess(userId: string, moduleId: string): Promise<boolean> {
  // Verificar si el usuario es admin
  const userResult = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (userResult.rows[0]?.role === 'admin') return true;

  // Verificar en user_modules
  const result = await sql`
    SELECT active FROM user_modules
    WHERE user_id = ${userId} AND module_id = ${moduleId} AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  `;
  return result.rows.length > 0;
}

/**
 * Obtener la lista de IDs de módulos a los que un usuario tiene acceso.
 * Los admins obtienen todos los módulos activos.
 */
export async function getUserModules(userId: string): Promise<string[]> {
  const userResult = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (userResult.rows[0]?.role === 'admin') {
    const all = await sql`SELECT id FROM service_modules WHERE is_active = true`;
    return all.rows.map(r => r.id);
  }

  const result = await sql`
    SELECT module_id FROM user_modules
    WHERE user_id = ${userId} AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  `;
  return result.rows.map(r => r.module_id);
}
