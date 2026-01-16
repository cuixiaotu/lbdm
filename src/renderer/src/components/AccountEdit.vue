<script setup lang="ts">
import { ref, defineExpose, defineEmits, computed, watch } from 'vue'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Account } from '@/../../shared/ipc/types'
import { showDialog } from '@/composables/useDialog'
import { showInfo, showWarning, showSuccess } from '@/composables/useToast'

// 定义事件
const emit = defineEmits<{
  saved: []
}>()

// 抽屉状态
const isDrawerOpen = ref(false)

// 原始账户数据（用于对比）
const originalAccount = ref<Account | null>(null)

// 编辑表单（仅包含可编辑字段）
const editForm = ref({
  id: 0,
  accountName: '',
  cookie: '',
  csrfToken: '', // 从 cookie 中提取，不可见
  remark: ''
})

// 只读字段（用于显示）
const readonlyFields = ref({
  username: '',
  organizationId: ''
})

// 表单错误
const formErrors = ref({
  accountName: '',
  cookie: ''
})

/**
 * 从 Cookie 字符串中提取 csrftoken
 */
const extractCsrfToken = (cookieString: string): string => {
  const match = cookieString.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ''
}

/**
 * 监听 cookie 变化，自动提取 csrfToken
 */
watch(
  () => editForm.value.cookie,
  (newCookie) => {
    if (newCookie) {
      editForm.value.csrfToken = extractCsrfToken(newCookie)
    } else {
      editForm.value.csrfToken = ''
    }
  }
)

/**
 * 打开抽屉
 */
const open = (account: Account): void => {
  originalAccount.value = { ...account }

  // 填充表单
  editForm.value = {
    id: account.id,
    accountName: account.accountName,
    cookie: account.cookie,
    csrfToken: account.csrfToken,
    remark: account.remark || ''
  }

  // 填充只读字段
  readonlyFields.value = {
    username: account.username,
    organizationId: account.organizationId
  }

  // 清空错误
  formErrors.value = {
    accountName: '',
    cookie: ''
  }

  isDrawerOpen.value = true
}

/**
 * 关闭抽屉
 */
const close = (): void => {
  isDrawerOpen.value = false
}

/**
 * 检查是否有修改
 */
const hasChanges = computed(() => {
  if (!originalAccount.value) return false

  return (
    editForm.value.accountName !== originalAccount.value.accountName ||
    editForm.value.cookie !== originalAccount.value.cookie ||
    editForm.value.remark !== (originalAccount.value.remark || '')
  )
})

/**
 * 验证表单
 */
const validateForm = (): boolean => {
  let isValid = true
  formErrors.value = {
    accountName: '',
    cookie: ''
  }

  if (!editForm.value.accountName.trim()) {
    formErrors.value.accountName = '账户名称为必填项'
    isValid = false
  }

  if (!editForm.value.cookie.trim()) {
    formErrors.value.cookie = 'Cookie 为必填项'
    isValid = false
  }

  // 验证 csrfToken 是否成功提取
  if (editForm.value.cookie.trim() && !editForm.value.csrfToken) {
    formErrors.value.cookie = '无法从 Cookie 中提取 csrfToken，请检查格式'
    isValid = false
  }

  return isValid
}

/**
 * 保存修改
 */
const handleSave = async (): Promise<void> => {
  if (!validateForm()) {
    return
  }

  if (!hasChanges.value) {
    showInfo('没有任何修改')
    return
  }

  try {
    console.log('保存账户修改:', editForm.value)

    // 先验证凭证是否有效（使用 accountId 验证）
    const validationResult = await window.api.account.validateCredentials(editForm.value.id)

    if (!validationResult.success) {
      await showDialog({
        type: 'error',
        title: '验证失败',
        message: '无法验证账户凭证',
        detail: validationResult.error || '请检查网络连接'
      })
      return
    }

    // 检查凭证是否有效
    if (!validationResult.isValid) {
      await showDialog({
        type: 'warning',
        title: '凭证无效',
        message: '账户凭证已失效，无法保存',
        detail: '请更新 Cookie 后重试，或使用“重新验证”功能获取新凭证。'
      })
      return
    }

    // 凭证有效，构造完整的账户对象（合并原始数据和编辑后的数据）
    const updatedAccount: Account = {
      ...originalAccount.value!,
      accountName: editForm.value.accountName,
      cookie: editForm.value.cookie,
      csrfToken: editForm.value.csrfToken,
      remark: editForm.value.remark
    }

    // 调用更新 API
    const result = await window.api.account.update(updatedAccount)

    if (result.success) {
      // 更新成功，再次验证凭证有效性
      console.log(`账户 ${editForm.value.id} 更新成功，再次验证凭证...`)

      const validationResult = await window.api.account.validateCredentials(editForm.value.id)

      if (!validationResult.success) {
        showWarning('账户信息已更新，但无法验证凭证，请稍后手动验证或重新登录')
      } else if (!validationResult.isValid) {
        // 凭证失效，需要更新内存和数据库
        console.warn(`账户 ${editForm.value.id} 凭证已失效，更新状态...`)

        // 构造更新后的账户对象（设置 isValid 为 false）
        const invalidAccount: Account = {
          ...updatedAccount,
          isValid: false
        }

        // 更新数据库状态
        await window.api.account.update(invalidAccount)

        showWarning(
          '账户信息已更新，但凭证已失效，账户状态已标记为无效，请使用“重新验证”功能获取新凭证'
        )
      } else {
        showSuccess('账户信息已更新，凭证状态有效')
      }
    } else {
      await showDialog({
        type: 'error',
        title: '错误',
        message: '更新账户失败，请重试'
      })
    }
  } catch (error) {
    console.error('保存账户失败:', error)
    await showDialog({
      type: 'error',
      title: '错误',
      message: '保存账户失败',
      detail: error instanceof Error ? error.message : '请重试'
    })
  } finally {
    // 无论成功还是失败，都关闭抽屉并刷新列表
    isDrawerOpen.value = false
    emit('saved')
  }
}

// 暴露方法给父组件
defineExpose({
  open,
  close
})
</script>

<template>
  <Drawer :open="isDrawerOpen" width="500px" @update:open="(val) => (isDrawerOpen = val)">
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-6">编辑账户</h2>

      <div class="space-y-4">
        <!-- 账户名称（可编辑） -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            账户名称
            <span class="text-red-500">*</span>
          </label>
          <Input
            v-model="editForm.accountName"
            placeholder="请输入账户名称"
            :class="formErrors.accountName ? 'border-red-500' : ''"
          />
          <p v-if="formErrors.accountName" class="text-xs text-red-500">
            {{ formErrors.accountName }}
          </p>
        </div>

        <!-- 用户名（只读） -->
        <div class="space-y-2">
          <label class="text-sm font-medium">用户名</label>
          <Input v-model="readonlyFields.username" readonly class="bg-muted cursor-not-allowed" />
          <p class="text-xs text-muted-foreground">此字段不可编辑</p>
        </div>

        <!-- 组织ID（只读） -->
        <div class="space-y-2">
          <label class="text-sm font-medium">组织ID</label>
          <Input
            v-model="readonlyFields.organizationId"
            readonly
            class="bg-muted cursor-not-allowed"
          />
          <p class="text-xs text-muted-foreground">此字段不可编辑</p>
        </div>

        <!-- Cookie（可编辑） -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            Cookie
            <span class="text-red-500">*</span>
          </label>
          <Textarea
            v-model="editForm.cookie"
            placeholder="请输入或粘贴 Cookie"
            class="min-h-[120px]"
            :class="formErrors.cookie ? 'border-red-500' : ''"
          />
          <p v-if="formErrors.cookie" class="text-xs text-red-500">
            {{ formErrors.cookie }}
          </p>
          <p v-else-if="editForm.csrfToken" class="text-xs text-green-600">
            ✓ 已成功提取 csrfToken
          </p>
          <p v-else class="text-xs text-muted-foreground">💡 csrfToken 会自动从 Cookie 中提取</p>
        </div>

        <!-- 备注（可编辑） -->
        <div class="space-y-2">
          <label class="text-sm font-medium">备注</label>
          <Textarea
            v-model="editForm.remark"
            placeholder="请输入备注信息（选填）"
            class="min-h-[80px]"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="mt-6 flex justify-end gap-2">
        <Button variant="outline" @click="close">取消</Button>
        <Button :disabled="!hasChanges" @click="handleSave">保存</Button>
      </div>
    </div>
  </Drawer>
</template>
