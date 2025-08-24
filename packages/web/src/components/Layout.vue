<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <!-- Navigation Header -->
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-full px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Left side -->
          <div class="flex items-center">
            <!-- Sidebar toggle -->
            <button
              class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle sidebar"
              @click="uiStore.toggleSidebar()"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            
            <!-- Logo and title -->
            <div class="flex items-center ml-4">
              <div class="flex-shrink-0">
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                  Code Crow
                </h1>
              </div>
              <div class="hidden md:block ml-4">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  Claude Code Web Interface
                </p>
              </div>
            </div>
          </div>

          <!-- Right side -->
          <div class="flex items-center space-x-4">
            <!-- Chat toggle -->
            <button
              class="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'text-blue-500 bg-blue-50 dark:bg-blue-900': chatOverlayVisible }"
              title="Toggle Chat"
              @click="toggleChat"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <!-- Notification dot for new messages when chat is closed -->
              <div
                v-if="!chatOverlayVisible && hasUnreadMessages"
                class="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"
              />
            </button>
            
            <!-- Theme toggle -->
            <button
              class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="toggleTheme"
            >
              <svg
                v-if="isDarkMode"
                class="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clip-rule="evenodd"
                />
              </svg>
              <svg
                v-else
                class="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </button>

            <!-- Settings -->
            <router-link
              to="/settings"
              class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main content area -->
    <div class="flex h-[calc(100vh-4rem)]">
      <!-- Sidebar -->
      <transition name="sidebar">
        <aside
          v-show="uiStore.sidebarOpen"
          class="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 overflow-y-auto"
        >
          <div class="p-4">
            <!-- Navigation -->
            <nav class="space-y-2">
              <router-link
                v-for="item in navItems"
                :key="item.name"
                :to="item.path"
                class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                :class="[
                  $route.path === item.path
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                ]"
              >
                <component
                  :is="item.icon"
                  class="mr-3 h-5 w-5"
                />
                {{ item.name }}
              </router-link>
            </nav>
          </div>
        </aside>
      </transition>

      <!-- Main content -->
      <main 
        class="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900"
        :class="{ 'ml-0': !uiStore.sidebarOpen }"
      >
        <router-view />
      </main>
    </div>

    <!-- Loading overlay -->
    <div
      v-if="uiStore.isLoading"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
        <div class="flex items-center space-x-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <p class="text-gray-900 dark:text-white">
            {{ uiStore.loadingMessage || 'Loading...' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="fixed top-20 right-4 space-y-2 z-40">
      <transition-group
        name="notification"
        tag="div"
      >
        <div
          v-for="notification in uiStore.notifications"
          :key="notification.id"
          class="notification-container bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto overflow-hidden"
          :class="getNotificationClasses(notification.type)"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <component
                  :is="getNotificationIcon(notification.type)"
                  class="h-6 w-6"
                />
              </div>
              <div class="ml-3 flex-1 pt-0.5">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ notification.title }}
                </p>
                <p
                  v-if="notification.message"
                  class="mt-1 text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ notification.message }}
                </p>
              </div>
              <div class="ml-4 flex-shrink-0 flex">
                <button
                  class="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  @click="uiStore.removeNotification(notification.id)"
                >
                  <span class="sr-only">Close</span>
                  <svg
                    class="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- Chat Overlay -->
    <ChatOverlay
      :is-visible="chatOverlayVisible"
      @close="closeChatOverlay"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'AppLayout'
})

import { computed, h, onMounted, ref } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConnectionStore } from '@/stores/connectionStore'
// Future chat functionality
// import { useChatStore } from '@/stores/chatStore'
import type { NotificationType } from '@/stores/uiStore'
import ChatOverlay from '@/components/ChatOverlay.vue'

const uiStore = useUiStore()
const settingsStore = useSettingsStore()
const connectionStore = useConnectionStore()
// Future enhancement for chat functionality
// const chatStore = useChatStore()

// Chat overlay state
const chatOverlayVisible = ref(false)

// Future enhancement - track unread messages
const hasUnreadMessages = computed(() => false)

// Initialize WebSocket connection globally
onMounted(async () => {
  console.log('🏠 Layout mounted - initializing global WebSocket connection')
  
  // Initialize connection store and connect
  await connectionStore.initialize()
  if (!connectionStore.isConnected && !connectionStore.isConnecting) {
    console.log('🏠 Layout connecting to WebSocket...')
    await connectionStore.connect()
  } else {
    console.log('🏠 Layout WebSocket already connected/connecting')
  }
})

const isDarkMode = computed(() => settingsStore.isDarkMode)

// Navigation items
const navItems = [
  {
    name: 'Projects',
    path: '/',
    icon: () => h('svg', {
      class: 'h-5 w-5',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M19 11H5m14-4H5m14 8H5m14 4H5'
    }))
  }
]

function toggleTheme() {
  const newTheme = settingsStore.isDarkMode ? 'light' : 'dark'
  settingsStore.updateSetting('theme', newTheme)
  settingsStore.applyTheme()
}

function toggleChat() {
  // Simply toggle visibility - no minimize state needed
  chatOverlayVisible.value = !chatOverlayVisible.value
}

function closeChatOverlay() {
  chatOverlayVisible.value = false
}

function getNotificationClasses(type: NotificationType) {
  const classes = {
    success: 'border-l-4 border-green-400',
    error: 'border-l-4 border-red-400',
    warning: 'border-l-4 border-yellow-400',
    info: 'border-l-4 border-blue-400'
  }
  return classes[type] || classes.info
}

function getNotificationIcon(type: NotificationType) {
  const icons = {
    success: () => h('svg', {
      class: 'h-6 w-6 text-green-400',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    })),
    error: () => h('svg', {
      class: 'h-6 w-6 text-red-400',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    })),
    warning: () => h('svg', {
      class: 'h-6 w-6 text-yellow-400',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    })),
    info: () => h('svg', {
      class: 'h-6 w-6 text-blue-400',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    }))
  }
  return icons[type] || icons.info
}
</script>

<style scoped>
.sidebar-enter-active,
.sidebar-leave-active {
  transition: all 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(-100%);
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.5s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.5s;
}

/* Ensure notifications have proper width */
.notification-container {
  min-width: 320px !important;
  max-width: 512px !important;
  width: auto !important;
}
</style>