import { Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  MessageFactory,
  RoomManager,
  ExecuteCommand,
  AgentCommand,
  CommandResponse,
  ErrorMessage,
  ApiOptionsHelper,
  Session,
  ClaudeCodeApiOptions
} from '@code-crow/shared';
import { SessionManager } from '../../services/sessionManager.js';

export class CommandHandler {
  constructor(
    private sessionManager: SessionManager,
    private broadcastToRoom: (roomName: string, event: string, data: unknown) => void,
    private sessionTimeoutMs: number
  ) {}

  async handleExecuteCommand(socket: Socket, data: ExecuteCommand): Promise<void> {
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

  async handleCommandResponse(_socket: Socket, data: CommandResponse): Promise<void> {
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
        timeoutMs: this.sessionTimeoutMs
      }
    });

    if (!sessionResult.success) {
      throw new Error(sessionResult.error || 'Failed to create session');
    }
    
    return sessionResult;
  }

  private buildAgentCommand(data: ExecuteCommand, mergedApiOptions: ClaudeCodeApiOptions): AgentCommand {
    return MessageFactory.createMessage('agent_command', {
      sessionId: data.sessionId,
      command: data.command,
      projectId: data.projectId,
      apiOptions: {
        ...mergedApiOptions,
        // Ensure we have a default timeout if not specified
        timeoutMs: mergedApiOptions.timeoutMs || this.sessionTimeoutMs
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

  private async forwardResponseToWebClient(data: CommandResponse, session: Session) {
    const commandResult = MessageFactory.createMessage('command_result', {
      sessionId: data.sessionId,
      response: data.data,
      status: data.error ? 'error' : (data.isComplete ? 'complete' : 'streaming'),
      ...(data.claudeSessionId ? { claudeSessionId: data.claudeSessionId } : {})
    });

    // Send to specific client
    if (session.clientId) {
      // This will need to be handled by the main server's client lookup
      // We'll pass this responsibility back to the main server
      this.broadcastToRoom(`client_${session.clientId}`, SOCKET_EVENTS.COMMAND_RESULT, commandResult);
    }

    console.log(`📤 Forwarded response to web client: ${data.sessionId}`);
  }
}