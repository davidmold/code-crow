# Stage 5: Core Features Integration

## Goal
Connect Claude Code execution through the entire stack. At the end of this stage, you should be able to type a command in the web interface and see Claude Code execute it in real-time with streaming responses.

## Prerequisites
- Stage 4 completed (WebSocket communication working)
- All components can communicate via WebSocket

## Tasks

### 1. User-Controlled Project Management
Replace mock data with user-selected projects:
- Add "Add Project" functionality to let users browse and select project directories
- Store selected projects in a simple JSON config file (no database needed)
- Auto-detect project type (Node.js, Python, React, etc.) when adding
- Allow users to remove/edit projects from their workspace
- Load real file structure for user-selected projects only
- Handle file system errors gracefully

### 2. Implement Claude Code Execution Flow
Create the complete execution pipeline:
- Web interface sends command to server
- Server forwards command to agent via WebSocket
- Agent executes command using Claude Code SDK
- Agent streams responses back through server to web
- Web interface displays streaming responses in real-time

### 3. Enhanced Chat Interface
Upgrade the chat interface to:
- Send commands to Claude Code via WebSocket
- Display streaming responses as they arrive
- Show command execution status (running, complete, error)
- Handle long-running commands gracefully
- Provide command history

### 4. File Explorer Integration
Connect file explorer to user-selected project data:
- Browse actual project files and directories for user's workspace
- Click on files to include context in commands
- Show file contents in a preview pane using real file system data
- Update file tree when Claude Code modifies files
- Respect user's project selection (only show their chosen projects)

### 5. Session Management
Implement session handling:
- Create unique session IDs for each command
- Track multiple concurrent commands
- Associate responses with correct sessions
- Handle session cleanup and timeouts

### 6. Error Handling
Add comprehensive error handling:
- Claude Code authentication failures
- Network disconnections during execution
- Invalid commands or file paths
- Permission errors on file operations
- Timeout handling for long commands

### 7. Real-time Updates
Implement live updates:
- File system changes reflected in UI
- Command progress indicators
- Connection status monitoring
- Agent health monitoring

## Success Criteria
- [ ] Users can add/remove projects to their workspace via "Add Project" button
- [ ] Project data is persisted in JSON config file
- [ ] Can browse real project files for user-selected projects in web interface
- [ ] Can send Claude Code commands from web interface
- [ ] See real-time streaming responses from Claude Code
- [ ] File explorer updates when Claude Code modifies files
- [ ] Multiple commands can run concurrently
- [ ] Error messages are clear and actionable
- [ ] Session history is maintained
- [ ] Performance is responsive for typical development tasks

## Files to Enhance

### Server
- packages/server/src/routes/projects.ts (add/remove projects, use real data)
- packages/server/src/websocket/handlers.ts (Claude Code integration)
- packages/server/src/services/sessionManager.ts
- packages/server/src/services/projectConfigService.ts (JSON config file management)

### Agent  
- packages/agent/src/services/claude-code.service.ts (WebSocket integration)
- packages/agent/src/services/execution.service.ts
- packages/agent/src/services/projectScanner.ts (scan user-selected directories only)
- packages/agent/src/websocket/handlers.ts (command execution)

### Web
- packages/web/src/components/ChatInterface.vue (real functionality)
- packages/web/src/components/FileExplorer.vue (real data)
- packages/web/src/components/AddProjectModal.vue (new component for project selection)
- packages/web/src/stores/commandStore.ts
- packages/web/src/stores/sessionStore.ts

### Shared
- packages/shared/src/types/commands.ts
- packages/shared/src/types/sessions.ts

## Key Features to Implement

### Project Configuration Storage
```typescript
// Example projects config file structure
interface ProjectsConfig {
  projects: {
    id: string;
    name: string;
    path: string;
    type: 'node' | 'python' | 'rust' | 'go' | 'react' | 'vue' | 'unknown';
    addedDate: string;
    lastAccessed?: string;
    description?: string;
  }[];
  lastModified: string;
}
```

### Add Project Flow
```typescript
interface AddProjectRequest {
  directoryPath: string;
  customName?: string; // Override detected name
  description?: string;
}

interface ProjectDetectionResult {
  type: 'node' | 'python' | 'rust' | 'go' | 'react' | 'vue' | 'unknown';
  name: string; // Detected from package.json, directory name, etc.
  framework?: string;
  packageManager?: string;
}
```

### Command Execution
```typescript
// Example command flow
interface CommandExecution {
  sessionId: string;
  projectId: string;
  command: string;
  workingDirectory: string;
  options: {
    allowedTools: string[];
    systemPrompt?: string;
    maxTurns?: number;
  };
}
```

### Streaming Response Handling
```typescript
interface StreamingResponse {
  sessionId: string;
  type: 'text' | 'file_change' | 'error' | 'complete';
  data: string;
  metadata?: {
    file?: string;
    operation?: 'create' | 'modify' | 'delete';
  };
}
```

### Session Management
```typescript
interface Session {
  id: string;
  projectId: string;
  status: 'running' | 'complete' | 'error';
  startTime: Date;
  commands: Command[];
  responses: Response[];
}
```

## Testing Scenarios
1. **Project Management**: Add a project by browsing to directory, remove a project, verify persistence
2. **Basic Command**: "List files in current directory" for user-selected project
3. **File Modification**: "Add a console.log to main.js" 
4. **Complex Task**: "Create a new Vue component for user authentication"
5. **Error Handling**: Invalid file path or syntax error
6. **Concurrent Commands**: Multiple commands running simultaneously across different projects

## Claude Code Command
```
Implement user-controlled project management with JSON config storage and Claude Code execution through the full WebSocket stack. Add "Add Project" functionality, real project browsing for user-selected projects, streaming command execution from web to agent, session management, and comprehensive error handling. Make the chat interface fully functional.
```

## Next Stage
Once core functionality is working, move to Stage 6 to enhance the user experience with better UI, history, and conveniences.
