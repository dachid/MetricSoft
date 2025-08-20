export enum FrontendErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  component?: string
  action?: string
  metadata?: Record<string, any>
}

export interface FrontendError {
  code: FrontendErrorCode
  message: string
  details?: string
  context?: ErrorContext
}

export class ErrorHandler {
  static handleApiError(error: any, context?: ErrorContext): FrontendError {
    // Handle network errors
    if (!error.response) {
      return {
        code: FrontendErrorCode.NETWORK_ERROR,
        message: 'Network error occurred',
        details: error.message || 'Unable to connect to server',
        context
      }
    }

    // Handle HTTP status codes
    const status = error.response?.status || error.status || 500
    const message = error.response?.data?.error || error.error || error.message || 'An error occurred'

    switch (status) {
      case 401:
        return {
          code: FrontendErrorCode.AUTHENTICATION_ERROR,
          message: 'Authentication required',
          details: message,
          context
        }
      case 403:
        return {
          code: FrontendErrorCode.AUTHORIZATION_ERROR,
          message: 'Access denied',
          details: message,
          context
        }
      case 400:
        return {
          code: FrontendErrorCode.VALIDATION_ERROR,
          message: 'Validation error',
          details: message,
          context
        }
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: FrontendErrorCode.SERVER_ERROR,
          message: 'Server error',
          details: message,
          context
        }
      default:
        return {
          code: FrontendErrorCode.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          details: message,
          context
        }
    }
  }

  static handleComponentError(error: Error, component: string, metadata?: Record<string, any>): FrontendError {
    return {
      code: FrontendErrorCode.UNKNOWN_ERROR,
      message: 'Component error occurred',
      details: error.message,
      context: {
        component,
        metadata
      }
    }
  }

  static handleNetworkError(error: Error, metadata?: Record<string, any>): FrontendError {
    return {
      code: FrontendErrorCode.NETWORK_ERROR,
      message: 'Network error occurred',
      details: error.message,
      context: {
        component: 'NetworkRequest',
        metadata
      }
    }
  }

  static handleHttpError(status: number, statusText: string, metadata?: Record<string, any>): FrontendError {
    let code: FrontendErrorCode
    let message: string

    switch (status) {
      case 401:
        code = FrontendErrorCode.AUTHENTICATION_ERROR
        message = 'Authentication required'
        break
      case 403:
        code = FrontendErrorCode.AUTHORIZATION_ERROR
        message = 'Access denied'
        break
      case 400:
        code = FrontendErrorCode.VALIDATION_ERROR
        message = 'Validation error'
        break
      case 500:
      case 502:
      case 503:
      case 504:
        code = FrontendErrorCode.SERVER_ERROR
        message = 'Server error'
        break
      default:
        code = FrontendErrorCode.UNKNOWN_ERROR
        message = 'HTTP error occurred'
    }

    return {
      code,
      message,
      details: statusText,
      context: {
        component: 'HttpRequest',
        metadata
      }
    }
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
    identifier?: string
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt === maxAttempts) {
          break
        }

        // Log retry attempt if identifier is provided
        if (identifier) {
          console.log(`Retry attempt ${attempt} for ${identifier}`)
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }

    throw lastError!
  }

  static getUserFriendlyMessage(error: FrontendError): string {
    switch (error.code) {
      case FrontendErrorCode.NETWORK_ERROR:
        return 'Unable to connect to the server. Please check your internet connection.'
      case FrontendErrorCode.AUTHENTICATION_ERROR:
        return 'Please sign in to continue.'
      case FrontendErrorCode.AUTHORIZATION_ERROR:
        return 'You do not have permission to perform this action.'
      case FrontendErrorCode.VALIDATION_ERROR:
        return error.details || 'Please check your input and try again.'
      case FrontendErrorCode.SERVER_ERROR:
        return 'A server error occurred. Please try again later.'
      default:
        return error.details || 'An unexpected error occurred. Please try again.'
    }
  }
}