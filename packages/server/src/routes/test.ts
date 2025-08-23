import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

// POST /api/test - Echo endpoint for testing API connectivity
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { message, data } = req.body

  res.json({
    success: true,
    echo: {
      message: message || 'No message provided',
      data: data || null,
      receivedAt: new Date().toISOString(),
      method: req.method,
      headers: {
        'user-agent': req.get('user-agent'),
        'content-type': req.get('content-type')
      }
    },
    server: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.1.0'
    },
    message: 'API test successful - server is responding correctly'
  })
}))

// GET /api/test - Simple health check endpoint
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString(),
    query: req.query,
    method: req.method
  })
}))

export default router