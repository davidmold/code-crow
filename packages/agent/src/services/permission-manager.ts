import type { CanUseTool, PermissionResult } from '@anthropic-ai/claude-code'
import { PermissionRequest, PermissionResponse } from '@code-crow/shared'
import { EventEmitter } from 'events'

interface PendingPermission {
  resolve: (result: PermissionResult) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
  originalInput: Record<string, unknown>
}

export class PermissionManager extends EventEmitter {
  private pendingPermissions = new Map<string, PendingPermission>()
  private readonly defaultTimeoutMs = 30000 // 30 seconds

  createCanUseTool(sessionId: string): CanUseTool {
    return async (toolName: string, input: Record<string, unknown>, options: { signal: AbortSignal }): Promise<PermissionResult> => {
      return new Promise((resolve, reject) => {
        const requestId = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        console.log(`🔐 Permission request for tool: ${toolName}`)
        
        // Create permission request
        const permissionRequest: PermissionRequest = {
          id: requestId,
          sessionId,
          toolName,
          toolInput: input,
          description: this.getToolDescription(toolName, input),
          reason: this.getToolReason(toolName, input),
          timestamp: new Date(),
          timeoutMs: this.defaultTimeoutMs
        }

        // Set up timeout
        const timeout = setTimeout(() => {
          this.handleTimeout(requestId)
        }, this.defaultTimeoutMs)

        // Store pending permission
        this.pendingPermissions.set(requestId, {
          resolve,
          reject,
          timeout,
          originalInput: input
        })

        // Emit permission request event
        this.emit('permission:request', permissionRequest)

        // Handle abort signal
        options.signal.addEventListener('abort', () => {
          this.handleAbort(requestId)
        })
      })
    }
  }

  handlePermissionResponse(response: PermissionResponse): void {
    const pending = this.pendingPermissions.get(response.requestId)
    if (!pending) {
      console.warn(`⚠️ Received permission response for unknown request: ${response.requestId}`)
      return
    }

    this.clearPendingPermission(response.requestId)

    console.log(`🔐 Permission ${response.decision} for request: ${response.requestId}`)

    if (response.decision === 'allow') {
      pending.resolve({
        behavior: 'allow',
        updatedInput: response.updatedInput || pending.originalInput
      })
    } else {
      pending.resolve({
        behavior: 'deny',
        message: 'Permission denied by user'
      })
    }
  }

  private handleTimeout(requestId: string): void {
    const pending = this.pendingPermissions.get(requestId)
    if (!pending) return

    this.clearPendingPermission(requestId)
    console.log(`⏰ Permission request ${requestId} timed out`)
    
    // Emit timeout event
    this.emit('permission:timeout', { 
      requestId, 
      reason: 'User did not respond within timeout period' 
    })
    
    pending.resolve({
      behavior: 'deny',
      message: 'Permission request timed out - user did not respond within 30 seconds'
    })
  }

  private handleAbort(requestId: string): void {
    const pending = this.pendingPermissions.get(requestId)
    if (!pending) return

    this.clearPendingPermission(requestId)
    pending.reject(new Error('Permission request aborted'))
  }

  private clearPendingPermission(requestId: string): void {
    const pending = this.pendingPermissions.get(requestId)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingPermissions.delete(requestId)
    }
  }

  private getToolDescription(toolName: string, input: Record<string, unknown>): string {
    switch (toolName) {
      case 'bash':
        return `Execute command: ${input.command || 'unknown command'}`
      case 'edit':
        return `Edit file: ${input.path || 'unknown file'}`
      case 'create':
        return `Create file: ${input.path || 'unknown file'}`
      case 'view':
        return `View file: ${input.path || 'unknown file'}`
      case 'list_dir':
        return `List directory: ${input.path || 'current directory'}`
      case 'search':
        return `Search for: ${input.query || 'unknown query'}`
      case 'replace':
        return `Replace text in: ${input.path || 'unknown file'}`
      default:
        return `Use tool: ${toolName}`
    }
  }

  private getToolReason(toolName: string, _input: Record<string, unknown>): string {
    switch (toolName) {
      case 'bash':
        return 'Execute system command to perform development tasks'
      case 'edit':
      case 'create':
      case 'replace':
        return 'Modify project files to implement requested changes'
      case 'view':
      case 'list_dir':
        return 'Read project files to understand current state'
      case 'search':
        return 'Search through project files to find relevant code'
      default:
        return `This tool is needed to complete the requested task`
    }
  }
}