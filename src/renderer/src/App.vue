<script setup lang="ts">
import Dialog from '@/components/ui/dialog/Dialog.vue'
import { ToastContainer } from '@/components/ui/toast'
</script>

<template>
  <router-view />
  <!-- 全局 Dialog 组件 -->
  <Dialog />
  <!-- 全局 Toast 组件 -->
  <ToastContainer />
</template>
