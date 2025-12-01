import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import ExcelJS from 'exceljs';

/**
 * GET /api/export?format=csv|excel&jobId=xxx
 *
 * Exporta archivos procesados del usuario en formato CSV o Excel
 * - Si se especifica jobId, exporta solo ese archivo
 * - Si no se especifica jobId, exporta todos los archivos del usuario
 *
 * Estructura de columnas:
 * A: Tipo (audio, video, documento)
 * B: Título del archivo
 * C: Transcripción (solo si fue solicitada)
 * D: Resumen
 * E: Tags
 * F-K: Oradores 1-6 con título
 * L: Tiene audio (solo para documentos)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = verifyRequestAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Get format and jobId from query params
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const jobId = searchParams.get('jobId'); // Optional: export single file

    // Get processed jobs for this user
    let jobs;
    if (jobId) {
      // Export single file
      const job = await TranscriptionJobDB.findById(jobId);
      if (!job || job.user_id !== auth.userId) {
        return NextResponse.json(
          { error: 'Archivo no encontrado o no autorizado' },
          { status: 404 }
        );
      }
      jobs = [job];
    } else {
      // Export all files
      jobs = await TranscriptionJobDB.findByUserId(auth.userId);
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json(
        { error: 'No hay archivos procesados para exportar' },
        { status: 404 }
      );
    }

    // Fetch full content for each job (transcriptions, summaries, etc.)
    const jobsWithContent = await Promise.all(
      jobs.map(async (job) => {
        let transcription = '';
        let summary = '';
        let tags: string[] = [];
        let speakers: Array<{ name: string; title?: string }> = [];

        // 🔥 Obtener acciones solicitadas por el usuario
        const requestedActions = (job.metadata as any)?.actions || [];
        const wasTranscriptionRequested = requestedActions.includes('Transcribir');

        // Fetch transcription SOLO si fue solicitada explícitamente
        // Para documentos, NO incluir transcripción a menos que se pidió explícitamente
        if (job.txt_url && wasTranscriptionRequested) {
          try {
            const res = await fetch(job.txt_url);
            transcription = await res.text();
          } catch (error) {
            console.error(`Error fetching transcription for ${job.id}:`, error);
          }
        }

        // Fetch summary
        if (job.summary_url) {
          try {
            const res = await fetch(job.summary_url);
            summary = await res.text();
          } catch (error) {
            console.error(`Error fetching summary for ${job.id}:`, error);
          }
        }

        // Extract tags from job
        tags = job.tags || [];

        if (job.metadata && typeof job.metadata === 'object') {
          const metadata = job.metadata as any;

          // Parse speakers from speakers_url if available
          if (job.speakers_url) {
            try {
              const res = await fetch(job.speakers_url);
              const speakersText = await res.text();
              // Parse speakers (simple extraction - assumes format "Speaker 1 (Title): ...")
              const speakerMatches = speakersText.matchAll(/(?:Speaker|Orador)\s+(\d+)\s*(?:\(([^)]+)\))?:/gi);
              for (const match of speakerMatches) {
                speakers.push({
                  name: `Speaker ${match[1]}`,
                  title: match[2] || undefined
                });
              }
            } catch (error) {
              console.error(`Error parsing speakers for ${job.id}:`, error);
            }
          }
        }

        // Determine file type
        const fileType = (job.metadata as any)?.fileType || 'audio'; // Default to audio for old jobs
        let type = 'audio';
        if (fileType === 'document') {
          type = 'documento';
        } else if (job.filename.match(/\.(mp4|avi|mov|mkv|webm)$/i)) {
          type = 'video';
        }

        // Check if document has audio (TTS)
        const hasAudio = type === 'documento' && !!(job.metadata as any)?.ttsUrl ? 'sí' : 'no';

        return {
          type,
          filename: job.filename,
          transcription: transcription.trim(),
          summary: summary.trim(),
          tags: tags.join(', '),
          speakers: speakers.slice(0, 6), // Max 6 speakers (columns F-K)
          hasAudio: type === 'documento' ? hasAudio : '' // Only for documents
        };
      })
    );

    if (format === 'csv') {
      // Generate CSV
      const csvLines: string[] = [];

      // Header
      csvLines.push(
        'Tipo,Título,Transcripción,Resumen,Tags,' +
        'Orador 1,Orador 2,Orador 3,Orador 4,Orador 5,Orador 6,' +
        'Tiene Audio'
      );

      // Data rows
      for (const job of jobsWithContent) {
        const speakers = job.speakers.map(s => s.title ? `${s.name} (${s.title})` : s.name);
        // Pad to 6 speakers
        while (speakers.length < 6) speakers.push('');

        const row = [
          job.type,
          job.filename,
          job.transcription.replace(/"/g, '""'), // Escape quotes
          job.summary.replace(/"/g, '""'),
          job.tags,
          ...speakers,
          job.hasAudio
        ];

        // Wrap fields in quotes and join
        csvLines.push(row.map(field => `"${field}"`).join(','));
      }

      const csvContent = csvLines.join('\n');
      const blob = Buffer.from('\uFEFF' + csvContent, 'utf-8'); // Add BOM for Excel compatibility

      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="annalogica-export-${Date.now()}.csv"`,
        },
      });
    } else {
      // Generate Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Archivos Procesados');

      // Set column widths
      worksheet.columns = [
        { header: 'Tipo', key: 'type', width: 12 },
        { header: 'Título', key: 'filename', width: 30 },
        { header: 'Transcripción', key: 'transcription', width: 50 },
        { header: 'Resumen', key: 'summary', width: 50 },
        { header: 'Tags', key: 'tags', width: 30 },
        { header: 'Orador 1', key: 'speaker1', width: 20 },
        { header: 'Orador 2', key: 'speaker2', width: 20 },
        { header: 'Orador 3', key: 'speaker3', width: 20 },
        { header: 'Orador 4', key: 'speaker4', width: 20 },
        { header: 'Orador 5', key: 'speaker5', width: 20 },
        { header: 'Orador 6', key: 'speaker6', width: 20 },
        { header: 'Tiene Audio', key: 'hasAudio', width: 12 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE67E22' } // Orange
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Add data rows
      for (const job of jobsWithContent) {
        const speakers = job.speakers.map(s => s.title ? `${s.name} (${s.title})` : s.name);
        // Pad to 6 speakers
        while (speakers.length < 6) speakers.push('');

        worksheet.addRow({
          type: job.type,
          filename: job.filename,
          transcription: job.transcription,
          summary: job.summary,
          tags: job.tags,
          speaker1: speakers[0],
          speaker2: speakers[1],
          speaker3: speakers[2],
          speaker4: speakers[3],
          speaker5: speakers[4],
          speaker6: speakers[5],
          hasAudio: job.hasAudio
        });
      }

      // Apply styling to all rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip header
          row.alignment = { wrapText: true, vertical: 'top' };
          // Auto height (no need to set)
        }
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="annalogica-export-${Date.now()}.xlsx"`,
        },
      });
    }
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json(
      { error: 'Error al generar la exportación' },
      { status: 500 }
    );
  }
}
