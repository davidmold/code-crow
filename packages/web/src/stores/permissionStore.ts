import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PermissionRequest, PermissionResponse } from '@code-crow/shared'

interface RememberedPermission {
  toolName: string
  decision: 'allow' | 'deny'
  timestamp: Date
}

export const usePermissionStore = defineStore('permission', () => {
  // Current active permission request
  const currentRequest = ref<PermissionRequest | null>(null)
  
  // Queue of pending permission requests
  const requestQueue = ref<PermissionRequest[]>([])
  
  // Remembered permission decisions for this session
  const rememberedPermissions = ref<Map<string, RememberedPermission>>(new Map())
  
  // Dialog visibility
  const isDialogVisible = ref(false)

  // Computed properties
  const hasActiveRequest = computed(() => currentRequest.value !== null)
  const hasPendingRequests = computed(() => requestQueue.value.length > 0)

  // Actions
  function addPermissionRequest(request: PermissionRequest) {
    console.log(`🔐 Adding permission request: ${request.id} for ${request.toolName}`)
    
    // Check if we have a remembered decision for this tool
    const remembered = rememberedPermissions.value.get(request.toolName)
    if (remembered) {
      console.log(`🔐 Using remembered decision for ${request.toolName}: ${remembered.decision}`)
      
      // Auto-respond with remembered decision
      const response: PermissionResponse = {
        requestId: request.id,
        decision: remembered.decision,
        remember: true,
        timestamp: new Date()
      }
      
      // Emit response immediately
      emitPermissionResponse(response)
      return
    }

    // Add to queue if no current request, otherwise show immediately
    if (!currentRequest.value) {
      currentRequest.value = request
      isDialogVisible.value = true
    } else {
      requestQueue.value.push(request)
    }
  }

  function processNextRequest() {
    if (requestQueue.value.length > 0) {
      currentRequest.value = requestQueue.value.shift()!
      isDialogVisible.value = true
    } else {
      currentRequest.value = null
      isDialogVisible.value = false
    }
  }

  function respondToPermission(response: PermissionResponse) {
    if (!currentRequest.value) {
      console.warn('No active permission request to respond to')
      return
    }

    console.log(`🔐 Responding to permission: ${response.requestId} -> ${response.decision}`)

    // Remember decision if requested
    if (response.remember && currentRequest.value) {
      rememberedPermissions.value.set(currentRequest.value.toolName, {
        toolName: currentRequest.value.toolName,
        decision: response.decision,
        timestamp: new Date()
      })
      console.log(`🔐 Remembered decision for ${currentRequest.value.toolName}: ${response.decision}`)
    }

    // Emit response
    emitPermissionResponse(response)

    // Process next request
    processNextRequest()
  }

  function emitPermissionResponse(response: PermissionResponse) {
    // This will be called by the chat interface to emit the response via WebSocket
    // We'll emit a custom event that the chat interface can listen to
    window.dispatchEvent(new CustomEvent('permission-response', { detail: response }))
  }

  function handlePermissionTimeout(data: { requestId: string, reason: string }) {
    console.log(`⏰ Permission request timed out: ${data.requestId}`)
    
    if (currentRequest.value && currentRequest.value.id === data.requestId) {
      // Auto-deny the current request
      const response: PermissionResponse = {
        requestId: data.requestId,
        decision: 'deny',
        message: data.reason,
        timestamp: new Date()
      }
      
      respondToPermission(response)
    }
  }

  function clearRememberedPermissions() {
    rememberedPermissions.value.clear()
    console.log('🔐 Cleared all remembered permissions')
  }

  function closeDialog() {
    if (currentRequest.value) {
      // Auto-deny if user closes dialog
      const response: PermissionResponse = {
        requestId: currentRequest.value.id,
        decision: 'deny',
        message: 'User closed permission dialog',
        timestamp: new Date()
      }
      
      respondToPermission(response)
    } else {
      isDialogVisible.value = false
    }
  }

  return {
    // State
    currentRequest,
    requestQueue,
    rememberedPermissions,
    isDialogVisible,
    
    // Computed
    hasActiveRequest,
    hasPendingRequests,
    
    // Actions
    addPermissionRequest,
    respondToPermission,
    handlePermissionTimeout,
    clearRememberedPermissions,
    closeDialog
  }
})