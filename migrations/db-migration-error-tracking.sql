-- Migración: Sistema de Tracking de Errores
-- Tabla para almacenar errores y eventos del sistema

-- 1. Tabla de errores del sistema
CREATE TABLE IF NOT EXISTS system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100) NOT NULL, -- 'api_error', 'processing_error', 'auth_error', etc.
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  request_url TEXT,
  request_method VARCHAR(10),
  request_headers JSONB,
  request_body JSONB,
  user_agent TEXT,
  ip_address VARCHAR(45),
  metadata JSONB, -- Información adicional flexible
  sentry_event_id VARCHAR(100), -- Link con Sentry si está configurado
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_system_errors_user_id ON system_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_error_type ON system_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_system_errors_severity ON system_errors(severity);
CREATE INDEX IF NOT EXISTS idx_system_errors_is_resolved ON system_errors(is_resolved);
CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON system_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_sentry_id ON system_errors(sentry_event_id);

-- 3. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_system_errors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_errors_timestamp ON system_errors;
CREATE TRIGGER trigger_update_system_errors_timestamp
BEFORE UPDATE ON system_errors
FOR EACH ROW
EXECUTE FUNCTION update_system_errors_timestamp();

-- 4. Vista para errores recientes no resueltos
CREATE OR REPLACE VIEW recent_unresolved_errors AS
SELECT
  e.id,
  e.error_type,
  e.severity,
  e.message,
  e.user_id,
  e.user_email,
  u.client_id,
  u.name as user_name,
  e.request_url,
  e.request_method,
  e.sentry_event_id,
  e.created_at,
  AGE(CURRENT_TIMESTAMP, e.created_at) as error_age
FROM system_errors e
LEFT JOIN users u ON e.user_id = u.id
WHERE e.is_resolved = FALSE
ORDER BY
  CASE e.severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  e.created_at DESC;

-- 5. Función para contar errores por tipo y severidad (últimas 24h)
CREATE OR REPLACE FUNCTION get_error_stats_24h()
RETURNS TABLE (
  error_type VARCHAR(100),
  severity VARCHAR(20),
  count BIGINT,
  last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.error_type,
    e.severity,
    COUNT(*) as count,
    MAX(e.created_at) as last_occurrence
  FROM system_errors e
  WHERE e.created_at > NOW() - INTERVAL '24 hours'
  AND e.is_resolved = FALSE
  GROUP BY e.error_type, e.severity
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para limpiar errores antiguos resueltos (> 90 días)
CREATE OR REPLACE FUNCTION cleanup_old_resolved_errors()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM system_errors
  WHERE is_resolved = TRUE
  AND resolved_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE system_errors IS 'Registro de errores y eventos del sistema para monitoreo y debugging';
COMMENT ON COLUMN system_errors.error_type IS 'Tipo de error: api_error, processing_error, auth_error, upload_error, etc.';
COMMENT ON COLUMN system_errors.severity IS 'Severidad: low (info), medium (warning), high (error), critical (fatal)';
COMMENT ON COLUMN system_errors.sentry_event_id IS 'ID del evento en Sentry para correlación';
COMMENT ON COLUMN system_errors.metadata IS 'Información adicional en formato JSON flexible';
COMMENT ON VIEW recent_unresolved_errors IS 'Vista de errores no resueltos ordenados por severidad y fecha';
COMMENT ON FUNCTION get_error_stats_24h() IS 'Estadísticas de errores de las últimas 24 horas';
COMMENT ON FUNCTION cleanup_old_resolved_errors() IS 'Limpia errores resueltos mayores a 90 días';
