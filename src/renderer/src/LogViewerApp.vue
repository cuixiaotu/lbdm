<script setup lang="ts">
import LogViewer from './views/LogViewer.vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import { ToastContainer } from '@/components/ui/toast'
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <main class="flex-1 overflow-hidden flex flex-col">
      <div class="p4 drag w-full h-6" />
      <div class="flex-1 overflow-hidden px-6 py-6">
        <LogViewer />
      </div>
    </main>
  </div>
  <!-- 全局 Dialog 组件 -->
  <Dialog />
  <!-- 全局 Toast 组件 -->
  <ToastContainer />
</template>
