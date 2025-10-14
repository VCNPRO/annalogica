import { sql } from '@vercel/postgres';
import { logger } from './logger';

export interface AdminLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export type AdminAction =
  | 'update_user'
  | 'delete_user'
  | 'change_plan'
  | 'reset_password'
  | 'reset_quota'
  | 'change_role'
  | 'create_trial'
  | 'extend_trial'
  | 'cancel_subscription'
  | 'view_users'
  | 'view_user_details';

/**
 * Registrar acción de administrador en logs
 */
export async function logAdminAction(params: {
  adminUserId: string;
  action: AdminAction;
  targetUserId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO admin_logs (
        admin_user_id,
        action,
        target_user_id,
        details,
        ip_address,
        user_agent
      )
      VALUES (
        ${params.adminUserId},
        ${params.action},
        ${params.targetUserId || null},
        ${params.details ? JSON.stringify(params.details) : null},
        ${params.ipAddress || null},
        ${params.userAgent || null}
      )
    `;

    logger.info('Admin action logged', {
      adminUserId: params.adminUserId,
      action: params.action,
      targetUserId: params.targetUserId,
    });
  } catch (error) {
    logger.error('Error logging admin action', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Obtener logs de un administrador
 */
export async function getAdminLogs(params: {
  adminUserId?: string;
  targetUserId?: string;
  action?: AdminAction;
  limit?: number;
  offset?: number;
}): Promise<AdminLog[]> {
  const { adminUserId, targetUserId, action, limit = 50, offset = 0 } = params;

  try {
    let query = `
      SELECT
        al.*,
        au.email as admin_email,
        tu.email as target_email
      FROM admin_logs al
      LEFT JOIN users au ON au.id = al.admin_user_id
      LEFT JOIN users tu ON tu.id = al.target_user_id
      WHERE 1=1
    `;

    const queryParams: any[] = [];

    if (adminUserId) {
      queryParams.push(adminUserId);
      query += ` AND al.admin_user_id = $${queryParams.length}`;
    }

    if (targetUserId) {
      queryParams.push(targetUserId);
      query += ` AND al.target_user_id = $${queryParams.length}`;
    }

    if (action) {
      queryParams.push(action);
      query += ` AND al.action = $${queryParams.length}`;
    }

    query += ` ORDER BY al.created_at DESC`;

    queryParams.push(limit);
    query += ` LIMIT $${queryParams.length}`;

    queryParams.push(offset);
    query += ` OFFSET $${queryParams.length}`;

    const result = await sql.query(query, queryParams);

    return result.rows as AdminLog[];
  } catch (error) {
    logger.error('Error getting admin logs', error);
    return [];
  }
}

/**
 * Obtener estadísticas de logs
 */
export async function getAdminLogStats(adminUserId?: string): Promise<{
  totalActions: number;
  actionsByType: Record<string, number>;
  recentActions: number;
}> {
  try {
    let result;
    let actionTypesResult;

    if (adminUserId) {
      result = await sql`
        SELECT
          COUNT(*) as total_actions,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_actions
        FROM admin_logs
        WHERE admin_user_id = ${adminUserId}
      `;

      actionTypesResult = await sql`
        SELECT
          action,
          COUNT(*) as count
        FROM admin_logs
        WHERE admin_user_id = ${adminUserId}
        GROUP BY action
        ORDER BY count DESC
      `;
    } else {
      result = await sql`
        SELECT
          COUNT(*) as total_actions,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_actions
        FROM admin_logs
      `;

      actionTypesResult = await sql`
        SELECT
          action,
          COUNT(*) as count
        FROM admin_logs
        GROUP BY action
        ORDER BY count DESC
      `;
    }

    const actionsByType: Record<string, number> = {};
    actionTypesResult.rows.forEach((row: any) => {
      actionsByType[row.action] = parseInt(row.count);
    });

    return {
      totalActions: parseInt(result.rows[0].total_actions),
      recentActions: parseInt(result.rows[0].recent_actions),
      actionsByType,
    };
  } catch (error) {
    logger.error('Error getting admin log stats', error);
    return {
      totalActions: 0,
      recentActions: 0,
      actionsByType: {},
    };
  }
}

/**
 * Eliminar logs antiguos (limpieza)
 */
export async function cleanupOldLogs(daysToKeep = 365): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM admin_logs
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      RETURNING id
    `;

    const deletedCount = result.rows.length;

    logger.info('Admin logs cleanup completed', { deletedCount, daysToKeep });

    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up admin logs', error);
    return 0;
  }
}
