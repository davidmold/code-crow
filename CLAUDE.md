# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run dev` - Start all services (web frontend at :3000, server at :8080, agent via WebSocket)
- `npm run build` - Build all packages
- `npm run clean` - Clean all build artifacts and node_modules
- `npm run lint` - Lint all packages
- `npm run typecheck` - Run TypeScript type checking across all packages
- `npm run test` - Run tests for all packages

### Development Server Ports
- **Web Frontend**: http://localhost:3000 (configured in packages/web/vite.config.ts)
- **API Server**: http://localhost:8080 (configured in packages/server/src/main.ts)
- **Agent Service**: Connects to server via WebSocket (no direct HTTP port)

### Individual Package Commands
- `npm run dev:web` - Start Vue3 frontend only
- `npm run dev:server` - Start Express server only  
- `npm run dev:agent` - Start agent service only
- `npm run build:web` - Build web package only
- `npm run build:server` - Build server package only
- `npm run build:agent` - Build agent package only

### Agent CLI Commands
- `npm run agent:cli` - Run agent CLI interface
- `npm run agent:execute` - Execute commands via agent CLI
- `npm run agent:scan` - Scan for projects via agent CLI

## Architecture Overview

This is a **monorepo with npm workspaces** containing a distributed web-based interface for Claude Code execution:

### Core Packages
- **packages/web** - Vue3 frontend (Vite, TailwindCSS, Socket.io client, Monaco editor)
- **packages/server** - Express API server with WebSocket hub (Socket.io, session management)
- **packages/agent** - Local service integrating Claude Code SDK (Socket.io client, project scanning)
- **packages/shared** - Shared TypeScript types and WebSocket protocols

### Communication Architecture
- **REST API** - Project management, file browsing, configuration (HTTP)
- **WebSocket** - Real-time Claude Code execution, command streaming, session management
- **Message Flow**: Web Client ↔ Server (WebSocket Hub) ↔ Distributed Agents ↔ Claude Code SDK

### Key Services
- **ProjectService** (server) - File system operations and project metadata
- **SessionManager** (server) - Session lifecycle and coordination
- **WebSocketServer** (server) - Connection management and message routing
- **ProjectScanner** (agent) - Auto-detection of project types (Node.js, Python, React, etc.)
- **ClaudeCodeService** (agent) - Direct integration with Claude Code SDK

### Data Persistence
- Project configurations stored in `packages/server/projects-config.json`
- No database required - file-based configuration management
- Session data managed in memory with configurable cleanup

## Technology Stack

### Frontend (Web Package)
- Vue 3 with Composition API and TypeScript
- Vite for development and building
- TailwindCSS for styling
- Pinia for state management
- Socket.io client for WebSocket communication
- Monaco Editor for code viewing/editing

### Backend (Server Package)
- Node.js with Express and TypeScript
- Socket.io for WebSocket hub functionality
- CORS enabled for development
- Session management with memory storage
- RESTful API for project operations

### Agent Package
- Claude Code SDK integration (`@anthropic-ai/claude-code`)
- Socket.io client for server communication
- Commander.js for CLI interface
- Project detection for multiple languages/frameworks
- File system access with security boundaries

## Development Workflow

1. **Initial Setup**: `npm install` then `npm run build`
2. **Development**: `npm run dev` starts all services concurrently
3. **Type Safety**: All packages share types via `packages/shared`
4. **WebSocket Protocol**: Defined in `packages/shared/protocols/websocket.ts`
5. **Testing**: Run `npm run test` before committing changes

## Project Structure Patterns

### WebSocket Message Types
- Execute commands, stream responses, manage sessions
- Client authentication by type (web/agent)
- Room-based message routing for multi-client scenarios

### Security Boundaries
- Agents run with restricted file system access
- Server validates all WebSocket communications
- Path traversal protection for file operations
- No direct browser access to file system

## Environment Requirements
- Node.js >=18.0.0
- npm >=9.0.0
- Claude Code SDK access for agent functionality