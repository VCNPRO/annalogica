const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Crear directorio de salida si no existe
const outputDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'guia-usuario-annalogica.pdf');

// Crear documento PDF
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'Guía Completa de Usuario - Annalogica',
    Author: 'Annalogica',
    Subject: 'Transcripción Profesional con IA',
    Keywords: 'transcripción, IA, audio, vídeo, annalogica'
  }
});

// Pipe a archivo
doc.pipe(fs.createWriteStream(outputPath));

// Helper functions
const addTitle = (text, size = 24) => {
  doc.fontSize(size)
     .font('Helvetica-Bold')
     .fillColor('#1a1a1a')
     .text(text, { align: 'center' });
  doc.moveDown(0.5);
};

const addSectionTitle = (text, size = 18) => {
  doc.fontSize(size)
     .font('Helvetica-Bold')
     .fillColor('#2563eb')
     .text(text);
  doc.moveDown(0.3);
};

const addSubsectionTitle = (text, size = 14) => {
  doc.fontSize(size)
     .font('Helvetica-Bold')
     .fillColor('#1a1a1a')
     .text(text);
  doc.moveDown(0.2);
};

const addParagraph = (text, size = 11) => {
  doc.fontSize(size)
     .font('Helvetica')
     .fillColor('#374151')
     .text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.5);
};

const addBulletList = (items, indent = 30) => {
  items.forEach(item => {
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#374151')
       .list([item], { indent });
  });
  doc.moveDown(0.3);
};

const addSeparator = () => {
  doc.moveDown(0.3);
  doc.strokeColor('#e5e7eb')
     .lineWidth(1)
     .moveTo(50, doc.y)
     .lineTo(545, doc.y)
     .stroke();
  doc.moveDown(0.5);
};

// ======================
// CONTENIDO DEL PDF
// ======================

// PAGE 1: COVER
addTitle('Annalogica', 32);
doc.moveDown(0.5);

doc.fontSize(16)
   .font('Helvetica')
   .fillColor('#6b7280')
   .text('Guía Completa de Usuario', { align: 'center' });
doc.moveDown(0.3);

doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Transcripción Profesional con IA', { align: 'center' });
doc.moveDown(2);

doc.fontSize(12)
   .font('Helvetica')
   .fillColor('#6b7280')
   .text('Versión 1.0 - Enero 2025', { align: 'center' });
doc.moveDown(3);

// Tabla de Contenidos
addSectionTitle('Tabla de Contenidos', 16);
const tocItems = [
  '1. Quick Start - Primeros Pasos',
  '2. Introducción a Annalogica',
  '3. Funcionalidades Detalladas',
  '4. Gestión de Archivos',
  '5. Planes y Límites',
  '6. Preguntas Frecuentes',
  '7. Solución de Problemas',
  '8. Soporte y Contacto'
];

doc.fontSize(11)
   .font('Helvetica')
   .fillColor('#374151');
tocItems.forEach(item => {
  doc.text(item);
  doc.moveDown(0.2);
});

addSeparator();

// SECTION 1: QUICK START
doc.addPage();
addSectionTitle('1. Quick Start - Primeros Pasos');

addSubsectionTitle('Paso 1: Registro y Acceso');
addParagraph('Accede a https://annalogica.eu y crea tu cuenta:');
addBulletList([
  'Introduce tu email y contraseña',
  'Verifica tu cuenta por email',
  'Inicia sesión en el dashboard'
]);

doc.fontSize(10)
   .font('Helvetica-Bold')
   .fillColor('#059669')
   .text('Consejo: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Comienza con el plan gratuito para probar la plataforma (1 hora de transcripción mensual)');
doc.moveDown(1);

addSubsectionTitle('Paso 2: Cargar tu Primer Archivo');
addParagraph('Desde el dashboard principal:');
addBulletList([
  'Arrastra y suelta tu archivo de audio/vídeo en la zona de carga',
  'O haz clic en "Selecciona archivos de tu equipo"',
  'Espera a que se complete la subida (verás una barra de progreso)'
]);

doc.fontSize(10)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Formatos soportados: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('MP3, MP4, WAV, M4A, FLAC, OGG, WebM, MOV, AVI');
doc.moveDown(1);

addSubsectionTitle('Paso 3: Seleccionar Acciones');
addParagraph('Selecciona tu archivo cargado y elige qué quieres hacer:');
addBulletList([
  'Transcribir: Convierte audio a texto (obligatorio)',
  'Oradores: Identifica y analiza quién habla',
  'Resumen: Genera resumen automático con IA',
  'Subtítulos: Crea archivos SRT/VTT para vídeo',
  'Etiquetas: Extrae categorías y temas principales'
]);

doc.fontSize(10)
   .font('Helvetica-Bold')
   .fillColor('#dc2626')
   .text('Importante: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Solo pagas por lo que seleccionas. Elige solo las acciones que necesites.');
doc.moveDown(1);

addSubsectionTitle('Paso 4: Procesar y Descargar');
addParagraph('Una vez seleccionadas las acciones:');
addBulletList([
  'Haz clic en "Procesar Archivos"',
  'Espera mientras se procesa (1-3 minutos típicamente)',
  'Verás el progreso en tiempo real con estimación de tiempo',
  'Cuando esté completado, descarga los resultados'
]);

doc.fontSize(10)
   .font('Helvetica-Bold')
   .fillColor('#7c3aed')
   .text('Descarga organizada: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Elige carpeta de destino para guardar todos los archivos automáticamente');
doc.moveDown(1);

addSeparator();

// SECTION 2: INTRODUCTION
doc.addPage();
addSectionTitle('2. Introducción a Annalogica');

addParagraph('Annalogica es una plataforma profesional de transcripción y análisis de contenidos de audio y vídeo impulsada por inteligencia artificial. Diseñada para empresas, instituciones públicas, medios de comunicación y profesionales que necesitan convertir y analizar grandes volúmenes de contenido multimedia.');

addSubsectionTitle('¿Qué hace Annalogica?');
addBulletList([
  'Transcripción automática multiidioma con 95%+ de precisión',
  'Identificación de oradores con análisis estadístico completo',
  'Generación de resúmenes inteligentes usando IA avanzada (Claude)',
  'Subtítulos profesionales en formatos SRT y VTT',
  'Extracción automática de tags y categorías temáticas',
  'Gestión centralizada de todos tus archivos procesados'
]);

addSubsectionTitle('¿Para quién es Annalogica?');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Empresas: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Transcribe reuniones, llamadas comerciales, entrevistas y formaciones internas.');
doc.moveDown(0.3);

doc.font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Instituciones Públicas: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Documenta plenos, sesiones parlamentarias, conferencias y actos oficiales.');
doc.moveDown(0.3);

doc.font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Medios de Comunicación: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Transcribe podcasts, entrevistas, programas de radio y contenido multimedia.');
doc.moveDown(0.3);

doc.font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Universidades e Investigación: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Analiza entrevistas, grupos focales, seminarios y material educativo.');
doc.moveDown(1);

addSubsectionTitle('Ventajas Clave');
addBulletList([
  'Rapidez: Procesa 1 hora de audio en ~3 minutos',
  'Precisión: 95%+ de exactitud en transcripciones',
  'Multiidioma: 9 idiomas soportados',
  'Seguridad: Tus datos protegidos con cifrado',
  'Pago por uso: Solo pagas por lo que procesas',
  'Análisis avanzado: Identifica oradores, extrae insights'
]);

// SECTION 3: DETAILED FEATURES
doc.addPage();
addSectionTitle('3. Funcionalidades Detalladas');

addSubsectionTitle('Transcripción Multiidioma');
addParagraph('Convierte audio y vídeo a texto con alta precisión.');
addBulletList([
  'Detección automática de idioma o selección manual',
  'Soporte para 9 idiomas: ES, CA, EU, GL, PT, EN, FR, DE, IT',
  'Precisión del 95%+ en condiciones óptimas',
  'Manejo de audio con ruido de fondo y múltiples hablantes',
  'Exportación en formato TXT limpio y estructurado'
]);

addSubsectionTitle('Identificación de Oradores');
addParagraph('Detecta quién habla, cuándo y cuánto tiempo.');
addBulletList([
  'Diarización automática: Separa automáticamente los diferentes hablantes',
  'Identificación inteligente: Extrae nombres y cargos si se mencionan',
  'Estadísticas por orador: Intervenciones, palabras, tiempo total',
  'Porcentaje de participación: Quién habló más y cuánto',
  'Línea de tiempo detallada: Registro cronológico de intervenciones'
]);

addSubsectionTitle('Resúmenes Inteligentes');
addParagraph('Genera resúmenes concisos y relevantes con IA.');
addBulletList([
  'Resúmenes en 3-4 párrafos capturando lo esencial',
  'Generados por Claude (Anthropic) - IA de última generación',
  'Mantiene el contexto y los puntos clave',
  'Respeta el idioma original del contenido',
  'Ideal para revisión rápida de contenidos largos'
]);

addSubsectionTitle('Subtítulos Profesionales');
addParagraph('Crea archivos de subtítulos listos para usar.');
addBulletList([
  'SRT (SubRip): Compatible con la mayoría de reproductores',
  'VTT (WebVTT): Estándar web, ideal para HTML5',
  'Sincronización precisa al milisegundo',
  'Incluye etiquetas de hablante [Speaker A], [Speaker B]',
  'Listos para importar en editores (Premiere, Final Cut, DaVinci)'
]);

addSubsectionTitle('Etiquetas Automáticas');
addParagraph('Extrae categorías y temas principales.');
addBulletList([
  'Identifica 5-7 temas o categorías principales',
  'Extracción contextual usando IA (Claude)',
  'Tags relevantes y descriptivos',
  'Útil para organización y búsqueda'
]);

// SECTION 4: FILE MANAGEMENT
doc.addPage();
addSectionTitle('4. Gestión de Archivos');

addSubsectionTitle('Dashboard Principal');
addParagraph('El dashboard está dividido en dos secciones principales:');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Archivos Cargados: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Muestra archivos en proceso con estado y progreso en tiempo real.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Archivos Completados: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Archivos listos para descargar individual o múltiple.');
doc.moveDown(1);

addSubsectionTitle('Política de Retención');
doc.fontSize(10)
   .font('Helvetica-Bold')
   .fillColor('#dc2626')
   .text('Importante: ', { continued: true })
   .font('Helvetica')
   .fillColor('#374151')
   .text('Los archivos procesados se conservan durante 30 días');
doc.moveDown(0.5);

addBulletList([
  'Transcripciones, resúmenes y subtítulos: 30 días',
  'Reportes de oradores: 30 días',
  'Archivos de audio/vídeo originales: Eliminados tras procesamiento',
  'Descarga archivos importantes antes de que expire el periodo'
]);

addSubsectionTitle('Formatos de Descarga');
addBulletList([
  'TXT: Texto plano, fácil de editar y compartir',
  'PDF: Formato profesional con encabezados y metadatos',
  'SRT: Subtítulos para reproductores y editores de vídeo',
  'VTT: Subtítulos para web (HTML5 video)'
]);

// SECTION 5: PLANS AND PRICING
doc.addPage();
addSectionTitle('5. Planes y Límites');

addParagraph('Annalogica ofrece planes flexibles adaptados a diferentes necesidades. Todos los planes se facturan mensualmente y puedes cambiar o cancelar en cualquier momento.');

// Plan Free
doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#059669')
   .text('Plan Free - Gratuito');
doc.moveDown(0.3);
addBulletList([
  '1 hora de transcripción/mes',
  '10 archivos/mes',
  'Transcripción básica',
  'Identificación de hablantes',
  'Exportación (SRT, VTT, TXT)',
  'Resumen con IA',
  'Soporte por email'
]);

// Plan Básico
doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Plan Básico - 49 EUR/mes (POPULAR)');
doc.moveDown(0.3);
addBulletList([
  '10 horas de transcripción/mes',
  '100 archivos/mes',
  'Transcripción de alta calidad',
  'Identificación de hablantes',
  'Resúmenes avanzados',
  'Soporte prioritario',
  'Sin publicidad'
]);

// Plan Pro
doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#7c3aed')
   .text('Plan Pro - 99 EUR/mes (RECOMENDADO)');
doc.moveDown(0.3);
addBulletList([
  '30 horas de transcripción/mes',
  '300 archivos/mes',
  'Transcripción premium',
  'Identificación avanzada',
  'API de integración',
  'Soporte 24/7',
  'Informes de uso'
]);

// Plan Business
doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#dc2626')
   .text('Plan Business - 249 EUR/mes');
doc.moveDown(0.3);
addBulletList([
  '100 horas de transcripción/mes',
  '1.000 archivos/mes',
  'Múltiples usuarios (5)',
  'Dashboard de equipo',
  'API completa',
  'Facturación centralizada',
  'Soporte dedicado',
  'SLA garantizado'
]);

doc.addPage();

// Plan Universidad
doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#0891b2')
   .text('Plan Universidad - 999 EUR/mes');
doc.moveDown(0.3);
addBulletList([
  '300 horas de transcripción/mes',
  '5.000 archivos/mes',
  'Usuarios ilimitados',
  'Portal institucional',
  'Integraciones LMS',
  'Formación incluida',
  'SLA 99.9%'
]);

// Plan Medios
doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#be185d')
   .text('Plan Medios - 2.999 EUR/mes');
doc.moveDown(0.3);
addBulletList([
  '1.000 horas de transcripción/mes',
  '10.000 archivos/mes',
  'Procesamiento en tiempo real',
  'White label',
  'Account manager',
  'Soporte 24/7/365',
  'SLA 99.99%'
]);

// Plan Empresarial
doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('Plan Empresarial - Personalizado');
doc.moveDown(0.3);
addParagraph('Soluciones a medida para grandes corporaciones. Contacta con nuestro equipo de ventas para una propuesta personalizada.');

addSeparator();

addSubsectionTitle('Preguntas Frecuentes sobre Planes');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('¿Qué pasa si supero mi cuota mensual?');
doc.moveDown(0.2);
addParagraph('El sistema te notificará cuando estés cerca del límite. Puedes actualizar a un plan superior en cualquier momento. No se procesan más archivos una vez alcanzado el límite.');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('¿Puedo cambiar de plan en cualquier momento?');
doc.moveDown(0.2);
addParagraph('Sí, puedes actualizar o reducir tu plan cuando quieras. Los cambios se aplican inmediatamente y la facturación se ajusta de forma prorrateada.');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('¿Emiten facturas?');
doc.moveDown(0.2);
addParagraph('Sí, emitimos facturas automáticamente cada mes con todos los datos fiscales. Puedes descargarlas desde tu panel de ajustes.');

// SECTION 6: FAQ
doc.addPage();
addSectionTitle('6. Preguntas Frecuentes');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('¿Qué formatos de archivo son compatibles?');
doc.moveDown(0.2);
addParagraph('Annalogica soporta los principales formatos de audio y vídeo: MP3, MP4, WAV, M4A, FLAC, OGG, WebM, MOV, AVI, MKV, entre otros. El tamaño máximo por archivo es de 2GB.');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('¿Cuánto tiempo tarda en procesarse un archivo?');
doc.moveDown(0.2);
addParagraph('Típicamente, procesamos archivos a una velocidad de 0.2-0.3x el tiempo real. Por ejemplo, 1 hora de audio se procesa en aproximadamente 2-3 minutos.');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('¿Qué tan precisa es la transcripción?');
doc.moveDown(0.2);
addParagraph('Nuestra precisión es del 95%+ en condiciones óptimas (audio claro, sin ruido de fondo, hablantes claros).');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('¿Qué idiomas están soportados?');
doc.moveDown(0.2);
addParagraph('Soportamos 9 idiomas: Español (ES), Català (CA), Euskera (EU), Galego (GL), Português (PT), English (EN), Français (FR), Deutsch (DE) e Italiano (IT).');

doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('¿Mis datos están seguros?');
doc.moveDown(0.2);
addParagraph('Sí. Utilizamos cifrado de extremo a extremo, servidores seguros en Europa (GDPR compliant) y eliminamos los archivos de audio originales tras el procesamiento.');

// SECTION 7: TROUBLESHOOTING
doc.addPage();
addSectionTitle('7. Solución de Problemas');

doc.fontSize(12)
   .font('Helvetica-Bold')
   .fillColor('#dc2626')
   .text('El archivo no se carga correctamente');
doc.moveDown(0.3);
addBulletList([
  'Verifica que el formato sea compatible',
  'Comprueba que el tamaño no supere los 2GB',
  'Asegúrate de tener conexión a internet estable',
  'Intenta con otro navegador (Chrome, Firefox, Edge)',
  'Limpia la caché de tu navegador'
]);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .fillColor('#dc2626')
   .text('La transcripción tiene muchos errores');
doc.moveDown(0.3);
addBulletList([
  'Verifica la calidad del audio original',
  'Asegúrate de haber seleccionado el idioma correcto',
  'Utiliza la función de identificación de oradores',
  'Considera mejorar la calidad del audio antes de subirlo'
]);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .fillColor('#dc2626')
   .text('He alcanzado mi límite de cuota');
doc.moveDown(0.3);
addBulletList([
  'Ve a Ajustes para ver tu uso actual',
  'Actualiza a un plan superior desde Precios',
  'Tu cuota se renueva automáticamente cada mes'
]);

// SECTION 8: SUPPORT
doc.addPage();
addSectionTitle('8. Soporte y Contacto');

doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Email de Soporte');
doc.moveDown(0.3);
addParagraph('Para consultas técnicas y soporte general:');
doc.fontSize(12)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('support@annalogica.eu');
doc.moveDown(0.2);
doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#6b7280')
   .text('Tiempo de respuesta: 24-48 horas');
doc.moveDown(1);

doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#059669')
   .text('Ventas y Empresarial');
doc.moveDown(0.3);
addParagraph('Para consultas comerciales y planes empresariales:');
doc.fontSize(12)
   .font('Helvetica-Bold')
   .fillColor('#059669')
   .text('infopreus@annalogica.eu');
doc.moveDown(1);

doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#7c3aed')
   .text('Recursos Adicionales');
doc.moveDown(0.3);
addBulletList([
  'Ver Planes y Precios: https://annalogica.eu/pricing',
  'Política de Privacidad: https://annalogica.eu/privacy',
  'Términos de Servicio: https://annalogica.eu/terms',
  'Dashboard: https://annalogica.eu'
]);

addSeparator();

// FOOTER
doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor('#1a1a1a')
   .text('Información de la Empresa', { align: 'center' });
doc.moveDown(0.5);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Annalogica', { align: 'center' });
doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#6b7280')
   .text('Transcripción Profesional con Inteligencia Artificial', { align: 'center' });
doc.moveDown(0.5);

doc.fontSize(9)
   .font('Helvetica')
   .fillColor('#6b7280')
   .text('© 2025 Annalogica. Todos los derechos reservados.', { align: 'center' });
doc.moveDown(0.5);

doc.fontSize(9)
   .font('Helvetica')
   .fillColor('#374151')
   .text('Web: https://annalogica.eu', { align: 'center' });
doc.text('Soporte: support@annalogica.eu', { align: 'center' });
doc.text('Ventas: infopreus@annalogica.eu', { align: 'center' });
doc.moveDown(1);

doc.fontSize(8)
   .font('Helvetica')
   .fillColor('#9ca3af')
   .text('Guía de Usuario - Versión 1.0 - Enero 2025', { align: 'center' });
doc.text('Documento generado por Annalogica para uso de clientes y usuarios', { align: 'center' });

// Finalizar documento
doc.end();

console.log(`✅ Guía de usuario generada: ${outputPath}`);
