# Code Crow Agent

Local service that integrates with Claude Code SDK to provide programmatic access to Claude Code functionality.

## Features

- ✅ Claude Code SDK integration
- ✅ Project structure scanning  
- ✅ CLI interface for testing
- ✅ Configuration management
- ✅ WebSocket client for server communication
- ✅ Mock service for development/testing

## Quick Start

### Configuration

The agent uses environment variables for configuration:

```bash
# Server connection
CODE_CROW_SERVER_URL=http://localhost:3001

# Project paths (colon-separated)
CODE_CROW_PROJECT_PATHS=~/projects:~/code

# Claude Code settings
CODE_CROW_WORKING_DIR=~/projects/my-project
CODE_CROW_ALLOWED_TOOLS=read,write,edit,bash,search
CODE_CROW_DEBUG=false
CODE_CROW_MAX_TOKENS=4096

# Project scanning
CODE_CROW_SCAN_DEPTH=3
CODE_CROW_EXCLUDE_PATTERNS=node_modules,.git,dist,build
CODE_CROW_AUTO_SCAN=true
```

### CLI Commands

From the root directory:

```bash
# Execute Claude Code commands
npm run agent:execute "List files in current directory"
npm run agent:execute -- --mock "Analyze this project"
npm run agent:execute -- --stream "Review the code"

# Scan for projects
npm run agent:scan
npm run agent:scan ~/projects

# Show configuration
npm run agent:cli config
```

### Mock Mode

The agent includes a mock service for development and testing:

```bash
# Use mock service instead of real Claude Code SDK
npm run agent:execute -- --mock "Any command here"
```

## Architecture

### Services

- **ClaudeCodeService** - Real Claude Code SDK integration
- **MockClaudeCodeService** - Mock service for testing
- **ProjectScanner** - Scans directories for development projects
- **ConfigService** - Configuration management

### Project Detection

The scanner can identify:
- Node.js projects (package.json)
- Python projects (pyproject.toml, requirements.txt)
- Go projects (go.mod)
- Rust projects (Cargo.toml)
- Java projects (pom.xml, build.gradle)
- Framework detection (React, Vue, Angular, etc.)

## Stage 2 Complete ✅

Successfully implemented:
- ✅ Claude Code SDK dependency added
- ✅ Service layer with SDK integration
- ✅ CLI interface for testing commands
- ✅ Configuration management system
- ✅ Project structure scanning
- ✅ Mock service for development
- ✅ Error handling and fallbacks

## Authentication Setup

To use the real Claude Code SDK (not mock), ensure:

1. Claude Code CLI is installed and authenticated
2. You have an active Claude Pro/Max subscription
3. Run `claude-code auth login` if needed

## Next Steps

See `docs/stages/stage-3-web-interface.md` for the next phase of development.