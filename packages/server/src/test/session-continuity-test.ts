import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@code-crow/shared';

interface TestSession {
  sessionId: string;
  claudeSessionId?: string;
  responses: string[];
}

export class SessionContinuityTest {
  private socket: Socket | null = null;
  private session: TestSession | null = null;
  private serverUrl: string;
  
  constructor(serverUrl: string = 'http://localhost:8080') {
    this.serverUrl = serverUrl;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connecting to server at ${this.serverUrl}...`);
      
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });

      this.socket.on('connect', () => {
        console.log(`✅ Connected to server with ID: ${this.socket!.id}`);
        this.authenticateAsWebClient();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`🔌 Disconnected: ${reason}`);
      });

      this.setupEventHandlers();
    });
  }

  private authenticateAsWebClient(): void {
    console.log('🔐 Authenticating as web client...');
    this.socket!.emit(SOCKET_EVENTS.AUTH, {
      type: 'web',
      clientId: `test-web-${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Handle authentication response
    this.socket.on('authenticated', (data) => {
      console.log('✅ Authentication successful:', data);
    });

    // Handle command responses
    this.socket.on(SOCKET_EVENTS.COMMAND_RESULT, (data) => {
      console.log('📥 Command result received:', JSON.stringify(data, null, 2));
      
      if (this.session) {
        this.session.responses.push(data.response);
        
        // Store Claude session ID for continuation
        if (data.claudeSessionId) {
          console.log(`🔗 Storing Claude session ID: ${data.claudeSessionId}`);
          this.session.claudeSessionId = data.claudeSessionId;
        } else {
          console.warn('⚠️ No Claude session ID received in response!');
        }
      }
    });

    // Handle errors
    this.socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('❌ Server error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  }

  async sendInitialQuestion(): Promise<void> {
    if (!this.socket) throw new Error('Not connected');

    // Create a new session
    const sessionId = `test-session-${Date.now()}`;
    this.session = {
      sessionId,
      responses: []
    };

    console.log(`📤 Sending initial question with session ID: ${sessionId}`);
    
    const command = {
      sessionId,
      command: 'how many planets do we have in this sim?',
      projectId: 'test-project',
      workingDirectory: process.cwd(),
      apiOptions: {
        continueSession: false,  // Start fresh
        workingDirectory: process.cwd()
      }
    };

    console.log('🔍 Initial command data:', JSON.stringify(command, null, 2));
    this.socket.emit(SOCKET_EVENTS.EXECUTE_COMMAND, command);
  }

  async sendFollowUpQuestion(): Promise<void> {
    if (!this.socket) throw new Error('Not connected');
    if (!this.session) throw new Error('No active session');

    console.log(`📤 Sending follow-up question...`);
    console.log(`🔗 Using Claude session ID: ${this.session.claudeSessionId || 'NONE'}`);
    
    const command = {
      sessionId: this.session.sessionId, // Keep same session ID
      command: 'And which should we add next?',
      projectId: 'test-project',
      workingDirectory: process.cwd(),
      apiOptions: {
        continueSession: true,  // Continue conversation
        resume: this.session.claudeSessionId,  // Resume specific Claude session
        workingDirectory: process.cwd()
      }
    };

    console.log('🔍 Follow-up command data:', JSON.stringify(command, null, 2));
    this.socket.emit(SOCKET_EVENTS.EXECUTE_COMMAND, command);
  }

  async waitForResponse(timeoutMs: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for response after ${timeoutMs}ms`));
      }, timeoutMs);

      const checkResponse = () => {
        if (this.session && this.session.responses.length > 0) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkResponse, 100);
        }
      };

      checkResponse();
    });
  }

  getSession(): TestSession | null {
    return this.session;
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from server...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  printSessionSummary(): void {
    if (!this.session) {
      console.log('❌ No session data to display');
      return;
    }

    console.log('\n📋 SESSION SUMMARY:');
    console.log('===================');
    console.log(`Session ID: ${this.session.sessionId}`);
    console.log(`Claude Session ID: ${this.session.claudeSessionId || 'NOT CAPTURED'}`);
    console.log(`Responses received: ${this.session.responses.length}`);
    
    this.session.responses.forEach((response, index) => {
      console.log(`\nResponse ${index + 1}:`);
      console.log('-------------------');
      console.log(response);
    });
  }
}

// Test runner function
export async function runSessionContinuityTest(): Promise<void> {
  const test = new SessionContinuityTest();

  try {
    console.log('🚀 Starting Session Continuity Test...\n');

    // Step 1: Connect to server
    await test.connect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for auth

    // Step 2: Send initial question
    console.log('\n📝 Step 1: Sending initial question...');
    await test.sendInitialQuestion();
    
    // Wait for response
    console.log('⏳ Waiting for initial response...');
    await test.waitForResponse();
    
    console.log('✅ Initial response received!');
    
    // Step 3: Send follow-up question
    console.log('\n📝 Step 2: Sending follow-up question...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait a bit
    await test.sendFollowUpQuestion();
    
    // Wait for follow-up response
    console.log('⏳ Waiting for follow-up response...');
    await test.waitForResponse();
    
    console.log('✅ Follow-up response received!');
    
    // Step 4: Print results
    test.printSessionSummary();
    
    console.log('\n✅ Session continuity test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    test.printSessionSummary();
  } finally {
    test.disconnect();
  }
}

// If run directly
if (require.main === module) {
  runSessionContinuityTest().catch(console.error);
}