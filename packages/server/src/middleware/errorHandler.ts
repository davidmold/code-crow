import { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  status?: number
  code?: string
}

export function errorHandler(err: ApiError, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    return next(err)
  }

  const status = err.status || 500
  const message = err.message || 'Internal Server Error'
  const code = err.code || 'INTERNAL_ERROR'

  console.error('🔴 API Error:', {
    status,
    message,
    code,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })

  res.status(status).json({
    error: {
      status,
      message,
      code,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  })
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      status: 404,
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      path: req.path,
      timestamp: new Date().toISOString()
    }
  })
}