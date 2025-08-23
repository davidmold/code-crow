# Claude Code Brief: code-crow Project Setup

## Project Overview
Create a monorepo for **code-crow**, a web-based interface for Claude Code that enables remote development workflows. The system consists of a Vue3 web application, Node.js server, and local agent service that connects to Claude Code SDK.

## Architecture
```
Vue3 Web App ↔ Node.js Server (REST API + WebSockets) ↔ Local Agent ↔ Claude Code SDK
```

## Monorepo Structure to Create
```
code-crow/
├── package.json              # Root package.json with workspaces
├── packages/
│   ├── web/                  # Vue3 frontend application
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── components/   # Vue components
│   │   │   ├── views/        # Page views
│   │   │   ├── stores/       # Pinia stores
│   │   │   └── utils/        # Utilities
│   │   └── public/
│   ├── server/               # Node.js web server + API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── routes/       # Express routes
│   │   │   ├── websocket/    # WebSocket handlers
│   │   │   ├── middleware/   # Express middleware
│   │   │   └── types/        # TypeScript types
│   │   └── dist/
│   ├── agent/                # Local dev machine service
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── claude-code/  # Claude Code SDK integration
│   │   │   ├── filesystem/   # File system operations
│   │   │   ├── websocket/    # WebSocket client
│   │   │   └── config/       # Configuration management
│   │   └── dist/
│   └── shared/               # Shared types and utilities
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/        # Shared TypeScript types
│           ├── protocols/    # WebSocket message protocols
│           └── utils/        # Shared utilities
├── apps/
│   └── studio/               # Main development app
│       ├── package.json
│       └── scripts/          # Development scripts
├── tools/
│   └── build/                # Build configuration
└── docs/
    ├── README.md             # Main project documentation
    ├── architecture.md       # System architecture
    ├── development.md        # Development setup
    └── api.md                # API documentation
```

## Package Dependencies

### Root package.json
- Workspace configuration for all packages
- Development scripts for coordinated builds
- Shared dev dependencies (TypeScript, ESLint, Prettier)

### packages/web (Vue3 Frontend)
- Vue 3 with Composition API
- Vite for build tooling
- Pinia for state management
- Vue Router for navigation
- Axios for HTTP requests
- Socket.io-client for WebSocket connections
- Monaco Editor for code editing
- Tailwind CSS for styling

### packages/server (Node.js Server)
- Express.js for REST API
- Socket.io for WebSocket server
- CORS middleware
- Body parser middleware
- TypeScript support
- Nodemon for development

### packages/agent (Local Service)
- @anthropic-ai/claude-code SDK
- Socket.io-client for WebSocket connection
- Node.js file system APIs
- Configuration management (dotenv)
- Process management utilities

### packages/shared
- TypeScript types for all packages
- WebSocket message protocols
- Shared utility functions
- Validation schemas

## Initial Features to Implement

### Web Frontend
1. **Project Browser**: File tree component for navigating local projects
2. **Chat Interface**: Text input with syntax highlighting for Claude Code commands
3. **Response Viewer**: Real-time streaming display of Claude Code responses
4. **Session Management**: Save and restore conversation history

### Server API
1. **REST Endpoints**:
   - GET `/api/projects` - List available projects
   - GET `/api/projects/:id/files` - Browse project files
   - POST `/api/claude-code/execute` - Execute Claude Code command
   - GET `/api/sessions` - List active sessions

2. **WebSocket Events**:
   - `agent:connect` - Agent connection
   - `client:connect` - Web client connection
   - `claude-code:execute` - Execute command
   - `claude-code:response` - Stream responses
   - `claude-code:complete` - Command completion

### Local Agent
1. **Claude Code Integration**: Execute commands via SDK and stream responses
2. **File System Access**: Read project structures and file contents
3. **WebSocket Client**: Maintain connection to server and handle commands
4. **Configuration**: Manage project paths and server connection settings

## Development Workflow
1. Start with local-only setup (no remote server)
2. Implement basic project browsing and Claude Code execution
3. Add real-time streaming and session management
4. Create comprehensive documentation and examples
5. Prepare for future remote deployment capabilities

## Success Criteria
- Significantly better UX than Claude Code CLI
- Real-time visual feedback for Claude Code operations
- Reliable session management and history
- Easy project navigation and file browsing
- Smooth development workflow with coordinated builds

## Commands to Execute
1. Create the complete directory structure as outlined above
2. Generate package.json files for all packages with appropriate dependencies
3. Set up TypeScript configuration for each package
4. Create basic boilerplate files for Vue3 app, Express server, and agent service
5. Set up development scripts for coordinated building and running
6. Create initial documentation files explaining the project structure and setup

Please create this monorepo structure with all the necessary configuration files, package.json dependencies, and basic boilerplate code to get started with development.
