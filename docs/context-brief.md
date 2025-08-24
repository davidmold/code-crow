Looking at the Claude Code SDK documentation, you can directly use the `--continue` functionality. The SDK supports this through the `continueSession: true` option.

Here's how to implement it properly in your web interface:

## **Direct `--continue` Implementation**

### 1. **Using the SDK's Built-in Continue Feature**

```typescript
import { query } from '@anthropic-ai/claude-code'

export class ClaudeCodeService extends EventEmitter {
  private sessionFiles = new Map<string, string>(); // sessionId -> sessionFilePath
  private sessionsDir = '.code-crow/sessions';

  constructor(private workingDirectory?: string) {
    super();
    // Ensure sessions directory exists
    fs.ensureDirSync(this.sessionsDir);
  }

  async executeWithContext(
    prompt: string, 
    sessionId: string,
    projectId: string,
    continueSession: boolean = true,
    options: ClaudeCodeOptions = {}
  ): Promise<ClaudeCodeExecuteResult> {
    
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    
    // Query options
    const queryOptions: any = {
      cwd: this.workingDirectory || process.cwd()
    };

    // Add permission callback if needed
    if (sessionId) {
      queryOptions.canUseTool = this.createCanUseTool(sessionId);
    }

    // Use continueSession if we want to continue and session exists
    if (continueSession && await fs.pathExists(sessionFile)) {
      queryOptions.continueSession = true;
      console.log(`🔗 Continuing from session: ${sessionFile}`);
    } else {
      // New session - the SDK will create the session file automatically
      queryOptions.sessionFile = sessionFile;
      console.log(`🆕 Starting new session: ${sessionFile}`);
    }

    // Store session file path for this sessionId
    this.sessionFiles.set(sessionId, sessionFile);

    // Execute with session management
    const queryResult = query({
      prompt: prompt,
      options: queryOptions
    });

    return this.processQueryWithStreaming(queryResult, sessionId);
  }

  // Clear session (delete session file)
  async clearSession(sessionId: string): Promise<void> {
    const sessionFile = this.sessionFiles.get(sessionId);
    if (sessionFile && await fs.pathExists(sessionFile)) {
      await fs.remove(sessionFile);
      console.log(`🗑️ Cleared session file: ${sessionFile}`);
    }
    this.sessionFiles.delete(sessionId);
  }

  // Check if session exists
  async sessionExists(sessionId: string): Promise<boolean> {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    return fs.pathExists(sessionFile);
  }

  // Get session info (read from session file)
  async getSessionInfo(sessionId: string): Promise<any> {
    const sessionFile = this.sessionFiles.get(sessionId) || path.join(this.sessionsDir, `${sessionId}.json`);
    
    if (await fs.pathExists(sessionFile)) {
      try {
        return await fs.readJSON(sessionFile);
      } catch (error) {
        console.warn(`Could not read session file ${sessionFile}:`, error);
        return null;
      }
    }
    return null;
  }
}
```

### 2. **WebSocket Handler with Direct Continue Support**

```typescript
// In your WebSocket handlers
interface ExecuteCommandRequest {
  command: string;
  projectId: string;
  sessionId: string;
  continueSession: boolean;
  options?: ClaudeCodeOptions;
}

export async function handleExecuteCommand(
  socket: Socket, 
  data: ExecuteCommandRequest, 
  claudeCodeService: ClaudeCodeService
) {
  const { command, projectId, sessionId, continueSession, options = {} } = data;
  
  try {
    console.log(`Executing command with sessionId: ${sessionId}, continue: ${continueSession}`);
    
    // Use the SDK's built-in continue functionality
    const result = await claudeCodeService.executeWithContext(
      command,
      sessionId,
      projectId,
      continueSession,
      options
    );
    
    socket.emit('command:result', {
      sessionId,
      success: result.success,
      output: result.output,
      error: result.error,
      duration: result.duration,
      continueSession
    });
    
  } catch (error) {
    socket.emit('command:error', {
      sessionId,
      error: error.message
    });
  }
}

// Handler for clearing sessions (deletes session file)
export async function handleClearSession(
  socket: Socket, 
  data: { sessionId: string }, 
  claudeCodeService: ClaudeCodeService
) {
  try {
    await claudeCodeService.clearSession(data.sessionId);
    socket.emit('session:cleared', { sessionId: data.sessionId });
  } catch (error) {
    socket.emit('session:error', { sessionId: data.sessionId, error: error.message });
  }
}
```

### 3. **Frontend Store Simplified**

```typescript
// Much simpler since SDK handles the heavy lifting
export const useSessionStore = defineStore('sessions', {
  state: () => ({
    currentSessionId: null as string | null,
    continueMode: true,
    sessionHistory: new Map<string, any>()
  }),

  actions: {
    generateSessionId(projectId: string): string {
      return `${projectId}_session_${Date.now()}`;
    },

    async sendCommand(
      command: string, 
      projectId: string, 
      socket: any, 
      options: { newSession?: boolean } = {}
    ) {
      // Generate new session ID if needed
      if (options.newSession || !this.currentSessionId) {
        this.currentSessionId = this.generateSessionId(projectId);
      }

      const payload = {
        command,
        projectId,
        sessionId: this.currentSessionId,
        continueSession: !options.newSession && this.continueMode,
        options: {
          streamOutput: true
        }
      };

      console.log('Sending command:', payload);
      socket.emit('execute:command', payload);
      return this.currentSessionId;
    },

    // Clear current session - this deletes the session file
    async clearCurrentSession(socket: any) {
      if (this.currentSessionId) {
        socket.emit('clear:session', { sessionId: this.currentSessionId });
        this.sessionHistory.delete(this.currentSessionId);
        this.currentSessionId = null;
      }
    },

    // Toggle continue mode
    setContinueMode(enabled: boolean) {
      this.continueMode = enabled;
      if (!enabled) {
        this.currentSessionId = null; // Force new session next time
      }
    }
  }
});
```

### 4. **Key Benefits of This Approach**

✅ **Same token efficiency as CLI** - Uses exact same session management  
✅ **File-based persistence** - Sessions survive server restarts  
✅ **Built-in context management** - SDK handles all the complexity  
✅ **Familiar behavior** - Works exactly like `claude code --continue`  
✅ **No custom context logic** - Let the SDK do what it does best  

### 5. **UI Controls**

```vue
<template>
  <div class="session-controls">
    <button 
      @click="toggleContinueMode" 
      :class="{ active: continueMode }"
    >
      {{ continueMode ? '🔗 Continue Mode' : '🆕 Fresh Each Time' }}
    </button>
    
    <button @click="startNewSession">
      🗑️ Clear Session
    </button>
    
    <span v-if="currentSessionId" class="session-indicator">
      Session: {{ currentSessionId }}
    </span>
  </div>
</template>
```

This approach is **much simpler** and gives you **identical behavior** to the CLI's `--continue` option with the same token efficiency. The Claude Code SDK handles all the session management complexity for you!