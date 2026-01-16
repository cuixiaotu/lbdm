<script setup lang="ts">
import { computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-vue-next'
import { dialogState, handleDialogResponse, type DialogResult } from '@/composables/useDialog'

// 根据类型设置图标
const getIcon = computed(() => {
  switch (dialogState.value.type) {
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'success':
      return CheckCircle
    default:
      return Info
  }
})

// 根据类型设置颜色类
const typeClasses = computed(() => {
  const classes = {
    icon: '',
    title: '',
    content: '',
    bg: ''
  }

  switch (dialogState.value.type) {
    case 'error':
      classes.icon = 'text-red-500'
      classes.title = 'text-red-700 dark:text-red-400'
      classes.content = 'text-red-600 dark:text-red-300'
      classes.bg = 'bg-red-50 dark:bg-red-950'
      break
    case 'warning':
      classes.icon = 'text-amber-500'
      classes.title = 'text-amber-700 dark:text-amber-400'
      classes.content = 'text-amber-600 dark:text-amber-300'
      classes.bg = 'bg-amber-50 dark:bg-amber-950'
      break
    case 'success':
      classes.icon = 'text-green-500'
      classes.title = 'text-green-700 dark:text-green-400'
      classes.content = 'text-green-600 dark:text-green-300'
      classes.bg = 'bg-green-50 dark:bg-green-950'
      break
    default:
      classes.icon = 'text-blue-500'
      classes.title = 'text-blue-700 dark:text-blue-400'
      classes.content = 'text-blue-600 dark:text-blue-300'
      classes.bg = 'bg-blue-50 dark:bg-blue-950'
  }

  return classes
})

// 处理按钮点击
const onButtonClick = (index: number): void => {
  const result: DialogResult = {
    response: index,
    checkboxChecked: false
  }
  handleDialogResponse(result)
}

// 关闭对话框
const onClose = (): void => {
  const result: DialogResult = {
    response: dialogState.value.cancelId,
    checkboxChecked: false
  }
  handleDialogResponse(result)
}

// 监听 ESC 键关闭
const handleKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && dialogState.value.open) {
    onClose()
  }
}

// 监听 open 状态变化，添加/移除键盘监听
watch(
  () => dialogState.value.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }
  },
  { immediate: true }
)
</script>

<template>
  <!-- 遮罩层 -->
  <Transition name="fade">
    <div
      v-if="dialogState.open"
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      @click="onClose"
    />
  </Transition>

  <!-- 对话框 -->
  <Transition name="dialog">
    <div
      v-if="dialogState.open"
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
      @click.stop
    >
      <!-- 关闭按钮 -->
      <button
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        @click="onClose"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">关闭</span>
      </button>

      <!-- 图标和标题 -->
      <div class="flex items-start gap-4">
        <div :class="['rounded-full p-2', typeClasses.bg]">
          <component :is="getIcon" :class="['h-6 w-6', typeClasses.icon]" />
        </div>
        <div class="flex-1">
          <h2 :class="['text-lg font-semibold', typeClasses.title]">
            {{ dialogState.title }}
          </h2>
        </div>
      </div>

      <!-- 描述内容 -->
      <div class="mt-4 ml-14">
        <p :class="['text-sm whitespace-pre-wrap', typeClasses.content]">
          {{ dialogState.description }}
        </p>
      </div>

      <!-- 按钮组 -->
      <div class="mt-6 flex justify-end gap-2">
        <Button
          v-for="(buttonText, index) in dialogState.buttons"
          :key="index"
          :variant="index === dialogState.defaultId ? 'default' : 'outline'"
          @click="onButtonClick(index)"
        >
          {{ buttonText }}
        </Button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.95);
}
</style>
