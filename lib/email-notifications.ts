import { Resend } from 'resend';
import { logger } from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);

interface QuotaWarningEmailParams {
  userEmail: string;
  userName: string | null;
  currentUsage: number;
  monthlyQuota: number;
  usagePercent: number;
}

interface TrialExpiringEmailParams {
  userEmail: string;
  userName: string | null;
  plan: string;
  daysRemaining: number;
  endDate: Date;
}

interface AdminErrorEmailParams {
  errorType: string;
  errorMessage: string;
  userId?: string;
  userEmail?: string;
  stackTrace?: string;
  timestamp: Date;
}

/**
 * Envía email de advertencia cuando usuario alcanza 80% de cuota
 */
export async function sendQuotaWarningEmail(params: QuotaWarningEmailParams) {
  try {
    const { userEmail, userName, currentUsage, monthlyQuota, usagePercent } = params;

    const displayName = userName || 'Usuario';
    const remainingMinutes = monthlyQuota - currentUsage;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .stat-row:last-child { border-bottom: none; }
          .stat-label { font-weight: bold; color: #6b7280; }
          .stat-value { color: #111827; }
          .progress-bar { background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden; margin: 10px 0; }
          .progress-fill { background: #f59e0b; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Advertencia de Cuota</h1>
          </div>
          <div class="content">
            <p>Hola ${displayName},</p>

            <div class="warning-box">
              <strong>Has alcanzado el ${usagePercent}% de tu cuota mensual de transcripción.</strong>
            </div>

            <p>Te informamos que tu uso de transcripciones está cerca del límite mensual. Aquí están los detalles:</p>

            <div class="stats">
              <div class="stat-row">
                <span class="stat-label">Cuota mensual:</span>
                <span class="stat-value">${monthlyQuota} minutos</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Uso actual:</span>
                <span class="stat-value">${currentUsage} minutos</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Minutos restantes:</span>
                <span class="stat-value">${remainingMinutes} minutos</span>
              </div>
            </div>

            <div class="progress-bar">
              <div class="progress-fill" style="width: ${usagePercent}%">${usagePercent}%</div>
            </div>

            <p><strong>¿Qué puedes hacer?</strong></p>
            <ul>
              <li>Esperar a que tu cuota se renueve automáticamente el próximo mes</li>
              <li>Actualizar a un plan superior para obtener más minutos</li>
              <li>Gestionar tu uso de forma más eficiente</li>
            </ul>

            <center>
              <a href="https://annalogica.eu/dashboard" class="button">Ver mi Dashboard</a>
            </center>

            <div class="footer">
              <p>Este es un correo automático de Annalogica<br>
              Si tienes preguntas, contáctanos en soporte@annalogica.eu</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'Annalogica <notificaciones@annalogica.eu>',
      to: userEmail,
      subject: `⚠️ Has alcanzado el ${usagePercent}% de tu cuota mensual`,
      html: htmlContent,
    });

    logger.info('Quota warning email sent', {
      userEmail,
      usagePercent,
      emailId: result.data?.id,
    });

    return { success: true, emailId: result.data?.id };
  } catch (error: any) {
    logger.error('Error sending quota warning email', error);
    throw error;
  }
}

/**
 * Envía email de advertencia cuando trial está por expirar
 */
export async function sendTrialExpiringEmail(params: TrialExpiringEmailParams) {
  try {
    const { userEmail, userName, plan, daysRemaining, endDate } = params;

    const displayName = userName || 'Usuario';
    const formattedDate = endDate.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .trial-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .countdown { text-align: center; font-size: 48px; font-weight: bold; color: #3b82f6; margin: 20px 0; }
          .countdown-label { font-size: 14px; color: #6b7280; text-transform: uppercase; }
          .plan-badge { display: inline-block; background: #8b5cf6; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin: 10px 0; }
          .benefits { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .benefit-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .benefit-item:last-child { border-bottom: none; }
          .benefit-item::before { content: "✓"; color: #10b981; font-weight: bold; margin-right: 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Tu período de prueba está terminando</h1>
          </div>
          <div class="content">
            <p>Hola ${displayName},</p>

            <div class="trial-box">
              <strong>Tu período de prueba del plan <span class="plan-badge">${plan.toUpperCase()}</span> expirará pronto.</strong>
            </div>

            <div class="countdown">
              ${daysRemaining}
              <div class="countdown-label">${daysRemaining === 1 ? 'día restante' : 'días restantes'}</div>
            </div>

            <p>Tu prueba gratuita finaliza el <strong>${formattedDate}</strong>.</p>

            <p><strong>¿Qué sucede después?</strong></p>
            <ul>
              <li>Tu cuenta volverá al plan gratuito automáticamente</li>
              <li>Perderás acceso a las características premium</li>
              <li>Tu cuota mensual se reducirá</li>
            </ul>

            <p><strong>Sigue disfrutando de estos beneficios:</strong></p>
            <div class="benefits">
              <div class="benefit-item">Cuota mensual ampliada</div>
              <div class="benefit-item">Procesamiento prioritario</div>
              <div class="benefit-item">Exportación a múltiples formatos</div>
              <div class="benefit-item">Análisis avanzados con IA</div>
              <div class="benefit-item">Soporte prioritario</div>
            </div>

            <center>
              <a href="https://annalogica.eu/dashboard" class="button">Actualizar mi Plan</a>
            </center>

            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              Si ya has actualizado tu plan, puedes ignorar este mensaje.
            </p>

            <div class="footer">
              <p>Este es un correo automático de Annalogica<br>
              Si tienes preguntas, contáctanos en soporte@annalogica.eu</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'Annalogica <notificaciones@annalogica.eu>',
      to: userEmail,
      subject: `⏰ Tu período de prueba expira en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`,
      html: htmlContent,
    });

    logger.info('Trial expiring email sent', {
      userEmail,
      plan,
      daysRemaining,
      emailId: result.data?.id,
    });

    return { success: true, emailId: result.data?.id };
  } catch (error: any) {
    logger.error('Error sending trial expiring email', error);
    throw error;
  }
}

/**
 * Envía email de error crítico al administrador
 */
export async function sendAdminErrorEmail(params: AdminErrorEmailParams) {
  try {
    const { errorType, errorMessage, userId, userEmail, stackTrace, timestamp } = params;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@annalogica.eu';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .error-box { background: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; font-weight: bold; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; font-size: 12px; }
          .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: bold; color: #6b7280; display: inline-block; width: 150px; }
          .detail-value { color: #111827; }
          .stack-trace { background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px; line-height: 1.4; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Error Crítico en Annalogica</h1>
          </div>
          <div class="content">
            <div class="error-box">
              ${errorType}: ${errorMessage}
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Timestamp:</span>
                <span class="detail-value">${timestamp.toISOString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Error Type:</span>
                <span class="detail-value">${errorType}</span>
              </div>
              ${userId ? `
              <div class="detail-row">
                <span class="detail-label">User ID:</span>
                <span class="detail-value">${userId}</span>
              </div>
              ` : ''}
              ${userEmail ? `
              <div class="detail-row">
                <span class="detail-label">User Email:</span>
                <span class="detail-value">${userEmail}</span>
              </div>
              ` : ''}
            </div>

            ${stackTrace ? `
            <h3>Stack Trace:</h3>
            <div class="stack-trace">${stackTrace.replace(/\n/g, '<br>')}</div>
            ` : ''}

            <center>
              <a href="https://annalogica.eu/200830" class="button">Ir al Panel de Admin</a>
            </center>

            <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
              Este es un email automático del sistema de monitoreo de Annalogica.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'Annalogica Alerts <alerts@annalogica.eu>',
      to: adminEmail,
      subject: `🚨 [ANNALOGICA] Error Crítico: ${errorType}`,
      html: htmlContent,
    });

    logger.info('Admin error email sent', {
      errorType,
      emailId: result.data?.id,
    });

    return { success: true, emailId: result.data?.id };
  } catch (error: any) {
    logger.error('Error sending admin error email', error);
    // No lanzar error para evitar bucle infinito
    return { success: false, error: error.message };
  }
}

/**
 * Envía email de bienvenida a nuevo usuario
 */
export async function sendWelcomeEmail(params: {
  userEmail: string;
  userName: string | null;
  plan: string;
}) {
  try {
    const { userEmail, userName, plan } = params;
    const displayName = userName || 'Usuario';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .welcome-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { padding: 12px; margin: 10px 0; border-left: 4px solid #667eea; background: #f3f4f6; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a Annalogica!</h1>
          </div>
          <div class="content">
            <div class="welcome-box">
              <h2>Hola ${displayName},</h2>
              <p>Estamos emocionados de tenerte con nosotros. Tu cuenta ha sido creada exitosamente con el plan <strong>${plan.toUpperCase()}</strong>.</p>
            </div>

            <h3>¿Qué puedes hacer con Annalogica?</h3>
            <div class="features">
              <div class="feature-item">
                <strong>🎤 Transcripción Automática</strong><br>
                Convierte audio y video a texto con alta precisión
              </div>
              <div class="feature-item">
                <strong>📝 Subtítulos Profesionales</strong><br>
                Genera archivos SRT y VTT listos para usar
              </div>
              <div class="feature-item">
                <strong>🤖 Resúmenes con IA</strong><br>
                Obtén resúmenes inteligentes de tus transcripciones
              </div>
              <div class="feature-item">
                <strong>📊 Dashboard Completo</strong><br>
                Gestiona todos tus proyectos desde un solo lugar
              </div>
            </div>

            <center>
              <a href="https://annalogica.eu/dashboard" class="button">Comenzar Ahora</a>
            </center>

            <p style="margin-top: 30px;">
              Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos en
              <a href="mailto:soporte@annalogica.eu">soporte@annalogica.eu</a>
            </p>

            <div class="footer">
              <p>Annalogica - Transcripción Inteligente con IA<br>
              © 2025 Todos los derechos reservados</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'Annalogica <bienvenida@annalogica.eu>',
      to: userEmail,
      subject: '🎉 ¡Bienvenido a Annalogica!',
      html: htmlContent,
    });

    logger.info('Welcome email sent', {
      userEmail,
      plan,
      emailId: result.data?.id,
    });

    return { success: true, emailId: result.data?.id };
  } catch (error: any) {
    logger.error('Error sending welcome email', error);
    throw error;
  }
}
