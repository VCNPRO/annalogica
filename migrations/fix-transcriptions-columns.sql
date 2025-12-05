-- Migración: Agregar columnas faltantes a la tabla transcriptions
-- Fecha: 2025-12-05
-- Problema: La tabla transcriptions no tiene las columnas language, vtt_url, speakers_url, tags, audio_duration_seconds, metadata
-- Solución: Agregar todas las columnas necesarias

-- 1. Agregar columna language (idioma del audio)
ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'auto';

-- 2. Agregar columna vtt_url (subtítulos VTT)
ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS vtt_url TEXT;

-- 3. Agregar columna speakers_url (análisis de oradores)
ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS speakers_url TEXT;

-- 4. Agregar columna tags (etiquetas)
ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS tags JSONB;

-- 5. Agregar columna audio_duration_seconds (duración del audio)
ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;

-- 6. Agregar columna metadata (metadatos adicionales)
ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 7. Agregar índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);

-- Verificar las columnas agregadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transcriptions'
ORDER BY ordinal_position;
