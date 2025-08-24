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
      <div class="relative w-full max-w-2xl transform rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              Browse for Project Directory
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
        <div class="p-6">
          <!-- Current Path -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Directory
            </label>
            <div class="flex items-center space-x-2">
              <input
                v-model="currentPath"
                type="text"
                class="flex-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                @keyup.enter="navigateToPath"
              >
              <button
                class="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-600 dark:text-blue-100 dark:hover:bg-blue-500 rounded-md transition-colors"
                @click="navigateToPath"
              >
                Go
              </button>
            </div>
          </div>

          <!-- Navigation -->
          <div class="mb-4 flex items-center space-x-2">
            <button
              :disabled="isLoading || currentPath === '/'"
              class="flex items-center px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="navigateUp"
            >
              <svg
                class="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Up
            </button>
            <button
              :disabled="isLoading"
              class="flex items-center px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="goHome"
            >
              <svg
                class="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </button>
          </div>

          <!-- Loading state -->
          <div
            v-if="isLoading"
            class="text-center py-8"
          >
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Loading directories...
            </p>
          </div>

          <!-- Error state -->
          <div
            v-else-if="error"
            class="p-4 bg-red-50 dark:bg-red-900/20 rounded-md"
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

          <!-- Directory List -->
          <div
            v-else
            class="border border-gray-200 dark:border-gray-600 rounded-md max-h-64 overflow-y-auto"
          >
            <div
              v-if="directories.length === 0"
              class="p-4 text-center text-gray-500 dark:text-gray-400"
            >
              No subdirectories found
            </div>
            <div v-else>
              <button
                v-for="directory in directories"
                :key="directory"
                class="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0 flex items-center space-x-2"
                @click="navigateToDirectory(directory)"
              >
                <svg
                  class="w-4 h-4 text-blue-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span class="text-sm text-gray-900 dark:text-white truncate">
                  {{ directory.split('/').pop() }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Click a directory to navigate, or select current directory
          </div>
          <div class="flex space-x-3">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md transition-colors"
              @click="selectCurrentDirectory"
            >
              Select This Directory
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ApiService } from '@/services/api'

interface Props {
  isOpen: boolean
  initialPath?: string
}

interface Emits {
  (event: 'close'): void
  (event: 'select', path: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const currentPath = ref(props.initialPath || '/home')
const directories = ref<string[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function loadDirectories(path?: string) {
  const targetPath = path || currentPath.value
  isLoading.value = true
  error.value = null

  try {
    const response = await ApiService.browseDirectories(targetPath)
    
    if (response.success && response.data) {
      currentPath.value = response.data.currentPath
      directories.value = response.data.directories
    } else {
      throw new Error(response.error?.message || 'Failed to browse directories')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load directories'
    directories.value = []
  } finally {
    isLoading.value = false
  }
}

function navigateToDirectory(directory: string) {
  loadDirectories(directory)
}

function navigateToPath() {
  loadDirectories(currentPath.value)
}

function navigateUp() {
  const parentPath = currentPath.value.split('/').slice(0, -1).join('/') || '/'
  loadDirectories(parentPath)
}

function goHome() {
  loadDirectories('/home')
}

function selectCurrentDirectory() {
  emit('select', currentPath.value)
  closeModal()
}

function closeModal() {
  emit('close')
}

// Load directories when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadDirectories(props.initialPath)
  }
})
</script>