<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-vue-next'

interface CheckboxProps {
  modelValue?: boolean
  disabled?: boolean
  id?: string
  class?: string
}

interface CheckboxEmits {
  (e: 'update:modelValue', value: boolean): void
}

const props = withDefaults(defineProps<CheckboxProps>(), {
  modelValue: false,
  disabled: false
})

const emit = defineEmits<CheckboxEmits>()

const toggle = (): void => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}

const checkboxClasses = computed(() =>
  cn(
    'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
    'cursor-pointer transition-colors',
    props.class
  )
)
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="modelValue"
    :data-state="modelValue ? 'checked' : 'unchecked'"
    :disabled="disabled"
    :class="checkboxClasses"
    @click="toggle"
  >
    <span class="flex items-center justify-center text-current">
      <Check v-if="modelValue" class="h-3 w-3" />
    </span>
  </button>
</template>
