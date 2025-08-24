<template>
  <PermissionDialog
    :is-visible="isVisible"
    :request="request"
    @response="$emit('response', $event)"
    @close="$emit('close')"
  />
</template>

<script setup lang="ts">
import PermissionDialog from '../PermissionDialog.vue'
import type { PermissionRequest, PermissionResponse } from '@code-crow/shared'

interface Props {
  isVisible: boolean
  request: PermissionRequest | null
}

defineProps<Props>()

defineEmits<{
  response: [response: PermissionResponse]
  close: []
}>()
</script>