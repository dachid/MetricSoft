import { NextRequest, NextResponse } from 'next/server';

// Error classes for API routes
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  public details?: string;
  
  constructor(message: string, details?: string) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class DatabaseError extends Error {
  public details?: string;
  public metadata?: any;
  
  constructor(message: string, details?: string, options?: { metadata?: any }) {
    super(message);
    this.name = 'DatabaseError';
    this.details = details;
    this.metadata = options?.metadata;
  }
}

export class ConflictError extends Error {
  public details?: string;
  
  constructor(message: string, details?: string) {
    super(message);
    this.name = 'ConflictError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// API route wrapper to handle errors consistently
export function createApiRoute<T extends any[]>(
  handler: (...args: T) => Promise<any>
) {
  return async (...args: T) => {
    try {
      const result = await handler(...args);
      return NextResponse.json(result);
    } catch (error) {
      console.error('API Route Error:', error);

      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        );
      }

      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }

      if (error instanceof ValidationError) {
        return NextResponse.json(
          { 
            error: error.message,
            details: error.details 
          },
          { status: 400 }
        );
      }

      if (error instanceof ConflictError) {
        return NextResponse.json(
          { 
            error: error.message,
            details: error.details 
          },
          { status: 409 }
        );
      }

      if (error instanceof NotFoundError) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error instanceof DatabaseError) {
        return NextResponse.json(
          { 
            error: error.message,
            details: error.details,
            metadata: error.metadata
          },
          { status: 500 }
        );
      }

      // Generic error fallback
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
