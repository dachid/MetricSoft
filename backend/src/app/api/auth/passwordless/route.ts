import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateLoginCode, getLoginEmailTemplate } from '@/lib/email'

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email format')
})

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'Code must be 6 digits')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'send') {
      const validation = sendCodeSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }

      const { email } = validation.data

      // Check if user exists (only pre-onboarded users can login)
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (!user) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'No account found with this email address. Please contact your administrator to get onboarded.' 
          },
          { status: 404 }
        )
      }

      // Generate and store code in database
      const code = generateLoginCode()
      const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Store or update auth code in database
      await prisma.authCode.upsert({
        where: { email: email.toLowerCase() },
        update: {
          code,
          attempts: 0,
          expiresAt: expires
        },
        create: {
          email: email.toLowerCase(),
          code,
          attempts: 0,
          expiresAt: expires
        }
      })

      try {
        // Send email with login code
        const { html, text } = getLoginEmailTemplate(code, email)
        await sendEmail({
          to: email,
          subject: '🔐 Your MetricSoft Login Code',
          html,
          text
        })

        console.log(`✅ Login code sent to ${email}`)
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
        // Fallback to console log for development
        console.log(`🔐 Passwordless login code for ${email}: ${code}`)
        
        return NextResponse.json({
          success: true,
          message: 'Login code generated successfully. Check the server logs for the code (email service temporarily unavailable).'
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Login code sent to your email address. Check your inbox and enter the 6-digit code.'
      })
    }

    if (action === 'verify') {
      const validation = verifyCodeSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid input' },
          { status: 400 }
        )
      }

      const { email, code } = validation.data
      const emailLower = email.toLowerCase()

      // Get auth code from database
      const storedAuth = await prisma.authCode.findUnique({
        where: { email: emailLower }
      })

      if (!storedAuth) {
        return NextResponse.json(
          { success: false, error: 'No verification code found. Please request a new code.' },
          { status: 400 }
        )
      }

      if (new Date() > storedAuth.expiresAt) {
        // Clean up expired code
        await prisma.authCode.delete({
          where: { email: emailLower }
        })
        return NextResponse.json(
          { success: false, error: 'Verification code has expired. Please request a new code.' },
          { status: 400 }
        )
      }

      if (storedAuth.attempts >= 3) {
        // Clean up after too many attempts
        await prisma.authCode.delete({
          where: { email: emailLower }
        })
        return NextResponse.json(
          { success: false, error: 'Too many failed attempts. Please request a new code.' },
          { status: 400 }
        )
      }

      if (storedAuth.code !== code) {
        // Increment attempts
        await prisma.authCode.update({
          where: { email: emailLower },
          data: { attempts: storedAuth.attempts + 1 }
        })
        const remainingAttempts = 3 - (storedAuth.attempts + 1)
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid verification code. ${remainingAttempts} attempts remaining.` 
          },
          { status: 400 }
        )
      }

      // Code is valid, remove it from database
      await prisma.authCode.delete({
        where: { email: emailLower }
      })

      const user = await prisma.user.findUnique({
        where: { email: emailLower },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      // Import AuthService dynamically to avoid circular imports
      const { AuthService } = await import('@/lib/auth')
      const token = AuthService.generateToken(user.id)

      // Create session
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      })

      const authUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roles: user.roles.map((ur: any) => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          permissions: ur.role.permissions || []
        }))
      }

      return NextResponse.json({
        success: true,
        data: {
          user: authUser,
          token
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Passwordless API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
