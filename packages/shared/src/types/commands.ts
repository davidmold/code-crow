export interface CommandExecution {
  sessionId: string;
  projectId: string;
  command: string;
  workingDirectory: string;
  options: {
    allowedTools?: string[];
    systemPrompt?: string;
    maxTurns?: number;
    timeoutMs?: number;
  };
}

export interface StreamingResponse {
  sessionId: string;
  type: 'text' | 'file_change' | 'error' | 'complete';
  data: string;
  metadata?: {
    file?: string;
    operation?: 'create' | 'modify' | 'delete';
    timestamp?: string;
  };
}

export interface Command {
  id: string;
  sessionId: string;
  projectId: string;
  command: string;
  workingDirectory?: string;
  timestamp: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  options?: {
    allowedTools?: string[];
    systemPrompt?: string;
    maxTurns?: number;
    timeoutMs?: number;
  };
}

export interface CommandExecutionResponse {
  commandId: string;
  sessionId: string;
  type: 'output' | 'error' | 'complete' | 'progress';
  content: string;
  timestamp: string;
  metadata?: {
    file?: string;
    operation?: string;
    progress?: number;
  };
}

export interface CommandExecutionHistory {
  sessionId: string;
  projectId: string;
  command: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  success: boolean;
  response?: string;
  error?: string;
  fileChanges?: Array<{
    file: string;
    operation: 'create' | 'modify' | 'delete';
    timestamp: string;
  }>;
}

export interface ProjectDetectionResult {
  type: 'node' | 'python' | 'rust' | 'go' | 'java' | 'react' | 'vue' | 'angular' | 'unknown';
  name: string; // Detected from package.json, directory name, etc.
  framework?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'cargo' | 'go mod';
  language?: string;
  version?: string;
  hasGit?: boolean;
}

export interface AddProjectRequest {
  directoryPath: string;
  customName?: string; // Override detected name
  description?: string;
  autoDetect?: boolean; // Whether to auto-detect project type
}

export interface AddProjectResponse {
  success: boolean;
  project?: ProjectInfo;
  error?: string;
  detection?: ProjectDetectionResult;
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  type: 'node' | 'python' | 'rust' | 'go' | 'java' | 'react' | 'vue' | 'angular' | 'unknown';
  addedDate: string;
  lastAccessed?: string;
  description?: string;
  framework?: string;
  packageManager?: string;
  language?: string;
  hasGit?: boolean;
  fileCount?: number;
  size?: number;
}

export interface ProjectsConfig {
  projects: ProjectInfo[];
  lastModified: string;
  version: string;
}

export interface RemoveProjectRequest {
  projectId: string;
  deleteFiles?: boolean; // Whether to delete actual files (dangerous)
}

export interface UpdateProjectRequest {
  projectId: string;
  updates: Partial<Pick<ProjectInfo, 'name' | 'description' | 'lastAccessed'>>;
}