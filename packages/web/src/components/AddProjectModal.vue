<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto"
  >
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="closeModal"
    />

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-md transform rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              Add New Project
            </h3>
            <button
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              @click="closeModal"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <form
          class="p-6 space-y-4"
          @submit.prevent="addProject"
        >
          <!-- Directory Path -->
          <div>
            <label
              for="directoryPath"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Project Directory *
            </label>
            <div class="flex space-x-2">
              <input
                id="directoryPath"
                v-model="form.directoryPath"
                type="text"
                required
                placeholder="/path/to/your/project"
                class="flex-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
              <button
                type="button"
                class="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                @click="browseDirectory"
              >
                Browse
              </button>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter the full path to your project directory
            </p>
          </div>

          <!-- Custom Name -->
          <div>
            <label
              for="customName"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Custom Name (optional)
            </label>
            <input
              id="customName"
              v-model="form.customName"
              type="text"
              placeholder="Leave empty to auto-detect"
              class="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
          </div>

          <!-- Description -->
          <div>
            <label
              for="description"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              v-model="form.description"
              rows="3"
              placeholder="Brief description of this project..."
              class="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          <!-- Auto-detect checkbox -->
          <div class="flex items-center">
            <input
              id="autoDetect"
              v-model="form.autoDetect"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            >
            <label
              for="autoDetect"
              class="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Auto-detect project type and framework
            </label>
          </div>

          <!-- Detection Preview -->
          <div
            v-if="detectionResult"
            class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md"
          >
            <h4 class="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              🔍 Detection Preview
            </h4>
            <div class="text-xs space-y-1">
              <p><span class="font-medium">Type:</span> {{ detectionResult.type }}</p>
              <p v-if="detectionResult.framework">
                <span class="font-medium">Framework:</span> {{ detectionResult.framework }}
              </p>
              <p v-if="detectionResult.language">
                <span class="font-medium">Language:</span> {{ detectionResult.language }}
              </p>
              <p v-if="detectionResult.packageManager">
                <span class="font-medium">Package Manager:</span> {{ detectionResult.packageManager }}
              </p>
            </div>
          </div>

          <!-- Error Display -->
          <div
            v-if="error"
            class="p-3 bg-red-50 dark:bg-red-900/20 rounded-md"
          >
            <div class="flex">
              <svg
                class="h-5 w-5 text-red-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </h3>
                <p class="mt-1 text-sm text-red-700 dark:text-red-400">
                  {{ error }}
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!form.directoryPath || isValidating"
              class="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-600 dark:text-blue-100 dark:hover:bg-blue-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="validateDirectory"
            >
              <span v-if="isValidating">Validating...</span>
              <span v-else>Validate</span>
            </button>
            <button
              type="submit"
              :disabled="!form.directoryPath || isLoading"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading">Adding...</span>
              <span v-else>Add Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Directory Browser Modal -->
    <DirectoryBrowser
      :is-open="showDirectoryBrowser"
      :initial-path="form.directoryPath || '/home'"
      @select="onDirectorySelected"
      @close="onDirectoryBrowserClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
// import { ApiService } from '@/services/api' // Unused in this component
import { useUiStore } from '@/stores/uiStore'
import { useProjectStore } from '@/stores/projectStore'
import DirectoryBrowser from './DirectoryBrowser.vue'
import type { AddProjectRequest, ProjectDetectionResult, Project } from '@code-crow/shared'

interface Props {
  isOpen: boolean
}

interface Emits {
  (event: 'close'): void
  (event: 'project-added', project: Project): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const uiStore = useUiStore()
const projectStore = useProjectStore()

const isLoading = ref(false)
const isValidating = ref(false)
const error = ref<string | null>(null)
const detectionResult = ref<ProjectDetectionResult | null>(null)
const showDirectoryBrowser = ref(false)

const form = reactive<AddProjectRequest>({
  directoryPath: '',
  customName: '',
  description: '',
  autoDetect: true
})

// Watch for directory path changes to auto-validate
watch(() => form.directoryPath, (newPath) => {
  if (newPath && form.autoDetect) {
    // Debounce validation
    setTimeout(() => {
      if (form.directoryPath === newPath) {
        validateDirectory()
      }
    }, 500)
  }
})

async function validateDirectory() {
  if (!form.directoryPath) return

  isValidating.value = true
  error.value = null
  detectionResult.value = null

  try {
    // Try to detect project type by calling the add project endpoint with a dry run
    // For now, we'll simulate this - in a real implementation you might want a separate validation endpoint
    console.log(`🔍 Validating directory: ${form.directoryPath}`)
    
    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock detection result
    detectionResult.value = {
      type: 'node',
      name: form.directoryPath.split('/').pop() || 'Unknown',
      framework: 'Unknown',
      language: 'JavaScript',
      packageManager: 'npm',
      hasGit: true
    }

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Validation failed'
  } finally {
    isValidating.value = false
  }
}

async function addProject() {
  if (!form.directoryPath) return

  isLoading.value = true
  error.value = null

  try {
    // Call the API to add the project
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form)
    })

    const result = await response.json()

    if (result.success) {
      uiStore.showSuccess('Project Added', `Successfully added "${result.data.project.name}"`)
      
      // Refresh the project store
      await projectStore.loadProjects()
      
      // Emit the new project
      emit('project-added', result.data.project)
      
      // Close the modal
      closeModal()
    } else {
      error.value = result.error?.message || 'Failed to add project'
    }

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add project'
    uiStore.showError('Error', error.value)
  } finally {
    isLoading.value = false
  }
}

function browseDirectory() {
  showDirectoryBrowser.value = true
}

function onDirectorySelected(selectedPath: string) {
  form.directoryPath = selectedPath
  showDirectoryBrowser.value = false
  uiStore.showSuccess('Directory Selected', `Selected: ${selectedPath}`)
}

function onDirectoryBrowserClose() {
  showDirectoryBrowser.value = false
}

function closeModal() {
  // Reset form
  form.directoryPath = ''
  form.customName = ''
  form.description = ''
  form.autoDetect = true
  
  // Clear state
  error.value = null
  detectionResult.value = null
  isLoading.value = false
  isValidating.value = false
  
  emit('close')
}

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeModal()
  }
}

// Add keyboard listener when modal is open
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeyDown)
  } else {
    document.removeEventListener('keydown', handleKeyDown)
  }
})
</script>