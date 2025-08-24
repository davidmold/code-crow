<template>
  <div
    ref="messagesContainer"
    class="flex-1 overflow-y-auto p-4 space-y-4"
  >
    <!-- Welcome message -->
    <div
      v-if="messages.length === 0"
      class="text-center py-8"
    >
      <div class="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
        <svg
          class="w-8 h-8 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Welcome to Claude Code Chat
      </h3>
      <p class="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
        Ask Claude to help with your code, explain complex concepts, debug issues, or suggest improvements. 
        <span
          v-if="!hasCurrentProject"
          class="block mt-2 text-sm text-orange-600 dark:text-orange-400"
        >
          💡 Select a project first to get contextual assistance
        </span>
      </p>
    </div>

    <!-- Messages -->
    <div
      v-for="message in messages"
      :key="message.id"
      :class="[
        'flex',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      ]"
    >
      <div
        :class="[
          'max-w-3xl rounded-lg px-4 py-2',
          message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
        ]"
      >
        <!-- Message header -->
        <div
          v-if="message.role === 'assistant'"
          class="flex items-center space-x-2 mb-1"
        >
          <div 
            :class="[
              'w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300',
              message.status === 'loading' || message.status === 'streaming'
                ? 'bg-gray-400 animate-pulse' 
                : 'bg-green-500'
            ]"
          >
            <svg
              class="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span class="text-xs text-gray-500 dark:text-gray-400">Claude</span>
        </div>

        <!-- Message content -->
        <div
          v-if="message.status === 'loading' || message.status === 'streaming'"
          class="flex items-center space-x-3"
        >
          <!-- Show status indicator -->
          <StatusIndicator 
            :show-status="showStatus"
            :current-status-message="currentStatusMessage"
            :message-status="message.status"
          />
        </div>
        
        <div
          v-else-if="message.status === 'error'"
          class="text-red-600 dark:text-red-400"
        >
          <div class="flex items-center space-x-2 mb-1">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-sm font-medium">Error</span>
          </div>
          <p class="text-sm">
            {{ message.content }}
          </p>
        </div>
        
        <div
          v-else
          class="prose prose-sm max-w-none dark:prose-invert"
        >
          <MessageContent :content="message.content" />
        </div>

        <!-- Message timestamp -->
        <div class="mt-2 text-xs opacity-60">
          {{ formatTimestamp(message.timestamp) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import MessageContent from '../MessageContent.vue'
import StatusIndicator from './StatusIndicator.vue'
import type { Message } from '@/stores/chatStore'

interface Props {
  messages: Message[]
  hasCurrentProject: boolean
  showStatus: boolean
  currentStatusMessage: string
}

const props = defineProps<Props>()

// Template ref
const messagesContainer = ref<HTMLElement | null>(null)

// Methods
function formatTimestamp(timestamp: Date) {
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Auto-scroll to bottom when messages change
watch(() => props.messages.length, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

// Expose the container ref for parent access
defineExpose({
  messagesContainer
})
</script>