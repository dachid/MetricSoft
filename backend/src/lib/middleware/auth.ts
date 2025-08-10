import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    tenantId?: string | null;
  };
  error?: string;
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  try {
    const authorization = request.headers.get('Authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No authentication token provided'
      };
    }

    const token = authorization.substring(7);
    
    // Find session with valid token that hasn't expired
    const session = await prisma.session.findUnique({
      where: { 
        token,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!session) {
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }

    // Get user details separately
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        tenantId: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}
