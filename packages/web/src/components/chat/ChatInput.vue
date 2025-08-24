<template>
  <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
    <form
      class="flex space-x-3"
      @submit.prevent="handleSubmit"
    >
      <div class="flex-1">
        <textarea
          ref="messageInput"
          v-model="currentMessage"
          :disabled="disabled"
          rows="1"
          :placeholder="placeholder"
          class="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
          style="min-height: 38px; max-height: 120px;"
          @keydown="handleKeyDown"
          @input="adjustTextareaHeight"
        />
      </div>
      <button
        type="submit"
        :disabled="!canSend"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          class="w-4 h-4"
          :class="{ 'animate-spin': isProcessing }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            v-if="!isProcessing"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span class="ml-2">{{ isProcessing ? 'Sending...' : 'Send' }}</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Props {
  isProcessing: boolean
  isConnected: boolean
  hasCurrentProject: boolean
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send-message': [message: string]
}>()

// Template ref
const messageInput = ref<HTMLTextAreaElement | null>(null)

// Computed properties
const currentMessage = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

const disabled = computed(() => {
  return props.isProcessing || !props.isConnected
})

const canSend = computed(() => {
  const hasMessage = currentMessage.value.trim().length > 0
  const notProcessing = !props.isProcessing
  const isConnected = props.isConnected
  const hasProject = props.hasCurrentProject
  
  return hasMessage && notProcessing && isConnected && hasProject
})

const placeholder = computed(() => {
  if (!props.isConnected) {
    return 'Connecting to server...'
  }
  if (!props.hasCurrentProject) {
    return 'Select a project first to get help with your code'
  }
  return 'Ask Claude to help with your code...'
})

// Methods
function handleSubmit() {
  if (!canSend.value) return
  
  const message = currentMessage.value.trim()
  emit('send-message', message)
  emit('update:modelValue', '')
  
  // Reset textarea height after clearing
  nextTick(() => {
    adjustTextareaHeight()
  })
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}

function adjustTextareaHeight() {
  if (messageInput.value) {
    messageInput.value.style.height = '38px'
    messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px'
  }
}

// Expose methods for parent component
defineExpose({
  focus: () => messageInput.value?.focus(),
  adjustTextareaHeight
})
</script>