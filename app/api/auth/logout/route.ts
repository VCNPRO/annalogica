import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // SECURITY: Limpiar cookie httpOnly
    const response = NextResponse.json({
      success: true,
      message: 'Logout exitoso'
    });

    // Delete auth cookie
    response.cookies.delete('auth-token');

    return response;
  } catch (error) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
