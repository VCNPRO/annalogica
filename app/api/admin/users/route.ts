import { NextResponse } from 'next/server';
import { verifyAdmin, verifyRequestAuth } from '@/lib/auth';
import {
  getAllUsersWithMetrics,
  getUserDetails,
  updateUserAccountType,
  updateUserAccountStatus,
  updateUserNotes,
  updateUserTags,
  setUserMonthlyBudget,
  getPlatformStatistics,
  type AccountType,
  type AccountStatus,
} from '@/lib/admin-users';

// GET /api/admin/users - Obtener todos los usuarios con métricas
export async function GET(request: Request) {
  try {
    // Verificar autenticación y rol admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('accountType') as AccountType | null;
    const accountStatus = searchParams.get('accountStatus') as AccountStatus | null;
    const searchEmail = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const sortBy = (searchParams.get('sortBy') as any) || 'cost';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getAllUsersWithMetrics({
      accountType: accountType || undefined,
      accountStatus: accountStatus || undefined,
      searchEmail: searchEmail || undefined,
      tags: tags || undefined,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users - Actualizar usuario
export async function PATCH(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const auth = verifyRequestAuth(request);
    const adminUserId = auth?.userId || 'admin';

    const body = await request.json();
    const { userId, field, value } = body;

    if (!userId || !field) {
      return NextResponse.json(
        { error: 'userId y field son requeridos' },
        { status: 400 }
      );
    }

    let success = false;

    switch (field) {
      case 'accountType':
        success = await updateUserAccountType(userId, value, adminUserId);
        break;
      case 'accountStatus':
        success = await updateUserAccountStatus(
          userId,
          value,
          adminUserId,
          body.reason
        );
        break;
      case 'notes':
        success = await updateUserNotes(userId, value, adminUserId);
        break;
      case 'tags':
        success = await updateUserTags(userId, value, adminUserId);
        break;
      case 'monthlyBudget':
        success = await setUserMonthlyBudget(userId, value, adminUserId);
        break;
      default:
        return NextResponse.json(
          { error: 'Campo no válido' },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Error al actualizar usuario' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}
