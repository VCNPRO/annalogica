import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth, verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { logAdminAction } from '@/lib/admin-logs';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 3. Obtener nueva contraseña del body
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const userId = params.id;

    // 4. Verificar que el usuario existe
    const userResult = await sql`
      SELECT id, email FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 5. Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 6. Actualizar contraseña en BD
    await sql`
      UPDATE users
      SET
        password = ${hashedPassword},
        updated_at = NOW()
      WHERE id = ${userId}
    `;

    // 7. Registrar acción en logs
    await logAdminAction({
      adminUserId: auth.userId,
      action: 'reset_password',
      targetUserId: userId,
      details: {
        target_email: user.email,
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    logger.info('Password reset by admin', {
      adminId: auth.userId,
      targetUserId: userId,
      targetEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error: any) {
    logger.error('Error resetting password', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
