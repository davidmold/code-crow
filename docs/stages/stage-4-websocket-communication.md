# Stage 4: WebSocket Communication

## Goal
Implement real-time WebSocket communication between the web frontend, server, and agent. At the end of this stage, all three components should be connected and able to exchange messages in real-time.

## Prerequisites
- Stage 3 completed (web interface with API working)
- Understanding of WebSocket protocols

## Tasks

### 1. Add WebSocket Dependencies
Update package.json files to include:
- **server**: `socket.io` for WebSocket server
- **web**: `socket.io-client` for browser WebSocket client
- **agent**: `socket.io-client` for Node.js WebSocket client

### 2. Define Communication Protocol
Create shared message types in packages/shared:
- Client-to-server messages (web browser)
- Server-to-agent messages (command execution)
- Agent-to-server messages (responses, status)
- Server-to-client messages (results, updates)

### 3. Implement WebSocket Server
In packages/server, create:
- Socket.io server setup with Express integration
- Connection handlers for web clients and agents
- Message routing between clients and agents
- Room/namespace management for isolation

### 4. Create Agent WebSocket Client
In packages/agent, implement:
- WebSocket client that connects to server
- Authentication/identification when connecting
- Message handlers for incoming commands
- Heartbeat/keepalive functionality

### 5. Create Web WebSocket Client
In packages/web, implement:
- Socket.io client integration with Vue3
- Reactive state management for WebSocket status
- Message sending from chat interface
- Real-time response handling

### 6. Message Flow Implementation
Implement the complete message flow:
```
Web Client → Server → Agent → Claude Code
Claude Code → Agent → Server → Web Client
```

### 7. Connection Management
Add robust connection handling:
- Auto-reconnection on disconnects
- Connection status indicators in UI
- Error handling for failed connections
- Graceful degradation when offline

## Success Criteria
- [ ] Agent connects to server via WebSocket
- [ ] Web client connects to server via WebSocket  
- [ ] Messages can be sent from web to agent through server
- [ ] Server correctly routes messages between clients
- [ ] Connection status is visible in web interface
- [ ] Auto-reconnection works when connections drop
- [ ] Multiple web clients can connect simultaneously

## Files to Create

### Shared Protocol
- packages/shared/src/types/websocket.ts
- packages/shared/src/types/messages.ts
- packages/shared/src/protocols/communication.ts

### Server WebSocket
- packages/server/src/websocket/server.ts
- packages/server/src/websocket/handlers.ts
- packages/server/src/websocket/rooms.ts

### Agent WebSocket
- packages/agent/src/websocket/client.ts
- packages/agent/src/websocket/handlers.ts
- packages/agent/src/websocket/auth.ts

### Web WebSocket
- packages/web/src/services/websocket.ts
- packages/web/src/stores/connectionStore.ts
- packages/web/src/composables/useWebSocket.ts

## Message Types to Define
```typescript
// Web to Server
interface ExecuteCommand {
  type: 'execute_command';
  projectId: string;
  command: string;
  workingDirectory?: string;
}

// Server to Agent  
interface AgentCommand {
  type: 'agent_command';
  sessionId: string;
  command: string;
  options: ClaudeCodeOptions;
}

// Agent to Server
interface CommandResponse {
  type: 'command_response';
  sessionId: string;
  data: string;
  isComplete: boolean;
}

// Server to Web
interface CommandResult {
  type: 'command_result';
  sessionId: string;
  response: string;
  status: 'streaming' | 'complete' | 'error';
}
```

## Testing Commands
```bash
# Start all services
npm run dev

# Test WebSocket connections
# - Open browser to web interface
# - Check connection status in UI
# - Verify agent shows as connected in server logs
# - Send test message through chat interface
```

## Claude Code Command
```
Implement WebSocket communication between web frontend, server, and agent. Create shared message protocols, WebSocket server with Socket.io, and WebSocket clients for both web and agent. Include connection management and message routing.
```

## Next Stage
Once WebSocket communication is working, move to Stage 5 to connect Claude Code execution through the full stack.
