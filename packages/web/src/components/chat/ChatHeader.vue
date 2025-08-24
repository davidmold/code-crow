<template>
  <div class="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        Claude Code Chat
      </h3>
      <div class="flex items-center space-x-2">
        <!-- Session controls -->
        <div class="flex items-center space-x-2 text-sm">
          <!-- Continue mode toggle -->
          <button
            :class="[
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              sessionStore.continueMode
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            ]"
            :title="sessionStore.continueMode ? 'Context continues between messages' : 'Each message starts fresh'"
            @click="toggleContinueMode"
          >
            {{ sessionStore.continueMode ? '🔗 Continue Mode' : '🆕 Fresh Mode' }}
          </button>
          
          <!-- Clear session -->
          <button
            v-if="sessionStore.hasActiveSession"
            class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Clear current session"
            @click="$emit('clearSession')"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
        </div>
        
        <!-- Connection status -->
        <div class="flex items-center space-x-2 text-sm">
          <div
            :class="[
              'w-2 h-2 rounded-full',
              connectionStore.statusColor === 'green' ? 'bg-green-500' : 
              connectionStore.statusColor === 'yellow' ? 'bg-yellow-500' :
              connectionStore.statusColor === 'blue' ? 'bg-blue-500' :
              connectionStore.statusColor === 'red' ? 'bg-red-500' : 'bg-gray-500'
            ]"
          />
          <span class="text-gray-600 dark:text-gray-300">
            {{ connectionStore.statusText }}
          </span>
        </div>
        
        <!-- Clear chat -->
        <button
          class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Clear chat"
          @click="$emit('clearChat')"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Project context -->
    <div
      v-if="projectStore.hasCurrentProject"
      class="mt-2"
    >
      <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <p>
          Working with: <span class="font-medium">{{ projectStore.currentProject?.name || 'Unknown' }}</span>
        </p>
        <p
          v-if="sessionStore.hasActiveSession && sessionStore.sessionDisplayName"
          class="text-xs"
        >
          Session: <span class="font-medium">{{ sessionStore.sessionDisplayName || 'Unknown' }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProjectStore } from '@/stores/projectStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useSessionStore } from '@/stores/sessionStore'

// Define events
defineEmits<{
  clearSession: []
  clearChat: []
}>()

// Store access
const projectStore = useProjectStore()
const connectionStore = useConnectionStore()
const sessionStore = useSessionStore()

// Methods
function toggleContinueMode() {
  sessionStore.setContinueMode(!sessionStore.continueMode)
}
</script>