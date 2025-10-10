const { jsPDF } = require('jspdf');
const fs = require('fs');

// Read the markdown file
const markdown = fs.readFileSync('./AUDITORIA-PRODUCCION.md', 'utf-8');

// Initialize jsPDF
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Configuration
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 20;
const usableWidth = pageWidth - (margin * 2);
let yPosition = margin;

// Helper functions
function addText(text, fontSize = 10, fontStyle = 'normal', color = [0, 0, 0]) {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontStyle);
  doc.setTextColor(color[0], color[1], color[2]);

  const lines = doc.splitTextToSize(text, usableWidth);

  for (let i = 0; i < lines.length; i++) {
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(lines[i], margin, yPosition);
    yPosition += fontSize * 0.4;
  }

  yPosition += 2; // Extra spacing after paragraph
}

function addTitle(text, level = 1) {
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = margin;
  }

  const fontSize = level === 1 ? 18 : level === 2 ? 14 : 12;
  const color = level === 1 ? [255, 102, 0] : [0, 0, 0]; // Orange for H1

  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color[0], color[1], color[2]);

  doc.text(text, margin, yPosition);
  yPosition += fontSize * 0.5;

  // Underline for H1 and H2
  if (level <= 2) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
  }

  yPosition += 2;
}

function addHorizontalRule() {
  if (yPosition > pageHeight - margin) {
    doc.addPage();
    yPosition = margin;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 4;
}

function addTable(headers, rows) {
  // Simple table implementation
  const colWidth = usableWidth / headers.length;

  // Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, usableWidth, 8, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  headers.forEach((header, i) => {
    doc.text(header, margin + (i * colWidth) + 2, yPosition + 6);
  });

  yPosition += 8;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  rows.forEach((row, rowIndex) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, usableWidth, 7, 'F');
    }

    row.forEach((cell, i) => {
      const cellText = doc.splitTextToSize(String(cell), colWidth - 4);
      doc.text(cellText[0] || '', margin + (i * colWidth) + 2, yPosition + 5);
    });

    yPosition += 7;
  });

  yPosition += 4;
}

function addCheckbox(text, checked = false) {
  if (yPosition > pageHeight - margin) {
    doc.addPage();
    yPosition = margin;
  }

  // Checkbox
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, yPosition, 4, 4);

  if (checked) {
    doc.setFontSize(10);
    doc.text('✓', margin + 0.5, yPosition + 3);
  }

  // Text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(text, margin + 6, yPosition + 3);

  yPosition += 6;
}

function addBullet(text, level = 0) {
  const indent = margin + (level * 5);

  if (yPosition > pageHeight - margin) {
    doc.addPage();
    yPosition = margin;
  }

  doc.setFontSize(9);
  doc.text('•', indent, yPosition);

  const lines = doc.splitTextToSize(text, usableWidth - (level * 5) - 5);
  lines.forEach((line, i) => {
    if (i > 0 && yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line, indent + 5, yPosition);
    yPosition += 4;
  });

  yPosition += 1;
}

function addCodeBlock(code) {
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = margin;
  }

  // Background
  doc.setFillColor(245, 245, 245);
  const lines = code.split('\n');
  const height = Math.min(lines.length * 4 + 4, pageHeight - yPosition - margin);
  doc.rect(margin, yPosition, usableWidth, height, 'F');

  // Code text
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(50, 50, 50);

  yPosition += 3;

  lines.forEach(line => {
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line.substring(0, 100), margin + 2, yPosition); // Truncate long lines
    yPosition += 3.5;
  });

  yPosition += 4;
}

// Parse markdown and generate PDF
console.log('Generating PDF...');

// Cover page
doc.setFillColor(255, 102, 0); // Orange
doc.rect(0, 0, pageWidth, 80, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(28);
doc.setFont('helvetica', 'bold');
doc.text('AUDITORÍA PROFESIONAL', pageWidth / 2, 35, { align: 'center' });

doc.setFontSize(24);
doc.text('ANNALOGICA', pageWidth / 2, 50, { align: 'center' });

doc.setFontSize(12);
doc.setFont('helvetica', 'normal');
doc.text('Preparación para Producción y Comercialización', pageWidth / 2, 65, { align: 'center' });

yPosition = 100;

doc.setTextColor(0, 0, 0);
doc.setFontSize(11);
addText('Fecha: 2025-10-10');
addText('Versión: 1.0.0');
addText('Auditor: Claude Code');
addText('Estado: Análisis Completo para Producción');

yPosition += 10;

// Summary box
doc.setFillColor(240, 248, 255);
doc.rect(margin, yPosition, usableWidth, 50, 'F');
doc.setDrawColor(70, 130, 180);
doc.rect(margin, yPosition, usableWidth, 50);

yPosition += 8;
doc.setFontSize(14);
doc.setFont('helvetica', 'bold');
doc.text('VEREDICTO GENERAL', margin + 5, yPosition);

yPosition += 8;
doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
doc.text('APTO PARA PRODUCCIÓN CON MEJORAS RECOMENDADAS ⚠️', margin + 5, yPosition);

yPosition += 10;
doc.setFontSize(9);
doc.text('• Puntuación Fiabilidad: 7.5/10', margin + 5, yPosition);
yPosition += 5;
doc.text('• Puntuación Seguridad: 7.0/10', margin + 5, yPosition);
yPosition += 5;
doc.text('• Puntuación Escalabilidad: 8.0/10', margin + 5, yPosition);
yPosition += 5;
doc.text('• Promedio General: 5.8/10', margin + 5, yPosition);

yPosition += 15;

// New page for content
doc.addPage();
yPosition = margin;

// Parse markdown sections
const sections = markdown.split('\n## ');

sections.forEach((section, index) => {
  if (index === 0) return; // Skip front matter

  const lines = section.split('\n');
  const title = lines[0].replace(/^#+\s*/, '').replace(/\*/g, '');

  // Add section title
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = margin;
  }

  addTitle(title, 2);

  let inCodeBlock = false;
  let codeBuffer = '';
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip very long sections to avoid PDF bloat
    if (yPosition > pageHeight * 20) {
      addText('... (Contenido truncado. Ver archivo MD completo)', 9, 'italic', [100, 100, 100]);
      break;
    }

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        addCodeBlock(codeBuffer);
        codeBuffer = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer += line + '\n';
      continue;
    }

    // Tables
    if (line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);

      if (line.includes('---')) {
        continue; // Skip separator line
      }

      if (!inTable) {
        tableHeaders = cells;
        inTable = true;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      // End of table
      if (tableRows.length > 0) {
        addTable(tableHeaders, tableRows);
      }
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }

    // Headings
    if (line.startsWith('### ')) {
      addTitle(line.replace('### ', '').replace(/\*/g, ''), 3);
    } else if (line.startsWith('#### ')) {
      yPosition += 2;
      addText(line.replace('#### ', '').replace(/\*/g, ''), 11, 'bold');
    }
    // Horizontal rules
    else if (line.startsWith('---')) {
      addHorizontalRule();
    }
    // Checkboxes
    else if (line.match(/^-\s*\[\s*[xX✓]\s*\]/)) {
      const text = line.replace(/^-\s*\[\s*[xX✓]\s*\]\s*/, '');
      addCheckbox(text, true);
    } else if (line.match(/^-\s*\[\s*\]/)) {
      const text = line.replace(/^-\s*\[\s*\]\s*/, '');
      addCheckbox(text, false);
    }
    // Bullets
    else if (line.match(/^[\-\*]\s+/)) {
      const text = line.replace(/^[\-\*]\s+/, '').replace(/\*/g, '');
      addBullet(text);
    }
    // Numbered lists
    else if (line.match(/^\d+\.\s+/)) {
      const text = line.replace(/^\d+\.\s+/, '').replace(/\*/g, '');
      addBullet(text);
    }
    // Regular paragraphs
    else if (line.trim().length > 0) {
      const cleanLine = line.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
      if (cleanLine.trim()) {
        addText(cleanLine, 9);
      }
    }
    // Empty line
    else {
      yPosition += 2;
    }
  }

  yPosition += 5; // Space between sections
});

// Footer on all pages
const totalPages = doc.internal.pages.length - 1;
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Annalogica - Auditoría Profesional 2025', margin, pageHeight - 10);
}

// Save PDF
doc.save('AUDITORIA-PRODUCCION.pdf');
console.log('✅ PDF generado: AUDITORIA-PRODUCCION.pdf');
