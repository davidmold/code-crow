import { Socket } from 'socket.io';
import { 
  SOCKET_EVENTS, 
  MessageFactory, 
  RoomManager, 
  ConnectionAuth,
  ConnectionResult,
  ErrorMessage,
  ConnectionStatus
} from '@code-crow/shared';

interface ClientInfo {
  socket: Socket;
  type: 'web' | 'agent';
  lastSeen: Date;
}

export class AuthenticationHandler {
  constructor(
    private clients: Map<string, ClientInfo>,
    private setupWebHandlers: (socket: Socket) => void,
    private setupAgentHandlers: (socket: Socket) => void,
    private broadcastConnectionStatus: () => void
  ) {}

  setupAuthenticationTimeout(socket: Socket, timeoutMs: number): void {
    const authTimeout = setTimeout(() => {
      if (!this.clients.has(socket.id)) {
        console.log(`⏰ Authentication timeout for ${socket.id}`);
        socket.disconnect();
      }
    }, timeoutMs);

    socket.once(SOCKET_EVENTS.AUTH, () => {
      clearTimeout(authTimeout);
    });
  }

  handleAuth(socket: Socket, data: ConnectionAuth): void {
    try {
      console.log(`🔐 Authentication request from ${socket.id}: ${data.clientType}`);
      
      // Validate auth data
      if (!this.isValidClientType(data.clientType)) {
        this.sendAuthError(socket, 'INVALID_CLIENT_TYPE', 'Client type must be "web" or "agent"');
        return;
      }

      // Store client info
      this.registerClient(socket, data.clientType);

      // Setup client-specific handlers and rooms
      this.setupClientHandlers(socket, data.clientType);

      // Send authentication success
      this.sendAuthSuccess(socket);

      // Send and broadcast connection status
      this.sendConnectionStatus(socket);
      this.broadcastConnectionStatus();

      console.log(`✅ ${data.clientType} client authenticated: ${socket.id}`);
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendAuthError(socket, 'AUTH_ERROR', 'Authentication failed');
    }
  }

  private isValidClientType(clientType: string): clientType is 'web' | 'agent' {
    return Boolean(clientType) && ['web', 'agent'].includes(clientType);
  }

  private registerClient(socket: Socket, clientType: 'web' | 'agent'): void {
    this.clients.set(socket.id, {
      socket,
      type: clientType,
      lastSeen: new Date()
    });
  }

  private setupClientHandlers(socket: Socket, clientType: 'web' | 'agent'): void {
    // Join appropriate rooms
    if (clientType === 'agent') {
      socket.join(RoomManager.getAgentRoom());
      this.setupAgentHandlers(socket);
    } else {
      socket.join(RoomManager.getWebRoom());
      this.setupWebHandlers(socket);
    }
  }

  private sendAuthSuccess(socket: Socket): void {
    const authResult: ConnectionResult = MessageFactory.createMessage('auth_result', {
      success: true,
      clientId: socket.id
    });
    socket.emit(SOCKET_EVENTS.AUTH_RESULT, authResult);
  }

  private sendConnectionStatus(socket: Socket): void {
    const agents = Array.from(this.clients.values()).filter(c => c.type === 'agent');
    const connectionStatus: ConnectionStatus = MessageFactory.createMessage('connection_status', {
      agentConnected: agents.length > 0,
      activeAgents: agents.length,
      serverStatus: 'healthy'
    });
    
    console.log(`📡 Sending connection status to ${socket.id}:`, {
      agentConnected: connectionStatus.agentConnected,
      activeAgents: connectionStatus.activeAgents,
      serverStatus: connectionStatus.serverStatus
    });
    
    socket.emit(SOCKET_EVENTS.CONNECTION_STATUS, connectionStatus);
  }

  private sendAuthError(socket: Socket, code: string, message: string): void {
    const errorResponse: ErrorMessage = MessageFactory.createMessage('error', {
      error: { code, message }
    });
    socket.emit(SOCKET_EVENTS.ERROR, errorResponse);
    socket.disconnect();
  }
}