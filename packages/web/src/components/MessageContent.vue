<template>
  <div class="message-content" v-html="formattedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  content: string
}

const props = defineProps<Props>()

const formattedContent = computed(() => {
  let content = props.content

  // Basic markdown-like formatting
  // Bold text
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Italic text
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // Code blocks (triple backticks)
  content = content.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto"><code>$1</code></pre>')
  
  // Inline code (single backticks)
  content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
  
  // Line breaks
  content = content.replace(/\n/g, '<br>')
  
  // Links (basic support)
  content = content.replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" class="text-blue-600 hover:text-blue-800 underline">$&</a>')

  return content
})
</script>

<style scoped>
.message-content :deep(pre) {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-content :deep(code) {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
}

.message-content :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.message-content :deep(a:hover) {
  text-decoration: none;
}
</style>