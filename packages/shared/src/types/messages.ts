export interface SessionInfo {
  id: string;
  projectId: string;
  command: string;
  startTime: string;
  status: 'running' | 'complete' | 'error' | 'cancelled';
  clientId: string;
  workingDirectory?: string;
}

export interface ClientInfo {
  id: string;
  type: 'web' | 'agent';
  connectedAt: string;
  lastSeen: string;
  rooms: string[];
  metadata?: {
    userAgent?: string;
    version?: string;
    capabilities?: string[];
  };
}

export interface RoomInfo {
  name: string;
  type: 'project' | 'global';
  members: string[];
  createdAt: string;
  projectId?: string;
}

export interface ClaudeCodeOptions {
  cwd?: string;
  allowedTools?: string[];
  systemPrompt?: string;
  maxTurns?: number;
  timeoutMs?: number;
}

export interface ExecutionContext {
  sessionId: string;
  projectId: string;
  workingDirectory?: string;
  command: string;
  options: ClaudeCodeOptions;
  clientId: string;
}

export interface StreamingChunk {
  sessionId: string;
  chunk: string;
  type: 'stdout' | 'stderr' | 'response';
  timestamp: string;
}

export interface CommandHistory {
  sessionId: string;
  command: string;
  projectId: string;
  startTime: string;
  endTime?: string;
  success: boolean;
  response?: string;
  error?: string;
}

// Event payload types for Socket.io
export interface SocketEventMap {
  // Client events
  'auth': (data: { clientType: 'web' | 'agent'; clientId: string; version?: string }) => void;
  'execute_command': (data: { projectId: string; command: string; workingDirectory?: string; sessionId: string }) => void;
  'join_project': (data: { projectId: string }) => void;
  'leave_project': (data: { projectId: string }) => void;
  'heartbeat': () => void;
  
  // Server events
  'auth_result': (data: { success: boolean; clientId: string; message?: string }) => void;
  'command_result': (data: { sessionId: string; response: string; status: 'streaming' | 'complete' | 'error'; metadata?: any }) => void;
  'project_update': (data: { projectId: string; files?: any[]; changes?: any[] }) => void;
  'connection_status': (data: { agentConnected: boolean; activeAgents: number; serverStatus: string }) => void;
  'error': (data: { code: string; message: string; details?: any; sessionId?: string }) => void;
  'heartbeat_response': (data: { serverTime: string }) => void;
  
  // Agent events
  'agent_command': (data: { sessionId: string; command: string; projectId: string; workingDirectory?: string; options: ClaudeCodeOptions }) => void;
  'agent_stop': (data: { sessionId: string; reason?: string }) => void;
  'command_response': (data: { sessionId: string; data: string; isComplete: boolean; error?: string }) => void;
  'agent_status': (data: { status: string; currentSessions: string[]; message?: string }) => void;
  'file_change': (data: { sessionId: string; filePath: string; operation: string; content?: string }) => void;
  
  // Connection events
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'reconnect': (attemptNumber: number) => void;
  'reconnect_error': (error: Error) => void;
}