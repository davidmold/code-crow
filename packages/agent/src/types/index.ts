export interface ClaudeCodeOptions {
  workingDirectory?: string
  streamOutput?: boolean
  timeout?: number
}

export interface ClaudeCodeExecuteResult {
  success: boolean
  output: string
  error?: string
  duration: number
  claudeSessionId?: string | undefined // Claude's actual session ID
}

// Import shared types instead of redefining them
import type { ProjectInfo } from '@code-crow/shared'
export type { ProjectInfo }

export type ProjectType = 
  | 'node'
  | 'python'
  | 'rust' 
  | 'go'
  | 'java'
  | 'react'
  | 'vue'
  | 'angular'
  | 'unknown'

export interface AgentConfiguration {
  serverUrl: string
  projectPaths: string[]
  claudeCode: {
    workingDirectory?: string
    allowedTools: string[]
    debugMode: boolean
    maxResponseTokens: number
  }
  projects: {
    scanDepth: number
    excludePatterns: string[]
    autoScan: boolean
  }
}

export interface ScanResult {
  totalProjects: number
  projects: ProjectInfo[]
  scanDuration: number
  errors: string[]
}