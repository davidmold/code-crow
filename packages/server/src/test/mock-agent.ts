import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, AgentCommand, CommandResponse } from '@code-crow/shared';

interface MockResponse {
  question: string;
  answer: string;
  claudeSessionId: string;
}

export class MockAgent {
  private socket: Socket | null = null;
  private serverUrl: string;
  private responses: Map<string, MockResponse> = new Map();
  // private sessionCounter = 0; // Reserved for future use
  
  constructor(serverUrl: string = 'http://localhost:8080') {
    this.serverUrl = serverUrl;
    this.setupMockResponses();
  }

  private setupMockResponses(): void {
    // Mock responses for our test
    this.responses.set('how many planets do we have in this sim?', {
      question: 'how many planets do we have in this sim?',
      answer: 'This simulation contains 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. Each planet has unique characteristics and orbital properties that make the simulation realistic.',
      claudeSessionId: 'claude-session-12345' // Mock Claude session ID
    });

    this.responses.set('And which should we add next?', {
      question: 'And which should we add next?',
      answer: 'Based on the current simulation, I would recommend adding Pluto as a dwarf planet. While not technically a planet, it would add educational value and completeness to the solar system simulation. We could also consider adding some of the larger asteroids like Ceres, or moons like Europa and Titan for more complexity.',
      claudeSessionId: 'claude-session-12345' // Same session ID for continuation
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🤖 Mock Agent connecting to server at ${this.serverUrl}...`);
      
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });

      this.socket.on('connect', () => {
        console.log(`✅ Mock Agent connected with ID: ${this.socket!.id}`);
        this.authenticateAsAgent();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Mock Agent connection failed:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`🤖 Mock Agent disconnected: ${reason}`);
      });

      this.setupEventHandlers();
    });
  }

  private authenticateAsAgent(): void {
    console.log('🔐 Mock Agent authenticating...');
    this.socket!.emit(SOCKET_EVENTS.AUTH, {
      type: 'agent',
      clientId: `mock-agent-${Date.now()}`,
      timestamp: new Date().toISOString(),
      capabilities: ['claude-code-execution', 'file-operations']
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Handle authentication response
    this.socket.on('authenticated', (data) => {
      console.log('✅ Mock Agent authentication successful:', data);
    });

    // Handle commands from server
    this.socket.on(SOCKET_EVENTS.AGENT_COMMAND, (command: AgentCommand) => {
      console.log('🤖 Mock Agent received command:', JSON.stringify(command, null, 2));
      this.handleCommand(command);
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('❌ Mock Agent server error:', error);
    });
  }

  private async handleCommand(command: AgentCommand): Promise<void> {
    console.log(`🤖 Processing command: "${command.command}"`);
    
    // Find matching response
    const mockResponse = this.responses.get(command.command.toLowerCase());
    
    if (!mockResponse) {
      console.warn(`⚠️ No mock response found for: "${command.command}"`);
      this.sendErrorResponse(command, 'No mock response available');
      return;
    }

    // Log session continuation info
    console.log(`🔍 Mock Agent - Command Options:`);
    console.log(`  - continueSession: ${command.apiOptions?.continueSession}`);
    console.log(`  - resume: ${command.apiOptions?.resume}`);
    console.log(`  - sessionId: ${command.sessionId}`);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send streaming response (simulate chunks)
    const chunks = this.splitIntoChunks(mockResponse.answer);
    
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const claudeSessionId = isLast ? mockResponse.claudeSessionId : undefined;
      
      this.sendCommandResponse(command, chunks[i], !isLast, claudeSessionId);
      
      // Small delay between chunks
      if (!isLast) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`✅ Mock Agent completed command for session: ${command.sessionId}`);
  }

  private splitIntoChunks(text: string, chunkSize: number = 50): string[] {
    const chunks: string[] = [];
    const words = text.split(' ');
    let currentChunk = '';

    for (const word of words) {
      if (currentChunk.length + word.length + 1 <= chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  private sendCommandResponse(
    command: AgentCommand, 
    data: string, 
    isStreaming: boolean = false,
    claudeSessionId?: string
  ): void {
    const response: CommandResponse = {
      id: `response-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      type: 'command_response',
      sessionId: command.sessionId,
      data,
      isComplete: !isStreaming,
      ...(claudeSessionId ? { claudeSessionId } : {})
    };

    console.log(`🤖 Mock Agent sending response${isStreaming ? ' (streaming)' : ' (complete)'}:`, {
      sessionId: response.sessionId,
      dataLength: response.data.length,
      isComplete: response.isComplete,
      claudeSessionId: response.claudeSessionId
    });

    this.socket!.emit(SOCKET_EVENTS.COMMAND_RESPONSE, response);
  }

  private sendErrorResponse(command: AgentCommand, error: string): void {
    const response: CommandResponse = {
      id: `error-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      type: 'command_response',
      sessionId: command.sessionId,
      data: error,
      isComplete: true,
      error: error
    };

    console.error(`❌ Mock Agent sending error response:`, response);
    this.socket!.emit(SOCKET_EVENTS.COMMAND_RESPONSE, response);
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🤖 Mock Agent disconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Method to add custom responses for testing
  addMockResponse(question: string, answer: string, claudeSessionId: string = 'mock-claude-session'): void {
    this.responses.set(question.toLowerCase(), {
      question,
      answer,
      claudeSessionId
    });
  }
}

// Test runner for mock agent
export async function runMockAgent(): Promise<MockAgent> {
  const mockAgent = new MockAgent();
  
  try {
    console.log('🤖 Starting Mock Agent...');
    await mockAgent.connect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for auth
    console.log('✅ Mock Agent is ready and listening for commands');
    return mockAgent;
  } catch (error) {
    console.error('❌ Failed to start Mock Agent:', error);
    mockAgent.disconnect();
    throw error;
  }
}

// If run directly
if (require.main === module) {
  runMockAgent()
    .then(() => {
      console.log('🤖 Mock Agent running... Press Ctrl+C to stop');
    })
    .catch(console.error);
}