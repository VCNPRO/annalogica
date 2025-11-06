#!/usr/bin/env node
/**
 * Script para generar PDF del informe técnico
 * Método simple usando el navegador
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   📄 GENERADOR DE PDF - INFORME TÉCNICO ANNALOGICA 2025  ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const mdFile = path.join(__dirname, '..', 'INFORME-TECNICO-SISTEMA-2025.md');
const publicMdFile = path.join(__dirname, '..', 'public', 'INFORME-TECNICO-SISTEMA-2025.md');

// Verificar que existe el archivo markdown
if (!fs.existsSync(mdFile)) {
  console.error('❌ Error: No se encuentra INFORME-TECNICO-SISTEMA-2025.md');
  process.exit(1);
}

// Copiar a public para acceso web
fs.copyFileSync(mdFile, publicMdFile);
console.log('✅ Archivo copiado a public/');

console.log('\n📋 INSTRUCCIONES PARA GENERAR EL PDF:\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  MÉTODO 1: DESDE EL NAVEGADOR (MÁS FÁCIL)                ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log('  1️⃣  Inicia el servidor de desarrollo:');
console.log('      npm run dev\n');
console.log('  2️⃣  Abre tu navegador en:');
console.log('      👉 http://localhost:3000/informe-tecnico\n');
console.log('  3️⃣  Haz clic en el botón "Descargar PDF"');
console.log('      (o usa Ctrl+P / Cmd+P para imprimir)\n');
console.log('  4️⃣  Selecciona "Guardar como PDF"');
console.log('      ✅ ¡Listo! Tu PDF está descargado\n');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  MÉTODO 2: HERRAMIENTA ONLINE                             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log('  1️⃣  Visita: https://www.markdowntopdf.com/\n');
console.log('  2️⃣  Sube el archivo:');
console.log(`      ${mdFile}\n`);
console.log('  3️⃣  Descarga el PDF generado\n');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  MÉTODO 3: VS CODE (SI LO TIENES INSTALADO)              ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log('  1️⃣  Instala la extensión "Markdown PDF"\n');
console.log('  2️⃣  Abre el archivo .md en VS Code\n');
console.log('  3️⃣  Clic derecho → "Markdown PDF: Export (pdf)"\n');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  MÉTODO 4: PANDOC (SI LO TIENES INSTALADO)               ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log('  Ejecuta en terminal:');
console.log(`  pandoc "${mdFile}" -o informe-tecnico.pdf\n`);

console.log('═══════════════════════════════════════════════════════════\n');
console.log('💡 RECOMENDACIÓN: Usar MÉTODO 1 (navegador) - es el más fácil\n');
console.log('═══════════════════════════════════════════════════════════\n');
