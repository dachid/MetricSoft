import { Request, Response, NextFunction } from 'express'

interface ApiError extends Error {
  statusCode?: number
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err }
  error.message = err.message

  // Log error
  console.error(err)

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found'
    error = { name: 'CastError', message, statusCode: 404 } as ApiError
  }

  // Mongoose duplicate key
  if (err.name === 'ValidationError') {
    const message = 'Validation Error'
    error = { name: 'ValidationError', message, statusCode: 400 } as ApiError
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = { name: 'JsonWebTokenError', message, statusCode: 401 } as ApiError
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = { name: 'TokenExpiredError', message, statusCode: 401 } as ApiError
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`) as ApiError
  error.statusCode = 404
  next(error)
}

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next)
