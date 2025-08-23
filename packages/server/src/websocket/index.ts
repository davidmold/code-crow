import { Server } from 'socket.io'

export function setupWebSocket(io: Server): void {
  io.on('connection', (socket) => {
    console.log(`📱 Client connected: ${socket.id}`)

    socket.on('agent:connect', (data) => {
      console.log('🤖 Agent connected:', data)
      socket.join('agents')
      socket.emit('agent:connected', { status: 'success' })
    })

    socket.on('client:connect', (data) => {
      console.log('💻 Web client connected:', data)
      socket.join('clients')
      socket.emit('client:connected', { status: 'success' })
    })

    socket.on('claude-code:execute', (data) => {
      console.log('⚡ Claude Code execution request:', data)
      socket.emit('claude-code:response', {
        message: 'Claude Code execution ready (implementation coming in later stages)',
        command: data.command
      })
    })

    socket.on('disconnect', () => {
      console.log(`📴 Client disconnected: ${socket.id}`)
    })
  })
}