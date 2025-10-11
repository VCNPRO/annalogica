const fs = require('fs');
const path = require('path');

console.log('📄 Generando PDFs de la documentación...\n');

const docs = [
  { file: 'docs/README.md', title: 'Índice General' },
  { file: 'docs/AUDIT.md', title: 'Auditoría Profesional' },
  { file: 'docs/ANALYSIS.md', title: 'Análisis Técnico' },
  { file: 'docs/SERVICES.md', title: 'Guía de Servicios' },
  { file: 'docs/USER-MANAGEMENT.md', title: 'Gestión de Usuarios' },
  { file: 'INFRASTRUCTURE.md', title: 'Infraestructura' },
  { file: 'DEPLOYMENT-SECURITY.md', title: 'Deployment y Seguridad' }
];

console.log('Para convertir a PDF, tienes 3 opciones:\n');

console.log('📌 OPCIÓN 1: Usar sitio web (MÁS FÁCIL)\n');
console.log('1. Ve a: https://www.markdowntopdf.com/');
console.log('2. Arrastra cada archivo .md de la carpeta docs/');
console.log('3. Descarga el PDF\n');

console.log('📌 OPCIÓN 2: Usar VSCode (MEJOR CALIDAD)\n');
console.log('1. Instala extensión "Markdown PDF" en VSCode');
console.log('   - Ctrl+Shift+X → busca "Markdown PDF" → Install');
console.log('2. Abre cada archivo .md');
console.log('3. Click derecho → "Markdown PDF: Export (pdf)"\n');

console.log('📌 OPCIÓN 3: Imprimir desde GitHub (RÁPIDO)\n');
console.log('1. Ve a: https://github.com/VCNPRO/annalogica/tree/main/docs');
console.log('2. Abre cada documento');
console.log('3. Ctrl+P → "Guardar como PDF"\n');

console.log('📂 Archivos para convertir:\n');
docs.forEach((doc, i) => {
  const fullPath = path.join(__dirname, '..', doc.file);
  const exists = fs.existsSync(fullPath);
  const size = exists ? (fs.statSync(fullPath).size / 1024).toFixed(1) : '0';
  console.log(`${i + 1}. ${doc.title}`);
  console.log(`   Archivo: ${doc.file}`);
  console.log(`   Tamaño: ${size} KB`);
  console.log(`   Estado: ${exists ? '✅ Existe' : '❌ No encontrado'}\n`);
});

console.log('\n🔗 Links directos de GitHub para cada documento:\n');
docs.forEach(doc => {
  const githubUrl = `https://github.com/VCNPRO/annalogica/blob/main/${doc.file}`;
  console.log(`${doc.title}:`);
  console.log(`${githubUrl}\n`);
});

console.log('\n💡 RECOMENDACIÓN: Usa la Opción 2 (VSCode) para mejor calidad y formato.\n');
