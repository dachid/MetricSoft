import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export interface ApiError {
  code: string
  message: string
  details?: string
  statusCode: number
}

export class ApiErrorHandler {
  static handle(error: unknown): NextResponse {
    console.error('API Error:', error)
    
    // Authentication and Authorization errors
    if (error instanceof AuthenticationError) {
      return this.createErrorResponse({
        code: 'AUTHENTICATION_REQUIRED',
        message: error.message,
        statusCode: 401
      })
    }
    
    if (error instanceof AuthorizationError) {
      return this.createErrorResponse({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: error.message,
        statusCode: 403
      })
    }
    
    // Database connection errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(error)
    }
    
    // Database initialization errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return this.handleDatabaseConnectionError(error)
    }
    
    // Network/connection errors
    if (error instanceof Error && error.message.includes('ENOTFOUND')) {
      return this.createErrorResponse({
        code: 'DATABASE_UNAVAILABLE',
        message: 'Service temporarily unavailable. Please try again later.',
        statusCode: 503
      })
    }
    
    // Validation errors
    if (error instanceof ValidationError) {
      return this.createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.field,
        statusCode: 400
      })
    }
    
    // Generic errors
    if (error instanceof Error) {
      // Don't expose internal error messages in production
      const isProduction = process.env.NODE_ENV === 'production'
      
      return this.createErrorResponse({
        code: 'INTERNAL_ERROR',
        message: isProduction 
          ? 'An unexpected error occurred. Please try again later.' 
          : error.message,
        details: isProduction ? undefined : error.stack,
        statusCode: 500
      })
    }
    
    // Fallback for unknown error types
    return this.createErrorResponse({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      statusCode: 500
    })
  }
  
  private static handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
    switch (error.code) {
      case 'P1001': // Can't reach database server
        return this.createErrorResponse({
          code: 'DATABASE_UNAVAILABLE',
          message: 'Service temporarily unavailable. Please try again later.',
          details: 'Database connection failed',
          statusCode: 503
        })
        
      case 'P1008': // Operations timed out
        return this.createErrorResponse({
          code: 'DATABASE_TIMEOUT',
          message: 'Request timed out. Please try again.',
          statusCode: 408
        })
        
      case 'P1017': // Server has closed the connection
        return this.createErrorResponse({
          code: 'DATABASE_CONNECTION_LOST',
          message: 'Connection lost. Please try again.',
          statusCode: 503
        })
        
      case 'P2002': // Unique constraint violation
        return this.createErrorResponse({
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists.',
          statusCode: 409
        })
        
      case 'P2025': // Record not found
        return this.createErrorResponse({
          code: 'NOT_FOUND',
          message: 'The requested resource was not found.',
          statusCode: 404
        })
        
      default:
        return this.createErrorResponse({
          code: 'DATABASE_ERROR',
          message: 'Database operation failed. Please try again later.',
          details: `Prisma error: ${error.code}`,
          statusCode: 500
        })
    }
  }
  
  private static handleDatabaseConnectionError(error: Prisma.PrismaClientInitializationError): NextResponse {
    return this.createErrorResponse({
      code: 'DATABASE_CONNECTION_FAILED',
      message: 'Service temporarily unavailable. Please try again later.',
      details: 'Failed to connect to database',
      statusCode: 503
    })
  }
  
  private static createErrorResponse(apiError: ApiError): NextResponse {
    const response = {
      success: false,
      error: {
        code: apiError.code,
        message: apiError.message,
        ...(apiError.details && { details: apiError.details })
      }
    }
    
    return NextResponse.json(response, { status: apiError.statusCode })
  }
  
  // Health check for database connectivity
  static async checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      return { healthy: true }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      }
    }
  }
  
  // Circuit breaker pattern for database operations
  static async withDatabaseErrorHandling<T>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T | NextResponse> {
    try {
      return await operation()
    } catch (error) {
      // If there's a fallback, use it for database errors
      if (fallback && this.isDatabaseError(error)) {
        console.warn('Database error, using fallback:', error)
        return fallback()
      }
      
      // Otherwise, return error response
      throw error
    }
  }
  
  private static isDatabaseError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Error && (
        error.message.includes('database') ||
        error.message.includes('connection') ||
        error.message.includes('ENOTFOUND')
      ))
    )
  }
}

// Custom error classes for specific use cases
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class DatabaseUnavailableError extends Error {
  constructor(message: string = 'Database temporarily unavailable') {
    super(message)
    this.name = 'DatabaseUnavailableError'
  }
}
