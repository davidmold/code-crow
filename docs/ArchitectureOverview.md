# Code Crow Architecture Overview

## System Overview

Code Crow is a sophisticated web-based interface for Claude Code that enables distributed code execution and project management. The system follows a **client-server architecture with WebSocket-based real-time communication** between web clients, a central server, and distributed agents.

## High-Level Architecture

```
Web Clients (Browsers)
    |
    | WebSocket + REST API
    |
Central Server (Node.js/Express)
    - REST API
    - WebSocket Hub  
    - Session Management
    - Project Management
    |
    | WebSocket Communication
    |
Distributed Agents
    - Agent 1 (Local/VM)
    - Agent 2 (Container) 
    - Agent 3 (Remote)
    - Claude Code Execution
```

## Core Components

### 1. Web Client (`packages/web`)

**Technology Stack:** Vue 3, TypeScript, Vite, TailwindCSS, Socket.io Client

**Responsibilities:**
- User interface for project management and code execution
- Real-time communication with server via WebSocket
- File browsing and project configuration
- Chat-style interface for Claude Code interactions
- State management for projects, sessions, and UI

**Key Features:**
- **Project Management**: Add, browse, configure, and manage development projects
- **Real-time Chat**: Interactive interface for Claude Code commands and responses
- **File Explorer**: Browse project files and directory structures
- **Session Management**: Track and manage multiple concurrent execution sessions
- **Responsive UI**: Modern, accessible interface built with Vue 3 and TailwindCSS

### 2. Central Server (`packages/server`)

**Technology Stack:** Node.js, Express, Socket.io, TypeScript

**Responsibilities:**
- **REST API Gateway**: HTTP endpoints for project and configuration management
- **WebSocket Hub**: Real-time communication broker between web clients and agents
- **Session Management**: Track and coordinate execution sessions across the system
- **Project Management**: Store and manage project configurations and metadata
- **Security Layer**: Authentication, authorization, and input validation

**Key Services:**
- **ProjectService**: File system operations, project detection, and metadata management
- **SessionManager**: Session lifecycle, cleanup, statistics, and coordination
- **WebSocketServer**: Connection management, message routing, and real-time coordination
- **ProjectConfigService**: Project configuration persistence and management

### 3. Agent (`packages/agent`)

**Technology Stack:** Node.js, Claude Code SDK, Socket.io Client, TypeScript

**Responsibilities:**
- **Claude Code Execution**: Direct integration with Anthropic's Claude Code SDK
- **File System Access**: Safe, controlled access to local development environments
- **Project Scanning**: Automatic detection and analysis of development projects
- **WebSocket Client**: Real-time communication with central server
- **CLI Interface**: Command-line tools for standalone operations

**Key Features:**
- **Distributed Execution**: Multiple agents can run in different environments (local, containers, VMs)
- **Project Auto-Detection**: Automatic recognition of Node.js, Python, Rust, Go, Java, React, Vue, Angular projects
- **Safe Execution**: Controlled file system access with security boundaries
- **Real-time Streaming**: Live output streaming from Claude Code executions

### 4. Shared Library (`packages/shared`)

**Technology Stack:** TypeScript, ES Modules

**Responsibilities:**
- **Type Definitions**: Shared TypeScript interfaces and types across all packages
- **Protocol Definitions**: WebSocket message formats and communication protocols
- **Utility Functions**: Common functionality used by multiple packages
- **Message Factory**: Standardized creation of WebSocket messages

## Communication Patterns

### REST API (HTTP)

Used for **configuration and management operations**:
- Project CRUD operations
- Directory browsing
- System configuration
- Health checks and status

**Example Endpoints:**
```
GET    /api/projects              # List all projects
POST   /api/projects              # Add new project
GET    /api/projects/browse       # Browse file system
GET    /api/projects/:id/files    # Get project file structure
DELETE /api/projects/:id          # Remove project
```

### WebSocket (Real-time)

Used for **execution and real-time operations**:
- Claude Code command execution
- Live response streaming
- Session management
- Real-time status updates

**Message Flow Example:**
```
Web Client -> Server: ExecuteCommand { command, projectId, workingDirectory }
Server -> Agent: AgentCommand { sessionId, command, projectId, options }
Agent -> Server: CommandResponse { sessionId, data, isComplete }
Server -> Web Client: CommandResult { sessionId, data, status }
```

## Data Flow

### 1. Project Management Flow

```
User Action -> Web Client -> REST API -> Server -> File System
                |
    Project Config Storage <- Server <- Auto-Detection <- Agent
```

### 2. Claude Code Execution Flow

```
User Command -> Web Client -> WebSocket -> Server -> WebSocket -> Agent
                                                                    |
Web Client <- WebSocket <- Server <- WebSocket <- Claude Code SDK <- Agent
```

### 3. Session Management Flow

```
Session Creation -> Server (SessionManager) -> Session Storage
       |
Command Routing -> WebSocket -> Agent Selection -> Execution
       |
Response Streaming -> Real-time Updates -> Web Client
       |
Session Cleanup -> Statistics -> Logging
```

## Security Architecture

### Browser Security

- **No Direct File System Access**: All file operations go through server APIs
- **CORS Protection**: Controlled cross-origin resource sharing
- **Input Validation**: Client-side and server-side validation
- **XSS Prevention**: Content sanitization and CSP headers

### Server Security

- **Path Traversal Protection**: Normalized path resolution and validation
- **Directory Access Control**: Restricted file system access patterns
- **WebSocket Authentication**: Client type verification and session management
- **Rate Limiting**: Protection against abuse and DoS attacks

### Agent Security

- **Sandboxed Execution**: Claude Code SDK provides execution isolation
- **Working Directory Constraints**: Limited to specified project directories
- **Command Validation**: Input sanitization and command filtering
- **Network Isolation**: Agents can run in isolated environments

## Scalability and Deployment

### Horizontal Scaling

- **Multiple Agents**: Deploy agents across different machines/containers
- **Load Distribution**: Server can route commands to available agents
- **Session Affinity**: Sessions can be pinned to specific agents if needed

### Development vs Production

- **Development**: All components run locally with hot reloading
- **Production**: Components can be deployed separately:
  - Web client: Static hosting (CDN, Nginx)
  - Server: Container orchestration (Docker, Kubernetes)
  - Agents: Distributed across development environments

### Configuration Management

- **Environment Variables**: Server and agent configuration
- **Project Configs**: JSON-based project metadata storage
- **Session Persistence**: Optional session history and analytics

## Technology Choices

### Why Vue 3?

- Modern reactive framework with excellent TypeScript support
- Composition API provides better code organization
- Strong ecosystem with Vite for fast development builds

### Why Socket.io?

- Reliable WebSocket implementation with fallbacks
- Built-in room management for multi-client scenarios
- Automatic reconnection and error handling

### Why TypeScript?

- Type safety across the entire stack
- Better developer experience with IntelliSense
- Easier refactoring and maintenance

### Why Monorepo?

- Shared type definitions across packages
- Coordinated development and versioning
- Simplified dependency management

## Extension Points

### Adding New Agent Types

- Implement WebSocket client protocol
- Add project detection logic
- Register with server using standard authentication

### Custom Project Types

- Extend `ProjectDetectionResult` interface
- Add detection logic in `ProjectConfigService`
- Update agent scanning capabilities

### Additional Communication Channels

- Implement new WebSocket message types
- Add corresponding handlers in server and clients
- Update shared type definitions

## Performance Considerations

### Real-time Communication

- WebSocket connection pooling and management
- Message batching for high-frequency updates
- Automatic cleanup of stale connections

### File System Operations

- Cached project metadata and file listings
- Lazy loading of large directory structures
- Streaming for large file content

### Session Management

- Configurable session cleanup and retention policies
- Memory-efficient session storage
- Background cleanup processes

---

This architecture provides a robust, scalable foundation for distributed Claude Code execution while maintaining security, performance, and developer experience.