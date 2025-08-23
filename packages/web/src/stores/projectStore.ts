import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ApiService, type ProjectInfo, type FileInfo } from '@/services/api'
import { useUiStore } from './uiStore'

export const useProjectStore = defineStore('project', () => {
  const uiStore = useUiStore()

  // State
  const projects = ref<ProjectInfo[]>([])
  const currentProject = ref<ProjectInfo | null>(null)
  const projectFiles = ref<FileInfo[]>([])
  const selectedFile = ref<FileInfo | null>(null)
  const searchQuery = ref('')
  const isLoadingProjects = ref(false)
  const isLoadingFiles = ref(false)
  const hasInitialized = ref(false)

  // Computed
  const filteredProjects = computed(() => {
    if (!searchQuery.value) return projects.value
    const query = searchQuery.value.toLowerCase()
    return projects.value.filter(project => 
      project.name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query) ||
      project.language?.toLowerCase().includes(query) ||
      project.framework?.toLowerCase().includes(query)
    )
  })

  const projectsByType = computed(() => {
    const groups: Record<string, ProjectInfo[]> = {}
    projects.value.forEach(project => {
      const type = project.type || 'unknown'
      if (!groups[type]) groups[type] = []
      groups[type].push(project)
    })
    return groups
  })

  const hasProjects = computed(() => projects.value.length > 0)
  const hasCurrentProject = computed(() => currentProject.value !== null)
  const hasFiles = computed(() => projectFiles.value.length > 0)

  // Actions
  async function loadProjects(search?: string) {
    isLoadingProjects.value = true
    uiStore.setLoading(true, 'Loading projects...')
    
    try {
      const response = await ApiService.getProjects(search)
      if (response.success && response.data) {
        projects.value = response.data.projects
        uiStore.showSuccess('Projects loaded', `Found ${response.data.total} projects`)
      } else {
        throw new Error(response.error?.message || 'Failed to load projects')
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
      uiStore.showError('Failed to load projects', error instanceof Error ? error.message : 'Unknown error')
      projects.value = []
    } finally {
      isLoadingProjects.value = false
      uiStore.setLoading(false)
    }
  }

  async function selectProject(projectId: string) {
    uiStore.setLoading(true, 'Loading project details...')
    
    try {
      const response = await ApiService.getProject(projectId)
      if (response.success && response.data) {
        currentProject.value = response.data.project
        await loadProjectFiles(projectId)
        uiStore.showSuccess('Project selected', `Switched to "${response.data.project.name}"`)
      } else {
        throw new Error(response.error?.message || 'Failed to load project')
      }
    } catch (error) {
      console.error('Failed to select project:', error)
      uiStore.showError('Failed to select project', error instanceof Error ? error.message : 'Unknown error')
      currentProject.value = null
    } finally {
      uiStore.setLoading(false)
    }
  }

  async function loadProjectFiles(projectId: string) {
    isLoadingFiles.value = true
    
    try {
      const response = await ApiService.getProjectFiles(projectId)
      if (response.success && response.data) {
        projectFiles.value = response.data.files
      } else {
        throw new Error(response.error?.message || 'Failed to load project files')
      }
    } catch (error) {
      console.error('Failed to load project files:', error)
      uiStore.showError('Failed to load files', error instanceof Error ? error.message : 'Unknown error')
      projectFiles.value = []
    } finally {
      isLoadingFiles.value = false
    }
  }

  function selectFile(file: FileInfo) {
    selectedFile.value = file
    uiStore.showInfo('File selected', `Selected: ${file.name}`)
  }

  function clearSelectedFile() {
    selectedFile.value = null
  }

  function clearCurrentProject() {
    currentProject.value = null
    projectFiles.value = []
    selectedFile.value = null
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  // File tree helpers
  function findFileById(files: FileInfo[], id: string): FileInfo | null {
    for (const file of files) {
      if (file.id === id) return file
      if (file.children) {
        const found = findFileById(file.children, id)
        if (found) return found
      }
    }
    return null
  }

  function getFilesByExtension(extension: string): FileInfo[] {
    const result: FileInfo[] = []
    
    function traverse(files: FileInfo[]) {
      for (const file of files) {
        if (file.type === 'file' && file.extension === extension) {
          result.push(file)
        }
        if (file.children) {
          traverse(file.children)
        }
      }
    }
    
    traverse(projectFiles.value)
    return result
  }

  // Initialize
  function initialize() {
    if (hasInitialized.value) return
    hasInitialized.value = true
    loadProjects()
  }

  return {
    // State
    projects,
    currentProject,
    projectFiles,
    selectedFile,
    searchQuery,
    isLoadingProjects,
    isLoadingFiles,
    hasInitialized,
    
    // Computed
    filteredProjects,
    projectsByType,
    hasProjects,
    hasCurrentProject,
    hasFiles,
    
    // Actions
    loadProjects,
    selectProject,
    loadProjectFiles,
    selectFile,
    clearSelectedFile,
    clearCurrentProject,
    setSearchQuery,
    findFileById,
    getFilesByExtension,
    initialize
  }
})