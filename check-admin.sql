-- Verificar qué usuarios existen y cuáles son admin
SELECT id, email, name, role, created_at
FROM users
ORDER BY created_at DESC;

-- Si tu usuario NO es admin, ejecuta esto (reemplaza con tu email):
-- UPDATE users SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
