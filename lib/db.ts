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
