# Stage 2: Local Claude Code Integration

## Goal
Get the agent package working with the Claude Code SDK. At the end of this stage, you should be able to run the agent locally and have it execute Claude Code commands programmatically.

## Prerequisites
- Stage 1 completed (foundation setup working)
- Claude Code CLI installed and authenticated on your system
- Active Claude Pro or Max subscription

## Tasks

### 1. Add Claude Code SDK Dependency
Update packages/agent/package.json to include:
- `@anthropic-ai/claude-code` - Official Claude Code SDK
- Any additional dependencies needed for SDK integration

### 2. Create Claude Code Service
In packages/agent/src/, create a service that:
- Imports and initializes the Claude Code SDK
- Provides methods to execute Claude Code commands
- Handles streaming responses from Claude Code
- Manages authentication (uses existing CLI auth)

### 3. Create Basic CLI Interface
Create a simple command-line interface for the agent that:
- Accepts a prompt as a command-line argument
- Passes it to the Claude Code service
- Streams the response to console
- Handles errors gracefully

### 4. Test Claude Code Integration
Create test scripts that verify:
- SDK can connect and authenticate
- Simple commands execute successfully
- Streaming responses work correctly
- Error handling works for invalid commands

### 5. Add Configuration Management
Create configuration handling for:
- Claude Code working directory
- Allowed tools/permissions
- System prompts and preferences
- Debug/logging settings

### 6. Project Structure Scanning
Add functionality to:
- Scan local directories for development projects
- Identify project types (package.json, git repos, etc.)
- Store project metadata for later use

## Success Criteria
- [ ] Agent can execute Claude Code commands programmatically
- [ ] Streaming responses work correctly
- [ ] Agent can scan and identify local projects
- [ ] Error handling works for authentication and command failures
- [ ] Configuration system is working
- [ ] Can run: `node packages/agent/dist/cli.js "List files in current directory"`

## Files to Create
- packages/agent/src/services/claude-code.service.ts
- packages/agent/src/cli.ts (command-line interface)
- packages/agent/src/config/index.ts (configuration management)
- packages/agent/src/scanner/project-scanner.ts
- packages/agent/src/types/index.ts (agent-specific types)
- Test scripts to verify functionality

## Testing Commands
```bash
# Test basic Claude Code execution
npm run agent:cli "What files are in the current directory?"

# Test project scanning
npm run agent:scan ~/code

# Test with specific working directory
npm run agent:cli "Analyze this package.json file" --cwd ./packages/web
```

## Claude Code Command
```
Add Claude Code SDK integration to the agent package. Create a service that can execute Claude Code commands programmatically, handle streaming responses, and scan local projects. Include a basic CLI interface for testing.
```

## Next Stage
Once Claude Code integration is working locally, move to Stage 3 to create the basic web interface.
