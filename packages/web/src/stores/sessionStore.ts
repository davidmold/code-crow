import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { webSocketService } from '../services/websocket'

export const useSessionStore = defineStore('sessions', () => {
  const currentSessionId = ref<string | null>(null)
  const continueMode = ref(true)
  const sessionHistory = ref(new Map<string, any>())
  
  // Generate a session ID based on project
  const generateSessionId = (projectId: string): string => {
    return `${projectId}_session_${Date.now()}`
  }

  // Send command with session management
  const sendCommand = async (
    command: string, 
    projectId: string, 
    workingDirectory?: string,
    options: { newSession?: boolean } = {}
  ): Promise<string> => {
    // Generate new session ID if needed
    if (options.newSession || !currentSessionId.value) {
      currentSessionId.value = generateSessionId(projectId)
    }

    const payload = {
      projectId,
      command,
      workingDirectory,
      sessionId: currentSessionId.value!,
      continueSession: !options.newSession && continueMode.value
    }

    console.log('🔍 SessionStore Debug - payload:', payload)
    console.log('🔍 SessionStore Debug - continueMode:', continueMode.value)
    console.log('🔍 SessionStore Debug - options.newSession:', options.newSession)
    console.log('🔍 SessionStore Debug - calculated continueSession:', !options.newSession && continueMode.value)
    
    const sessionId = webSocketService.executeCommand(
      payload.projectId,
      payload.command,
      payload.workingDirectory,
      payload.sessionId,
      payload.continueSession
    )

    // Store command in history
    if (!sessionHistory.value.has(sessionId)) {
      sessionHistory.value.set(sessionId, {
        projectId,
        commands: []
      })
    }
    
    sessionHistory.value.get(sessionId)!.commands.push({
      command,
      timestamp: new Date(),
      continueSession: payload.continueSession
    })

    return sessionId
  }

  // Clear current session - this deletes the session file
  const clearCurrentSession = async (): Promise<void> => {
    if (currentSessionId.value) {
      webSocketService.clearSession(currentSessionId.value)
      sessionHistory.value.delete(currentSessionId.value)
      currentSessionId.value = null
    }
  }

  // Toggle continue mode
  const setContinueMode = (enabled: boolean): void => {
    continueMode.value = enabled
    if (!enabled) {
      currentSessionId.value = null // Force new session next time
    }
  }

  // Start a new session (clear current and generate new one on next command)
  const startNewSession = async (projectId?: string): Promise<void> => {
    await clearCurrentSession()
    if (projectId) {
      currentSessionId.value = generateSessionId(projectId)
    }
  }

  // Get session status
  const getSessionStatus = (sessionId: string): void => {
    webSocketService.getSessionStatus(sessionId)
  }

  // Computed values
  const hasActiveSession = computed(() => !!currentSessionId.value)
  const sessionDisplayName = computed(() => {
    if (!currentSessionId.value) return null
    const parts = currentSessionId.value.split('_')
    return parts[0] // Project name part
  })

  return {
    // State
    currentSessionId,
    continueMode,
    sessionHistory,
    
    // Computed
    hasActiveSession,
    sessionDisplayName,
    
    // Actions
    generateSessionId,
    sendCommand,
    clearCurrentSession,
    setContinueMode,
    startNewSession,
    getSessionStatus,
    
    // Session info helpers
    getSessionHistory: (sessionId: string) => sessionHistory.value.get(sessionId),
    getAllSessions: () => Array.from(sessionHistory.value.keys()),
    clearSessionHistory: () => sessionHistory.value.clear()
  }
})