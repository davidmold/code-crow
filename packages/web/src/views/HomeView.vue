<template>
  <div class="p-6">
    <ProjectList />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import ProjectList from '@/components/ProjectList.vue'
import { useProjectStore } from '@/stores/projectStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()

onMounted(() => {
  // Initialize stores
  settingsStore.initialize()
  uiStore.initializeTheme()
  
  // Initialize project store (only runs once)
  projectStore.initialize()
})
</script>