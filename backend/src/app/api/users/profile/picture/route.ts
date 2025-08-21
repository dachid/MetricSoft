import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const formData = await request.formData()
    const file = formData.get('profilePicture') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Profile picture file is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Convert file to base64 for storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`

    // Update user profile picture in database
    await prisma.user.update({
      where: { id: authResult.user!.id },
      data: {
        profilePicture: base64Image,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        profilePicture: base64Image
      }
    })

  } catch (error) {
    console.error('Upload profile picture API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
