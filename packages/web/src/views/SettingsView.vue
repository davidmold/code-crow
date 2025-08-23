<template>
  <div class="p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-300">
          Configure your Code Crow experience
        </p>
      </div>

      <!-- Settings form -->
      <form @submit.prevent="saveSettings" class="space-y-8">
        <!-- Appearance -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Appearance
            </h3>
            
            <div class="space-y-4">
              <!-- Theme -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  v-model="localSettings.theme"
                  class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>

              <!-- Font Size -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Size ({{ localSettings.fontSize }}px)
                </label>
                <input
                  v-model.number="localSettings.fontSize"
                  type="range"
                  min="10"
                  max="24"
                  step="1"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>10px</span>
                  <span>24px</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Editor -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Editor
            </h3>
            
            <div class="space-y-4">
              <!-- Checkboxes -->
              <div class="space-y-3">
                <label class="flex items-center">
                  <input
                    v-model="localSettings.autoSave"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Auto-save files</span>
                </label>

                <label class="flex items-center">
                  <input
                    v-model="localSettings.showLineNumbers"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Show line numbers</span>
                </label>

                <label class="flex items-center">
                  <input
                    v-model="localSettings.wordWrap"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Word wrap</span>
                </label>

                <label class="flex items-center">
                  <input
                    v-model="localSettings.minimap"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Show minimap</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Behavior -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Behavior
            </h3>
            
            <div class="space-y-4">
              <!-- Default View -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default View
                </label>
                <select
                  v-model="localSettings.defaultView"
                  class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="projects">Projects</option>
                  <option value="chat">Chat</option>
                  <option value="files">Files</option>
                </select>
              </div>

              <!-- API Timeout -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Timeout ({{ Math.round(localSettings.apiTimeout / 1000) }}s)
                </label>
                <input
                  v-model.number="localSettings.apiTimeout"
                  type="range"
                  min="5000"
                  max="120000"
                  step="5000"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>5s</span>
                  <span>120s</span>
                </div>
              </div>

              <!-- Checkboxes -->
              <div class="space-y-3">
                <label class="flex items-center">
                  <input
                    v-model="localSettings.notifications"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable notifications</span>
                </label>

                <label class="flex items-center">
                  <input
                    v-model="localSettings.autoRefreshProjects"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Auto-refresh projects</span>
                </label>
              </div>

              <!-- Refresh Interval (only if auto-refresh is enabled) -->
              <div v-if="localSettings.autoRefreshProjects">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refresh Interval ({{ Math.round(localSettings.refreshInterval / 1000) }}s)
                </label>
                <input
                  v-model.number="localSettings.refreshInterval"
                  type="range"
                  min="10000"
                  max="300000"
                  step="10000"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>10s</span>
                  <span>300s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Advanced -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Advanced
            </h3>
            
            <div class="space-y-4">
              <!-- Max File Size -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max File Size ({{ formatFileSize(localSettings.maxFileSize) }})
                </label>
                <input
                  v-model.number="localSettings.maxFileSize"
                  type="range"
                  min="65536"
                  max="10485760"
                  step="65536"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>64KB</span>
                  <span>10MB</span>
                </div>
              </div>

              <!-- Excluded File Types -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Excluded File Types
                </label>
                <div class="flex flex-wrap gap-2 mb-2">
                  <span
                    v-for="(ext, index) in localSettings.excludedFileTypes"
                    :key="index"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {{ ext }}
                    <button
                      type="button"
                      @click="removeExcludedFileType(index)"
                      class="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-500 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                    >
                      <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                        <path stroke-linecap="round" stroke-width="1.5" d="m1 1 6 6m0-6-6 6"/>
                      </svg>
                    </button>
                  </span>
                </div>
                <div class="flex">
                  <input
                    v-model="newExcludedType"
                    type="text"
                    placeholder=".ext"
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    @keyup.enter="addExcludedFileType"
                  />
                  <button
                    type="button"
                    @click="addExcludedFileType"
                    class="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-200 dark:hover:bg-gray-500 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div class="flex space-x-3">
            <button
              type="button"
              @click="exportSettings"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Export
            </button>
            <button
              type="button"
              @click="showImportDialog = true"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Import
            </button>
            <button
              type="button"
              @click="resetToDefaults"
              class="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Reset to Defaults
            </button>
          </div>
          
          <div class="flex space-x-3">
            <button
              type="button"
              @click="cancelChanges"
              :disabled="!hasChanges"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!hasChanges"
              class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>

      <!-- Import dialog -->
      <div v-if="showImportDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Import Settings
          </h3>
          <textarea
            v-model="importData"
            placeholder="Paste exported settings JSON here..."
            class="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          ></textarea>
          <div class="flex justify-end space-x-3 mt-4">
            <button
              @click="showImportDialog = false; importData = ''"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              @click="importSettingsData"
              :disabled="!importData.trim()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsStore, type UserSettings } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

const settingsStore = useSettingsStore()
const uiStore = useUiStore()

const localSettings = ref<UserSettings>({ ...settingsStore.settings })
const originalSettings = ref<UserSettings>({ ...settingsStore.settings })
const newExcludedType = ref('')
const showImportDialog = ref(false)
const importData = ref('')

const hasChanges = computed(() => {
  return JSON.stringify(localSettings.value) !== JSON.stringify(originalSettings.value)
})

function saveSettings() {
  settingsStore.updateSettings(localSettings.value)
  originalSettings.value = { ...localSettings.value }
  uiStore.showSuccess('Settings saved', 'Your preferences have been updated')
}

function cancelChanges() {
  localSettings.value = { ...originalSettings.value }
}

function resetToDefaults() {
  if (confirm('Are you sure you want to reset all settings to their default values?')) {
    settingsStore.resetToDefaults()
    localSettings.value = { ...settingsStore.settings }
    originalSettings.value = { ...settingsStore.settings }
    uiStore.showInfo('Settings reset', 'All settings have been reset to defaults')
  }
}

function addExcludedFileType() {
  const type = newExcludedType.value.trim()
  if (type && !localSettings.value.excludedFileTypes.includes(type)) {
    const formatted = type.startsWith('.') ? type : `.${type}`
    localSettings.value.excludedFileTypes.push(formatted)
    newExcludedType.value = ''
  }
}

function removeExcludedFileType(index: number) {
  localSettings.value.excludedFileTypes.splice(index, 1)
}

function exportSettings() {
  const exported = settingsStore.exportSettings()
  navigator.clipboard.writeText(exported)
  uiStore.showSuccess('Settings exported', 'Settings have been copied to clipboard')
}

function importSettingsData() {
  const success = settingsStore.importSettings(importData.value)
  if (success) {
    localSettings.value = { ...settingsStore.settings }
    originalSettings.value = { ...settingsStore.settings }
    showImportDialog.value = false
    importData.value = ''
    uiStore.showSuccess('Settings imported', 'Settings have been successfully imported')
  } else {
    uiStore.showError('Import failed', 'Invalid settings format')
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Apply theme changes immediately
watch(() => localSettings.value.theme, (newTheme) => {
  settingsStore.updateSetting('theme', newTheme)
  settingsStore.applyTheme()
})

// Apply font size changes immediately
watch(() => localSettings.value.fontSize, (newSize) => {
  document.documentElement.style.setProperty('--editor-font-size', `${newSize}px`)
})

onMounted(() => {
  // Initialize local settings from store
  localSettings.value = { ...settingsStore.settings }
  originalSettings.value = { ...settingsStore.settings }
})
</script>

<style scoped>
/* Custom range slider styles */
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: none;
}
</style>