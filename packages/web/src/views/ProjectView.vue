<template>
  <div class="h-full flex">
    <!-- File Explorer Sidebar -->
    <div class="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <FileExplorer />
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      <!-- Project Header -->
      <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- Back button -->
            <router-link
              to="/"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </router-link>

            <!-- Project info -->
            <div v-if="project" class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <component :is="getProjectIcon(project.type)" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ project.name }}
                </h1>
                <div class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{{ project.type }}</span>
                  <span v-if="project.framework">• {{ project.framework }}</span>
                  <span v-if="project.language">• {{ project.language }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-3">
            <button
              @click="refreshProject"
              :disabled="projectStore.isLoadingFiles"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <svg
                class="w-5 h-5"
                :class="{ 'animate-spin': projectStore.isLoadingFiles }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Project stats -->
        <div v-if="project" class="mt-4 grid grid-cols-4 gap-4">
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Files</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ project.fileCount || projectStore.projectFiles.length }}
            </div>
          </div>
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Type</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {{ project.type }}
            </div>
          </div>
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Package Manager</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ project.packageManager || 'N/A' }}
            </div>
          </div>
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Last Modified</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatDate(project.lastModified) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <div class="flex-1 overflow-hidden">
        <!-- File content viewer -->
        <div class="h-full p-6">
          <div v-if="selectedFile" class="h-full">
            <FileViewer :file="selectedFile" />
          </div>
          
          <div v-else class="h-full flex items-center justify-center">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Select a file to view
              </h3>
              <p class="mt-2 text-gray-500 dark:text-gray-400">
                Choose a file from the explorer to see its contents
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import FileExplorer from '@/components/FileExplorer.vue'
import FileViewer from '@/components/FileViewer.vue'

interface Props {
  id: string
}

const props = defineProps<Props>()
const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const uiStore = useUiStore()

const project = computed(() => projectStore.currentProject)
const selectedFile = computed(() => projectStore.selectedFile)

async function refreshProject() {
  if (project.value) {
    await projectStore.loadProjectFiles(project.value.id)
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Today'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

function getProjectIcon(type: string) {
  // Simplified icon function - could import from ProjectList component
  return () => h('svg', {
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24'
  }, h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M19 11H5m14-4H5m14 8H5m14 4H5'
  }))
}

// Load project when component mounts or route changes
watch(() => props.id, async (newId) => {
  if (newId && (!project.value || project.value.id !== newId)) {
    await projectStore.selectProject(newId)
  }
}, { immediate: true })

onMounted(async () => {
  // Ensure project is loaded
  if (props.id && (!project.value || project.value.id !== props.id)) {
    try {
      await projectStore.selectProject(props.id)
    } catch (error) {
      uiStore.showError('Project not found', 'The requested project could not be loaded')
      router.push('/')
    }
  }
})
</script>