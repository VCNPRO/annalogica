'use client';

import { useEffect, useState } from 'react';

export default function InformeTecnicoPage() {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    // Cargar el archivo markdown
    fetch('/INFORME-TECNICO-SISTEMA-2025.md')
      .then(res => res.text())
      .then(text => setMarkdown(text))
      .catch(err => console.error('Error cargando informe:', err));
  }, []);

  // Renderizar markdown de forma simple (sin librerías)
  const renderMarkdown = (md: string) => {
    if (!md) return { __html: '<p>Cargando...</p>' };

    let html = md
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*\*\*(.*?)\*\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Code blocks
      .replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      // Tables (simple)
      .replace(/\|(.+)\|/gim, '<tr>$1</tr>')
      .replace(/\n\n/gim, '</p><p>')
      // Lists
      .replace(/^\s*\n\*/gm, '<ul>\n*')
      .replace(/^(\*.+)\s*\n([^\*])/gm, '$1\n</ul>\n\n$2')
      .replace(/^\*(.+)/gm, '<li>$1</li>')
      .replace(/^\s*\n\d\./gm, '<ol>\n1.')
      .replace(/^(\d\..+)\s*\n([^\d\.])/gm, '$1\n</ol>\n\n$2')
      .replace(/^\d\.(.+)/gm, '<li>$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      // Separators
      .replace(/^---$/gim, '<hr />')
      .replace(/^═══.*═══$/gim, '<hr class="separator" />');

    return { __html: `<div>${html}</div>` };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button - Only visible on screen */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={handlePrint}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg shadow-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Descargar PDF
        </button>
        <a
          href="/"
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg shadow-lg font-medium transition-colors"
        >
          Volver
        </a>
      </div>

      {/* Markdown Content */}
      <div
        className="markdown-body max-w-5xl mx-auto p-8 pt-20"
        dangerouslySetInnerHTML={renderMarkdown(markdown)}
      />

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .markdown-body {
            max-width: 100%;
            padding: 20mm;
          }
          @page {
            margin: 20mm;
          }
        }

        .markdown-body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.8;
          color: #1f2937;
        }

        .markdown-body h1 {
          color: #f97316;
          border-bottom: 3px solid #f97316;
          padding-bottom: 10px;
          margin-top: 40px;
          margin-bottom: 20px;
          font-size: 2.5em;
          font-weight: bold;
          page-break-after: avoid;
        }

        .markdown-body h2 {
          color: #ea580c;
          border-bottom: 2px solid #fed7aa;
          padding-bottom: 8px;
          margin-top: 35px;
          margin-bottom: 15px;
          font-size: 1.8em;
          font-weight: bold;
          page-break-after: avoid;
        }

        .markdown-body h3 {
          color: #c2410c;
          margin-top: 25px;
          margin-bottom: 10px;
          font-size: 1.4em;
          font-weight: bold;
          page-break-after: avoid;
        }

        .markdown-body p {
          margin: 15px 0;
          text-align: justify;
        }

        .markdown-body code {
          background-color: #f3f4f6;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 0.9em;
          color: #dc2626;
        }

        .markdown-body pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 20px 0;
          line-height: 1.5;
          page-break-inside: avoid;
        }

        .markdown-body pre code {
          background-color: transparent;
          color: #f9fafb;
          padding: 0;
          font-size: 0.85em;
        }

        .markdown-body ul, .markdown-body ol {
          margin: 15px 0;
          padding-left: 30px;
        }

        .markdown-body li {
          margin: 8px 0;
        }

        .markdown-body a {
          color: #2563eb;
          text-decoration: none;
          border-bottom: 1px solid #93c5fd;
        }

        .markdown-body a:hover {
          color: #1d4ed8;
          border-bottom-color: #1d4ed8;
        }

        .markdown-body hr {
          border: 0;
          height: 1px;
          background: #d1d5db;
          margin: 30px 0;
        }

        .markdown-body hr.separator {
          height: 3px;
          background: linear-gradient(to right, #f97316, #ea580c);
          margin: 40px 0;
        }

        .markdown-body table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
          page-break-inside: avoid;
        }

        .markdown-body tr {
          border-bottom: 1px solid #e5e7eb;
        }

        .markdown-body th {
          background-color: #f97316;
          color: white;
          font-weight: bold;
          padding: 12px;
          text-align: left;
        }

        .markdown-body td {
          padding: 12px;
        }

        .markdown-body tr:nth-child(even) {
          background-color: #f9fafb;
        }

        .markdown-body strong {
          color: #111827;
          font-weight: 600;
        }

        .markdown-body em {
          font-style: italic;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
