import { 
  Session, 
  SessionCommand,
  SessionResponse,
  SessionStats,
  SessionFilter,
  SessionSummary,
  CreateSessionRequest,
  CreateSessionResponse,
  UpdateSessionRequest,
  SessionCleanupConfig,
  SessionEvent,
  SessionMetrics
} from '@code-crow/shared'

export class SessionManager {
  private static instance: SessionManager
  private sessions = new Map<string, Session>()
  private sessionHistory: SessionSummary[] = []
  private cleanupConfig: SessionCleanupConfig
  private cleanupInterval: NodeJS.Timeout | null = null
  private eventListeners: Array<(event: SessionEvent) => void> = []

  constructor(cleanupConfig?: Partial<SessionCleanupConfig>) {
    this.cleanupConfig = {
      maxAge: 3600000, // 1 hour
      maxSessions: 1000,
      cleanupInterval: 300000, // 5 minutes
      keepCompletedSessions: 100,
      keepErrorSessions: 50,
      ...cleanupConfig
    }

    this.startCleanup()
  }

  static getInstance(cleanupConfig?: Partial<SessionCleanupConfig>): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(cleanupConfig)
    }
    return SessionManager.instance
  }

  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    try {
      const sessionId = request.sessionId || this.generateSessionId()
      const now = new Date().toISOString()

      const session: Session = {
        id: sessionId,
        projectId: request.projectId,
        status: 'running',
        startTime: now,
        commands: [],
        responses: [],
        ...(request.clientId ? { clientId: request.clientId } : {}),
        metadata: {
          ...(request.initialCommand ? { initialCommand: request.initialCommand } : {}),
          ...(request.workingDirectory ? { workingDirectory: request.workingDirectory } : {})
        }
      }

      this.sessions.set(sessionId, session)

      // Emit event
      this.emitEvent({
        type: 'created',
        sessionId,
        projectId: request.projectId,
        timestamp: now
      })

      console.log(`📋 Created session: ${sessionId} for project: ${request.projectId}`)

      return {
        success: true,
        session
      }

    } catch (error) {
      console.error('❌ Failed to create session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
  }

  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'running')
  }

  getSessionsByProject(projectId: string): Session[] {
    return Array.from(this.sessions.values()).filter(s => s.projectId === projectId)
  }

  getSessionsByClient(clientId: string): Session[] {
    return Array.from(this.sessions.values()).filter(s => s.clientId === clientId)
  }

  async updateSession(request: UpdateSessionRequest): Promise<boolean> {
    try {
      const session = this.sessions.get(request.sessionId)
      if (!session) {
        return false
      }

      const oldStatus = session.status

      // Update session
      Object.assign(session, request.updates)

      // Calculate duration if session is completed
      if (session.status !== 'running' && session.status !== oldStatus && !session.endTime) {
        session.endTime = new Date().toISOString()
        session.duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
      }

      // Move to history if completed
      if (session.status !== 'running' && oldStatus === 'running') {
        this.moveToHistory(session)
        
        // Emit completion event
        this.emitEvent({
          type: session.status as SessionEvent['type'],
          sessionId: session.id,
          projectId: session.projectId,
          timestamp: new Date().toISOString(),
          data: { duration: session.duration }
        })
      }

      console.log(`📋 Updated session: ${request.sessionId} status: ${session.status}`)
      return true

    } catch (error) {
      console.error('❌ Failed to update session:', error)
      return false
    }
  }

  addCommand(sessionId: string, command: SessionCommand): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    session.commands.push(command)
    console.log(`📋 Added command to session: ${sessionId}`)
    return true
  }

  addResponse(sessionId: string, response: SessionResponse): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    session.responses.push(response)
    return true
  }

  async completeSession(sessionId: string, success: boolean, _error?: string): Promise<boolean> {
    const session = this.getSession(sessionId);
    const updates: Partial<Pick<Session, 'status' | 'endTime' | 'metadata'>> = {
      status: success ? 'complete' : 'error',
      endTime: new Date().toISOString()
    };
    
    if (session?.metadata !== undefined) {
      updates.metadata = session.metadata;
    }
    
    return this.updateSession({
      sessionId,
      updates
    })
  }

  async cancelSession(sessionId: string, reason?: string): Promise<boolean> {
    const session = this.getSession(sessionId);
    const updates: Partial<Pick<Session, 'status' | 'endTime' | 'metadata'>> = {
      status: 'cancelled',
      endTime: new Date().toISOString()
    };
    
    if (reason) {
      updates.metadata = { ...session?.metadata, cancelReason: reason } as any;
    } else if (session?.metadata !== undefined) {
      updates.metadata = session.metadata;
    }
    
    return this.updateSession({
      sessionId,
      updates
    })
  }

  removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    // Move to history before deleting if not already there
    if (!this.sessionHistory.find(s => s.id === sessionId)) {
      this.moveToHistory(session)
    }

    this.sessions.delete(sessionId)
    console.log(`📋 Removed session: ${sessionId}`)
    return true
  }

  private moveToHistory(session: Session): void {
    const summary: SessionSummary = {
      id: session.id,
      projectId: session.projectId,
      status: session.status,
      startTime: session.startTime,
      ...(session.endTime ? { endTime: session.endTime } : {}),
      ...(session.duration ? { duration: session.duration } : {}),
      commandCount: session.commands.length,
      responseCount: session.responses.length,
      ...(session.commands.length > 0 && session.commands[session.commands.length - 1] ? { lastCommand: session.commands[session.commands.length - 1].command } : {})
    }

    this.sessionHistory.unshift(summary)

    // Limit history size
    const maxHistory = this.cleanupConfig.keepCompletedSessions + this.cleanupConfig.keepErrorSessions
    if (this.sessionHistory.length > maxHistory) {
      this.sessionHistory = this.sessionHistory.slice(0, maxHistory)
    }
  }

  getSessionHistory(filter?: SessionFilter): SessionSummary[] {
    let history = [...this.sessionHistory]

    if (filter) {
      if (filter.projectId) {
        history = history.filter(s => s.projectId === filter.projectId)
      }
      if (filter.status) {
        history = history.filter(s => s.status === filter.status)
      }
      if (filter.startDate) {
        history = history.filter(s => s.startTime >= filter.startDate!)
      }
      if (filter.endDate) {
        history = history.filter(s => s.endTime && s.endTime <= filter.endDate!)
      }
      if (filter.offset) {
        history = history.slice(filter.offset)
      }
      if (filter.limit) {
        history = history.slice(0, filter.limit)
      }
    }

    return history
  }

  getSessionStats(): SessionStats {
    const allSessions = [...this.sessions.values(), ...this.sessionHistory]
    const total = allSessions.length
    const active = this.sessions.size
    const completed = allSessions.filter(s => s.status === 'complete').length
    const errors = allSessions.filter(s => s.status === 'error').length
    
    const completedSessions = allSessions.filter(s => s.duration !== undefined)
    const avgDuration = completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0

    const totalCommands = allSessions.reduce((sum, s) => {
      return sum + ('commands' in s ? s.commands.length : s.commandCount || 0)
    }, 0)

    const successRate = total > 0 ? (completed / total) * 100 : 0

    return {
      totalSessions: total,
      activeSessions: active,
      completedSessions: completed,
      errorSessions: errors,
      averageDuration: avgDuration,
      totalCommands,
      successRate
    }
  }

  getSessionMetrics(sessionId: string): SessionMetrics | null {
    const session = this.sessions.get(sessionId) || 
                   this.sessionHistory.find(s => s.id === sessionId)
    
    if (!session) return null

    const metrics: SessionMetrics = {
      sessionId: session.id,
      startTime: session.startTime,
      ...(session.endTime ? { endTime: session.endTime } : {}),
      ...(session.duration ? { duration: session.duration } : {}),
      commandCount: 'commands' in session ? session.commands.length : session.commandCount || 0,
      responseCount: 'responses' in session ? session.responses.length : session.responseCount || 0,
      bytesTransferred: 0, // TODO: Calculate from responses
      fileChanges: 0, // TODO: Count file change responses
      errors: 0 // TODO: Count error responses
    }

    if ('responses' in session) {
      metrics.bytesTransferred = session.responses.reduce((sum, r) => sum + r.content.length, 0)
      metrics.fileChanges = session.responses.filter(r => r.type === 'file_change').length
      metrics.errors = session.responses.filter(r => r.type === 'error').length
    }

    return metrics
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.cleanupConfig.cleanupInterval)
  }

  private cleanup(): void {
    const now = Date.now()
    const maxAge = this.cleanupConfig.maxAge
    const maxSessions = this.cleanupConfig.maxSessions

    let cleanedCount = 0

    // Remove old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - new Date(session.startTime).getTime()
      
      if (sessionAge > maxAge && session.status !== 'running') {
        this.removeSession(sessionId)
        cleanedCount++
      }
    }

    // Limit total session count
    if (this.sessions.size > maxSessions) {
      const sessionsToRemove = Array.from(this.sessions.entries())
        .filter(([_, session]) => session.status !== 'running')
        .sort(([_, a], [__, b]) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, this.sessions.size - maxSessions)

      for (const [sessionId] of sessionsToRemove) {
        this.removeSession(sessionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} sessions`)
      this.emitEvent({
        type: 'cleanup',
        sessionId: '',
        projectId: '',
        timestamp: new Date().toISOString(),
        data: { cleanedCount }
      })
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private emitEvent(event: SessionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in session event listener:', error)
      }
    })
  }

  addEventListener(listener: (event: SessionEvent) => void): () => void {
    this.eventListeners.push(listener)
    return () => {
      const index = this.eventListeners.indexOf(listener)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.eventListeners = []
    console.log('📋 Session manager stopped')
  }

  // Debug methods
  getDebugInfo() {
    return {
      activeSessions: this.sessions.size,
      historyLength: this.sessionHistory.length,
      cleanupConfig: this.cleanupConfig,
      stats: this.getSessionStats()
    }
  }
}