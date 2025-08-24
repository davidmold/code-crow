import { 
  SOCKET_EVENTS,
  MessageFactory,
  ExecuteCommand,
  JoinProject,
  LeaveProject,
  CommandResult,
  ConnectionStatus,
  ProjectUpdate,
  FileChange,
  ErrorMessage,
  PermissionRequest,
  PermissionResponse,
  ClaudeCodeApiOptions,
  WebClientOptions,
  BaseWebSocketClient
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
  sessionStatus: (data: { sessionId: string, exists: boolean, info: Record<string, unknown> }) => void
  sessionError: (data: { sessionId: string, error: string }) => void
}

export class WebSocketService extends BaseWebSocketClient {
  private eventListeners = new Map<keyof WebSocketServiceEvents, Function[]>()
  private static isConnecting = false // Global flag to prevent multiple connections
  
  constructor(
    serverUrl: string = import.meta.env.VITE_WS_URL || 'http://localhost:8080',
    clientId: string = `web-${Date.now()}`
  ) {
    super('web', {
      serverUrl,
      clientId,
      timeout: 15000,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      heartbeatInterval: 30000
    })
    console.log(`🏗️ WebSocketService constructor called - clientId: ${this.clientId}`)
    // Add to window for debugging
    if (typeof window !== 'undefined') {
      // @ts-expect-error - Adding debug property to window for development
      window.__wsDebug = { clientId: this.clientId, instance: this }
    }
  }

  async connect(): Promise<boolean> {
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

    // Set global connecting flag
    WebSocketService.isConnecting = true
    
    try {
      const result = await super.connect()
      WebSocketService.isConnecting = false
      return result
    } catch (error) {
      WebSocketService.isConnecting = false
      throw error
    }
  }

  protected setupEventHandlers() {
    if (!this.socket) return

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

    this.socket.on('session:status', (data: { sessionId: string, exists: boolean, info: Record<string, unknown> }) => {
      console.log(`📊 Session status: ${data.sessionId} (exists: ${data.exists})`)
      this.emit('sessionStatus', data)
    })

    this.socket.on('session:error', (data: { sessionId: string, error: string }) => {
      console.log(`❌ Session error: ${data.sessionId} - ${data.error}`)
      this.emit('sessionError', data)
    })
  }

  protected onAuthenticated(): void {
    // Emit connected event after a small delay to ensure state is fully updated
    setTimeout(() => {
      console.log('🔔 Emitting connected event to listeners')
      this.emit('connected')
    }, 100)
  }

  protected onDisconnected(reason: string): void {
    WebSocketService.isConnecting = false
    this.emit('disconnected', reason)
  }

  protected onError(error: ErrorMessage): void {
    this.emit('error', error)
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

  onCommandResult(callback: (result: CommandResult) => void): () => void {
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

  disconnect(): void {
    super.disconnect()
    this.eventListeners.clear()
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
      // @ts-expect-error - Development helper for debugging
      window.__webSocketService = webSocketServiceInstance
    }
  } else {
    console.log('🔌 Reusing existing WebSocket service singleton')
  }
  
  return webSocketServiceInstance
}

export const webSocketService = createWebSocketServiceInstance()