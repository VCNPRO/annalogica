import jwt from 'jsonwebtoken';
import { UserDB } from './db';

export interface JWTPayload {
  userId: string;
  email: string;
  role?: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    console.log('[verifyToken] Verificando token...');
    console.log('[verifyToken] Token (primeros 20 chars):', token.substring(0, 20) + '...');

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[verifyToken] JWT_SECRET no configurado');
      throw new Error('JWT_SECRET not configured');
    }

    console.log('[verifyToken] JWT_SECRET existe:', !!jwtSecret);

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    console.log('[verifyToken] Token decodificado exitosamente:', { userId: decoded.userId, email: decoded.email });
    return decoded;
  } catch (error) {
    console.error('[verifyToken] Error al verificar token:', error);
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  // SECURITY: Priorizar cookie httpOnly sobre Authorization header
  // Intentar obtener token desde cookie primero
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('auth-token='));
    if (authCookie) {
      return authCookie.split('=')[1];
    }
  }

  // Fallback: Authorization header (para retrocompatibilidad)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  // Support both "Bearer token" and just "token"
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token || null;
}

export function verifyRequestAuth(request: Request): JWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  return verifyToken(token);
}

// SECURITY: Verificar si el usuario autenticado es admin
export async function verifyAdmin(request: Request): Promise<boolean> {
  const auth = verifyRequestAuth(request);
  if (!auth) return false;

  // Verificar role en el token
  if (auth.role === 'admin') return true;

  // Si el token no tiene role, verificar en la base de datos
  try {
    const user = await UserDB.findById(auth.userId);
    return user?.role === 'admin';
  } catch (error) {
    console.error('[verifyAdmin] Error verificando admin:', error);
    return false;
  }
}
