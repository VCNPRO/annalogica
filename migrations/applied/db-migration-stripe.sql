-- Migración SQL para integración con Stripe
-- Fecha: 2025-10-11
-- Descripción: Añade campos para gestionar suscripciones de Stripe

-- 1. Añadir columnas de Stripe a la tabla users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS monthly_quota INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS monthly_usage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Añadir constraint para validar subscription_status
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_subscription_status_check;

ALTER TABLE users
ADD CONSTRAINT users_subscription_status_check
CHECK (subscription_status IN ('free', 'active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'));

-- 3. Añadir constraint para validar subscription_plan
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_subscription_plan_check;

ALTER TABLE users
ADD CONSTRAINT users_subscription_plan_check
CHECK (subscription_plan IN ('free', 'basico', 'pro', 'business', 'universidad', 'medios', 'empresarial'));

-- 4. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_quota_reset_date ON users(quota_reset_date);

-- 5. Crear tabla para historial de pagos
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_invoice_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Crear índices para payment_history
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_payment_id ON payment_history(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);

-- 7. Crear tabla para códigos promocionales
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_months')),
  discount_value DECIMAL(10, 2) NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  applicable_plans TEXT[], -- Array de planes aplicables
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Crear índices para promo_codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid_until ON promo_codes(valid_until);

-- 9. Crear tabla para uso de códigos promocionales
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id SERIAL PRIMARY KEY,
  promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  stripe_subscription_id VARCHAR(255),
  UNIQUE(promo_code_id, user_id)
);

-- 10. Crear índices para promo_code_usage
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_promo_code_id ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user_id ON promo_code_usage(user_id);

-- 11. Actualizar usuarios existentes con cuota mensual por defecto
UPDATE users
SET monthly_quota = 10,
    monthly_usage = 0,
    quota_reset_date = DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
WHERE monthly_quota IS NULL;

-- 12. Crear función para resetear cuotas mensuales
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET monthly_usage = 0,
      quota_reset_date = DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
  WHERE quota_reset_date <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 13. Verificar migración
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
  'stripe_customer_id',
  'stripe_subscription_id',
  'subscription_status',
  'subscription_plan',
  'monthly_quota',
  'monthly_usage',
  'quota_reset_date'
)
ORDER BY ordinal_position;

-- Mostrar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('payment_history', 'promo_codes', 'promo_code_usage')
ORDER BY table_name;
