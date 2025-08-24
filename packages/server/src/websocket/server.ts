import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@code-crow/shared';
import { SessionManager } from '../services/sessionManager.js';
import { AuthenticationHandler } from './handlers/AuthenticationHandler.js';
import { CommandHandler } from './handlers/CommandHandler.js';
import { SessionHandler } from './handlers/SessionHandler.js';
import { ConnectionManager } from './handlers/ConnectionManager.js';

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

interface ClientInfo {
  socket: Socket;
  type: 'web' | 'agent';
  lastSeen: Date;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private clients = new Map<string, ClientInfo>();
  private sessionManager: SessionManager;

  // Handler instances
  private authHandler!: AuthenticationHandler;
  private commandHandler!: CommandHandler;
  private sessionHandler!: SessionHandler;
  private connectionManager!: ConnectionManager;

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
    
    // Initialize handlers
    this.initializeHandlers();
    
    // Setup core event handlers
    this.setupEventHandlers();
    this.connectionManager.startHeartbeat();
  }

  private initializeHandlers(): void {
    // Initialize connection manager first
    this.connectionManager = new ConnectionManager(
      this.clients,
      this.sessionManager,
      this.forwardToClientType.bind(this),
      this.broadcastToRoom.bind(this),
      this.io,
      WEBSOCKET_CONFIG.TIMEOUTS.STALE_CONNECTION,
      WEBSOCKET_CONFIG.INTERVALS.HEARTBEAT
    );

    // Initialize other handlers
    this.commandHandler = new CommandHandler(
      this.sessionManager,
      this.broadcastToRoom.bind(this),
      WEBSOCKET_CONFIG.TIMEOUTS.SESSION
    );

    this.sessionHandler = new SessionHandler(
      this.broadcastToRoom.bind(this)
    );

    // Initialize auth handler with connection manager reference
    this.authHandler = new AuthenticationHandler(
      this.clients,
      this.setupWebHandlers.bind(this),
      this.setupAgentHandlers.bind(this),
      this.connectionManager.broadcastConnectionStatus.bind(this.connectionManager)
    );
  }

  private forwardToClientType(clientType: 'web' | 'agent', event: string, data: unknown): void {
    this.clients.forEach((client) => {
      if (client.type === clientType) {
        client.socket.emit(event, data);
      }
    });
  }

  private broadcastToRoom(roomName: string, event: string, data: unknown): void {
    this.io.to(roomName).emit(event, data);
  }

  private setupEventHandlers(): void {
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
      console.log(`🔌 New connection: ${socket.id}`);
      this.setupConnectionHandlers(socket);
      this.authHandler.setupAuthenticationTimeout(socket, WEBSOCKET_CONFIG.TIMEOUTS.AUTH);
    });
  }

  private setupConnectionHandlers(socket: Socket): void {
    // Handle authentication
    socket.on(SOCKET_EVENTS.AUTH, (data) => {
      this.authHandler.handleAuth(socket, data);
    });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      this.connectionManager.handleDisconnect(socket, reason);
    });
  }

  private setupWebHandlers(socket: Socket): void {
    // Execute command handler
    socket.on(SOCKET_EVENTS.EXECUTE_COMMAND, (data) => {
      this.commandHandler.handleExecuteCommand(socket, data);
    });

    // Session management
    this.sessionHandler.setupWebHandlers(socket);

    // Permission handling
    this.connectionManager.setupPermissionHandlers(socket);

    // Heartbeat
    this.connectionManager.setupHeartbeat(socket);
  }

  private setupAgentHandlers(socket: Socket): void {
    // Command response handler
    socket.on(SOCKET_EVENTS.COMMAND_RESPONSE, (data) => {
      this.commandHandler.handleCommandResponse(socket, data);
    });

    // Session management
    this.sessionHandler.setupAgentHandlers(socket);

    // Agent-specific handlers
    this.connectionManager.setupAgentSpecificHandlers(socket);

    // Permission handling
    this.connectionManager.setupPermissionHandlers(socket);

    // Heartbeat
    this.connectionManager.setupHeartbeat(socket);
  }

  public getConnectedClients() {
    return this.connectionManager.getConnectedClients();
  }

  public stop() {
    this.connectionManager.stopHeartbeat();
    this.sessionManager.stop();
    this.io.close();
  }
}