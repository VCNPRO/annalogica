// DÓNDE: scripts/make-admin.js
// MISIÓN: Asignar el rol de 'admin' a un usuario por su email.

require('dotenv').config();
const { sql } = require('@vercel/postgres');

async function makeAdmin(email) {
  if (!email) {
    console.error('ERROR: Por favor, proporciona un email.');
    console.log('Uso: node scripts/make-admin.js tu-email@dominio.com');
    process.exit(1);
  }

  if (!process.env.POSTGRES_URL) {
    console.error('ERROR: La variable de entorno POSTGRES_URL no está definida. Asegúrate de tener un archivo .env.');
    process.exit(1);
  }

  try {
    console.log(`Buscando al usuario con el email: ${email}...`);
    
    // ACTUALIZADO: Cambiamos 'is_admin = TRUE' por "role = 'admin'"
    const { rows } = await sql`
      UPDATE users
      SET role = 'admin'
      WHERE email = ${email}
      RETURNING id, email, role;
    `;

    if (rows.length === 0) {
      console.error(`ERROR: No se encontró ningún usuario con el email "${email}".`);
      process.exit(1);
    }

    console.log('¡Éxito! El usuario ahora tiene el rol de administrador:');
    console.log(rows[0]);
    process.exit(0);

  } catch (error) {
    console.error('Ha ocurrido un error inesperado:', error);
    process.exit(1);
  }
}

const userEmail = process.argv[2];
makeAdmin(userEmail);

