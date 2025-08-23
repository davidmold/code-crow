import { homedir } from 'os'
import { join } from 'path'
import { AgentConfiguration } from '../types/index.js'

export interface AgentConfig {
  serverUrl: string
  projectPaths: string[]
  claudeCodePath?: string | undefined
}

export class ConfigService {
  static load(): AgentConfiguration {
    const defaultConfig: AgentConfiguration = {
      serverUrl: process.env.CODE_CROW_SERVER_URL || 'http://localhost:3001',
      projectPaths: process.env.CODE_CROW_PROJECT_PATHS
        ? process.env.CODE_CROW_PROJECT_PATHS.split(':')
        : [join(homedir(), 'projects'), join(homedir(), 'code'), process.cwd()],
      claudeCode: {
        workingDirectory: process.env.CODE_CROW_WORKING_DIR || process.cwd(),
        allowedTools: process.env.CODE_CROW_ALLOWED_TOOLS
          ? process.env.CODE_CROW_ALLOWED_TOOLS.split(',')
          : ['read', 'write', 'edit', 'bash', 'search'],
        debugMode: process.env.CODE_CROW_DEBUG === 'true',
        maxResponseTokens: parseInt(process.env.CODE_CROW_MAX_TOKENS || '4096')
      },
      projects: {
        scanDepth: parseInt(process.env.CODE_CROW_SCAN_DEPTH || '3'),
        excludePatterns: process.env.CODE_CROW_EXCLUDE_PATTERNS
          ? process.env.CODE_CROW_EXCLUDE_PATTERNS.split(',')
          : ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'target'],
        autoScan: process.env.CODE_CROW_AUTO_SCAN !== 'false'
      }
    }

    return defaultConfig
  }

  static validate(config: AgentConfiguration): boolean {
    try {
      // Validate server URL
      new URL(config.serverUrl)

      // Validate project paths
      if (!Array.isArray(config.projectPaths) || config.projectPaths.length === 0) {
        throw new Error('At least one project path must be specified')
      }

      // Validate Claude Code settings
      if (config.claudeCode.maxResponseTokens < 1 || config.claudeCode.maxResponseTokens > 100000) {
        throw new Error('maxResponseTokens must be between 1 and 100000')
      }

      if (config.projects.scanDepth < 1 || config.projects.scanDepth > 10) {
        throw new Error('scanDepth must be between 1 and 10')
      }

      return true
    } catch (error) {
      console.error('❌ Configuration validation failed:', error)
      return false
    }
  }

  static getEnvironmentExample(): string {
    return `# Code Crow Agent Environment Configuration
# Copy this to your .env file and customize as needed

# Server connection
CODE_CROW_SERVER_URL=http://localhost:3001

# Project paths (colon-separated)
CODE_CROW_PROJECT_PATHS=${homedir()}/projects:${homedir()}/code

# Claude Code settings
CODE_CROW_WORKING_DIR=${process.cwd()}
CODE_CROW_ALLOWED_TOOLS=read,write,edit,bash,search
CODE_CROW_DEBUG=false
CODE_CROW_MAX_TOKENS=4096

# Project scanning
CODE_CROW_SCAN_DEPTH=3
CODE_CROW_EXCLUDE_PATTERNS=node_modules,.git,dist,build,.next,.nuxt,target
CODE_CROW_AUTO_SCAN=true`
  }
}