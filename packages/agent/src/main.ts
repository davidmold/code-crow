import dotenv from 'dotenv'
import { AgentWebSocketClient } from './websocket/client.js'
import { ConfigService } from './config/service.js'

dotenv.config()

let agent: AgentWebSocketClient | null = null

async function startAgent() {
  console.log('🤖 Starting Code Crow Agent...')
  
  const config = ConfigService.load()
  
  // Wait a bit for server to be fully ready
  console.log('⏳ Waiting for server to be ready...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  // Create WebSocket client
  agent = new AgentWebSocketClient(
    config.serverUrl || 'http://localhost:8080',
    `agent-${Date.now()}`
  )
  
  // Connect to server with retry logic
  let retries = 3
  let connected = false
  
  while (retries > 0 && !connected) {
    try {
      connected = await agent.connect()
      if (!connected) {
        retries--
        if (retries > 0) {
          console.log(`❌ Connection failed, retrying in 2 seconds... (${retries} attempts left)`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    } catch (error) {
      retries--
      if (retries > 0) {
        console.log(`❌ Connection error, retrying in 2 seconds... (${retries} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        throw error
      }
    }
  }
  
  if (connected) {
    console.log(`✅ Agent connected to server at ${config.serverUrl}`)
    console.log('📁 Agent ready for commands')
    
    // Display connection stats
    const stats = agent.getStats()
    console.log('📊 Agent stats:', stats)
  } else {
    console.error('❌ Failed to connect to server after all retries')
    process.exit(1)
  }
}

// Graceful shutdown
function shutdown() {
  console.log('🛑 Shutting down agent...')
  if (agent) {
    agent.disconnect()
  }
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
  shutdown()
})

startAgent().catch(error => {
  console.error('❌ Failed to start agent:', error)
  process.exit(1)
})