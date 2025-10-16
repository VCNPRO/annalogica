import { sql } from '@vercel/postgres';
import { logger } from './logger';

export type AlertType =
  | 'high_cost_user'
  | 'quota_exceeded'
  | 'service_error'
  | 'storage_high'
  | 'api_rate_limit'
  | 'payment_failed'
  | 'unusual_activity';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SystemAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  user_id: string | null;
  user_email?: string;
  metadata: any;
  is_resolved: boolean;
  resolved_at: Date | null;
  resolved_by: string | null;
  created_at: Date;
}

export interface AlertConfig {
  id: string;
  alert_type: AlertType;
  is_enabled: boolean;
  threshold_value: number | null;
  notification_emails: string[];
  check_interval_minutes: number;
  metadata: any;
}

/**
 * Crear una nueva alerta
 */
export async function createAlert(params: {
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  userId?: string;
  metadata?: any;
}): Promise<string | null> {
  try {
    const result = await sql`
      INSERT INTO system_alerts (
        alert_type,
        severity,
        title,
        message,
        user_id,
        metadata
      )
      VALUES (
        ${params.alertType},
        ${params.severity},
        ${params.title},
        ${params.message},
        ${params.userId || null},
        ${params.metadata ? JSON.stringify(params.metadata) : null}
      )
      RETURNING id
    `;

    const alertId = result.rows[0].id;

    logger.warn('Alert created', {
      alertId,
      type: params.alertType,
      severity: params.severity,
      userId: params.userId,
    });

    // TODO: Enviar notificación por email si está configurado
    await sendAlertNotification(alertId);

    return alertId;
  } catch (error) {
    logger.error('Error creating alert', error);
    return null;
  }
}

/**
 * Obtener alertas activas (no resueltas)
 */
export async function getActiveAlerts(params?: {
  alertType?: AlertType;
  severity?: AlertSeverity;
  userId?: string;
  limit?: number;
}): Promise<SystemAlert[]> {
  const { alertType, severity, userId, limit = 100 } = params || {};

  try {
    let whereConditions: string[] = ['is_resolved = FALSE'];
    const queryParams: any[] = [];

    if (alertType) {
      queryParams.push(alertType);
      whereConditions.push(`alert_type = $${queryParams.length}`);
    }

    if (severity) {
      queryParams.push(severity);
      whereConditions.push(`severity = $${queryParams.length}`);
    }

    if (userId) {
      queryParams.push(userId);
      whereConditions.push(`user_id = $${queryParams.length}`);
    }

    queryParams.push(limit);
    const limitParam = `$${queryParams.length}`;

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT
        a.*,
        u.email as user_email
      FROM system_alerts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ${limitParam}
    `;

    const result = await sql.query(query, queryParams);

    return result.rows as SystemAlert[];
  } catch (error) {
    logger.error('Error getting active alerts', error);
    return [];
  }
}

/**
 * Resolver una alerta
 */
export async function resolveAlert(
  alertId: string,
  resolvedBy: string,
  notes?: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE system_alerts
      SET is_resolved = TRUE,
          resolved_at = NOW(),
          resolved_by = ${resolvedBy},
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{resolution_notes}',
            ${notes ? JSON.stringify(notes) : 'null'}
          )
      WHERE id = ${alertId}
    `;

    logger.info('Alert resolved', { alertId, resolvedBy });
    return true;
  } catch (error) {
    logger.error('Error resolving alert', error);
    return false;
  }
}

/**
 * Obtener estadísticas de alertas
 */
export async function getAlertStats(params?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<string, number>;
  avgResolutionTimeHours: number;
}> {
  const startDate = params?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = params?.endDate || new Date();

  try {
    const result = await sql`
      SELECT
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN is_resolved = FALSE THEN 1 END) as active_alerts,
        COUNT(CASE WHEN is_resolved = TRUE THEN 1 END) as resolved_alerts,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as severity_low,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as severity_medium,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as severity_high,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as severity_critical,
        AVG(
          CASE WHEN is_resolved = TRUE AND resolved_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
          ELSE NULL END
        ) as avg_resolution_hours
      FROM system_alerts
      WHERE created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
    `;

    const typeStats = await sql`
      SELECT
        alert_type,
        COUNT(*) as count
      FROM system_alerts
      WHERE created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
      GROUP BY alert_type
      ORDER BY count DESC
    `;

    const stats = result.rows[0];
    const alertsByType: Record<string, number> = {};

    typeStats.rows.forEach((row: any) => {
      alertsByType[row.alert_type] = parseInt(row.count);
    });

    return {
      totalAlerts: parseInt(stats.total_alerts) || 0,
      activeAlerts: parseInt(stats.active_alerts) || 0,
      resolvedAlerts: parseInt(stats.resolved_alerts) || 0,
      alertsBySeverity: {
        low: parseInt(stats.severity_low) || 0,
        medium: parseInt(stats.severity_medium) || 0,
        high: parseInt(stats.severity_high) || 0,
        critical: parseInt(stats.severity_critical) || 0,
      },
      alertsByType,
      avgResolutionTimeHours: parseFloat(stats.avg_resolution_hours) || 0,
    };
  } catch (error) {
    logger.error('Error getting alert stats', error);
    return {
      totalAlerts: 0,
      activeAlerts: 0,
      resolvedAlerts: 0,
      alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      alertsByType: {},
      avgResolutionTimeHours: 0,
    };
  }
}

/**
 * Verificar y crear alertas por costes altos de usuario
 */
export async function checkHighCostUsers(): Promise<number> {
  try {
    // Obtener configuración de alerta
    const config = await sql`
      SELECT * FROM alert_config
      WHERE alert_type = 'high_cost_user' AND is_enabled = TRUE
    `;

    if (config.rows.length === 0) return 0;

    const threshold = parseFloat(config.rows[0].threshold_value) || 10.0;

    // Buscar usuarios con costes altos en los últimos 30 días
    const highCostUsers = await sql`
      SELECT
        u.id,
        u.email,
        u.monthly_budget_usd,
        SUM(ul.cost_usd) as cost_last_30_days
      FROM users u
      INNER JOIN usage_logs ul ON u.id = ul.user_id
      WHERE ul.created_at > NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.email, u.monthly_budget_usd
      HAVING SUM(ul.cost_usd) > ${threshold}
        OR (u.monthly_budget_usd IS NOT NULL AND SUM(ul.cost_usd) > u.monthly_budget_usd)
    `;

    let alertsCreated = 0;

    for (const user of highCostUsers.rows) {
      const cost = parseFloat(user.cost_last_30_days);
      const budget = user.monthly_budget_usd ? parseFloat(user.monthly_budget_usd) : null;

      // Verificar si ya existe una alerta activa para este usuario
      const existingAlert = await sql`
        SELECT id FROM system_alerts
        WHERE alert_type = 'high_cost_user'
          AND user_id = ${user.id}
          AND is_resolved = FALSE
          AND created_at > NOW() - INTERVAL '7 days'
      `;

      if (existingAlert.rows.length === 0) {
        const severity: AlertSeverity =
          budget && cost > budget * 1.5 ? 'critical' :
          budget && cost > budget ? 'high' :
          cost > threshold * 2 ? 'high' : 'medium';

        await createAlert({
          alertType: 'high_cost_user',
          severity,
          title: `Coste elevado: ${user.email}`,
          message: `El usuario ha generado un coste de $${cost.toFixed(2)} en los últimos 30 días${
            budget ? ` (presupuesto: $${budget.toFixed(2)})` : ''
          }`,
          userId: user.id,
          metadata: { cost, budget, threshold },
        });

        alertsCreated++;
      }
    }

    return alertsCreated;
  } catch (error) {
    logger.error('Error checking high cost users', error);
    return 0;
  }
}

/**
 * Verificar y crear alertas por cuota excedida
 */
export async function checkQuotaExceeded(): Promise<number> {
  try {
    // Verificar usuarios que han excedido su cuota según su plan
    const result = await sql`
      SELECT
        u.id,
        u.email,
        u.subscription_plan,
        COUNT(t.id) FILTER (WHERE t.created_at > date_trunc('month', NOW())) as files_this_month
      FROM users u
      LEFT JOIN transcriptions t ON u.id = t.user_id
      WHERE u.subscription_status = 'active'
      GROUP BY u.id, u.email, u.subscription_plan
    `;

    let alertsCreated = 0;

    // Define límites por plan (deberías moverlos a configuración)
    const planLimits: Record<string, number> = {
      free: 10,
      basic: 100,
      pro: 300,
      business: 1000,
    };

    for (const user of result.rows) {
      const limit = planLimits[user.subscription_plan] || 0;
      const filesCount = parseInt(user.files_this_month) || 0;

      if (filesCount >= limit) {
        // Verificar si ya existe alerta activa
        const existingAlert = await sql`
          SELECT id FROM system_alerts
          WHERE alert_type = 'quota_exceeded'
            AND user_id = ${user.id}
            AND is_resolved = FALSE
            AND created_at > date_trunc('month', NOW())
        `;

        if (existingAlert.rows.length === 0) {
          await createAlert({
            alertType: 'quota_exceeded',
            severity: 'high',
            title: `Cuota excedida: ${user.email}`,
            message: `El usuario ha procesado ${filesCount} archivos de ${limit} permitidos este mes (Plan: ${user.subscription_plan})`,
            userId: user.id,
            metadata: { filesCount, limit, plan: user.subscription_plan },
          });

          alertsCreated++;
        }
      }
    }

    return alertsCreated;
  } catch (error) {
    logger.error('Error checking quota exceeded', error);
    return 0;
  }
}

/**
 * Enviar notificación por email de alerta
 */
async function sendAlertNotification(alertId: string): Promise<void> {
  try {
    const alert = await sql`
      SELECT a.*, ac.notification_emails, u.email as user_email
      FROM system_alerts a
      LEFT JOIN alert_config ac ON a.alert_type = ac.alert_type
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ${alertId}
    `;

    if (alert.rows.length === 0) return;

    const alertData = alert.rows[0];
    const emails = alertData.notification_emails || [];

    if (emails.length === 0) {
      logger.warn('No notification emails configured for alert type', {
        alertType: alertData.alert_type,
      });
      return;
    }

    // Si RESEND_API_KEY está configurado, enviar email
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const severityColors: Record<string, string> = {
        critical: '#dc2626',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#3b82f6',
      };

      const color = severityColors[alertData.severity] || '#6b7280';

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Annalogica</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema de Alertas</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="background: ${color}; color: white; padding: 12px 20px; border-radius: 6px; margin-bottom: 20px; display: inline-block; font-weight: bold; text-transform: uppercase;">
        ${alertData.severity}
      </div>

      <h2 style="color: #1a1a1a; margin: 20px 0 15px 0;">${alertData.title}</h2>

      <p style="font-size: 16px; color: #4b5563; margin: 15px 0;">
        ${alertData.message}
      </p>

      ${alertData.user_email ? `
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Usuario afectado:</strong> ${alertData.user_email}
          </p>
        </div>
      ` : ''}

      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
          <strong>Tipo de alerta:</strong> ${alertData.alert_type}
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
          <strong>Fecha:</strong> ${new Date(alertData.created_at).toLocaleString('es-ES', {
            dateStyle: 'full',
            timeStyle: 'short'
          })}
        </p>
      </div>

      <div style="margin-top: 30px; text-align: center;">
        <a href="https://annalogica.eu/admin"
           style="background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
          Ver Dashboard de Admin
        </a>
      </div>
    </div>

    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #d1d5db;">
      <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
        Alerta generada automáticamente por Annalogica
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
        © 2025 Annalogica. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
      `;

      await resend.emails.send({
        from: 'Annalogica Alerts <alerts@annalogica.eu>',
        to: emails,
        subject: `[${alertData.severity.toUpperCase()}] ${alertData.title}`,
        html: htmlBody,
      });

      logger.info('Alert notification sent', {
        alertId,
        emails: emails.length,
        type: alertData.alert_type,
        severity: alertData.severity,
      });
    } else {
      // Si no hay RESEND_API_KEY, solo loggear
      logger.info('Alert notification skipped (no RESEND_API_KEY)', {
        alertId,
        emails,
        type: alertData.alert_type,
        severity: alertData.severity,
      });
    }
  } catch (error) {
    logger.error('Error sending alert notification', error);
    // No lanzar error para no interrumpir el flujo
  }
}

/**
 * Obtener configuración de alertas
 */
export async function getAlertConfigs(): Promise<AlertConfig[]> {
  try {
    const result = await sql`
      SELECT * FROM alert_config
      ORDER BY alert_type
    `;

    return result.rows as AlertConfig[];
  } catch (error) {
    logger.error('Error getting alert configs', error);
    return [];
  }
}

/**
 * Actualizar configuración de alerta
 */
export async function updateAlertConfig(
  alertType: AlertType,
  config: Partial<AlertConfig>
): Promise<boolean> {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (config.is_enabled !== undefined) {
      values.push(config.is_enabled);
      updates.push(`is_enabled = $${values.length}`);
    }

    if (config.threshold_value !== undefined) {
      values.push(config.threshold_value);
      updates.push(`threshold_value = $${values.length}`);
    }

    if (config.notification_emails !== undefined) {
      values.push(config.notification_emails);
      updates.push(`notification_emails = $${values.length}`);
    }

    if (config.check_interval_minutes !== undefined) {
      values.push(config.check_interval_minutes);
      updates.push(`check_interval_minutes = $${values.length}`);
    }

    if (updates.length === 0) return false;

    values.push(alertType);
    const query = `
      UPDATE alert_config
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE alert_type = $${values.length}
    `;

    await sql.query(query, values);

    logger.info('Alert config updated', { alertType, config });
    return true;
  } catch (error) {
    logger.error('Error updating alert config', error);
    return false;
  }
}
