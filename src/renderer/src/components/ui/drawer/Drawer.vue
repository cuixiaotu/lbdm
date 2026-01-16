<script setup lang="ts">
import { computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    open?: boolean
    title?: string
    description?: string
    side?: 'left' | 'right'
    width?: string
  }>(),
  {
    open: false,
    side: 'right',
    width: '500px'
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const close = (): void => {
  isOpen.value = false
}

// 监听 ESC 键关闭
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      const handleEsc = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          close()
        }
      }
      document.addEventListener('keydown', handleEsc)
      return (): void => {
        document.removeEventListener('keydown', handleEsc)
      }
    }
    return undefined
  }
)

const sideClass = computed(() => {
  return props.side === 'left' ? 'left-0' : 'right-0'
})
</script>

<template>
  <!-- Backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="open" class="fixed inset-0 bg-black/50 z-40" @click="close" />
  </Transition>

  <!-- Drawer -->
  <Transition
    enter-active-class="transition-transform duration-300"
    :enter-from-class="props.side === 'left' ? '-translate-x-full' : 'translate-x-full'"
    enter-to-class="translate-x-0"
    leave-active-class="transition-transform duration-300"
    leave-from-class="translate-x-0"
    :leave-to-class="props.side === 'left' ? '-translate-x-full' : 'translate-x-full'"
  >
    <div
      v-if="open"
      :class="['fixed top-0 h-full bg-background shadow-lg z-50 flex flex-col', sideClass]"
      :style="{ width: props.width }"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <div>
          <h2 v-if="title" class="text-lg font-semibold">{{ title }}</h2>
          <p v-if="description" class="text-sm text-muted-foreground mt-1">
            {{ description }}
          </p>
        </div>
        <Button variant="ghost" size="icon" @click="close">
          <X class="w-4 h-4" />
        </Button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <slot />
      </div>

      <!-- Footer (optional) -->
      <div v-if="$slots.footer" class="border-t p-6">
        <slot name="footer" />
      </div>
    </div>
  </Transition>
</template>
