import { ref, onMounted, onUnmounted } from 'vue'
import { webSocketService } from '../services/websocket'
import { useConnectionStore } from '../stores/connectionStore'
import type { CommandResult, FileChange, ProjectUpdate } from '@code-crow/shared'

export function useWebSocket() {
  console.log('🔗 useWebSocket() called')
  const connectionStore = useConnectionStore()
  
  // Ensure connection store is initialized (but connection is managed globally by Layout)
  onMounted(async () => {
    console.log('🔗 useWebSocket onMounted - ensuring connection store is initialized')
    console.log('🔗 connectionStore state:', connectionStore.isConnected, connectionStore.isConnecting)
    
    // Only initialize if not already done (Layout should handle this)
    if (!connectionStore.isInitialized) {
      console.log('🔗 useWebSocket initializing connection store')
      await connectionStore.initialize()
    }
    
    // Connection itself is handled globally by Layout component
    // This ensures we don't have multiple connection attempts
    console.log('🔗 useWebSocket ready - connection managed globally')
  })

  // Cleanup on unmount
  onUnmounted(() => {
    // Don't disconnect here as other components might be using it
    // The connection will be managed globally
  })

  return {
    // Connection state
    connectionState: connectionStore.connectionState,
    isConnected: connectionStore.isConnected,
    isConnecting: connectionStore.isConnecting,
    hasError: connectionStore.hasError,
    statusText: connectionStore.statusText,
    statusColor: connectionStore.statusColor,
    agentConnected: connectionStore.agentConnected,
    activeAgents: connectionStore.activeAgents,
    serverStatus: connectionStore.serverStatus,
    lastError: connectionStore.lastError,

    // Actions
    connect: connectionStore.connect,
    disconnect: connectionStore.disconnect,
    retry: connectionStore.retry,
    clearError: connectionStore.clearError,

    // WebSocket service methods
    executeCommand: webSocketService.executeCommand.bind(webSocketService),
    joinProject: webSocketService.joinProject.bind(webSocketService),
    leaveProject: webSocketService.leaveProject.bind(webSocketService),
    
    // Event subscription helpers
    onCommandResult: (callback: (result: CommandResult) => void) => {
      webSocketService.on('commandResult', callback)
      return () => webSocketService.off('commandResult', callback)
    },
    
    onFileChange: (callback: (change: FileChange) => void) => {
      webSocketService.on('fileChange', callback)
      return () => webSocketService.off('fileChange', callback)
    },
    
    onProjectUpdate: (callback: (update: ProjectUpdate) => void) => {
      webSocketService.on('projectUpdate', callback)
      return () => webSocketService.off('projectUpdate', callback)
    }
  }
}

// Specialized composable for command execution
export function useCommandExecution() {
  const { executeCommand, onCommandResult } = useWebSocket()
  
  const activeSessions = ref(new Map<string, {
    command: string
    projectId: string
    startTime: Date
    status: 'running' | 'complete' | 'error'
    response?: string
    error?: string
  }>())

  const executeCommandWithTracking = (
    projectId: string, 
    command: string, 
    workingDirectory?: string,
    sessionId?: string,
    continueSession: boolean = true
  ) => {
    // Check the actual WebSocket service connection state
    if (!webSocketService.isConnected()) {
      throw new Error('Not connected to server')
    }

    const actualSessionId = executeCommand(projectId, command, workingDirectory, sessionId, continueSession)
    
    // Track the session
    activeSessions.value.set(actualSessionId, {
      command,
      projectId,
      startTime: new Date(),
      status: 'running'
    })

    return actualSessionId
  }

  // Set up command result handler
  const unsubscribe = onCommandResult((result: CommandResult) => {
    const session = activeSessions.value.get(result.sessionId)
    if (session) {
      session.status = result.status === 'complete' ? 'complete' : 
                     result.status === 'error' ? 'error' : 'running'
      
      if (result.status === 'complete' || result.status === 'error') {
        session.response = result.response
        if (result.status === 'error') {
          session.error = result.response
        }
      }
    }
  })

  onUnmounted(() => {
    unsubscribe()
  })

  // Session management helpers
  const clearSession = (sessionId: string) => {
    webSocketService.clearSession(sessionId)
    activeSessions.value.delete(sessionId)
  }

  const getSessionStatus = (sessionId: string) => {
    webSocketService.getSessionStatus(sessionId)
  }

  return {
    activeSessions,
    executeCommand: executeCommandWithTracking,
    getSession: (sessionId: string) => activeSessions.value.get(sessionId),
    clearSession,
    clearAllSessions: () => activeSessions.value.clear(),
    getSessionStatus,
    // Session event listeners
    onSessionCleared: (callback: (data: { sessionId: string }) => void) => {
      webSocketService.on('sessionCleared', callback)
      return () => webSocketService.off('sessionCleared', callback)
    },
    onSessionStatus: (callback: (data: { sessionId: string, exists: boolean, info: Record<string, unknown> }) => void) => {
      webSocketService.on('sessionStatus', callback)
      return () => webSocketService.off('sessionStatus', callback)
    },
    onSessionError: (callback: (data: { sessionId: string, error: string }) => void) => {
      webSocketService.on('sessionError', callback)
      return () => webSocketService.off('sessionError', callback)
    }
  }
}

// Specialized composable for project management
export function useProjectWebSocket(projectId: string) {
  const { joinProject, leaveProject, onFileChange, onProjectUpdate } = useWebSocket()
  
  const fileChanges = ref<FileChange[]>([])
  const projectUpdates = ref<ProjectUpdate[]>([])

  // Join project on mount
  onMounted(() => {
    if (projectId) {
      joinProject(projectId)
    }
  })

  // Leave project on unmount
  onUnmounted(() => {
    if (projectId) {
      leaveProject(projectId)
    }
  })

  // Set up project-specific event handlers
  const unsubscribeFileChange = onFileChange((change: FileChange) => {
    // Only track changes for this project (determined by session)
    fileChanges.value.unshift(change)
    // Keep only last 100 changes
    if (fileChanges.value.length > 100) {
      fileChanges.value = fileChanges.value.slice(0, 100)
    }
  })

  const unsubscribeProjectUpdate = onProjectUpdate((update: ProjectUpdate) => {
    if (update.projectId === projectId) {
      projectUpdates.value.unshift(update)
      // Keep only last 10 updates
      if (projectUpdates.value.length > 10) {
        projectUpdates.value = projectUpdates.value.slice(0, 10)
      }
    }
  })

  onUnmounted(() => {
    unsubscribeFileChange()
    unsubscribeProjectUpdate()
  })

  return {
    fileChanges,
    projectUpdates,
    clearFileChanges: () => fileChanges.value = [],
    clearProjectUpdates: () => projectUpdates.value = []
  }
}