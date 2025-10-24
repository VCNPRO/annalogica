-- Migración: Sistema de Client ID de 4 cifras
-- Agrega un ID corto de 4 dígitos para identificar clientes de forma amigable

-- 1. Agregar columna client_id
ALTER TABLE users
ADD COLUMN IF NOT EXISTS client_id INTEGER UNIQUE;

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);

-- 3. Crear secuencia para generar IDs automáticamente
-- Empieza en 1000, termina en 9999 (4 dígitos)
CREATE SEQUENCE IF NOT EXISTS client_id_seq
  START WITH 1000
  INCREMENT BY 1
  MINVALUE 1000
  MAXVALUE 9999
  CYCLE; -- Reinicia cuando llega a 9999 (busca huecos)

-- 4. Asignar client_id a usuarios existentes que no lo tengan
-- Se asignan en orden de creación
DO $$
DECLARE
  user_record RECORD;
  new_client_id INTEGER;
BEGIN
  FOR user_record IN
    SELECT id FROM users WHERE client_id IS NULL ORDER BY created_at
  LOOP
    -- Buscar el siguiente ID disponible
    LOOP
      new_client_id := nextval('client_id_seq');

      -- Verificar si ya existe (en caso de CYCLE)
      IF NOT EXISTS (SELECT 1 FROM users WHERE client_id = new_client_id) THEN
        EXIT;
      END IF;
    END LOOP;

    -- Asignar el ID
    UPDATE users SET client_id = new_client_id WHERE id = user_record.id;
  END LOOP;
END $$;

-- 5. Hacer client_id NOT NULL después de asignar a todos
ALTER TABLE users
ALTER COLUMN client_id SET NOT NULL;

-- 6. Crear función para obtener el siguiente client_id disponible
CREATE OR REPLACE FUNCTION get_next_client_id()
RETURNS INTEGER AS $$
DECLARE
  new_id INTEGER;
  max_attempts INTEGER := 100; -- Evitar bucle infinito
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Obtener siguiente ID de la secuencia
    new_id := nextval('client_id_seq');

    -- Verificar si está disponible
    IF NOT EXISTS (SELECT 1 FROM users WHERE client_id = new_id) THEN
      RETURN new_id;
    END IF;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'No se pudo generar un client_id único después de % intentos', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para asignar automáticamente client_id en INSERT
CREATE OR REPLACE FUNCTION assign_client_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := get_next_client_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_client_id ON users;
CREATE TRIGGER trigger_assign_client_id
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION assign_client_id();

-- Comentarios para documentación
COMMENT ON COLUMN users.client_id IS 'ID corto de 4 dígitos para identificación amigable del cliente (1000-9999)';
COMMENT ON SEQUENCE client_id_seq IS 'Secuencia para generar IDs de cliente de 4 dígitos';
COMMENT ON FUNCTION get_next_client_id() IS 'Obtiene el siguiente client_id único disponible';
