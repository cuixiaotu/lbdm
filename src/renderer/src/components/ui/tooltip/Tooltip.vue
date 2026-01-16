<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    content?: string
    disabled?: boolean
    side?: 'top' | 'bottom' | 'left' | 'right'
    maxWidth?: string
  }>(),
  {
    disabled: false,
    side: 'top',
    maxWidth: '300px'
  }
)

const show = ref(false)
const tooltipRef = ref<HTMLElement>()

const handleMouseEnter = (): void => {
  if (!props.disabled && props.content) {
    show.value = true
  }
}

const handleMouseLeave = (): void => {
  show.value = false
}

const tooltipClass = computed(() => {
  const baseClass =
    'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none'

  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return `${baseClass} ${positionClass[props.side]}`
})
</script>

<template>
  <div class="relative inline-block" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <slot />
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show && content"
        ref="tooltipRef"
        :class="tooltipClass"
        :style="{ maxWidth: maxWidth }"
      >
        {{ content }}
      </div>
    </Transition>
  </div>
</template>
