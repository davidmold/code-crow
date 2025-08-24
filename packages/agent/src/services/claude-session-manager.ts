import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'

interface SessionInfo {
  sessionId: string;
  projectId: string;
  prompt: string;
  result: unknown;
  timestamp: string;
}

export class ClaudeSessionManager {
  private readonly sessionsDir = '.claude-sessions'
  private sessionFiles = new Map<string, string>() // sessionId -> sessionFile path
  private lastProjectId: string | null = null

  constructor(private workingDirectory?: string) {
    this.initializeSessionsDirectory()
  }

  private initializeSessionsDirectory(): void {
    console.log(`🔍 Constructor Debug - sessionsDir: ${this.sessionsDir}`)
    console.log(`🔍 Constructor Debug - cwd: ${process.cwd()}`)
    console.log(`🔍 Constructor Debug - resolved path: ${path.resolve(this.sessionsDir)}`)
    console.log(`🔍 Constructor Debug - directory exists: ${fsSync.existsSync(this.sessionsDir)}`)
    
    if (!fsSync.existsSync(this.sessionsDir)) {
      try {
        fsSync.mkdirSync(this.sessionsDir, { recursive: true })
        console.log(`✅ Created sessions directory: ${this.sessionsDir}`)
      } catch (error) {
        console.error(`❌ Failed to create sessions directory: ${error}`)
      }
    } else {
      console.log(`📁 Sessions directory already exists: ${this.sessionsDir}`)
    }
  }

  prepareSession(sessionId: string, workingDir: string): { sessionFile: string | null, sessionsDir: string } {
    const sessionFile = sessionId ? path.join(workingDir, this.sessionsDir, `${sessionId}.json`) : null
    
    // Ensure sessions directory exists in the working directory (only if using sessions)
    if (sessionId) {
      const sessionsDir = path.join(workingDir, this.sessionsDir)
      if (!fsSync.existsSync(sessionsDir)) {
        try {
          fsSync.mkdirSync(sessionsDir, { recursive: true })
          console.log(`✅ Created sessions directory: ${sessionsDir}`)
        } catch (error) {
          console.error(`❌ Failed to create sessions directory: ${error}`)
        }
      }
      
      // Store session file path for this sessionId
      if (sessionFile) {
        this.sessionFiles.set(sessionId, sessionFile)
      }
    }
    
    return { sessionFile, sessionsDir: path.join(workingDir, this.sessionsDir) }
  }

  handleSessionResumption(
    claudeSessionId: string | undefined,
    continueSession: boolean,
    sessionId: string | undefined,
    projectId: string | undefined
  ): { resume?: string, continueSession?: boolean } {
    const options: { resume?: string, continueSession?: boolean } = {}

    if (claudeSessionId) {
      // Resume specific Claude session for this project
      options.resume = claudeSessionId
      console.log(`🔗 Resuming Claude session for project ${projectId}: ${claudeSessionId}`)
    } else if (continueSession && sessionId) {
      // Check if we should continue from the most recent session
      const isSameProject = !projectId || projectId === this.lastProjectId
      
      if (isSameProject) {
        // Continue from most recent session (same project)
        options.continueSession = true
        console.log(`🔗 Continuing session (same project ${projectId})`)
      } else {
        // New session (different project or explicitly new)
        console.log(`🆕 Starting new session for project ${projectId} (was: ${this.lastProjectId})`)
      }
    } else {
      // Explicitly new session or no session context
      console.log(`🆕 Starting new session${projectId ? ` for project ${projectId}` : ''}`)
    }

    // Store current project for next comparison
    if (projectId) {
      this.lastProjectId = projectId
    }

    return options
  }

  async clearSession(sessionId: string): Promise<void> {
    const sessionFile = this.sessionFiles.get(sessionId)
    if (sessionFile && fsSync.existsSync(sessionFile)) {
      await fs.unlink(sessionFile)
      console.log(`🗑️ Cleared session file: ${sessionFile}`)
    }
    this.sessionFiles.delete(sessionId)
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`)
    return fsSync.existsSync(sessionFile)
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    const sessionFile = this.sessionFiles.get(sessionId) || path.join(this.sessionsDir, `${sessionId}.json`)
    
    if (fsSync.existsSync(sessionFile)) {
      try {
        const content = await fs.readFile(sessionFile, 'utf8')
        return JSON.parse(content)
      } catch (error) {
        console.warn(`Could not read session file ${sessionFile}:`, error)
        return null
      }
    }
    return null
  }

  getWorkingDirectory(mergedOptions: { workingDirectory?: string }): string {
    return mergedOptions.workingDirectory || this.workingDirectory || process.cwd()
  }
}