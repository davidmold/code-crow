<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-800">
    <!-- Header -->
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
              @click="sessionStore.setContinueMode(!sessionStore.continueMode)"
              :class="[
                'px-2 py-1 rounded text-xs font-medium transition-colors',
                sessionStore.continueMode
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              ]"
              :title="sessionStore.continueMode ? 'Context continues between messages' : 'Each message starts fresh'"
            >
              {{ sessionStore.continueMode ? '🔗 Continue Mode' : '🆕 Fresh Mode' }}
            </button>
            
            <!-- Clear session -->
            <button
              v-if="sessionStore.hasActiveSession"
              @click="clearSession"
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Clear current session"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
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
            ></div>
            <span class="text-gray-600 dark:text-gray-300">
              {{ connectionStore.statusText }}
            </span>
          </div>
          
          <!-- Clear chat -->
          <button
            @click="clearChat"
            class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Clear chat"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Project context -->
      <div v-if="projectStore.hasCurrentProject" class="mt-2">
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <p>
            Working with: <span class="font-medium">{{ projectStore.currentProject?.name }}</span>
          </p>
          <p v-if="sessionStore.hasActiveSession && sessionStore.sessionDisplayName" class="text-xs">
            Session: <span class="font-medium">{{ sessionStore.sessionDisplayName }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Messages area -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Welcome message -->
      <div v-if="messages.length === 0" class="text-center py-8">
        <div class="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Welcome to Claude Code Chat
        </h3>
        <p class="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          Ask Claude to help with your code, explain complex concepts, debug issues, or suggest improvements. 
          <span v-if="!projectStore.hasCurrentProject" class="block mt-2 text-sm text-orange-600 dark:text-orange-400">
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
          <div class="flex items-center space-x-2 mb-1" v-if="message.role === 'assistant'">
            <div 
              :class="[
                'w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300',
                message.status === 'loading' || message.status === 'streaming'
                  ? 'bg-gray-400 animate-pulse' 
                  : 'bg-green-500'
              ]"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">Claude</span>
          </div>

          <!-- Message content -->
          <div v-if="message.status === 'loading' || message.status === 'streaming'" class="flex items-center space-x-3">
            <!-- Show whimsical status if available, otherwise default -->
            <div v-if="showStatus && currentStatusMessage" class="flex items-center space-x-3">
              <div class="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              <span class="text-sm text-blue-700 dark:text-blue-300 font-medium">{{ currentStatusMessage }}</span>
            </div>
            <div v-else class="flex items-center space-x-3">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span class="text-sm font-medium">{{ message.status === 'loading' ? 'Initializing...' : 'Thinking...' }}</span>
            </div>
          </div>
          
          <div v-else-if="message.status === 'error'" class="text-red-600 dark:text-red-400">
            <div class="flex items-center space-x-2 mb-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-sm font-medium">Error</span>
            </div>
            <p class="text-sm">{{ message.content }}</p>
          </div>
          
          <div v-else class="prose prose-sm max-w-none dark:prose-invert">
            <MessageContent :content="message.content" />
          </div>

          <!-- Message timestamp -->
          <div class="mt-2 text-xs opacity-60">
            {{ formatTimestamp(message.timestamp) }}
          </div>
        </div>
      </div>

    </div>

    <!-- Input area -->
    <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
      <form @submit.prevent="sendMessage" class="flex space-x-3">
        <div class="flex-1">
          <textarea
            ref="messageInput"
            v-model="currentMessage"
            :disabled="isProcessing || !connectionStore.isConnected"
            rows="1"
            :placeholder="inputPlaceholder"
            class="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            style="min-height: 38px; max-height: 120px;"
            @keydown="handleKeyDown"
            @input="adjustTextareaHeight"
          ></textarea>
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

    <!-- Permission Dialog -->
    <PermissionDialog
      :is-visible="permissionStore.isDialogVisible"
      :request="permissionStore.currentRequest"
      @response="handlePermissionResponse"
      @close="permissionStore.closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useChatStore } from '@/stores/chatStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useCommandExecution, useWebSocket } from '@/composables/useWebSocket'
import { webSocketService } from '@/services/websocket'
import MessageContent from './MessageContent.vue'
import PermissionDialog from './PermissionDialog.vue'
import type { CommandResult, PermissionRequest, PermissionResponse } from '@code-crow/shared'

const projectStore = useProjectStore()
const uiStore = useUiStore()
const connectionStore = useConnectionStore()
const chatStore = useChatStore()
const permissionStore = usePermissionStore()
const sessionStore = useSessionStore()
const { } = useWebSocket() // Keep for other WebSocket functionality but don't use statusText/statusColor
const { executeCommand } = useCommandExecution()

// Use chat store state instead of local state
const currentMessage = ref('')
// Get reactive refs from the store
const messages = computed(() => chatStore.currentMessages)
const isProcessing = computed(() => chatStore.isProcessing)

// Status indicator state
const currentStatusMessage = ref<string>('')
const showStatus = ref(false)
const statusMessages = {
  initializing: ['Initalizing...', 'Getting started...', 'Setting up...', 'On my marks...'],
  thinking: ['Thinking...', 'Cogitating...', 'Fiddle-faddling...', 'Pondering...', 'Considering...'],
  using_tool: {
    Read: ['Reading...'],
    Write: ['Writing...'],
    Bash: ['Running bash...'],
    default: ['Using tools...']
  },
  processing: ['Processing...'],
  completing: ['Wrapping up...', 'Finishing touches...', 'Almost done...']
}

function getRandomStatusMessage(status: string, toolName?: string): string {
  if (status === 'using_tool' && toolName) {
    const toolMessages = statusMessages.using_tool[toolName as keyof typeof statusMessages.using_tool] || statusMessages.using_tool.default
    if (toolMessages && toolMessages.length > 0) {
      const message = toolMessages[Math.floor(Math.random() * toolMessages.length)]
      return message || 'Using tools...'
    }
  } else {
    const messages = statusMessages[status as keyof typeof statusMessages]
    if (Array.isArray(messages) && messages.length > 0) {
      const message = messages[Math.floor(Math.random() * messages.length)]
      return message || 'Claude is working...'
    }
  }
  return 'Claude is working...'
}

// Debug the messages array and status (can be removed in production)
// watch(messages, (newMessages) => {
//   console.log('💬 Messages array updated:', newMessages.length, newMessages)
// }, { immediate: true, deep: true })

// watch([showStatus, currentStatusMessage], ([show, message]) => {
//   console.log('🎭 Status state:', { show, message })
// })

// Auto-scroll when messages change
watch(messages, (newMessages, oldMessages) => {
  // Only auto-scroll if messages were added or content changed
  if (newMessages.length !== oldMessages?.length || 
      newMessages.some((msg, i) => msg.content !== oldMessages?.[i]?.content)) {
    scrollToBottom()
  }
}, { flush: 'post', deep: true })

const messagesContainer = ref<HTMLElement>()
const messageInput = ref<HTMLTextAreaElement>()

const canSend = computed(() => {
  const hasMessage = currentMessage.value.trim().length > 0
  const notProcessing = !isProcessing.value
  const isConnected = connectionStore.isConnected
  const hasProject = projectStore.hasCurrentProject
  
  console.log('💬 canSend check:', { hasMessage, notProcessing, isConnected, hasProject })
  
  return hasMessage && notProcessing && isConnected && hasProject
})

const inputPlaceholder = computed(() => {
  if (!connectionStore.isConnected) {
    return 'Connecting to server...'
  }
  if (!projectStore.hasCurrentProject) {
    return 'Select a project first to get help with your code'
  }
  return 'Ask Claude to help with your code...'
})


// Set up command result handler
const unsubscribeCommandResult = useWebSocket().onCommandResult((result: CommandResult) => {
  console.log('💬 Received command result:', result)
  const message = chatStore.findMessageBySessionId(result.sessionId)
  console.log('💬 Found message for session:', message?.id, result.sessionId)
  if (!message) return

  if (result.status === 'streaming') {
    // Check for status messages
    if (result.response.startsWith('__STATUS__:')) {
      const statusType = result.response.replace('__STATUS__:', '').split(':')
      const baseStatus = statusType[0]
      const toolName = statusType[1]
      
      if (baseStatus) {
        currentStatusMessage.value = getRandomStatusMessage(baseStatus, toolName)
        showStatus.value = true
        console.log(`🎭 Status update: ${baseStatus} -> "${currentStatusMessage.value}"`)
      }
      return // Don't add status messages to chat content
    }
    
    // Append to existing content for streaming
    chatStore.updateMessage(message.id, {
      content: message.content + result.response,
      status: 'streaming'
    })
    chatStore.setStreaming(true)
  } else if (result.status === 'complete') {
    // Final response
    const newContent = message.status === 'streaming' 
      ? message.content + result.response 
      : result.response
      
    chatStore.updateMessage(message.id, {
      content: newContent,
      status: 'complete'
    })
    chatStore.setStreaming(false)
    
    // Hide status indicator on completion
    showStatus.value = false
    currentStatusMessage.value = ''
  } else if (result.status === 'error') {
    chatStore.updateMessage(message.id, {
      content: result.response || 'An error occurred while processing your command.',
      status: 'error'
    })
    chatStore.setStreaming(false)
    
    // Hide status indicator on error
    showStatus.value = false
    currentStatusMessage.value = ''
  }

  scrollToBottom()
})

async function sendMessage() {
  if (!canSend.value) return

  // Add user message through chat store
  chatStore.addMessage({
    role: 'user',
    content: currentMessage.value.trim(),
    status: 'complete'
  })

  const messageText = currentMessage.value
  currentMessage.value = ''
  adjustTextareaHeight()

  // Add loading assistant message through chat store
  const assistantMessage = chatStore.addMessage({
    role: 'assistant',
    content: '',
    status: 'loading'
  })

  chatStore.setProcessing(true)
  chatStore.setStreaming(true)
  
  // Initialize status display
  currentStatusMessage.value = getRandomStatusMessage('initializing')
  showStatus.value = true
  
  await scrollToBottom()

  try {
    if (!projectStore.currentProject?.id) {
      throw new Error('No project selected')
    }

    // Execute command via session store (with session continuity)
    const sessionId = await sessionStore.sendCommand(
      messageText,
      projectStore.currentProject.id,
      projectStore.currentProject.path
    )

    // Link the message to the session  
    chatStore.updateMessage(assistantMessage.id, { sessionId, status: 'streaming' })

    uiStore.showInfo('Command sent', 'Waiting for Claude Code response...')

  } catch (error) {
    console.error('Failed to send message:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send command. Please check your connection.'
    
    chatStore.updateMessage(assistantMessage.id, {
      content: errorMessage,
      status: 'error'
    })
    
    uiStore.showError('Failed to send message', error instanceof Error ? error.message : 'Unknown error')

  } finally {
    chatStore.setProcessing(false)
  }
}


function clearChat() {
  chatStore.clearCurrentChat()
  uiStore.showInfo('Chat cleared', 'All messages have been removed')
}

async function clearSession() {
  try {
    await sessionStore.clearCurrentSession()
    uiStore.showInfo('Session cleared', 'Claude will start fresh on your next message')
  } catch (error) {
    console.error('Failed to clear session:', error)
    uiStore.showError('Failed to clear session', error instanceof Error ? error.message : 'Unknown error')
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function adjustTextareaHeight() {
  if (messageInput.value) {
    messageInput.value.style.height = '38px'
    messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px'
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}


// Permission handling
function handlePermissionResponse(response: PermissionResponse) {
  console.log('🔐 Permission response from UI:', response)
  permissionStore.respondToPermission(response)
}

// Listen for permission responses to emit via WebSocket
function handlePermissionResponseEvent(event: CustomEvent<PermissionResponse>) {
  console.log('🔐 Emitting permission response via WebSocket:', event.detail)
  webSocketService.emitPermissionResponse(event.detail)
}

onMounted(() => {
  console.log('💬 ChatInterface mounted')
  console.log('💬 WebSocket service status:', webSocketService.getStats())
  console.log('💬 Connection state:', webSocketService.getConnectionState())
  console.log('💬 Is connected:', webSocketService.isConnected())
  
  // Set up permission event listeners
  const { } = useWebSocket()
  
  // Listen for permission requests from agents
  webSocketService.onPermissionRequest((request: PermissionRequest) => {
    console.log('🔐 Received permission request from agent:', request)
    permissionStore.addPermissionRequest(request)
  })
  
  // Listen for permission timeouts from agents
  webSocketService.onPermissionTimeout((data: { requestId: string, reason: string }) => {
    console.log('⏰ Received permission timeout from agent:', data)
    permissionStore.handlePermissionTimeout(data)
  })
  
  // Listen for custom permission response events
  window.addEventListener('permission-response', handlePermissionResponseEvent as EventListener)
  
  // Focus input and scroll to bottom when panel opens
  nextTick(() => {
    messageInput.value?.focus()
    scrollToBottom()
  })
})

onUnmounted(() => {
  // Clean up event subscriptions
  unsubscribeCommandResult()
  window.removeEventListener('permission-response', handlePermissionResponseEvent as EventListener)
})
</script>