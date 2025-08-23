export interface Session {
  id: string;
  projectId: string;
  status: 'running' | 'complete' | 'error' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  commands: SessionCommand[];
  responses: SessionResponse[];
  clientId?: string;
  metadata?: {
    userAgent?: string;
    initialCommand?: string;
    workingDirectory?: string;
  };
}

export interface SessionCommand {
  id: string;
  sessionId: string;
  command: string;
  timestamp: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  workingDirectory?: string;
  options?: {
    allowedTools?: string[];
    systemPrompt?: string;
    maxTurns?: number;
    timeoutMs?: number;
  };
}

export interface SessionResponse {
  id: string;
  sessionId: string;
  commandId: string;
  type: 'text' | 'file_change' | 'error' | 'complete' | 'progress';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: {
    file?: string;
    operation?: 'create' | 'modify' | 'delete';
    progress?: number;
    lineNumber?: number;
  };
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  errorSessions: number;
  averageDuration: number;
  totalCommands: number;
  successRate: number;
}

export interface SessionFilter {
  projectId?: string;
  status?: Session['status'];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface SessionSummary {
  id: string;
  projectId: string;
  projectName?: string;
  status: Session['status'];
  startTime: string;
  endTime?: string;
  duration?: number;
  commandCount: number;
  responseCount: number;
  lastCommand?: string;
  error?: string;
}

export interface CreateSessionRequest {
  projectId: string;
  sessionId?: string; // Optional: use provided sessionId instead of generating one
  initialCommand?: string;
  workingDirectory?: string;
  clientId?: string;
  options?: {
    allowedTools?: string[];
    systemPrompt?: string;
    maxTurns?: number;
    timeoutMs?: number;
  };
}

export interface CreateSessionResponse {
  success: boolean;
  session?: Session;
  error?: string;
}

export interface UpdateSessionRequest {
  sessionId: string;
  updates: Partial<Pick<Session, 'status' | 'endTime' | 'metadata'>>;
}

export interface SessionCleanupConfig {
  maxAge: number; // milliseconds
  maxSessions: number;
  cleanupInterval: number; // milliseconds
  keepCompletedSessions: number; // how many completed sessions to keep
  keepErrorSessions: number; // how many error sessions to keep
}

// Events for session management
export interface SessionEvent {
  type: 'created' | 'started' | 'completed' | 'error' | 'cancelled' | 'cleanup';
  sessionId: string;
  projectId: string;
  timestamp: string;
  data?: any;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  commandCount: number;
  responseCount: number;
  bytesTransferred: number;
  fileChanges: number;
  errors: number;
  memoryUsage?: number;
  cpuTime?: number;
}