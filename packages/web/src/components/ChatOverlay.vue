<template>
  <div>
    <!-- Chat Overlay -->
    <div
      class="fixed top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 ease-in-out z-50 border-l border-gray-200 dark:border-gray-700"
      :class="[
        isVisible ? 'translate-x-0' : 'translate-x-full'
      ]"
      :style="{ width: overlayWidth + 'px' }"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center space-x-2">
          <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Chat</h3>
          <div v-if="projectStore.currentProject" class="text-sm text-gray-500 dark:text-gray-400">
            {{ projectStore.currentProject.name }}
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- Close button -->
          <button
            @click="$emit('close')"
            class="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Close"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Chat Interface -->
      <div class="flex-1 h-[calc(100vh-4rem)]">
        <ChatInterface />
      </div>
      
      <!-- Resize handle -->
      <div
        class="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:bg-opacity-20 transition-colors"
        @mousedown="startResize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import ChatInterface from '@/components/ChatInterface.vue'

const projectStore = useProjectStore()

const props = defineProps<{
  isVisible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const overlayWidth = ref(480)
const minWidth = 320
const maxWidth = 800

const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

function startResize(event: MouseEvent) {
  isResizing.value = true
  startX.value = event.clientX
  startWidth.value = overlayWidth.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(event: MouseEvent) {
  if (!isResizing.value) return
  
  const deltaX = startX.value - event.clientX
  const newWidth = startWidth.value + deltaX
  
  overlayWidth.value = Math.min(Math.max(newWidth, minWidth), maxWidth)
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  // Removed ESC key handler - chat should only close when explicitly closed
  
  onUnmounted(() => {
    // Clean up resize listeners if component unmounts during resize
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })
})
</script>