-- Migración: Agregar campo role a tabla users
-- Fecha: 2025-10-11
-- Descripción: Agrega campo role para sistema de permisos (user, admin)

-- Agregar columna role con valor por defecto 'user'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Agregar constraint para validar valores permitidos
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('user', 'admin'));

-- Crear índice para búsquedas por role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comentarios
COMMENT ON COLUMN users.role IS 'Rol del usuario: user (normal) o admin (administrador)';
