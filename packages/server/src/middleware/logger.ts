import { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  // Log request
  console.log(`📝 ${timestamp} ${req.method} ${req.path}`, {
    query: Object.keys(req.query).length ? req.query : undefined,
    body: req.body && Object.keys(req.body).length ? '[BODY]' : undefined,
    userAgent: req.get('user-agent')?.substring(0, 50) + '...'
  })

  // Intercept response to log completion
  const originalSend = res.json
  res.json = function(data: any) {
    const duration = Date.now() - start
    console.log(`✅ ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`)
    return originalSend.call(this, data)
  }

  next()
}