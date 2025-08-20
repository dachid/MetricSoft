import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: authResult.user
    })

  } catch (error) {
    console.error('Get profile API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
