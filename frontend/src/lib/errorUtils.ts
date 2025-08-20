/**
 * Utility functions for handling API responses and extracting user-friendly error messages
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | {
    code?: string;
    message?: string;
    details?: string;
    field?: string;
    correlationId?: string;
  };
}

/**
 * Extracts a user-friendly error message from an API response
 * @param response The API response object
 * @param fallback Default message if no specific error message is found
 * @returns A user-friendly error message string
 */
export function extractErrorMessage(response: ApiResponse, fallback: string = 'An error occurred'): string {
  if (!response.error) {
    return fallback;
  }

  // If error is a string, return it directly
  if (typeof response.error === 'string') {
    return response.error;
  }

  // If error is an object, extract the message
  if (response.error && typeof response.error === 'object') {
    return response.error.message || fallback;
  }

  return fallback;
}

/**
 * Extracts error message from caught exceptions (try/catch blocks)
 * @param error The caught error object
 * @param fallback Default message if no specific error message is found
 * @returns A user-friendly error message string
 */
export function extractExceptionMessage(error: any, fallback: string = 'An unexpected error occurred'): string {
  // If it's already a string
  if (typeof error === 'string') {
    return error;
  }

  // Check for our frontend error format
  if (error?.message) {
    return error.message;
  }

  // Check for axios error format
  if (error?.response?.data?.error) {
    if (typeof error.response.data.error === 'string') {
      return error.response.data.error;
    }
    if (error.response.data.error.message) {
      return error.response.data.error.message;
    }
  }

  // Standard error object
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
