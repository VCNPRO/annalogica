import { sql } from '@vercel/postgres';
import { logger } from './logger';
import { logAdminAction } from './admin-logs';

export type AccountType = 'production' | 'demo' | 'test' | 'trial';
export type AccountStatus = 'active' | 'suspended' | 'cancelled' | 'pending';

export interface UserWithMetrics {
  id: string;
  email: string;
  name: string | null;
  role: string;
  client_id: number | null; // ID corto de 4 cifras
  account_type: AccountType;
  account_status: AccountStatus;
  internal_notes: string | null;
  tags: string[];
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  total_cost_usd: number;
  monthly_budget_usd: number | null;
  created_at: Date;
  last_activity_at: Date | null;
  // Métricas
  total_operations: number;
  total_files: number;
  cost_last_30_days: number;
  uploads_count: number;
  transcriptions_count: number;
}

/**
 * Obtener todos los usuarios con métricas (admin)
 */
export async function getAllUsersWithMetrics(params?: {
  accountType?: AccountType;
  accountStatus?: AccountStatus;
  searchEmail?: string;
  tags?: string[];
  sortBy?: 'cost' | 'activity' | 'created' | 'email';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{ users: UserWithMetrics[]; total: number }> {
  const {
    accountType,
    accountStatus,
    searchEmail,
    tags,
    sortBy = 'cost',
    sortOrder = 'desc',
    limit = 50,
    offset = 0,
  } = params || {};

  try {
    // Construir query dinámicamente
    let whereConditions: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (accountType) {
      queryParams.push(accountType);
      whereConditions.push(`u.account_type = $${queryParams.length}`);
    }

    if (accountStatus) {
      queryParams.push(accountStatus);
      whereConditions.push(`u.account_status = $${queryParams.length}`);
    }

    if (searchEmail) {
      queryParams.push(`%${searchEmail.toLowerCase()}%`);
      whereConditions.push(`LOWER(u.email) LIKE $${queryParams.length}`);
    }

    if (tags && tags.length > 0) {
      queryParams.push(tags);
      whereConditions.push(`u.tags && $${queryParams.length}::text[]`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Determinar ordenamiento
    let orderByClause = '';
    switch (sortBy) {
      case 'cost':
        orderByClause = `total_cost ${sortOrder}`;
        break;
      case 'activity':
        orderByClause = `u.last_activity_at ${sortOrder} NULLS LAST`;
        break;
      case 'created':
        orderByClause = `u.created_at ${sortOrder}`;
        break;
      case 'email':
        orderByClause = `u.email ${sortOrder}`;
        break;
      default:
        orderByClause = `total_cost ${sortOrder}`;
    }

    // Query principal
    queryParams.push(limit);
    const limitParam = `$${queryParams.length}`;

    queryParams.push(offset);
    const offsetParam = `$${queryParams.length}`;

    const query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.client_id,
        COALESCE(u.account_type, 'production') as account_type,
        COALESCE(u.account_status, 'active') as account_status,
        u.internal_notes,
        COALESCE(u.tags, '{}') as tags,
        u.stripe_customer_id,
        u.stripe_subscription_id,
        u.subscription_status,
        COALESCE(u.subscription_plan, 'free') as subscription_plan,
        COALESCE(u.total_cost_usd, 0) as total_cost_usd,
        u.monthly_budget_usd,
        u.monthly_quota,
        u.monthly_usage,
        COALESCE(u.monthly_quota_docs, 10) as monthly_quota_docs,
        COALESCE(u.monthly_quota_audio_minutes, 10) as monthly_quota_audio_minutes,
        COALESCE(u.monthly_usage_docs, 0) as monthly_usage_docs,
        COALESCE(u.monthly_usage_audio_minutes, 0) as monthly_usage_audio_minutes,
        COALESCE(u.max_pages_per_pdf, 50) as max_pages_per_pdf,
        u.quota_reset_date,
        u.created_at,
        u.last_activity_at,
        COUNT(DISTINCT tj.id) as total_operations,
        COUNT(DISTINCT tj.id) as total_files,
        COALESCE(SUM(CASE WHEN tj.created_at > NOW() - INTERVAL '30 days' THEN 0.01 ELSE 0 END), 0) as cost_last_30_days,
        COALESCE(u.total_cost_usd, 0) as total_cost,
        0 as uploads_count,
        COUNT(CASE WHEN tj.status = 'completed' THEN 1 END) as transcriptions_count
      FROM users u
      LEFT JOIN transcription_jobs tj ON u.id = tj.user_id
      WHERE ${whereClause}
      GROUP BY u.id, u.email, u.name, u.role, u.client_id, u.account_type, u.account_status,
               u.internal_notes, u.tags, u.stripe_customer_id, u.stripe_subscription_id,
               u.subscription_status, u.total_cost_usd,
               u.monthly_budget_usd, u.monthly_quota, u.monthly_usage,
               u.monthly_quota_docs, u.monthly_quota_audio_minutes,
               u.monthly_usage_docs, u.monthly_usage_audio_minutes, u.max_pages_per_pdf,
               u.quota_reset_date, u.created_at, u.last_activity_at
      ORDER BY ${orderByClause}
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `;

    const result = await sql.query(query, queryParams);

    // Contar total
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE ${whereClause}
    `;
    const countResult = await sql.query(countQuery, queryParams.slice(0, -2)); // Sin limit/offset

    return {
      users: result.rows as UserWithMetrics[],
      total: parseInt(countResult.rows[0].total),
    };
  } catch (error) {
    logger.error('Error getting users with metrics', error);
    return { users: [], total: 0 };
  }
}

/**
 * Actualizar tipo de cuenta de usuario
 */
export async function updateUserAccountType(
  userId: string,
  accountType: AccountType,
  adminUserId: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE users
      SET account_type = ${accountType},
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    await logAdminAction({
      adminUserId,
      action: 'update_user',
      targetUserId: userId,
      details: { field: 'account_type', newValue: accountType },
    });

    logger.info('User account type updated', { userId, accountType });
    return true;
  } catch (error) {
    logger.error('Error updating user account type', error);
    return false;
  }
}

/**
 * Actualizar estado de cuenta de usuario
 */
export async function updateUserAccountStatus(
  userId: string,
  accountStatus: AccountStatus,
  adminUserId: string,
  reason?: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE users
      SET account_status = ${accountStatus},
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    await logAdminAction({
      adminUserId,
      action: 'update_user',
      targetUserId: userId,
      details: { field: 'account_status', newValue: accountStatus, reason },
    });

    logger.info('User account status updated', { userId, accountStatus, reason });
    return true;
  } catch (error) {
    logger.error('Error updating user account status', error);
    return false;
  }
}

/**
 * Actualizar notas internas de usuario
 */
export async function updateUserNotes(
  userId: string,
  notes: string,
  adminUserId: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE users
      SET internal_notes = ${notes},
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    await logAdminAction({
      adminUserId,
      action: 'update_user',
      targetUserId: userId,
      details: { field: 'internal_notes' },
    });

    return true;
  } catch (error) {
    logger.error('Error updating user notes', error);
    return false;
  }
}

/**
 * Agregar/quitar tags de usuario
 */
export async function updateUserTags(
  userId: string,
  tags: string[],
  adminUserId: string
): Promise<boolean> {
  try {
    // Convertir array a formato PostgreSQL
    const tagsArray = `{${tags.map(tag => `"${tag.replace(/"/g, '\\"')}"`).join(',')}}`;
    await sql`
      UPDATE users
      SET tags = ${tagsArray}::text[],
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    await logAdminAction({
      adminUserId,
      action: 'update_user',
      targetUserId: userId,
      details: { field: 'tags', newValue: tags },
    });

    return true;
  } catch (error) {
    logger.error('Error updating user tags', error);
    return false;
  }
}

/**
 * Establecer presupuesto mensual para usuario
 */
export async function setUserMonthlyBudget(
  userId: string,
  budgetUsd: number | null,
  adminUserId: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE users
      SET monthly_budget_usd = ${budgetUsd},
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    await logAdminAction({
      adminUserId,
      action: 'update_user',
      targetUserId: userId,
      details: { field: 'monthly_budget_usd', newValue: budgetUsd },
    });

    return true;
  } catch (error) {
    logger.error('Error setting user monthly budget', error);
    return false;
  }
}

/**
 * Obtener estadísticas generales de la plataforma
 */
export async function getPlatformStatistics(): Promise<{
  totalUsers: number;
  activeUsers: number;
  usersByType: Record<AccountType, number>;
  usersByStatus: Record<AccountStatus, number>;
  totalCostAllTime: number;
  totalCostThisMonth: number;
  totalFilesProcessed: number;
  avgCostPerUser: number;
}> {
  try {
    // Total users
    const usersResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN account_type = 'production' THEN 1 END) as production,
        COUNT(CASE WHEN account_type = 'demo' THEN 1 END) as demo,
        COUNT(CASE WHEN account_type = 'test' THEN 1 END) as test,
        COUNT(CASE WHEN account_type = 'trial' THEN 1 END) as trial,
        COUNT(CASE WHEN account_status = 'suspended' THEN 1 END) as suspended,
        COUNT(CASE WHEN account_status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN account_status = 'pending' THEN 1 END) as pending
      FROM users
    `;

    const userStats = usersResult.rows[0];

    // Costs (simplified - using transcription_jobs instead of usage_logs)
    const costsResult = await sql`
      SELECT
        COALESCE(SUM(u.total_cost_usd), 0) as total_cost_all_time,
        0 as total_cost_this_month,
        COUNT(DISTINCT u.id) as users_with_usage
      FROM users u
      WHERE u.total_cost_usd > 0
    `;

    const costStats = costsResult.rows[0];

    // Files (using transcription_jobs instead of transcriptions)
    const filesResult = await sql`
      SELECT COUNT(*) as total_files
      FROM transcription_jobs
    `;

    const fileStats = filesResult.rows[0];

    const totalUsers = parseInt(userStats.total) || 1;
    const totalCost = parseFloat(costStats.total_cost_all_time) || 0;

    return {
      totalUsers,
      activeUsers: parseInt(userStats.active) || 0,
      usersByType: {
        production: parseInt(userStats.production) || 0,
        demo: parseInt(userStats.demo) || 0,
        test: parseInt(userStats.test) || 0,
        trial: parseInt(userStats.trial) || 0,
      },
      usersByStatus: {
        active: parseInt(userStats.active) || 0,
        suspended: parseInt(userStats.suspended) || 0,
        cancelled: parseInt(userStats.cancelled) || 0,
        pending: parseInt(userStats.pending) || 0,
      },
      totalCostAllTime: totalCost,
      totalCostThisMonth: parseFloat(costStats.total_cost_this_month) || 0,
      totalFilesProcessed: parseInt(fileStats.total_files) || 0,
      avgCostPerUser: totalCost / totalUsers,
    };
  } catch (error) {
    logger.error('Error getting platform statistics', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      usersByType: { production: 0, demo: 0, test: 0, trial: 0 },
      usersByStatus: { active: 0, suspended: 0, cancelled: 0, pending: 0 },
      totalCostAllTime: 0,
      totalCostThisMonth: 0,
      totalFilesProcessed: 0,
      avgCostPerUser: 0,
    };
  }
}

/**
 * Obtener detalles completos de un usuario
 */
export async function getUserDetails(userId: string): Promise<UserWithMetrics | null> {
  try {
    const result = await sql`
      SELECT
        u.*,
        COUNT(DISTINCT ul.id) as total_operations,
        COUNT(DISTINCT t.id) as total_files,
        COALESCE(SUM(ul.cost_usd) FILTER (WHERE ul.created_at > NOW() - INTERVAL '30 days'), 0) as cost_last_30_days,
        COUNT(CASE WHEN ul.event_type = 'upload' THEN 1 END) as uploads_count,
        COUNT(CASE WHEN ul.event_type = 'transcription' THEN 1 END) as transcriptions_count
      FROM users u
      LEFT JOIN usage_logs ul ON u.id = ul.user_id
      LEFT JOIN transcriptions t ON u.id = t.user_id
      WHERE u.id = ${userId}
      GROUP BY u.id
    `;

    if (result.rows.length === 0) return null;

    return result.rows[0] as UserWithMetrics;
  } catch (error) {
    logger.error('Error getting user details', error);
    return null;
  }
}
