import { 
  SOCKET_EVENTS,
  MessageFactory,
  AgentCommand,
  CommandResponse,
  AgentStatus,
  ErrorMessage,
  ApiOptionsHelper,
  BaseWebSocketClient,
  PermissionRequest,
  PermissionResponse
} from '@code-crow/shared';
import { ClaudeCodeService } from '../services/claude-code.service.js';

interface ActiveSession {
  command: string;
  projectId: string;
  startTime: Date;
  status: 'running' | 'completed' | 'error';
  timeout: number;
}

export class AgentWebSocketClient extends BaseWebSocketClient {
  private activeSessions = new Map<string, ActiveSession>();
  private claudeCodeService: ClaudeCodeService;

  constructor(
    serverUrl: string = 'http://localhost:8080',
    clientId: string = `agent-${Date.now()}`
  ) {
    super('agent', {
      serverUrl,
      clientId,
      timeout: 10000,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      heartbeatInterval: 30000
    });
    this.claudeCodeService = new ClaudeCodeService();
  }

  protected setupEventHandlers() {
    if (!this.socket) return;

    // Command handling
    this.socket.on(SOCKET_EVENTS.AGENT_COMMAND, (data: AgentCommand) => {
      this.handleCommand(data);
    });

    this.socket.on(SOCKET_EVENTS.AGENT_STOP, (data) => {
      this.handleStopCommand(data);
    });

    // Permission handling
    this.socket.on('permission:response', (response: PermissionResponse) => {
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
  }

  protected onAuthenticated(): void {
    console.log('✅ Agent authenticated successfully');
    this.sendStatus('ready');
  }

  protected onDisconnected(reason: string): void {
    console.log(`🔌 Agent disconnected: ${reason}`);
    
    if (reason === 'io server disconnect') {
      // Server disconnected us, don't auto-reconnect
      console.log('Server disconnected agent, stopping');
    }
  }

  protected onError(error: ErrorMessage): void {
    console.error('❌ Agent server error:', error);
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
      const onPermissionRequest = (request: PermissionRequest) => {
        if (request.sessionId === sessionId) {
          console.log(`🔐 Forwarding permission request: ${request.id}`);
          this.socket?.emit('permission:request', request);
        }
      };

      const onPermissionTimeout = (data: { requestId: string }) => {
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

  private async sendCommandResponse(
    sessionId: string, 
    data: string, 
    isComplete: boolean,
    error?: string,
    claudeSessionId?: string
  ) {
    if (!this.socket) return;

    const responseData: CommandResponse = {
      id: `cmd-${Date.now()}-${Math.random()}`,
      type: 'command_response' as const,
      timestamp: new Date().toISOString(),
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

    const agentStatusData: AgentStatus = {
      id: `status-${Date.now()}-${Math.random()}`,
      type: 'agent_status' as const,
      timestamp: new Date().toISOString(),
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

  override disconnect() {
    console.log('🔌 Disconnecting agent...');
    super.disconnect();
    this.activeSessions.clear();
  }

  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  override getStats() {
    return {
      ...super.getStats(),
      activeSessions: this.activeSessions.size,
      sessionIds: this.getActiveSessions()
    };
  }
}

// Legacy function for backward compatibility
export function setupWebSocketClient(): void {
  console.log('⚠️ Legacy setupWebSocketClient function called. Use AgentWebSocketClient class instead.');
}