import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth, verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { logAdminAction } from '@/lib/admin-logs';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const auth = verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Verificar permisos de admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado: se requieren permisos de administrador' },
        { status: 403 }
      );
    }

    // 3. Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 4. Construir query con filtros
    let query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.subscription_plan,
        u.subscription_status,
        u.monthly_quota,
        u.monthly_usage,
        u.quota_reset_date,
        u.created_at,
        u.updated_at,
        COUNT(tj.id) as total_jobs,
        SUM(CASE WHEN tj.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        MAX(tj.created_at) as last_activity
      FROM users u
      LEFT JOIN transcription_jobs tj ON tj.user_id = u.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];

    if (search) {
      queryParams.push(`%${search}%`);
      queryParams.push(`%${search}%`);
      query += ` AND (u.email ILIKE $${queryParams.length - 1} OR u.name ILIKE $${queryParams.length})`;
    }

    if (plan) {
      queryParams.push(plan);
      query += ` AND u.subscription_plan = $${queryParams.length}`;
    }

    if (status) {
      queryParams.push(status);
      query += ` AND u.subscription_status = $${queryParams.length}`;
    }

    query += `
      GROUP BY u.id, u.email, u.name, u.role, u.subscription_plan, u.subscription_status,
               u.monthly_quota, u.monthly_usage, u.quota_reset_date, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
    `;

    queryParams.push(limit);
    query += ` LIMIT $${queryParams.length}`;

    queryParams.push(offset);
    query += ` OFFSET $${queryParams.length}`;

    // 5. Ejecutar query
    const result = await sql.query(query, queryParams);

    // 6. Obtener total de usuarios (para paginación)
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams: any[] = [];

    if (search) {
      countParams.push(`%${search}%`);
      countParams.push(`%${search}%`);
      countQuery += ` AND (email ILIKE $${countParams.length - 1} OR name ILIKE $${countParams.length})`;
    }

    if (plan) {
      countParams.push(plan);
      countQuery += ` AND subscription_plan = $${countParams.length}`;
    }

    if (status) {
      countParams.push(status);
      countQuery += ` AND subscription_status = $${countParams.length}`;
    }

    const countResult = await sql.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // 7. Registrar acción en logs
    await logAdminAction({
      adminUserId: auth.userId,
      action: 'view_users',
      details: {
        search,
        plan,
        status,
        results_count: result.rows.length,
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      users: result.rows,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  } catch (error: any) {
    logger.error('Error listing users', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
