-- Migración: Sistema de Gestión de Administración
-- Agrega campos para categorizar y gestionar clientes

-- 1. Agregar campos de gestión a users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'production',
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array de tags: demo, test, vip, etc.
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_cost_usd DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS monthly_budget_usd DECIMAL(10, 2) DEFAULT NULL;

-- Crear índices para filtrado rápido
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at DESC);

-- 2. Tabla de alertas del sistema
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL, -- 'high_cost', 'service_down', 'quota_exceeded', etc.
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  metadata JSONB,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON system_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON system_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON system_alerts(created_at DESC);

-- 3. Tabla de configuración de alertas
CREATE TABLE IF NOT EXISTS alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  threshold_value DECIMAL(10, 2),
  notification_emails TEXT[], -- Array de emails para notificar
  check_interval_minutes INT DEFAULT 60,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Configuraciones predeterminadas de alertas
INSERT INTO alert_config (alert_type, is_enabled, threshold_value, notification_emails, check_interval_minutes)
VALUES
  ('high_cost_user', TRUE, 10.00, ARRAY['admin@annalogica.eu'], 60),
  ('quota_exceeded', TRUE, NULL, ARRAY['admin@annalogica.eu'], 30),
  ('service_error', TRUE, NULL, ARRAY['admin@annalogica.eu'], 5),
  ('storage_high', TRUE, 50.00, ARRAY['admin@annalogica.eu'], 120)
ON CONFLICT (alert_type) DO NOTHING;

-- 4. Vista materializada para métricas rápidas (opcional, para optimización)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_metrics_summary AS
SELECT
  u.id as user_id,
  u.email,
  u.account_type,
  u.account_status,
  u.created_at as user_since,
  COUNT(DISTINCT ul.id) as total_operations,
  COUNT(DISTINCT t.id) as total_files,
  COALESCE(SUM(ul.cost_usd), 0) as total_cost,
  COALESCE(SUM(CASE WHEN ul.created_at > NOW() - INTERVAL '30 days' THEN ul.cost_usd ELSE 0 END), 0) as cost_last_30_days,
  MAX(ul.created_at) as last_operation_at
FROM users u
LEFT JOIN usage_logs ul ON u.id = ul.user_id
LEFT JOIN transcriptions t ON u.id = t.user_id
GROUP BY u.id, u.email, u.account_type, u.account_status, u.created_at;

-- Índice en la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_metrics_cost ON user_metrics_summary(total_cost DESC);
CREATE INDEX IF NOT EXISTS idx_user_metrics_account_type ON user_metrics_summary(account_type);

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_user_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_metrics_summary;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE system_alerts IS 'Registro de alertas del sistema para monitoreo y notificaciones';
COMMENT ON TABLE alert_config IS 'Configuración de tipos de alertas y sus umbrales';
COMMENT ON COLUMN users.account_type IS 'Tipo de cuenta: production, demo, test, trial';
COMMENT ON COLUMN users.account_status IS 'Estado: active, suspended, cancelled, pending';
COMMENT ON COLUMN users.tags IS 'Tags para categorización: vip, beta, partner, etc.';
