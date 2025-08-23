import { v4 as uuidv4 } from 'uuid';
import { BaseMessage, AnyMessage } from '../types/websocket.js';

export class MessageFactory {
  static createMessage<T extends AnyMessage>(type: T['type'], data: Omit<T, 'id' | 'timestamp' | 'type'>): T {
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      ...data
    } as T;
  }

  static isValidMessage(data: any): data is AnyMessage {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.id === 'string' &&
      typeof data.timestamp === 'string' &&
      typeof data.type === 'string'
    );
  }

  static getMessageAge(message: BaseMessage): number {
    const messageTime = new Date(message.timestamp).getTime();
    const now = Date.now();
    return now - messageTime;
  }
}

export class RoomManager {
  static getProjectRoom(projectId: string): string {
    return `project:${projectId}`;
  }

  static getGlobalRoom(): string {
    return 'global';
  }

  static getAgentRoom(): string {
    return 'agents';
  }

  static getWebRoom(): string {
    return 'web-clients';
  }

  static isProjectRoom(room: string): boolean {
    return room.startsWith('project:');
  }

  static extractProjectId(room: string): string | null {
    if (this.isProjectRoom(room)) {
      return room.substring('project:'.length);
    }
    return null;
  }
}

export class SessionManager {
  private static sessions = new Map<string, any>();

  static createSession(projectId: string, clientId: string, command: string): string {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      projectId,
      clientId,
      command,
      startTime: new Date().toISOString(),
      status: 'running'
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  static getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  static updateSession(sessionId: string, updates: Partial<any>) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  static completeSession(sessionId: string, success: boolean, response?: string, error?: string) {
    this.updateSession(sessionId, {
      status: success ? 'complete' : 'error',
      endTime: new Date().toISOString(),
      response,
      error
    });
  }

  static removeSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  static getActiveSessions(): string[] {
    return Array.from(this.sessions.keys()).filter(id => {
      const session = this.sessions.get(id);
      return session && session.status === 'running';
    });
  }

  static cleanup(maxAge: number = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionTime = new Date(session.startTime).getTime();
      if (now - sessionTime > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  RECONNECT_ERROR: 'reconnect_error',
  
  // Authentication
  AUTH: 'auth',
  AUTH_RESULT: 'auth_result',
  
  // Commands
  EXECUTE_COMMAND: 'execute_command',
  AGENT_COMMAND: 'agent_command',
  COMMAND_RESPONSE: 'command_response',
  COMMAND_RESULT: 'command_result',
  AGENT_STOP: 'agent_stop',
  
  // Project management
  JOIN_PROJECT: 'join_project',
  LEAVE_PROJECT: 'leave_project',
  PROJECT_UPDATE: 'project_update',
  
  // Status and monitoring
  AGENT_STATUS: 'agent_status',
  CONNECTION_STATUS: 'connection_status',
  FILE_CHANGE: 'file_change',
  
  // Heartbeat
  HEARTBEAT: 'heartbeat',
  HEARTBEAT_RESPONSE: 'heartbeat_response',
  
  // Errors
  ERROR: 'error'
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
} as const;

export type ConnectionState = typeof CONNECTION_STATES[keyof typeof CONNECTION_STATES];

export const MESSAGE_TIMEOUTS = {
  HEARTBEAT: 30000, // 30 seconds
  COMMAND: 300000, // 5 minutes
  AUTH: 10000, // 10 seconds
  RECONNECT: 5000 // 5 seconds
} as const;