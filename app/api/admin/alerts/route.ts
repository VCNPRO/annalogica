import { NextResponse } from 'next/server';
import { verifyAdmin, verifyRequestAuth } from '@/lib/auth';
import {
  getActiveAlerts,
  resolveAlert,
  getAlertStats,
  getAlertConfigs,
  updateAlertConfig,
  checkHighCostUsers,
  checkQuotaExceeded,
  type AlertType,
  type AlertSeverity,
} from '@/lib/admin-alerts';

// GET /api/admin/alerts - Obtener alertas activas
export async function GET(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as AlertType | null;
    const severity = searchParams.get('severity') as AlertSeverity | null;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const alerts = await getActiveAlerts({
      alertType: type || undefined,
      severity: severity || undefined,
      userId: userId || undefined,
      limit,
    });

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error('Error getting alerts:', error);
    return NextResponse.json(
      { error: 'Error al obtener alertas' },
      { status: 500 }
    );
  }
}

// POST /api/admin/alerts - Ejecutar verificación manual de alertas
export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    let created = 0;

    switch (action) {
      case 'check_high_cost':
        created = await checkHighCostUsers();
        break;
      case 'check_quota':
        created = await checkQuotaExceeded();
        break;
      case 'check_all':
        created += await checkHighCostUsers();
        created += await checkQuotaExceeded();
        break;
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, alertsCreated: created });
  } catch (error: any) {
    console.error('Error checking alerts:', error);
    return NextResponse.json(
      { error: 'Error al verificar alertas' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/alerts - Resolver alerta
export async function PATCH(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const auth = verifyRequestAuth(request);
    const body = await request.json();
    const { alertId, notes } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId es requerido' },
        { status: 400 }
      );
    }

    const success = await resolveAlert(alertId, auth?.userId || 'admin', notes);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Error al resolver alerta' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { error: 'Error al resolver alerta' },
      { status: 500 }
    );
  }
}
