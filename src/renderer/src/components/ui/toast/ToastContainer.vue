<script setup lang="ts">
import { computed } from 'vue'
import Toast from './Toast.vue'
import { toastState } from '@/composables/useToast'

const toasts = computed(() => toastState.value.toasts)

const handleClose = (id: string): void => {
  toastState.value.toasts = toastState.value.toasts.filter((t) => t.id !== id)
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      <TransitionGroup name="toast">
        <Toast v-for="toast in toasts" :key="toast.id" v-bind="toast" @close="handleClose" />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
