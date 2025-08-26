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

  static isValidMessage(data: unknown): data is AnyMessage {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as Record<string, unknown>).id === 'string' &&
      typeof (data as Record<string, unknown>).timestamp === 'string' &&
      typeof (data as Record<string, unknown>).type === 'string'
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

// SessionManager has been consolidated to the server package
// Use the comprehensive SessionManager from @code-crow/server instead

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