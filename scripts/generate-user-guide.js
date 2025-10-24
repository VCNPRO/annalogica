// scripts/generate-user-guide.js
// Genera un PDF estático con la guía de usuario de annalogica

const fs = require('fs');
const path = require('path');

// Nota: Este script genera un marcador/placeholder para el PDF
// En el futuro, se puede integrar con una librería como jsPDF o Puppeteer
// para generar el PDF real a partir del contenido de la guía web

const outputPath = path.join(__dirname, '..', 'public', 'guia-usuario-annalogica.pdf');

console.log('📄 Generando guía de usuario en PDF...');
console.log('📂 Ruta de salida:', outputPath);

// Por ahora, creamos un archivo placeholder que indica que el PDF debe generarse
// El PDF real se puede descargar desde la web navegando a /guia
const placeholderMessage = `
=====================================
GUÍA DE USUARIO - ANNALOGICA
=====================================

Para acceder a la guía de usuario completa e interactiva,
visita: https://annalogica.eu/guia

Desde ahí podrás:
- Ver toda la documentación organizada por secciones
- Descargar el PDF completo
- Acceder a las últimas actualizaciones

Contacto:
- Soporte: support@annalogica.eu
- Ventas: infopreus@annalogica.eu

© 2025 annalogica. Todos los derechos reservados.
`;

// Crear directorio public si no existe
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Directorio public/ creado');
}

// Escribir archivo de texto como placeholder
// NOTA: Para generar un PDF real, reemplazar esto con una librería PDF
fs.writeFileSync(
  outputPath.replace('.pdf', '.txt'),
  placeholderMessage,
  'utf-8'
);

console.log('⚠️  IMPORTANTE: Este script crea un placeholder de texto.');
console.log('📖 Para la guía completa, los usuarios deben visitar: https://annalogica.eu/guia');
console.log('');
console.log('💡 SUGERENCIA: Para generar el PDF real, considera usar:');
console.log('   - Puppeteer (renderizar la página /guia como PDF)');
console.log('   - jsPDF (generar PDF programáticamente)');
console.log('   - Herramientas externas (wkhtmltopdf, Prince XML)');
console.log('');
console.log('✅ Archivo placeholder creado en:', outputPath.replace('.pdf', '.txt'));
console.log('');
console.log('🔧 ACCIÓN RECOMENDADA:');
console.log('   Los usuarios pueden acceder a la guía web en https://annalogica.eu/guia');
console.log('   y usar la función de "Imprimir a PDF" de su navegador para descargar.');
