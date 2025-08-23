<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow">
    <!-- File header -->
    <div class="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-5 h-5 text-blue-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white flex items-center space-x-2">
              <span>{{ file.name }}</span>
              <span v-if="hasUnsavedChanges" class="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes"></span>
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ file.path }}
            </p>
          </div>
        </div>
        <!-- Save controls -->
        <div v-if="isCodeFile && !isLoading" class="flex items-center space-x-2">
          <button
            v-if="hasUnsavedChanges"
            @click="discardChanges"
            class="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title="Discard changes (Ctrl+Z to undo)"
          >
            Discard
          </button>
          <button
            @click="saveFile"
            :disabled="!hasUnsavedChanges || isSaving"
            :class="[
              'px-3 py-1.5 text-xs rounded transition-colors',
              hasUnsavedChanges 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            ]"
            title="Save file (Ctrl+S)"
          >
            <span v-if="isSaving" class="flex items-center space-x-1">
              <div class="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </span>
            <span v-else>Save</span>
          </button>
        </div>
      </div>
    </div>

    <!-- File content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading state -->
      <div v-if="isLoading" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading file...</p>
        </div>
      </div>

      <!-- Directory view -->
      <div v-else-if="file.type === 'directory'" class="h-full p-4">
        <div class="text-center py-8">
          <svg class="mx-auto h-16 w-16 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Directory: {{ file.name }}
          </h3>
          <p class="mt-2 text-gray-500 dark:text-gray-400">
            This is a directory. Use the file explorer to browse its contents.
          </p>
        </div>
      </div>

      <!-- Monaco Editor for code files -->
      <div 
        v-else-if="isCodeFile" 
        ref="editorContainer" 
        class="h-full w-full"
      ></div>
      
      <!-- Simple text display for non-code files -->
      <div v-else class="h-full overflow-auto">
        <pre class="p-4 text-sm font-mono whitespace-pre-wrap bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-full"><code>{{ fileContent }}</code></pre>
      </div>
    </div>

    <!-- File info footer -->
    <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div class="flex items-center space-x-4">
          <span v-if="file.size">{{ formatFileSize(file.size) }}</span>
          <span>Modified {{ formatDate(file.lastModified) }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="file.extension">{{ file.extension?.toUpperCase() }}</span>
          <span>•</span>
          <span>{{ file.type === 'file' ? 'File' : 'Directory' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ApiService, type FileInfo } from '@/services/api'
import { useProjectStore } from '@/stores/projectStore'
import * as monaco from 'monaco-editor'

interface Props {
  file: FileInfo
}

const props = defineProps<Props>()
const projectStore = useProjectStore()

const isLoading = ref(false)
const fileContent = ref('')
const originalContent = ref('')
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const editorContainer = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

// Computed property to determine if file should use Monaco Editor
const isCodeFile = computed(() => {
  const ext = props.file.extension?.toLowerCase()
  const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.json', '.html', '.css', '.scss', '.less', '.md', '.py', '.java', '.go', '.rs', '.php', '.cpp', '.c', '.cs', '.rb', '.sh', '.yaml', '.yml', '.xml', '.sql']
  return ext && codeExtensions.includes(ext)
})

// Get Monaco language from file extension
function getMonacoLanguage(extension: string | undefined): string {
  if (!extension) return 'plaintext'
  
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.vue': 'html', // Vue SFC treated as HTML for syntax highlighting
    '.json': 'json',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'scss',
    '.less': 'less',
    '.md': 'markdown',
    '.markdown': 'markdown',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.sql': 'sql',
    '.txt': 'plaintext'
  }
  
  return languageMap[extension.toLowerCase()] || 'plaintext'
}

async function loadFileContent() {
  if (props.file.type === 'directory') {
    return
  }

  isLoading.value = true
  
  try {
    // Load real file content from server
    const currentProject = projectStore.currentProject
    if (!currentProject) {
      throw new Error('No project selected')
    }

    const response = await ApiService.getFileContent(currentProject.id, props.file.path)
    
    if (response.success && response.data) {
      fileContent.value = response.data.content
      originalContent.value = response.data.content
      hasUnsavedChanges.value = false
    } else {
      throw new Error(response.error?.message || 'Failed to load file content')
    }
    
  } catch (error) {
    console.error('Failed to load file content:', error)
    fileContent.value = 'Error loading file: ' + (error instanceof Error ? error.message : 'Unknown error')
  } finally {
    isLoading.value = false
  }
  
  // Initialize Monaco Editor if it's a code file
  if (isCodeFile.value && fileContent.value) {
    await nextTick()
    initializeMonacoEditor()
  }
}

async function initializeMonacoEditor() {
  if (!editorContainer.value || !isCodeFile.value) return
  
  // Dispose existing editor
  if (editor) {
    editor.dispose()
    editor = null
  }
  
  try {
    const language = getMonacoLanguage(props.file.extension)
    
    editor = monaco.editor.create(editorContainer.value, {
      value: fileContent.value,
      language: language,
      theme: 'vs-dark', // You could make this dynamic based on user theme
      readOnly: false,  // Make it editable
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true
    })

    // Add change listener to detect modifications
    editor.onDidChangeModelContent(() => {
      const currentValue = editor?.getValue() || ''
      hasUnsavedChanges.value = currentValue !== originalContent.value
      fileContent.value = currentValue
    })

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile()
    })
  } catch (error) {
    console.error('Failed to initialize Monaco Editor:', error)
  }
}

function disposeEditor() {
  if (editor) {
    editor.dispose()
    editor = null
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown'
  
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString)
    return 'Invalid Date'
  }
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

async function saveFile() {
  if (!hasUnsavedChanges.value || isSaving.value) return
  
  isSaving.value = true
  
  try {
    const currentProject = projectStore.currentProject
    if (!currentProject) {
      throw new Error('No project selected')
    }

    const response = await ApiService.saveFileContent(currentProject.id, props.file.path, fileContent.value)
    
    if (response.success) {
      originalContent.value = fileContent.value
      hasUnsavedChanges.value = false
      console.log('✅ File saved successfully')
      
      // Show success feedback (you could add a toast notification here)
    } else {
      throw new Error(response.error?.message || 'Failed to save file')
    }
  } catch (error) {
    console.error('Failed to save file:', error)
    // Show error feedback (you could add a toast notification here)
    alert('Failed to save file: ' + (error instanceof Error ? error.message : 'Unknown error'))
  } finally {
    isSaving.value = false
  }
}

function discardChanges() {
  if (!hasUnsavedChanges.value) return
  
  if (confirm('Are you sure you want to discard your changes? This cannot be undone.')) {
    fileContent.value = originalContent.value
    hasUnsavedChanges.value = false
    
    // Update Monaco Editor content
    if (editor) {
      editor.setValue(originalContent.value)
    }
  }
}

// Cleanup on unmount
onUnmounted(() => {
  disposeEditor()
})

// Watch for file changes and load content with unsaved changes check
watch(() => props.file, async (newFile, oldFile) => {
  // Check for unsaved changes before switching files
  if (hasUnsavedChanges.value && oldFile) {
    const shouldDiscard = confirm(
      `You have unsaved changes in "${oldFile.name}". ` +
      'Do you want to discard these changes and open the new file?'
    )
    
    if (!shouldDiscard) {
      // Stay on the current file - we can't prevent the prop change,
      // but we can avoid loading the new file content
      return
    }
  }
  
  // Reset state for new file
  hasUnsavedChanges.value = false
  await loadFileContent()
}, { immediate: true })

// Add beforeunload warning for unsaved changes
onMounted(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      return e.returnValue
    }
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
})
</script>
