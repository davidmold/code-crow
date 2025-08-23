import { homedir } from 'os'
import { join } from 'path'

export interface AgentConfig {
  serverUrl: string
  projectPaths: string[]
  claudeCodePath?: string | undefined
}

export class ConfigService {
  static load(): AgentConfig {
    return {
      serverUrl: process.env.CODE_CROW_SERVER_URL || 'http://localhost:8080',
      projectPaths: process.env.CODE_CROW_PROJECT_PATHS
        ? process.env.CODE_CROW_PROJECT_PATHS.split(':')
        : [join(homedir(), 'projects')],
      claudeCodePath: process.env.CLAUDE_CODE_PATH
    }
  }
}