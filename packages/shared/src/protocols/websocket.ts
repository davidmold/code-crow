import { ClaudeCodeCommand, ClaudeCodeResponse, Project, ProjectFile, PermissionRequest, PermissionResponse } from '../types/index.js'

export interface ServerToClientEvents {
  'agent:connected': (data: { status: string }) => void
  'client:connected': (data: { status: string }) => void
  'claude-code:response': (response: ClaudeCodeResponse) => void
  'claude-code:complete': (data: { commandId: string }) => void
  'projects:updated': (projects: Project[]) => void
  'permission:request': (request: PermissionRequest) => void
  'permission:timeout': (data: { requestId: string, reason: string }) => void
}

export interface ClientToServerEvents {
  'agent:connect': (data: { 
    agentId: string
    timestamp: string
    capabilities: string[]
  }) => void
  'client:connect': (data: {
    clientId: string
    timestamp: string
  }) => void
  'claude-code:execute': (command: ClaudeCodeCommand) => void
  'projects:list': (callback: (projects: Project[]) => void) => void
  'project:files': (data: { 
    projectId: string 
  }, callback: (files: ProjectFile[]) => void) => void
  'permission:response': (response: PermissionResponse) => void
}