import { Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  MessageFactory,
  RoomManager,
  ConnectionStatus,
  AgentStatus,
  FileChange,
  PermissionRequest,
  PermissionResponse
} from '@code-crow/shared';
import { SessionManager } from '../../services/sessionManager.js';
import { Server } from 'socket.io';

interface ClientInfo {
  socket: Socket;
  type: 'web' | 'agent';
  lastSeen: Date;
}

export class ConnectionManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private clients: Map<string, ClientInfo>,
    private sessionManager: SessionManager,
    private forwardToClientType: (clientType: 'web' | 'agent', event: string, data: unknown) => void,
    private broadcastToRoom: (roomName: string, event: string, data: unknown) => void,
    private _io: Server, // Socket.io server instance (reserved for future use)
    private staleConnectionTimeout: number,
    private heartbeatInterval_ms: number
  ) {}

  setupPermissionHandlers(socket: Socket): void {
    // Permission request handler (from agents to web clients)
    socket.on('permission:request', (request: PermissionRequest) => {
      console.log(`🔐 Forwarding permission request from agent: ${request.id} for ${request.toolName}`);
      this.forwardToClientType('web', 'permission:request', request);
    });

    // Permission response handler (from web clients to agents)
    socket.on('permission:response', (response: PermissionResponse) => {
      console.log(`🔐 Forwarding permission response from web client: ${response.requestId} -> ${response.decision}`);
      this.forwardToClientType('agent', 'permission:response', response);
    });

    // Permission timeout handler
    socket.on('permission:timeout', (data: { requestId: string }) => {
      console.log(`⏰ Permission timeout: ${data.requestId}`);
      this.forwardToClientType('web', 'permission:timeout', data);
    });
  }

  setupAgentSpecificHandlers(socket: Socket): void {
    // Agent status handler
    socket.on(SOCKET_EVENTS.AGENT_STATUS, (data: AgentStatus) => {
      console.log(`🤖 Agent status update: ${data.status}`);
      // Could broadcast this to interested web clients
    });

    // File change handler
    socket.on(SOCKET_EVENTS.FILE_CHANGE, (data: FileChange) => {
      this.handleFileChange(socket, data);
    });
  }

  setupHeartbeat(socket: Socket): void {
    socket.on(SOCKET_EVENTS.HEARTBEAT, () => {
      this.updateClientLastSeen(socket.id);
      socket.emit(SOCKET_EVENTS.HEARTBEAT_RESPONSE, {
        serverTime: new Date().toISOString()
      });
    });
  }

  handleDisconnect(socket: Socket, reason: string): void {
    console.log(`🔌 Disconnection: ${socket.id} (${reason})`);
    
    const client = this.clients.get(socket.id);
    if (client) {
      // Clean up any active sessions for this client
      const activeSessions = this.sessionManager.getActiveSessions();
      for (const session of activeSessions) {
        if (session.clientId === socket.id) {
          this.sessionManager.cancelSession(session.id, 'Client disconnected');
        }
      }
    }

    this.clients.delete(socket.id);
    this.broadcastConnectionStatus();
  }

  broadcastConnectionStatus(): void {
    const agents = Array.from(this.clients.values()).filter(c => c.type === 'agent');
    const connectionStatus: ConnectionStatus = MessageFactory.createMessage('connection_status', {
      agentConnected: agents.length > 0,
      activeAgents: agents.length,
      serverStatus: 'healthy'
    });

    this.broadcastToRoom(RoomManager.getWebRoom(), SOCKET_EVENTS.CONNECTION_STATUS, connectionStatus);
  }

  startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      // Clean up old sessions
      // Session cleanup happens automatically via the SessionManager's internal interval
      
      // Check for stale connections
      const now = new Date();
      this.clients.forEach((client, socketId) => {
        const timeSinceLastSeen = now.getTime() - client.lastSeen.getTime();
        if (timeSinceLastSeen > this.staleConnectionTimeout) {
          console.log(`🕰️ Stale connection detected: ${socketId}`);
          client.socket.disconnect();
        }
      });
    }, this.heartbeatInterval_ms);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getConnectedClients(): { total: number, web: number, agents: number } {
    return {
      total: this.clients.size,
      web: Array.from(this.clients.values()).filter(c => c.type === 'web').length,
      agents: Array.from(this.clients.values()).filter(c => c.type === 'agent').length
    };
  }

  private handleFileChange(_socket: Socket, data: FileChange): void {
    try {
      // Get session to find project
      const session = this.sessionManager.getSession(data.sessionId);
      if (session) {
        // Broadcast file change to project room
        const projectRoom = RoomManager.getProjectRoom(session.projectId);
        this.broadcastToRoom(projectRoom, SOCKET_EVENTS.FILE_CHANGE, data);
        console.log(`📝 File change broadcasted: ${data.filePath}`);
      }
    } catch (error) {
      console.error('File change error:', error);
    }
  }

  private updateClientLastSeen(socketId: string): void {
    const client = this.clients.get(socketId);
    if (client) {
      client.lastSeen = new Date();
    }
  }
}