import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserDB } from '@/lib/db';
import { loginRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { trackError, extractRequestContext } from '@/lib/error-tracker';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResponse = await checkRateLimit(loginRateLimit, identifier, 'intentos de login');
    if (rateLimitResponse) return rateLimitResponse;

    const { email, password } = await request.json();

    // Validaciones básicas
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario
    const user = await UserDB.findByEmail(email);
    if (!user) {
      logger.security('Failed login attempt - user not found', { email });
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      logger.security('Failed login attempt - invalid password', { email, userId: user.id });
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generar JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no configurado');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // SECURITY: Establecer token en httpOnly cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at
      }
    });

    // Set httpOnly cookie with security flags
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
      path: '/'
    });

    logger.security('Successful login', { userId: user.id, email: user.email, role: user.role });

    return response;

  } catch (error: any) {
    logger.error('Error in login endpoint', error);

    // Track error en sistema de monitoreo
    const context = extractRequestContext(request);
    await trackError(
      'auth_login_error',
      'high',
      error.message || 'Error desconocido en login',
      error,
      context
    );

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}