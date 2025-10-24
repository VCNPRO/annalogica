# Solución para acceder al Admin Dashboard

## Problema
No puedes acceder a https://annalogica.eu/admin - te redirige automáticamente.

## Causa
Tu usuario NO tiene `role = 'admin'` en la base de datos.

## Solución (3 pasos)

### 1. Verifica tu usuario actual
Ve a **Vercel Dashboard → Storage → Tu base Neon → SQL Editor**

Ejecuta esta query:
```sql
SELECT id, email, name, role, created_at
FROM users
ORDER BY created_at DESC;
```

Esto te mostrará todos los usuarios y sus roles.

### 2. Identifica tu email
Busca el email con el que hiciste login en annalogica.eu

### 3. Actualiza tu role a admin
Ejecuta esta query (reemplaza con TU email):
```sql
UPDATE users
SET role = 'admin'
WHERE email = 'tu-email-aqui@ejemplo.com';
```

### 4. Verifica que funcionó
```sql
SELECT email, role
FROM users
WHERE email = 'tu-email-aqui@ejemplo.com';
```

Debería mostrar: `role = 'admin'`

### 5. Accede de nuevo
Ahora ve a: https://annalogica.eu/admin

¡Deberías poder acceder! 🎉

---

## Alternativa: Página de Debug (cuando Vercel termine el deploy)
Espera 2 minutos y accede a:
https://annalogica.eu/admin-debug

Esta página te mostrará automáticamente:
- Tu email
- Tu role actual
- El comando SQL exacto para solucionarlo
