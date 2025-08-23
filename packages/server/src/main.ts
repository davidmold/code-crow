import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import dotenv from 'dotenv'
import { setupRoutes } from './routes/index.js'
import { WebSocketServer } from './websocket/server.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 8080

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Setup REST API routes
setupRoutes(app)

// Setup WebSocket server
const wsServer = new WebSocketServer(httpServer)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  wsServer.stop()
  httpServer.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  wsServer.stop()
  httpServer.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

httpServer.listen(PORT, () => {
  console.log(`🚀 Code Crow server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket server ready for connections`)
  console.log(`🌐 API available at http://localhost:${PORT}/api`)
  
  const clients = wsServer.getConnectedClients()
  console.log(`👥 Connected clients: ${clients.total} (Web: ${clients.web}, Agents: ${clients.agents})`)
})