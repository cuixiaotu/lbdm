<script setup lang="ts">
import { ref, onMounted, defineExpose, computed, defineEmits, watch } from 'vue'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { SystemConfig } from '../../../shared/ipc/types'
import { showDialog } from '@/composables/useDialog'
import { showSuccess, showWarning } from '@/composables/useToast'
import { useAccountLogin } from '@/composables/useAccountLogin'

// 定义事件
const emit = defineEmits<{
  saved: []
}>()

// 抽屉状态
const isDrawerOpen = ref(false)

// 添加账户表单
const newAccount = ref({
  accountName: '',
  username: '',
  password: '',
  organizationId: '',
  cookie: '',
  csrfToken: '',
  remark: ''
})

const formErrors = ref({
  accountName: '',
  username: '',
  password: '',
  organizationId: ''
})

// 系统配置
const config = ref<SystemConfig | null>(null)

// 登录状态：false 表示未登录，true 表示已获取 Cookie
const isLoggedIn = ref(false)

// 使用登录 composable
const { loadConfig: loadLoginConfig, executeLogin } = useAccountLogin()

// 加载配置
onMounted(async () => {
  config.value = await window.api.config.get()
  await loadLoginConfig()
})

/**
 * 监听 cookie 变化，自动提取 csrfToken
 */
watch(
  () => newAccount.value.cookie,
  (newCookie) => {
    if (newCookie) {
      newAccount.value.csrfToken = extractCsrfToken(newCookie)
    } else {
      newAccount.value.csrfToken = ''
    }
  }
)

/**
 * 打开抽屉
 */
const open = (): void => {
  // 清空表单
  newAccount.value = {
    accountName: '',
    username: '',
    password: '',
    organizationId: '',
    cookie: '',
    csrfToken: '',
    remark: ''
  }
  formErrors.value = {
    accountName: '',
    username: '',
    password: '',
    organizationId: ''
  }
  isLoggedIn.value = false
  isDrawerOpen.value = true
}

/**
 * 关闭抽屉
 */
const close = (): void => {
  isDrawerOpen.value = false
}

/**
 * 验证表单
 */
const validateForm = (): boolean => {
  let isValid = true
  formErrors.value = {
    accountName: '',
    username: '',
    password: '',
    organizationId: ''
  }

  if (!newAccount.value.accountName.trim()) {
    formErrors.value.accountName = '账户名称为必填项'
    isValid = false
  }

  if (!newAccount.value.username.trim()) {
    formErrors.value.username = '用户名为必填项'
    isValid = false
  }

  if (!newAccount.value.password.trim()) {
    formErrors.value.password = '密码为必填项'
    isValid = false
  }

  if (!newAccount.value.organizationId.trim()) {
    formErrors.value.organizationId = '管家账号（组织ID）为必填项'
    isValid = false
  }

  return isValid
}

// 计算按钮文本
const buttonText = computed(() => {
  return isLoggedIn.value ? '保存' : '开始登录'
})

/**
 * 从 Cookie 字符串中提取 csrftoken
 */
const extractCsrfToken = (cookieString: string): string => {
  const match = cookieString.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ''
}

/**
 * 开始登录流程
 */
const handleStartLogin = async (): Promise<void> => {
  if (!validateForm()) {
    return
  }

  try {
    console.log('开始登录流程:', newAccount.value)

    // 使用 composable 执行登录
    const result = await executeLogin({
      username: newAccount.value.username,
      password: newAccount.value.password,
      organizationId: newAccount.value.organizationId
    })

    if (result.success && result.cookie && result.csrfToken) {
      console.log('登录成功，获取到 Cookie')

      showSuccess(`账户 ${newAccount.value.accountName} 凭证获取成功`)

      // 将 Cookie 和 csrfToken 回显到表单
      newAccount.value.cookie = result.cookie
      newAccount.value.csrfToken = result.csrfToken

      // 设置为已登录状态
      isLoggedIn.value = true
    } else {
      // 登录失败，重置状态
      newAccount.value.cookie = ''
      newAccount.value.csrfToken = ''
      isLoggedIn.value = false
    }
  } catch (error) {
    console.error('登录失败:', error)
    // 重置状态
    newAccount.value.cookie = ''
    newAccount.value.csrfToken = ''
    isLoggedIn.value = false
  }
}

/**
 * 保存账户
 */
const handleSaveAccount = async (): Promise<void> => {
  try {
    // 调用主进程保存账户（带上 Cookie 和 csrfToken）
    console.log('保存账户:', newAccount.value)

    const result = await window.api.account.add({
      accountName: newAccount.value.accountName,
      username: newAccount.value.username,
      password: newAccount.value.password,
      organizationId: newAccount.value.organizationId,
      cookie: newAccount.value.cookie,
      csrfToken: newAccount.value.csrfToken,
      remark: newAccount.value.remark
    })

    if (result.success) {
      // 账户添加成功，验证凭证有效性
      console.log(`账户 ${result.id} 添加成功，开始验证凭证...`)

      const validationResult = await window.api.account.validateCredentials(result.id!)

      if (!validationResult.success) {
        showWarning(
          `账户 ${newAccount.value.accountName} 添加成功，但无法验证凭证，请稍后手动验证或重新登录`
        )
      } else if (!validationResult.isValid) {
        showWarning(
          `账户 ${newAccount.value.accountName} 添加成功，但凭证已失效，请使用“重新验证”功能获取新凭证`
        )
      } else {
        showSuccess(`账户 ${newAccount.value.accountName} 添加成功，凭证状态有效！`)
      }

      // 关闭抽屉
      isDrawerOpen.value = false

      // 通知父组件刷新列表
      emit('saved')
    } else {
      await showDialog({
        type: 'error',
        title: '错误',
        message: '保存账户失败',
        detail: result.error || '请重试'
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
  }
}

/**
 * 处理按钮点击
 */
const handleButtonClick = async (): Promise<void> => {
  if (isLoggedIn.value) {
    // 已登录，执行保存
    await handleSaveAccount()
  } else {
    // 未登录，执行登录
    await handleStartLogin()
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
      <h2 class="text-2xl font-bold mb-6">添加账户</h2>

      <div class="space-y-4">
        <!-- 账户名称 -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            账户名称
            <span class="text-red-500">*</span>
          </label>
          <Input
            v-model="newAccount.accountName"
            placeholder="请输入账户名称"
            :class="formErrors.accountName ? 'border-red-500' : ''"
          />
          <p v-if="formErrors.accountName" class="text-xs text-red-500">
            {{ formErrors.accountName }}
          </p>
        </div>

        <!-- 用户名 -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            用户名
            <span class="text-red-500">*</span>
          </label>
          <Input
            v-model="newAccount.username"
            placeholder="请输入用户名"
            :class="formErrors.username ? 'border-red-500' : ''"
          />
          <p v-if="formErrors.username" class="text-xs text-red-500">
            {{ formErrors.username }}
          </p>
        </div>

        <!-- 密码 -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            密码
            <span class="text-red-500">*</span>
          </label>
          <Input
            v-model="newAccount.password"
            type="password"
            placeholder="请输入密码"
            :class="formErrors.password ? 'border-red-500' : ''"
          />
          <p v-if="formErrors.password" class="text-xs text-red-500">
            {{ formErrors.password }}
          </p>
        </div>

        <!-- 管家账号（组织ID） -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            管家账号（组织ID）
            <span class="text-red-500">*</span>
          </label>
          <Input
            v-model="newAccount.organizationId"
            placeholder="请输入组织ID"
            :class="formErrors.organizationId ? 'border-red-500' : ''"
          />
          <p v-if="formErrors.organizationId" class="text-xs text-red-500">
            {{ formErrors.organizationId }}
          </p>
        </div>

        <!-- Cookie（可编辑） -->
        <div v-if="isLoggedIn" class="space-y-2">
          <label class="text-sm font-medium">Cookie</label>
          <Textarea
            v-model="newAccount.cookie"
            placeholder="Cookie 将在登录后自动填充，也可以手动编辑"
            class="min-h-[100px]"
          />
          <p v-if="newAccount.csrfToken" class="text-xs text-green-600">✓ 已成功提取 csrfToken</p>
          <p v-else class="text-xs text-amber-600">⚠️ 未能提取 csrfToken，请检查 Cookie 格式</p>
        </div>

        <!-- 备注 -->
        <div class="space-y-2">
          <label class="text-sm font-medium">备注</label>
          <Textarea
            v-model="newAccount.remark"
            placeholder="请输入备注信息（选填）"
            class="min-h-[80px]"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="mt-6 flex justify-end gap-2">
        <Button variant="outline" @click="close">取消</Button>
        <Button @click="handleButtonClick">{{ buttonText }}</Button>
      </div>
    </div>
  </Drawer>
</template>
