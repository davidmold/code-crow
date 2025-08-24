import { io, Socket } from 'socket.io-client';
import { 
  SOCKET_EVENTS,
  CONNECTION_STATES,
  MessageFactory,
  ConnectionAuth,
  AgentCommand,
  CommandResponse,
  AgentStatus,
  ErrorMessage,
  ConnectionState,
  ApiOptionsHelper
} from '@code-crow/shared';
import { ClaudeCodeService } from '../services/claude-code.service.js';

export class AgentWebSocketClient {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = CONNECTION_STATES.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activeSessions = new Map<string, any>();
  private claudeCodeService: ClaudeCodeService;

  constructor(
    private serverUrl: string = 'http://localhost:8080',
    private clientId: string = `agent-${Date.now()}`
  ) {
    this.claudeCodeService = new ClaudeCodeService();
  }

  async connect(): Promise<boolean> {
    try {
      console.log(`🔌 Connecting to server: ${this.serverUrl}`);
      this.connectionState = CONNECTION_STATES.CONNECTING;

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 2000,
        autoConnect: false
      });

      this.setupEventHandlers();
      this.socket.connect();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.once('connect', () => {
          clearTimeout(timeout);
          this.authenticate().then(resolve).catch(reject);
        });

        this.socket!.once('connect_error', (error) => {
          clearTimeout(timeout);
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
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const authData: ConnectionAuth = MessageFactory.createMessage('auth', {
        clientType: 'agent',
        clientId: this.clientId,
        version: '1.0.0'
      });

      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      this.socket.once(SOCKET_EVENTS.AUTH_RESULT, (data) => {
        clearTimeout(timeout);
        if (data.success) {
          console.log('✅ Agent authenticated successfully');
          this.connectionState = CONNECTION_STATES.CONNECTED;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.sendStatus('ready');
          resolve(true);
        } else {
          console.error('❌ Authentication failed:', data.message);
          reject(new Error(data.message || 'Authentication failed'));
        }
      });

      this.socket.emit(SOCKET_EVENTS.AUTH, authData);
    });
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.connectionState = CONNECTION_STATES.CONNECTED;
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 Disconnected: ${reason}`);
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      this.stopHeartbeat();
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, don't auto-reconnect
        console.log('Server disconnected agent, stopping');
      }
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`🔄 Reconnected after ${attempt} attempts`);
      this.connectionState = CONNECTION_STATES.CONNECTED;
      this.authenticate();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection failed:', error);
      this.connectionState = CONNECTION_STATES.ERROR;
    });

    // Command handling
    this.socket.on(SOCKET_EVENTS.AGENT_COMMAND, (data: AgentCommand) => {
      this.handleCommand(data);
    });

    this.socket.on(SOCKET_EVENTS.AGENT_STOP, (data) => {
      this.handleStopCommand(data);
    });

    // Permission handling
    this.socket.on('permission:response', (response: any) => {
      console.log(`🔐 Received permission response: ${response.requestId} -> ${response.decision}`);
      this.claudeCodeService.handlePermissionResponse(response);
    });

    // Session management
    this.socket.on('session:clear', (data: { sessionId: string }) => {
      this.handleClearSession(data);
    });

    this.socket.on('session:status', (data: { sessionId: string }) => {
      this.handleSessionStatus(data);
    });

    // Heartbeat
    this.socket.on(SOCKET_EVENTS.HEARTBEAT_RESPONSE, () => {
      // Server responded to heartbeat
    });

    // Error handling
    this.socket.on(SOCKET_EVENTS.ERROR, (error: ErrorMessage) => {
      console.error('❌ Server error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.connectionState = CONNECTION_STATES.ERROR;
    });
  }

  private async handleCommand(command: AgentCommand) {
    const sessionId = command.sessionId;
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      console.log(`⚡ Received command: ${command.command} (session: ${sessionId})`);
      console.log(`🔍 Debug - continueSession: ${command.options?.continueSession}, options: ${JSON.stringify(command.options)}`);
      
      // Validate command
      if (!command.command || command.command.trim().length === 0) {
        throw new Error('Command cannot be empty');
      }

      if (!command.projectId) {
        throw new Error('Project ID is required');
      }

      // Track active session
      this.activeSessions.set(sessionId, {
        command: command.command,
        projectId: command.projectId,
        startTime: new Date(),
        status: 'running',
        timeout: command.options?.timeoutMs || 300000 // 5 minutes default
      });

      // Update agent status
      this.sendStatus('busy', `Executing: ${command.command.substring(0, 50)}...`);

      // Set up timeout
      const timeoutMs = command.options?.timeoutMs || 300000; // 5 minutes default
      timeoutHandle = setTimeout(() => {
        this.handleCommandTimeout(sessionId);
      }, timeoutMs);

      // Validate Claude Code service is available
      if (!this.claudeCodeService) {
        throw new Error('Claude Code service is not initialized');
      }

      // Check if working directory exists (if specified)
      if (command.workingDirectory) {
        try {
          const fs = await import('fs/promises');
          await fs.access(command.workingDirectory);
        } catch (error) {
          throw new Error(`Working directory does not exist: ${command.workingDirectory}`);
        }
      }

      // Set up permission event handlers for this session
      const onPermissionRequest = (request: any) => {
        if (request.sessionId === sessionId) {
          console.log(`🔐 Forwarding permission request: ${request.id}`);
          this.socket?.emit('permission:request', request);
        }
      };

      const onPermissionTimeout = (data: any) => {
        console.log(`⏰ Permission timeout: ${data.requestId}`);
        this.socket?.emit('permission:timeout', data);
      };

      // Add temporary listeners for this session
      this.claudeCodeService.on('permission:request', onPermissionRequest);
      this.claudeCodeService.on('permission:timeout', onPermissionTimeout);

      let response;
      let streamedContent = ''; // Move variable declaration outside try block
      try {
        // Execute command using Claude Code service with streaming and permissions
        console.log(`🔄 Executing Claude Code command in session ${sessionId}...`);
        
        // Merge backwards compatibility options into apiOptions
        const mergedApiOptions = ApiOptionsHelper.mergeCompatibilityOptions(
          command.apiOptions,
          {
            ...(command.workingDirectory ? { workingDirectory: command.workingDirectory } : {}),
            ...(command.options ? {
              ...(command.options.cwd ? { cwd: command.options.cwd } : {}),
              ...(command.options.allowedTools ? { allowedTools: command.options.allowedTools } : {}),
              ...(command.options.systemPrompt ? { systemPrompt: command.options.systemPrompt } : {}),
              ...(command.options.maxTurns ? { maxTurns: command.options.maxTurns } : {}),
              ...(command.options.timeoutMs ? { timeoutMs: command.options.timeoutMs } : {}),
              ...(command.options.continueSession !== undefined ? { continueSession: command.options.continueSession } : {})
            } : {})
          }
        );

        console.log(`🔍 Agent Debug - merged apiOptions:`, JSON.stringify(mergedApiOptions, null, 2));
        
        // Extract specific options for the service call
        const continueSession = mergedApiOptions.continueSession ?? true;
        const claudeSessionId = mergedApiOptions.resume; // Claude's session ID for resuming specific sessions
        
        response = await this.claudeCodeService.executeStreamWithContext(
          command.command,
          (chunk: string) => {
            // Send each chunk immediately to the client
            this.sendCommandResponse(sessionId, chunk, false);
            streamedContent += chunk;
          },
          sessionId,
          command.projectId,
          continueSession,
          {
            ...(mergedApiOptions.workingDirectory || mergedApiOptions.cwd ? { workingDirectory: mergedApiOptions.workingDirectory || mergedApiOptions.cwd } : {}),
            streamOutput: true,
            ...(mergedApiOptions.timeout || mergedApiOptions.timeoutMs ? { timeout: mergedApiOptions.timeout || mergedApiOptions.timeoutMs } : {})
          },
          claudeSessionId, // Pass Claude's actual session ID
          mergedApiOptions // Pass all Claude Code SDK options
        );
      } finally {
        // Remove temporary listeners
        this.claudeCodeService.off('permission:request', onPermissionRequest);
        this.claudeCodeService.off('permission:timeout', onPermissionTimeout);
      }

      // Clear timeout on successful start
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      // Send final completion message
      if (response.success) {
        // If we have streaming content, send final completion
        if (streamedContent) {
          await this.sendCommandResponse(sessionId, '', true, undefined, response.claudeSessionId);
        } else if (response.output) {
          // Send the complete response if no streaming occurred
          await this.sendCommandResponse(sessionId, response.output, true, undefined, response.claudeSessionId);
        } else {
          await this.sendCommandResponse(sessionId, 'Command completed successfully', true, undefined, response.claudeSessionId);
        }
      } else {
        // Handle error case
        await this.sendCommandResponse(sessionId, response.error || 'Command failed', true, response.error);
      }

      console.log(`✅ Command completed successfully: ${sessionId}`);

    } catch (error) {
      console.error(`❌ Command execution failed for session ${sessionId}:`, error);
      
      // Clear timeout
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      // Determine error type and create appropriate response
      let errorMessage = 'An unknown error occurred';
      let errorCode = 'UNKNOWN_ERROR';

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Categorize common errors
        if (error.message.includes('authentication')) {
          errorCode = 'AUTH_ERROR';
          errorMessage = 'Claude Code authentication failed. Please check your credentials.';
        } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
          errorCode = 'NOT_FOUND_ERROR';
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          errorCode = 'PERMISSION_ERROR';
          errorMessage = 'Permission denied. Check file/directory access rights.';
        } else if (error.message.includes('timeout')) {
          errorCode = 'TIMEOUT_ERROR';
          errorMessage = 'Command timed out. The operation took too long to complete.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorCode = 'NETWORK_ERROR';
          errorMessage = 'Network connection error. Please check your internet connection.';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          errorCode = 'VALIDATION_ERROR';
        }
      }

      await this.sendCommandResponse(
        sessionId, 
        `Error (${errorCode}): ${errorMessage}`,
        true,
        errorMessage
      );

      // Update agent status
      this.sendStatus('error', `Failed: ${errorMessage}`);

    } finally {
      // Clean up session and status
      this.activeSessions.delete(sessionId);
      
      if (this.activeSessions.size === 0) {
        this.sendStatus('ready');
      }

      // Ensure timeout is cleared
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async handleCommandTimeout(sessionId: string) {
    console.warn(`⏰ Command timeout for session: ${sessionId}`);
    
    const session = this.activeSessions.get(sessionId);
    if (session) {
      await this.sendCommandResponse(
        sessionId,
        'Command timed out. The operation took too long to complete.',
        true,
        'TIMEOUT_ERROR'
      );
      
      this.activeSessions.delete(sessionId);
      
      if (this.activeSessions.size === 0) {
        this.sendStatus('ready');
      }
    }
  }

  // Removed handleStreamingResponse - not currently used

  private async sendCommandResponse(
    sessionId: string, 
    data: string, 
    isComplete: boolean,
    error?: string,
    claudeSessionId?: string
  ) {
    if (!this.socket) return;

    const responseData: any = {
      sessionId,
      data,
      isComplete
    };
    
    if (error !== undefined) {
      responseData.error = error;
    }
    
    if (claudeSessionId !== undefined) {
      responseData.claudeSessionId = claudeSessionId;
    }
    
    const response: CommandResponse = MessageFactory.createMessage('command_response', responseData);

    this.socket.emit(SOCKET_EVENTS.COMMAND_RESPONSE, response);
  }

  // Removed sendFileChange method - not currently used

  private async handleClearSession(data: { sessionId: string }) {
    try {
      console.log(`🗑️ Clearing session: ${data.sessionId}`);
      await this.claudeCodeService.clearSession(data.sessionId);
      this.socket?.emit('session:cleared', { sessionId: data.sessionId });
    } catch (error) {
      console.error(`❌ Error clearing session ${data.sessionId}:`, error);
      this.socket?.emit('session:error', { 
        sessionId: data.sessionId, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleSessionStatus(data: { sessionId: string }) {
    try {
      console.log(`📊 Checking session status: ${data.sessionId}`);
      const exists = await this.claudeCodeService.sessionExists(data.sessionId);
      const info = exists ? await this.claudeCodeService.getSessionInfo(data.sessionId) : null;
      
      this.socket?.emit('session:status', { 
        sessionId: data.sessionId,
        exists,
        info
      });
    } catch (error) {
      console.error(`❌ Error checking session status ${data.sessionId}:`, error);
      this.socket?.emit('session:error', { 
        sessionId: data.sessionId, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private sendStatus(status: 'ready' | 'busy' | 'error' | 'disconnected', message?: string) {
    if (!this.socket) return;

    const agentStatusData: any = {
      status,
      currentSessions: Array.from(this.activeSessions.keys())
    };
    
    if (message !== undefined) {
      agentStatusData.message = message;
    }
    
    const agentStatus: AgentStatus = MessageFactory.createMessage('agent_status', agentStatusData);

    this.socket.emit(SOCKET_EVENTS.AGENT_STATUS, agentStatus);
  }

  private handleStopCommand(data: { sessionId: string; reason?: string }) {
    console.log(`🛑 Stop command for session: ${data.sessionId}`);
    
    const session = this.activeSessions.get(data.sessionId);
    if (session) {
      // Cancel the session
      this.activeSessions.delete(data.sessionId);
      
      // Send cancellation response
      this.sendCommandResponse(
        data.sessionId,
        'Command cancelled',
        true,
        data.reason || 'Cancelled by user'
      );
    }

    if (this.activeSessions.size === 0) {
      this.sendStatus('ready');
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connectionState === CONNECTION_STATES.CONNECTED) {
        this.socket.emit(SOCKET_EVENTS.HEARTBEAT);
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting agent...');
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.activeSessions.clear();
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === CONNECTION_STATES.CONNECTED && this.socket?.connected === true;
  }

  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  getStats() {
    return {
      connectionState: this.connectionState,
      isConnected: this.isConnected(),
      activeSessions: this.activeSessions.size,
      sessionIds: this.getActiveSessions(),
      reconnectAttempts: this.reconnectAttempts,
      clientId: this.clientId
    };
  }
}

// Legacy function for backward compatibility
export function setupWebSocketClient(): void {
  console.log('⚠️ Legacy setupWebSocketClient function called. Use AgentWebSocketClient class instead.');
}