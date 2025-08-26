<template>
  <div class="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-end">
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

          <!-- Start New Session (forces fresh context for current project) -->
          <button
            v-if="projectStore.hasCurrentProject"
            class="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Start a new Claude session for this project"
            @click="startNewSession()"
          >
            🆕 New Session
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
      <div class="flex items-center justify-end text-sm text-gray-600 dark:text-gray-300">
        <div class="flex items-center space-x-3">
          <p
            v-if="sessionStore.hasActiveSession && sessionStore.sessionDisplayName"
            class="text-xs"
          >
            Session: <span class="font-medium">{{ sessionStore.sessionDisplayName || 'Unknown' }}</span>
          </p>
          <div
            v-if="claudeSessionId"
            class="flex items-center space-x-1 text-xs truncate max-w-[26rem]"
            :title="copyTooltip"
          >
            <span>Claude:</span>
            <span class="font-mono truncate">{{ truncatedClaudeId }}</span>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
              @click="copyClaudeSessionId"
              aria-label="Copy Claude session ID"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 7a2 2 0 012-2h7a2 2 0 012 2v9a2 2 0 01-2 2h-7a2 2 0 01-2-2V7z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M6 9H5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProjectStore } from '@/stores/projectStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useSessionStore } from '@/stores/sessionStore'
import { computed, ref } from 'vue'

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

function startNewSession() {
  if (projectStore.currentProject?.id) {
    sessionStore.startNewSession(projectStore.currentProject.id)
  }
}

// Claude session ID display for current project
const claudeSessionId = computed(() => {
  const pid = projectStore.currentProject?.id
  return pid ? sessionStore.getClaudeSessionId(pid) : undefined
})

const truncatedClaudeId = computed(() => {
  const id = claudeSessionId.value
  if (!id) return ''
  return id.length > 20 ? `${id.slice(0, 10)}…${id.slice(-8)}` : id
})

// Copy to clipboard handling
const copied = ref(false)
const copyTooltip = computed(() => (copied.value ? 'Copied!' : 'Copy Claude session ID'))
async function copyClaudeSessionId() {
  const id = claudeSessionId.value
  if (!id) return
  try {
    await navigator.clipboard.writeText(id)
    copied.value = true
    setTimeout(() => (copied.value = false), 1200)
  } catch (e) {
    // Fallback: no-op; user can still select text
    console.error('Failed to copy Claude session ID:', e)
  }
}
</script>
