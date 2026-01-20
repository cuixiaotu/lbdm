# 直播间列表服务

## 概述

直播间列表服务（`LiveRoomService`）是一个轮询服务，每隔 30 秒自动获取所有账户的直播间列表数据并缓存在内存中。服务会使用账户数据库中的 `organizationId` 作为 `groupId` 调用 `getLiveIESList` 接口。

## 特性

- ✅ **自动轮询**：每 30 秒自动获取所有账户的直播间数据
- ✅ **并发请求**：同时请求所有账户的数据，提高效率
- ✅ **内存缓存**：将直播间数据缓存在内存中，快速访问
- ✅ **实时推送**：数据更新时自动推送到渲染进程
- ✅ **错误处理**：独立处理每个账户的请求失败
- ✅ **统计信息**：提供汇总统计数据

## 架构

```
┌─────────────────────────────────────────────┐
│          LiveRoomService                    │
│  (主进程 - 每 30 秒轮询)                     │
├─────────────────────────────────────────────┤
│  • 获取所有账户列表                          │
│  • 并发调用 getLiveIESList 接口              │
│  • 使用 organizationId 作为 groupId          │
│  • 缓存直播间数据到内存                      │
│  • 推送更新到渲染进程                        │
└──────────────┬──────────────────────────────┘
               │ IPC Events
               ↓
┌─────────────────────────────────────────────┐
│         Renderer Process                    │
│  (渲染进程 - 监听更新)                       │
├─────────────────────────────────────────────┤
│  • 监听 live-room:updated 事件               │
│  • 自动更新 UI 显示                          │
│  • 调用 API 获取/刷新数据                    │
└─────────────────────────────────────────────┘
```

## 数据结构

### AccountLiveRooms

每个账户的直播间数据结构：

```typescript
interface AccountLiveRooms {
  accountId: number // 账户ID
  accountName: string // 账户名称
  organizationId: string // 组织ID（用作 groupId）
  liveData: LiveIESListData | null // 直播间列表数据
  lastUpdate: number // 最后更新时间戳
  success: boolean // 请求是否成功
  error?: string // 错误信息（如果失败）
}
```

### LiveIESListData

直播间列表详细数据（来自 API 响应）：

```typescript
interface LiveIESListData {
  list: LiveRoomInfo[] // 直播间列表
  overview: LiveOverview // 概览统计
  ies_count: number // 总直播间数量
  pagination: Pagination // 分页信息
}
```

## 使用方法

### 1. 获取所有账户的直播间数据

```typescript
// 从缓存获取所有账户的直播间数据
const allLiveRooms = await window.api.liveRoom.getAll()

console.log(`获取到 ${allLiveRooms.length} 个账户的直播间数据`)

allLiveRooms.forEach((accountData) => {
  if (accountData.success && accountData.liveData) {
    console.log(`账户 ${accountData.accountName}:`)
    console.log(`  - 直播间总数: ${accountData.liveData.ies_count}`)
    console.log(`  - 在线直播: ${accountData.liveData.overview.line_online_count}`)
    console.log(`  - 当前列表: ${accountData.liveData.list.length} 个`)
  } else {
    console.log(`账户 ${accountData.accountName} 获取失败: ${accountData.error}`)
  }
})
```

### 2. 获取指定账户的直播间数据

```typescript
// 获取账户 ID 为 1 的直播间数据
const accountLiveRooms = await window.api.liveRoom.getByAccount(1)

if (accountLiveRooms && accountLiveRooms.success && accountLiveRooms.liveData) {
  const { list, overview } = accountLiveRooms.liveData

  console.log('直播间列表:', list)
  console.log('在线直播数:', overview.line_online_count)
  console.log('累计观看:', overview.cumulative_views_count)
}
```

### 3. 监听实时更新

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { AccountLiveRooms } from '@shared/ipc'

const liveRoomsData = ref<AccountLiveRooms[]>([])

// 更新处理函数
const handleLiveRoomUpdate = (data: AccountLiveRooms[]) => {
  console.log('直播间数据已更新:', data.length, '个账户')
  liveRoomsData.value = data
}

// 组件挂载时监听
let unsubscribe: (() => void) | null = null

onMounted(async () => {
  // 初次加载
  liveRoomsData.value = await window.api.liveRoom.getAll()

  // 监听后续更新（每 30 秒自动推送）
  unsubscribe = window.api.liveRoom.onUpdated(handleLiveRoomUpdate)
})

// 组件卸载时取消监听
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<template>
  <div>
    <h2>直播间监控 ({{ liveRoomsData.length }} 个账户)</h2>
    <div v-for="account in liveRoomsData" :key="account.accountId">
      <h3>{{ account.accountName }}</h3>
      <div v-if="account.success && account.liveData">
        <p>在线: {{ account.liveData.overview.line_online_count }}</p>
        <p>总数: {{ account.liveData.ies_count }}</p>
      </div>
      <div v-else>
        <p>获取失败: {{ account.error }}</p>
      </div>
    </div>
  </div>
</template>
```

### 4. 手动刷新数据

```typescript
// 刷新所有账户的直播间数据
const refreshAll = async () => {
  const result = await window.api.liveRoom.refresh()
  if (result.success) {
    console.log('所有直播间数据刷新成功')
    // 刷新后会自动触发 onUpdated 回调
  }
}

// 刷新指定账户的直播间数据
const refreshAccount = async (accountId: number) => {
  const accountData = await window.api.liveRoom.refreshAccount(accountId)
  if (accountData && accountData.success) {
    console.log(`账户 ${accountId} 刷新成功`)
    // 刷新后会自动触发 onUpdated 回调
  }
}

// 刷新指定账户的直播间数据
const refreshAccountForce = async (accountId: number) => {
  const accountData = await window.api.liveRoom.refreshAccountForce(accountId)
  if (accountData && accountData.success) {
    console.log(`账户 ${accountId} 刷新成功`)
    // 刷新后会自动触发 onUpdated 回调
  }
}
```

### 5. 获取统计信息

```typescript
const stats = await window.api.liveRoom.getStatistics()

console.log('统计信息:')
console.log(`  总账户数: ${stats.totalAccounts}`)
console.log(`  成功账户: ${stats.successAccounts}`)
console.log(`  失败账户: ${stats.failedAccounts}`)
console.log(`  总直播间: ${stats.totalLiveRooms}`)
console.log(`  在线直播: ${stats.totalOnlineRooms}`)
```

## 完整示例：直播间监控组件

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { AccountLiveRooms, LiveRoomStatistics } from '@shared/ipc'

const liveRoomsData = ref<AccountLiveRooms[]>([])
const statistics = ref<LiveRoomStatistics | null>(null)
const isRefreshing = ref(false)
let unsubscribe: (() => void) | null = null

// 成功的账户数据
const successAccounts = computed(() => {
  return liveRoomsData.value.filter((a) => a.success && a.liveData)
})

// 失败的账户数据
const failedAccounts = computed(() => {
  return liveRoomsData.value.filter((a) => !a.success)
})

// 加载数据
const loadData = async () => {
  try {
    liveRoomsData.value = await window.api.liveRoom.getAll()
    statistics.value = await window.api.liveRoom.getStatistics()
    console.log('直播间数据加载完成')
  } catch (error) {
    console.error('加载直播间数据失败:', error)
  }
}

// 手动刷新
const handleRefresh = async () => {
  isRefreshing.value = true
  try {
    await window.api.liveRoom.refresh()
  } catch (error) {
    console.error('刷新失败:', error)
  } finally {
    isRefreshing.value = false
  }
}

// 刷新单个账户
const handleRefreshAccount = async (accountId: number) => {
  try {
    const result = await window.api.liveRoom.refreshAccount(accountId)
    if (result) {
      console.log(`账户 ${accountId} 刷新成功`)
    }
  } catch (error) {
    console.error(`刷新账户 ${accountId} 失败:`, error)
  }
}

// 更新回调
const handleUpdate = async (data: AccountLiveRooms[]) => {
  console.log('[LiveRoomMonitor] 收到更新:', data.length, '个账户')
  liveRoomsData.value = data
  statistics.value = await window.api.liveRoom.getStatistics()
}

// 生命周期
onMounted(async () => {
  // 初次加载
  await loadData()

  // 监听实时更新
  unsubscribe = window.api.liveRoom.onUpdated(handleUpdate)
  console.log('[LiveRoomMonitor] 已开始监听直播间更新')
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
    console.log('[LiveRoomMonitor] 已停止监听直播间更新')
  }
})
</script>

<template>
  <div class="live-room-monitor">
    <div class="header">
      <h2>直播间监控</h2>
      <button @click="handleRefresh" :disabled="isRefreshing">
        {{ isRefreshing ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <!-- 统计信息 -->
    <div v-if="statistics" class="statistics">
      <div class="stat-card">
        <span class="label">总账户</span>
        <span class="value">{{ statistics.totalAccounts }}</span>
      </div>
      <div class="stat-card">
        <span class="label">成功</span>
        <span class="value success">{{ statistics.successAccounts }}</span>
      </div>
      <div class="stat-card">
        <span class="label">失败</span>
        <span class="value error">{{ statistics.failedAccounts }}</span>
      </div>
      <div class="stat-card">
        <span class="label">总直播间</span>
        <span class="value">{{ statistics.totalLiveRooms }}</span>
      </div>
      <div class="stat-card">
        <span class="label">在线直播</span>
        <span class="value online">{{ statistics.totalOnlineRooms }}</span>
      </div>
    </div>

    <!-- 成功的账户 -->
    <div class="section">
      <h3>在线直播 ({{ successAccounts.length }})</h3>
      <div class="account-list">
        <div v-for="account in successAccounts" :key="account.accountId" class="account-card">
          <div class="account-header">
            <h4>{{ account.accountName }}</h4>
            <button @click="handleRefreshAccount(account.accountId)">刷新</button>
          </div>
          <div v-if="account.liveData" class="account-stats">
            <div class="stat">
              <span>在线:</span>
              <strong>{{ account.liveData.overview.line_online_count }}</strong>
            </div>
            <div class="stat">
              <span>总数:</span>
              <strong>{{ account.liveData.ies_count }}</strong>
            </div>
            <div class="stat">
              <span>累计观看:</span>
              <strong>{{ account.liveData.overview.cumulative_views_count }}</strong>
            </div>
            <div class="stat">
              <span>平均观看:</span>
              <strong>{{ account.liveData.overview.avg_views_count }}</strong>
            </div>
          </div>
          <div class="live-rooms">
            <div
              v-for="room in account.liveData?.list.slice(0, 5)"
              :key="room.room_id"
              class="live-room"
            >
              <img :src="room.avatar_thumb" :alt="room.nickname" />
              <div class="room-info">
                <p class="nickname">{{ room.nickname }}</p>
                <p class="stats">{{ room.user_count }} 人观看 · ¥{{ room.metrics.stat_cost }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 失败的账户 -->
    <div v-if="failedAccounts.length > 0" class="section">
      <h3>获取失败 ({{ failedAccounts.length }})</h3>
      <div class="error-list">
        <div v-for="account in failedAccounts" :key="account.accountId" class="error-card">
          <h4>{{ account.accountName }}</h4>
          <p class="error-message">{{ account.error }}</p>
          <button @click="handleRefreshAccount(account.accountId)">重试</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-room-monitor {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.statistics {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  flex: 1;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-card .label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-card .value {
  font-size: 24px;
  font-weight: bold;
}

.stat-card .value.success {
  color: #52c41a;
}

.stat-card .value.error {
  color: #ff4d4f;
}

.stat-card .value.online {
  color: #1890ff;
}

.section {
  margin-bottom: 30px;
}

.account-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.account-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  background: white;
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.account-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.live-rooms {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.live-room {
  display: flex;
  gap: 10px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.live-room img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.room-info {
  flex: 1;
}

.room-info .nickname {
  font-weight: 500;
  margin: 0 0 4px 0;
}

.room-info .stats {
  font-size: 12px;
  color: #666;
  margin: 0;
}
</style>
```

## API 参考

### 主进程 - LiveRoomService

```typescript
class LiveRoomService {
  // 初始化服务
  initialize(mainWindow: BrowserWindow): void

  // 启动轮询
  start(): void

  // 停止轮询
  stop(): void

  // 获取所有账户的直播间数据
  getAllLiveRooms(): AccountLiveRooms[]

  // 获取指定账户的直播间数据
  getLiveRoomsByAccountId(accountId: number): AccountLiveRooms | null

  // 手动刷新所有账户
  refresh(): Promise<void>

  // 手动刷新指定账户
  refreshAccount(accountId: number): Promise<AccountLiveRooms | null>
  
  // 手动刷新指定账户
  refreshAccountForce(accountId: number): Promise<AccountLiveRooms | null>

  // 清空缓存
  clearCache(): void

  // 获取统计信息
  getStatistics(): LiveRoomStatistics

  // 属性
  get running(): boolean
  get accountCount(): number
  get lastPoll(): number
}
```

### 渲染进程 - window.api.liveRoom

```typescript
interface LiveRoomAPI {
  // 获取所有账户的直播间数据（从缓存）
  getAll(): Promise<AccountLiveRooms[]>

  // 获取指定账户的直播间数据
  getByAccount(accountId: number): Promise<AccountLiveRooms | null>

  // 刷新所有账户的直播间数据
  refresh(): Promise<{ success: boolean }>

  // 刷新指定账户的直播间数据
  refreshAccount(accountId: number): Promise<AccountLiveRooms | null>
  
  // 强制刷新指定账户的直播间数据
  refreshAccountForce(accountId: number): Promise<AccountLiveRooms | null>

  // 获取统计信息
  getStatistics(): Promise<LiveRoomStatistics>

  // 监听直播间数据更新
  // 返回取消监听的函数
  onUpdated(callback: (data: AccountLiveRooms[]) => void): () => void
}
```

## 工作流程

1. **应用启动**
   - 主进程初始化 `LiveRoomService`
   - 立即执行一次轮询
   - 启动 30 秒定时器

2. **轮询流程**

   ```
   每 30 秒 → 查询所有账户 → 并发请求直播间数据
            ↓
   使用 organizationId 作为 groupId 调用 getLiveIESList
            ↓
   处理所有响应 → 更新内存缓存 → 推送到渲染进程
   ```

3. **请求细节**
   - 使用账户的 `cookie` 和 `csrf_token` 进行认证
   - 使用账户的 `organization_id` 作为接口的 `groupId` 参数
   - 默认获取 100 条直播间数据（可配置）
   - 每个账户的请求独立处理，失败不影响其他账户

4. **错误处理**
   - 单个账户请求失败：记录错误但继续处理其他账户
   - 所有账户请求完成后：统计成功和失败数量
   - 失败的账户仍会缓存，但 `success` 标记为 `false`

## 性能优化

- ✅ **并发请求**：使用 `Promise.allSettled` 同时请求所有账户
- ✅ **内存缓存**：避免重复查询数据库和 API
- ✅ **按需推送**：只在轮询完成后推送一次更新
- ✅ **错误隔离**：单个账户失败不影响其他账户

## 注意事项

1. **监听器清理**：组件卸载时必须调用 `unsubscribe()` 避免内存泄漏
2. **轮询间隔**：默认 30 秒，与账户监控服务保持一致
3. **organizationId**：确保账户数据库中的 `organization_id` 字段正确
4. **并发请求**：大量账户时可能产生较多并发请求，注意 API 限流

## 调试技巧

查看轮询日志：

```
[LiveRoomService] Initialized
[LiveRoomService] Started
[LiveRoomService] Starting poll...
[LiveRoomService] Found 5 accounts to fetch live rooms
[LiveRoomService] Fetching live rooms for account 1 (测试账户1)
[LiveRoomService] Account 1 success: 10 live rooms, 3 online
[LiveRoomService] Poll completed in 1523ms - Success: 5, Failed: 0
[LiveRoomService] Notified renderer of live room data update
```

在渲染进程控制台查看：

```javascript
// 查看所有直播间数据
const data = await window.api.liveRoom.getAll()
console.log('直播间数据:', data)

// 查看统计信息
const stats = await window.api.liveRoom.getStatistics()
console.log('统计:', stats)

// 强制刷新
await window.api.liveRoom.refresh()
```

## 更新日志

- **v1.0.0** - 初始版本
  - 实现基本轮询和缓存功能
  - 支持并发请求所有账户
  - 提供统计信息
  - 支持单账户刷新
