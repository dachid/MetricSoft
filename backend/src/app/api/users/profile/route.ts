import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 401 }
      )
    }

    // Get user from token
    const user = await AuthService.getUserFromToken(token)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user
    })

  } catch (error) {
    console.error('Get profile API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
