<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-800">
    <!-- Header Component -->
    <ChatHeader
      @clear-session="clearSession"
      @clear-chat="clearChat"
    />

    <!-- Messages Component -->
    <MessageList
      ref="messageListRef"
      :messages="messages"
      :has-current-project="projectStore.hasCurrentProject"
      :show-status="showStatus"
      :current-status-message="currentStatusMessage"
    />

    <!-- Input Component -->
    <ChatInput
      v-model="currentMessage"
      :is-processing="isProcessing"
      :is-connected="connectionStore.isConnected"
      :has-current-project="projectStore.hasCurrentProject"
      @send-message="sendMessage"
    />

    <!-- Permission Handler Component -->
    <PermissionHandler
      :is-visible="permissionStore.isDialogVisible"
      :request="permissionStore.currentRequest"
      @response="handlePermissionResponse"
      @close="permissionStore.closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useChatStore } from '@/stores/chatStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useWebSocket } from '@/composables/useWebSocket'
import ChatHeader from './chat/ChatHeader.vue'
import MessageList from './chat/MessageList.vue'
import ChatInput from './chat/ChatInput.vue'
import PermissionHandler from './chat/PermissionHandler.vue'
import type { CommandResult, PermissionResponse } from '@code-crow/shared'

// Store initialization
const projectStore = useProjectStore()
const uiStore = useUiStore()
const connectionStore = useConnectionStore()
const chatStore = useChatStore()
const permissionStore = usePermissionStore()
const sessionStore = useSessionStore()

// Keep useWebSocket import for other WebSocket functionality
useWebSocket()

// Component refs
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

// Local state
const currentMessage = ref('')

// Computed properties
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
    return toolMessages[Math.floor(Math.random() * toolMessages.length)]
  }
  
  const messages = statusMessages[status as keyof typeof statusMessages]
  if (Array.isArray(messages)) {
    return messages[Math.floor(Math.random() * messages.length)]
  }
  
  return 'Processing...'
}

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

// Set up permission handler
// TODO: Re-enable when WebSocket permission methods are implemented
// const unsubscribePermissionRequest = useWebSocket().onPermissionRequest((request) => {
//   console.log('🔐 Received permission request:', request)
//   permissionStore.showDialog(request)
// })

// Methods
async function sendMessage(messageText: string) {
  // Add user message through chat store
  chatStore.addMessage({
    role: 'user',
    content: messageText.trim(),
    status: 'complete'
  })

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

function handlePermissionResponse(response: PermissionResponse) {
  console.log('🔐 Permission response:', response)
  // TODO: Re-enable when WebSocket permission methods are implemented
  // useWebSocket().sendPermissionResponse(response)
  permissionStore.closeDialog()
}

async function scrollToBottom() {
  await nextTick()
  if (messageListRef.value?.messagesContainer) {
    messageListRef.value.messagesContainer.scrollTo({
      top: messageListRef.value.messagesContainer.scrollHeight,
      behavior: 'smooth'
    })
  }
}

// Lifecycle hooks
onMounted(() => {
  scrollToBottom()
})

onUnmounted(() => {
  unsubscribeCommandResult()
  // TODO: Re-enable when permission system is fully implemented
  // unsubscribePermissionRequest()
})
</script>