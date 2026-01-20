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
import { RefreshCw, Plus, X } from 'lucide-vue-next'
import { showSuccess, showError } from '@/composables/useToast'
import type { LiveRoomInfo, AccountLiveRooms } from '@/../../shared/ipc/types'

interface Props {
  open: boolean
  accountId: number | null
  accountName: string
  organizationId: string
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const loading = ref(false)
const liveRoomData = ref<AccountLiveRooms | null>(null)
const selectedRooms = ref<LiveRoomInfo[]>([])
const error = ref<string>('')
const monitoringRooms = ref<Set<string>>(new Set())

/**
 * 格式化数字显示
 */
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

/**
 * 检查直播间是否在监控队列中
 */
const isRoomMonitoring = (roomId: string): boolean => {
  return monitoringRooms.value.has(roomId)
}

/**
 * 加载监控队列状态
 */
const loadMonitoringStatus = async (): Promise<void> => {
  if (!props.accountId) return

  try {
    const monitorQueue = await window.api.monitorQueue.getByAccount(props.accountId)
    monitoringRooms.value = new Set(monitorQueue.map((item) => item.roomId))
  } catch (err) {
    console.error('加载监控状态失败:', err)
  }
}

/**
 * 加载直播间数据
 */
const loadLiveRooms = async (): Promise<void> => {
  if (!props.accountId) return

  try {
    loading.value = true
    error.value = ''
    selectedRooms.value = []

    // 并行加载直播间数据和监控状态
    const [data] = await Promise.all([
      window.api.liveRoom.getByAccount(props.accountId),
      loadMonitoringStatus()
    ])

    liveRoomData.value = data

    if (!data || !data.success) {
      error.value = data?.error || '获取直播间列表失败'
    }
  } catch (err) {
    console.error('加载直播间列表失败:', err)
    error.value = '加载数据失败，请重试'
    showError('无法加载直播间列表，请检查网络连接后重试')
  } finally {
    loading.value = false
  }
}

/**
 * 刷新直播间数据
 */
const forceRefreshLiveRooms = async (): Promise<void> => {
  if (!props.accountId) return

  try {
    loading.value = true
    error.value = ''

    const data = await window.api.liveRoom.refreshAccount(props.accountId)
    liveRoomData.value = data

    if (!data || !data.success) {
      error.value = data?.error || '刷新直播间列表失败'
      showError(error.value)
    } else {
      showSuccess('直播间列表已刷新')
    }
  } catch (err) {
    console.error('刷新直播间列表失败:', err)
    error.value = '刷新失败，请重试'
    showError('无法刷新直播间列表，请重试')
  } finally {
    loading.value = false
  }
}

// /**
//  * 刷新直播间数据
//  */
// const refreshLiveRooms = async (): Promise<void> => {
//   if (!props.accountId) return
//
//   try {
//     loading.value = true
//     error.value = ''
//
//     const data = await window.api.liveRoom.refreshAccount(props.accountId)
//     liveRoomData.value = data
//
//     if (!data || !data.success) {
//       error.value = data?.error || '刷新直播间列表失败'
//       showError(error.value)
//     } else {
//       showSuccess('直播间列表已刷新')
//     }
//   } catch (err) {
//     console.error('刷新直播间列表失败:', err)
//     error.value = '刷新失败，请重试'
//     showError('无法刷新直播间列表，请重试')
//   } finally {
//     loading.value = false
//   }
// }

/**
 * 添加到监听队列
 */
const addToMonitorQueue = async (room: LiveRoomInfo): Promise<void> => {
  if (!props.accountId) return

  try {
    loading.value = true

    const result = await window.api.monitorQueue.add({
      accountId: props.accountId,
      accountName: props.accountName,
      organizationId: props.organizationId,
      roomId: room.room_id,
      anchorNickname: room.nickname
    })

    if (result.success) {
      // 更新监控状态
      monitoringRooms.value.add(room.room_id)

      showSuccess(`直播间 ${room.nickname} 已添加到监听队列`)
    } else {
      throw new Error(result.message || '添加失败')
    }
  } catch (err) {
    console.error('添加到监听队列失败:', err)
    showError(err instanceof Error ? err.message : '无法添加到监听队列，请重试')
  } finally {
    loading.value = false
  }
}

/**
 * 从监听队列移除
 */
const removeFromMonitorQueue = async (room: LiveRoomInfo): Promise<void> => {
  if (!props.accountId) return

  try {
    loading.value = true

    const result = await window.api.monitorQueue.remove({
      accountId: props.accountId,
      roomId: room.room_id
    })

    if (result.success) {
      // 更新监控状态
      monitoringRooms.value.delete(room.room_id)

      showSuccess(`直播间 ${room.nickname} 已从监听队列移除`)
    } else {
      throw new Error(result.message || '移除失败')
    }
  } catch (err) {
    console.error('从监听队列移除失败:', err)
    showError(err instanceof Error ? err.message : '无法从监听队列移除，请重试')
  } finally {
    loading.value = false
  }
}

// 监听抽屉打开状态
watch(
  () => props.open,
  (newOpen) => {
    if (newOpen) {
      loadLiveRooms()
    }
  }
)
</script>

<template>
  <Drawer :open="open" width="800px" @update:open="$emit('update:open', $event)">
    <template #header>
      <div class="space-y-2">
        <h2 class="text-2xl font-bold">直播间列表</h2>
        <p class="text-sm text-muted-foreground">账户：{{ accountName }}</p>
      </div>
    </template>

    <div class="space-y-6">
      <!-- 统计概览 -->
      <div v-if="liveRoomData?.liveData" class="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">总直播间数</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ liveRoomData.liveData.ies_count }}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">在线观看</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-green-600">
              {{ formatNumber(liveRoomData.liveData.overview.line_online_count) }}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">累计观看</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-blue-600">
              {{ formatNumber(liveRoomData.liveData.overview.cumulative_views_count) }}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">推广中</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-orange-600">
              {{ liveRoomData.liveData.overview.promotion_count }}
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="text-red-600 text-sm">{{ error }}</div>
          <Button variant="ghost" size="sm" @click="error = ''">✕</Button>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          <span v-if="liveRoomData?.lastUpdate">
            最后更新: {{ new Date(liveRoomData.lastUpdate).toLocaleString('zh-CN') }}
          </span>
        </div>
        <Button variant="outline" :disabled="loading" @click="forceRefreshLiveRooms">
          <RefreshCw :class="{ 'animate-spin': loading }" class="w-4 h-4 mr-2" />
          <span v-if="loading">刷新中...</span>
          <span v-else>刷新</span>
        </Button>
<!--        <Button variant="outline" :disabled="loading" @click="forceRefreshLiveRooms">-->
<!--          <RefreshCw :class="{ 'animate-spin': loading }" class="w-4 h-4 mr-2" />-->
<!--          <span v-if="loading">刷新中...</span>-->
<!--          <span v-else>强制刷新</span>-->
<!--        </Button>-->
      </div>

      <!-- 直播间表格 -->
      <div class="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>主播</TableHead>
              <TableHead>直播间ID</TableHead>
              <TableHead>监控状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell colspan="8" class="text-center py-8">加载中...</TableCell>
            </TableRow>
            <TableRow
              v-else-if="!liveRoomData?.liveData?.list || liveRoomData.liveData.list.length === 0"
            >
              <TableCell colspan="8" class="text-center py-8 text-muted-foreground">
                暂无直播间数据
              </TableCell>
            </TableRow>
            <TableRow v-for="room in liveRoomData?.liveData?.list" v-else :key="room.room_id">
              <TableCell>
                <div class="flex items-center gap-2">
                  <div>
                    <div class="font-medium">{{ room.nickname }}</div>
                    <div class="text-xs text-muted-foreground">@{{ room.unique_id }}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell class="font-mono text-xs">{{ room.room_id }}</TableCell>
              <TableCell>
                <span
                  v-if="isRoomMonitoring(room.room_id)"
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                >
                  监控中
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                >
                  未监控
                </span>
              </TableCell>
              <TableCell>
                <Button
                  v-if="!isRoomMonitoring(room.room_id)"
                  variant="outline"
                  size="sm"
                  :disabled="loading"
                  @click="addToMonitorQueue(room)"
                >
                  <Plus class="w-3.5 h-3.5 mr-1" />
                  添加监听
                </Button>
                <Button
                  v-else
                  variant="destructive"
                  size="sm"
                  :disabled="loading"
                  @click="removeFromMonitorQueue(room)"
                >
                  <X class="w-3.5 h-3.5 mr-1" />
                  取消监听
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- 批量操作 -->
      <div v-if="selectedRooms.length > 0" class="flex items-center gap-2 p-4 bg-muted rounded-lg">
        <span class="text-sm text-muted-foreground">
          已选择 {{ selectedRooms.length }} 个直播间
        </span>
      </div>
    </div>
  </Drawer>
</template>
