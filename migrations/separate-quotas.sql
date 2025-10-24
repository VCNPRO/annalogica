-- Migración: Sistema de cuotas separadas (docs + audio)
-- Date: 2025-10-24
-- Description: Implementar cuotas independientes para documentos y audio

-- 1. Agregar nuevas columnas de cuotas separadas
ALTER TABLE users
ADD COLUMN IF NOT EXISTS monthly_quota_docs INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS monthly_quota_audio_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS monthly_usage_docs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_usage_audio_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_pages_per_pdf INTEGER DEFAULT 50;

-- 2. Migrar datos existentes (si monthly_quota existe)
-- Asignar valores por defecto según plan actual
UPDATE users
SET
  monthly_quota_docs = CASE
    WHEN subscription_plan = 'basico' THEN 200
    WHEN subscription_plan = 'pro' THEN 500
    WHEN subscription_plan = 'business' THEN 1000
    ELSE 10  -- free
  END,
  monthly_quota_audio_minutes = CASE
    WHEN subscription_plan = 'basico' THEN 120
    WHEN subscription_plan = 'pro' THEN 300
    WHEN subscription_plan = 'business' THEN 600
    ELSE 10  -- free
  END,
  max_pages_per_pdf = CASE
    WHEN subscription_plan = 'basico' THEN 150
    WHEN subscription_plan = 'pro' THEN 200
    WHEN subscription_plan = 'business' THEN 300
    ELSE 50  -- free
  END,
  monthly_usage_docs = 0,
  monthly_usage_audio_minutes = 0
WHERE monthly_quota_docs IS NULL;

-- 3. Configurar Beta Testers (si tienes algún tag 'beta')
UPDATE users
SET
  monthly_quota_docs = 100,
  monthly_quota_audio_minutes = 60,
  max_pages_per_pdf = 100
WHERE tags @> ARRAY['beta']::text[];

-- 4. Crear índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_users_quota_docs ON users(monthly_quota_docs);
CREATE INDEX IF NOT EXISTS idx_users_usage_docs ON users(monthly_usage_docs);
CREATE INDEX IF NOT EXISTS idx_users_usage_audio_minutes ON users(monthly_usage_audio_minutes);

-- 5. Comentarios para documentación
COMMENT ON COLUMN users.monthly_quota_docs IS 'Cuota mensual de documentos (PDFs, DOCX, TXT)';
COMMENT ON COLUMN users.monthly_quota_audio_minutes IS 'Cuota mensual de minutos de audio/video';
COMMENT ON COLUMN users.monthly_usage_docs IS 'Uso actual de documentos este mes';
COMMENT ON COLUMN users.monthly_usage_audio_minutes IS 'Uso actual de minutos de audio este mes';
COMMENT ON COLUMN users.max_pages_per_pdf IS 'Máximo de páginas permitidas por PDF';

-- 6. Opcional: Mantener compatibilidad con monthly_quota antigua
-- (Para no romper código existente mientras migramos)
COMMENT ON COLUMN users.monthly_quota IS 'DEPRECATED: Usar monthly_quota_docs y monthly_quota_audio_minutes';
COMMENT ON COLUMN users.monthly_usage IS 'DEPRECATED: Usar monthly_usage_docs y monthly_usage_audio_minutes';
