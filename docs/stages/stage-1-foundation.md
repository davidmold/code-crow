# Stage 1: Foundation Setup

## Goal
Create the basic monorepo structure with all package.json files, TypeScript configuration, and minimal boilerplate. At the end of this stage, you should be able to run `npm install` and `npm run build` successfully.

## Tasks

### 1. Create Root Package Structure
Create the main directory structure and root package.json:

```
code-crow/
├── package.json              # Root workspace configuration
├── tsconfig.json             # Root TypeScript config
├── .gitignore                # Git ignore file
├── packages/
├── apps/
├── tools/
└── docs/
```

### 2. Root Package.json
Create root package.json with workspace configuration:
- Set up npm workspaces
- Add shared dev dependencies (TypeScript, ESLint, Prettier)
- Add build scripts that coordinate all packages
- Add development scripts for running everything locally

### 3. Package Directories
Create the package structure:
```
packages/
├── web/                      # Vue3 frontend
├── server/                   # Node.js API server  
├── agent/                    # Local service that talks to Claude Code
└── shared/                   # Shared types and utilities
```

### 4. Individual Package.json Files
Create package.json for each package with:
- **web**: Vue3, Vite, TypeScript, basic dependencies
- **server**: Express, Socket.io, TypeScript, basic dependencies  
- **agent**: Basic Node.js setup (Claude Code SDK comes later)
- **shared**: TypeScript and shared utilities

### 5. TypeScript Configuration
- Root tsconfig.json with shared configuration
- Individual tsconfig.json files for each package that extend the root
- Set up proper module resolution between packages

### 6. Basic Boilerplate Files
Create minimal starting files:
- **web**: Basic Vite + Vue3 app that shows "Hello World"
- **server**: Basic Express server that responds to `/api/health`
- **agent**: Basic Node.js script that logs "Agent starting"
- **shared**: Basic TypeScript types and utility functions

### 7. Development Scripts
Set up npm scripts in root package.json:
- `npm run dev` - Start all services in development mode
- `npm run build` - Build all packages
- `npm run clean` - Clean all build artifacts
- `npm run lint` - Lint all packages

## Success Criteria
- [ ] All packages install dependencies without errors
- [ ] TypeScript compiles successfully for all packages
- [ ] Development scripts start all services
- [ ] Basic "Hello World" responses from web and server
- [ ] Agent service starts without errors

## Files to Create
- Root package.json with workspaces
- tsconfig.json for root and each package
- Basic Vue3 app in packages/web
- Basic Express server in packages/server
- Basic Node.js script in packages/agent
- Shared types in packages/shared
- Development scripts and configuration

## Claude Code Command
```
Create a monorepo structure for code-crow with packages for web (Vue3), server (Express), agent (Node.js), and shared utilities. Set up all package.json files, TypeScript configuration, and basic boilerplate. Make sure everything installs and builds successfully.
```

## Next Stage
Once this foundation is solid, move to Stage 2 to add Claude Code SDK integration to the agent.
