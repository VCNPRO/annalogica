const { jsPDF } = require('jspdf');
const fs = require('fs');

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

// Helper to add new page if needed
function checkNewPage(spaceNeeded = 20) {
  if (yPosition > pageHeight - margin - spaceNeeded) {
    doc.addPage();
    yPosition = margin;
    return true;
  }
  return false;
}

// Helper to add text with word wrap
function addText(text, size = 10, style = 'normal', color = [0, 0, 0]) {
  doc.setFontSize(size);
  doc.setFont('helvetica', style);
  doc.setTextColor(color[0], color[1], color[2]);

  const lines = doc.splitTextToSize(text, usableWidth);
  lines.forEach(line => {
    checkNewPage();
    doc.text(line, margin, yPosition);
    yPosition += size * 0.5;
  });
  yPosition += 3;
}

function addTitle(text, size = 16, color = [255, 102, 0]) {
  checkNewPage(20);
  doc.setFontSize(size);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(text, margin, yPosition);
  yPosition += size * 0.6;

  // Underline
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;
}

function addBox(title, content, bgColor = [240, 248, 255], borderColor = [70, 130, 180]) {
  checkNewPage(40);

  const boxHeight = 35;
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(margin, yPosition, usableWidth, boxHeight, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, usableWidth, boxHeight);

  yPosition += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, margin + 5, yPosition);

  yPosition += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  content.forEach(line => {
    doc.text(line, margin + 5, yPosition);
    yPosition += 5;
  });

  yPosition += 10;
}

function addBullet(text, icon = '•') {
  checkNewPage();
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  doc.text(icon, margin, yPosition);
  const lines = doc.splitTextToSize(text, usableWidth - 10);
  lines.forEach((line, i) => {
    if (i > 0) checkNewPage();
    doc.text(line, margin + 7, yPosition);
    yPosition += 5;
  });
}

function addTable(data) {
  checkNewPage(50);

  const colWidths = [50, 30, 30, 30];
  const rowHeight = 8;

  // Header
  doc.setFillColor(255, 102, 0);
  doc.rect(margin, yPosition, usableWidth, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  let xPos = margin;
  data.headers.forEach((header, i) => {
    doc.text(header, xPos + 2, yPosition + 5.5);
    xPos += colWidths[i];
  });

  yPosition += rowHeight;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  data.rows.forEach((row, idx) => {
    checkNewPage(15);

    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition, usableWidth, rowHeight, 'F');
    }

    xPos = margin;
    row.forEach((cell, i) => {
      doc.text(String(cell), xPos + 2, yPosition + 5.5);
      xPos += colWidths[i];
    });

    yPosition += rowHeight;
  });

  yPosition += 5;
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
doc.text('Preparación para Producción y Comercialización', pageWidth / 2, 70, { align: 'center' });

yPosition = 105;

doc.setTextColor(0, 0, 0);
doc.setFontSize(11);
addText('Fecha: 2025-10-10', 11, 'bold');
addText('Version: 1.0.0', 11, 'bold');
addText('Tipo: Resumen Ejecutivo', 11, 'bold');

yPosition += 5;

addBox(
  'VEREDICTO GENERAL',
  [
    'APTO CON MEJORAS RECOMENDADAS ⚠️',
    '',
    'Puntuación Fiabilidad: 7.5/10',
    'Puntuación Seguridad: 7.0/10',
    'Puntuación Escalabilidad: 8.0/10'
  ],
  [240, 248, 255],
  [70, 130, 180]
);

addBox(
  'RECOMENDACIÓN',
  [
    'NO LANZAR AHORA',
    'Requiere 3-4 semanas de trabajo adicional',
    '',
    'Fecha sugerida: 2025-11-01'
  ],
  [255, 240, 240],
  [220, 53, 69]
);

// ==================== PAGE 2: SUMMARY ====================
doc.addPage();
yPosition = margin;

addTitle('1. RESUMEN EJECUTIVO', 18);

addText('Annalogica es una aplicación SaaS de transcripción de audio mediante IA. La auditoría técnica revela una arquitectura sólida pero con gaps críticos que deben resolverse antes del lanzamiento comercial.', 11);

yPosition += 5;

addTitle('Fortalezas Principales', 14, [34, 139, 34]);

addBullet('Stack moderno y escalable (Next.js 15, Vercel, PostgreSQL Neon)');
addBullet('Procesamiento asíncrono robusto con Inngest y retry logic');
addBullet('Rate limiting implementado con Upstash Redis');
addBullet('Tracking completo de costos y usage analytics');
addBullet('Arquitectura serverless auto-escalable');

yPosition += 5;

addTitle('Debilidades Críticas', 14, [220, 53, 69]);

addBullet('❌ BLOCKER LEGAL: Sin documentación GDPR válida (Política Privacidad, T&C)');
addBullet('❌ CRÍTICO: Vulnerabilidades de seguridad (XSS, sin CSP headers)');
addBullet('❌ CRÍTICO: Sin sistema de monitoreo ni alertas automáticas');
addBullet('⚠️ ALTO: Sin quotas mensuales por usuario (costos ilimitados)');
addBullet('⚠️ ALTO: Sin Circuit Breaker para APIs externas (AssemblyAI, Claude)');

// ==================== PAGE 3: PROBLEMAS CRÍTICOS ====================
doc.addPage();
yPosition = margin;

addTitle('2. PROBLEMAS CRÍTICOS (Top 6)', 18);

addTitle('BLOCKER #1: Documentación Legal Inexistente', 13, [220, 53, 69]);
addText('Sin Política de Privacidad ni Términos y Condiciones conformes a GDPR.', 10);
addBullet('Riesgo: Multas hasta €20M o 4% facturación anual', '⚠️');
addBullet('Solución: Contratar abogado GDPR (€800-1,500)', '✓');
addBullet('Tiempo: 1-2 semanas', '📅');
yPosition += 3;

addTitle('CRÍTICO #2: Vulnerabilidad XSS', 13, [220, 53, 69]);
addText('JWT almacenado en localStorage (accesible desde JavaScript).', 10);
addBullet('Riesgo: Ataque XSS permite robo de tokens', '⚠️');
addBullet('Solución: Migrar a httpOnly cookies', '✓');
addBullet('Tiempo: 2 horas', '📅');
yPosition += 3;

addTitle('CRÍTICO #3: Sin Content Security Policy', 13, [220, 53, 69]);
addText('Headers de seguridad no configurados (CSP, X-Frame-Options).', 10);
addBullet('Riesgo: Code injection, clickjacking', '⚠️');
addBullet('Solución: Configurar security headers en next.config.ts', '✓');
addBullet('Tiempo: 4 horas', '📅');
yPosition += 3;

addTitle('CRÍTICO #4: Sin Límites de Archivo', 13, [220, 53, 69]);
addText('No hay validación de tamaño máximo de archivos.', 10);
addBullet('Riesgo: Ataque DoS con archivos gigantes', '⚠️');
addBullet('Solución: Límite de 100MB por archivo', '✓');
addBullet('Tiempo: 1 hora', '📅');

// ==================== PAGE 4: CRITICAL TABLE ====================
doc.addPage();
yPosition = margin;

addTitle('CRÍTICO #5: Sin Quotas por Usuario', 13, [220, 53, 69]);
addText('Rate limiting por hora, pero sin límite mensual.', 10);
addBullet('Riesgo: Costos ilimitados por usuario', '⚠️');
addBullet('Solución: Cuota mensual (ej: 100 transcripciones/mes)', '✓');
addBullet('Tiempo: 4 horas', '📅');
yPosition += 3;

addTitle('CRÍTICO #6: Sin Sistema de Monitoreo', 13, [220, 53, 69]);
addText('Solo console.log, sin tracking de errores ni alertas.', 10);
addBullet('Riesgo: Problemas críticos no detectados a tiempo', '⚠️');
addBullet('Solución: Integrar Sentry + Axiom + alertas Discord', '✓');
addBullet('Tiempo: 4 horas', '📅');

yPosition += 10;

addTitle('3. TABLA DE PROBLEMAS CRÍTICOS', 18);

addTable({
  headers: ['Problema', 'Impacto', 'Prioridad', 'Tiempo'],
  rows: [
    ['Sin docs GDPR válidas', 'LEGAL', '🔴 BLOCKER', '1-2 sem'],
    ['Tokens en localStorage', 'Alto', '🔴 CRÍTICO', '2h'],
    ['Sin CSP headers', 'Alto', '🔴 CRÍTICO', '4h'],
    ['Sin límite archivos', 'Alto', '🔴 CRÍTICO', '1h'],
    ['Sin quotas usuario', 'Alto', '🔴 CRÍTICO', '4h'],
    ['Sin monitoreo', 'Medio-Alto', '🟠 ALTO', '4h'],
    ['Sin Circuit Breaker', 'Alto', '🔴 CRÍTICO', '6h'],
    ['API keys sin rotation', 'Medio', '🟠 ALTO', '2h'],
    ['Sin Dead Letter Queue', 'Medio', '🟡 MEDIO', '3h'],
    ['Sin alertas', 'Medio', '🟡 MEDIO', '2h']
  ]
});

// ==================== PAGE 5: FINANCIAL ====================
doc.addPage();
yPosition = margin;

addTitle('4. PROYECCIÓN FINANCIERA', 18);

addText('Escenario: 100 usuarios activos, 10 transcripciones/mes cada uno = 1,000 transcripciones/mes', 11, 'bold');

yPosition += 5;

addTable({
  headers: ['Servicio', 'Consumo', 'Costo/mes'],
  rows: [
    ['AssemblyAI', '1,000 × 10min', '$150.00'],
    ['Claude Sonnet 4.5', '1,000 resúmenes', '$20.00'],
    ['Vercel Blob Storage', '50 GB', '$1.15'],
    ['Vercel Blob Bandwidth', '100 GB', '$5.00'],
    ['Neon Postgres', 'Hobby tier', '$0.00'],
    ['Upstash Redis', 'Free tier', '$0.00'],
    ['Inngest', '10k events', '$0.00'],
    ['TOTAL MENSUAL', '', '$176.15']
  ]
});

yPosition += 10;

addTitle('Modelo de Negocio Sugerido', 14, [34, 139, 34]);

addBullet('Precio: $2-3 / usuario / mes');
addBullet('Incluye: 100 transcripciones mensuales');
addBullet('Ingresos (100 usuarios × $2.50): $250/mes');
addBullet('Costos: $176.15/mes');
addBullet('Margen bruto: $73.85 (30%)');
addBullet('Break-even: ~70 usuarios');

yPosition += 10;

addBox(
  'ESCALABILIDAD',
  [
    '1,000 usuarios → $1,761/mes costos',
    '10,000 usuarios → $17,615/mes costos',
    '',
    'Stack serverless escala automáticamente'
  ],
  [240, 255, 240],
  [34, 139, 34]
);

// ==================== PAGE 6: ACTION PLAN ====================
doc.addPage();
yPosition = margin;

addTitle('5. PLAN DE ACCIÓN (4 SEMANAS)', 18);

addTitle('SEMANA 1-2: Legal (BLOCKER)', 14, [220, 53, 69]);
addBullet('Contratar abogado especialista GDPR/LSSI-CE');
addBullet('Redactar Política de Privacidad conforme RGPD');
addBullet('Redactar Términos y Condiciones');
addBullet('Crear Política de Cookies');
addBullet('Implementar banner de consentimiento');
addBullet('Registro de Actividades de Tratamiento');
addText('Costo estimado: €800-1,500', 10, 'bold', [220, 53, 69]);

yPosition += 5;

addTitle('SEMANA 2: Seguridad Crítica', 14, [255, 140, 0]);
addBullet('Migrar JWT a httpOnly cookies (2h)');
addBullet('Configurar CORS y security headers (4h)');
addBullet('Agregar validación tamaño archivos (1h)');
addBullet('Implementar quotas mensuales (4h)');
addBullet('Circuit Breaker para APIs (6h)');
addBullet('Timeouts en Inngest functions (1h)');
addText('Tiempo estimado: 3-4 días desarrollo', 10, 'bold', [255, 140, 0]);

yPosition += 5;

addTitle('SEMANA 3: Observabilidad', 14, [70, 130, 180]);
addBullet('Integrar Sentry para error tracking (2h)');
addBullet('Configurar Axiom para structured logging (2h)');
addBullet('Implementar alertas automáticas (2h)');
addBullet('Crear health check endpoint (1h)');
addBullet('Configurar dashboards operacionales (3h)');
addText('Tiempo estimado: 2 días desarrollo', 10, 'bold', [70, 130, 180]);

yPosition += 5;

addTitle('SEMANA 4: Testing y Launch', 14, [34, 139, 34]);
addBullet('Auditoría de seguridad final');
addBullet('Testing exhaustivo (unit + integration)');
addBullet('Soft launch con beta testers (10-20 usuarios)');
addBullet('Monitorear métricas y ajustar');

// ==================== PAGE 7: TIMELINE ====================
doc.addPage();
yPosition = margin;

addTitle('6. TIMELINE Y RECURSOS', 18);

addBox(
  'ESFUERZO TOTAL ESTIMADO',
  [
    'Desarrollo: 50-60 horas (~1.5 semanas)',
    'Legal: 1-2 semanas (externo)',
    'Testing: 3-5 días',
    '',
    'TOTAL: 3-4 semanas calendario'
  ],
  [255, 248, 220],
  [255, 140, 0]
);

yPosition += 5;

addTitle('Recursos Necesarios', 14);
addBullet('1 Desarrollador Full-Stack (tiempo completo)');
addBullet('1 Abogado GDPR (consultoría externa)');
addBullet('Budget herramientas: $0 (free tiers Sentry, Axiom)');
addBullet('Budget legal: €800-1,500');

yPosition += 10;

addTitle('KPIs Post-Lanzamiento', 14);

addText('Técnicos:', 11, 'bold');
addBullet('Uptime: >99.5%');
addBullet('Latencia API: <500ms p95');
addBullet('Error Rate: <0.5%');
addBullet('Job Success Rate: >95%');

yPosition += 5;

addText('Negocio:', 11, 'bold');
addBullet('Conversión registro → uso: >60%');
addBullet('Retención mes 1: >40%');
addBullet('Churn rate: <5%/mes');
addBullet('NPS: >50');

// ==================== PAGE 8: CONCLUSION ====================
doc.addPage();
yPosition = margin;

addTitle('7. CONCLUSIÓN Y RECOMENDACIÓN', 18);

addBox(
  'VEREDICTO FINAL',
  [
    '❌ NO LANZAR AHORA',
    '',
    'Requiere resolver BLOCKER legal y',
    'vulnerabilidades críticas de seguridad'
  ],
  [255, 240, 240],
  [220, 53, 69]
);

addBox(
  'FECHA RECOMENDADA DE LANZAMIENTO',
  [
    '✅ 2025-11-01 (en 3-4 semanas)',
    '',
    'Después de completar:',
    '• Fase Legal (BLOCKER)',
    '• Fase Seguridad Crítica',
    '• Fase Observabilidad'
  ],
  [240, 255, 240],
  [34, 139, 34]
);

yPosition += 5;

addTitle('Evolución de Puntuación', 14);

addTable({
  headers: ['Momento', 'Puntuación', 'Estado'],
  rows: [
    ['Ahora', '5.8/10', '⚠️ No listo'],
    ['Post Fase 1+2+3', '8.5/10', '✅ Listo producción'],
    ['Post Fase 4 (UX)', '9.2/10', '🚀 Excelencia']
  ]
});

yPosition += 10;

addTitle('Riesgos de Lanzar Sin Mejoras', 14, [220, 53, 69]);
addBullet('LEGAL: Multas GDPR hasta €20M');
addBullet('SEGURIDAD: Robo de datos de usuarios');
addBullet('FINANCIERO: Costos ilimitados por abuso');
addBullet('REPUTACIONAL: Caídas sin monitoreo');
addBullet('OPERACIONAL: Imposible detectar problemas');

yPosition += 10;

addTitle('Próximos Pasos Inmediatos', 14, [34, 139, 34]);
addText('ESTA SEMANA:', 11, 'bold');
addBullet('Contactar abogado GDPR especialista');
addBullet('Crear issues GitHub para problemas críticos');
addBullet('Asignar recursos desarrollo (1 dev full-time)');
addBullet('Iniciar implementación Fase 2 (Seguridad)');

// ==================== FOOTER ====================
const totalPages = doc.internal.pages.length - 1;
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Annalogica - Auditoría Ejecutiva 2025', margin, pageHeight - 10);
  doc.text('CONFIDENCIAL', pageWidth - margin - 25, pageHeight - 10);
}

doc.save('AUDITORIA-EJECUTIVA.pdf');
console.log('✅ PDF Ejecutivo generado: AUDITORIA-EJECUTIVA.pdf');
