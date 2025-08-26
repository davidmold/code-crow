import { ClaudeCodeOptions, ClaudeCodeExecuteResult } from '../types/index.js'
import { PermissionResponse } from '@code-crow/shared'
import { EventEmitter } from 'events'
import { PermissionManager } from './permission-manager.js'
import { ClaudeSessionManager } from './claude-session-manager.js'
import { ClaudeCodeExecutor } from './claude-code-executor.js'
import { ClaudeCodeStreamer } from './claude-code-streamer.js'

export class ClaudeCodeService extends EventEmitter {
  private initialized = false
  private defaultOptions: ClaudeCodeOptions = {
    streamOutput: true,
    timeout: 300000 // 5 minutes
  }

  private permissionManager: PermissionManager
  private sessionManager: ClaudeSessionManager
  private executor: ClaudeCodeExecutor
  private streamer: ClaudeCodeStreamer

  constructor(workingDirectory?: string) {
    super()
    
    // Initialize components
    this.permissionManager = new PermissionManager()
    this.sessionManager = new ClaudeSessionManager(workingDirectory)
    this.executor = new ClaudeCodeExecutor()
    this.streamer = new ClaudeCodeStreamer(this.executor, this.sessionManager, this.permissionManager)

    // Forward permission events from permission manager
    this.permissionManager.on('permission:request', (request) => {
      this.emit('permission:request', request)
    })
    
    this.permissionManager.on('permission:timeout', (data) => {
      this.emit('permission:timeout', data)
    })
  }

  async initialize(): Promise<void> {
    try {
      // Claude Code SDK uses the system's authenticated session
      // No explicit initialization needed, just mark as ready
      this.initialized = true
      console.log('✅ Claude Code SDK ready to use')
    } catch (error) {
      console.error('❌ Failed to initialize Claude Code SDK:', error)
      throw new Error(`Claude Code initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async executeWithContext(
    prompt: string, 
    sessionId: string,
    projectId: string,
    continueSession: boolean = true,
    options: ClaudeCodeOptions = {},
    apiOptions: Record<string, unknown> = {}
  ): Promise<ClaudeCodeExecuteResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const mergedOptions = { ...this.defaultOptions, ...options }
    const workingDir = this.sessionManager.getWorkingDirectory(mergedOptions)
    const { sessionFile } = this.sessionManager.prepareSession(sessionId, workingDir)
    
    // Handle session resumption
    const sessionOptions = this.sessionManager.handleSessionResumption(
      undefined, // No specific claudeSessionId
      continueSession,
      sessionId,
      projectId
    )

    // Create permission handler
    const canUseTool = sessionId ? this.permissionManager.createCanUseTool(sessionId) : undefined
    
    // Use AsyncIterable format when using permissions
    const promptInput = sessionId ? 
      this.executor.createAsyncIterablePromptWithWorkaround(prompt) : 
      prompt

    // Execute without streaming
    return this.executor.execute({
      prompt: promptInput,
      sessionId,
      continueSession,
      options: mergedOptions,
      apiOptions: { ...sessionOptions, ...apiOptions },
      streaming: false,
      projectId,
      workingDir,
      sessionFile,
      canUseTool
    })
  }

  async execute(
    prompt: string, 
    options: ClaudeCodeOptions = {},
    sessionId?: string
  ): Promise<ClaudeCodeExecuteResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const mergedOptions = { ...this.defaultOptions, ...options }
    const workingDir = this.sessionManager.getWorkingDirectory(mergedOptions)
    const { sessionFile } = sessionId ? 
      this.sessionManager.prepareSession(sessionId, workingDir) : 
      { sessionFile: null }

    // Create permission handler if session provided
    const canUseTool = sessionId ? this.permissionManager.createCanUseTool(sessionId) : undefined
    
    // Use AsyncIterable format when using permissions
    const promptInput = sessionId ? 
      this.executor.createAsyncIterablePromptWithWorkaround(prompt) : 
      prompt

    // Execute without streaming
    return this.executor.execute({
      prompt: promptInput,
      sessionId,
      options: mergedOptions,
      streaming: false,
      workingDir,
      sessionFile,
      canUseTool
    })
  }

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
    if (!this.initialized) {
      await this.initialize()
    }

    const mergedOptions = { ...this.defaultOptions, ...options }
    
    return this.streamer.executeStreamWithContext(
      prompt,
      onChunk,
      sessionId,
      projectId,
      continueSession,
      mergedOptions,
      claudeSessionId,
      apiOptions
    )
  }

  async executeStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options: ClaudeCodeOptions = {},
    sessionId?: string
  ): Promise<ClaudeCodeExecuteResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const mergedOptions = { ...this.defaultOptions, ...options }
    
    return this.streamer.executeStream(
      prompt,
      onChunk,
      mergedOptions,
      sessionId
    )
  }

  // Permission handling methods
  handlePermissionResponse(response: PermissionResponse): void {
    this.permissionManager.handlePermissionResponse(response)
  }

  // Session management methods
  async clearSession(sessionId: string): Promise<void> {
    return this.sessionManager.clearSession(sessionId)
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    return this.sessionManager.sessionExists(sessionId)
  }

  async getSessionInfo(sessionId: string): Promise<unknown> {
    return this.sessionManager.getSessionInfo(sessionId)
  }

  getWorkingDirectory(): string {
    return this.sessionManager.getWorkingDirectory({})
  }
}