#!/usr/bin/env node

import { Command } from 'commander'
import { ClaudeCodeService } from './services/claude-code.service.js'
import { MockClaudeCodeService } from './services/claude-code-mock.service.js'
import { ConfigService } from './config/index.js'
import { ProjectScanner } from './scanner/project-scanner.js'

const program = new Command()

program
  .name('code-crow-agent')
  .description('Code Crow Agent CLI for testing Claude Code integration')
  .version('0.1.0')

program
  .command('execute')
  .description('Execute a Claude Code command')
  .argument('<prompt>', 'The prompt to send to Claude Code')
  .option('-w, --cwd <directory>', 'Working directory for the command')
  .option('-s, --stream', 'Stream the response in real-time')
  .option('-m, --mock', 'Use mock Claude Code service for testing')
  .action(async (prompt: string, options) => {
    try {
      const config = ConfigService.load()
      const workingDirectory = options.cwd || config.claudeCode.workingDirectory

      // Use mock service if requested, otherwise use real Claude Code SDK
      const service = options.mock 
        ? new MockClaudeCodeService(workingDirectory)
        : new ClaudeCodeService(workingDirectory)
      
      console.log(`🚀 Starting Claude Code Agent ${options.mock ? '(Mock Mode)' : ''}`)
      console.log(`📁 Working directory: ${service.getWorkingDirectory()}`)
      console.log(`💬 Prompt: "${prompt}"`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      let result
      
      if (options.stream) {
        result = await service.executeStream(
          prompt,
          (chunk) => {
            process.stdout.write(chunk)
          },
          { workingDirectory }
        )
      } else {
        result = await service.execute(prompt, { workingDirectory })
        console.log(result.output)
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      if (result.success) {
        console.log(`✅ Command completed successfully in ${result.duration}ms`)
        process.exit(0)
      } else {
        console.error(`❌ Command failed: ${result.error}`)
        process.exit(1)
      }

    } catch (error) {
      console.error('❌ CLI execution failed:', error)
      process.exit(1)
    }
  })

program
  .command('scan')
  .description('Scan for projects in the configured directories')
  .argument('[path]', 'Specific path to scan (optional)')
  .option('-d, --depth <number>', 'Scan depth', '3')
  .action(async (path: string | undefined, options) => {
    try {
      const config = ConfigService.load()
      const scanner = new ProjectScanner(config)
      
      const scanPath = path || config.projectPaths[0] || process.cwd()
      const depth = parseInt(options.depth)

      console.log(`🔍 Scanning for projects in: ${scanPath}`)
      console.log(`📊 Scan depth: ${depth}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      const result = await scanner.scanPath(scanPath, { maxDepth: depth })

      console.log(`\n📈 Scan Results:`)
      console.log(`   Total projects found: ${result.totalProjects}`)
      console.log(`   Scan duration: ${result.scanDuration}ms`)
      
      if (result.errors.length > 0) {
        console.log(`   Errors encountered: ${result.errors.length}`)
      }

      console.log('\n📋 Projects:')
      result.projects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name} (${project.type})`)
        console.log(`      Path: ${project.path}`)
        if (project.packageManager) {
          console.log(`      Package Manager: ${project.packageManager}`)
        }
        if (project.framework) {
          console.log(`      Framework: ${project.framework}`)
        }
        console.log('')
      })

      if (result.errors.length > 0) {
        console.log('⚠️  Errors:')
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`)
        })
      }

    } catch (error) {
      console.error('❌ Scan failed:', error)
      process.exit(1)
    }
  })

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    try {
      const config = ConfigService.load()
      console.log('📋 Code Crow Agent Configuration:')
      console.log(JSON.stringify(config, null, 2))
    } catch (error) {
      console.error('❌ Failed to load configuration:', error)
      process.exit(1)
    }
  })

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '))
  process.exit(1)
})

program.parse()