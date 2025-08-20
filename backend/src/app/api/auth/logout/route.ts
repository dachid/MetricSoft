import { NextRequest, NextResponse } from 'next/server';
import { validateSecureSession, revokeSession, clearAuthCookies } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Get current session if it exists
    const authResult = await validateSecureSession(request);
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // If we have a valid session, revoke it from the database
    if (authResult.success && authResult.session) {
      await revokeSession(authResult.session.token);
    }

    // Clear authentication cookies regardless of session validity
    return clearAuthCookies(response);

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, we should clear the cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    return clearAuthCookies(response);
  }
}
