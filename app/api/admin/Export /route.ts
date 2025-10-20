// DÓNDE: app/api/admin/export/route.ts
// MISIÓN: Recoger datos de la base de datos, convertirlos a CSV y servirlos como un archivo descargable.

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';
// import { auth } from '@/auth'; // Asume que tienes un sistema de autenticación
// import { getUserIsAdmin } from '@/lib/data'; // Asume que tienes esta función

// Simulación de una función auth para que el código funcione
async function auth() {
    return { user: { id: 'd4f39938-7756-4f83-82f0-feb7dfd498d0' } }; // Simula un usuario admin
}
async function getUserIsAdmin(userId: string) { return true; } // Simula que el usuario es admin

// Función para convertir un array de objetos a un string CSV
function convertToCSV(data: any[]) {
    if (data.length === 0) {
        return "";
    }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')]; // Fila de cabecera

    for (const row of data) {
        const values = headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            // Escapar comillas y manejar comas dentro de los valores
            const stringValue = String(value);
            if (stringValue.includes('"') || stringValue.includes(',')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}


export async function GET() {
  noStore();
  // 1. Proteger la API
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 });
  }
  const isAdmin = await getUserIsAdmin(session.user.id);
  if (!isAdmin) {
    return new Response('Acceso denegado', { status: 403 });
  }

  try {
    // 2. Obtener los datos brutos de la base de datos
    console.log("Fetching data for CSV export...");
    const { rows: jobs } = await sql`
        SELECT 
            t.id, 
            u.email as user_email, 
            t.filename, 
            t.status, 
            t.created_at, 
            t.audio_duration,
            t.total_cost_usd,
            t.metadata->>'error' as error_message
        FROM transcription_jobs t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC;
    `;
    console.log(`Found ${jobs.length} jobs to export.`);

    // 3. Convertir los datos a formato CSV
    const csvData = convertToCSV(jobs);

    // 4. Crear la respuesta con las cabeceras correctas para la descarga
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="annalogica_export_${new Date().toISOString().split('T')[0]}.csv"`);

    return new Response(csvData, { headers });

  } catch (error) {
    console.error('Error al generar el export CSV:', error);
    return NextResponse.json({ error: 'Error interno del servidor al generar el CSV' }, { status: 500 });
  }
}

