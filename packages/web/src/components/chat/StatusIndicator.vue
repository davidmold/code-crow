<template>
  <div class="flex items-center space-x-3">
    <!-- Show whimsical status if available, otherwise default -->
    <div
      v-if="showStatus && currentStatusMessage"
      class="flex items-center space-x-3"
    >
      <div class="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
      <span class="text-sm text-blue-700 dark:text-blue-300 font-medium">{{ currentStatusMessage }}</span>
    </div>
    <div
      v-else
      class="flex items-center space-x-3"
    >
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      <span class="text-sm font-medium">{{ messageStatus === 'loading' ? 'Initializing...' : 'Thinking...' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  showStatus: boolean
  currentStatusMessage: string
  messageStatus: 'loading' | 'streaming' | 'complete' | 'error'
}

defineProps<Props>()
</script>