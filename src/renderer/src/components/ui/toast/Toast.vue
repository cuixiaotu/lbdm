<script setup lang="ts">
import { computed } from 'vue'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'

export interface ToastProps {
  id: string
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 3000
})

const emit = defineEmits<{
  close: [id: string]
}>()

// 根据类型选择图标
const Icon = computed(() => {
  switch (props.type) {
    case 'success':
      return CheckCircle2
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    default:
      return Info
  }
})

// 根据类型选择样式
const toastClass = computed(() => {
  const baseClass =
    'flex items-start gap-3 p-4 rounded-lg shadow-lg border min-w-[300px] max-w-[500px]'

  switch (props.type) {
    case 'success':
      return `${baseClass} bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100`
    case 'error':
      return `${baseClass} bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100`
    case 'warning':
      return `${baseClass} bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100`
    default:
      return `${baseClass} bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100`
  }
})

const iconClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-600 dark:text-green-400'
    case 'error':
      return 'text-red-600 dark:text-red-400'
    case 'warning':
      return 'text-amber-600 dark:text-amber-400'
    default:
      return 'text-blue-600 dark:text-blue-400'
  }
})

const handleClose = (): void => {
  emit('close', props.id)
}
</script>

<template>
  <div :class="toastClass">
    <component :is="Icon" :class="`w-5 h-5 flex-shrink-0 ${iconClass}`" />

    <div class="flex-1 min-w-0">
      <div v-if="title" class="font-semibold mb-1">{{ title }}</div>
      <div class="text-sm">{{ message }}</div>
    </div>

    <button
      class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      @click="handleClose"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>
