import { NextRequest } from 'next/server';
import { validateSecureSession } from '@/lib/auth-utils';

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    profilePicture?: string;
    tenantId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    roles: Array<{
      id: string;
      code: string;
      name: string;
    }>;
  };
  error?: string;
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  try {
    console.log('🔍 Auth middleware called for:', request.url);
    console.log('🔍 Headers:', {
      csrf: request.headers.get('x-csrf-token'),
      cookie: request.headers.get('cookie'),
    });
    
    // Use the new secure session validation
    const sessionResult = await validateSecureSession(request);
    
    console.log('🔍 Session validation result:', sessionResult);
    
    if (!sessionResult.success || !sessionResult.user) {
      console.log('🔍 Auth middleware failed:', sessionResult.error);
      return {
        success: false,
        error: sessionResult.error || 'Authentication failed'
      };
    }

    console.log('🔍 Auth middleware success for user:', sessionResult.user.email);
    return {
      success: true,
      user: sessionResult.user
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}
