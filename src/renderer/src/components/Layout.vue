<script setup lang="ts">
import Sidebar from './Sidebar.vue'
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <Sidebar />
    <main class="flex-1 overflow-hidden flex flex-col">
      <div class="p4 drag w-full h-6" />
      <div class="flex-1 overflow-hidden px-6 py-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
