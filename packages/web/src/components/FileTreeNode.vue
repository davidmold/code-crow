<template>
  <div>
    <div
      :class="[
        'flex items-center px-2 py-1 text-sm cursor-pointer rounded-md group hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
        { 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300': isSelected }
      ]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="handleClick"
    >
      <!-- Expansion toggle for directories -->
      <button
        v-if="file.type === 'directory'"
        @click.stop="$emit('toggle', file.id)"
        class="flex-shrink-0 w-4 h-4 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center"
      >
        <svg
          class="w-3 h-3 transition-transform duration-200"
          :class="{ 'rotate-90': isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
      
      <!-- Spacer for files to align with directories -->
      <div v-else class="w-5 flex-shrink-0"></div>

      <!-- File/Directory icon -->
      <div class="flex-shrink-0 w-4 h-4 mr-2">
        <component :is="getFileIcon()" :class="getIconColor()" />
      </div>

      <!-- File name -->
      <span 
        class="flex-1 truncate"
        :class="[
          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200',
          { 'font-medium': file.type === 'directory' }
        ]"
        :title="file.name"
      >
        {{ file.name }}
      </span>

      <!-- File size (for files only) -->
      <span
        v-if="file.type === 'file' && file.size"
        class="flex-shrink-0 ml-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {{ formatFileSize(file.size) }}
      </span>
    </div>

    <!-- Children -->
    <template v-if="file.type === 'directory' && isExpanded && file.children">
      <FileTreeNode
        v-for="child in file.children"
        :key="child.id"
        :file="child"
        :selected-file="selectedFile"
        :expanded="expanded"
        :depth="depth + 1"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import type { FileInfo } from '@/services/api'

interface Props {
  file: FileInfo
  selectedFile: FileInfo | null
  expanded: Set<string>
  depth?: number
}

interface Emits {
  (e: 'select', file: FileInfo): void
  (e: 'toggle', fileId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0
})


const isSelected = computed(() => 
  props.selectedFile?.id === props.file.id
)

const isExpanded = computed(() => 
  props.expanded.has(props.file.id)
)

function handleClick() {
  if (props.file.type === 'directory') {
    // Toggle expansion and select
    emit('toggle', props.file.id)
    emit('select', props.file)
  } else {
    // Select file
    emit('select', props.file)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon() {
  if (props.file.type === 'directory') {
    return isExpanded.value ? getFolderOpenIcon() : getFolderIcon()
  }
  
  const ext = props.file.extension?.toLowerCase()
  
  // File type icons
  const icons: Record<string, () => any> = {
    // Code files
    '.js': getJavaScriptIcon,
    '.jsx': getReactIcon,
    '.ts': getTypeScriptIcon,
    '.tsx': getReactIcon,
    '.vue': getVueIcon,
    '.py': getPythonIcon,
    '.rs': getRustIcon,
    '.go': getGoIcon,
    '.java': getJavaIcon,
    '.cpp': getCppIcon,
    '.c': getCppIcon,
    '.cs': getCSharpIcon,
    '.php': getPhpIcon,
    '.rb': getRubyIcon,
    '.swift': getSwiftIcon,
    '.kt': getKotlinIcon,
    
    // Markup/Config
    '.html': getHtmlIcon,
    '.css': getCssIcon,
    '.scss': getCssIcon,
    '.sass': getCssIcon,
    '.json': getJsonIcon,
    '.xml': getXmlIcon,
    '.yaml': getYamlIcon,
    '.yml': getYamlIcon,
    '.toml': getConfigIcon,
    '.ini': getConfigIcon,
    '.env': getConfigIcon,
    
    // Documentation
    '.md': getMarkdownIcon,
    '.txt': getTextIcon,
    '.pdf': getPdfIcon,
    '.doc': getDocIcon,
    '.docx': getDocIcon,
    
    // Images
    '.png': getImageIcon,
    '.jpg': getImageIcon,
    '.jpeg': getImageIcon,
    '.gif': getImageIcon,
    '.svg': getImageIcon,
    '.ico': getImageIcon,
    
    // Other
    '.zip': getArchiveIcon,
    '.tar': getArchiveIcon,
    '.gz': getArchiveIcon,
    '.sql': getDatabaseIcon,
    '.db': getDatabaseIcon,
    '.sqlite': getDatabaseIcon
  }
  
  return icons[ext || ''] || getDefaultFileIcon
}

function getIconColor() {
  if (props.file.type === 'directory') {
    return 'text-blue-500 dark:text-blue-400'
  }
  
  const ext = props.file.extension?.toLowerCase()
  
  const colors: Record<string, string> = {
    '.js': 'text-yellow-500',
    '.jsx': 'text-blue-400',
    '.ts': 'text-blue-600',
    '.tsx': 'text-blue-400',
    '.vue': 'text-green-500',
    '.py': 'text-blue-500',
    '.rs': 'text-orange-600',
    '.go': 'text-cyan-500',
    '.java': 'text-red-500',
    '.html': 'text-orange-500',
    '.css': 'text-blue-500',
    '.json': 'text-yellow-600',
    '.md': 'text-gray-600 dark:text-gray-400',
    '.png': 'text-purple-500',
    '.jpg': 'text-purple-500',
    '.jpeg': 'text-purple-500',
    '.gif': 'text-purple-500',
    '.svg': 'text-purple-500'
  }
  
  return colors[ext || ''] || 'text-gray-500 dark:text-gray-400'
}

// Icon components
function getFolderIcon() {
  return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
    h('path', { d: 'M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z' })
  ])
}

function getFolderOpenIcon() {
  return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
    h('path', { 'fill-rule': 'evenodd', d: 'M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z', 'clip-rule': 'evenodd' }),
    h('path', { d: 'M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z' })
  ])
}

function getDefaultFileIcon() {
  return h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
  ])
}

function getJavaScriptIcon() {
  return h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { d: 'M3 3h18v18H3V3zm16.525 13.707c-.131-.821-.666-1.511-2.252-2.155-.552-.259-1.165-.438-1.349-.854-.068-.248-.078-.382-.034-.529.11-.403.45-.523.746-.407.192.070.356.24.458.161.102-.079.172-.195.172-.195s.93.613.93.613c-.607.863-1.464 1.287-2.88 1.287-1.55 0-2.557-.755-2.557-1.854 0-.884.688-1.378 1.72-1.378.986 0 1.684.414 1.684 1.206 0 .582-.472 1.618-.472 1.618s.93.218.93.218c.131-.637.195-1.041.195-1.618 0-1.378-.746-1.854-1.720-1.854-1.297 0-1.720.89-1.720 1.854 0 .884.688 1.378 1.720 1.378.986 0 1.684-.414 1.684-1.206z' })
  ])
}

function getTypeScriptIcon() {
  return h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { d: 'M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0H1.125zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.302.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z' })
  ])
}

function getReactIcon() {
  return h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
    h('circle', { cx: '12', cy: '11.245', r: '1.785' }),
    h('path', { d: 'm7.002 14.794-.395-.101c-2.934-.741-4.617-2.001-4.617-3.452 0-1.452 1.684-2.711 4.617-3.452l.395-.1.111.391a19.507 19.507 0 0 0 1.136 2.983l.085.178-.085.178c-.46.963-.846 1.96-1.136 2.985l-.111.39zm-.577-6.095c-2.229.628-3.598 1.586-3.598 2.542 0 .954 1.368 1.913 3.598 2.54.273-.868.603-1.717.985-2.54a20.356 20.356 0 0 1-.985-2.542zm10.572 6.095-.11-.392a19.628 19.628 0 0 0-1.137-2.984l-.085-.177.085-.179c.46-.963.846-1.96 1.137-2.984l.11-.39.395.1c2.935.741 4.617 2 4.617 3.453 0 1.452-1.683 2.711-4.617 3.452l-.395.101zm-.41-3.553c.4.866.733 1.718.987 2.54 2.23-.627 3.599-1.586 3.599-2.540 0-.956-1.368-1.914-3.599-2.542a20.683 20.683 0 0 1-.987 2.542z' }),
    h('path', { d: 'm6.419 8.695-.11-.39c-.826-2.908-.576-4.991.687-5.717 1.235-.715 3.222.13 5.303 2.265l.284.292-.284.291a19.718 19.718 0 0 0-2.02 2.474l-.113.162-.196.016a19.646 19.646 0 0 0-3.157.509l-.394.098zm1.582-5.529c-.224 0-.422.049-.589.145-.828.477-.974 2.138-.404 4.38.891-.197 1.79-.338 2.696-.417a21.058 21.058 0 0 1 1.713-2.123c-1.303-1.267-2.533-1.985-3.416-1.985zm7.997 16.84c-1.188 0-2.714-.896-4.298-2.522l-.283-.291.283-.29a19.827 19.827 0 0 0 2.021-2.477l.112-.16.194-.019a19.473 19.473 0 0 0 3.158-.507l.395-.1.111.391c.822 2.906.573 4.992-.688 5.718a1.978 1.978 0 0 1-1.005.257zm-3.415-2.914c1.502 1.465 2.875 2.381 3.778 2.381.274 0 .516-.061.722-.183.828-.477.974-2.138.404-4.38-.89.198-1.79.34-2.698.419a20.526 20.526 0 0 1-1.703 2.123z' }),
    h('path', { d: 'm17.58 8.695-.395-.099a19.477 19.477 0 0 0-3.158-.509l-.194-.017-.112-.162A19.551 19.551 0 0 0 11.7 5.434l-.283-.291.283-.29c2.08-2.134 4.066-2.979 5.303-2.265 1.262.727 1.513 2.81.688 5.717l-.111.39zm-3.287-1.421c.954.085 1.858.228 2.698.417.571-2.242.425-3.903-.404-4.381-.824-.477-2.375.253-4.004 1.841.616.67 1.188 1.378 1.71 2.123zM8.001 20.15a1.983 1.983 0 0 1-1.005-.257c-1.263-.726-1.513-2.811-.688-5.718l.108-.391.395.1c.964.243 2.026.414 3.158.507l.194.019.113.16c.604.878 1.28 1.707 2.02 2.477l.284.290-.284.291c-1.583 1.627-3.109 2.522-4.295 2.522zm-.993-5.362c-.57 2.242-.424 3.906.404 4.384.825.47 2.371-.255 4.005-1.842a21.17 21.17 0 0 1-1.713-2.123 20.692 20.692 0 0 1-2.696-.419z' })
  ])
}

function getVueIcon() {
  return h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { d: 'M24,1.61H14.06L12,5.16,9.94,1.61H0L12,22.39ZM12,14.08,5.16,2.23H9.59L12,6.41l2.41-4.18h4.43Z' })
  ])
}

function getPythonIcon() {
  return h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { d: 'M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09-.33.22zM21.1 6.11l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08-.33.23z' })
  ])
}

// Additional icon functions for other file types...
function getRustIcon() { return getDefaultFileIcon() }
function getGoIcon() { return getDefaultFileIcon() }
function getJavaIcon() { return getDefaultFileIcon() }
function getCppIcon() { return getDefaultFileIcon() }
function getCSharpIcon() { return getDefaultFileIcon() }
function getPhpIcon() { return getDefaultFileIcon() }
function getRubyIcon() { return getDefaultFileIcon() }
function getSwiftIcon() { return getDefaultFileIcon() }
function getKotlinIcon() { return getDefaultFileIcon() }
function getHtmlIcon() { return getDefaultFileIcon() }
function getCssIcon() { return getDefaultFileIcon() }
function getJsonIcon() { return getDefaultFileIcon() }
function getXmlIcon() { return getDefaultFileIcon() }
function getYamlIcon() { return getDefaultFileIcon() }
function getConfigIcon() { return getDefaultFileIcon() }
function getMarkdownIcon() { return getDefaultFileIcon() }
function getTextIcon() { return getDefaultFileIcon() }
function getPdfIcon() { return getDefaultFileIcon() }
function getDocIcon() { return getDefaultFileIcon() }
function getImageIcon() { return getDefaultFileIcon() }
function getArchiveIcon() { return getDefaultFileIcon() }
function getDatabaseIcon() { return getDefaultFileIcon() }

// Make the emit function available
const emit = defineEmits<Emits>()
</script>