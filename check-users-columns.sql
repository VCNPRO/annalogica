-- Verificar qué columnas existen en la tabla users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Query simplificada para ver usuarios (sin columnas que pueden no existir)
SELECT
  id,
  email,
  role,
  created_at
FROM users;
