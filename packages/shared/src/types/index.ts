export interface Project {
  id: string
  name: string
  path: string
  lastModified: Date
  status: 'active' | 'inactive'
}

export interface ProjectFile {
  path: string
  name: string
  size: number
  lastModified: Date
  type: 'file' | 'directory'
}

// Session interface moved to sessions.ts - import from there

export interface ChatMessage {
  id: string
  sessionId: string
  timestamp: Date
  type: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
}

export interface ClaudeCodeCommand {
  id: string
  command: string
  workingDirectory?: string
  timestamp: Date
  status: 'pending' | 'running' | 'completed' | 'error'
}

export interface ClaudeCodeResponse {
  commandId: string
  type: 'output' | 'error' | 'complete'
  content: string
  timestamp: Date
}

// Permission system types
export interface PermissionRequest {
  id: string
  sessionId: string
  toolName: string
  toolInput: Record<string, unknown>
  description?: string
  reason?: string
  timestamp: Date
  timeoutMs?: number
}

export interface PermissionResponse {
  requestId: string
  decision: 'allow' | 'deny'
  remember?: boolean
  updatedInput?: Record<string, unknown>
  message?: string
  timestamp: Date
}

export interface PermissionRule {
  toolName: string
  inputPattern?: Record<string, unknown>
  decision: 'allow' | 'deny'
  createdAt: Date
  sessionOnly?: boolean
}

// Export WebSocket types
export * from './websocket.js'
export * from './messages.js'
export * from '../websocket/BaseWebSocketClient.js'

// Export Stage 5 types  
export * from './commands.js'
export * from './sessions.js'

// Export Claude Code API types
export * from './claude-code-api.js'