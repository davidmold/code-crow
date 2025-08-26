import { query } from '@anthropic-ai/claude-code'
import type { CanUseTool } from '@anthropic-ai/claude-code'
import { ClaudeCodeOptions, ClaudeCodeExecuteResult } from '../types/index.js'
import { ApiOptionsHelper } from '@code-crow/shared'
import * as fs from 'fs/promises'

interface ClaudeMessageContent {
  type: 'text';
  text: string;
}

interface ClaudeMessage {
  type: 'assistant' | 'result';
  message?: {
    content: ClaudeMessageContent[] | string;
  };
}

interface QueryResultData {
  content: string;
  session: { id: string | undefined };
}

interface ExecutionConfig {
  prompt: string | AsyncIterable<string>
  sessionId?: string | undefined
  continueSession?: boolean
  options?: ClaudeCodeOptions
  apiOptions?: Record<string, unknown>
  streaming?: boolean
  onChunk?: (chunk: string) => void
  projectId?: string
  claudeSessionId?: string | undefined
  workingDir: string
  sessionFile: string | null
  canUseTool?: CanUseTool | undefined
}

export class ClaudeCodeExecutor {
  private currentPromptDone: (() => void) | undefined

  async execute(config: ExecutionConfig): Promise<ClaudeCodeExecuteResult> {
    const startTime = Date.now()
    const {
      prompt,
      sessionId,
      streaming = false,
      onChunk,
      projectId,
      workingDir,
      sessionFile,
      apiOptions = {},
      canUseTool
    } = config

    try {
      console.log(`🤖 Executing Claude Code command: "${typeof prompt === 'string' ? prompt : '[AsyncIterable]'}"${sessionId ? ` (session: ${sessionId})` : ' (no session)'}`)
      
      // Build query options: normalize and only pass supported keys to the SDK/CLI
      const queryOptions: Record<string, unknown> = this.buildQueryOptions(workingDir, apiOptions)

      // Add permission callback if provided
      if (canUseTool) {
        queryOptions.canUseTool = canUseTool
      }

      console.log(`🔍 Claude Code SDK options:`, JSON.stringify(queryOptions, null, 2))
      
      // Enable rich stderr from Claude CLI to aid debugging (configurable via CODE_CROW_DEBUG)
      const stderrBuffer: string[] = []
      const enableDebug = process.env.CODE_CROW_DEBUG === 'true'
      const queryResult = query({
        prompt: prompt as any,
        options: {
          ...queryOptions,
          // Always capture stderr output into buffer; only log when debug enabled
          stderr: (data: string) => {
            stderrBuffer.push(data)
            if (enableDebug) {
              console.error(`🧵 Claude stderr: ${data.trim()}`)
            }
          },
          // Only enable SDK/CLI debug when explicitly requested
          ...(enableDebug ? { env: { ...process.env, DEBUG: '1' } } : {})
        } as any
      })

      // Process the query result
      let fullResponse = ''
      let iterationError: unknown | null = null
      
      try {
        for await (const message of queryResult) {
          // Log all message types for debugging
          console.log('🔍 Claude Code message type:', message.type, JSON.stringify(message, null, 2))
          
          // Handle different message types based on Claude Code SDK structure
          if (message.type === 'assistant' && message.message) {
            const chunk = this.extractTextFromMessage(message.message)
            if (chunk) {
              fullResponse += chunk
              
              // Call onChunk if streaming is enabled
              if (streaming && onChunk) {
                onChunk(chunk)
              }
            }
          } else if (message.type === 'result') {
            // Complete the prompt to prevent hanging (workaround for canUseTool bug)
            this.completeCurrentPrompt()
          }
        }
      } catch (iterError) {
        iterationError = iterError
        console.error('❌ Error iterating Claude Code query result:', iterError)
      }

      const queryResultData = {
        content: fullResponse,
        session: { id: undefined } // Mock session for compatibility
      }

      // Save session if requested
      await this.saveSessionIfRequested(sessionId, projectId, prompt, queryResultData, sessionFile)

      const duration = Date.now() - startTime
      console.log(`✅ Command completed in ${duration}ms`)

      // If the SDK iteration failed, surface a clear error up the stack
      if (iterationError) {
        const message = iterationError instanceof Error ? iterationError.message : String(iterationError)
        const stderrMsg = stderrBuffer.join('\n').trim()
        const detailedMessage = `Claude Code execution failed: ${message}${stderrMsg ? `\nDetails:\n${stderrMsg}` : ''}. Ensure the Claude Code CLI is installed and authenticated (try: \`claude whoami\`), and that the working directory is valid.`
        return {
          success: false,
          output: '',
          error: detailedMessage,
          duration,
          claudeSessionId: queryResultData.session?.id
        }
      }

      // Normal success path
      return {
        success: true,
        output: queryResultData.content || '',
        duration,
        claudeSessionId: queryResultData.session?.id
      }
    } catch (error) {
      return this.handleExecutionError(error, Date.now() - startTime)
    }
  }

  private extractTextFromMessage(message: ClaudeMessage): string {
    let text = ''
    
    if (Array.isArray((message as any).content)) {
      for (const contentItem of (message as any).content) {
        if (contentItem.type === 'text' && contentItem.text) {
          text += contentItem.text
        }
      }
    } else if (typeof (message as any).content === 'string') {
      text = (message as any).content
    }
    
    return text
  }

  private async saveSessionIfRequested(
    sessionId: string | undefined,
    projectId: string | undefined,
    prompt: string | AsyncIterable<string>,
    queryResultData: QueryResultData,
    sessionFile: string | null
  ): Promise<void> {
    if (sessionFile && queryResultData.session) {
      try {
        await fs.writeFile(sessionFile, JSON.stringify({
          sessionId: sessionId,
          projectId: projectId || 'unknown',
          prompt: typeof prompt === 'string' ? prompt : '[AsyncIterable]',
          result: {
            ...queryResultData,
            session: undefined // Don't save the session object itself
          },
          timestamp: new Date().toISOString()
        }, null, 2))
        console.log(`💾 Session saved: ${sessionFile}`)
      } catch (error) {
        console.warn(`⚠️ Failed to save session: ${error}`)
      }
    }
  }

  private handleExecutionError(error: unknown, duration: number): ClaudeCodeExecuteResult {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`❌ Claude Code execution failed (${duration}ms):`, errorMessage)

    return {
      success: false,
      output: '',
      error: errorMessage,
      duration
    }
  }

  createAsyncIterablePromptWithWorkaround(prompt: string): AsyncIterable<Record<string, unknown>> {
    // When using canUseTool, the SDK sets --input-format stream-json.
    // The CLI expects JSONL objects with type 'user' or 'control_request'.
    // We emit a single 'user' message with the prompt as content.
    let emitted = false
    return {
      [Symbol.asyncIterator]: () => ({
        async next(): Promise<IteratorResult<Record<string, unknown>>> {
          if (emitted) return { done: true, value: undefined as any }
          emitted = true
          return {
            done: false,
            value: {
              type: 'user',
              message: {
                role: 'user',
                // The CLI reads N.message.content; it accepts string or blocks.
                content: prompt
              }
            }
          }
        }
      })
    }
  }

  private completeCurrentPrompt(): void {
    if (this.currentPromptDone) {
      this.currentPromptDone()
      this.currentPromptDone = undefined
    }
  }

  private buildQueryOptions(workingDir: string, apiOptions: Record<string, unknown> = {}): Record<string, unknown> {
    // Extract known API options and normalize to CLI-supported keys
    const extracted = ApiOptionsHelper.extractApiOptions(apiOptions as any)

    const timeout = (extracted as any).timeout ?? (extracted as any).timeoutMs
    const cwd = (extracted as any).cwd || (extracted as any).workingDirectory || workingDir

    const normalized: Record<string, unknown> = {
      cwd,
      // SDK expects `continue`, we also keep `continueSession` for clarity
      ...(extracted.continueSession !== undefined ? { continue: extracted.continueSession, continueSession: extracted.continueSession } : {}),
      ...(extracted.resume ? { resume: extracted.resume } : {}),
      ...(timeout !== undefined ? { timeout } : {}),
      ...(extracted.maxTurns !== undefined ? { maxTurns: extracted.maxTurns } : {}),
      ...(extracted.systemPrompt ? { systemPrompt: extracted.systemPrompt } : {}),
      ...(extracted.allowedTools ? { allowedTools: extracted.allowedTools } : {}),
      ...(extracted.permissionMode ? { permissionMode: extracted.permissionMode } : {}),
      ...(extracted.model ? { model: extracted.model } : {}),
      ...(extracted.temperature !== undefined ? { temperature: extracted.temperature } : {})
    }

    return normalized
  }
}
