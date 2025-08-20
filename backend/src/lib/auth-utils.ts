import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface SecureSession {
  id: string;
  userId: string;
  token: string;
  csrfToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  tenantId?: string | null;
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

export interface AuthResult {
  success: boolean;
  user?: SessionUser;
  session?: SecureSession;
  error?: string;
}

// Generate cryptographically secure tokens
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

// Create a new secure session
export async function createSecureSession(
  userId: string,
  request: NextRequest
): Promise<SecureSession> {
  const token = generateSecureToken();
  const csrfToken = generateCSRFToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Get client info for security
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      csrfToken,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    csrfToken: (session as any).csrfToken!,
    expiresAt: session.expiresAt,
    ipAddress: (session as any).ipAddress || undefined,
    userAgent: (session as any).userAgent || undefined,
  };
}

// Validate session and CSRF token
export async function validateSecureSession(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // Get session token from HTTP-only cookie
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return { success: false, error: 'No session token' };
    }

    // Get CSRF token from header
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return { success: false, error: 'No CSRF token' };
    }

    // Find valid session with basic query first
    const sessionData = await prisma.session.findUnique({
      where: {
        token: sessionToken,
      },
    });

    if (!sessionData || sessionData.expiresAt <= new Date()) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // Validate CSRF token
    if ((sessionData as any).csrfToken !== csrfToken) {
      return { success: false, error: 'Invalid CSRF token' };
    }

    // Get user data separately
    const userData = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!userData) {
      return { success: false, error: 'User not found' };
    }

    // Optional: Validate IP address for additional security
    const currentIP = getClientIP(request);
    if ((sessionData as any).ipAddress && (sessionData as any).ipAddress !== currentIP) {
      // Log suspicious activity but don't necessarily reject
      console.warn(`IP address mismatch for session ${sessionData.id}: expected ${(sessionData as any).ipAddress}, got ${currentIP}`);
    }

    // Format user data
    const user: SessionUser = {
      id: userData.id,
      email: userData.email,
      name: userData.name || undefined,
      tenantId: userData.tenantId,
      roles: userData.roles.map((ur: any) => ur.role),
    };

    return {
      success: true,
      user,
      session: {
        id: sessionData.id,
        userId: sessionData.userId,
        token: sessionData.token,
        csrfToken: (sessionData as any).csrfToken!,
        expiresAt: sessionData.expiresAt,
        ipAddress: (sessionData as any).ipAddress || undefined,
        userAgent: (sessionData as any).userAgent || undefined,
      },
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { success: false, error: 'Session validation failed' };
  }
}

// Create secure HTTP-only cookies
export function createSecureCookies(
  response: NextResponse,
  session: SecureSession
): NextResponse {
  // Session cookie (HTTP-only)
  response.cookies.set('session', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    path: '/',
  });

  // CSRF token cookie (accessible to JavaScript)
  response.cookies.set('csrf-token', session.csrfToken, {
    httpOnly: false, // Needs to be accessible to frontend
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60,
    path: '/',
  });

  return response;
}

// Clear authentication cookies
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('csrf-token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}

// Revoke session from database
export async function revokeSession(sessionToken: string): Promise<void> {
  try {
    await prisma.session.delete({
      where: { token: sessionToken },
    });
  } catch (error) {
    console.error('Failed to revoke session:', error);
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
  }
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const remoteAddr = request.headers.get('remote-addr');
  if (remoteAddr) {
    return remoteAddr;
  }

  return 'unknown';
}

// Extend session expiry on activity
export async function extendSession(sessionToken: string): Promise<void> {
  try {
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.session.update({
      where: { token: sessionToken },
      data: { expiresAt: newExpiresAt },
    });
  } catch (error) {
    console.error('Failed to extend session:', error);
  }
}
