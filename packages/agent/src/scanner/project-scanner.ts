import { readdir, stat, readFile } from 'fs/promises'
import { join, basename } from 'path'
import { ProjectInfo, ProjectType, ScanResult, AgentConfiguration } from '../types/index.js'
import { generateId } from '@shared/utils/index.js'

export interface ScanOptions {
  maxDepth?: number
  excludePatterns?: string[]
}

export class ProjectScanner {
  constructor(private config: AgentConfiguration) {}

  async scanPath(path: string, options: ScanOptions = {}): Promise<ScanResult> {
    const startTime = Date.now()
    const projects: ProjectInfo[] = []
    const errors: string[] = []
    
    const maxDepth = options.maxDepth || this.config.projects.scanDepth
    const excludePatterns = options.excludePatterns || this.config.projects.excludePatterns

    try {
      await this.scanDirectory(path, 0, maxDepth, excludePatterns, projects, errors)
    } catch (error) {
      errors.push(`Failed to scan ${path}: ${error instanceof Error ? error.message : String(error)}`)
    }

    const scanDuration = Date.now() - startTime

    return {
      totalProjects: projects.length,
      projects: projects.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()),
      scanDuration,
      errors
    }
  }

  async scanAllConfiguredPaths(): Promise<ScanResult> {
    const allProjects: ProjectInfo[] = []
    const allErrors: string[] = []
    let totalDuration = 0

    for (const path of this.config.projectPaths) {
      try {
        const result = await this.scanPath(path)
        allProjects.push(...result.projects)
        allErrors.push(...result.errors)
        totalDuration += result.scanDuration
      } catch (error) {
        allErrors.push(`Failed to scan configured path ${path}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Remove duplicates based on path
    const uniqueProjects = allProjects.filter((project, index, self) => 
      index === self.findIndex(p => p.path === project.path)
    )

    return {
      totalProjects: uniqueProjects.length,
      projects: uniqueProjects.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()),
      scanDuration: totalDuration,
      errors: allErrors
    }
  }

  private async scanDirectory(
    dirPath: string,
    currentDepth: number,
    maxDepth: number,
    excludePatterns: string[],
    projects: ProjectInfo[],
    errors: string[]
  ): Promise<void> {
    if (currentDepth >= maxDepth) {
      return
    }

    try {
      const stats = await stat(dirPath)
      if (!stats.isDirectory()) {
        return
      }

      // Check if this directory should be excluded
      const dirName = basename(dirPath)
      if (excludePatterns.some(pattern => dirName.includes(pattern))) {
        return
      }

      // Check if this directory is a project
      const projectInfo = await this.analyzeDirectory(dirPath)
      if (projectInfo) {
        projects.push(projectInfo)
      }

      // Scan subdirectories
      const entries = await readdir(dirPath)
      for (const entry of entries) {
        const entryPath = join(dirPath, entry)
        try {
          const entryStats = await stat(entryPath)
          if (entryStats.isDirectory()) {
            await this.scanDirectory(entryPath, currentDepth + 1, maxDepth, excludePatterns, projects, errors)
          }
        } catch (error) {
          // Skip entries we can't access
          errors.push(`Cannot access ${entryPath}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

    } catch (error) {
      errors.push(`Cannot scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async analyzeDirectory(dirPath: string): Promise<ProjectInfo | null> {
    try {
      const entries = await readdir(dirPath)
      
      const projectName = basename(dirPath)
      
      // Check for various project indicators
      const hasPackageJson = entries.includes('package.json')
      const hasCargoToml = entries.includes('Cargo.toml')
      const hasPyprojectToml = entries.includes('pyproject.toml')
      const hasRequirementsTxt = entries.includes('requirements.txt')
      const hasGoMod = entries.includes('go.mod')
      const hasPomXml = entries.includes('pom.xml')
      const hasGradleBuild = entries.includes('build.gradle') || entries.includes('build.gradle.kts')
      const hasGitRepo = entries.includes('.git')

      // Must have at least one project indicator
      if (!hasPackageJson && !hasCargoToml && !hasPyprojectToml && !hasRequirementsTxt && 
          !hasGoMod && !hasPomXml && !hasGradleBuild && !hasGitRepo) {
        return null
      }

      const projectInfo: ProjectInfo = {
        id: generateId(),
        name: projectName,
        path: dirPath,
        type: await this.determineProjectType(dirPath, entries),
        addedDate: new Date().toISOString(),
        hasGit: hasGitRepo
      }

      // Analyze package.json for additional details
      if (hasPackageJson) {
        try {
          const packageJsonContent = await readFile(join(dirPath, 'package.json'), 'utf-8')
          const packageJson = JSON.parse(packageJsonContent)
          
          const detectedPkgManager = await this.detectPackageManager(dirPath)
          if (detectedPkgManager) {
            projectInfo.packageManager = detectedPkgManager
          }
          const detectedFramework = this.detectFramework(packageJson)
          if (detectedFramework) {
            projectInfo.framework = detectedFramework
          }
        } catch (error) {
          // Continue without package.json details
        }
      }

      return projectInfo

    } catch (error) {
      return null
    }
  }

  private async determineProjectType(dirPath: string, entries: string[]): Promise<ProjectType> {
    // Node.js projects
    if (entries.includes('package.json')) {
      try {
        const packageJsonContent = await readFile(join(dirPath, 'package.json'), 'utf-8')
        const packageJson = JSON.parse(packageJsonContent)
        
        // Check for specific frameworks
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
        
        if (deps.react || deps['@types/react']) return 'react'
        if (deps.vue || deps['@vue/cli']) return 'vue'
        if (deps['@angular/core']) return 'angular'
        
        return 'node'
      } catch {
        return 'node'
      }
    }

    // Other project types
    if (entries.includes('Cargo.toml')) return 'rust'
    if (entries.includes('go.mod')) return 'go'
    if (entries.includes('pyproject.toml') || entries.includes('requirements.txt') || entries.includes('setup.py')) return 'python'
    if (entries.includes('pom.xml') || entries.includes('build.gradle') || entries.includes('build.gradle.kts')) return 'java'

    return 'unknown'
  }

  private async detectPackageManager(dirPath: string): Promise<'npm' | 'yarn' | 'pnpm' | 'bun' | undefined> {
    try {
      const entries = await readdir(dirPath)
      
      if (entries.includes('bun.lockb')) return 'bun'
      if (entries.includes('pnpm-lock.yaml')) return 'pnpm'
      if (entries.includes('yarn.lock')) return 'yarn'
      if (entries.includes('package-lock.json')) return 'npm'
      
      return 'npm' // Default for Node.js projects
    } catch {
      return undefined
    }
  }

  private detectFramework(packageJson: Record<string, unknown>): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    if (deps.react) return 'React'
    if (deps.vue) return 'Vue'
    if (deps['@angular/core']) return 'Angular'
    if (deps.svelte) return 'Svelte'
    if (deps.next) return 'Next.js'
    if (deps.nuxt) return 'Nuxt.js'
    if (deps.express) return 'Express'
    if (deps.fastify) return 'Fastify'
    if (deps['@nestjs/core']) return 'NestJS'
    
    return undefined
  }

}