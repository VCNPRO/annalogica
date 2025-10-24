-- Migración simplificada para admin dashboard
-- Solo agrega las columnas necesarias para el dashboard básico

-- 1. Agregar campos necesarios a users (si no existen)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'production',
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_cost_usd DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS monthly_budget_usd DECIMAL(10, 2) DEFAULT NULL;

-- Crear índices para filtrado rápido
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at DESC);

-- Comentarios para documentación
COMMENT ON COLUMN users.account_type IS 'Tipo de cuenta: production, demo, test, trial';
COMMENT ON COLUMN users.account_status IS 'Estado: active, suspended, cancelled, pending';
COMMENT ON COLUMN users.tags IS 'Tags para categorización: vip, beta, partner, etc.';
