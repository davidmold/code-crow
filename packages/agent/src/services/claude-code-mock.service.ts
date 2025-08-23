import { ClaudeCodeOptions, ClaudeCodeExecuteResult } from '../types/index.js'

/**
 * Mock Claude Code service for testing when the real SDK has issues
 * This can be used as a fallback during development
 */
export class MockClaudeCodeService {
  // Default options for mock service

  constructor(private workingDirectory?: string) {}

  async initialize(): Promise<void> {
    console.log('✅ Mock Claude Code service ready')
  }

  async execute(
    prompt: string, 
    _options: ClaudeCodeOptions = {}
  ): Promise<ClaudeCodeExecuteResult> {
    const startTime = Date.now()
    
    console.log(`🤖 Mock executing: "${prompt}"`)
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const mockResponse = this.generateMockResponse(prompt)
    const duration = Date.now() - startTime
    
    console.log(`✅ Mock execution completed in ${duration}ms`)

    return {
      success: true,
      output: mockResponse,
      duration
    }
  }

  async executeStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    _options: ClaudeCodeOptions = {}
  ): Promise<ClaudeCodeExecuteResult> {
    const startTime = Date.now()
    
    console.log(`🤖 Mock streaming: "${prompt}"`)
    
    const mockResponse = this.generateMockResponse(prompt)
    const chunkSize = 30
    let fullOutput = ''
    
    // Simulate streaming
    for (let i = 0; i < mockResponse.length; i += chunkSize) {
      const chunk = mockResponse.slice(i, i + chunkSize)
      fullOutput += chunk
      onChunk(chunk)
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    const duration = Date.now() - startTime
    console.log(`✅ Mock streaming completed in ${duration}ms`)

    return {
      success: true,
      output: fullOutput,
      duration
    }
  }

  isInitialized(): boolean {
    return true
  }

  getWorkingDirectory(): string {
    return this.workingDirectory || process.cwd()
  }

  setWorkingDirectory(directory: string): void {
    this.workingDirectory = directory
  }

  private generateMockResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('list') && lowerPrompt.includes('files')) {
      return `Here are the files in the current directory (${this.getWorkingDirectory()}):

- package.json
- tsconfig.json  
- src/
  - main.ts
  - cli.ts
  - services/
  - config/
  - types/
- dist/
- README.md

This is a mock response from the Code Crow agent. The real Claude Code integration is configured but may need proper authentication setup.`
    }
    
    if (lowerPrompt.includes('analyze') || lowerPrompt.includes('review')) {
      return `I've analyzed the request: "${prompt}"

This is a mock response demonstrating that the Code Crow agent infrastructure is working correctly. The Claude Code SDK integration is in place and would execute real commands once properly authenticated.

Key components working:
- ✅ Agent CLI interface  
- ✅ Project scanning
- ✅ Configuration management
- ⚠️  Claude Code SDK (needs authentication setup)
- ✅ WebSocket communication ready`
    }
    
    return `Mock response for: "${prompt}"

The Code Crow agent is successfully integrated with the Claude Code SDK architecture. This mock response demonstrates that all the infrastructure is in place and ready for real Claude Code commands once authentication is properly configured.

Working directory: ${this.getWorkingDirectory()}
Timestamp: ${new Date().toISOString()}`
  }
}