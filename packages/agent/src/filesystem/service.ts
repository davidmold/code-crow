import { readdir, stat } from 'fs/promises'
import { join } from 'path'

export class FileSystemService {
  constructor(private projectPaths: string[]) {}

  async getProjects() {
    const projects = []
    
    for (const projectPath of this.projectPaths) {
      try {
        const stats = await stat(projectPath)
        if (stats.isDirectory()) {
          projects.push({
            name: projectPath.split('/').pop() || 'unknown',
            path: projectPath,
            lastModified: stats.mtime
          })
        }
      } catch (error) {
        console.warn(`⚠️  Could not access project path: ${projectPath}`)
      }
    }
    
    return projects
  }

  async getProjectFiles(projectPath: string) {
    try {
      const files = await this.readDirectoryRecursive(projectPath)
      return files
    } catch (error) {
      console.error(`❌ Error reading project files: ${error}`)
      return []
    }
  }

  private async readDirectoryRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await readdir(dirPath)
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry)
        const stats = await stat(fullPath)
        
        if (stats.isDirectory() && !entry.startsWith('.')) {
          const subFiles = await this.readDirectoryRecursive(fullPath)
          files.push(...subFiles)
        } else if (stats.isFile()) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files
  }
}