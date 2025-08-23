import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { 
  SOCKET_EVENTS, 
  MessageFactory, 
  RoomManager, 
  ConnectionAuth,
  ExecuteCommand,
  JoinProject,
  LeaveProject,
  ConnectionResult,
  CommandResult,
  ErrorMessage,
  AgentCommand,
  CommandResponse,
  AgentStatus,
  FileChange,
  ConnectionStatus
} from '@code-crow/shared';
import { SessionManager } from '../services/sessionManager.js';

export class WebSocketServer {
  private io: SocketIOServer;
  private clients = new Map<string, { socket: Socket; type: 'web' | 'agent'; lastSeen: Date }>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionManager: SessionManager;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.sessionManager = SessionManager.getInstance();
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers() {
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
      console.log(`🔌 New connection: ${socket.id}`);
      
      // Handle authentication
      socket.on(SOCKET_EVENTS.AUTH, (data: ConnectionAuth) => {
        this.handleAuth(socket, data);
      });

      // Handle disconnection
      socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
        this.handleDisconnect(socket, reason);
      });

      // Set up timeout for authentication
      const authTimeout = setTimeout(() => {
        if (!this.clients.has(socket.id)) {
          console.log(`⏰ Authentication timeout for ${socket.id}`);
          socket.disconnect();
        }
      }, 10000); // 10 second auth timeout

      socket.once(SOCKET_EVENTS.AUTH, () => {
        clearTimeout(authTimeout);
      });
    });
  }

  private handleAuth(socket: Socket, data: ConnectionAuth) {
    try {
      console.log(`🔐 Authentication request from ${socket.id}: ${data.clientType}`);
      
      // Validate auth data
      if (!data.clientType || !['web', 'agent'].includes(data.clientType)) {
        const errorResponse: ErrorMessage = MessageFactory.createMessage('error', {
          error: {
            code: 'INVALID_CLIENT_TYPE',
            message: 'Client type must be "web" or "agent"'
          }
        });
        socket.emit(SOCKET_EVENTS.ERROR, errorResponse);
        socket.disconnect();
        return;
      }

      // Store client info
      this.clients.set(socket.id, {
        socket,
        type: data.clientType,
        lastSeen: new Date()
      });

      // Join appropriate rooms
      if (data.clientType === 'agent') {
        socket.join(RoomManager.getAgentRoom());
        this.setupAgentHandlers(socket);
      } else {
        socket.join(RoomManager.getWebRoom());
        this.setupWebHandlers(socket);
      }

      // Send authentication success
      const authResult: ConnectionResult = MessageFactory.createMessage('auth_result', {
        success: true,
        clientId: socket.id
      });
      socket.emit(SOCKET_EVENTS.AUTH_RESULT, authResult);

      // Send immediate connection status to the authenticated client
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

      // Also broadcast to all web clients
      this.broadcastConnectionStatus();

      console.log(`✅ ${data.clientType} client authenticated: ${socket.id}`);
    } catch (error) {
      console.error('Authentication error:', error);
      const errorResponse: ErrorMessage = MessageFactory.createMessage('error', {
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed'
        }
      });
      socket.emit(SOCKET_EVENTS.ERROR, errorResponse);
      socket.disconnect();
    }
  }

  private setupWebHandlers(socket: Socket) {
    // Execute command handler
    socket.on(SOCKET_EVENTS.EXECUTE_COMMAND, (data: ExecuteCommand) => {
      this.handleExecuteCommand(socket, data);
    });

    // Project room management
    socket.on(SOCKET_EVENTS.JOIN_PROJECT, (data: JoinProject) => {
      const projectRoom = RoomManager.getProjectRoom(data.projectId);
      socket.join(projectRoom);
      console.log(`📁 ${socket.id} joined project ${data.projectId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_PROJECT, (data: LeaveProject) => {
      const projectRoom = RoomManager.getProjectRoom(data.projectId);
      socket.leave(projectRoom);
      console.log(`📁 ${socket.id} left project ${data.projectId}`);
    });

    // Permission response handler
    socket.on('permission:response', (response: any) => {
      console.log(`🔐 Forwarding permission response from web client: ${response.requestId} -> ${response.decision}`);
      
      // Forward to all agents (they will filter by requestId)
      this.io.sockets.sockets.forEach((agentSocket) => {
        const agentClient = this.clients.get(agentSocket.id);
        if (agentClient && agentClient.type === 'agent') {
          agentSocket.emit('permission:response', response);
        }
      });
    });

    // Session management
    socket.on('session:clear', (data: { sessionId: string }) => {
      console.log(`🗑️ Session clear request from web client ${socket.id}: ${data.sessionId}`);
      // Forward to agents
      this.io.to(RoomManager.getAgentRoom()).emit('session:clear', data);
    });

    socket.on('session:status', (data: { sessionId: string }) => {
      console.log(`📊 Session status request from web client ${socket.id}: ${data.sessionId}`);
      // Forward to agents
      this.io.to(RoomManager.getAgentRoom()).emit('session:status', data);
    });

    // Heartbeat
    socket.on(SOCKET_EVENTS.HEARTBEAT, () => {
      this.updateClientLastSeen(socket.id);
      socket.emit(SOCKET_EVENTS.HEARTBEAT_RESPONSE, {
        serverTime: new Date().toISOString()
      });
    });
  }

  private setupAgentHandlers(socket: Socket) {
    // Command response handler
    socket.on(SOCKET_EVENTS.COMMAND_RESPONSE, (data: CommandResponse) => {
      this.handleCommandResponse(socket, data);
    });

    // Agent status handler
    socket.on(SOCKET_EVENTS.AGENT_STATUS, (data: AgentStatus) => {
      console.log(`🤖 Agent status update: ${data.status}`);
      // Could broadcast this to interested web clients
    });

    // File change handler
    socket.on(SOCKET_EVENTS.FILE_CHANGE, (data: FileChange) => {
      this.handleFileChange(socket, data);
    });

    // Permission request handler
    socket.on('permission:request', (request: any) => {
      console.log(`🔐 Forwarding permission request from agent: ${request.id} for ${request.toolName}`);
      
      // Forward to all web clients
      this.io.sockets.sockets.forEach((webSocket) => {
        const webClient = this.clients.get(webSocket.id);
        if (webClient && webClient.type === 'web') {
          webSocket.emit('permission:request', request);
        }
      });
    });

    // Permission timeout handler
    socket.on('permission:timeout', (data: any) => {
      console.log(`⏰ Permission timeout: ${data.requestId}`);
      
      // Forward timeout notification to web clients
      this.io.sockets.sockets.forEach((webSocket) => {
        const webClient = this.clients.get(webSocket.id);
        if (webClient && webClient.type === 'web') {
          webSocket.emit('permission:timeout', data);
        }
      });
    });

    // Session management handlers
    socket.on('session:cleared', (data: { sessionId: string }) => {
      console.log(`🗑️ Agent ${socket.id} cleared session: ${data.sessionId}`);
      // Forward to web clients
      this.io.to(RoomManager.getWebRoom()).emit('session:cleared', data);
    });

    socket.on('session:status', (data: { sessionId: string, exists: boolean, info: any }) => {
      console.log(`📊 Agent ${socket.id} session status: ${data.sessionId} (exists: ${data.exists})`);
      // Forward to web clients
      this.io.to(RoomManager.getWebRoom()).emit('session:status', data);
    });

    socket.on('session:error', (data: { sessionId: string, error: string }) => {
      console.log(`❌ Agent ${socket.id} session error: ${data.sessionId} - ${data.error}`);
      // Forward to web clients
      this.io.to(RoomManager.getWebRoom()).emit('session:error', data);
    });

    // Heartbeat
    socket.on(SOCKET_EVENTS.HEARTBEAT, () => {
      this.updateClientLastSeen(socket.id);
      socket.emit(SOCKET_EVENTS.HEARTBEAT_RESPONSE, {
        serverTime: new Date().toISOString()
      });
    });
  }

  private async handleExecuteCommand(socket: Socket, data: ExecuteCommand) {
    try {
      console.log(`⚡ Execute command from ${socket.id}: ${data.command}`);
      console.log(`🔍 Debug - continueSession: ${data.continueSession}, options: ${JSON.stringify(data.options)}`);
      
      // Use the session ID provided by the client
      const sessionId = data.sessionId;
      
      if (!sessionId) {
        throw new Error('Session ID is required from client');
      }
      
      // Create session record with the client's session ID
      const sessionResult = await this.sessionManager.createSession({
        projectId: data.projectId,
        sessionId: sessionId, // Use client's session ID
        ...(data.command ? { initialCommand: data.command } : {}),
        ...(data.workingDirectory ? { workingDirectory: data.workingDirectory } : {}),
        ...(socket.id ? { clientId: socket.id } : {}),
        options: {
          timeoutMs: 300000 // 5 minutes
        }
      });

      if (!sessionResult.success) {
        throw new Error(sessionResult.error || 'Failed to create session');
      }
      
      // Create agent command
      const agentCommand: AgentCommand = MessageFactory.createMessage('agent_command', {
        sessionId,
        command: data.command,
        projectId: data.projectId,
        ...(data.workingDirectory ? { workingDirectory: data.workingDirectory } : {}),
        options: {
          ...(data.workingDirectory ? { cwd: data.workingDirectory } : {}),
          continueSession: data.continueSession,
          timeoutMs: 300000
        }
      });

      // Send to agents
      this.io.to(RoomManager.getAgentRoom()).emit(SOCKET_EVENTS.AGENT_COMMAND, agentCommand);
      
      console.log(`📤 Forwarded command to agents: ${sessionId}`);
    } catch (error) {
      console.error('Execute command error:', error);
      const errorResponse: ErrorMessage = MessageFactory.createMessage('error', {
        error: {
          code: 'EXECUTE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute command'
        },
        sessionId: data.sessionId
      });
      socket.emit(SOCKET_EVENTS.ERROR, errorResponse);
    }
  }

  private async handleCommandResponse(_socket: Socket, data: CommandResponse) {
    try {
      console.log(`📥 Command response from agent: ${data.sessionId}`);
      
      // Get session to find which web client to respond to
      const session = this.sessionManager.getSession(data.sessionId);
      if (!session) {
        console.warn(`Session not found: ${data.sessionId}`);
        return;
      }

      // Add response to session
      this.sessionManager.addResponse(data.sessionId, {
        id: `response_${Date.now()}`,
        sessionId: data.sessionId,
        commandId: `command_${Date.now()}`,
        type: data.error ? 'error' : 'text',
        content: data.data,
        timestamp: new Date().toISOString(),
        isStreaming: !data.isComplete
      });

      // Update session if complete
      if (data.isComplete) {
        await this.sessionManager.updateSession({
          sessionId: data.sessionId,
          updates: {
            status: data.error ? 'error' : 'complete'
          }
        });
      }

      // Forward response to web client
      const commandResult: CommandResult = MessageFactory.createMessage('command_result', {
        sessionId: data.sessionId,
        response: data.data,
        status: data.error ? 'error' : (data.isComplete ? 'complete' : 'streaming')
      });

      // Send to specific client
      if (session.clientId) {
        const client = this.clients.get(session.clientId);
        if (client) {
          client.socket.emit(SOCKET_EVENTS.COMMAND_RESULT, commandResult);
        }
      }

      console.log(`📤 Forwarded response to web client: ${data.sessionId}`);
    } catch (error) {
      console.error('Command response error:', error);
    }
  }

  private handleFileChange(_socket: Socket, data: FileChange) {
    try {
      // Get session to find project
      const session = this.sessionManager.getSession(data.sessionId);
      if (session) {
        // Broadcast file change to project room
        const projectRoom = RoomManager.getProjectRoom(session.projectId);
        this.io.to(projectRoom).emit(SOCKET_EVENTS.FILE_CHANGE, data);
        console.log(`📝 File change broadcasted: ${data.filePath}`);
      }
    } catch (error) {
      console.error('File change error:', error);
    }
  }

  private handleDisconnect(socket: Socket, reason: string) {
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

  private updateClientLastSeen(socketId: string) {
    const client = this.clients.get(socketId);
    if (client) {
      client.lastSeen = new Date();
    }
  }

  private broadcastConnectionStatus() {
    const agents = Array.from(this.clients.values()).filter(c => c.type === 'agent');
    const connectionStatus: ConnectionStatus = MessageFactory.createMessage('connection_status', {
      agentConnected: agents.length > 0,
      activeAgents: agents.length,
      serverStatus: 'healthy'
    });

    this.io.to(RoomManager.getWebRoom()).emit(SOCKET_EVENTS.CONNECTION_STATUS, connectionStatus);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      // Clean up old sessions
      // Session cleanup happens automatically via the SessionManager's internal interval
      
      // Check for stale connections
      const now = new Date();
      for (const [socketId, client] of this.clients.entries()) {
        const timeSinceLastSeen = now.getTime() - client.lastSeen.getTime();
        if (timeSinceLastSeen > 60000) { // 60 seconds
          console.log(`🕰️ Stale connection detected: ${socketId}`);
          client.socket.disconnect();
        }
      }
    }, 30000); // Every 30 seconds
  }

  public getConnectedClients() {
    return {
      total: this.clients.size,
      web: Array.from(this.clients.values()).filter(c => c.type === 'web').length,
      agents: Array.from(this.clients.values()).filter(c => c.type === 'agent').length
    };
  }

  public stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.sessionManager.stop();
    this.io.close();
  }
}