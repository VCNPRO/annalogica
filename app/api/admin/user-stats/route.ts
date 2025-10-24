import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * GET /api/admin/user-stats?userId=xxx
 * Obtener estadísticas detalladas de un usuario, incluyendo desglose por tipo de archivo
 */
export async function GET(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Obtener datos del usuario
    const userResult = await sql`
      SELECT
        id,
        email,
        name,
        subscription_plan,
        monthly_quota,
        monthly_usage,
        COALESCE(monthly_quota_docs, 10) as monthly_quota_docs,
        COALESCE(monthly_quota_audio_minutes, 10) as monthly_quota_audio_minutes,
        COALESCE(monthly_usage_docs, 0) as monthly_usage_docs,
        COALESCE(monthly_usage_audio_minutes, 0) as monthly_usage_audio_minutes,
        COALESCE(max_pages_per_pdf, 50) as max_pages_per_pdf,
        quota_reset_date,
        created_at
      FROM users
      WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Estadísticas totales
    const totalStats = await sql`
      SELECT
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        SUM(audio_duration_seconds) as total_duration_seconds
      FROM transcription_jobs
      WHERE user_id = ${userId}
    `;

    // Estadísticas por tipo de archivo (docs vs audio)
    const typeStats = await sql`
      SELECT
        file_type,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        SUM(audio_duration_seconds) as total_duration
      FROM transcription_jobs
      WHERE user_id = ${userId}
      GROUP BY file_type
    `;

    // Actividad últimos 30 días por tipo
    const recentActivity = await sql`
      SELECT
        file_type,
        DATE(created_at) as date,
        COUNT(*) as count
      FROM transcription_jobs
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY file_type, DATE(created_at)
      ORDER BY date DESC
    `;

    // Uso mensual actual
    const currentMonthUsage = await sql`
      SELECT
        file_type,
        COUNT(*) as count
      FROM transcription_jobs
      WHERE user_id = ${userId}
        AND created_at >= DATE_TRUNC('month', NOW())
      GROUP BY file_type
    `;

    // Formatear respuesta
    const stats = totalStats.rows[0];
    const byType = typeStats.rows.reduce((acc: any, row: any) => {
      acc[row.file_type] = {
        total: parseInt(row.count),
        completed: parseInt(row.completed),
        failed: parseInt(row.failed),
        pending: parseInt(row.pending),
        totalDuration: parseInt(row.total_duration || 0)
      };
      return acc;
    }, {});

    const currentMonth = currentMonthUsage.rows.reduce((acc: any, row: any) => {
      acc[row.file_type] = parseInt(row.count);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscription_plan,
        monthlyQuota: user.monthly_quota,
        monthlyUsage: user.monthly_usage,
        monthlyQuotaDocs: user.monthly_quota_docs,
        monthlyQuotaAudioMinutes: user.monthly_quota_audio_minutes,
        monthlyUsageDocs: user.monthly_usage_docs,
        monthlyUsageAudioMinutes: user.monthly_usage_audio_minutes,
        maxPagesPerPdf: user.max_pages_per_pdf,
        quotaResetDate: user.quota_reset_date,
        createdAt: user.created_at
      },
      stats: {
        total: {
          jobs: parseInt(stats.total_jobs),
          completed: parseInt(stats.completed_jobs),
          failed: parseInt(stats.failed_jobs),
          totalDurationSeconds: parseInt(stats.total_duration_seconds || 0)
        },
        byType: byType,
        currentMonth: currentMonth,
        recentActivity: recentActivity.rows.map((row: any) => ({
          fileType: row.file_type,
          date: row.date,
          count: parseInt(row.count)
        }))
      }
    });

  } catch (error: any) {
    console.error('Error getting user stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
