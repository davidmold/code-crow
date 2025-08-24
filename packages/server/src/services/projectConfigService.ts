import fs from 'fs/promises'
import path from 'path'
import { 
  ProjectsConfig, 
  ProjectInfo, 
  AddProjectRequest, 
  AddProjectResponse,
  ProjectDetectionResult,
  RemoveProjectRequest,
  UpdateProjectRequest
} from '@code-crow/shared'

export class ProjectConfigService {
  private static instance: ProjectConfigService
  private configPath: string
  private config: ProjectsConfig | null = null

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'projects-config.json')
  }

  static getInstance(configPath?: string): ProjectConfigService {
    if (!ProjectConfigService.instance) {
      ProjectConfigService.instance = new ProjectConfigService(configPath)
    }
    return ProjectConfigService.instance
  }

  async loadConfig(): Promise<ProjectsConfig> {
    if (this.config) {
      return this.config
    }

    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      this.config = JSON.parse(data)
      
      // Validate and migrate config if needed
      this.config = this.validateAndMigrateConfig(this.config!)
      
    } catch (error) {
      console.log('🆕 Creating new projects config file')
      this.config = {
        projects: [],
        lastModified: new Date().toISOString(),
        version: '1.0.0'
      }
      await this.saveConfig()
    }

    return this.config
  }

  private validateAndMigrateConfig(config: Record<string, unknown>): ProjectsConfig {
    // Ensure all required fields exist
    if (!config.projects) config.projects = []
    if (!config.lastModified) config.lastModified = new Date().toISOString()
    if (!config.version) config.version = '1.0.0'

    // Migrate and validate each project
    const projects = Array.isArray(config.projects) ? config.projects : [];
    config.projects = projects.filter((project: Record<string, unknown>) => {
      // Basic validation
      if (!project.id || !project.name || !project.path) {
        return false
      }
      
      // Migration: convert addedDate to lastModified if needed
      if (project.addedDate && !project.lastModified) {
        project.lastModified = project.addedDate
        delete project.addedDate
        console.log(`🔄 Migrated project "${project.name}" from addedDate to lastModified`)
      }
      
      // Ensure lastModified exists
      if (!project.lastModified) {
        project.lastModified = new Date().toISOString()
        console.log(`🔄 Added missing lastModified to project "${project.name}"`)
      }
      
      return true
    })

    return config as ProjectsConfig
  }

  async saveConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('No config loaded')
    }

    this.config.lastModified = new Date().toISOString()
    
    try {
      await fs.writeFile(
        this.configPath, 
        JSON.stringify(this.config, null, 2), 
        'utf-8'
      )
      console.log('💾 Projects config saved')
    } catch (error) {
      console.error('❌ Failed to save projects config:', error)
      throw error
    }
  }

  async getAllProjects(): Promise<ProjectInfo[]> {
    const config = await this.loadConfig()
    return config.projects
  }

  async getProject(id: string): Promise<ProjectInfo | null> {
    const config = await this.loadConfig()
    return config.projects.find(p => p.id === id) || null
  }

  async addProject(request: AddProjectRequest): Promise<AddProjectResponse> {
    try {
      const config = await this.loadConfig()

      // Check if project already exists
      const existingProject = config.projects.find(p => p.path === request.directoryPath)
      if (existingProject) {
        return {
          success: false,
          error: 'Project already exists in workspace'
        }
      }

      // Verify directory exists and is accessible
      try {
        const stats = await fs.stat(request.directoryPath)
        if (!stats.isDirectory()) {
          return {
            success: false,
            error: 'Path is not a directory'
          }
        }
      } catch (error) {
        return {
          success: false,
          error: 'Directory does not exist or is not accessible'
        }
      }

      // Auto-detect project type
      const detection = await this.detectProjectType(request.directoryPath)
      
      // Create project info
      const project: ProjectInfo = {
        id: this.generateProjectId(),
        name: request.customName || detection.name,
        path: request.directoryPath,
        type: detection.type,
        lastModified: new Date().toISOString(),
        ...(request.description ? { description: request.description } : {}),
        ...(detection.framework ? { framework: detection.framework } : {}),
        ...(detection.packageManager ? { packageManager: detection.packageManager } : {}),
        ...(detection.language ? { language: detection.language } : {}),
        ...(detection.hasGit !== undefined ? { hasGit: detection.hasGit } : {})
      }

      // Add file count and size if possible
      try {
        const projectStats = await this.getProjectStats(request.directoryPath)
        project.fileCount = projectStats.fileCount
        project.size = projectStats.size
      } catch (error) {
        console.warn('Could not get project stats:', error)
      }

      // Add to config
      config.projects.push(project)
      await this.saveConfig()

      console.log(`✅ Added project: ${project.name} (${project.type})`)

      return {
        success: true,
        project,
        detection
      }

    } catch (error) {
      console.error('❌ Failed to add project:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async removeProject(request: RemoveProjectRequest): Promise<boolean> {
    try {
      const config = await this.loadConfig()
      
      const projectIndex = config.projects.findIndex(p => p.id === request.projectId)
      if (projectIndex === -1) {
        return false
      }

      const project = config.projects[projectIndex]
      config.projects.splice(projectIndex, 1)
      
      await this.saveConfig()
      
      console.log(`🗑️ Removed project: ${project!.name}`)
      return true

    } catch (error) {
      console.error('❌ Failed to remove project:', error)
      return false
    }
  }

  async updateProject(request: UpdateProjectRequest): Promise<boolean> {
    try {
      const config = await this.loadConfig()
      
      const project = config.projects.find(p => p.id === request.projectId)
      if (!project) {
        return false
      }

      // Update allowed fields
      Object.assign(project, request.updates)
      
      await this.saveConfig()
      
      console.log(`📝 Updated project: ${project.name}`)
      return true

    } catch (error) {
      console.error('❌ Failed to update project:', error)
      return false
    }
  }

  async detectProjectType(directoryPath: string): Promise<ProjectDetectionResult> {
    try {
      const files = await fs.readdir(directoryPath)
      const fileSet = new Set(files)

      // Check for specific project files
      if (fileSet.has('package.json')) {
        const packageJson = await this.readPackageJson(path.join(directoryPath, 'package.json'))
        return this.analyzeNodeProject(packageJson, directoryPath)
      }

      if (fileSet.has('Cargo.toml')) {
        return this.analyzeRustProject(directoryPath)
      }

      if (fileSet.has('go.mod') || fileSet.has('go.sum')) {
        return this.analyzeGoProject(directoryPath)
      }

      if (fileSet.has('requirements.txt') || fileSet.has('pyproject.toml') || fileSet.has('setup.py')) {
        return this.analyzePythonProject(directoryPath, fileSet)
      }

      if (fileSet.has('pom.xml') || fileSet.has('build.gradle')) {
        return this.analyzeJavaProject(directoryPath, fileSet)
      }

      // Default detection
      return {
        type: 'unknown',
        name: path.basename(directoryPath),
        hasGit: fileSet.has('.git')
      }

    } catch (error) {
      console.warn('Project detection failed:', error)
      return {
        type: 'unknown',
        name: path.basename(directoryPath),
        hasGit: false
      }
    }
  }

  private async analyzeNodeProject(packageJson: Record<string, unknown>, directoryPath: string): Promise<ProjectDetectionResult> {
    const name = packageJson.name || path.basename(directoryPath)
    const hasGit = await this.hasGitDirectory(directoryPath)
    
    // Detect framework
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    if (deps.react || deps['@types/react']) {
      return {
        type: 'react',
        name,
        framework: 'React',
        packageManager: await this.detectPackageManager(directoryPath),
        language: deps.typescript || deps['@types/node'] ? 'TypeScript' : 'JavaScript',
        hasGit
      }
    }

    if (deps.vue || deps['@vue/cli-service']) {
      return {
        type: 'vue',
        name,
        framework: 'Vue.js',
        packageManager: await this.detectPackageManager(directoryPath),
        language: deps.typescript || deps['@types/node'] ? 'TypeScript' : 'JavaScript',
        hasGit
      }
    }

    if (deps['@angular/core']) {
      return {
        type: 'angular',
        name,
        framework: 'Angular',
        packageManager: await this.detectPackageManager(directoryPath),
        language: 'TypeScript',
        hasGit
      }
    }

    return {
      type: 'node',
      name,
      framework: 'Node.js',
      packageManager: await this.detectPackageManager(directoryPath),
      language: deps.typescript || deps['@types/node'] ? 'TypeScript' : 'JavaScript',
      hasGit
    }
  }

  private async analyzeRustProject(directoryPath: string): Promise<ProjectDetectionResult> {
    return {
      type: 'rust',
      name: path.basename(directoryPath),
      framework: 'Rust',
      packageManager: 'cargo',
      language: 'Rust',
      hasGit: await this.hasGitDirectory(directoryPath)
    }
  }

  private async analyzeGoProject(directoryPath: string): Promise<ProjectDetectionResult> {
    return {
      type: 'go',
      name: path.basename(directoryPath),
      framework: 'Go',
      packageManager: 'go mod',
      language: 'Go',
      hasGit: await this.hasGitDirectory(directoryPath)
    }
  }

  private async analyzePythonProject(directoryPath: string, _fileSet: Set<string>): Promise<ProjectDetectionResult> {
    return {
      type: 'python',
      name: path.basename(directoryPath),
      framework: 'Python',
      packageManager: 'pip',
      language: 'Python',
      hasGit: await this.hasGitDirectory(directoryPath)
    }
  }

  private async analyzeJavaProject(directoryPath: string, fileSet: Set<string>): Promise<ProjectDetectionResult> {
    return {
      type: 'java',
      name: path.basename(directoryPath),
      framework: fileSet.has('pom.xml') ? 'Maven' : 'Gradle',
      // Java projects don't really fit the JS package manager types, so we'll omit it
      language: 'Java',
      hasGit: await this.hasGitDirectory(directoryPath)
    }
  }

  private async readPackageJson(packagePath: string): Promise<Record<string, unknown>> {
    try {
      const data = await fs.readFile(packagePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return {}
    }
  }

  private async detectPackageManager(directoryPath: string): Promise<'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'cargo' | 'go mod'> {
    try {
      const files = await fs.readdir(directoryPath)

      if (files.includes('pnpm-lock.yaml')) return 'pnpm'
      if (files.includes('yarn.lock')) return 'yarn'
      if (files.includes('bun.lockb')) return 'bun'
      return 'npm'
    } catch {
      return 'npm'
    }
  }

  private async hasGitDirectory(directoryPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path.join(directoryPath, '.git'))
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  private async getProjectStats(directoryPath: string): Promise<{ fileCount: number; size: number }> {
    let fileCount = 0
    let size = 0

    const countFiles = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          // Skip common directories that should be ignored
          if (entry.name.startsWith('.') || 
              entry.name === 'node_modules' || 
              entry.name === 'target' || 
              entry.name === 'dist' ||
              entry.name === 'build') {
            continue
          }

          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory()) {
            await countFiles(fullPath)
          } else {
            fileCount++
            try {
              const stats = await fs.stat(fullPath)
              size += stats.size
            } catch {
              // Ignore files we can't stat
            }
          }
        }
      } catch {
        // Ignore directories we can't read
      }
    }

    await countFiles(directoryPath)
    return { fileCount, size }
  }

  private generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get config file path for debugging
  getConfigPath(): string {
    return this.configPath
  }

  // Force reload config from disk
  async reloadConfig(): Promise<ProjectsConfig> {
    this.config = null
    return this.loadConfig()
  }
}