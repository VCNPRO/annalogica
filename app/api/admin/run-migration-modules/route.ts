import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * GET /api/admin/run-migration-modules
 * Ejecutar migración para crear tablas de módulos de servicio
 */
export async function GET(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Crear tabla service_modules
    await sql`
      CREATE TABLE IF NOT EXISTS service_modules (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        monthly_price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true
      )
    `;

    // Crear tabla user_modules
    await sql`
      CREATE TABLE IF NOT EXISTS user_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        module_id VARCHAR(50) NOT NULL REFERENCES service_modules(id),
        active BOOLEAN DEFAULT true,
        granted_by UUID REFERENCES users(id),
        granted_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        UNIQUE(user_id, module_id)
      )
    `;

    // Insertar módulos iniciales
    await sql`
      INSERT INTO service_modules (id, name, monthly_price) VALUES
        ('extraction', 'Extraccion de Datos', 29.00),
        ('rag', 'Preguntale al Documento', 19.00),
        ('review', 'Revision de Documentos', 15.00),
        ('excel_master', 'Excel Master', 15.00),
        ('batch', 'Procesamiento en Lote', 25.00),
        ('templates', 'Plantillas Personalizadas', 10.00)
      ON CONFLICT (id) DO NOTHING
    `;

    // Dar a los usuarios admin acceso a todos los módulos por defecto
    await sql`
      INSERT INTO user_modules (user_id, module_id, active)
      SELECT u.id, sm.id, true
      FROM users u
      CROSS JOIN service_modules sm
      WHERE u.role = 'admin'
      ON CONFLICT (user_id, module_id) DO NOTHING
    `;

    return NextResponse.json({
      success: true,
      message: 'Migración de módulos ejecutada correctamente. Tablas service_modules y user_modules creadas, módulos iniciales insertados y asignados a admins.'
    });
  } catch (error: any) {
    console.error('Error running modules migration:', error);
    return NextResponse.json(
      { error: 'Error al ejecutar migración de módulos', details: error.message },
      { status: 500 }
    );
  }
}
