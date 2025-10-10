const { jsPDF } = require('jspdf');

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 15;
const usableWidth = pageWidth - (margin * 2);
let yPosition = margin;

function checkNewPage(spaceNeeded = 15) {
  if (yPosition > pageHeight - margin - spaceNeeded) {
    doc.addPage();
    yPosition = margin;
    return true;
  }
  return false;
}

function addText(text, size = 9, style = 'normal', color = [0, 0, 0]) {
  doc.setFontSize(size);
  doc.setFont('helvetica', style);
  doc.setTextColor(color[0], color[1], color[2]);

  const cleanText = text.replace(/[^\x00-\x7F]/g, '').trim();
  const lines = doc.splitTextToSize(cleanText, usableWidth);

  lines.forEach(line => {
    checkNewPage();
    doc.text(line, margin, yPosition);
    yPosition += size * 0.5;
  });
  yPosition += 2;
}

function addTitle(text, size = 14, color = [255, 102, 0]) {
  checkNewPage(15);

  const cleanText = text.replace(/[^\x00-\x7F]/g, '').trim();

  doc.setFontSize(size);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(cleanText, margin, yPosition);
  yPosition += size * 0.6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
}

function addCodeBlock(code, title = '') {
  checkNewPage(30);

  if (title) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text(title, margin, yPosition);
    yPosition += 5;
  }

  const lines = code.split('\n');
  const maxLines = Math.min(lines.length, 40); // Limit code block size
  const height = (maxLines * 3.5) + 6;

  // Background
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPosition, usableWidth, height, 'F');

  // Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(margin, yPosition, usableWidth, height);

  yPosition += 4;

  // Code
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(50, 50, 50);

  for (let i = 0; i < maxLines; i++) {
    if (yPosition > pageHeight - margin - 5) {
      break; // Stop if running out of space
    }
    const line = lines[i].substring(0, 110); // Limit line length
    doc.text(line, margin + 2, yPosition);
    yPosition += 3.5;
  }

  yPosition += 6;
}

function addBullet(text) {
  checkNewPage();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const cleanText = text.replace(/[^\x00-\x7F]/g, '').trim();
  doc.text('  -', margin, yPosition);

  const lines = doc.splitTextToSize(cleanText, usableWidth - 8);
  lines.forEach((line, i) => {
    if (i > 0) checkNewPage();
    doc.text(line, margin + 6, yPosition);
    yPosition += 4.5;
  });
}

function addSectionBreak() {
  checkNewPage(8);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
}

// ==================== COVER ====================
doc.setFillColor(255, 102, 0);
doc.rect(0, 0, pageWidth, 80, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(28);
doc.setFont('helvetica', 'bold');
doc.text('AUDITORIA TECNICA', pageWidth / 2, 30, { align: 'center' });

doc.setFontSize(24);
doc.text('ANNALOGICA', pageWidth / 2, 47, { align: 'center' });

doc.setFontSize(12);
doc.setFont('helvetica', 'normal');
doc.text('Analisis Tecnico Detallado con Codigo', pageWidth / 2, 62, { align: 'center' });

yPosition = 90;

doc.setTextColor(0, 0, 0);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('Fecha: 2025-10-10', margin, yPosition); yPosition += 6;
doc.text('Version: 1.0.0', margin, yPosition); yPosition += 6;
doc.text('Tipo: Documento Tecnico', margin, yPosition); yPosition += 10;

doc.setFillColor(240, 248, 255);
doc.rect(margin, yPosition, usableWidth, 35, 'F');
doc.setDrawColor(70, 130, 180);
doc.setLineWidth(0.5);
doc.rect(margin, yPosition, usableWidth, 35);

yPosition += 8;
doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.text('RESUMEN TECNICO', margin + 5, yPosition);

yPosition += 7;
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.text('14 problemas criticos identificados', margin + 5, yPosition); yPosition += 5;
doc.text('Esfuerzo estimado: 50-60 horas desarrollo', margin + 5, yPosition); yPosition += 5;
doc.text('Tiempo total: 3-4 semanas (con legal)', margin + 5, yPosition); yPosition += 5;
doc.text('Prioridad maxima: GDPR + Seguridad', margin + 5, yPosition);

// ==================== PAGE 2 ====================
doc.addPage();
yPosition = margin;

addTitle('1. SEGURIDAD - PROBLEMA CRITICO #1', 16);

addTitle('Tokens JWT en localStorage (Vulnerable a XSS)', 13, [220, 53, 69]);

addText('UBICACION: app/api/auth/login/route.ts:55', 9, 'bold');
addText('RIESGO: Si hay vulnerabilidad XSS, el atacante puede robar tokens.', 9);
yPosition += 3;

addCodeBlock(
`// ACTUAL (INSEGURO):
return NextResponse.json({
  token,  // Token expuesto en JavaScript
  user: { id: user.id, email: user.email }
});`,
  'Codigo Actual (Vulnerable):'
);

addCodeBlock(
`// RECOMENDADO (SEGURO):
const response = NextResponse.json({
  user: { id: user.id, email: user.email }
});

response.cookies.set('auth_token', token, {
  httpOnly: true,      // No accesible desde JavaScript
  secure: true,        // Solo HTTPS
  sameSite: 'strict',  // Proteccion CSRF
  maxAge: 7 * 24 * 60 * 60, // 7 dias
  path: '/'
});

return response;`,
  'Solucion Recomendada:'
);

addText('CAMBIOS EN FRONTEND:', 9, 'bold');
addBullet('Eliminar localStorage.setItem("token")');
addBullet('Cookies se envian automaticamente en requests');
addBullet('Verificacion en middleware de Next.js');

yPosition += 5;

addCodeBlock(
`// middleware.ts (NUEVO)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*']
};`,
  'Middleware para Rutas Protegidas:'
);

addText('IMPACTO: Alto | PRIORIDAD: CRITICA | TIEMPO: 2 horas', 9, 'bold', [220, 53, 69]);

// ==================== PAGE 3 ====================
doc.addPage();
yPosition = margin;

addTitle('2. SEGURIDAD - PROBLEMA CRITICO #2', 16);

addTitle('Sin Content Security Policy (CSP)', 13, [220, 53, 69]);

addText('UBICACION: next.config.ts:3', 9, 'bold');
addText('RIESGO: Code injection, clickjacking, MIME sniffing attacks.', 9);
yPosition += 3;

addCodeBlock(
`// ACTUAL (NO EXISTE):
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;`,
  'Configuracion Actual:'
);

addCodeBlock(
`// RECOMENDADO:
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Previene clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Previene MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.anthropic.com https://api.assemblyai.com",
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://annalogica.eu' // Tu dominio
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization'
          }
        ]
      }
    ];
  }
};

export default nextConfig;`,
  'Solucion Completa (next.config.ts):'
);

addText('IMPACTO: Alto | PRIORIDAD: CRITICA | TIEMPO: 4 horas', 9, 'bold', [220, 53, 69]);

// ==================== PAGE 4 ====================
doc.addPage();
yPosition = margin;

addTitle('3. INFRAESTRUCTURA - PROBLEMA CRITICO #3', 16);

addTitle('Sin Circuit Breaker para APIs Externas', 13, [220, 53, 69]);

addText('UBICACION: lib/assemblyai-client.ts:44-94', 9, 'bold');
addText('RIESGO: Si AssemblyAI/Claude fallan, todas las transcripciones fallan.', 9);
yPosition += 3;

addCodeBlock(
`// INSTALAR:
npm install opossum`,
  'Dependencia Necesaria:'
);

addCodeBlock(
`// lib/circuit-breakers.ts (NUEVO)
import CircuitBreaker from 'opossum';
import { transcribeAudio } from './assemblyai-client';

const options = {
  timeout: 60000,              // 60s timeout
  errorThresholdPercentage: 50, // Abre si 50% fallan
  resetTimeout: 30000,         // Reintentar despues de 30s
  volumeThreshold: 5           // Min requests antes de abrir
};

export const assemblyAIBreaker = new CircuitBreaker(
  transcribeAudio,
  options
);

// Fallback cuando circuito abierto
assemblyAIBreaker.fallback(() => ({
  error: 'AssemblyAI temporalmente no disponible. Reintenta en 30s.'
}));

// Eventos para logging
assemblyAIBreaker.on('open', () => {
  console.error('[Circuit Breaker] OPEN - AssemblyAI fallando');
  // Enviar alerta critica
});

assemblyAIBreaker.on('halfOpen', () => {
  console.warn('[Circuit Breaker] HALF-OPEN - Probando AssemblyAI');
});

assemblyAIBreaker.on('close', () => {
  console.log('[Circuit Breaker] CLOSED - AssemblyAI recuperado');
});`,
  'Implementacion Circuit Breaker:'
);

addCodeBlock(
`// lib/inngest/functions.ts - MODIFICAR:
import { assemblyAIBreaker } from '@/lib/circuit-breakers';

// Cambiar llamada directa por circuit breaker:
const transcriptionResult = await step.run('transcribe-audio', async () => {
  return await assemblyAIBreaker.fire({
    audioUrl,
    language: 'es',
    speakerLabels: true
  });
});`,
  'Uso en Inngest Functions:'
);

addText('IMPACTO: Alto | PRIORIDAD: CRITICA | TIEMPO: 6 horas', 9, 'bold', [220, 53, 69]);

// ==================== PAGE 5 ====================
doc.addPage();
yPosition = margin;

addTitle('4. GESTION COSTOS - PROBLEMA CRITICO #4', 16);

addTitle('Sin Quotas Mensuales por Usuario', 13, [220, 53, 69]);

addText('UBICACION: lib/db.ts:3-132 (falta campo en users)', 9, 'bold');
addText('RIESGO: Usuarios pueden consumir recursos ilimitados.', 9);
yPosition += 3;

addCodeBlock(
`-- Ejecutar en Neon Postgres Console:

-- 1. Agregar campos de quota
ALTER TABLE users
ADD COLUMN IF NOT EXISTS monthly_transcription_quota INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS transcriptions_used_this_month INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_reset_date TIMESTAMP DEFAULT NOW();

-- 2. Indice para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_users_quota_check
ON users(id, transcriptions_used_this_month, monthly_transcription_quota);

-- 3. Funcion para resetear quotas mensualmente
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET transcriptions_used_this_month = 0,
      quota_reset_date = CURRENT_TIMESTAMP
  WHERE quota_reset_date < NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- 4. Comentarios
COMMENT ON COLUMN users.monthly_transcription_quota
  IS 'Numero maximo de transcripciones permitidas por mes';
COMMENT ON COLUMN users.transcriptions_used_this_month
  IS 'Contador de transcripciones usadas en el mes actual';`,
  'Migracion SQL:'
);

// ==================== PAGE 6 ====================
doc.addPage();
yPosition = margin;

addCodeBlock(
`// lib/db.ts - ACTUALIZAR INTERFACE:

export interface User {
  id: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  // NUEVOS CAMPOS:
  monthly_transcription_quota: number;
  transcriptions_used_this_month: number;
  quota_reset_date: Date;
}

// NUEVA FUNCION:
export const UserDB = {
  // ... funciones existentes ...

  // Verificar y consumir quota
  consumeQuota: async (userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetDate: Date;
  }> => {
    const user = await UserDB.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si necesita reset mensual
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    if (user.quota_reset_date < monthAgo) {
      await sql\`
        UPDATE users
        SET transcriptions_used_this_month = 0,
            quota_reset_date = CURRENT_TIMESTAMP
        WHERE id = \${userId}
      \`;
      user.transcriptions_used_this_month = 0;
    }

    // Verificar quota
    if (user.transcriptions_used_this_month >= user.monthly_transcription_quota) {
      return {
        allowed: false,
        remaining: 0,
        resetDate: new Date(user.quota_reset_date.getTime() + 30*24*60*60*1000)
      };
    }

    // Incrementar contador
    await sql\`
      UPDATE users
      SET transcriptions_used_this_month = transcriptions_used_this_month + 1
      WHERE id = \${userId}
    \`;

    return {
      allowed: true,
      remaining: user.monthly_transcription_quota - user.transcriptions_used_this_month - 1,
      resetDate: new Date(user.quota_reset_date.getTime() + 30*24*60*60*1000)
    };
  }
};`,
  'Codigo TypeScript (lib/db.ts):'
);

// ==================== PAGE 7 ====================
doc.addPage();
yPosition = margin;

addCodeBlock(
`// app/api/process/route.ts - AGREGAR VERIFICACION:

export async function POST(request: Request) {
  try {
    const user = verifyRequestAuth(request);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    // NUEVO: Verificar quota ANTES de procesar
    const quotaCheck = await UserDB.consumeQuota(user.userId);

    if (!quotaCheck.allowed) {
      return Response.json({
        error: 'Cuota mensual agotada',
        remaining: quotaCheck.remaining,
        resetDate: quotaCheck.resetDate.toISOString(),
        message: 'Has alcanzado tu limite de ' +
                 'transcripciones este mes. Actualiza tu plan o ' +
                 'espera hasta: ' + quotaCheck.resetDate.toLocaleDateString()
      }, { status: 402 }); // 402 Payment Required
    }

    // ... resto del codigo de procesamiento ...

    // En respuesta exitosa, informar quota restante:
    return Response.json({
      success: true,
      jobId: job.id,
      status: 'pending',
      quotaRemaining: quotaCheck.remaining,
      quotaResetDate: quotaCheck.resetDate
    });

  } catch (error: any) {
    console.error('[API Process] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}`,
  'Uso en API de Procesamiento:'
);

addCodeBlock(
`// Cron job para reset mensual (vercel.json):
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/reset-quotas",
      "schedule": "0 0 1 * *"
    }
  ]
}

// app/api/cron/reset-quotas/route.ts (NUEVO):
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql\`
      UPDATE users
      SET transcriptions_used_this_month = 0,
          quota_reset_date = CURRENT_TIMESTAMP
      WHERE quota_reset_date < NOW() - INTERVAL '1 month'
    \`;

    return Response.json({
      success: true,
      usersReset: result.rowCount
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}`,
  'Cron Job Mensual:'
);

addText('IMPACTO: Alto | PRIORIDAD: CRITICA | TIEMPO: 4 horas', 9, 'bold', [220, 53, 69]);

// ==================== PAGE 8 ====================
doc.addPage();
yPosition = margin;

addTitle('5. OBSERVABILIDAD - PROBLEMA CRITICO #5', 16);

addTitle('Sin Sistema de Monitoreo (Solo console.log)', 13, [220, 53, 69]);

addText('RIESGO: Errores criticos no detectados, sin alertas automaticas.', 9);
yPosition += 3;

addCodeBlock(
`// Instalar dependencias:
npm install @sentry/nextjs`,
  'Setup Sentry:'
);

addCodeBlock(
`// sentry.client.config.ts (NUEVO)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% de requests
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// sentry.server.config.ts (NUEVO)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// sentry.edge.config.ts (NUEVO)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});`,
  'Configuracion Sentry (3 archivos):'
);

addCodeBlock(
`// lib/inngest/functions.ts - AGREGAR ERROR TRACKING:

import * as Sentry from '@sentry/nextjs';

export const transcribeFile = inngest.createFunction(
  { ... },
  { event: 'task/transcribe' },
  async ({ event, step }) => {
    const { jobId } = event.data;

    try {
      // ... codigo existente ...

    } catch (error: any) {
      // CAPTURAR ERROR EN SENTRY:
      Sentry.captureException(error, {
        tags: {
          jobId,
          userId: event.data.userId,
          function: 'transcribeFile'
        },
        contexts: {
          job: {
            id: jobId,
            filename: event.data.filename,
            audioUrl: event.data.audioUrl
          }
        }
      });

      // Actualizar job status
      await TranscriptionJobDB.updateStatus(jobId, 'failed', error.message);

      throw error;
    }
  }
);`,
  'Integracion en Codigo:'
);

addText('CONFIGURACION GRATUITA: 10,000 eventos/mes (suficiente para inicio)', 9, 'italic');
addText('IMPACTO: Medio-Alto | PRIORIDAD: ALTA | TIEMPO: 4 horas', 9, 'bold', [255, 140, 0]);

// ==================== FOOTER ====================
const totalPages = doc.internal.pages.length - 1;
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Pagina ' + i + ' de ' + totalPages, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Annalogica - Auditoria Tecnica 2025', margin, pageHeight - 10);
}

doc.save('AUDITORIA-TECNICA.pdf');
console.log('PDF Tecnico generado correctamente: AUDITORIA-TECNICA.pdf');
console.log('Paginas totales:', totalPages);
