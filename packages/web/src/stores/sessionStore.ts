import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { webSocketService } from '../services/websocket'
import type { ClaudeCodeApiOptions, WebClientOptions } from '@code-crow/shared'

interface CommandHistoryItem {
  command: string
  timestamp: Date
  continueSession?: boolean
  apiOptions?: ClaudeCodeApiOptions
  clientOptions?: WebClientOptions
}

interface SessionHistoryData {
  projectId: string
  commands: CommandHistoryItem[]
}

interface CommandResult {
  claudeSessionId?: string
  status: string
  sessionId: string
  [key: string]: unknown
}

export const useSessionStore = defineStore('sessions', () => {
  const currentProjectId = ref<string | null>(null)
  const projectSessions = ref(new Map<string, string>()) // projectId -> sessionId
  const continueMode = ref(true)
  const planMode = ref(false) // Plan mode toggle for easier access
  const sessionHistory = ref(new Map<string, SessionHistoryData>())
  const claudeSessionIds = ref(new Map<string, string>()) // projectId -> Claude session ID
  
  
  // Generate a session ID based on project
  const generateSessionId = (projectId: string): string => {
    return `${projectId}_session_${Date.now()}`
  }

  // Switch to a project (resume its session if it exists)
  const switchToProject = (projectId: string): void => {
    currentProjectId.value = projectId
  }

  // Get current session ID for the active project
  const getCurrentSessionId = (): string | null => {
    if (!currentProjectId.value) return null
    return projectSessions.value.get(currentProjectId.value) || null
  }

  // Send command with per-project session management
  const sendCommand = async (
    command: string, 
    projectId: string, 
    workingDirectory?: string,
    options: { newSession?: boolean } = {}
  ): Promise<string> => {
    // Ensure options is always an object to avoid undefined issues
    options = options || {}
    
    // Switch to this project if not already active
    if (currentProjectId.value !== projectId) {
      switchToProject(projectId)
    }

    // Get existing session for this project
    let sessionId = projectSessions.value.get(projectId)
    
    console.log('🔍 SessionStore Debug - projectSessions Map:', Array.from(projectSessions.value.entries()))
    console.log('🔍 SessionStore Debug - looking for projectId:', projectId)
    console.log('🔍 SessionStore Debug - found existing sessionId:', sessionId)
    console.log('🔍 SessionStore Debug - options.newSession:', options.newSession)
    console.log('🔍 SessionStore Debug - !sessionId:', !sessionId)
    console.log('🔍 SessionStore Debug - should create new session:', options.newSession || !sessionId)
    
    // Generate new session ID if needed
    if (options.newSession || !sessionId) {
      sessionId = generateSessionId(projectId)
      projectSessions.value.set(projectId, sessionId)
      console.log('🔍 SessionStore Debug - generated NEW sessionId:', sessionId)
      console.log('🔍 SessionStore Debug - updated projectSessions Map:', Array.from(projectSessions.value.entries()))
    } else {
      console.log('🔍 SessionStore Debug - reusing EXISTING sessionId:', sessionId)
    }

    const payload = {
      projectId,
      command,
      workingDirectory,
      sessionId: sessionId,
      continueSession: !options.newSession && continueMode.value
    }

    console.log('🔍 SessionStore Debug - payload:', payload)
    console.log('🔍 SessionStore Debug - continueMode.value:', continueMode.value)
    console.log('🔍 SessionStore Debug - options:', options)
    console.log('🔍 SessionStore Debug - options.newSession:', options.newSession)
    console.log('🔍 SessionStore Debug - !options.newSession:', !options.newSession)
    console.log('🔍 SessionStore Debug - calculated continueSession:', !options.newSession && continueMode.value)
    
    // Determine if we should resume a different project's session
    const isProjectSwitch = currentProjectId.value !== projectId
    const previousClaudeSessionId = isProjectSwitch ? claudeSessionIds.value.get(projectId) : undefined
    
    console.log('🔍 SessionStore Debug - isProjectSwitch:', isProjectSwitch)
    console.log('🔍 SessionStore Debug - previousClaudeSessionId:', previousClaudeSessionId)
    console.log('🔍 SessionStore Debug - will resume Claude session:', !!previousClaudeSessionId)
    
    const executedSessionId = webSocketService.executeCommand(
      payload.projectId,
      payload.command,
      {
        ...(payload.workingDirectory ? { workingDirectory: payload.workingDirectory } : {}),
        continueSession: payload.continueSession,
        ...(previousClaudeSessionId ? { resume: previousClaudeSessionId } : {}),
        ...(planMode.value ? { permissionMode: 'plan' } : {})
      },
      undefined, // clientOptions
      payload.sessionId
    )

    // Store command in history
    if (!sessionHistory.value.has(executedSessionId)) {
      sessionHistory.value.set(executedSessionId, {
        projectId,
        commands: []
      })
    }
    
    sessionHistory.value.get(executedSessionId)!.commands.push({
      command,
      timestamp: new Date(),
      continueSession: payload.continueSession
    })

    return executedSessionId
  }

  // Enhanced sendCommand method with full Claude Code API options support
  const sendCommandWithOptions = async (
    command: string,
    projectId: string,
    apiOptions?: ClaudeCodeApiOptions,
    clientOptions?: WebClientOptions
  ): Promise<string> => {
    // Switch to this project if not already active
    if (currentProjectId.value !== projectId) {
      switchToProject(projectId)
    }

    // Get existing session for this project
    let sessionId = projectSessions.value.get(projectId)
    
    // Generate new session ID if needed
    if (clientOptions?.newSession || !sessionId) {
      sessionId = generateSessionId(projectId)
      projectSessions.value.set(projectId, sessionId)
    }

    // Determine if we should resume a different project's session
    const isProjectSwitch = currentProjectId.value !== projectId
    const previousClaudeSessionId = isProjectSwitch ? claudeSessionIds.value.get(projectId) : undefined

    console.log('🔍 SessionStore Debug - Enhanced sendCommand')
    console.log('🔍 SessionStore Debug - apiOptions:', apiOptions)
    console.log('🔍 SessionStore Debug - clientOptions:', clientOptions)
    console.log('🔍 SessionStore Debug - will resume Claude session:', !!previousClaudeSessionId)

    const actualSessionId = webSocketService.executeCommand(
      projectId,
      command,
      {
        ...apiOptions,
        // Resume the project's specific session if switching projects
        ...(previousClaudeSessionId ? { resume: previousClaudeSessionId } : {}),
        // Add plan mode if enabled
        ...(planMode.value ? { permissionMode: 'plan' } : {})
      },
      clientOptions,
      sessionId
    )

    // Store command in history
    if (!sessionHistory.value.has(actualSessionId)) {
      sessionHistory.value.set(actualSessionId, {
        projectId,
        commands: []
      })
    }
    
    sessionHistory.value.get(actualSessionId)!.commands.push({
      command,
      timestamp: new Date(),
      apiOptions,
      clientOptions
    })

    return actualSessionId
  }

  // Clear current project session - this deletes the session file
  const clearCurrentSession = async (): Promise<void> => {
    const sessionId = getCurrentSessionId()
    if (sessionId && currentProjectId.value) {
      webSocketService.clearSession(sessionId)
      sessionHistory.value.delete(sessionId)
      projectSessions.value.delete(currentProjectId.value)
    }
  }

  // Clear specific project session
  const clearProjectSession = async (projectId: string): Promise<void> => {
    const sessionId = projectSessions.value.get(projectId)
    if (sessionId) {
      webSocketService.clearSession(sessionId)
      sessionHistory.value.delete(sessionId)
      projectSessions.value.delete(projectId)
    }
  }

  // Toggle continue mode
  const setContinueMode = (enabled: boolean): void => {
    continueMode.value = enabled
    if (!enabled) {
      // Clear all project sessions to force new sessions
      projectSessions.value.clear()
    }
  }

  // Toggle plan mode
  const setPlanMode = (enabled: boolean): void => {
    planMode.value = enabled
  }

  // Start a new session for a project (clear current and generate new one on next command)
  const startNewSession = async (projectId?: string): Promise<void> => {
    if (projectId) {
      await clearProjectSession(projectId)
      if (currentProjectId.value === projectId) {
        // Generate new session immediately if this is the active project
        const newSessionId = generateSessionId(projectId)
        projectSessions.value.set(projectId, newSessionId)
      }
    } else {
      await clearCurrentSession()
    }
  }

  // Get session status
  const getSessionStatus = (sessionId: string): void => {
    webSocketService.getSessionStatus(sessionId)
  }

  // Handle command result and extract Claude session ID
  const handleCommandResult = (result: CommandResult): void => {
    if (result.claudeSessionId && result.status === 'complete') {
      // Find the project ID for this session
      const sessionId = result.sessionId
      const sessionData = sessionHistory.value.get(sessionId)
      if (sessionData?.projectId) {
        console.log(`📝 Storing Claude session ID for project ${sessionData.projectId}: ${result.claudeSessionId}`)
        claudeSessionIds.value.set(sessionData.projectId, result.claudeSessionId)
        console.log(`🔍 Updated Claude session IDs:`, Array.from(claudeSessionIds.value.entries()))
      }
    }
  }

  // Get Claude session ID for a project
  const getClaudeSessionId = (projectId: string): string | undefined => {
    return claudeSessionIds.value.get(projectId)
  }

  // Set up WebSocket listener for command results
  webSocketService.onCommandResult(handleCommandResult)
  console.log('🔗 Set up WebSocket command result listener in session store')

  // Computed values
  const hasActiveSession = computed(() => !!getCurrentSessionId())
  const sessionDisplayName = computed(() => {
    const sessionId = getCurrentSessionId()
    if (!sessionId) return null
    const parts = sessionId.split('_')
    return parts[0] // Project name part
  })
  const currentSessionId = computed(() => getCurrentSessionId())

  return {
    // State
    currentSessionId,
    currentProjectId,
    continueMode,
    planMode,
    sessionHistory,
    projectSessions,
    
    // Computed
    hasActiveSession,
    sessionDisplayName,
    
    // Actions
    generateSessionId,
    switchToProject,
    getCurrentSessionId,
    sendCommand,
    sendCommandWithOptions, // Enhanced method with full Claude Code API options support
    clearCurrentSession,
    clearProjectSession,
    setContinueMode,
    setPlanMode,
    startNewSession,
    getSessionStatus,
    handleCommandResult,
    getClaudeSessionId,
    
    // Session info helpers
    getSessionHistory: (sessionId: string) => sessionHistory.value.get(sessionId),
    getAllSessions: () => Array.from(sessionHistory.value.keys()),
    getProjectSession: (projectId: string) => projectSessions.value.get(projectId),
    getAllProjectSessions: () => Array.from(projectSessions.value.entries()),
    clearSessionHistory: () => sessionHistory.value.clear(),
    
    // Claude session ID management
    getAllClaudeSessionIds: () => Array.from(claudeSessionIds.value.entries())
  }
})