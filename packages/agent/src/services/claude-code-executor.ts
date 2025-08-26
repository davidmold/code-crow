import { query } from '@anthropic-ai/claude-code'
import type { CanUseTool } from '@anthropic-ai/claude-code'
import { ClaudeCodeOptions, ClaudeCodeExecuteResult } from '../types/index.js'
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
      
      // Build query options
      const queryOptions: Record<string, unknown> = {
        cwd: workingDir,
        ...apiOptions
      }

      // Add permission callback if provided
      if (canUseTool) {
        queryOptions.canUseTool = canUseTool
      }

      console.log(`🔍 Claude Code SDK options:`, JSON.stringify(queryOptions, null, 2))
      
      const queryResult = query({
        prompt: prompt as any,
        options: queryOptions
      })

      // Process the query result
      let fullResponse = ''
      
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
        console.error('Error iterating query result:', iterError)
        fullResponse = 'Query completed but could not extract response'
      }

      const queryResultData = {
        content: fullResponse,
        session: { id: undefined } // Mock session for compatibility
      }

      // Save session if requested
      await this.saveSessionIfRequested(sessionId, projectId, prompt, queryResultData, sessionFile)

      const duration = Date.now() - startTime
      console.log(`✅ Command completed in ${duration}ms`)

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

  createAsyncIterablePromptWithWorkaround(prompt: string): AsyncIterable<string> {
    let promptDone = false
    
    return {
      [Symbol.asyncIterator]: () => {
        return {
          async next(): Promise<IteratorResult<string>> {
            if (promptDone) {
              return { done: true, value: undefined }
            }
            promptDone = true
            return { done: false, value: prompt }
          }
        }
      }
    }
  }

  private completeCurrentPrompt(): void {
    if (this.currentPromptDone) {
      this.currentPromptDone()
      this.currentPromptDone = undefined
    }
  }
}