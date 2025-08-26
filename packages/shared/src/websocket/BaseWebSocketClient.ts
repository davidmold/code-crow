import { io, Socket } from 'socket.io-client';
import { 
  SOCKET_EVENTS,
  CONNECTION_STATES,
  MESSAGE_TIMEOUTS,
  MessageFactory,
  ConnectionState
} from '../protocols/communication.js';
import { ConnectionAuth, ErrorMessage } from '../types/websocket.js';

export interface BaseWebSocketClientOptions {
  serverUrl?: string;
  clientId?: string;
  timeout?: number;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  heartbeatInterval?: number;
}

export abstract class BaseWebSocketClient {
  protected socket: Socket | null = null;
  protected connectionState: ConnectionState = CONNECTION_STATES.DISCONNECTED;
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts: number;
  protected heartbeatInterval: NodeJS.Timeout | null = null;
  protected heartbeatIntervalMs: number;
  private reconnectionStrategy: 'exponential' | 'linear' = 'exponential';
  
  protected readonly serverUrl: string;
  protected readonly clientId: string;
  protected readonly timeout: number;
  protected readonly reconnectionDelay: number;

  constructor(
    protected clientType: 'web' | 'agent',
    options: BaseWebSocketClientOptions = {}
  ) {
    this.serverUrl = options.serverUrl || 'http://localhost:8080';
    this.clientId = options.clientId || `${clientType}-${Date.now()}`;
    this.timeout = options.timeout || MESSAGE_TIMEOUTS.AUTH;
    this.maxReconnectAttempts = options.reconnectionAttempts || 5;
    this.reconnectionDelay = options.reconnectionDelay || 2000;
    this.heartbeatIntervalMs = options.heartbeatInterval || MESSAGE_TIMEOUTS.HEARTBEAT;
  }

  async connect(): Promise<boolean> {
    try {
      if (this.socket && this.socket.connected && this.connectionState === CONNECTION_STATES.CONNECTED) {
        console.log(`🔌 Already connected to server: ${this.serverUrl}`);
        return true;
      }

      console.log(`🔌 Connecting ${this.clientType} to server: ${this.serverUrl} (clientId: ${this.clientId})`);
      this.connectionState = CONNECTION_STATES.CONNECTING;

      if (this.socket) {
        console.log(`🔌 Disconnecting existing socket before reconnecting (id: ${this.socket.id})`);
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: this.timeout,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectionDelay,
        autoConnect: false
      });

      this.setupBaseEventHandlers();
      this.setupEventHandlers();
      this.socket.connect();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('⏰ Connection timeout');
          this.connectionState = CONNECTION_STATES.ERROR;
          reject(new Error('Connection timeout'));
        }, this.timeout + 5000);

        this.socket!.once('connect', async () => {
          console.log(`🔌 ${this.clientType} socket connected, starting authentication...`);
          try {
            const success = await this.authenticate();
            clearTimeout(timeout);
            resolve(success);
          } catch (error) {
            clearTimeout(timeout);
            console.error('❌ Authentication failed:', error);
            this.connectionState = CONNECTION_STATES.ERROR;
            reject(error);
          }
        });

        this.socket!.once('connect_error', (error) => {
          console.error('❌ Connection error:', error);
          clearTimeout(timeout);
          this.connectionState = CONNECTION_STATES.ERROR;
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.connectionState = CONNECTION_STATES.ERROR;
      return false;
    }
  }

  private async authenticate(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const authData: ConnectionAuth = MessageFactory.createMessage('auth', {
        clientType: this.clientType,
        clientId: this.clientId,
        version: '1.0.0'
      });

      console.log(`🔐 Sending authentication for ${this.clientType} client: ${this.clientId} (socket: ${this.socket.id})`);

      const timeout = setTimeout(() => {
        console.error(`⏰ Authentication timeout for client: ${this.clientId} (socket: ${this.socket?.id})`);
        this.connectionState = CONNECTION_STATES.ERROR;
        reject(new Error('Authentication timeout'));
      }, this.timeout);

      this.socket.removeAllListeners(SOCKET_EVENTS.AUTH_RESULT);
      
      this.socket.once(SOCKET_EVENTS.AUTH_RESULT, (data) => {
        clearTimeout(timeout);
        if (data && data.success) {
          console.log(`✅ ${this.clientType} client authenticated successfully: ${this.clientId} (socket: ${this.socket?.id})`);
          this.connectionState = CONNECTION_STATES.CONNECTED;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.onAuthenticated();
          resolve(true);
        } else {
          console.error(`❌ Authentication failed for ${this.clientId}:`, data?.message || 'Unknown auth error');
          this.connectionState = CONNECTION_STATES.ERROR;
          reject(new Error(data?.message || 'Authentication failed'));
        }
      });

      this.socket.once(SOCKET_EVENTS.ERROR, (error) => {
        clearTimeout(timeout);
        console.error(`❌ Authentication error for ${this.clientId}:`, error);
        this.connectionState = CONNECTION_STATES.ERROR;
        reject(new Error(error.error?.message || 'Authentication error'));
      });

      this.socket.emit(SOCKET_EVENTS.AUTH, authData);
      console.log(`📤 Authentication message sent for ${this.clientType} client: ${this.clientId}`);
    });
  }

  private setupBaseEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log(`🔌 ${this.clientType} socket connected to server`);
      this.connectionState = CONNECTION_STATES.CONNECTING;
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 ${this.clientType} disconnected: ${reason}`);
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      this.stopHeartbeat();
      
      // Handle different disconnect reasons
      this.handleDisconnectReason(reason);
      this.onDisconnected(reason);
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`🔄 ${this.clientType} reconnected after ${attempt} attempts`);
      this.connectionState = CONNECTION_STATES.CONNECTING;
      this.authenticate().catch((error) => {
        console.error('❌ Re-authentication failed:', error);
        this.connectionState = CONNECTION_STATES.ERROR;
        this.handleReconnectionFailure(error);
      });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error(`🔄 ${this.clientType} reconnection failed:`, error);
      this.connectionState = CONNECTION_STATES.ERROR;
      this.handleReconnectionError(error);
    });
    
    // Handle reconnect_failed event
    this.socket.on('reconnect_failed', () => {
      console.error(`🔄 ${this.clientType} reconnection permanently failed`);
      this.connectionState = CONNECTION_STATES.ERROR;
      this.handlePermanentReconnectionFailure();
    });

    this.socket.on(SOCKET_EVENTS.HEARTBEAT_RESPONSE, () => {
      // Server responded to heartbeat - connection is healthy
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (error: ErrorMessage) => {
      console.error(`❌ ${this.clientType} server error:`, error);
      this.onError(error);
    });

    this.socket.on('error', (error) => {
      console.error(`❌ ${this.clientType} socket error:`, error);
      this.connectionState = CONNECTION_STATES.ERROR;
      this.handleSocketError(error);
    });
    
    // Handle browser-specific events for web clients (only in browser environments)
    if (this.clientType === 'web' && this.isBrowserEnvironment()) {
      this.setupBrowserEventHandlers();
    }
  }

  protected startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connectionState === CONNECTION_STATES.CONNECTED) {
        this.socket.emit(SOCKET_EVENTS.HEARTBEAT);
      }
    }, this.heartbeatIntervalMs);
  }

  protected stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect(): void {
    console.log(`🔌 Disconnecting ${this.clientType} client (clientId: ${this.clientId})...`);
    
    this.stopHeartbeat();
    
    if (this.socket) {
      console.log(`🔌 Disconnecting socket: ${this.socket.id}`);
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.onDisconnected('manual_disconnect');
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === CONNECTION_STATES.CONNECTED && this.socket?.connected === true;
  }

  getStats() {
    return {
      connectionState: this.connectionState,
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      clientId: this.clientId,
      serverUrl: this.serverUrl,
      clientType: this.clientType
    };
  }

  private handleDisconnectReason(reason: string) {
    switch (reason) {
      case 'transport close':
      case 'transport error':
        console.warn(`🌐 ${this.clientType} network issue detected, will retry connection`);
        break;
      case 'ping timeout':
        console.warn(`💗 ${this.clientType} heartbeat timeout, connection lost`);
        break;
      case 'io server disconnect':
        console.warn(`🚫 ${this.clientType} server forcibly disconnected client`);
        break;
      case 'io client disconnect':
        console.log(`👋 ${this.clientType} client initiated disconnect`);
        break;
      default:
        console.warn(`❓ ${this.clientType} disconnected for unknown reason: ${reason}`);
    }
  }

  private handleReconnectionFailure(_error: unknown) {
    this.reconnectAttempts++;
    const delay = this.getReconnectionDelay();
    console.warn(`🔄 ${this.clientType} will retry connection in ${delay}ms (attempt ${this.reconnectAttempts})`);
  }

  private handleReconnectionError(error: unknown) {
    console.error(`🔄 ${this.clientType} reconnection error:`, error);
    this.reconnectAttempts++;
  }

  private handlePermanentReconnectionFailure() {
    console.error(`💀 ${this.clientType} failed to reconnect after ${this.maxReconnectAttempts} attempts`);
    this.connectionState = CONNECTION_STATES.ERROR;
  }

  private handleSocketError(error: unknown) {
    console.error(`🔌 ${this.clientType} socket error:`, error);
    
    // Categorize socket errors
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('ECONNREFUSED')) {
      console.error(`🚫 ${this.clientType} connection refused - server may be down`);
    } else if (errorMsg.includes('ETIMEDOUT')) {
      console.error(`⏰ ${this.clientType} connection timeout - network issues`);
    } else if (errorMsg.includes('ENOTFOUND')) {
      console.error(`🌐 ${this.clientType} DNS resolution failed - check server URL`);
    }
  }

  private isBrowserEnvironment(): boolean {
    return typeof globalThis !== 'undefined' && 
           'window' in globalThis && 
           'document' in globalThis;
  }

  private setupBrowserEventHandlers() {
    // This method should only be called if isBrowserEnvironment() returns true
    const win = (globalThis as typeof globalThis & { window?: any }).window;
    const doc = (globalThis as typeof globalThis & { document?: any }).document;

    // Handle visibility changes (tab backgrounding)
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) {
        console.log(`👁️ ${this.clientType} tab hidden, reducing heartbeat frequency`);
        this.adjustHeartbeatForBackground();
      } else {
        console.log(`👁️ ${this.clientType} tab visible, resuming normal heartbeat`);
        this.resumeNormalHeartbeat();
      }
    });

    // Handle online/offline events
    win.addEventListener('online', () => {
      console.log(`🌐 ${this.clientType} network back online, attempting reconnection`);
      if (!this.isConnected()) {
        this.connect().catch(console.error);
      }
    });

    win.addEventListener('offline', () => {
      console.warn(`🌐 ${this.clientType} network offline detected`);
    });

    // Handle beforeunload to clean up
    win.addEventListener('beforeunload', () => {
      console.log(`👋 ${this.clientType} page unloading, disconnecting gracefully`);
      this.disconnect();
    });
  }

  private getReconnectionDelay(): number {
    if (this.reconnectionStrategy === 'exponential') {
      // Exponential backoff with jitter
      const baseDelay = this.reconnectionDelay;
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), 30000);
      const jitter = Math.random() * 1000;
      return exponentialDelay + jitter;
    } else {
      // Linear backoff
      return this.reconnectionDelay * (1 + this.reconnectAttempts);
    }
  }

  private adjustHeartbeatForBackground() {
    // Reduce heartbeat frequency when tab is hidden
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connectionState === CONNECTION_STATES.CONNECTED) {
        this.socket.emit(SOCKET_EVENTS.HEARTBEAT);
      }
    }, this.heartbeatIntervalMs * 3); // 3x less frequent
  }

  private resumeNormalHeartbeat() {
    // Resume normal heartbeat frequency
    this.stopHeartbeat();
    this.startHeartbeat();
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract setupEventHandlers(): void;
  protected abstract onAuthenticated(): void;
  protected abstract onDisconnected(reason: string): void;
  protected abstract onError(error: ErrorMessage): void;
}