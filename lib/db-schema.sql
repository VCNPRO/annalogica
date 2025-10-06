-- Annalogica Database Schema
-- Run this after creating your Vercel Postgres database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Transcriptions table (for future use - track user's files)
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  audio_url TEXT,
  txt_url TEXT,
  srt_url TEXT,
  summary_url TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);
