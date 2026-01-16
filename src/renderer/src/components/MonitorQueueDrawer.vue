<template>
  <Drawer
    :open="open"
    title="监听队列管理"
    description="管理直播间监听队列，添加或移除需要监听的直播间"
    width="1000px"
    @update:open="$emit('update:open', $event)"
  >
    <div class="space-y-6">
      <!-- 统计信息 -->
      <div class="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ queueStats.total }}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">活跃</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-green-600">{{ queueStats.active }}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">暂停</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-orange-600">{{ queueStats.paused }}</div>
          </CardContent>
        </Card>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center gap-2">
          <div class="text-red-600 text-sm">{{ error }}</div>
          <Button variant="ghost" size="sm" @click="error = ''"> ✕ </Button>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Button :disabled="loading" @click="startMonitoring">
            <span v-if="loading">启动中...</span>
            <span v-else>启动监听</span>
          </Button>
          <Button variant="outline" :disabled="loading" @click="stopMonitoring">
            <span v-if="loading">停止中...</span>
            <span v-else>停止监听</span>
          </Button>
          <Button
            variant="destructive"
            :disabled="loading || queueStats.total === 0"
            @click="clearQueue"
          >
            <span v-if="loading">清空中...</span>
            <span v-else>清空队列</span>
          </Button>
        </div>
        <Button variant="outline" :disabled="loading" @click="refreshData">
          <span v-if="loading">刷新中...</span>
          <span v-else>🔄 刷新</span>
        </Button>
      </div>

      <!-- 监听队列表格 -->
      <div class="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>直播间ID</TableHead>
              <TableHead>账户</TableHead>
              <TableHead>组织ID</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>添加时间</TableHead>
              <TableHead>最后更新</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell colspan="8" class="text-center py-8"> 加载中... </TableCell>
            </TableRow>
            <TableRow v-else-if="monitorQueue.length === 0">
              <TableCell colspan="8" class="text-center py-8 text-muted-foreground">
                暂无监听队列
              </TableCell>
            </TableRow>
            <TableRow v-for="item in monitorQueue" v-else :key="`${item.roomId}-${item.accountId}`">
              <TableCell class="font-mono">{{ item.roomId }}</TableCell>
              <TableCell>{{ item.accountName }}</TableCell>
              <TableCell>{{ item.organizationId }}</TableCell>
              <TableCell>
                <Badge :variant="item.isActive ? 'default' : 'secondary'">
                  {{ item.isActive ? '活跃' : '暂停' }}
                </Badge>
              </TableCell>
              <TableCell>{{ formatTime(item.addedAt) }}</TableCell>
              <TableCell>{{ formatTime(item.lastUpdated) }}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" :disabled="loading" @click="removeItem(item)">
                  移除
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { showDialog } from '@/composables/useDialog'

interface MonitorQueueItem {
  roomId: string
  accountId: number
  accountName: string
  organizationId: string
  anchorNickname: string
  addedAt: number
  lastUpdated: number
  isActive: boolean
}

interface MonitorQueueStats {
  total: number
  active: number
  paused: number
  byAccount: Array<{
    accountId: number
    accountName: string
    count: number
  }>
}

interface Props {
  open: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const loading = ref(false)
const monitorQueue = ref<MonitorQueueItem[]>([])
const queueStats = ref<MonitorQueueStats>({
  total: 0,
  active: 0,
  paused: 0,
  byAccount: []
})
const selectedItems = ref<MonitorQueueItem[]>([])
const error = ref<string>('')

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const loadData = async (): Promise<void> => {
  try {
    loading.value = true
    error.value = ''
    const [queueData, statsData] = await Promise.all([
      window.api.monitorQueue.list(),
      window.api.monitorQueue.getStats()
    ])
    monitorQueue.value = queueData
    queueStats.value = statsData
  } catch (err) {
    console.error('加载监听队列数据失败:', err)
    error.value = '加载数据失败，请重试'
    await showDialog({
      type: 'error',
      title: '加载失败',
      message: '无法加载监听队列数据',
      detail: err instanceof Error ? err.message : '请检查网络连接后重试'
    })
  } finally {
    loading.value = false
  }
}

const startMonitoring = async (): Promise<void> => {
  try {
    loading.value = true
    const result = await window.api.monitorQueue.start()
    if (result.success) {
      await showDialog({
        type: 'success',
        title: '成功',
        message: '监听队列已启动'
      })
      await loadData()
    } else {
      throw new Error('启动失败')
    }
  } catch (err) {
    console.error('启动监听失败:', err)
    await showDialog({
      type: 'error',
      title: '启动失败',
      message: '无法启动监听队列',
      detail: err instanceof Error ? err.message : '请重试'
    })
  } finally {
    loading.value = false
  }
}

const stopMonitoring = async (): Promise<void> => {
  try {
    // 确认停止
    const confirmResult = await showDialog({
      type: 'warning',
      title: '确认停止',
      message: '确定要停止监听队列吗？',
      detail: '停止后将不再监控任何直播间',
      buttons: ['取消', '确定'],
      defaultId: 0,
      cancelId: 0
    })

    if (!confirmResult || confirmResult.response !== 1) {
      return
    }

    loading.value = true
    const result = await window.api.monitorQueue.stop()
    if (result.success) {
      await showDialog({
        type: 'success',
        title: '成功',
        message: '监听队列已停止'
      })
      await loadData()
    } else {
      throw new Error('停止失败')
    }
  } catch (err) {
    console.error('停止监听失败:', err)
    await showDialog({
      type: 'error',
      title: '停止失败',
      message: '无法停止监听队列',
      detail: err instanceof Error ? err.message : '请重试'
    })
  } finally {
    loading.value = false
  }
}

const clearQueue = async (): Promise<void> => {
  try {
    // 确认清空
    const confirmResult = await showDialog({
      type: 'warning',
      title: '确认清空',
      message: `确定要清空所有监听队列吗？`,
      detail: `将移除 ${queueStats.value.total} 个监听项，此操作不可恢复`,
      buttons: ['取消', '确定'],
      defaultId: 0,
      cancelId: 0
    })

    if (!confirmResult || confirmResult.response !== 1) {
      return
    }

    loading.value = true
    const result = await window.api.monitorQueue.clear()
    if (result.success) {
      selectedItems.value = []
      await showDialog({
        type: 'success',
        title: '成功',
        message: '监听队列已清空'
      })
      await loadData()
    } else {
      throw new Error(result.message || '清空失败')
    }
  } catch (err) {
    console.error('清空队列失败:', err)
    await showDialog({
      type: 'error',
      title: '清空失败',
      message: '无法清空监听队列',
      detail: err instanceof Error ? err.message : '请重试'
    })
  } finally {
    loading.value = false
  }
}

const removeItem = async (item: MonitorQueueItem): Promise<void> => {
  try {
    // 确认移除
    const confirmResult = await showDialog({
      type: 'warning',
      title: '确认移除',
      message: `确定要移除直播间 ${item.roomId} 吗？`,
      detail: `账户：${item.accountName}`,
      buttons: ['取消', '确定'],
      defaultId: 0,
      cancelId: 0
    })

    if (!confirmResult || confirmResult.response !== 1) {
      return
    }

    loading.value = true
    const result = await window.api.monitorQueue.remove({
      roomId: item.roomId,
      accountId: item.accountId
    })

    if (result.success) {
      await showDialog({
        type: 'success',
        title: '成功',
        message: '监听项已移除'
      })
      await loadData()
    } else {
      throw new Error(result.message || '移除失败')
    }
  } catch (err) {
    console.error('移除监听项失败:', err)
    await showDialog({
      type: 'error',
      title: '移除失败',
      message: '无法移除监听项',
      detail: err instanceof Error ? err.message : '请重试'
    })
  } finally {
    loading.value = false
  }
}

const refreshData = async (): Promise<void> => {
  await loadData()
}

watch(
  () => props.open,
  (newOpen) => {
    if (newOpen) {
      loadData()
    }
  }
)
</script>
