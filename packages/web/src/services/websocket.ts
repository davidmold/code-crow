import { io, Socket } from 'socket.io-client'
import { 
  SOCKET_EVENTS,
  CONNECTION_STATES,
  MessageFactory,
  ConnectionAuth,
  ExecuteCommand,
  JoinProject,
  LeaveProject,
  CommandResult,
  ConnectionStatus,
  ProjectUpdate,
  FileChange,
  ErrorMessage,
  ConnectionState,
  PermissionRequest,
  PermissionResponse,
  ClaudeCodeApiOptions,
  WebClientOptions
} from '@code-crow/shared'

export interface WebSocketServiceEvents {
  connected: () => void
  disconnected: (reason: string) => void
  commandResult: (data: CommandResult) => void
  connectionStatus: (data: ConnectionStatus) => void
  projectUpdate: (data: ProjectUpdate) => void
  fileChange: (data: FileChange) => void
  error: (error: ErrorMessage) => void
  permissionRequest: (request: PermissionRequest) => void
  permissionTimeout: (data: { requestId: string, reason: string }) => void
  sessionCleared: (data: { sessionId: string }) => void
  sessionStatus: (data: { sessionId: string, exists: boolean, info: any }) => void
  sessionError: (data: { sessionId: string, error: string }) => void
}

export class WebSocketService {
  private socket: Socket | null = null
  private connectionState: ConnectionState = CONNECTION_STATES.DISCONNECTED
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private heartbeatInterval: NodeJS.Timeout | null = null
  private eventListeners = new Map<keyof WebSocketServiceEvents, Function[]>()
  private static isConnecting = false // Global flag to prevent multiple connections
  
  constructor(
    private serverUrl: string = import.meta.env.VITE_WS_URL || 'http://localhost:8080',
    private clientId: string = `web-${Date.now()}`
  ) {
    console.log(`🏗️ WebSocketService constructor called - clientId: ${this.clientId}`)
    // Add to window for debugging
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__wsDebug = { clientId: this.clientId, instance: this }
    }
  }

  async connect(): Promise<boolean> {
    try {
      // Global check to prevent multiple connections
      if (WebSocketService.isConnecting) {
        console.log(`🔌 Connection already in progress, waiting...`)
        // Wait for the current connection attempt to complete
        return new Promise((resolve) => {
          const checkConnection = () => {
            if (!WebSocketService.isConnecting) {
              resolve(this.isConnected())
            } else {
              setTimeout(checkConnection, 100)
            }
          }
          checkConnection()
        })
      }

      // If already connected, return true
      if (this.socket && this.socket.connected && this.connectionState === CONNECTION_STATES.CONNECTED) {
        console.log(`🔌 Already connected to server: ${this.serverUrl}`)
        return true
      }

      // Set global connecting flag
      WebSocketService.isConnecting = true

      // Disconnect any existing socket first
      if (this.socket) {
        console.log(`🔌 Disconnecting existing socket before reconnecting (id: ${this.socket.id})`)
        this.socket.removeAllListeners() // Remove all listeners to prevent ghost events
        this.socket.disconnect()
        this.socket = null
      }

      console.log(`🔌 Connecting to server: ${this.serverUrl} (clientId: ${this.clientId})`)
      this.connectionState = CONNECTION_STATES.CONNECTING

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 2000,
        autoConnect: false
      })

      this.setupEventHandlers()
      this.socket.connect()

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('⏰ Connection timeout')
          WebSocketService.isConnecting = false
          this.connectionState = CONNECTION_STATES.ERROR
          reject(new Error('Connection timeout'))
        }, 15000) // Increased timeout to 15 seconds

        this.socket!.once('connect', async () => {
          console.log('🔌 Socket connected, starting authentication...')
          try {
            const success = await this.authenticate()
            clearTimeout(timeout)
            WebSocketService.isConnecting = false
            resolve(success)
          } catch (error) {
            clearTimeout(timeout)
            WebSocketService.isConnecting = false
            console.error('❌ Authentication failed:', error)
            this.connectionState = CONNECTION_STATES.ERROR
            reject(error)
          }
        })

        this.socket!.once('connect_error', (error) => {
          console.error('❌ Connection error:', error)
          clearTimeout(timeout)
          WebSocketService.isConnecting = false
          this.connectionState = CONNECTION_STATES.ERROR
          reject(error)
        })
      })

    } catch (error) {
      console.error('❌ Connection failed:', error)
      this.connectionState = CONNECTION_STATES.ERROR
      WebSocketService.isConnecting = false // Clear flag on exception
      return false
    }
  }

  private async authenticate(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'))
        return
      }

      const authData: ConnectionAuth = MessageFactory.createMessage('auth', {
        clientType: 'web',
        clientId: this.clientId,
        version: '1.0.0'
      })

      console.log(`🔐 Sending authentication for client: ${this.clientId} (socket: ${this.socket.id})`)

      const timeout = setTimeout(() => {
        console.error(`⏰ Authentication timeout for client: ${this.clientId} (socket: ${this.socket?.id})`)
        this.connectionState = CONNECTION_STATES.ERROR
        reject(new Error('Authentication timeout'))
      }, 10000) // Increased to 10 seconds

      // Remove any existing auth result listeners to prevent duplicates
      this.socket.removeAllListeners(SOCKET_EVENTS.AUTH_RESULT)
      
      this.socket.once(SOCKET_EVENTS.AUTH_RESULT, (data) => {
        clearTimeout(timeout)
        if (data && data.success) {
          console.log(`✅ Web client authenticated successfully: ${this.clientId} (socket: ${this.socket?.id})`)
          this.connectionState = CONNECTION_STATES.CONNECTED
          this.reconnectAttempts = 0
          this.startHeartbeat()
          
          // Emit connected event after a small delay to ensure state is fully updated
          setTimeout(() => {
            console.log('🔔 Emitting connected event to listeners')
            this.emit('connected')
          }, 100)
          
          resolve(true)
        } else {
          console.error(`❌ Authentication failed for ${this.clientId}:`, data?.message || 'Unknown auth error')
          this.connectionState = CONNECTION_STATES.ERROR
          reject(new Error(data?.message || 'Authentication failed'))
        }
      })

      // Also listen for errors during authentication
      this.socket.once(SOCKET_EVENTS.ERROR, (error) => {
        clearTimeout(timeout)
        console.error(`❌ Authentication error for ${this.clientId}:`, error)
        this.connectionState = CONNECTION_STATES.ERROR
        reject(new Error(error.error?.message || 'Authentication error'))
      })

      this.socket.emit(SOCKET_EVENTS.AUTH, authData)
      console.log(`📤 Authentication message sent for client: ${this.clientId}`)
    })
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Socket connected to server')
      // Don't set state to CONNECTED here - wait for authentication
      this.connectionState = CONNECTION_STATES.CONNECTING
    })

    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 Disconnected: ${reason}`)
      this.connectionState = CONNECTION_STATES.DISCONNECTED
      this.stopHeartbeat()
      WebSocketService.isConnecting = false
      this.emit('disconnected', reason)
    })

    this.socket.on('reconnect', (attempt) => {
      console.log(`🔄 Reconnected after ${attempt} attempts`)
      this.connectionState = CONNECTION_STATES.CONNECTING
      // Re-authenticate after reconnection
      this.authenticate().catch((error) => {
        console.error('❌ Re-authentication failed:', error)
        this.connectionState = CONNECTION_STATES.ERROR
      })
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection failed:', error)
      this.connectionState = CONNECTION_STATES.ERROR
    })

    // Command results
    this.socket.on(SOCKET_EVENTS.COMMAND_RESULT, (data: CommandResult) => {
      console.log(`📥 Command result: ${data.sessionId}`)
      this.emit('commandResult', data)
    })

    // Connection status updates
    this.socket.on(SOCKET_EVENTS.CONNECTION_STATUS, (data: ConnectionStatus) => {
      console.log(`📡 Connection status update:`, data)
      this.emit('connectionStatus', data)
    })

    // Project updates
    this.socket.on(SOCKET_EVENTS.PROJECT_UPDATE, (data: ProjectUpdate) => {
      console.log(`📁 Project update: ${data.projectId}`)
      this.emit('projectUpdate', data)
    })

    // File changes
    this.socket.on(SOCKET_EVENTS.FILE_CHANGE, (data: FileChange) => {
      console.log(`📝 File change: ${data.filePath}`)
      this.emit('fileChange', data)
    })

    // Error handling
    this.socket.on(SOCKET_EVENTS.ERROR, (error: ErrorMessage) => {
      console.error('❌ Server error:', error)
      this.emit('error', error)
    })

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error)
      this.connectionState = CONNECTION_STATES.ERROR
    })

    // Heartbeat response
    this.socket.on(SOCKET_EVENTS.HEARTBEAT_RESPONSE, () => {
      // Server responded to heartbeat
    })

    // Permission events
    this.socket.on('permission:request', (request: PermissionRequest) => {
      console.log(`🔐 Received permission request: ${request.id} for ${request.toolName}`)
      this.emit('permissionRequest', request)
    })

    this.socket.on('permission:timeout', (data: { requestId: string, reason: string }) => {
      console.log(`⏰ Received permission timeout: ${data.requestId}`)
      this.emit('permissionTimeout', data)
    })

    // Session management events
    this.socket.on('session:cleared', (data: { sessionId: string }) => {
      console.log(`🗑️ Session cleared: ${data.sessionId}`)
      this.emit('sessionCleared', data)
    })

    this.socket.on('session:status', (data: { sessionId: string, exists: boolean, info: any }) => {
      console.log(`📊 Session status: ${data.sessionId} (exists: ${data.exists})`)
      this.emit('sessionStatus', data)
    })

    this.socket.on('session:error', (data: { sessionId: string, error: string }) => {
      console.log(`❌ Session error: ${data.sessionId} - ${data.error}`)
      this.emit('sessionError', data)
    })
  }

  // Public API methods
  executeCommand(
    projectId: string, 
    command: string, 
    apiOptions?: ClaudeCodeApiOptions,
    clientOptions?: WebClientOptions,
    sessionId?: string,
    // Backwards compatibility parameters
    workingDirectory?: string,
    continueSession: boolean = true,
    resumeSessionId?: string
  ): string {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Not connected to server')
    }

    const actualSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const executeCommand: ExecuteCommand = MessageFactory.createMessage('execute_command', {
      projectId,
      command,
      sessionId: actualSessionId,
      
      // New generic options approach
      apiOptions: {
        // Merge apiOptions with backwards compatibility options
        ...apiOptions,
        ...(workingDirectory && !apiOptions?.workingDirectory ? { workingDirectory } : {}),
        ...(continueSession !== undefined && apiOptions?.continueSession === undefined ? { continueSession } : {}),
        ...(resumeSessionId && !apiOptions?.resume ? { resume: resumeSessionId } : {})
      },
      
      clientOptions: {
        // Merge clientOptions with backwards compatibility options
        ...clientOptions,
        ...(continueSession !== undefined ? { newSession: !continueSession } : {})
      },
      
      // Backwards compatibility fields (will be removed in future version)
      workingDirectory,
      continueSession,
      options: {
        newSession: !continueSession
      }
    })

    console.log('🔍 WebSocket Debug - executeCommand payload:', executeCommand)
    console.log('🔍 WebSocket Debug - continueSession param:', continueSession)
    
    this.socket.emit(SOCKET_EVENTS.EXECUTE_COMMAND, executeCommand)
    console.log(`⚡ Executed command: ${command} (session: ${actualSessionId}, continue: ${continueSession})`)
    
    return actualSessionId
  }

  clearSession(sessionId: string): void {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Not connected to server')
    }

    this.socket.emit('session:clear', { sessionId })
    console.log(`🗑️ Clearing session: ${sessionId}`)
  }

  getSessionStatus(sessionId: string): void {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Not connected to server')
    }

    this.socket.emit('session:status', { sessionId })
    console.log(`📊 Requesting session status: ${sessionId}`)
  }

  joinProject(projectId: string): void {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Not connected to server')
    }

    const joinProject: JoinProject = MessageFactory.createMessage('join_project', {
      projectId
    })

    this.socket.emit(SOCKET_EVENTS.JOIN_PROJECT, joinProject)
    console.log(`📁 Joined project: ${projectId}`)
  }

  leaveProject(projectId: string): void {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Not connected to server')
    }

    const leaveProject: LeaveProject = MessageFactory.createMessage('leave_project', {
      projectId
    })

    this.socket.emit(SOCKET_EVENTS.LEAVE_PROJECT, leaveProject)
    console.log(`📁 Left project: ${projectId}`)
  }

  emitPermissionResponse(response: PermissionResponse): void {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Not connected to server')
    }

    this.socket.emit('permission:response', response)
    console.log(`🔐 Sent permission response: ${response.requestId} -> ${response.decision}`)
  }

  onPermissionRequest(callback: (request: PermissionRequest) => void): () => void {
    this.on('permissionRequest', callback)
    return () => this.off('permissionRequest', callback)
  }

  onPermissionTimeout(callback: (data: { requestId: string, reason: string }) => void): () => void {
    this.on('permissionTimeout', callback)
    return () => this.off('permissionTimeout', callback)
  }

  onCommandResult(callback: (result: any) => void): () => void {
    this.on('commandResult', callback)
    return () => this.off('commandResult', callback)
  }

  // Event listener management
  on<K extends keyof WebSocketServiceEvents>(
    event: K, 
    listener: WebSocketServiceEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(listener)
    console.log(`👂 Registered listener for ${event} event (total: ${this.eventListeners.get(event)!.length})`)
  }

  off<K extends keyof WebSocketServiceEvents>(
    event: K, 
    listener: WebSocketServiceEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit<K extends keyof WebSocketServiceEvents>(
    event: K, 
    ...args: Parameters<WebSocketServiceEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event)
    console.log(`🔔 Emitting ${event} event to ${listeners?.length || 0} listeners`)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as Function)(...args)
        } catch (error) {
          console.error(`Error in ${event} listener:`, error)
        }
      })
    } else {
      console.warn(`⚠️ No listeners registered for ${event} event`)
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connectionState === CONNECTION_STATES.CONNECTED) {
        this.socket.emit(SOCKET_EVENTS.HEARTBEAT)
      }
    }, 30000) // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  disconnect(): void {
    console.log(`🔌 Disconnecting web client (clientId: ${this.clientId})...`)
    
    this.stopHeartbeat()
    
    if (this.socket) {
      console.log(`🔌 Disconnecting socket: ${this.socket.id}`)
      this.socket.removeAllListeners() // Remove all listeners
      this.socket.disconnect()
      this.socket = null
    }
    
    this.connectionState = CONNECTION_STATES.DISCONNECTED
    WebSocketService.isConnecting = false // Clear global flag
    this.eventListeners.clear()
  }

  // Status methods
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  isConnected(): boolean {
    return this.connectionState === CONNECTION_STATES.CONNECTED && this.socket?.connected === true
  }

  getStats() {
    return {
      connectionState: this.connectionState,
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      clientId: this.clientId,
      serverUrl: this.serverUrl
    }
  }
}

// Singleton instance for global use with connection state tracking
let webSocketServiceInstance: WebSocketService | null = null

// Create singleton instance
function createWebSocketServiceInstance(): WebSocketService {
  if (!webSocketServiceInstance) {
    console.log('🔌 Creating WebSocket service singleton instance')
    webSocketServiceInstance = new WebSocketService()
    
    // Store in window for debugging in development
    if (typeof window !== 'undefined') {
      // @ts-ignore - Development helper
      window.__webSocketService = webSocketServiceInstance
    }
  } else {
    console.log('🔌 Reusing existing WebSocket service singleton')
  }
  
  return webSocketServiceInstance
}

export const webSocketService = createWebSocketServiceInstance()