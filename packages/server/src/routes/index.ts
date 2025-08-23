import { Express } from 'express'
import { requestLogger } from '../middleware/logger.js'
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js'
import healthRoutes from './health.js'
import projectRoutes from './projects.js'
import testRoutes from './test.js'

export function setupRoutes(app: Express): void {
  // Global middleware
  app.use(requestLogger)

  // API routes
  app.use('/api', healthRoutes)
  app.use('/api/projects', projectRoutes)
  app.use('/api/test', testRoutes)

  // Future endpoints (stubs for now)
  app.post('/api/claude-code/execute', (req, res) => {
    res.json({
      success: false,
      message: 'Claude Code execution endpoint ready (implementation coming in Stage 4)',
      command: req.body.command || null,
      timestamp: new Date().toISOString()
    })
  })

  app.get('/api/sessions', (_req, res) => {
    res.json({
      success: true,
      data: {
        sessions: [],
        total: 0
      },
      message: 'Sessions endpoint ready (implementation coming in Stage 4)',
      timestamp: new Date().toISOString()
    })
  })

  // 404 handler for unknown routes
  app.use(notFoundHandler)
  
  // Global error handler (must be last)
  app.use(errorHandler)
}