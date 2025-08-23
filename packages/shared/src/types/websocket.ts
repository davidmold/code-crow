export interface BaseMessage {
  id: string;
  timestamp: string;
  type: string;
}

// Connection and authentication
export interface ConnectionAuth {
  type: 'auth';
  clientType: 'web' | 'agent';
  clientId: string;
  version?: string;
}

export interface ConnectionResult {
  type: 'auth_result';
  success: boolean;
  clientId: string;
  message?: string;
}

// Web Client to Server Messages
export interface ExecuteCommand extends BaseMessage {
  type: 'execute_command';
  projectId: string;
  command: string;
  workingDirectory?: string;
  sessionId: string;
  continueSession?: boolean;
  options?: {
    newSession?: boolean;
  };
}

export interface JoinProject extends BaseMessage {
  type: 'join_project';
  projectId: string;
}

export interface LeaveProject extends BaseMessage {
  type: 'leave_project';
  projectId: string;
}

// Server to Agent Messages
export interface AgentCommand extends BaseMessage {
  type: 'agent_command';
  sessionId: string;
  command: string;
  projectId: string;
  workingDirectory?: string;
  options: {
    cwd?: string;
    allowedTools?: string[];
    systemPrompt?: string;
    maxTurns?: number;
    timeoutMs?: number;
    continueSession?: boolean;
  };
}

export interface AgentStop extends BaseMessage {
  type: 'agent_stop';
  sessionId: string;
  reason?: string;
}

// Agent to Server Messages
export interface CommandResponse extends BaseMessage {
  type: 'command_response';
  sessionId: string;
  data: string;
  isComplete: boolean;
  error?: string;
}

export interface AgentStatus extends BaseMessage {
  type: 'agent_status';
  status: 'ready' | 'busy' | 'error' | 'disconnected';
  currentSessions: string[];
  message?: string;
}

export interface FileChange extends BaseMessage {
  type: 'file_change';
  sessionId: string;
  filePath: string;
  operation: 'create' | 'modify' | 'delete';
  content?: string;
}

// Server to Web Client Messages
export interface CommandResult extends BaseMessage {
  type: 'command_result';
  sessionId: string;
  response: string;
  status: 'streaming' | 'complete' | 'error';
  metadata?: {
    file?: string;
    operation?: string;
  };
}

export interface ProjectUpdate extends BaseMessage {
  type: 'project_update';
  projectId: string;
  files?: any[];
  changes?: FileChange[];
}

export interface ConnectionStatus extends BaseMessage {
  type: 'connection_status';
  agentConnected: boolean;
  activeAgents: number;
  serverStatus: 'healthy' | 'degraded' | 'down';
}

// Error Messages (bidirectional)
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  error: {
    code: string;
    message: string;
    details?: any;
  };
  sessionId?: string;
}

// Heartbeat (bidirectional)
export interface HeartbeatMessage extends BaseMessage {
  type: 'heartbeat';
  clientType: 'web' | 'agent';
}

export interface HeartbeatResponse extends BaseMessage {
  type: 'heartbeat_response';
  serverTime: string;
}

// Union types for message routing
export type WebToServerMessage = 
  | ConnectionAuth
  | ExecuteCommand
  | JoinProject
  | LeaveProject
  | HeartbeatMessage;

export type ServerToAgentMessage = 
  | AgentCommand
  | AgentStop
  | HeartbeatMessage;

export type AgentToServerMessage = 
  | ConnectionAuth
  | CommandResponse
  | AgentStatus
  | FileChange
  | HeartbeatMessage;

export type ServerToWebMessage = 
  | ConnectionResult
  | CommandResult
  | ProjectUpdate
  | ConnectionStatus
  | ErrorMessage
  | HeartbeatResponse;

export type AnyMessage = 
  | WebToServerMessage
  | ServerToAgentMessage
  | AgentToServerMessage
  | ServerToWebMessage
  | ErrorMessage;