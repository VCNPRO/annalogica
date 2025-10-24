import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * PATCH /api/admin/user-quotas-v2
 * Actualizar cuotas separadas (docs + audio) de un usuario
 */
export async function PATCH(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, quotaDocs, quotaAudioMinutes, maxPagesPerPdf } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Construir update dinámicamente solo con los campos proporcionados
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (quotaDocs !== undefined) {
      const quota = parseInt(quotaDocs);
      if (isNaN(quota) || quota < 0) {
        return NextResponse.json(
          { error: 'quotaDocs debe ser un número positivo' },
          { status: 400 }
        );
      }
      updates.push(`monthly_quota_docs = $${paramIndex++}`);
      values.push(quota);
    }

    if (quotaAudioMinutes !== undefined) {
      const quota = parseInt(quotaAudioMinutes);
      if (isNaN(quota) || quota < 0) {
        return NextResponse.json(
          { error: 'quotaAudioMinutes debe ser un número positivo' },
          { status: 400 }
        );
      }
      updates.push(`monthly_quota_audio_minutes = $${paramIndex++}`);
      values.push(quota);
    }

    if (maxPagesPerPdf !== undefined) {
      const pages = parseInt(maxPagesPerPdf);
      if (isNaN(pages) || pages < 0) {
        return NextResponse.json(
          { error: 'maxPagesPerPdf debe ser un número positivo' },
          { status: 400 }
        );
      }
      updates.push(`max_pages_per_pdf = $${paramIndex++}`);
      values.push(pages);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Al menos un campo debe ser proporcionado (quotaDocs, quotaAudioMinutes, maxPagesPerPdf)' },
        { status: 400 }
      );
    }

    // Agregar updated_at y userId
    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await sql.query(query, values);

    console.log(`[Admin] Updated separate quotas for user ${userId}:`, {
      quotaDocs,
      quotaAudioMinutes,
      maxPagesPerPdf
    });

    return NextResponse.json({
      success: true,
      userId,
      updated: { quotaDocs, quotaAudioMinutes, maxPagesPerPdf }
    });
  } catch (error: any) {
    console.error('Error updating user quotas:', error);
    return NextResponse.json(
      { error: 'Error al actualizar cuotas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/user-quotas-v2
 * Resetear uso de cuotas separadas de un usuario
 */
export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Resetear uso de ambas cuotas
    await sql`
      UPDATE users
      SET monthly_usage_docs = 0,
          monthly_usage_audio_minutes = 0,
          quota_reset_date = NOW() + INTERVAL '30 days',
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    console.log(`[Admin] Reset separate usage for user ${userId}`);

    return NextResponse.json({
      success: true,
      userId
    });
  } catch (error: any) {
    console.error('Error resetting user usage:', error);
    return NextResponse.json(
      { error: 'Error al resetear uso' },
      { status: 500 }
    );
  }
}
