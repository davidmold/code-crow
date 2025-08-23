import axios, { AxiosResponse } from 'axios'

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    })
    return config
  },
  (error) => {
    console.error('🔴 API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    })
    return response
  },
  (error) => {
    console.error('🔴 API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error?.message || error.message
    })
    return Promise.reject(error)
  }
)

// Type definitions
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    status: number
    message: string
    code: string
  }
}

export interface ProjectInfo {
  id: string
  name: string
  path: string
  type: 'node' | 'python' | 'rust' | 'go' | 'java' | 'react' | 'vue' | 'angular' | 'unknown'
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
  framework?: string
  lastModified: string
  gitRepository?: string
  description?: string
  fileCount?: number
  language?: string
}

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

// API methods
export class ApiService {
  // Health check
  static async healthCheck(): Promise<ApiResponse> {
    const response = await api.get('/health')
    return response.data
  }

  // Projects
  static async getProjects(search?: string): Promise<ApiResponse<{ projects: ProjectInfo[]; total: number }>> {
    const params = search ? { search } : undefined
    const response = await api.get('/projects', { params })
    return response.data
  }

  static async getProject(id: string): Promise<ApiResponse<{ project: ProjectInfo }>> {
    const response = await api.get(`/projects/${id}`)
    return response.data
  }

  static async getProjectFiles(id: string): Promise<ApiResponse<{ projectId: string; projectName: string; files: FileInfo[]; fileCount: number }>> {
    const response = await api.get(`/projects/${id}/files`)
    return response.data
  }

  // Test endpoint
  static async testConnection(message?: string, data?: any): Promise<ApiResponse> {
    const response = await api.post('/test', { message, data })
    return response.data
  }

  // Project management
  static async addProject(request: any): Promise<ApiResponse> {
    const response = await api.post('/projects', request)
    return response.data
  }

  static async removeProject(projectId: string, deleteFiles = false): Promise<ApiResponse> {
    const response = await api.delete(`/projects/${projectId}`, { 
      data: { deleteFiles } 
    })
    return response.data
  }

  static async browseDirectories(path?: string): Promise<ApiResponse<{
    currentPath: string
    directories: string[]
    parent: string | null
  }>> {
    const response = await api.get(`/projects/browse`, {
      params: path ? { path } : {}
    })
    return response.data
  }

  static async updateProject(projectId: string, updates: any): Promise<ApiResponse> {
    const response = await api.put(`/projects/${projectId}`, updates)
    return response.data
  }

  static async getFileContent(projectId: string, filePath: string): Promise<ApiResponse> {
    const response = await api.get(`/projects/${projectId}/content`, {
      params: { file: filePath }
    })
    return response.data
  }

  static async saveFileContent(projectId: string, filePath: string, content: string): Promise<ApiResponse> {
    const response = await api.put(`/projects/${projectId}/content`, {
      file: filePath,
      content: content
    })
    return response.data
  }

  static async getProjectStats(projectId: string): Promise<ApiResponse> {
    const response = await api.get(`/projects/${projectId}/stats`)
    return response.data
  }

  // Future Claude Code execution (placeholder)
  static async executeClaudeCode(command: string, projectId?: string): Promise<ApiResponse> {
    const response = await api.post('/claude-code/execute', { command, projectId })
    return response.data
  }
}

export default api