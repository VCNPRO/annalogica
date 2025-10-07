import { sql } from '@vercel/postgres';

export interface User {
  id: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transcription {
  id: string;
  user_id: string;
  filename: string;
  audio_url: string | null;
  txt_url: string | null;
  srt_url: string | null;
  summary_url: string | null;
  status: string;
  created_at: Date;
}

export interface TranscriptionJob {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filename: string;
  audio_url: string;
  audio_size_bytes: number | null;
  audio_duration_seconds: number | null;
  assemblyai_id: string | null;
  txt_url: string | null;
  srt_url: string | null;
  vtt_url: string | null;
  summary_url: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  updated_at: Date;
  metadata: any;
}

export const UserDB = {
  // Create new user
  create: async (email: string, hashedPassword: string): Promise<User> => {
    const result = await sql<User>`
      INSERT INTO users (email, password)
      VALUES (${email.toLowerCase()}, ${hashedPassword})
      RETURNING id, email, password, created_at, updated_at
    `;
    return result.rows[0];
  },

  // Find user by email
  findByEmail: async (email: string): Promise<User | null> => {
    const result = await sql<User>`
      SELECT id, email, password, created_at, updated_at
      FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;
    return result.rows[0] || null;
  },

  // Find user by ID
  findById: async (id: string): Promise<User | null> => {
    const result = await sql<User>`
      SELECT id, email, password, created_at, updated_at
      FROM users
      WHERE id = ${id}
      LIMIT 1
    `;
    return result.rows[0] || null;
  },

  // Update user
  update: async (id: string, updates: Partial<Pick<User, 'email' | 'password'>>): Promise<User | null> => {
    if (updates.email && updates.password) {
      const result = await sql<User>`
        UPDATE users
        SET email = ${updates.email.toLowerCase()},
            password = ${updates.password},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, email, password, created_at, updated_at
      `;
      return result.rows[0] || null;
    } else if (updates.email) {
      const result = await sql<User>`
        UPDATE users
        SET email = ${updates.email.toLowerCase()},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, email, password, created_at, updated_at
      `;
      return result.rows[0] || null;
    } else if (updates.password) {
      const result = await sql<User>`
        UPDATE users
        SET password = ${updates.password},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, email, password, created_at, updated_at
      `;
      return result.rows[0] || null;
    }
    return null;
  },

  // Delete user
  delete: async (id: string): Promise<boolean> => {
    const result = await sql`
      DELETE FROM users
      WHERE id = ${id}
    `;
    return (result.rowCount ?? 0) > 0;
  },

  // Get all users (admin only - for debugging)
  getAll: async (): Promise<User[]> => {
    const result = await sql<User>`
      SELECT id, email, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;
    return result.rows;
  }
};

export const TranscriptionDB = {
  // Create new transcription record
  create: async (
    userId: string,
    filename: string,
    audioUrl: string | null = null,
    txtUrl: string | null = null,
    srtUrl: string | null = null,
    summaryUrl: string | null = null
  ): Promise<Transcription> => {
    const result = await sql<Transcription>`
      INSERT INTO transcriptions (user_id, filename, audio_url, txt_url, srt_url, summary_url)
      VALUES (${userId}, ${filename}, ${audioUrl}, ${txtUrl}, ${srtUrl}, ${summaryUrl})
      RETURNING *
    `;
    return result.rows[0];
  },

  // Get user's transcriptions
  findByUserId: async (userId: string): Promise<Transcription[]> => {
    const result = await sql<Transcription>`
      SELECT *
      FROM transcriptions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return result.rows;
  },

  // Get single transcription
  findById: async (id: string): Promise<Transcription | null> => {
    const result = await sql<Transcription>`
      SELECT *
      FROM transcriptions
      WHERE id = ${id}
      LIMIT 1
    `;
    return result.rows[0] || null;
  },

  // Delete transcription
  delete: async (id: string, userId: string): Promise<boolean> => {
    const result = await sql`
      DELETE FROM transcriptions
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return (result.rowCount ?? 0) > 0;
  },

  // Update transcription status
  updateStatus: async (id: string, status: string): Promise<boolean> => {
    const result = await sql`
      UPDATE transcriptions
      SET status = ${status}
      WHERE id = ${id}
    `;
    return (result.rowCount ?? 0) > 0;
  }
};

export const TranscriptionJobDB = {
  // Create new job
  create: async (
    userId: string,
    filename: string,
    audioUrl: string,
    audioSizeBytes?: number
  ): Promise<TranscriptionJob> => {
    const result = await sql<TranscriptionJob>`
      INSERT INTO transcription_jobs (user_id, filename, audio_url, audio_size_bytes, status)
      VALUES (${userId}, ${filename}, ${audioUrl}, ${audioSizeBytes || null}, 'pending')
      RETURNING *
    `;
    return result.rows[0];
  },

  // Find job by ID
  findById: async (id: string): Promise<TranscriptionJob | null> => {
    const result = await sql<TranscriptionJob>`
      SELECT *
      FROM transcription_jobs
      WHERE id = ${id}
      LIMIT 1
    `;
    return result.rows[0] || null;
  },

  // Find jobs by user ID
  findByUserId: async (userId: string, limit = 50): Promise<TranscriptionJob[]> => {
    const result = await sql<TranscriptionJob>`
      SELECT *
      FROM transcription_jobs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return result.rows;
  },

  // Find pending jobs (for processing queue)
  findPending: async (limit = 10): Promise<TranscriptionJob[]> => {
    const result = await sql<TranscriptionJob>`
      SELECT *
      FROM transcription_jobs
      WHERE status = 'pending'
      AND retry_count < max_retries
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;
    return result.rows;
  },

  // Update job status
  updateStatus: async (
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<boolean> => {
    const updates: string[] = [`status = '${status}'`];

    if (status === 'processing') {
      updates.push('started_at = CURRENT_TIMESTAMP');
    } else if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }

    if (errorMessage) {
      const escapedMessage = errorMessage.replace(/'/g, "''");
      updates.push(`error_message = '${escapedMessage}'`);
    }

    const result = await sql`
      UPDATE transcription_jobs
      SET ${sql(updates.join(', '))}
      WHERE id = ${id}
    `;
    return (result.rowCount ?? 0) > 0;
  },

  // Update job with results
  updateResults: async (
    id: string,
    results: {
      assemblyaiId?: string;
      txtUrl?: string;
      srtUrl?: string;
      vttUrl?: string;
      summaryUrl?: string;
      audioDuration?: number;
    }
  ): Promise<boolean> => {
    const result = await sql`
      UPDATE transcription_jobs
      SET
        assemblyai_id = COALESCE(${results.assemblyaiId || null}, assemblyai_id),
        txt_url = COALESCE(${results.txtUrl || null}, txt_url),
        srt_url = COALESCE(${results.srtUrl || null}, srt_url),
        vtt_url = COALESCE(${results.vttUrl || null}, vtt_url),
        summary_url = COALESCE(${results.summaryUrl || null}, summary_url),
        audio_duration_seconds = COALESCE(${results.audioDuration || null}, audio_duration_seconds)
      WHERE id = ${id}
    `;
    return (result.rowCount ?? 0) > 0;
  },

  // Increment retry count
  incrementRetry: async (id: string): Promise<boolean> => {
    const result = await sql`
      UPDATE transcription_jobs
      SET retry_count = retry_count + 1
      WHERE id = ${id}
    `;
    return (result.rowCount ?? 0) > 0;
  },

  // Delete old completed jobs (cleanup)
  deleteOld: async (daysOld = 30): Promise<number> => {
    const result = await sql`
      DELETE FROM transcription_jobs
      WHERE status IN ('completed', 'failed')
      AND completed_at < NOW() - INTERVAL '${daysOld} days'
    `;
    return result.rowCount ?? 0;
  }
};
