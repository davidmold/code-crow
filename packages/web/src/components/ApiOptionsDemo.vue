<template>
  <div class="api-options-demo p-6 bg-white rounded-lg shadow-lg">
    <h3 class="text-lg font-semibold mb-4">Claude Code API Options Demo</h3>
    
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Command</label>
        <input 
          v-model="command" 
          class="w-full px-3 py-2 border rounded-md" 
          placeholder="Enter your command..."
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Max Turns</label>
          <input 
            v-model.number="maxTurns" 
            type="number" 
            class="w-full px-3 py-2 border rounded-md"
            min="1"
            max="20"
            placeholder="5"
          />
          <small class="text-gray-500">⚠️ Usually leave empty! Only set if you want to artificially limit Claude's ability to complete tasks</small>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Timeout (ms)</label>
          <input 
            v-model.number="timeoutMs" 
            type="number" 
            class="w-full px-3 py-2 border rounded-md"
            step="1000"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">System Prompt</label>
        <textarea 
          v-model="systemPrompt" 
          class="w-full px-3 py-2 border rounded-md" 
          rows="3"
          placeholder="Optional system prompt to guide Claude's behavior..."
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Allowed Tools (comma-separated)</label>
        <input 
          v-model="allowedToolsText" 
          class="w-full px-3 py-2 border rounded-md" 
          placeholder="bash,str_replace_editor,computer"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Permission Mode</label>
        <select 
          v-model="permissionMode" 
          class="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Default (prompt for each action)</option>
          <option value="plan">📋 Plan Mode - Claude creates a plan first, then asks for approval</option>
          <option value="allow">✅ Allow All - Execute all actions automatically</option>
          <option value="deny">❌ Deny All - Block all actions (analysis only)</option>
        </select>
      </div>

      <div class="flex items-center space-x-4">
        <label class="flex items-center">
          <input 
            v-model="newSession" 
            type="checkbox" 
            class="mr-2"
          />
          Start New Session
        </label>

        <label class="flex items-center">
          <input 
            v-model="continueSession" 
            type="checkbox" 
            class="mr-2"
          />
          Continue Session
        </label>
      </div>

      <div class="pt-4">
        <button 
          @click="executeCommand"
          :disabled="!command.trim()"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Execute with Custom Options
        </button>
      </div>

      <div v-if="lastOptions" class="mt-4 p-3 bg-gray-100 rounded-md">
        <h4 class="font-medium mb-2">Last API Options Sent:</h4>
        <pre class="text-sm overflow-x-auto">{{ JSON.stringify(lastOptions, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSessionStore } from '../stores/sessionStore'
import type { ClaudeCodeApiOptions, WebClientOptions } from '@code-crow/shared'

const sessionStore = useSessionStore()

// Form fields
const command = ref('')
const maxTurns = ref() // No default - let Claude use as many turns as needed
const timeoutMs = ref(300000)
const systemPrompt = ref('')
const allowedToolsText = ref('')
const permissionMode = ref('') // '', 'plan', 'allow', or 'deny'
const newSession = ref(false)
const continueSession = ref(true)

// Demo state
const lastOptions = ref<{ apiOptions: ClaudeCodeApiOptions; clientOptions: WebClientOptions } | null>(null)

// Computed allowedTools array
const allowedTools = computed(() => {
  return allowedToolsText.value
    .split(',')
    .map(tool => tool.trim())
    .filter(tool => tool.length > 0)
})

// Execute command with all the options
const executeCommand = async () => {
  if (!command.value.trim()) return

  const apiOptions: ClaudeCodeApiOptions = {
    // Only include maxTurns if explicitly set (usually you shouldn't set this!)
    ...(maxTurns.value && maxTurns.value > 0 ? { maxTurns: maxTurns.value } : {}),
    ...(timeoutMs.value ? { timeoutMs: timeoutMs.value } : {}),
    ...(systemPrompt.value ? { systemPrompt: systemPrompt.value } : {}),
    ...(allowedTools.value.length > 0 ? { allowedTools: allowedTools.value } : {}),
    ...(permissionMode.value ? { permissionMode: permissionMode.value as 'plan' | 'allow' | 'deny' } : {}),
    continueSession: continueSession.value
  }

  const clientOptions: WebClientOptions = {
    newSession: newSession.value
  }

  // Store for display
  lastOptions.value = { apiOptions, clientOptions }

  try {
    await sessionStore.sendCommandWithOptions(
      command.value,
      'demo-project', // You would use the actual current project ID here
      apiOptions,
      clientOptions
    )
    
    // Clear the command after sending
    command.value = ''
  } catch (error) {
    console.error('Failed to execute command:', error)
  }
}
</script>

<style scoped>
/* Component styling can be added here */
</style>