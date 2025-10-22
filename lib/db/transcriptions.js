// lib/db/transcriptions.js
import { sql } from '@vercel/postgres';

// ============================================
// CREAR TRABAJO DE TRANSCRIPCIÓN
// ============================================
export async function createTranscriptionJob(data) {
  const result = await sql`
    INSERT INTO transcription_jobs (
      user_id,
      filename,
      audio_url,
      audio_size_bytes,
      status,
      processing_progress,
      summary_type
    ) VALUES (
      ${data.userId},
      ${data.fileName},
      ${data.audioUrl},
      ${data.fileSize},
      'processing',
      0,
      ${data.summaryType || 'detailed'}
    )
    RETURNING *
  `;
  
  return result.rows[0];
}

// ============================================
// ACTUALIZAR PROGRESO
// ============================================
export async function updateTranscriptionProgress(jobId, progress) {
  const result = await sql`
    UPDATE transcription_jobs
    SET 
      processing_progress = ${progress},
      updated_at = NOW()
    WHERE id = ${jobId}
    RETURNING *
  `;
  
  return result.rows[0];
}

// ============================================
// GUARDAR RESULTADOS COMPLETOS
// ============================================
export async function saveTranscriptionResults(jobId, data) {
  const result = await sql`
    UPDATE transcription_jobs
    SET 
      status = 'completed',
      processing_progress = 100,
      txt_url = ${data.txtUrl},
      srt_url = ${data.srtUrl},
      vtt_url = ${data.vttUrl},
      summary_url = ${data.summaryUrl},
      speakers_url = ${data.speakersUrl},
      tags = ${data.tags || []},
      audio_duration_seconds = ${data.duration || null},
      metadata = ${JSON.stringify(data.metadata || {})},
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${jobId}
    RETURNING *
  `;
  
  return result.rows[0];
}

// ============================================
// MARCAR ERROR
// ============================================
export async function markTranscriptionError(jobId, errorMessage) {
  const result = await sql`
    UPDATE transcription_jobs
    SET 
      status = 'error',
      error_message = ${errorMessage},
      updated_at = NOW()
    WHERE id = ${jobId}
    RETURNING *
  `;
  
  return result.rows[0];
}

// ============================================
// OBTENER TRABAJO
// ============================================
export async function getTranscriptionJob(jobId, userId = null) {
  let result;
  
  if (userId) {
    result = await sql`
      SELECT * FROM transcription_jobs
      WHERE id = ${jobId} AND user_id = ${userId}
      LIMIT 1
    `;
  } else {
    result = await sql`
      SELECT * FROM transcription_jobs
      WHERE id = ${jobId}
      LIMIT 1
    `;
  }
  
  return result.rows[0] || null;
}

// ============================================
// LISTAR TRABAJOS DE UN USUARIO
// ============================================
export async function getUserTranscriptions(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    status = null
  } = options;
  
  const offset = (page - 1) * limit;
  
  let query;
  if (status) {
    query = sql`
      SELECT 
        id,
        filename,
        audio_size_bytes,
        status,
        processing_progress,
        audio_duration_seconds,
        tags,
        created_at,
        completed_at
      FROM transcription_jobs
      WHERE user_id = ${userId} AND status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    query = sql`
      SELECT 
        id,
        filename,
        audio_size_bytes,
        status,
        processing_progress,
        audio_duration_seconds,
        tags,
        created_at,
        completed_at
      FROM transcription_jobs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
  
  const result = await query;
  
  // Contar total
  const countResult = status
    ? await sql`SELECT COUNT(*) FROM transcription_jobs WHERE user_id = ${userId} AND status = ${status}`
    : await sql`SELECT COUNT(*) FROM transcription_jobs WHERE user_id = ${userId}`;
  
  const total = parseInt(countResult.rows[0].count);
  
  return {
    jobs: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

// ============================================
// ELIMINAR TRABAJO
// ============================================
export async function deleteTranscriptionJob(jobId, userId) {
  // Verificar que pertenece al usuario
  const job = await getTranscriptionJob(jobId, userId);
  
  if (!job) {
    throw new Error('Trabajo no encontrado o no tienes permiso');
  }
  
  await sql`
    DELETE FROM transcription_jobs
    WHERE id = ${jobId}
  `;
  
  return { success: true };
}

// ============================================
// ESTADÍSTICAS DEL USUARIO
// ============================================
export async function getUserStats(userId) {
  const stats = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE status = 'error') as errors,
      SUM(audio_duration_seconds) FILTER (WHERE status = 'completed') as total_seconds
    FROM transcription_jobs
    WHERE user_id = ${userId}
  `;
  
  const row = stats.rows[0];
  const totalSeconds = parseInt(row.total_seconds || 0);
  
  return {
    total: parseInt(row.total),
    completed: parseInt(row.completed),
    processing: parseInt(row.processing),
    errors: parseInt(row.errors),
    totalSeconds,
    totalHours: (totalSeconds / 3600).toFixed(2)
  };
}
