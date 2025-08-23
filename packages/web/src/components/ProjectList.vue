<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        Projects
      </h2>
      <div class="flex items-center space-x-2">
        <button
          @click="showAddProjectModal = true"
          class="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Add Project
        </button>
        <button
          @click="projectStore.loadProjects()"
          :disabled="projectStore.isLoadingProjects"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            class="mr-2 h-4 w-4"
            :class="{ 'animate-spin': projectStore.isLoadingProjects }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
      <input
        v-model="searchQuery"
        @input="onSearchChange"
        type="text"
        placeholder="Search projects..."
        class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" v-if="projectStore.hasProjects">
      <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            Total Projects
          </dt>
          <dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {{ projectStore.projects.length }}
          </dd>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            Project Types
          </dt>
          <dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {{ Object.keys(projectStore.projectsByType).length }}
          </dd>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            Current Project
          </dt>
          <dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {{ projectStore.hasCurrentProject ? '1' : '0' }}
          </dd>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="projectStore.isLoadingProjects && !projectStore.hasProjects" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading projects...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!projectStore.hasProjects && !projectStore.isLoadingProjects" class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-4H5m14 8H5m14 4H5"/>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No projects</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        No projects found. Try refreshing or check your configuration.
      </p>
    </div>

    <!-- Project grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="project in displayedProjects"
        :key="project.id"
        @click="selectProject(project)"
        class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-105 flex flex-col"
        :class="{
          'ring-2 ring-blue-500 ring-opacity-60': projectStore.currentProject?.id === project.id
        }"
      >
        <div class="px-4 py-5 sm:p-6 flex-grow">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center min-w-0 flex-1">
              <div class="flex-shrink-0">
                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <component :is="getProjectIcon(project.type)" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div class="ml-4 min-w-0 flex-1">
                <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ project.name }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {{ project.type }} {{ project.framework ? `• ${project.framework}` : '' }}
                </p>
              </div>
            </div>
            <div class="flex-shrink-0">
              <span
                v-if="project.language"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {{ project.language }}
              </span>
            </div>
          </div>

          <!-- Description -->
          <div class="mt-3" v-if="project.description">
            <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {{ project.description }}
            </p>
          </div>

          <!-- Stats -->
          <div class="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span v-if="project.fileCount">{{ project.fileCount }} files</span>
            <span>{{ formatDate(project.lastModified) }}</span>
          </div>

          <!-- Package manager -->
          <div class="mt-2" v-if="project.packageManager">
            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              {{ project.packageManager }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3">
          <div class="flex items-center justify-between">
            <button
              @click.stop="openProject(project)"
              class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
              Open Project
            </button>
            <button
              v-if="project.gitRepository"
              @click.stop="openGitRepo(project.gitRepository)"
              class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200"
            >
              View Repo
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Load more -->
    <div v-if="hasMoreProjects" class="text-center">
      <button
        @click="loadMore"
        class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Load More Projects
      </button>
    </div>

    <!-- Add Project Modal -->
    <AddProjectModal 
      :is-open="showAddProjectModal" 
      @close="showAddProjectModal = false"
      @project-added="onProjectAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import AddProjectModal from './AddProjectModal.vue'
import type { ProjectInfo } from '@/services/api'

const router = useRouter()
const projectStore = useProjectStore()
const uiStore = useUiStore()

const searchQuery = ref('')
const itemsPerPage = ref(12)
const currentPage = ref(1)
const showAddProjectModal = ref(false)

const displayedProjects = computed(() => {
  const filtered = projectStore.filteredProjects
  const end = currentPage.value * itemsPerPage.value
  return filtered.slice(0, end)
})

const hasMoreProjects = computed(() => {
  const total = projectStore.filteredProjects.length
  const displayed = displayedProjects.value.length
  return displayed < total
})

function onSearchChange() {
  projectStore.setSearchQuery(searchQuery.value)
  currentPage.value = 1
}

function loadMore() {
  currentPage.value++
}

async function selectProject(project: ProjectInfo) {
  await projectStore.selectProject(project.id)
}

function openProject(project: ProjectInfo) {
  selectProject(project).then(() => {
    router.push(`/project/${project.id}`)
  })
}

function openGitRepo(url: string) {
  window.open(url, '_blank')
}

function onProjectAdded(project: ProjectInfo) {
  // The project store will be refreshed by the modal
  // We can select the new project if desired
  uiStore.showSuccess('Project Added', `"${project.name}" has been added to your workspace`)
}

function formatDate(dateString: string) {
  if (!dateString) return 'Unknown'
  
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString)
    return 'Invalid Date'
  }
  
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
  return `${Math.ceil(diffDays / 365)} years ago`
}

function getProjectIcon(type: string) {
  const icons: Record<string, () => any> = {
    node: () => h('svg', {
      fill: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      d: 'M12 0L1.608 6v12L12 24l10.392-6V6L12 0zm-1.081 15.75L8.837 14.5H6.581l3.25 1.875v2.313L5.417 16.25v-2.125L12 18.562l6.583-4.437v2.125l-4.414 2.438v-2.313L17.419 14.5h-2.256l-2.082 1.25z'
    })),
    python: () => h('svg', {
      fill: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      d: 'M14.31.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.83l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.23l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.24l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09-.33.22zM21.1 6.11l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08-.33.23z'
    })),
    rust: () => h('svg', {
      fill: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      d: 'M23.836 8.794a.281.281 0 0 0-.111-.235L20.712 6.48l.63-2.867a.281.281 0 0 0-.308-.344l-3.016.37-1.779-2.309a.281.281 0 0 0-.227-.112.281.281 0 0 0-.225.116l-1.732 2.332-3.014-.4a.281.281 0 0 0-.31.34l.608 2.87-3.016 2.078a.281.281 0 0 0-.111.235.281.281 0 0 0 .111.235l3.016 2.078-.608 2.87a.281.281 0 0 0 .31.34l3.014-.4 1.732 2.332a.281.281 0 0 0 .225.116.281.281 0 0 0 .227-.112l1.779-2.309 3.016.37a.281.281 0 0 0 .308-.344l-.63-2.867 3.013-2.079a.281.281 0 0 0 .111-.235zM8.74 11.901a3.158 3.158 0 1 1 6.317 0 3.158 3.158 0 0 1-6.317 0z'
    })),
    go: () => h('svg', {
      fill: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      d: 'M1.811 10.231c-.047 0-.058-.023-.035-.059.023-.035.081-.058.128-.058.047 0 .058.023.035.058-.023.036-.081.059-.128.059zm-.954-.592c-.023.035-.081.035-.128.023-.047-.035-.058-.081-.035-.093.023-.047.081-.035.128-.023.047.035.058.058.035.093zm.815.023c-.047.035-.128.023-.151-.023-.023-.047.023-.081.058-.081.047-.012.128.023.151.047.023.058-.023.081-.058.058zm-3.496-8.941c-1.663 0-2.919.6-3.83 1.883-.75 1.162-.81 2.92-.093 4.4.477.998 1.2 1.86 2.034 2.598.174.162.302.36.36.575l.302 1.187c.047.209.221.372.43.384.186 0 .36-.116.43-.302l.372-1.21c.07-.21.198-.407.36-.569 1.21-.99 2.128-2.198 2.616-3.496.488-1.302.46-2.698-.07-3.99-.734-1.723-2.198-2.453-4.12-2.454zm13.52 13.45c-.814 0-1.477-.65-1.477-1.477s.663-1.477 1.477-1.477 1.477.65 1.477 1.477-.663 1.477-1.477 1.477zm4.584-4.561c-.151-.07-.314-.116-.476-.14v-.233c0-.34-.28-.622-.622-.622h-.651v-1.78c0-2.721-2.221-4.943-4.943-4.943h-2.967c-.198-1.279-.965-2.291-1.953-2.86-.988-.569-2.14-.569-3.128 0-.988.569-1.755 1.581-1.953 2.86h-2.967c-2.722 0-4.943 2.222-4.943 4.943v8.156c0 2.722 2.221 4.943 4.943 4.943h11.317c2.722 0 4.943-2.221 4.943-4.943v-1.78h.622c.342 0 .622-.28.622-.622v-.233c.162-.023.326-.07.476-.14.291-.14.476-.43.476-.756v-1.246c0-.326-.185-.617-.476-.756zm-2.337.721c0 .14-.14.28-.28.28h-.721v-.559h.721c.14 0 .28.14.28.28z'
    })),
    react: () => h('svg', {
      fill: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      d: 'M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z'
    })),
    vue: () => h('svg', {
      fill: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      d: 'M24,1.61H14.06L12,5.16,9.94,1.61H0L12,22.39ZM12,14.08,5.16,2.23H9.59L12,6.41l2.41-4.18h4.43Z'
    })),
    angular: () => h('svg', {
      fill: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      d: 'M9.93 12.645h4.134L12 7.985l-2.07 4.66M12 2.145L1.285 5.235l1.67 14.465L12 21.855l9.045-2.155 1.67-14.465L12 2.145zm6.903 14.32H15.61l-1.33-3.32H9.72l-1.33 3.32H5.097L12 4.365l6.903 12.1'
    })),
    java: () => h('svg', {
      fill: 'currentColor',
      viewBox: '0 0 24 24'
    }, h('path', {
      d: 'M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.013-10.633-.118-6.943-1.149M8.276 15.933s-1.028.761.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-1.218M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0-.001-8.216 2.051-4.292 6.573M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.887 9.58 1.553 17.462-.7 14.977-1.82M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892M17.116 17.584c4.503-2.34 2.421-4.589.968-4.285-.355.074-.515.138-.515.138s.132-.207.385-.297c2.875-1.011 5.086 2.981-.928 4.562 0-.001.07-.062.09-.118M14.401 0s2.494 2.494-2.365 6.33c-3.896 3.077-.888 4.832-.001 6.836-2.274-2.053-3.943-3.858-2.824-5.539 1.644-2.469 6.197-3.665 5.19-7.627M9.734 23.924c4.322.277 10.959-.153 11.116-2.198 0 0-.302.775-3.572 1.391-3.688.694-8.239.613-10.937.168 0-.001.553.457 3.393.639'
    })),
    unknown: () => h('svg', {
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
  
  return icons[type] || icons.unknown
}

onMounted(() => {
  if (!projectStore.hasProjects) {
    projectStore.initialize()
  }
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>