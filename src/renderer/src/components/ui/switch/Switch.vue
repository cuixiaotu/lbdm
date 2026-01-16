<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface SwitchProps {
  modelValue?: boolean
  disabled?: boolean
  id?: string
  class?: string
}

interface SwitchEmits {
  (e: 'update:modelValue', value: boolean): void
}

const props = withDefaults(defineProps<SwitchProps>(), {
  modelValue: false,
  disabled: false
})

const emit = defineEmits<SwitchEmits>()

const toggle = (): void => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}

const switchClasses = computed(() =>
  cn(
    'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
    props.class
  )
)

const thumbClasses = computed(() =>
  cn(
    'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
    'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
  )
)
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :data-state="modelValue ? 'checked' : 'unchecked'"
    :disabled="disabled"
    :class="switchClasses"
    @click="toggle"
  >
    <span :data-state="modelValue ? 'checked' : 'unchecked'" :class="thumbClasses" />
  </button>
</template>
