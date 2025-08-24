<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <svg
            class="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Permission Required
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Claude needs your permission to continue
          </p>
        </div>
      </div>

      <!-- Permission Details -->
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
        <div class="space-y-3">
          <!-- Tool Name -->
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Action:</label>
            <p class="text-sm text-gray-900 dark:text-white font-mono">
              {{ request?.toolName }}
            </p>
          </div>

          <!-- Description -->
          <div v-if="request?.description">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">What Claude wants to do:</label>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ request.description }}
            </p>
          </div>

          <!-- Reason -->
          <div v-if="request?.reason">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Why:</label>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ request.reason }}
            </p>
          </div>

          <!-- Tool Input (collapsed by default) -->
          <div v-if="request?.toolInput && Object.keys(request.toolInput).length > 0">
            <button 
              class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center space-x-1"
              @click="showDetails = !showDetails"
            >
              <span>{{ showDetails ? 'Hide' : 'Show' }} technical details</span>
              <svg 
                :class="{ 'rotate-180': showDetails }"
                class="w-4 h-4 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              v-if="showDetails"
              class="mt-2 bg-gray-100 dark:bg-gray-600 rounded p-3"
            >
              <pre class="text-xs text-gray-700 dark:text-gray-300 overflow-auto">{{ JSON.stringify(request.toolInput, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeout Warning -->
      <div
        v-if="timeRemaining > 0"
        class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mb-4"
      >
        <div class="flex items-center space-x-2">
          <svg
            class="w-4 h-4 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-sm text-yellow-800 dark:text-yellow-200">
            Auto-deny in {{ Math.ceil(timeRemaining / 1000) }} seconds
          </span>
        </div>
        <div class="mt-2 bg-yellow-200 dark:bg-yellow-700 rounded-full h-1">
          <div 
            class="bg-yellow-600 h-1 rounded-full transition-all duration-1000"
            :style="{ width: `${(timeRemaining / (request?.timeoutMs || 30000)) * 100}%` }"
          />
        </div>
      </div>

      <!-- Remember Choice -->
      <div class="mb-6">
        <label class="flex items-center space-x-2">
          <input 
            v-model="remember" 
            type="checkbox" 
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          >
          <span class="text-sm text-gray-700 dark:text-gray-300">
            Remember this decision for this session
          </span>
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          :disabled="isResponding"
          class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-md font-medium transition-colors disabled:opacity-50"
          @click="deny"
        >
          Deny
        </button>
        <button
          :disabled="isResponding"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
          @click="allow"
        >
          Allow
        </button>
      </div>

      <!-- Responding Indicator -->
      <div
        v-if="isResponding"
        class="mt-3 flex items-center justify-center space-x-2"
      >
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        <span class="text-sm text-gray-600 dark:text-gray-400">Sending response...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { PermissionRequest, PermissionResponse } from '@code-crow/shared'

interface Props {
  isVisible: boolean
  request: PermissionRequest | null
}

interface Emits {
  (e: 'response', response: PermissionResponse): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showDetails = ref(false)
const remember = ref(false)
const isResponding = ref(false)
const timeRemaining = ref(0)
let timeoutInterval: NodeJS.Timeout | null = null

// Reset state when dialog becomes visible
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    showDetails.value = false
    remember.value = false
    isResponding.value = false
    startCountdown()
  } else {
    stopCountdown()
  }
})

// Start countdown timer
function startCountdown() {
  if (!props.request?.timeoutMs) return
  
  timeRemaining.value = props.request.timeoutMs
  
  timeoutInterval = setInterval(() => {
    timeRemaining.value -= 1000
    if (timeRemaining.value <= 0) {
      stopCountdown()
      // Auto-deny on timeout
      deny()
    }
  }, 1000)
}

function stopCountdown() {
  if (timeoutInterval) {
    clearInterval(timeoutInterval)
    timeoutInterval = null
  }
  timeRemaining.value = 0
}

async function allow() {
  if (!props.request || isResponding.value) return
  
  isResponding.value = true
  stopCountdown()

  const response: PermissionResponse = {
    requestId: props.request.id,
    decision: 'allow',
    remember: remember.value,
    timestamp: new Date()
  }

  emit('response', response)
  
  // Small delay for UX
  setTimeout(() => {
    isResponding.value = false
    emit('close')
  }, 500)
}

async function deny() {
  if (!props.request || isResponding.value) return
  
  isResponding.value = true
  stopCountdown()

  const response: PermissionResponse = {
    requestId: props.request.id,
    decision: 'deny',
    remember: remember.value,
    message: 'Permission denied by user',
    timestamp: new Date()
  }

  emit('response', response)
  
  // Small delay for UX
  setTimeout(() => {
    isResponding.value = false
    emit('close')
  }, 500)
}

// Cleanup on unmount
onUnmounted(() => {
  stopCountdown()
})

// Handle escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isVisible && !isResponding.value) {
    deny()
  }
}

// Add event listener when component mounts
document.addEventListener('keydown', handleKeydown)

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>