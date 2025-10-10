const { jsPDF } = require('jspdf');

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 20;
const usableWidth = pageWidth - (margin * 2);
let yPosition = margin;

// Helper functions
function checkNewPage(spaceNeeded = 20) {
  if (yPosition > pageHeight - margin - spaceNeeded) {
    doc.addPage();
    yPosition = margin;
    return true;
  }
  return false;
}

function addText(text, size = 10, style = 'normal', color = [0, 0, 0]) {
  doc.setFontSize(size);
  doc.setFont('helvetica', style);
  doc.setTextColor(color[0], color[1], color[2]);

  // Remove emojis and special characters
  const cleanText = text
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
    .replace(/✅|❌|⚠️|🔴|🟠|🟡|🚀|📅|📊|💰|🎯|✓/g, '') // Remove emojis
    .trim();

  const lines = doc.splitTextToSize(cleanText, usableWidth);
  lines.forEach(line => {
    checkNewPage();
    doc.text(line, margin, yPosition);
    yPosition += size * 0.5;
  });
  yPosition += 2;
}

function addTitle(text, size = 16, color = [255, 102, 0]) {
  checkNewPage(20);

  const cleanText = text
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/✅|❌|⚠️|🔴|🟠|🟡/g, '')
    .trim();

  doc.setFontSize(size);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(cleanText, margin, yPosition);
  yPosition += size * 0.6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;
}

function addBox(title, content, bgColor = [240, 248, 255], borderColor = [70, 130, 180]) {
  checkNewPage(40);

  const boxHeight = 8 + (content.length * 5);
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(margin, yPosition, usableWidth, boxHeight, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, usableWidth, boxHeight);

  yPosition += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);

  const cleanTitle = title.replace(/[^\x00-\x7F]/g, '').trim();
  doc.text(cleanTitle, margin + 5, yPosition);

  yPosition += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  content.forEach(line => {
    const cleanLine = line.replace(/[^\x00-\x7F]/g, '').trim();
    if (cleanLine) {
      doc.text(cleanLine, margin + 5, yPosition);
      yPosition += 5;
    }
  });

  yPosition += 5;
}

function addBullet(text, prefix = '  -') {
  checkNewPage();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const cleanText = text.replace(/[^\x00-\x7F]/g, '').trim();
  doc.text(prefix, margin, yPosition);

  const lines = doc.splitTextToSize(cleanText, usableWidth - 10);
  lines.forEach((line, i) => {
    if (i > 0) checkNewPage();
    doc.text(line, margin + 7, yPosition);
    yPosition += 5;
  });
}

function addTable(data) {
  checkNewPage(50);

  const numCols = data.headers.length;
  const colWidth = usableWidth / numCols;
  const rowHeight = 7;

  // Header
  doc.setFillColor(255, 102, 0);
  doc.rect(margin, yPosition, usableWidth, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  data.headers.forEach((header, i) => {
    const cleanHeader = header.replace(/[^\x00-\x7F]/g, '').trim();
    doc.text(cleanHeader, margin + (i * colWidth) + 2, yPosition + 5);
  });

  yPosition += rowHeight;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  data.rows.forEach((row, idx) => {
    checkNewPage(10);

    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition, usableWidth, rowHeight, 'F');
    }

    row.forEach((cell, i) => {
      const cleanCell = String(cell).replace(/[^\x00-\x7F]/g, '').trim();
      const cellLines = doc.splitTextToSize(cleanCell, colWidth - 4);
      doc.text(cellLines[0] || '', margin + (i * colWidth) + 2, yPosition + 5);
    });

    yPosition += rowHeight;
  });

  yPosition += 5;
}

function addSectionBreak() {
  checkNewPage(10);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
}

// ==================== COVER PAGE ====================
doc.setFillColor(255, 102, 0);
doc.rect(0, 0, pageWidth, 90, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(32);
doc.setFont('helvetica', 'bold');
doc.text('AUDITORIA EJECUTIVA', pageWidth / 2, 35, { align: 'center' });

doc.setFontSize(26);
doc.text('ANNALOGICA', pageWidth / 2, 52, { align: 'center' });

doc.setFontSize(13);
doc.setFont('helvetica', 'normal');
doc.text('Preparacion para Produccion y Comercializacion', pageWidth / 2, 70, { align: 'center' });

yPosition = 105;

doc.setTextColor(0, 0, 0);
doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.text('Fecha: 2025-10-10', margin, yPosition); yPosition += 6;
doc.text('Version: 1.0.0', margin, yPosition); yPosition += 6;
doc.text('Tipo: Resumen Ejecutivo', margin, yPosition); yPosition += 10;

addBox(
  'VEREDICTO GENERAL',
  [
    'APTO CON MEJORAS RECOMENDADAS',
    '',
    'Puntuacion Fiabilidad: 7.5/10',
    'Puntuacion Seguridad: 7.0/10',
    'Puntuacion Escalabilidad: 8.0/10',
    'Promedio General: 5.8/10'
  ],
  [240, 248, 255],
  [70, 130, 180]
);

addBox(
  'RECOMENDACION FINAL',
  [
    'NO LANZAR AHORA - Requiere mejoras criticas',
    'Tiempo necesario: 3-4 semanas',
    'Fecha sugerida lanzamiento: 2025-11-01',
    '',
    'BLOCKER: Documentacion legal GDPR inexistente'
  ],
  [255, 240, 240],
  [220, 53, 69]
);

// ==================== PAGE 2: EXECUTIVE SUMMARY ====================
doc.addPage();
yPosition = margin;

addTitle('1. RESUMEN EJECUTIVO', 18);

addText('Annalogica es una aplicacion SaaS de transcripcion de audio mediante IA. La auditoria tecnica revela una arquitectura solida pero con gaps criticos que deben resolverse antes del lanzamiento comercial.', 10);

yPosition += 5;

addTitle('Fortalezas Principales', 14, [34, 139, 34]);

addBullet('Stack moderno y escalable (Next.js 15, Vercel, PostgreSQL Neon)');
addBullet('Procesamiento asincrono robusto con Inngest y retry logic');
addBullet('Rate limiting implementado con Upstash Redis');
addBullet('Tracking completo de costos y usage analytics');
addBullet('Arquitectura serverless auto-escalable');
addBullet('Integracion con AssemblyAI y Claude AI (APIs lideres)');

yPosition += 5;

addTitle('Debilidades Criticas', 14, [220, 53, 69]);

addBullet('[BLOCKER LEGAL] Sin documentacion GDPR valida (Politica Privacidad, T&C)');
addBullet('[CRITICO] Vulnerabilidades de seguridad (XSS, sin CSP headers)');
addBullet('[CRITICO] Sin sistema de monitoreo ni alertas automaticas');
addBullet('[ALTO] Sin quotas mensuales por usuario (costos ilimitados)');
addBullet('[ALTO] Sin Circuit Breaker para APIs externas');
addBullet('[MEDIO] Sin Dead Letter Queue para jobs fallidos');

// ==================== PAGE 3: CRITICAL ISSUES ====================
doc.addPage();
yPosition = margin;

addTitle('2. PROBLEMAS CRITICOS (Top 6)', 18);

addTitle('BLOCKER #1: Documentacion Legal Inexistente', 13, [220, 53, 69]);
addText('Sin Politica de Privacidad ni Terminos y Condiciones conformes a GDPR.', 9);
addBullet('Riesgo: Multas hasta 20M EUR o 4% facturacion anual');
addBullet('Solucion: Contratar abogado GDPR (800-1,500 EUR)');
addBullet('Tiempo: 1-2 semanas');
addBullet('Prioridad: BLOCKER - No lanzar sin esto');
yPosition += 3;

addTitle('CRITICO #2: Vulnerabilidad XSS (Cross-Site Scripting)', 13, [220, 53, 69]);
addText('JWT almacenado en localStorage (accesible desde JavaScript).', 9);
addBullet('Riesgo: Ataque XSS permite robo de tokens de sesion');
addBullet('Solucion: Migrar a httpOnly cookies (seguros)');
addBullet('Tiempo: 2 horas desarrollo');
addBullet('Prioridad: CRITICA');
yPosition += 3;

addTitle('CRITICO #3: Sin Content Security Policy (CSP)', 13, [220, 53, 69]);
addText('Headers de seguridad no configurados (CSP, X-Frame-Options, etc).', 9);
addBullet('Riesgo: Code injection, clickjacking, MIME sniffing');
addBullet('Solucion: Configurar security headers en next.config.ts');
addBullet('Tiempo: 4 horas desarrollo');
addBullet('Prioridad: CRITICA');
yPosition += 3;

addTitle('CRITICO #4: Sin Limites de Tamano de Archivo', 13, [220, 53, 69]);
addText('No hay validacion de tamano maximo de archivos subidos.', 9);
addBullet('Riesgo: Ataque DoS con archivos gigantes');
addBullet('Solucion: Limite de 100MB por archivo');
addBullet('Tiempo: 1 hora desarrollo');
addBullet('Prioridad: CRITICA');

// ==================== PAGE 4: MORE CRITICAL ISSUES + TABLE ====================
doc.addPage();
yPosition = margin;

addTitle('CRITICO #5: Sin Quotas Mensuales por Usuario', 13, [220, 53, 69]);
addText('Rate limiting por hora existe, pero sin limite mensual total.', 9);
addBullet('Riesgo: Costos ilimitados si usuario abusa del sistema');
addBullet('Solucion: Cuota mensual (ej: 100 transcripciones/mes)');
addBullet('Tiempo: 4 horas desarrollo');
addBullet('Prioridad: CRITICA');
yPosition += 3;

addTitle('CRITICO #6: Sin Sistema de Monitoreo', 13, [220, 53, 69]);
addText('Solo console.log, sin tracking de errores ni alertas automaticas.', 9);
addBullet('Riesgo: Problemas criticos no detectados a tiempo');
addBullet('Solucion: Integrar Sentry + Axiom + alertas Discord/Email');
addBullet('Tiempo: 4 horas desarrollo');
addBullet('Prioridad: ALTA');

yPosition += 10;

addTitle('TABLA RESUMEN: Problemas Criticos', 14);

addTable({
  headers: ['Problema', 'Impacto', 'Prioridad', 'Tiempo'],
  rows: [
    ['Sin docs GDPR', 'LEGAL', 'BLOCKER', '1-2 sem'],
    ['JWT en localStorage', 'Alto', 'CRITICA', '2h'],
    ['Sin CSP headers', 'Alto', 'CRITICA', '4h'],
    ['Sin limite archivos', 'Alto', 'CRITICA', '1h'],
    ['Sin quotas usuario', 'Alto', 'CRITICA', '4h'],
    ['Sin monitoreo', 'Medio-Alto', 'ALTA', '4h'],
    ['Sin Circuit Breaker', 'Alto', 'CRITICA', '6h'],
    ['Sin API key rotation', 'Medio', 'ALTA', '2h'],
    ['Sin Dead Letter Queue', 'Medio', 'MEDIA', '3h'],
    ['Sin alertas', 'Medio', 'MEDIA', '2h']
  ]
});

// ==================== PAGE 5: FINANCIAL PROJECTION ====================
doc.addPage();
yPosition = margin;

addTitle('3. PROYECCION FINANCIERA', 18);

addText('Escenario base: 100 usuarios activos', 11, 'bold');
addText('Uso promedio: 10 transcripciones por mes por usuario', 10);
addText('Total mensual: 1,000 transcripciones', 10);

yPosition += 5;

addTitle('Costos Mensuales Estimados', 14, [70, 130, 180]);

addTable({
  headers: ['Servicio', 'Consumo', 'Costo/mes (USD)'],
  rows: [
    ['AssemblyAI', '1,000 x 10min', '$150.00'],
    ['Claude Sonnet 4.5', '1,000 resumenes', '$20.00'],
    ['Vercel Blob Storage', '50 GB', '$1.15'],
    ['Vercel Blob Bandwidth', '100 GB downloads', '$5.00'],
    ['Neon Postgres', 'Hobby tier', '$0.00'],
    ['Upstash Redis', 'Free tier', '$0.00'],
    ['Inngest', '10k events/mes', '$0.00'],
    ['', 'TOTAL MENSUAL', '$176.15']
  ]
});

yPosition += 10;

addTitle('Modelo de Negocio Sugerido', 14, [34, 139, 34]);

addBullet('Precio sugerido: $2.50 USD / usuario / mes');
addBullet('Incluye: 100 transcripciones mensuales');
addBullet('Ingresos (100 usuarios): $250.00 / mes');
addBullet('Costos operacionales: $176.15 / mes');
addBullet('Margen bruto: $73.85 (30%)');
addBullet('Break-even point: ~70 usuarios');

yPosition += 10;

addTitle('Proyeccion de Escalabilidad', 14, [70, 130, 180]);

addTable({
  headers: ['Usuarios', 'Ingresos/mes', 'Costos/mes', 'Margen'],
  rows: [
    ['100', '$250', '$176', '$74 (30%)'],
    ['500', '$1,250', '$881', '$369 (30%)'],
    ['1,000', '$2,500', '$1,761', '$739 (30%)'],
    ['5,000', '$12,500', '$8,808', '$3,692 (30%)'],
    ['10,000', '$25,000', '$17,615', '$7,385 (30%)']
  ]
});

addText('NOTA: Stack serverless escala automaticamente sin costos fijos adicionales.', 9, 'italic');

// ==================== PAGE 6: ACTION PLAN ====================
doc.addPage();
yPosition = margin;

addTitle('4. PLAN DE ACCION (4 Semanas)', 18);

addTitle('SEMANA 1-2: Legal (BLOCKER)', 14, [220, 53, 69]);
addText('Objetivo: Cumplimiento GDPR/LSSI-CE', 10, 'bold');
addBullet('Contratar abogado especialista GDPR/LSSI-CE');
addBullet('Redactar Politica de Privacidad conforme RGPD');
addBullet('Redactar Terminos y Condiciones');
addBullet('Crear Politica de Cookies');
addBullet('Implementar banner de consentimiento de cookies');
addBullet('Crear Registro de Actividades de Tratamiento (RAT)');
addBullet('Documentar medidas tecnicas y organizativas');
addText('Costo estimado: 800-1,500 EUR (abogado)', 10, 'bold', [220, 53, 69]);
addText('Responsable: Legal + Product Owner', 9, 'italic');

yPosition += 5;

addTitle('SEMANA 2: Seguridad Critica', 14, [255, 140, 0]);
addText('Objetivo: Eliminar vulnerabilidades criticas', 10, 'bold');
addBullet('DIA 1: Migrar JWT a httpOnly cookies (2h)');
addBullet('DIA 1: Configurar CORS en next.config.ts (1h)');
addBullet('DIA 1: Agregar security headers CSP, X-Frame-Options (4h)');
addBullet('DIA 2: Validacion tamano archivos max 100MB (1h)');
addBullet('DIA 2: Implementar quotas mensuales por usuario (4h)');
addBullet('DIA 2: Agregar timeouts en Inngest functions (1h)');
addBullet('DIA 3: Circuit Breaker para AssemblyAI/Claude (6h)');
addBullet('DIA 3: Dead Letter Queue para jobs fallidos (3h)');
addBullet('DIA 4: Health check endpoint /api/health (1h)');
addBullet('DIA 4: Testing de seguridad (4h)');
addText('Tiempo estimado: 3-4 dias desarrollo', 10, 'bold', [255, 140, 0]);
addText('Responsable: Desarrollador Full-Stack', 9, 'italic');

// ==================== PAGE 7: ACTION PLAN CONTINUED ====================
doc.addPage();
yPosition = margin;

addTitle('SEMANA 3: Observabilidad', 14, [70, 130, 180]);
addText('Objetivo: Monitoreo y alertas en produccion', 10, 'bold');
addBullet('DIA 1: Integrar Sentry para error tracking (2h)');
addBullet('DIA 1: Configurar Axiom para structured logging (2h)');
addBullet('DIA 1: Dashboards basicos de metricas (2h)');
addBullet('DIA 2: Implementar alertas automaticas Discord/Email (2h)');
addBullet('DIA 2: Configurar uptime monitoring BetterUptime (1h)');
addBullet('DIA 2: Crear runbooks para incidentes comunes (3h)');
addText('Tiempo estimado: 2 dias desarrollo', 10, 'bold', [70, 130, 180]);
addText('Responsable: Desarrollador Full-Stack + DevOps', 9, 'italic');

yPosition += 5;

addTitle('SEMANA 4: Testing y Soft Launch', 14, [34, 139, 34]);
addText('Objetivo: Validacion pre-produccion', 10, 'bold');
addBullet('DIA 1-2: Auditoria de seguridad final');
addBullet('DIA 2-3: Testing exhaustivo (unit + integration + e2e)');
addBullet('DIA 3: Preparar documentacion de usuario');
addBullet('DIA 4-5: Soft launch con beta testers (10-20 usuarios)');
addBullet('DIA 5: Monitorear metricas y KPIs');
addBullet('DIA 5: Ajustar basado en feedback inicial');
addText('Responsable: Equipo completo', 9, 'italic');

yPosition += 10;

addTitle('Recursos Necesarios', 14);

addBox(
  'EQUIPO Y PRESUPUESTO',
  [
    '1 Desarrollador Full-Stack (tiempo completo 3 semanas)',
    '1 Abogado GDPR (consultoria externa)',
    '',
    'Budget herramientas: $0 (free tiers disponibles)',
    'Budget legal: 800-1,500 EUR',
    'Budget total estimado: 800-1,500 EUR'
  ],
  [255, 248, 220],
  [255, 140, 0]
);

// ==================== PAGE 8: KPIs ====================
doc.addPage();
yPosition = margin;

addTitle('5. METRICAS Y KPIs POST-LANZAMIENTO', 18);

addTitle('KPIs Tecnicos', 14, [70, 130, 180]);
addText('Metricas operacionales criticas:', 10, 'bold');
addBullet('Uptime: > 99.5% (objetivo: 99.9%)');
addBullet('Latencia API: < 500ms p95 (objetivo: < 300ms)');
addBullet('Error Rate: < 0.5% (objetivo: < 0.1%)');
addBullet('Job Success Rate: > 95% (objetivo: > 98%)');
addBullet('Time to First Transcription: < 2 minutos');

yPosition += 5;

addTitle('KPIs de Negocio', 14, [34, 139, 34]);
addText('Metricas de crecimiento y retencion:', 10, 'bold');
addBullet('Conversion registro -> primer uso: > 60%');
addBullet('Retencion mes 1: > 40%');
addBullet('Churn rate mensual: < 5%');
addBullet('Net Promoter Score (NPS): > 50');
addBullet('Customer Acquisition Cost (CAC): < $10');
addBullet('Lifetime Value (LTV): > $50');

yPosition += 5;

addTitle('Dashboards Requeridos', 14);

addText('1. Dashboard Operacional (tiempo real):', 10, 'bold');
addBullet('Requests por minuto');
addBullet('Error rate y tipos de errores');
addBullet('P50/P95/P99 latency');
addBullet('Active jobs en cola');
addBullet('Queue depth y backlog');

yPosition += 3;

addText('2. Dashboard de Negocio (diario):', 10, 'bold');
addBullet('Nuevos registros por dia');
addBullet('Transcripciones procesadas por dia');
addBullet('Revenue diario');
addBullet('Costos operacionales diarios');
addBullet('Margen neto (Revenue - Costos)');

yPosition += 3;

addText('3. Dashboard de Seguridad (semanal):', 10, 'bold');
addBullet('Login attempts fallidos');
addBullet('Rate limit violations');
addBullet('API key rotations pendientes');
addBullet('Anomalias detectadas');

// ==================== PAGE 9: CONCLUSION ====================
doc.addPage();
yPosition = margin;

addTitle('6. CONCLUSION Y RECOMENDACION FINAL', 18);

addBox(
  'VEREDICTO EJECUTIVO',
  [
    'NO LANZAR AHORA',
    '',
    'La aplicacion tiene una arquitectura solida pero',
    'requiere resolver BLOCKER legal y vulnerabilidades',
    'criticas de seguridad antes de comercializacion.'
  ],
  [255, 240, 240],
  [220, 53, 69]
);

yPosition += 5;

addBox(
  'FECHA RECOMENDADA DE LANZAMIENTO',
  [
    'LANZAMIENTO: 2025-11-01 (en 3-4 semanas)',
    '',
    'Despues de completar:',
    '  - Fase Legal (BLOCKER)',
    '  - Fase Seguridad Critica',
    '  - Fase Observabilidad',
    '  - Testing exhaustivo'
  ],
  [240, 255, 240],
  [34, 139, 34]
);

yPosition += 5;

addTitle('Evolucion de Puntuacion', 14);

addTable({
  headers: ['Momento', 'Puntuacion', 'Estado', 'Apto Produccion'],
  rows: [
    ['Ahora', '5.8/10', 'No listo', 'NO'],
    ['Post Fase 1+2+3', '8.5/10', 'Listo', 'SI'],
    ['Post Fase 4 (UX)', '9.2/10', 'Excelencia', 'SI']
  ]
});

yPosition += 10;

addTitle('Riesgos de Lanzar Sin Mejoras', 14, [220, 53, 69]);
addBullet('LEGAL: Multas GDPR hasta 20M EUR o 4% facturacion global');
addBullet('SEGURIDAD: Robo de datos y tokens de usuarios (XSS)');
addBullet('FINANCIERO: Costos ilimitados por abuso de usuarios');
addBullet('REPUTACIONAL: Caidas de servicio sin deteccion ni monitoreo');
addBullet('OPERACIONAL: Imposibilidad de detectar y resolver problemas');
addBullet('NEGOCIO: Perdida de confianza de clientes y marca');

yPosition += 10;

addTitle('Proximos Pasos Inmediatos (Esta Semana)', 14, [34, 139, 34]);
addBullet('1. Contactar abogado GDPR especialista (presupuesto 800-1,500 EUR)');
addBullet('2. Crear issues en GitHub para cada problema critico');
addBullet('3. Asignar recursos: 1 desarrollador full-time por 3 semanas');
addBullet('4. Iniciar implementacion Fase 2 (Seguridad Critica)');
addBullet('5. Configurar herramientas (Sentry, Axiom - free tiers)');

yPosition += 10;

addSectionBreak();

addText('CONFIDENCIAL - Solo para stakeholders autorizados', 9, 'italic', [150, 150, 150]);
addText('Documento generado: 2025-10-10', 9, 'italic', [150, 150, 150]);
addText('Proxima revision: Post-implementacion Fases 1-3', 9, 'italic', [150, 150, 150]);

// ==================== FOOTER ====================
const totalPages = doc.internal.pages.length - 1;
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Pagina ' + i + ' de ' + totalPages, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Annalogica - Auditoria Ejecutiva 2025', margin, pageHeight - 10);
  doc.text('CONFIDENCIAL', pageWidth - margin - 25, pageHeight - 10);
}

doc.save('AUDITORIA-EJECUTIVA.pdf');
console.log('PDF Ejecutivo generado correctamente: AUDITORIA-EJECUTIVA.pdf');
console.log('Paginas totales:', totalPages);
