import { sql } from '@vercel/postgres';

// Cost constants (from COSTES-DETALLADOS.md)
const COSTS = {
  // Vercel Blob Storage
  STORAGE_PER_GB_MONTH: 0.023,
  BANDWIDTH_PER_GB: 0.05,

  // OpenAI Whisper V3 (whisper-1 model)
  // Precio: $0.006 por minuto de audio
  WHISPER_PER_MINUTE: 0.006,

  // OpenAI GPT-4o-mini (para resúmenes, traducciones, identificación de speakers)
  GPT4O_MINI_INPUT_PER_1M: 0.15,
  GPT4O_MINI_OUTPUT_PER_1M: 0.60,
};

export interface UsageLog {
  id: string;
  user_id: string;
  event_type: 'upload' | 'transcription' | 'summary' | 'download';
  file_size_mb: number | null;
  duration_seconds: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number;
  metadata: any;
  created_at: Date;
}

/**
 * Log file upload
 */
export async function logUpload(
  userId: string,
  fileSizeBytes: number,
  filename: string,
  fileType: string
): Promise<void> {
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  // Upload cost is minimal (operation cost)
  const costUSD = 0.0000004; // One operation

  await sql`
    INSERT INTO usage_logs (user_id, event_type, file_size_mb, cost_usd, metadata)
    VALUES (
      ${userId},
      'upload',
      ${fileSizeMB},
      ${costUSD},
      ${JSON.stringify({ filename, fileType, sizeBytes: fileSizeBytes })}
    )
  `;
}

/**
 * Log transcription (Whisper)
 */
export async function logTranscription(
  userId: string,
  filename: string,
  durationSeconds: number | null = null
): Promise<void> {
  // Whisper V3 costs $0.006 per minute
  const durationMinutes = durationSeconds ? durationSeconds / 60 : 1;
  const costUSD = durationMinutes * COSTS.WHISPER_PER_MINUTE;

  await sql`
    INSERT INTO usage_logs (user_id, event_type, duration_seconds, cost_usd, metadata)
    VALUES (
      ${userId},
      'transcription',
      ${durationSeconds},
      ${costUSD},
      ${JSON.stringify({ filename, service: 'openai-whisper-v3' })}
    )
  `;
}

/**
 * Log summary generation (OpenAI GPT-4o)
 */
export async function logSummary(
  userId: string,
  tokensInput: number,
  tokensOutput: number
): Promise<void> {
  // Calculate cost using GPT-4o-mini pricing
  const inputCost = COSTS.GPT4O_MINI_INPUT_PER_1M;
  const outputCost = COSTS.GPT4O_MINI_OUTPUT_PER_1M;

  const costUSD =
    (tokensInput / 1_000_000) * inputCost +
    (tokensOutput / 1_000_000) * outputCost;

  await sql`
    INSERT INTO usage_logs (user_id, event_type, tokens_input, tokens_output, cost_usd, metadata)
    VALUES (
      ${userId},
      'summary',
      ${tokensInput},
      ${tokensOutput},
      ${costUSD},
      ${JSON.stringify({ service: 'openai-gpt4o-mini' })}
    )
  `;
}

/**
 * Log file download
 */
export async function logDownload(
  userId: string,
  fileSizeBytes: number,
  filename: string,
  format: string
): Promise<void> {
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  const fileSizeGB = fileSizeMB / 1024;

  // Bandwidth cost
  const costUSD = fileSizeGB * COSTS.BANDWIDTH_PER_GB;

  await sql`
    INSERT INTO usage_logs (user_id, event_type, file_size_mb, cost_usd, metadata)
    VALUES (
      ${userId},
      'download',
      ${fileSizeMB},
      ${costUSD},
      ${JSON.stringify({ filename, format })}
    )
  `;
}

/**
 * Get user usage summary
 */
export async function getUserUsageSummary(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCost: number;
  uploads: number;
  transcriptions: number;
  summaries: number;
  downloads: number;
  storageMB: number;
}> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const end = endDate || new Date();

  const result = await sql`
    SELECT
      COUNT(CASE WHEN event_type = 'upload' THEN 1 END) as uploads,
      COUNT(CASE WHEN event_type = 'transcription' THEN 1 END) as transcriptions,
      COUNT(CASE WHEN event_type = 'summary' THEN 1 END) as summaries,
      COUNT(CASE WHEN event_type = 'download' THEN 1 END) as downloads,
      COALESCE(SUM(CASE WHEN event_type = 'upload' THEN file_size_mb END), 0) as storage_mb,
      COALESCE(SUM(cost_usd), 0) as total_cost
    FROM usage_logs
    WHERE user_id = ${userId}
      AND created_at >= ${start.toISOString()}
      AND created_at <= ${end.toISOString()}
  `;

  const row = result.rows[0];
  return {
    totalCost: parseFloat(row.total_cost) || 0,
    uploads: parseInt(row.uploads) || 0,
    transcriptions: parseInt(row.transcriptions) || 0,
    summaries: parseInt(row.summaries) || 0,
    downloads: parseInt(row.downloads) || 0,
    storageMB: parseFloat(row.storage_mb) || 0,
  };
}

/**
 * Get all users usage (admin only)
 */
export async function getAllUsersUsage(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  userId: string;
  email: string;
  totalCost: number;
  uploads: number;
  transcriptions: number;
  summaries: number;
  downloads: number;
  storageMB: number;
}>> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const result = await sql`
    SELECT
      u.id as user_id,
      u.email,
      COUNT(CASE WHEN ul.event_type = 'upload' THEN 1 END) as uploads,
      COUNT(CASE WHEN ul.event_type = 'transcription' THEN 1 END) as transcriptions,
      COUNT(CASE WHEN ul.event_type = 'summary' THEN 1 END) as summaries,
      COUNT(CASE WHEN ul.event_type = 'download' THEN 1 END) as downloads,
      COALESCE(SUM(CASE WHEN ul.event_type = 'upload' THEN ul.file_size_mb END), 0) as storage_mb,
      COALESCE(SUM(ul.cost_usd), 0) as total_cost
    FROM users u
    LEFT JOIN usage_logs ul ON u.id = ul.user_id
      AND ul.created_at >= ${start.toISOString()}
      AND ul.created_at <= ${end.toISOString()}
    GROUP BY u.id, u.email
    ORDER BY total_cost DESC
  `;

  return result.rows.map(row => ({
    userId: row.user_id,
    email: row.email,
    totalCost: parseFloat(row.total_cost) || 0,
    uploads: parseInt(row.uploads) || 0,
    transcriptions: parseInt(row.transcriptions) || 0,
    summaries: parseInt(row.summaries) || 0,
    downloads: parseInt(row.downloads) || 0,
    storageMB: parseFloat(row.storage_mb) || 0,
  }));
}

/**
 * Get platform-wide stats
 */
export async function getPlatformStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCost: number;
  totalUsers: number;
  totalUploads: number;
  totalTranscriptions: number;
  totalSummaries: number;
  totalDownloads: number;
  totalStorageGB: number;
  avgCostPerUser: number;
}> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const result = await sql`
    SELECT
      COUNT(DISTINCT ul.user_id) as total_users,
      COUNT(CASE WHEN ul.event_type = 'upload' THEN 1 END) as total_uploads,
      COUNT(CASE WHEN ul.event_type = 'transcription' THEN 1 END) as total_transcriptions,
      COUNT(CASE WHEN ul.event_type = 'summary' THEN 1 END) as total_summaries,
      COUNT(CASE WHEN ul.event_type = 'download' THEN 1 END) as total_downloads,
      COALESCE(SUM(CASE WHEN ul.event_type = 'upload' THEN ul.file_size_mb END), 0) as total_storage_mb,
      COALESCE(SUM(ul.cost_usd), 0) as total_cost
    FROM usage_logs ul
    WHERE ul.created_at >= ${start.toISOString()}
      AND ul.created_at <= ${end.toISOString()}
  `;

  const row = result.rows[0];
  const totalUsers = parseInt(row.total_users) || 1; // Avoid division by zero
  const totalCost = parseFloat(row.total_cost) || 0;
  const totalStorageMB = parseFloat(row.total_storage_mb) || 0;

  return {
    totalCost,
    totalUsers,
    totalUploads: parseInt(row.total_uploads) || 0,
    totalTranscriptions: parseInt(row.total_transcriptions) || 0,
    totalSummaries: parseInt(row.total_summaries) || 0,
    totalDownloads: parseInt(row.total_downloads) || 0,
    totalStorageGB: totalStorageMB / 1024,
    avgCostPerUser: totalCost / totalUsers,
  };
}
