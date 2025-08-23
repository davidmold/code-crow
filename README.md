# Code Crow

A web-based interface for Claude Code that enables remote development workflows.

## Project Structure

This is a monorepo with the following packages:

- **packages/web** - Vue3 frontend application
- **packages/server** - Node.js Express API server with WebSocket support
- **packages/agent** - Local service that connects to Claude Code SDK
- **packages/shared** - Shared TypeScript types and utilities

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Build all packages:
```bash
npm run build
```

3. Start all services in development mode:
```bash
npm run dev
```

This will start:
- Web frontend at http://localhost:5173
- API server at http://localhost:3001
- Agent service (connects to server via WebSocket)

## Development Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all packages
- `npm run clean` - Clean all build artifacts
- `npm run lint` - Lint all packages
- `npm run typecheck` - Run TypeScript type checking

## Stage 1 Complete ✅

The foundation is now set up with:
- Monorepo structure with npm workspaces
- TypeScript configuration for all packages
- Basic boilerplate for Vue3 web app, Express server, and agent
- All packages install and build successfully
- Development scripts configured

## Next Steps

See `docs/stages/stage-2-claude-code-integration.md` for the next phase of development.