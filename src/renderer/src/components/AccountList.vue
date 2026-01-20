<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import Pagination from '@/components/ui/pagination/Pagination.vue'
import { Trash2, RefreshCw, Plus, List, ShieldCheck, Edit } from 'lucide-vue-next'
import AccountAdd from './AccountAdd.vue'
import AccountEdit from './AccountEdit.vue'
import LiveRoomDrawer from './LiveRoomDrawer.vue'
import type { Account } from '@/../../shared/ipc/types'
import { showDialog } from '@/composables/useDialog'
import { showSuccess, showError } from '@/composables/useToast'

/**
 * 账户接口
 */
interface AccountDisplay extends Account {
  // 无需额外字段，直接使用 Account 类型
}

// 账户列表
const accounts = ref<AccountDisplay[]>([])

// 添加账户组件引用
const accountAddRef = ref<InstanceType<typeof AccountAdd>>()

// 编辑账户组件引用
const accountEditRef = ref<InstanceType<typeof AccountEdit>>()

// 直播间抽屉相关
const liveRoomDrawerOpen = ref(false)
const selectedAccount = ref<AccountDisplay | null>(null)

// 分页相关
const currentPage = ref(1)
const pageSize = 10

// 计算总页数
const totalPages = computed(() => Math.ceil(accounts.value.length / pageSize))

// 当前页显示的账户列表
const paginatedAccounts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return accounts.value.slice(start, end)
})

// 组件加载时获取账户列表
onMounted(async () => {
  await loadAccounts()
})

/**
 * 加载账户列表
 */
const loadAccounts = async (): Promise<void> => {
  try {
    const accountList = await window.api.account.list()

    // 获取监控队列统计信息
    const monitorStats = await window.api.monitorQueue.getStats()

    // 为每个账户添加监控数量
    accounts.value = accountList.map((account) => {
      const accountStat = monitorStats.byAccount.find((s) => s.accountId === account.id)
      return {
        ...account,
        monitoringCount: accountStat?.count || 0
      }
    })

    console.log('账户列表加载成功:', accounts.value)
  } catch (error) {
    console.error('加载账户列表失败:', error)
    showError('加载账户列表失败，请重试')
  }
}

/**
 * 打开添加账户抽屉
 */
const openAddDrawer = (): void => {
  accountAddRef.value?.open()
}

/**
 * 打开编辑账户抽屉
 */
const handleEdit = (account: AccountDisplay): void => {
  accountEditRef.value?.open(account)
}

/**
 * 获取状态显示文本
 */
const getStatusText = (isValid: boolean): string => {
  return isValid ? '有效' : '无效'
}

/**
 * 获取状态样式类
 */
const getStatusClass = (isValid: boolean): string => {
  return isValid
    ? 'text-green-600 bg-green-50 dark:bg-green-950'
    : 'text-red-600 bg-red-50 dark:bg-red-950'
}

/**
 * 打开直播间列表抽屉
 */
const handleViewLiveRooms = (account: AccountDisplay): void => {
  selectedAccount.value = { ...account }
  liveRoomDrawerOpen.value = true
}

/**
 * 检查是否可以删除
 */
const canDelete = (isValid: boolean): boolean => {
  return !isValid
}

/**
 * 重新验证账户凭证
 */
const handleReverify = async (account: AccountDisplay): Promise<void> => {
  try {
    console.log('重新验证凭证:', account.accountName)

    // 获取配置
    const config = await window.api.config.get()

    // 使用 API 重新验证
    const result = await window.api.account.reverify({
      username: account.username,
      password: account.password,
      loginUrl: config.account.loginUrl,
      organizationId: account.organizationId,
      accountId: account.id
    })

    if (result.success) {
      showSuccess(`账户 ${account.accountName} 的凭证已更新`)

      // 刷新列表
      await loadAccounts()
    }
  } catch (error) {
    console.error('重新验证失败:', error)
  }
}

/**
 * 处理账户保存后的刷新
 */
const handleAccountSaved = async (): Promise<void> => {
  await loadAccounts()
}

/**
 * 删除账户
 */
const handleDelete = async (account: AccountDisplay): Promise<void> => {

  try {
    // 确认删除
    const result = await showDialog({
      type: 'warning',
      title: '确认删除',
      message: `确定要删除账户 ${account.accountName} 吗？此操作不可恢复。`,
      buttons: ['取消', '确定'],
      defaultId: 0,
      cancelId: 0
    })

    // 用户点击取消
    if (!result || result.response !== 1) {
      return
    }

    console.log('删除账户:', account.accountName)

    // 调用主进程删除账户
    await window.api.account.delete(account.id)

    // 从列表中移除
    accounts.value = accounts.value.filter((a) => a.id !== account.id)

    // 如果删除后当前页没有数据了，跳转到上一页
    if (paginatedAccounts.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }

    showSuccess(`已删除账户: ${account.accountName}`)
  } catch (error) {
    console.error('删除账户失败:', error)
    showError('删除账户失败，请重试')
  }
}

/**
 * 刷新列表
 */
const refreshList = async (): Promise<void> => {
  await loadAccounts()
  // 重置到第一页
  currentPage.value = 1
  showSuccess('列表已刷新')
}
</script>

<template>
  <div class="w-full">
    <Card>
      <CardHeader>
        <div class="flex justify-between items-center">
          <div>
            <CardTitle>账户列表</CardTitle>
            <p class="text-sm text-muted-foreground mt-1">共 {{ accounts.length }} 个账户</p>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" class="gap-2" @click="openAddDrawer">
              <Plus class="w-4 h-4" />
              添加账户
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
              <TableHead class="w-[20px] text-center">ID</TableHead>
              <TableHead class="w-[100px] text-center">账户名称</TableHead>
              <TableHead class="w-[50px] text-center">用户名</TableHead>
              <TableHead class="w-[120px] text-center">组织ID</TableHead>
              <TableHead class="w-[250px] text-center">监控数量</TableHead>
              <TableHead class="w-[170px] text-center">凭证状态</TableHead>
              <TableHead class="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="accounts.length === 0">
              <TableCell colspan="7" class="text-center text-muted-foreground">
                暂无数据
              </TableCell>
            </TableRow>
            <TableRow v-for="account in paginatedAccounts" :key="account.id">
              <TableCell class="font-medium text-center">{{ account.id }}</TableCell>
              <TableCell class="text-center">
                <Tooltip :content="account.accountName">
                  <div class="max-w-[100px] truncate mx-auto">{{ account.accountName }}</div>
                </Tooltip>
              </TableCell>
              <TableCell class="text-center">
                <Tooltip :content="account.username">
                  <div class="max-w-[150px] truncate mx-auto">{{ account.username }}</div>
                </Tooltip>
              </TableCell>
              <TableCell class="text-center">
                <Tooltip :content="account.organizationId">
                  <div class="max-w-[180px] truncate mx-auto">{{ account.organizationId }}</div>
                </Tooltip>
              </TableCell>
              <TableCell class="text-center">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    account.monitoringCount && account.monitoringCount > 0
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  ]"
                >
                  {{ account.monitoringCount || 0 }} 个
                </span>
              </TableCell>
              <TableCell class="text-center">
                <Tooltip :content="getStatusText(account.isValid)">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                      getStatusClass(account.isValid)
                    ]"
                  >
                    {{ getStatusText(account.isValid) }}
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell class="text-center">
                <div class="flex justify-center gap-2 whitespace-nowrap">
                  <!-- 查看直播列表 -->
                  <button
                    class="inline-flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    @click="handleViewLiveRooms(account)"
                  >
                    <List class="w-3.5 h-3.5" />
                    <span>查看直播</span>
                  </button>

                  <!-- 编辑 -->
                  <button
                    class="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    @click="handleEdit(account)"
                  >
                    <Edit class="w-3.5 h-3.5" />
                    <span>编辑</span>
                  </button>

                  <!-- 重新验证 -->
                  <button
                    class="inline-flex items-center gap-0.5 text-xs text-amber-600 hover:text-amber-700 transition-colors"
                    @click="handleReverify(account)"
                  >
                    <ShieldCheck class="w-3.5 h-3.5" />
                    <span>更新凭证</span>
                  </button>

                  <!-- 删除 -->
                  <button
                    class="inline-flex items-center gap-0.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                    @click="handleDelete(account)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>删除</span>
                  </button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <!-- 分页 -->
        <div v-if="accounts.length > 0" class="mt-4">
          <Pagination
            v-model:current-page="currentPage"
            :total-pages="totalPages"
            :page-size="pageSize"
            :total="accounts.length"
          />
        </div>
      </CardContent>
    </Card>

    <!-- 添加账户抽屉 -->
    <AccountAdd ref="accountAddRef" @saved="handleAccountSaved" />

    <!-- 编辑账户抽屉 -->
    <AccountEdit ref="accountEditRef" @saved="handleAccountSaved" />

    <!-- 查看直播间抽屉 -->
    <LiveRoomDrawer
      v-model:open="liveRoomDrawerOpen"
      :account-id="selectedAccount?.id ?? null"
      :account-name="selectedAccount?.accountName ?? ''"
      :organization-id="selectedAccount?.organizationId ?? ''"
    />
  </div>
</template>
