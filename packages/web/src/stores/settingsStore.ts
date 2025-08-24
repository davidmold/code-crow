import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  fontSize: number
  autoSave: boolean
  showLineNumbers: boolean
  wordWrap: boolean
  minimap: boolean
  notifications: boolean
  defaultView: 'projects' | 'chat' | 'files'
  apiTimeout: number
  maxFileSize: number
  excludedFileTypes: string[]
  autoRefreshProjects: boolean
  refreshInterval: number
}

export const useSettingsStore = defineStore('settings', () => {
  // Default settings
  const defaultSettings: UserSettings = {
    theme: 'auto',
    fontSize: 14,
    autoSave: true,
    showLineNumbers: true,
    wordWrap: true,
    minimap: true,
    notifications: true,
    defaultView: 'projects',
    apiTimeout: 30000,
    maxFileSize: 1048576, // 1MB
    excludedFileTypes: ['.log', '.tmp', '.cache'],
    autoRefreshProjects: false,
    refreshInterval: 30000 // 30 seconds
  }

  // State
  const settings = ref<UserSettings>({ ...defaultSettings })
  const isLoaded = ref(false)

  // Computed
  const isDarkMode = computed(() => {
    if (settings.value.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return settings.value.theme === 'dark'
  })

  const editorSettings = computed(() => ({
    fontSize: settings.value.fontSize,
    showLineNumbers: settings.value.showLineNumbers,
    wordWrap: settings.value.wordWrap,
    minimap: settings.value.minimap
  }))

  // Actions
  function updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) {
    settings.value[key] = value
    saveSettings()
  }

  function updateSettings(newSettings: Partial<UserSettings>) {
    Object.assign(settings.value, newSettings)
    saveSettings()
  }

  function resetToDefaults() {
    settings.value = { ...defaultSettings }
    saveSettings()
  }

  function saveSettings() {
    try {
      const settingsJson = JSON.stringify(settings.value)
      localStorage.setItem('code-crow-settings', settingsJson)
      console.log('💾 Settings saved to localStorage')
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('code-crow-settings')
      if (saved) {
        const parsedSettings = JSON.parse(saved)
        
        // Merge with defaults to handle new settings
        settings.value = { ...defaultSettings, ...parsedSettings }
        
        console.log('📖 Settings loaded from localStorage')
      } else {
        console.log('📖 Using default settings')
        settings.value = { ...defaultSettings }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      settings.value = { ...defaultSettings }
    }
    
    isLoaded.value = true
  }

  function exportSettings() {
    return JSON.stringify(settings.value, null, 2)
  }

  function importSettings(settingsJson: string) {
    try {
      const imported = JSON.parse(settingsJson) as Partial<UserSettings>
      
      // Validate and merge imported settings
      const validatedSettings: UserSettings = { ...defaultSettings }
      
      for (const [key, value] of Object.entries(imported)) {
        if (key in defaultSettings) {
          (validatedSettings as Record<string, unknown>)[key] = value
        }
      }
      
      settings.value = validatedSettings
      saveSettings()
      return true
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }

  // Theme helpers
  function applyTheme() {
    const isDark = isDarkMode.value
    const html = document.documentElement
    
    if (isDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  // Watch for system theme changes
  function initializeThemeWatcher() {
    if (settings.value.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', applyTheme)
      
      return () => {
        mediaQuery.removeEventListener('change', applyTheme)
      }
    }
  }

  // Initialize
  function initialize() {
    loadSettings()
    applyTheme()
    initializeThemeWatcher()
  }

  return {
    // State
    settings,
    isLoaded,
    
    // Computed
    isDarkMode,
    editorSettings,
    
    // Actions
    updateSetting,
    updateSettings,
    resetToDefaults,
    saveSettings,
    loadSettings,
    exportSettings,
    importSettings,
    applyTheme,
    initialize
  }
})