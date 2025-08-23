import fs from 'fs/promises'
import path from 'path'
import { ProjectConfigService } from './projectConfigService.js'
import type { ProjectInfo } from '@code-crow/shared'

export interface FileInfo {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
  size?: number
  lastModified: string
  children?: FileInfo[]
}

// File exclusion patterns - don't include these in file listings
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'target', 'dist', 'build', 
  '.next', '.nuxt', '__pycache__', '.pytest_cache', '.coverage',
  '.venv', 'venv', 'env', '.env', 'vendor', 'bin', 'obj'
])

const EXCLUDED_FILES = new Set([
  '.DS_Store', 'Thumbs.db', '.gitignore', '.npmignore', '.dockerignore',
  'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml', 'Cargo.lock'
])

const MAX_FILE_SIZE_FOR_LISTING = 10 * 1024 * 1024 // 10MB
const MAX_DEPTH = 5 // Maximum directory depth to scan

export class ProjectService {
  private static configService = ProjectConfigService.getInstance()

  static async getProjects(): Promise<ProjectInfo[]> {
    try {
      const projects = await this.configService.getAllProjects()
      
      // Update last accessed for projects that exist on filesystem
      const updatedProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            await fs.access(project.path)
            return project
          } catch {
            // Project path no longer exists, mark it
            console.warn(`⚠️ Project path no longer exists: ${project.path}`)
            return { ...project, status: 'missing' } as any
          }
        })
      )

      return updatedProjects.filter(p => !('status' in p))
    } catch (error) {
      console.error('❌ Failed to get projects:', error)
      return []
    }
  }

  static async getProject(id: string): Promise<ProjectInfo | null> {
    try {
      const project = await this.configService.getProject(id)
      
      if (!project) {
        return null
      }

      // Check if project still exists
      try {
        await fs.access(project.path)
        
        // Update last accessed
        await this.configService.updateProject({
          projectId: id,
          updates: { lastAccessed: new Date().toISOString() }
        })
        
        return project
      } catch {
        console.warn(`⚠️ Project path no longer exists: ${project.path}`)
        return null
      }
    } catch (error) {
      console.error('❌ Failed to get project:', error)
      return null
    }
  }

  static async getProjectFiles(projectId: string): Promise<FileInfo[]> {
    try {
      const project = await this.getProject(projectId)
      
      if (!project) {
        console.warn(`⚠️ Project not found: ${projectId}`)
        return []
      }

      console.log(`📁 Reading files for project: ${project.name} at ${project.path}`)
      
      const files = await this.scanDirectory(project.path, 0, project.path)
      
      console.log(`📁 Found ${this.countFiles(files)} files in project: ${project.name}`)
      
      return files
    } catch (error) {
      console.error(`❌ Failed to get project files for ${projectId}:`, error)
      return []
    }
  }

  static async searchProjects(query: string): Promise<ProjectInfo[]> {
    try {
      const projects = await this.getProjects()
      const lowerQuery = query.toLowerCase()
      
      return projects.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.language?.toLowerCase().includes(lowerQuery) ||
        p.framework?.toLowerCase().includes(lowerQuery) ||
        p.type.toLowerCase().includes(lowerQuery)
      )
    } catch (error) {
      console.error('❌ Failed to search projects:', error)
      return []
    }
  }

  private static async scanDirectory(
    dirPath: string, 
    depth: number = 0,
    projectRoot?: string
  ): Promise<FileInfo[]> {
    if (depth > MAX_DEPTH) {
      return []
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const files: FileInfo[] = []

      for (const entry of entries) {
        // Skip excluded files and directories
        if (EXCLUDED_FILES.has(entry.name) || 
            (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name))) {
          continue
        }

        // Skip hidden files/directories (except at root level for important files)
        if (entry.name.startsWith('.') && depth > 0) {
          continue
        }

        const fullPath = path.join(dirPath, entry.name)
        // Use project root as base for relative paths, not process.cwd()
        const baseDir = projectRoot || dirPath
        const relativePath = path.relative(baseDir, fullPath)
        
        try {
          const stats = await fs.stat(fullPath)
          
          // Skip very large files
          if (entry.isFile() && stats.size > MAX_FILE_SIZE_FOR_LISTING) {
            continue
          }

          const fileInfo: FileInfo = {
            id: this.generateFileId(relativePath),
            name: entry.name,
            path: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
            type: entry.isDirectory() ? 'directory' : 'file',
            lastModified: stats.mtime.toISOString(),
            ...(entry.isFile() && stats.size !== undefined ? { size: stats.size } : {}),
            ...(entry.isFile() && path.extname(entry.name) ? { extension: path.extname(entry.name) } : {})
          }

          // Recursively scan directories (but limit children for performance)
          if (entry.isDirectory() && depth < MAX_DEPTH) {
            const children = await this.scanDirectory(fullPath, depth + 1, projectRoot || dirPath)
            if (children.length > 0) {
              fileInfo.children = children.slice(0, 100) // Limit children for performance
            }
          }

          files.push(fileInfo)
        } catch (error) {
          // Skip files we can't access
          console.debug(`Skipping inaccessible file: ${fullPath}`)
          continue
        }
      }

      // Sort: directories first, then files, both alphabetically
      return files.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

    } catch (error) {
      console.error(`❌ Failed to scan directory ${dirPath}:`, error)
      return []
    }
  }

  private static generateFileId(filePath: string): string {
    // Create a stable ID based on file path
    return Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '')
  }

  private static countFiles(files: FileInfo[]): number {
    let count = 0
    for (const file of files) {
      if (file.type === 'file') {
        count++
      }
      if (file.children) {
        count += this.countFiles(file.children)
      }
    }
    return count
  }

  // Project management methods
  static async addProject(request: any): Promise<any> {
    return this.configService.addProject(request)
  }

  static async removeProject(request: any): Promise<boolean> {
    return this.configService.removeProject(request)
  }

  static async updateProject(request: any): Promise<boolean> {
    return this.configService.updateProject(request)
  }

  // File content reading
  static async getFileContent(projectId: string, filePath: string): Promise<string | null> {
    try {
      const project = await this.getProject(projectId)
      if (!project) {
        return null
      }

      const fullPath = path.resolve(project.path, filePath.startsWith('/') ? filePath.slice(1) : filePath)
      
      // Security check - ensure file is within project directory
      if (!fullPath.startsWith(path.resolve(project.path))) {
        console.warn(`⚠️ Attempted to access file outside project: ${filePath}`)
        return null
      }

      const content = await fs.readFile(fullPath, 'utf-8')
      return content
    } catch (error) {
      console.error(`❌ Failed to read file ${filePath} in project ${projectId}:`, error)
      return null
    }
  }

  // File content writing
  static async saveFileContent(projectId: string, filePath: string, content: string): Promise<boolean> {
    try {
      const project = await this.getProject(projectId)
      if (!project) {
        console.error(`❌ Project not found: ${projectId}`)
        return false
      }

      const fullPath = path.resolve(project.path, filePath.startsWith('/') ? filePath.slice(1) : filePath)
      
      // Security check - ensure file is within project directory
      if (!fullPath.startsWith(path.resolve(project.path))) {
        console.warn(`⚠️ Attempted to write file outside project: ${filePath}`)
        return false
      }

      // Ensure the directory exists
      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })

      // Write the file content
      await fs.writeFile(fullPath, content, 'utf-8')
      
      console.log(`✅ Successfully saved file: ${filePath}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to save file ${filePath} in project ${projectId}:`, error)
      return false
    }
  }

  // Get project statistics
  static async getProjectStats(projectId: string): Promise<any> {
    try {
      const project = await this.getProject(projectId)
      if (!project) {
        return null
      }

      const files = await this.getProjectFiles(projectId)
      const fileCount = this.countFiles(files)
      
      return {
        fileCount,
        lastScanned: new Date().toISOString(),
        projectSize: project.size || 0
      }
    } catch (error) {
      console.error(`❌ Failed to get project stats for ${projectId}:`, error)
      return null
    }
  }

  static async browseDirectories(directoryPath: string): Promise<string[]> {
    try {
      // Security check - prevent directory traversal attacks
      const normalizedPath = path.resolve(directoryPath)
      
      // Additional security: only allow browsing within reasonable directories
      // This is a basic check - in production you'd want more sophisticated controls
      if (normalizedPath.includes('..')) {
        throw new Error('Invalid directory path')
      }

      const entries = await fs.readdir(normalizedPath, { withFileTypes: true })
      
      const directories = entries
        .filter(entry => entry.isDirectory())
        .filter(entry => !entry.name.startsWith('.')) // Hide hidden directories
        .map(entry => path.join(normalizedPath, entry.name))
        .sort()

      return directories
    } catch (error) {
      console.error(`❌ Failed to browse directory ${directoryPath}:`, error)
      throw new Error(`Cannot browse directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}