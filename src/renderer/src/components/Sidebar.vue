<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Settings, ChevronLeft, ChevronRight, ListChecks } from 'lucide-vue-next'
import type { Component } from 'vue'

interface MenuItem {
  name: string
  path: string
  icon: Component
}

const menuItems: MenuItem[] = [
  { name: '账户列表', path: '/dashboard', icon: LayoutDashboard },
  { name: '监控列表', path: '/monitor-queue', icon: ListChecks },
  { name: '系统设置', path: '/configuration', icon: Settings }
]

const route = useRoute()
const router = useRouter()
const isCollapsed = ref(false)

const isActive = (path: string): boolean => {
  return route.path === path
}

const navigateTo = (path: string): void => {
  router.push(path)
}

const toggleSidebar = (): void => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <aside
    :class="
      cn(
        'bg-card border-r border-border h-screen flex flex-col transition-all duration-300 relative',
        isCollapsed ? 'w-20' : 'w-64'
      )
    "
  >
    <!-- Header -->
    <div class="p-4 drag flex items-center justify-between" />

    <!-- Menu Items -->
    <nav class="flex-1 p-4 space-y-2">
      <button
        v-for="item in menuItems"
        :key="item.path"
        :class="
          cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
            isActive(item.path)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            isCollapsed ? 'justify-center' : ''
          )
        "
        :title="isCollapsed ? item.name : ''"
        @click="navigateTo(item.path)"
      >
        <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span v-show="!isCollapsed" class="transition-opacity duration-300">{{ item.name }}</span>
      </button>
    </nav>

    <!-- Toggle Button -->
    <button
      class="absolute -right-3 top-20 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors z-10"
      :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
      @click="toggleSidebar"
    >
      <ChevronLeft v-if="!isCollapsed" class="w-4 h-4" />
      <ChevronRight v-else class="w-4 h-4" />
    </button>
  </aside>
</template>
