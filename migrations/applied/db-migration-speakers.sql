-- Migración: Agregar columna speakers_url a transcription_jobs
-- Fecha: 2025-10-10
-- Descripción: Añade soporte para almacenar el reporte de oradores/intervinientes

-- Agregar columna speakers_url
ALTER TABLE transcription_jobs
ADD COLUMN IF NOT EXISTS speakers_url TEXT;

-- Comentario para documentación
COMMENT ON COLUMN transcription_jobs.speakers_url IS 'URL del reporte de análisis de oradores/intervinientes';

-- Verificar la columna
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transcription_jobs'
AND column_name = 'speakers_url';
