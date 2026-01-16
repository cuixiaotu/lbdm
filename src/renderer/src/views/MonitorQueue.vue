<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import Pagination from '@/components/ui/pagination/Pagination.vue'
import { RefreshCw, Trash2, Play, Square } from 'lucide-vue-next'
import { showDialog } from '@/composables/useDialog'
import { showSuccess, showError } from '@/composables/useToast'
import type { MonitorQueueItem } from '@/../../shared/ipc/types'

// 监控队列列表
const monitorQueue = ref<MonitorQueueItem[]>([])

// 选中的项目
const selectedItems = ref<Set<string>>(new Set())

// 监控服务状态
const isMonitoring = ref(false)
const checkingStatus = ref(false)
const statusCheckTimer = ref<number | null>(null)

// 分页相关
const currentPage = ref(1)
const pageSize = 10

// 计算总页数
const totalPages = computed(() => Math.ceil(monitorQueue.value.length / pageSize))

// 当前页显示的队列
const paginatedQueue = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return monitorQueue.value.slice(start, end)
})

// 组件加载时获取监控队列和服务状态
onMounted(async () => {
  await loadMonitorQueue()
  await checkMonitorStatus()
  // 定期检查监控状态（每5秒）
  statusCheckTimer.value = window.setInterval(checkMonitorStatus, 5000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (statusCheckTimer.value) {
    window.clearInterval(statusCheckTimer.value)
  }
})

/**
 * 加载监控队列
 */
const loadMonitorQueue = async (): Promise<void> => {
  try {
    const queue = await window.api.monitorQueue.list()
    monitorQueue.value = queue
    console.log('监控队列加载成功:', queue)
  } catch (error) {
    console.error('加载监控队列失败:', error)
    showError('加载监控队列失败，请重试')
  }
}

/**
 * 检查监控服务状态
 */
const checkMonitorStatus = async (): Promise<void> => {
  if (checkingStatus.value) return

  try {
    checkingStatus.value = true
    // 直接获取liveRoomMonitorQueueService的运行状态
    const result = await window.api.monitorQueue.getStatus()
    isMonitoring.value = result.isRunning
  } catch (error) {
    console.error('获取监控状态失败:', error)
  } finally {
    checkingStatus.value = false
  }
}

/**
 * 启动监控服务
 */
const startMonitoring = async (): Promise<void> => {
  try {
    // 检查是否有监控项
    if (monitorQueue.value.length === 0) {
      await showDialog({
        type: 'warning',
        title: '无法启动',
        message: '监控队列为空',
        detail: '请先在账户列表中添加需要监控的直播间'
      })
      return
    }

    // 获取配置并验证数据库连接
    const config = await window.api.config.get()

    if (
      !config.database.host ||
      !config.database.user ||
      !config.database.password ||
      !config.database.database
    ) {
      await showDialog({
        type: 'warning',
        title: '配置不完整',
        message: '请先在系统设置中配置 MySQL 数据库连接信息',
        detail: '监控服务需要将数据推送到远程数据库，请确保配置完整且正确。'
      })
      return
    }

    // 测试数据库连接
    console.log('[MonitorQueue] Testing MySQL connection...')
    const testResult = await window.api.config.testConnection(config)

    if (!testResult.success) {
      console.error('[MonitorQueue] MySQL connection test failed:', testResult)
      await showDialog({
        type: 'error',
        title: 'MySQL 连接失败',
        message: '无法连接到 MySQL 数据库，无法启动监控服务',
        detail: `${testResult.error}

${testResult.details || ''}

请在系统设置中检查并修正数据库配置。`
      })
      return
    }

    console.log('[MonitorQueue] MySQL connection test passed:', testResult)

    // 启动监听队列服务
    const result = await window.api.monitorQueue.start()
    if (result.success) {
      // 立即检查状态以确保界面同步
      await checkMonitorStatus()
      showSuccess(
        `MySQL 连接正常，响应时间: ${testResult.responseTime}ms${testResult.usedSsh ? ' (通过SSH隧道)' : ''}`,
        '监听队列服务已启动'
      )
    } else {
      showError('启动监听队列服务失败')
    }
  } catch (error) {
    console.error('启动监控服务失败:', error)
    showError(error instanceof Error ? error.message : '启动监控服务失败')
  }
}

/**
 * 停止监控服务
 */
const stopMonitoring = async (): Promise<void> => {
  try {
    // 确认停止
    const confirmResult = await showDialog({
      type: 'warning',
      title: '确认停止',
      message: '确定要停止监听队列服务吗？',
      detail: '停止后将不再自动获取和推送直播间数据',
      buttons: ['取消', '确定'],
      defaultId: 0,
      cancelId: 0
    })

    // 用户点击取消
    if (!confirmResult || confirmResult.response !== 1) {
      return
    }

    const result = await window.api.monitorQueue.stop()
    if (result.success) {
      // 立即检查状态以确保界面同步
      await checkMonitorStatus()
      showSuccess('监听队列服务已停止')
    } else {
      showError('停止监听队列服务失败')
    }
  } catch (error) {
    console.error('停止监控服务失败:', error)
    showError('停止监控服务失败')
  }
}

/**
 * 移除单个
 */
const removeItem = async (item: MonitorQueueItem): Promise<void> => {
  try {
    const result = await window.api.monitorQueue.remove({
      roomId: item.roomId,
      accountId: item.accountId
    })

    if (result.success) {
      showSuccess(`直播间已从监听队列移除`)
      // 重新加载列表
      await loadMonitorQueue()
      // 如果当前页没有数据了，跳转到上一页
      if (paginatedQueue.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
      }
    } else {
      showError(result.message || '移除失败')
    }
  } catch (error) {
    console.error('移除失败:', error)
    showError('移除失败，请重试')
  }
}

/**
 * 刷新列表
 */
const refreshList = async (): Promise<void> => {
  await loadMonitorQueue()
  currentPage.value = 1
  selectedItems.value.clear()
  showSuccess('列表已刷新')
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 固定头部 -->
    <div class="flex-shrink-0 mb-6">
      <h2 class="text-3xl font-bold text-foreground">监控列表</h2>
      <p class="text-muted-foreground mt-2">管理直播间监控队列</p>
    </div>

    <!-- 可滚动内容区域 -->
    <div class="flex-1 overflow-y-auto pr-2">
      <div class="max-w-7xl">
        <Card>
          <CardHeader>
            <div class="flex justify-between items-center">
              <div>
                <CardTitle>监控队列</CardTitle>
                <p class="text-sm text-muted-foreground mt-1">
                  共 {{ monitorQueue.length }} 个直播间
                  <span
                    :class="[
                      'ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      isMonitoring
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    ]"
                  >
                    <span
                      :class="[
                        'w-1.5 h-1.5 rounded-full',
                        isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      ]"
                    ></span>
                    {{ isMonitoring ? '监控中' : '未监控' }}
                  </span>
                </p>
              </div>
              <div class="flex gap-2">
                <!-- 监控控制按钮 -->
                <Button
                  v-if="!isMonitoring"
                  variant="default"
                  size="sm"
                  class="gap-2 bg-green-600 hover:bg-green-700"
                  @click="startMonitoring"
                >
                  <Play class="w-4 h-4" />
                  启动监控
                </Button>
                <Button
                  v-else
                  variant="destructive"
                  size="sm"
                  class="gap-2"
                  @click="stopMonitoring"
                >
                  <Square class="w-4 h-4" />
                  停止监控
                </Button>

                <Button variant="outline" size="sm" class="gap-2" @click="refreshList">
                  <RefreshCw class="w-4 h-4" />
                  刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="text-center">账户名称</TableHead>
                  <TableHead class="text-center">主播昵称</TableHead>
                  <TableHead class="text-center">直播间ID</TableHead>
                  <TableHead class="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="monitorQueue.length === 0">
                  <TableCell colspan="9" class="text-center text-muted-foreground">
                    暂无监控的直播间
                  </TableCell>
                </TableRow>
                <TableRow v-for="item in paginatedQueue" :key="`${item.accountId}:${item.roomId}`">
                  <TableCell class="text-center">
                    <div class="max-w-[150px] truncate mx-auto">{{ item.accountName }}</div>
                  </TableCell>
                  <TableCell class="text-center">
                    <div class="max-w-[150px] truncate mx-auto">
                      {{ item.anchorNickname }}
                    </div>
                  </TableCell>
                  <TableCell class="text-center">{{ item.roomId }}</TableCell>
                  <TableCell class="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive/80"
                      @click="removeItem(item)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <!-- 分页 -->
            <div v-if="monitorQueue.length > 0" class="mt-4">
              <Pagination
                v-model:current-page="currentPage"
                :total-pages="totalPages"
                :page-size="pageSize"
                :total="monitorQueue.length"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
