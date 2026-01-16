<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  currentPage: number
  totalPages: number
  pageSize?: number
  total?: number
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 10,
  total: 0
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
}>()

// 计算显示的页码范围
const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const totalPages = props.totalPages

  if (totalPages <= 7) {
    // 如果总页数 <= 7，全部显示
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // 总页数 > 7，显示省略号
    if (props.currentPage <= 3) {
      // 当前页在前面
      pages.push(1, 2, 3, 4, '...', totalPages)
    } else if (props.currentPage >= totalPages - 2) {
      // 当前页在后面
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      // 当前页在中间
      pages.push(
        1,
        '...',
        props.currentPage - 1,
        props.currentPage,
        props.currentPage + 1,
        '...',
        totalPages
      )
    }
  }

  return pages
})

const goToPage = (page: number): void => {
  if (page < 1 || page > props.totalPages) return
  emit('update:currentPage', page)
}

const prevPage = (): void => {
  if (props.currentPage > 1) {
    goToPage(props.currentPage - 1)
  }
}

const nextPage = (): void => {
  if (props.currentPage < props.totalPages) {
    goToPage(props.currentPage + 1)
  }
}
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="text-sm text-muted-foreground">共 {{ total }} 条记录，每页 {{ pageSize }} 条</div>
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" :disabled="currentPage === 1" @click="prevPage">
        <ChevronLeft class="w-4 h-4" />
        上一页
      </Button>

      <div class="flex items-center gap-1">
        <template v-for="(page, index) in visiblePages" :key="index">
          <Button
            v-if="typeof page === 'number'"
            :variant="page === currentPage ? 'default' : 'outline'"
            size="sm"
            class="min-w-[40px]"
            @click="goToPage(page)"
          >
            {{ page }}
          </Button>
          <span v-else class="px-2 text-muted-foreground">
            {{ page }}
          </span>
        </template>
      </div>

      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage === totalPages || totalPages === 0"
        @click="nextPage"
      >
        下一页
        <ChevronRight class="w-4 h-4" />
      </Button>
    </div>
  </div>
</template>
