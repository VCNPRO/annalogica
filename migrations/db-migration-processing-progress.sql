-- Migración: Agregar columna processing_progress a transcription_jobs
-- Fecha: 2025-10-23
-- Descripción: Añade soporte para trackear el progreso de procesamiento (0-100)

-- Agregar columna processing_progress
ALTER TABLE transcription_jobs
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;

-- Comentario para documentación
COMMENT ON COLUMN transcription_jobs.processing_progress IS 'Progreso del procesamiento (0-100)';

-- Actualizar trabajos existentes con progreso 0 si están pending, 100 si están completed
UPDATE transcription_jobs
SET processing_progress = CASE
  WHEN status = 'completed' THEN 100
  WHEN status = 'processing' THEN 50
  ELSE 0
END
WHERE processing_progress IS NULL;

-- Verificar la columna
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transcription_jobs'
AND column_name = 'processing_progress';
