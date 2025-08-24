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
  ConnectionStatus,
  ApiOptionsHelper
} from '@code-crow/shared';
import { SessionManager } from '../services/sessionManager.js';

const WEBSOCKET_CONFIG = {
  TIMEOUTS: {
    AUTH: 10000,        // 10 seconds
    SESSION: 300000,    // 5 minutes  
    STALE_CONNECTION: 60000, // 1 minute
  },
  INTERVALS: {
    HEARTBEAT: 30000,   // 30 seconds
    PING: 25000,        // 25 seconds
  },
  SOCKET: {
    PING_TIMEOUT: 60000,
    PING_INTERVAL: 25000,
  }
} as const;

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
      pingTimeout: WEBSOCKET_CONFIG.SOCKET.PING_TIMEOUT,
      pingInterval: WEBSOCKET_CONFIG.SOCKET.PING_INTERVAL
    });

    this.sessionManager = SessionManager.getInstance();
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private forwardToClientType(clientType: 'web' | 'agent', event: string, data: any) {
    this.clients.forEach((client) => {
      if (client.type === clientType) {
        client.socket.emit(event, data);
      }
    });
  }

  private broadcastToRoom(roomName: string, event: string, data: any) {
    this.io.to(roomName).emit(event, data);
  }

  private setupEventHandlers() {
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
      console.log(`🔌 New connection: ${socket.id}`);
      this.setupConnectionHandlers(socket);
      this.setupAuthenticationTimeout(socket);
    });
  }

  private setupConnectionHandlers(socket: Socket) {
    // Handle authentication
    socket.on(SOCKET_EVENTS.AUTH, (data: ConnectionAuth) => {
      this.handleAuth(socket, data);
    });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      this.handleDisconnect(socket, reason);
    });
  }

  private setupAuthenticationTimeout(socket: Socket) {
    const authTimeout = setTimeout(() => {
      if (!this.clients.has(socket.id)) {
        console.log(`⏰ Authentication timeout for ${socket.id}`);
        socket.disconnect();
      }
    }, WEBSOCKET_CONFIG.TIMEOUTS.AUTH);

    socket.once(SOCKET_EVENTS.AUTH, () => {
      clearTimeout(authTimeout);
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
      this.forwardToClientType('agent', 'permission:response', response);
    });

    // Session management
    socket.on('session:clear', (data: { sessionId: string }) => {
      console.log(`🗑️ Session clear request from web client ${socket.id}: ${data.sessionId}`);
      // Forward to agents
      this.broadcastToRoom(RoomManager.getAgentRoom(), 'session:clear', data);
    });

    socket.on('session:status', (data: { sessionId: string }) => {
      console.log(`📊 Session status request from web client ${socket.id}: ${data.sessionId}`);
      // Forward to agents
      this.broadcastToRoom(RoomManager.getAgentRoom(), 'session:status', data);
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
      this.forwardToClientType('web', 'permission:request', request);
    });

    // Permission timeout handler
    socket.on('permission:timeout', (data: any) => {
      console.log(`⏰ Permission timeout: ${data.requestId}`);
      
      // Forward timeout notification to web clients
      this.forwardToClientType('web', 'permission:timeout', data);
    });

    // Session management handlers
    socket.on('session:cleared', (data: { sessionId: string }) => {
      console.log(`🗑️ Agent ${socket.id} cleared session: ${data.sessionId}`);
      // Forward to web clients
      this.broadcastToRoom(RoomManager.getWebRoom(), 'session:cleared', data);
    });

    socket.on('session:status', (data: { sessionId: string, exists: boolean, info: any }) => {
      console.log(`📊 Agent ${socket.id} session status: ${data.sessionId} (exists: ${data.exists})`);
      // Forward to web clients
      this.broadcastToRoom(RoomManager.getWebRoom(), 'session:status', data);
    });

    socket.on('session:error', (data: { sessionId: string, error: string }) => {
      console.log(`❌ Agent ${socket.id} session error: ${data.sessionId} - ${data.error}`);
      // Forward to web clients
      this.broadcastToRoom(RoomManager.getWebRoom(), 'session:error', data);
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
      
      const mergedApiOptions = this.mergeApiOptions(data);
      await this.createSessionForCommand(data, socket.id);
      const agentCommand = this.buildAgentCommand(data, mergedApiOptions);
      
      await this.forwardCommandToAgents(agentCommand);
      
    } catch (error) {
      this.handleCommandError(socket, data, error);
    }
  }

  private mergeApiOptions(data: ExecuteCommand) {
    const mergedApiOptions = ApiOptionsHelper.mergeCompatibilityOptions(
      data.apiOptions,
      {
        ...(data.workingDirectory ? { workingDirectory: data.workingDirectory } : {}),
        ...(data.continueSession !== undefined ? { continueSession: data.continueSession } : {})
        // Note: data.options only contains { newSession?: boolean } so we don't merge those Claude Code options here
      }
    );

    console.log(`🔍 Debug - merged apiOptions:`, JSON.stringify(mergedApiOptions, null, 2));
    return mergedApiOptions;
  }

  private async createSessionForCommand(data: ExecuteCommand, socketId: string) {
    const sessionId = data.sessionId;
    
    if (!sessionId) {
      throw new Error('Session ID is required from client');
    }
    
    const sessionResult = await this.sessionManager.createSession({
      projectId: data.projectId,
      sessionId: sessionId,
      ...(data.command ? { initialCommand: data.command } : {}),
      ...(data.workingDirectory ? { workingDirectory: data.workingDirectory } : {}),
      ...(socketId ? { clientId: socketId } : {}),
      options: {
        timeoutMs: WEBSOCKET_CONFIG.TIMEOUTS.SESSION
      }
    });

    if (!sessionResult.success) {
      throw new Error(sessionResult.error || 'Failed to create session');
    }
    
    return sessionResult;
  }

  private buildAgentCommand(data: ExecuteCommand, mergedApiOptions: any): AgentCommand {
    return MessageFactory.createMessage('agent_command', {
      sessionId: data.sessionId,
      command: data.command,
      projectId: data.projectId,
      apiOptions: {
        ...mergedApiOptions,
        // Ensure we have a default timeout if not specified
        timeoutMs: mergedApiOptions.timeoutMs || WEBSOCKET_CONFIG.TIMEOUTS.SESSION
      }
    });
  }

  private async forwardCommandToAgents(agentCommand: AgentCommand) {
    this.broadcastToRoom(RoomManager.getAgentRoom(), SOCKET_EVENTS.AGENT_COMMAND, agentCommand);
    console.log(`📤 Forwarded command to agents: ${agentCommand.sessionId}`);
  }

  private handleCommandError(socket: Socket, data: ExecuteCommand, error: unknown) {
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

  private async handleCommandResponse(_socket: Socket, data: CommandResponse) {
    try {
      console.log(`📥 Command response from agent: ${data.sessionId}`);
      
      const session = this.getSessionForResponse(data.sessionId);
      if (!session) return;

      await this.addResponseToSession(data);
      await this.updateSessionIfComplete(data);
      await this.forwardResponseToWebClient(data, session);
      
    } catch (error) {
      console.error('Command response error:', error);
    }
  }

  private getSessionForResponse(sessionId: string) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      console.warn(`Session not found: ${sessionId}`);
      return null;
    }
    return session;
  }

  private async addResponseToSession(data: CommandResponse) {
    this.sessionManager.addResponse(data.sessionId, {
      id: `response_${Date.now()}`,
      sessionId: data.sessionId,
      commandId: `command_${Date.now()}`,
      type: data.error ? 'error' : 'text',
      content: data.data,
      timestamp: new Date().toISOString(),
      isStreaming: !data.isComplete
    });
  }

  private async updateSessionIfComplete(data: CommandResponse) {
    if (data.isComplete) {
      await this.sessionManager.updateSession({
        sessionId: data.sessionId,
        updates: {
          status: data.error ? 'error' : 'complete'
        }
      });
    }
  }

  private async forwardResponseToWebClient(data: CommandResponse, session: any) {
    const commandResult: CommandResult = MessageFactory.createMessage('command_result', {
      sessionId: data.sessionId,
      response: data.data,
      status: data.error ? 'error' : (data.isComplete ? 'complete' : 'streaming'),
      ...(data.claudeSessionId ? { claudeSessionId: data.claudeSessionId } : {})
    });

    // Send to specific client
    if (session.clientId) {
      const client = this.clients.get(session.clientId);
      if (client) {
        client.socket.emit(SOCKET_EVENTS.COMMAND_RESULT, commandResult);
      }
    }

    console.log(`📤 Forwarded response to web client: ${data.sessionId}`);
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

    this.broadcastToRoom(RoomManager.getWebRoom(), SOCKET_EVENTS.CONNECTION_STATUS, connectionStatus);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      // Clean up old sessions
      // Session cleanup happens automatically via the SessionManager's internal interval
      
      // Check for stale connections
      const now = new Date();
      this.clients.forEach((client, socketId) => {
        const timeSinceLastSeen = now.getTime() - client.lastSeen.getTime();
        if (timeSinceLastSeen > WEBSOCKET_CONFIG.TIMEOUTS.STALE_CONNECTION) {
          console.log(`🕰️ Stale connection detected: ${socketId}`);
          client.socket.disconnect();
        }
      });
    }, WEBSOCKET_CONFIG.INTERVALS.HEARTBEAT);
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