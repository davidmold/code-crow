<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-800">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          Files
        </h3>
        <div class="flex items-center space-x-2">
          <button
            :disabled="projectStore.isLoadingFiles"
            class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
            title="Refresh files"
            @click="refreshFiles"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': projectStore.isLoadingFiles }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            :title="allCollapsed ? 'Expand all' : 'Collapse all'"
            @click="toggleCollapseAll"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                v-if="allCollapsed"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18 12H6"
              />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Project info -->
      <div
        v-if="projectStore.hasCurrentProject"
        class="mt-2"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300 truncate">
          {{ projectStore.currentProject?.name }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ projectStore.projectFiles.length }} items
        </p>
      </div>
    </div>

    <!-- Search -->
    <div class="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search files..."
          class="w-full px-3 py-2 pl-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            class="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- File tree -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading state -->
      <div
        v-if="projectStore.isLoadingFiles"
        class="p-4 text-center"
      >
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Loading files...
        </p>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!projectStore.hasFiles && !projectStore.isLoadingFiles"
        class="p-4 text-center"
      >
        <svg
          class="mx-auto h-8 w-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          No files found
        </p>
      </div>

      <!-- No project selected -->
      <div
        v-else-if="!projectStore.hasCurrentProject"
        class="p-4 text-center"
      >
        <svg
          class="mx-auto h-8 w-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 11H5m14-4H5m14 8H5m14 4H5"
          />
        </svg>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Select a project to view files
        </p>
      </div>

      <!-- File tree -->
      <div
        v-else
        class="p-2"
      >
        <FileTreeNode
          v-for="file in filteredFiles"
          :key="file.id"
          :file="file"
          :selected-file="projectStore.selectedFile"
          :expanded="expandedNodes"
          @select="selectFile"
          @toggle="toggleNode"
        />
      </div>
    </div>

    <!-- Selected file info -->
    <div
      v-if="projectStore.selectedFile"
      class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4"
    >
      <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
        Selected File
      </h4>
      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p><span class="font-medium">Name:</span> {{ projectStore.selectedFile.name }}</p>
        <p><span class="font-medium">Path:</span> {{ projectStore.selectedFile.path }}</p>
        <p v-if="projectStore.selectedFile.size">
          <span class="font-medium">Size:</span> {{ formatFileSize(projectStore.selectedFile.size) }}
        </p>
        <p><span class="font-medium">Modified:</span> {{ formatDate(projectStore.selectedFile.lastModified) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import type { FileInfo } from '@/services/api'
import FileTreeNode from './FileTreeNode.vue'

const projectStore = useProjectStore()

const searchQuery = ref('')
const expandedNodes = ref(new Set<string>())

const allCollapsed = computed(() => expandedNodes.value.size === 0)

const filteredFiles = computed(() => {
  if (!searchQuery.value) {
    return projectStore.projectFiles
  }

  const query = searchQuery.value.toLowerCase()
  
  function filterFiles(files: FileInfo[]): FileInfo[] {
    const result: FileInfo[] = []
    
    for (const file of files) {
      if (file.name.toLowerCase().includes(query)) {
        result.push(file)
      } else if (file.children) {
        const filteredChildren = filterFiles(file.children)
        if (filteredChildren.length > 0) {
          result.push({
            ...file,
            children: filteredChildren
          })
        }
      }
    }
    
    return result
  }

  return filterFiles(projectStore.projectFiles)
})

function selectFile(file: FileInfo) {
  projectStore.selectFile(file)
}

function addAllDirectories(files: FileInfo[]) {
  for (const file of files) {
    if (file.type === 'directory') {
      expandedNodes.value.add(file.id)
      if (file.children) {
        addAllDirectories(file.children)
      }
    }
  }
}

function toggleNode(fileId: string) {
  if (expandedNodes.value.has(fileId)) {
    expandedNodes.value.delete(fileId)
  } else {
    expandedNodes.value.add(fileId)
  }
}

function toggleCollapseAll() {
  if (allCollapsed.value) {
    // Expand all directories
    addAllDirectories(projectStore.projectFiles)
  } else {
    // Collapse all
    expandedNodes.value.clear()
  }
}

async function refreshFiles() {
  if (projectStore.currentProject) {
    await projectStore.loadProjectFiles(projectStore.currentProject.id)
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
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function expandMatchingParents(files: FileInfo[], query: string, parentExpanded = false) {
  for (const file of files) {
    if (file.type === 'directory') {
      if (file.name.toLowerCase().includes(query.toLowerCase()) || parentExpanded) {
        expandedNodes.value.add(file.id)
      }
      
      if (file.children) {
        const hasMatchingChild = file.children.some(child => 
          child.name.toLowerCase().includes(query.toLowerCase())
        )
        expandMatchingParents(file.children, query, hasMatchingChild)
        
        if (hasMatchingChild) {
          expandedNodes.value.add(file.id)
        }
      }
    }
  }
}

// Auto-expand search results
watch(searchQuery, (newQuery) => {
  if (newQuery) {
    // Auto-expand directories that contain matches
    expandMatchingParents(projectStore.projectFiles, newQuery)
  }
})
</script>