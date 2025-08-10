import { NextRequest, NextResponse } from 'next/server'

// This system uses passwordless authentication
// Please use /api/auth/passwordless instead
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Password-based login is not supported. This system uses passwordless authentication.',
      message: 'Please use /api/auth/passwordless endpoint to login with email and verification code.',
      passwordless_endpoint: '/api/auth/passwordless'
    },
    { status: 400 }
  )
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'This system uses passwordless authentication only.',
      passwordless_endpoint: '/api/auth/passwordless'
    },
    { status: 200 }
  )
}
