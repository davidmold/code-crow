import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { webSocketService } from '../services/websocket'
import { 
  ConnectionState, 
  CONNECTION_STATES, 
  ConnectionStatus, 
  ErrorMessage 
} from '@code-crow/shared'

export const useConnectionStore = defineStore('connection', () => {
  // State
  const connectionState = ref<ConnectionState>(CONNECTION_STATES.DISCONNECTED)
  const agentConnected = ref(false)
  const activeAgents = ref(0)
  const serverStatus = ref<'healthy' | 'degraded' | 'down'>('down')
  const lastError = ref<ErrorMessage | null>(null)
  const isInitialized = ref(false)

  // Computed
  const isConnected = computed(() => 
    connectionState.value === CONNECTION_STATES.CONNECTED
  )

  const isConnecting = computed(() => 
    connectionState.value === CONNECTION_STATES.CONNECTING
  )

  const hasError = computed(() => 
    connectionState.value === CONNECTION_STATES.ERROR || lastError.value !== null
  )

  const statusText = computed(() => {
    switch (connectionState.value) {
      case CONNECTION_STATES.CONNECTED:
        return agentConnected.value 
          ? `Connected (${activeAgents.value} agents)`
          : 'Connected (no agents)'
      case CONNECTION_STATES.CONNECTING:
        return 'Connecting...'
      case CONNECTION_STATES.RECONNECTING:
        return 'Reconnecting...'
      case CONNECTION_STATES.ERROR:
        return lastError.value?.error.message || 'Connection error'
      default:
        return 'Disconnected'
    }
  })

  const statusColor = computed(() => {
    switch (connectionState.value) {
      case CONNECTION_STATES.CONNECTED:
        return agentConnected.value ? 'green' : 'yellow'
      case CONNECTION_STATES.CONNECTING:
      case CONNECTION_STATES.RECONNECTING:
        return 'blue'
      case CONNECTION_STATES.ERROR:
        return 'red'
      default:
        return 'gray'
    }
  })

  // Event handlers
  const handleConnected = () => {
    console.log('✅ WebSocket connected - updating connection store')
    connectionState.value = CONNECTION_STATES.CONNECTED
    lastError.value = null
    // Force reactivity update
    setTimeout(() => {
      connectionState.value = CONNECTION_STATES.CONNECTED
    }, 0)
  }

  const handleDisconnected = (reason: string) => {
    connectionState.value = CONNECTION_STATES.DISCONNECTED
    agentConnected.value = false
    activeAgents.value = 0
    serverStatus.value = 'down'
    console.log(`🔌 WebSocket disconnected: ${reason}`)
  }

  const handleConnectionStatus = (status: ConnectionStatus) => {
    console.log('📡 Connection status received:', status)
    console.log('📡 Before update - current values:', {
      connectionState: connectionState.value,
      agentConnected: agentConnected.value,
      activeAgents: activeAgents.value,
      serverStatus: serverStatus.value
    })
    
    agentConnected.value = status.agentConnected
    activeAgents.value = status.activeAgents
    serverStatus.value = status.serverStatus
    
    // If we're receiving connection status updates, we must be connected
    if (connectionState.value !== CONNECTION_STATES.CONNECTED) {
      console.log('📡 Connection status received - setting state to CONNECTED')
      connectionState.value = CONNECTION_STATES.CONNECTED
      lastError.value = null
    }
    
    console.log('📡 After update - current values:', {
      connectionState: connectionState.value,
      agentConnected: agentConnected.value,
      activeAgents: activeAgents.value,
      serverStatus: serverStatus.value,
      isConnected: isConnected.value,
      statusText: statusText.value,
      statusColor: statusColor.value
    })
  }

  const handleError = (error: ErrorMessage) => {
    lastError.value = error
    console.error('❌ WebSocket error:', error)
  }

  // Actions
  const initialize = async () => {
    if (isInitialized.value) {
      return
    }

    // Set up event listeners
    console.log('📡 Setting up connection store event listeners')
    webSocketService.on('connected', handleConnected)
    webSocketService.on('disconnected', handleDisconnected)
    webSocketService.on('connectionStatus', handleConnectionStatus)
    webSocketService.on('error', handleError)

    isInitialized.value = true
  }

  const connect = async () => {
    try {
      console.log('📡 Connection store: Starting connection...')
      connectionState.value = CONNECTION_STATES.CONNECTING
      lastError.value = null

      const success = await webSocketService.connect()
      console.log('📡 Connection store: WebSocket service result:', success)
      
      if (!success) {
        console.error('📡 Connection store: Connection failed')
        connectionState.value = CONNECTION_STATES.ERROR
        lastError.value = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          type: 'error',
          error: {
            code: 'CONNECTION_FAILED',
            message: 'Failed to connect to server'
          }
        }
      } else {
        console.log('📡 Connection store: Connection successful')
        // The connected event handler will set the state to CONNECTED
      }
    } catch (error) {
      console.error('📡 Connection store: Connection error:', error)
      connectionState.value = CONNECTION_STATES.ERROR
      lastError.value = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'error',
        error: {
          code: 'CONNECTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown connection error'
        }
      }
    }
  }

  const disconnect = () => {
    webSocketService.disconnect()
    connectionState.value = CONNECTION_STATES.DISCONNECTED
    agentConnected.value = false
    activeAgents.value = 0
    serverStatus.value = 'down'
    lastError.value = null
  }

  const clearError = () => {
    lastError.value = null
  }

  const retry = () => {
    clearError()
    connect()
  }

  // Cleanup function
  const cleanup = () => {
    if (isInitialized.value) {
      webSocketService.off('connected', handleConnected)
      webSocketService.off('disconnected', handleDisconnected)
      webSocketService.off('connectionStatus', handleConnectionStatus)
      webSocketService.off('error', handleError)
      
      disconnect()
      isInitialized.value = false
    }
  }

  return {
    // State
    connectionState,
    agentConnected,
    activeAgents,
    serverStatus,
    lastError,
    isInitialized,
    
    // Computed
    isConnected,
    isConnecting,
    hasError,
    statusText,
    statusColor,
    
    // Actions
    initialize,
    connect,
    disconnect,
    clearError,
    retry,
    cleanup
  }
})