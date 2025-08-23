import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useProjectStore } from './projectStore'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status?: 'loading' | 'error' | 'complete' | 'streaming'
  sessionId?: string
}

export interface ProjectChatHistory {
  projectId: string
  messages: Message[]
  lastActive: Date
}

// Persistence functions (declared before use)
function loadProjectChatsFromStorage(): Map<string, ProjectChatHistory> {
  try {
    const stored = localStorage.getItem('chat-project-history')
    if (!stored) return new Map()
    
    const data = JSON.parse(stored)
    const chats = new Map<string, ProjectChatHistory>()
    
    for (const [projectId, chatData] of Object.entries(data)) {
      const chat = chatData as any
      chats.set(projectId, {
        projectId,
        messages: chat.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })),
        lastActive: new Date(chat.lastActive)
      })
    }
    
    console.log(`📂 Loaded ${chats.size} project chat histories from localStorage`)
    return chats
  } catch (error) {
    console.error('Failed to load chat history from localStorage:', error)
    return new Map()
  }
}

export const useChatStore = defineStore('chat', () => {
  const projectStore = useProjectStore()
  
  // Store chat history per project with localStorage persistence
  const projectChats = ref<Map<string, ProjectChatHistory>>(loadProjectChatsFromStorage())
  
  // Current chat state
  const currentMessages = ref<Message[]>([])
  const isProcessing = ref(false)
  const isStreaming = ref(false)
  
  // Computed values
  const hasMessages = computed(() => currentMessages.value.length > 0)
  const lastMessage = computed(() => 
    currentMessages.value[currentMessages.value.length - 1] || null
  )
  
  // Watch for project changes and switch chat context
  watch(
    () => projectStore.currentProject?.id,
    (newProjectId, oldProjectId) => {
      // Save current chat to old project if exists
      if (oldProjectId && currentMessages.value.length > 0) {
        saveCurrentChatToProject(oldProjectId)
      }
      
      // Load chat for new project
      if (newProjectId) {
        loadChatForProject(newProjectId)
      } else {
        // No project selected, clear current messages
        currentMessages.value = []
      }
    },
    { immediate: true }
  )
  
  // Actions
  function saveCurrentChatToProject(projectId: string) {
    if (currentMessages.value.length === 0) return
    
    projectChats.value.set(projectId, {
      projectId,
      messages: [...currentMessages.value], // Create a copy
      lastActive: new Date()
    })
    
    // Save to localStorage
    saveProjectChatsToStorage()
    
    console.log(`💾 Saved ${currentMessages.value.length} messages for project: ${projectId}`)
  }
  
  function loadChatForProject(projectId: string) {
    const projectChat = projectChats.value.get(projectId)
    
    if (projectChat) {
      currentMessages.value = [...projectChat.messages] // Create a copy
      projectChat.lastActive = new Date()
      console.log(`📂 Loaded ${projectChat.messages.length} messages for project: ${projectId}`)
    } else {
      currentMessages.value = []
      console.log(`📝 Started new chat for project: ${projectId}`)
    }
  }
  
  function addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
    const newMessage: Message = {
      id: generateMessageId(),
      timestamp: new Date(),
      ...message
    }
    
    currentMessages.value.push(newMessage)
    
    // Auto-save to current project if available
    if (projectStore.currentProject?.id) {
      saveCurrentChatToProject(projectStore.currentProject.id)
    }
    
    return newMessage
  }
  
  function updateMessage(messageId: string, updates: Partial<Message>) {
    const messageIndex = currentMessages.value.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      currentMessages.value[messageIndex] = {
        ...currentMessages.value[messageIndex],
        ...updates
      }
      
      // Auto-save to current project if available
      if (projectStore.currentProject?.id) {
        saveCurrentChatToProject(projectStore.currentProject.id)
      }
    }
  }
  
  function findMessageBySessionId(sessionId: string): Message | null {
    return currentMessages.value.find(m => m.sessionId === sessionId) || null
  }
  
  function clearCurrentChat() {
    currentMessages.value = []
    
    // Auto-save to current project if available
    if (projectStore.currentProject?.id) {
      saveCurrentChatToProject(projectStore.currentProject.id)
    }
  }
  
  function clearProjectChat(projectId: string) {
    projectChats.value.delete(projectId)
    
    // If it's the current project, also clear current messages
    if (projectStore.currentProject?.id === projectId) {
      currentMessages.value = []
    }
  }
  
  function getAllProjectChats(): ProjectChatHistory[] {
    return Array.from(projectChats.value.values())
      .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime())
  }
  
  function getProjectChatSummary(projectId: string) {
    const chat = projectChats.value.get(projectId)
    if (!chat) return null
    
    return {
      projectId,
      messageCount: chat.messages.length,
      lastActive: chat.lastActive,
      lastMessage: chat.messages[chat.messages.length - 1]?.content.slice(0, 100) + '...' || ''
    }
  }
  
  // Utility functions
  function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  // Persistence functions
  function saveProjectChatsToStorage() {
    try {
      const data: Record<string, any> = {}
      
      for (const [projectId, chat] of projectChats.value.entries()) {
        data[projectId] = {
          projectId: chat.projectId,
          messages: chat.messages,
          lastActive: chat.lastActive
        }
      }
      
      localStorage.setItem('chat-project-history', JSON.stringify(data))
      console.log(`💾 Saved ${Object.keys(data).length} project chat histories to localStorage`)
    } catch (error) {
      console.error('Failed to save chat history to localStorage:', error)
    }
  }
  
  // State setters
  function setProcessing(processing: boolean) {
    isProcessing.value = processing
  }
  
  function setStreaming(streaming: boolean) {
    isStreaming.value = streaming
  }
  
  return {
    // State
    currentMessages,
    isProcessing,
    isStreaming,
    projectChats,
    
    // Computed
    hasMessages,
    lastMessage,
    
    // Actions
    addMessage,
    updateMessage,
    findMessageBySessionId,
    clearCurrentChat,
    clearProjectChat,
    saveCurrentChatToProject,
    loadChatForProject,
    getAllProjectChats,
    getProjectChatSummary,
    setProcessing,
    setStreaming
  }
})