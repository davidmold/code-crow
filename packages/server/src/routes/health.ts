import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'code-crow-server',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Code Crow server is running successfully!'
  })
}))

export default router