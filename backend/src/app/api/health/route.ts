import { NextRequest, NextResponse } from 'next/server'
import { ApiErrorHandler } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    // Check database connectivity
    const dbHealth = await ApiErrorHandler.checkDatabaseHealth()
    
    const health = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'MetricSoft Backend API',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbHealth.healthy ? 'up' : 'down',
          ...(dbHealth.error && { error: dbHealth.error })
        },
        api: {
          status: 'up'
        }
      }
    }
    
    const statusCode = dbHealth.healthy ? 200 : 503
    
    return NextResponse.json({
      success: dbHealth.healthy,
      data: health
    }, { status: statusCode })
    
  } catch (error) {
    return ApiErrorHandler.handle(error)
  }
}
