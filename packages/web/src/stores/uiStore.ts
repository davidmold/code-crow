import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  actions?: {
    label: string
    action: () => void
  }[]
}

export const useUiStore = defineStore('ui', () => {
  // State
  const isLoading = ref(false)
  const loadingMessage = ref('')
  const sidebarOpen = ref(true)
  const notifications = ref<Notification[]>([])
  const theme = ref<'light' | 'dark'>('light')

  // Computed
  const hasNotifications = computed(() => notifications.value.length > 0)
  const unreadNotifications = computed(() => notifications.value.filter(n => !n.persistent))

  // Actions
  function setLoading(loading: boolean, message = '') {
    isLoading.value = loading
    loadingMessage.value = message
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setSidebarOpen(open: boolean) {
    sidebarOpen.value = open
  }

  function addNotification(notification: Omit<Notification, 'id'>) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification
    }

    notifications.value.push(newNotification)

    // Auto-remove non-persistent notifications
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function clearAllNotifications() {
    notifications.value = []
  }

  function showSuccess(title: string, message?: string, duration = 5000) {
    return addNotification({ type: 'success', title, message, duration })
  }

  function showError(title: string, message?: string, persistent = false) {
    return addNotification({ type: 'error', title, message, persistent, duration: persistent ? 0 : 8000 })
  }

  function showWarning(title: string, message?: string, duration = 6000) {
    return addNotification({ type: 'warning', title, message, duration })
  }

  function showInfo(title: string, message?: string, duration = 4000) {
    return addNotification({ type: 'info', title, message, duration })
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // Store in localStorage
    localStorage.setItem('code-crow-theme', newTheme)
  }

  function initializeTheme() {
    const savedTheme = localStorage.getItem('code-crow-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  }

  return {
    // State
    isLoading,
    loadingMessage,
    sidebarOpen,
    notifications,
    theme,
    
    // Computed
    hasNotifications,
    unreadNotifications,
    
    // Actions
    setLoading,
    toggleSidebar,
    setSidebarOpen,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    setTheme,
    initializeTheme
  }
})