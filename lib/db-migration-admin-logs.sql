-- Migración: Sistema de Logs de Administración
-- Fecha: 2025-10-13
-- Descripción: Tabla para auditoría de acciones de administradores

-- 1. Crear tabla de logs de admin
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

-- 3. Comentarios para documentación
COMMENT ON TABLE admin_logs IS 'Registro de auditoría de acciones de administradores';
COMMENT ON COLUMN admin_logs.admin_user_id IS 'Usuario admin que realizó la acción';
COMMENT ON COLUMN admin_logs.action IS 'Tipo de acción: update_user, delete_user, change_plan, reset_password, reset_quota, etc.';
COMMENT ON COLUMN admin_logs.target_user_id IS 'Usuario afectado por la acción (puede ser NULL)';
COMMENT ON COLUMN admin_logs.details IS 'Detalles de la acción en formato JSON';
COMMENT ON COLUMN admin_logs.ip_address IS 'IP del administrador';
COMMENT ON COLUMN admin_logs.user_agent IS 'User agent del navegador';

-- 4. Verificar que se creó correctamente
SELECT
  'admin_logs table created' as status,
  COUNT(*) as current_logs
FROM admin_logs;
