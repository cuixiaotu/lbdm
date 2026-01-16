<script setup lang="ts">
import AccountList from '@/components/AccountList.vue'
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 固定头部 -->
    <div class="flex-shrink-0 mb-6">
      <h2 class="text-3xl font-bold text-foreground">账户管理</h2>
      <p class="text-muted-foreground mt-2">管理所有账户和直播间</p>
    </div>

    <!-- 可滚动内容区域 -->
    <div class="flex-1 overflow-y-auto pr-2">
      <div class="max-w-7xl">
        <!-- 账户列表 -->
        <AccountList />
      </div>
    </div>
  </div>
</template>
