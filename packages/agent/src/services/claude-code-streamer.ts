import { ClaudeCodeExecutor } from './claude-code-executor.js'
import { ClaudeSessionManager } from './claude-session-manager.js'
import { PermissionManager } from './permission-manager.js'
import { ClaudeCodeOptions, ClaudeCodeExecuteResult } from '../types/index.js'

export class ClaudeCodeStreamer {
  constructor(
    private executor: ClaudeCodeExecutor,
    private sessionManager: ClaudeSessionManager,
    private permissionManager: PermissionManager
  ) {}

  async executeStreamWithContext(
    prompt: string,
    onChunk: (chunk: string) => void,
    sessionId: string,
    projectId: string,
    continueSession: boolean = true,
    options: ClaudeCodeOptions = {},
    claudeSessionId?: string,
    apiOptions: Record<string, unknown> = {}
  ): Promise<ClaudeCodeExecuteResult> {
    // Prepare working directory and session
    const workingDir = this.sessionManager.getWorkingDirectory(options)
    const { sessionFile } = this.sessionManager.prepareSession(sessionId, workingDir)
    
    // Handle session resumption logic
    const sessionOptions = this.sessionManager.handleSessionResumption(
      claudeSessionId,
      continueSession,
      sessionId,
      projectId
    )

    // Create permission handler
    const canUseTool = sessionId ? this.permissionManager.createCanUseTool(sessionId) : undefined
    
    // Use AsyncIterable format when using permissions (required for canUseTool)
    const promptInput = sessionId ? 
      this.executor.createAsyncIterablePromptWithWorkaround(prompt) : 
      prompt

    // Execute with streaming
    return this.executor.execute({
      prompt: promptInput,
      sessionId,
      continueSession,
      options,
      apiOptions: { ...sessionOptions, ...apiOptions },
      streaming: true,
      onChunk,
      projectId,
      claudeSessionId,
      workingDir,
      sessionFile,
      canUseTool
    })
  }

  async executeStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options: ClaudeCodeOptions = {},
    sessionId?: string
  ): Promise<ClaudeCodeExecuteResult> {
    // Prepare working directory and session
    const workingDir = this.sessionManager.getWorkingDirectory(options)
    const { sessionFile } = sessionId ? 
      this.sessionManager.prepareSession(sessionId, workingDir) : 
      { sessionFile: null }

    // Create permission handler if session provided
    const canUseTool = sessionId ? this.permissionManager.createCanUseTool(sessionId) : undefined
    
    // Use AsyncIterable format when using permissions
    const promptInput = sessionId ? 
      this.executor.createAsyncIterablePromptWithWorkaround(prompt) : 
      prompt

    // Execute with streaming
    return this.executor.execute({
      prompt: promptInput,
      sessionId,
      options,
      streaming: true,
      onChunk,
      workingDir,
      sessionFile,
      canUseTool
    })
  }
}