import { query } from '@anthropic-ai/claude-code'
import type { CanUseTool, PermissionResult } from '@anthropic-ai/claude-code'
import { ClaudeCodeOptions, ClaudeCodeExecuteResult } from '../types/index.js'
import { PermissionRequest, PermissionResponse } from '@code-crow/shared'
import { EventEmitter } from 'events'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'

export class ClaudeCodeService extends EventEmitter {
  private initialized = false
  private defaultOptions: ClaudeCodeOptions = {
    streamOutput: true,
    timeout: 300000 // 5 minutes
  }
  private pendingPermissions = new Map<string, {
    resolve: (result: PermissionResult) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
    originalInput: Record<string, unknown>
  }>()
  private sessionFiles = new Map<string, string>() // sessionId -> sessionFilePath
  private sessionsDir = '.code-crow/sessions'

  constructor(private workingDirectory?: string) {
    super()
    // Ensure sessions directory exists
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
    _projectId: string, // Unused but part of API
    continueSession: boolean = true,
    options: ClaudeCodeOptions = {}
  ): Promise<ClaudeCodeExecuteResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const startTime = Date.now()
    const mergedOptions = { ...this.defaultOptions, ...options }
    
    // Use the working directory for session file operations
    const workingDir = mergedOptions.workingDirectory || this.workingDirectory || process.cwd()
    const sessionFile = path.join(workingDir, this.sessionsDir, `${sessionId}.json`)
    
    // Ensure sessions directory exists in the working directory
    const sessionsDir = path.join(workingDir, this.sessionsDir)
    if (!fsSync.existsSync(sessionsDir)) {
      try {
        fsSync.mkdirSync(sessionsDir, { recursive: true })
        console.log(`✅ Created sessions directory: ${sessionsDir}`)
      } catch (error) {
        console.error(`❌ Failed to create sessions directory: ${error}`)
      }
    }

    try {
      console.log(`🤖 Executing Claude Code command: "${prompt}"${continueSession ? ` (session: ${sessionId})` : ' (new session)'}`)
      
      // Query options
      const queryOptions: any = {
        cwd: workingDir
      }

      // Add permission callback if sessionId is provided
      if (sessionId) {
        queryOptions.canUseTool = this.createCanUseTool(sessionId)
      }

      // Debug session file checking
      console.log(`🔍 Session Debug - sessionFile: ${sessionFile}`)
      console.log(`🔍 Session Debug - continueSession: ${continueSession}`)
      console.log(`🔍 Session Debug - file exists: ${fsSync.existsSync(sessionFile)}`)
      
      // Use continueFromSession if we want to continue and session exists
      if (continueSession && fsSync.existsSync(sessionFile)) {
        queryOptions.continueFromSession = sessionFile
        console.log(`🔗 Continuing from session: ${sessionFile}`)
      } else {
        // New session - the SDK will create the session file automatically
        queryOptions.sessionFile = sessionFile
        console.log(`🆕 Starting new session: ${sessionFile}`)
      }

      // Store session file path for this sessionId
      this.sessionFiles.set(sessionId, sessionFile)

      // Use AsyncIterable format when using permissions (required for canUseTool)
      const promptInput = sessionId ? this.createAsyncIterablePromptWithWorkaround(prompt) : prompt

      const queryResult = query({
        prompt: promptInput,
        options: queryOptions
      })

      const duration = Date.now() - startTime
      
      // The query function returns a Query object that we need to iterate over
      let fullResponse = ''
      
      try {
        for await (const message of queryResult) {
          // Log all message types for debugging
          console.log('🔍 Claude Code message type:', message.type, JSON.stringify(message, null, 2))
          
          // Handle different message types based on Claude Code SDK structure
          if (message.type === 'assistant' && message.message) {
            // Extract text from assistant message content
            if (Array.isArray(message.message.content)) {
              for (const contentItem of message.message.content) {
                if (contentItem.type === 'text' && contentItem.text) {
                  fullResponse += contentItem.text
                }
              }
            } else if (typeof message.message.content === 'string') {
              fullResponse += message.message.content
            }
          } else if (message.type === 'result') {
            // Complete the prompt to prevent hanging (workaround for canUseTool bug)
            this.completeCurrentPrompt()
          }
        }
      } catch (iterError) {
        console.error('Error iterating query result:', iterError)
        fullResponse = 'Query completed but could not extract response'
      }

      console.log(`✅ Claude Code execution completed in ${duration}ms`)

      return {
        success: true,
        output: fullResponse || 'Command completed successfully',
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      console.error(`❌ Claude Code execution failed after ${duration}ms:`, errorMessage)

      return {
        success: false,
        output: '',
        error: errorMessage,
        duration
      }
    }
  }

  async execute(
    prompt: string, 
    options: ClaudeCodeOptions = {},
    sessionId?: string
  ): Promise<ClaudeCodeExecuteResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const startTime = Date.now()
    const mergedOptions = { ...this.defaultOptions, ...options }

    try {
      console.log(`🤖 Executing Claude Code command: "${prompt}"`)
      
      // Execute the command using the Claude Code SDK with permission handling
      const queryOptions: any = {
        cwd: mergedOptions.workingDirectory || this.workingDirectory || process.cwd()
      }

      // Add permission callback if sessionId is provided
      if (sessionId) {
        queryOptions.canUseTool = this.createCanUseTool(sessionId)
      }

      // Use AsyncIterable format when using permissions (required for canUseTool)
      const promptInput = sessionId ? this.createAsyncIterablePromptWithWorkaround(prompt) : prompt

      const queryResult = query({
        prompt: promptInput,
        options: queryOptions
      })

      const duration = Date.now() - startTime
      
      // The query function returns a Query object that we need to iterate over
      let fullResponse = ''
      
      try {
        for await (const message of queryResult) {
          // Log all message types for debugging
          console.log('🔍 Claude Code message type:', message.type, JSON.stringify(message, null, 2))
          
          // Handle different message types based on Claude Code SDK structure
          if (message.type === 'assistant' && message.message) {
            // Extract text from assistant message content
            if (Array.isArray(message.message.content)) {
              for (const contentItem of message.message.content) {
                if (contentItem.type === 'text' && contentItem.text) {
                  fullResponse += contentItem.text
                }
              }
            } else if (typeof message.message.content === 'string') {
              fullResponse += message.message.content
            }
          } else if (message.type === 'result') {
            // Complete the prompt to prevent hanging (workaround for canUseTool bug)
            this.completeCurrentPrompt()
          }
        }
      } catch (iterError) {
        console.error('Error iterating query result:', iterError)
        fullResponse = 'Query completed but could not extract response'
      }

      console.log(`✅ Claude Code execution completed in ${duration}ms`)

      return {
        success: true,
        output: fullResponse || 'Command completed successfully',
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      console.error(`❌ Claude Code execution failed after ${duration}ms:`, errorMessage)

      return {
        success: false,
        output: '',
        error: errorMessage,
        duration
      }
    }
  }

  async executeStreamWithContext(
    prompt: string,
    onChunk: (chunk: string) => void,
    sessionId: string,
    _projectId: string, // Unused but part of API
    continueSession: boolean = true,
    options: ClaudeCodeOptions = {}
  ): Promise<ClaudeCodeExecuteResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const startTime = Date.now()
    const mergedOptions = { ...this.defaultOptions, ...options }
    
    // Use the working directory for session file operations
    const workingDir = mergedOptions.workingDirectory || this.workingDirectory || process.cwd()
    const sessionFile = path.join(workingDir, this.sessionsDir, `${sessionId}.json`)
    
    // Ensure sessions directory exists in the working directory
    const sessionsDir = path.join(workingDir, this.sessionsDir)
    if (!fsSync.existsSync(sessionsDir)) {
      try {
        fsSync.mkdirSync(sessionsDir, { recursive: true })
        console.log(`✅ Created sessions directory: ${sessionsDir}`)
      } catch (error) {
        console.error(`❌ Failed to create sessions directory: ${error}`)
      }
    }
    
    let fullOutput = ''

    try {
      console.log(`🤖 Streaming Claude Code command: "${prompt}"${continueSession ? ` (session: ${sessionId})` : ' (new session)'}`)
      
      // Query options
      const queryOptions: any = {
        cwd: workingDir
      }

      // Add permission callback if sessionId is provided
      if (sessionId) {
        queryOptions.canUseTool = this.createCanUseTool(sessionId)
      }

      // Debug session file checking
      console.log(`🔍 Session Debug - sessionFile: ${sessionFile}`)
      console.log(`🔍 Session Debug - continueSession: ${continueSession}`)
      console.log(`🔍 Session Debug - file exists: ${fsSync.existsSync(sessionFile)}`)
      
      // Use continueFromSession if we want to continue and session exists
      if (continueSession && fsSync.existsSync(sessionFile)) {
        queryOptions.continueFromSession = sessionFile
        console.log(`🔗 Continuing from session: ${sessionFile}`)
      } else {
        // New session - the SDK will create the session file automatically
        queryOptions.sessionFile = sessionFile
        console.log(`🆕 Starting new session: ${sessionFile}`)
      }

      // Store session file path for this sessionId
      this.sessionFiles.set(sessionId, sessionFile)

      // Use AsyncIterable format when using permissions (required for canUseTool)
      const promptInput = sessionId ? this.createAsyncIterablePromptWithWorkaround(prompt) : prompt

      const queryResult = query({
        prompt: promptInput,
        options: queryOptions
      })

      try {
        for await (const message of queryResult) {
          // Log all message types for debugging
          console.log('🔍 Claude Code streaming message type:', message.type, JSON.stringify(message, null, 2))
          
          // Handle different message types with status updates
          if (message.type === 'system' && message.subtype === 'init') {
            // Claude is initializing
            onChunk('__STATUS__:initializing')
          } else if (message.type === 'assistant' && message.message) {
            // Claude is responding - send status first, then content
            if (message.message.content) {
              onChunk('__STATUS__:thinking')
              
              // Extract text from assistant message content
              if (Array.isArray(message.message.content)) {
                for (const contentItem of message.message.content) {
                  if (contentItem.type === 'text' && contentItem.text) {
                    fullOutput += contentItem.text
                    onChunk(contentItem.text)
                  } else if (contentItem.type === 'tool_use') {
                    // Claude is using a tool
                    onChunk(`__STATUS__:using_tool:${contentItem.name}`)
                  }
                }
              } else if (typeof message.message.content === 'string') {
                fullOutput += message.message.content
                onChunk(message.message.content)
              }
            }
          } else if (message.type === 'user') {
            // Tool results coming back
            onChunk('__STATUS__:processing')
          } else if (message.type === 'result') {
            // Final result
            onChunk('__STATUS__:completing')
            // Complete the prompt to prevent hanging (workaround for canUseTool bug)
            this.completeCurrentPrompt()
          }
        }
      } catch (iterError) {
        console.error('Error streaming query result:', iterError)
        const fallbackMessage = 'Query completed but could not stream response'
        fullOutput += fallbackMessage
        onChunk(fallbackMessage)
      }

      const duration = Date.now() - startTime
      console.log(`✅ Claude Code streaming completed in ${duration}ms`)

      return {
        success: true,
        output: fullOutput,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      console.error(`❌ Claude Code streaming failed after ${duration}ms:`, errorMessage)

      return {
        success: false,
        output: fullOutput,
        error: errorMessage,
        duration
      }
    }
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

    const startTime = Date.now()
    const mergedOptions = { ...this.defaultOptions, ...options }
    let fullOutput = ''

    try {
      console.log(`🤖 Streaming Claude Code command: "${prompt}"`)
      
      // Execute the command and stream the results with permission handling
      const queryOptions: any = {
        cwd: mergedOptions.workingDirectory || this.workingDirectory || process.cwd()
      }

      // Add permission callback if sessionId is provided
      if (sessionId) {
        queryOptions.canUseTool = this.createCanUseTool(sessionId)
      }

      // Use AsyncIterable format when using permissions (required for canUseTool)
      const promptInput = sessionId ? this.createAsyncIterablePromptWithWorkaround(prompt) : prompt

      const queryResult = query({
        prompt: promptInput,
        options: queryOptions
      })

      try {
        for await (const message of queryResult) {
          // Log all message types for debugging
          console.log('🔍 Claude Code streaming message type:', message.type, JSON.stringify(message, null, 2))
          
          // Handle different message types with status updates
          if (message.type === 'system' && message.subtype === 'init') {
            // Claude is initializing
            onChunk('__STATUS__:initializing')
          } else if (message.type === 'assistant' && message.message) {
            // Claude is responding - send status first, then content
            if (message.message.content) {
              onChunk('__STATUS__:thinking')
              
              // Extract text from assistant message content
              if (Array.isArray(message.message.content)) {
                for (const contentItem of message.message.content) {
                  if (contentItem.type === 'text' && contentItem.text) {
                    fullOutput += contentItem.text
                    onChunk(contentItem.text)
                  } else if (contentItem.type === 'tool_use') {
                    // Claude is using a tool
                    onChunk(`__STATUS__:using_tool:${contentItem.name}`)
                  }
                }
              } else if (typeof message.message.content === 'string') {
                fullOutput += message.message.content
                onChunk(message.message.content)
              }
            }
          } else if (message.type === 'user') {
            // Tool results coming back
            onChunk('__STATUS__:processing')
          } else if (message.type === 'result') {
            // Final result
            onChunk('__STATUS__:completing')
            // Complete the prompt to prevent hanging (workaround for canUseTool bug)
            this.completeCurrentPrompt()
          }
        }
      } catch (iterError) {
        console.error('Error streaming query result:', iterError)
        const fallbackMessage = 'Query completed but could not stream response'
        fullOutput += fallbackMessage
        onChunk(fallbackMessage)
      }

      const duration = Date.now() - startTime
      console.log(`✅ Claude Code streaming completed in ${duration}ms`)

      return {
        success: true,
        output: fullOutput,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      console.error(`❌ Claude Code streaming failed after ${duration}ms:`, errorMessage)

      return {
        success: false,
        output: fullOutput,
        error: errorMessage,
        duration
      }
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  getWorkingDirectory(): string {
    return this.workingDirectory || process.cwd()
  }

  setWorkingDirectory(directory: string): void {
    this.workingDirectory = directory
    // No need to reinitialize - just update the working directory
  }

  // Permission handling methods
  private createCanUseTool(sessionId: string): CanUseTool {
    return async (toolName: string, _input: Record<string, unknown>, options: { signal: AbortSignal }): Promise<PermissionResult> => {
      return new Promise((resolve, reject) => {
        const requestId = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const timeoutMs = 30000 // 30 seconds default timeout

        console.log(`🔐 Permission request for tool: ${toolName}`)
        
        // Create permission request
        const permissionRequest: PermissionRequest = {
          id: requestId,
          sessionId,
          toolName,
          toolInput: _input,
          description: this.getToolDescription(toolName, _input),
          reason: this.getToolReason(toolName, _input),
          timestamp: new Date(),
          timeoutMs
        }

        // Set up timeout
        const timeout = setTimeout(() => {
          this.pendingPermissions.delete(requestId)
          console.log(`⏰ Permission request ${requestId} timed out`)
          
          // Emit timeout event
          this.emit('permission:timeout', { requestId, reason: 'User did not respond within timeout period' })
          
          resolve({
            behavior: 'deny',
            message: 'Permission request timed out - user did not respond within 30 seconds'
          })
        }, timeoutMs)

        // Store pending permission with original input
        this.pendingPermissions.set(requestId, {
          resolve,
          reject,
          timeout,
          originalInput: _input
        })

        // Emit permission request event
        this.emit('permission:request', permissionRequest)

        // Handle abort signal
        options.signal.addEventListener('abort', () => {
          const pending = this.pendingPermissions.get(requestId)
          if (pending) {
            clearTimeout(pending.timeout)
            this.pendingPermissions.delete(requestId)
            reject(new Error('Permission request aborted'))
          }
        })
      })
    }
  }

  // Handle permission response from web client
  handlePermissionResponse(response: PermissionResponse): void {
    const pending = this.pendingPermissions.get(response.requestId)
    if (!pending) {
      console.warn(`⚠️ Received permission response for unknown request: ${response.requestId}`)
      return
    }

    clearTimeout(pending.timeout)
    this.pendingPermissions.delete(response.requestId)

    console.log(`🔐 Permission ${response.decision} for request: ${response.requestId}`)

    if (response.decision === 'allow') {
      pending.resolve({
        behavior: 'allow',
        updatedInput: response.updatedInput || pending.originalInput
      })
    } else {
      pending.resolve({
        behavior: 'deny',
        message: response.message || 'Permission denied by user'
      })
    }
  }

  // Get human-readable description of what the tool does
  private getToolDescription(toolName: string, input: Record<string, unknown>): string {
    switch (toolName) {
      case 'str_replace_editor':
        const command = input.command as string
        const path = input.path as string
        switch (command) {
          case 'create':
            return `Create a new file at ${path}`
          case 'str_replace':
            return `Edit file ${path}`
          case 'view':
            return `View contents of ${path}`
          default:
            return `Perform ${command} operation on ${path}`
        }
      case 'bash':
        return `Run command: ${input.command}`
      case 'computer':
        return `Interact with the computer: ${input.action}`
      default:
        return `Use ${toolName} tool`
    }
  }

  // Get reason why the tool is being used
  private getToolReason(toolName: string, _input: Record<string, unknown>): string {
    switch (toolName) {
      case 'str_replace_editor':
        return 'Claude needs to modify files to complete your request'
      case 'bash':
        return 'Claude needs to run commands to complete your request'
      case 'computer':
        return 'Claude needs to interact with your computer to complete your request'
      default:
        return `Claude needs to use ${toolName} to complete your request`
    }
  }

  // Create async iterable prompt with workaround for hanging bug
  private createAsyncIterablePromptWithWorkaround(prompt: string): AsyncIterable<any> {
    let done: (() => void) | undefined
    const receivedResult = new Promise<void>(resolve => {
      done = resolve
    })

    // Store the done callback for later use when we get results  
    this.currentPromptDone = done!

    // Return the immediately invoked async generator
    return (async function* () {
      yield { 
        type: 'user', 
        message: { 
          role: 'user', 
          content: prompt 
        } 
      }
      await receivedResult
    })()
  }

  private currentPromptDone: (() => void) | undefined

  // Call this when we receive a result to prevent hanging
  private completeCurrentPrompt() {
    if (this.currentPromptDone) {
      this.currentPromptDone()
      this.currentPromptDone = undefined
    }
  }

  // Clear session (delete session file)
  async clearSession(sessionId: string): Promise<void> {
    const sessionFile = this.sessionFiles.get(sessionId)
    if (sessionFile && fsSync.existsSync(sessionFile)) {
      await fs.unlink(sessionFile)
      console.log(`🗑️ Cleared session file: ${sessionFile}`)
    }
    this.sessionFiles.delete(sessionId)
  }

  // Check if session exists
  async sessionExists(sessionId: string): Promise<boolean> {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`)
    return fsSync.existsSync(sessionFile)
  }

  // Get session info (read from session file)
  async getSessionInfo(sessionId: string): Promise<any> {
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
}