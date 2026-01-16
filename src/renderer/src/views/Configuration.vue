<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import Switch from '@/components/ui/switch/Switch.vue'
import { Save, RotateCw, TestTube2, Upload, FileText, X } from 'lucide-vue-next'
import type { SystemConfig } from '../../../shared/ipc/types'
import CodeEditor from '@/components/CodeEditor.vue'
import { showDialog } from '@/composables/useDialog'
import { showSuccess, showError, showWarning } from '@/composables/useToast'

const config = ref<SystemConfig>({
  database: { host: '', port: 3306, user: '', password: '', database: '' },
  ssh: { server: '', port: 22, user: '', password: '', useSshKey: false, privateKey: '' },
  account: { loginUrl: '', defaultScript: '' },
  monitor: { interval: 60 }, // 默认60秒
  debug: { enableNetworkDebug: false, enableSqlDebug: false } // 默认关闭网络调试
})
const isSaving = ref(false)
const isTesting = ref(false)
const configPath = ref('')
const privateKeyInputMode = ref<'text' | 'file'>('text') // 私钥输入模式
const isTestPassed = ref(false) // 测试是否通过
const errors = ref({
  dbHost: '',
  dbPort: '',
  dbUser: '',
  dbPassword: '',
  dbDatabase: '',
  sshServer: '',
  sshPort: '',
  sshUser: '',
  sshAuth: '' // password 或 ssh key 验证错误
})

// 监听数据库和SSH配置变化，修改后需要重新测试
// 注意：账户配置、监控配置、调试配置的修改不需要重新测试
watch(
  () => [config.value.database, config.value.ssh],
  () => {
    isTestPassed.value = false
  },
  { deep: true }
)

// 验证函数
const validateDatabaseConfig = (): boolean => {
  let isValid = true

  // 清空错误
  errors.value.dbHost = ''
  errors.value.dbPort = ''
  errors.value.dbUser = ''
  errors.value.dbPassword = ''
  errors.value.dbDatabase = ''

  // 验证 Host
  if (!config.value.database.host.trim()) {
    errors.value.dbHost = 'Host/IP为必填项'
    isValid = false
  }

  // 验证 Port
  if (!config.value.database.port || config.value.database.port <= 0) {
    errors.value.dbPort = 'Port为必填项'
    isValid = false
  }

  // 验证 User
  if (!config.value.database.user.trim()) {
    errors.value.dbUser = '用户名为必填项'
    isValid = false
  }

  // 验证 Password
  if (!config.value.database.password.trim()) {
    errors.value.dbPassword = '密码为必填项'
    isValid = false
  }

  // 验证 Database
  if (!config.value.database.database.trim()) {
    errors.value.dbDatabase = '数据库名为必填项'
    isValid = false
  }

  return isValid
}

// SSH 配置验证：如果填写了 server，则其他字段必填
const validateSshConfig = (): boolean => {
  // 清空 SSH 错误
  errors.value.sshServer = ''
  errors.value.sshPort = ''
  errors.value.sshUser = ''
  errors.value.sshAuth = ''

  const server = config.value.ssh.server.trim()

  // 如果没有填写 server，则不验证 SSH 配置
  if (!server) {
    return true
  }

  let isValid = true

  // 验证 Port
  if (!config.value.ssh.port || config.value.ssh.port <= 0) {
    errors.value.sshPort = 'Port 为必填项'
    isValid = false
  }

  // 验证 User
  if (!config.value.ssh.user.trim()) {
    errors.value.sshUser = 'User 为必填项'
    isValid = false
  }

  // 验证认证方式：Password 或 SSH Key 至少填写一个
  const hasPassword = config.value.ssh.password.trim().length > 0
  const hasSshKey =
    config.value.ssh.useSshKey && (config.value.ssh.privateKey?.trim() || '').length > 0

  if (!hasPassword && !hasSshKey) {
    errors.value.sshAuth = 'Password 或 SSH Key 至少填写一个'
    isValid = false
  }

  return isValid
}

const clearError = (
  field:
    | 'dbHost'
    | 'dbPort'
    | 'dbUser'
    | 'dbPassword'
    | 'dbDatabase'
    | 'sshServer'
    | 'sshPort'
    | 'sshUser'
    | 'sshAuth'
): void => {
  errors.value[field] = ''
}

// 加载配置
onMounted(async () => {
  config.value = await window.api.config.get()
  configPath.value = await window.api.config.getPath()
  // 初始加载时需要测试
  isTestPassed.value = false
})

// 保存配置
const saveConfig = async (): Promise<void> => {
  try {
    isSaving.value = true

    // 验证数据库配置（必填）
    if (!validateDatabaseConfig()) {
      showWarning('请填写必填项')
      return
    }

    // 验证 SSH 配置（如果填写了 server）
    if (!validateSshConfig()) {
      showWarning('请完善 SSH 配置信息')
      return
    }

    // 如果数据库/SSH配置被修改过，需要先测试连接
    if (!isTestPassed.value) {
      showWarning('数据库配置已修改，请先测试连接成功后再保存配置')
      return
    }

    // 将Vue响应式对象转换为普通对象，避免IPC克隆错误
    const plainConfig: SystemConfig = {
      database: {
        host: config.value.database.host,
        port: config.value.database.port,
        user: config.value.database.user,
        password: config.value.database.password,
        database: config.value.database.database
      },
      ssh: {
        server: config.value.ssh.server,
        port: config.value.ssh.port,
        user: config.value.ssh.user,
        password: config.value.ssh.password,
        useSshKey: config.value.ssh.useSshKey,
        privateKey: config.value.ssh.privateKey
      },
      account: {
        loginUrl: config.value.account.loginUrl,
        defaultScript: config.value.account.defaultScript
      },
      monitor: {
        interval: config.value.monitor.interval
      },
      debug: {
        enableNetworkDebug: config.value.debug.enableNetworkDebug,
        enableSqlDebug: config.value.debug.enableSqlDebug
      }
    }

    // 直接保存配置
    await window.api.config.save(plainConfig)

    showSuccess('配置保存成功！')
  } catch (error) {
    showError('配置保存失败，请重试')
    console.error('保存配置失败:', error)
  } finally {
    isSaving.value = false
  }
}

// 测试连接
const testConnection = async (): Promise<void> => {
  try {
    isTesting.value = true

    // 1. 验证数据库配置（点击测试按钮时必填）
    if (!validateDatabaseConfig()) {
      showWarning('请填写数据库配置')
      return
    }

    // 2. 如果配置了SSH，验证SSH配置
    if (config.value.ssh.server.trim()) {
      if (!validateSshConfig()) {
        showWarning('请完善 SSH 配置信息')
        return
      }
    }

    console.log('测试连接配置:', config.value)

    // 3. 调用主进程测试连接（传递当前表单配置）
    // 重要：将Vue响应式对象转换为普通对象，避免IPC克隆错误
    const plainConfig: SystemConfig = {
      database: {
        host: config.value.database.host,
        port: config.value.database.port,
        user: config.value.database.user,
        password: config.value.database.password,
        database: config.value.database.database
      },
      ssh: {
        server: config.value.ssh.server,
        port: config.value.ssh.port,
        user: config.value.ssh.user,
        password: config.value.ssh.password,
        useSshKey: config.value.ssh.useSshKey,
        privateKey: config.value.ssh.privateKey
      },
      account: {
        loginUrl: config.value.account.loginUrl,
        defaultScript: config.value.account.defaultScript
      },
      monitor: {
        interval: config.value.monitor.interval
      },
      debug: {
        enableNetworkDebug: config.value.debug.enableNetworkDebug,
        enableSqlDebug: config.value.debug.enableSqlDebug
      }
    }

    const result = await window.api.config.testConnection(plainConfig)

    // 4. 显示结果
    if (result.success) {
      // 测试成功，设置状态为通过
      isTestPassed.value = true

      await showDialog({
        type: 'success',
        title: '连接成功',
        message: `数据库连接测试成功！`,
        detail: [
          `响应状态: ${result.statusCode || 200}`,
          `响应时间: ${result.responseTime}ms`,
          result.usedSsh ? '使用 SSH 隧道' : '直接连接',
          result.details || ''
        ]
          .filter(Boolean)
          .join('\n')
      })
    } else {
      // 测试失败，状态仍然为false
      isTestPassed.value = false

      await showDialog({
        type: 'error',
        title: '连接失败',
        message: result.error || '数据库连接测试失败',
        detail: [
          result.details,
          result.responseTime ? `耗时: ${result.responseTime}ms` : '',
          result.usedSsh ? '尝试使用了 SSH 隧道' : ''
        ]
          .filter(Boolean)
          .join('\n')
      })
    }
  } catch (error) {
    showError('测试连接失败')
    console.error('测试连接失败:', error)
  } finally {
    isTesting.value = false
  }
}

// 重置配置
const resetConfig = async (): Promise<void> => {
  // 使用对话框确认
  const result = await showDialog({
    type: 'warning',
    title: '确认重置',
    message: '确定要重置所有配置吗？',
    detail: '此操作将清除所有自定义设置，恢复为默认值。',
    buttons: ['取消', '确定'],
    defaultId: 0,
    cancelId: 0
  })

  // 如果用户点击了"确定"（索引 1）
  if (result && result.response === 1) {
    // 重置为默认配置
    config.value = {
      database: { host: '', port: 3306, user: '', password: '', database: '' },
      ssh: { server: '', port: 22, user: '', password: '', useSshKey: false, privateKey: '' },
      account: { loginUrl: '', defaultScript: '' },
      monitor: { interval: 30 },
      debug: { enableNetworkDebug: false, enableSqlDebug: false }
    }
    // 重置后需要重新测试
    isTestPassed.value = false
    showSuccess('配置已重置为默认值')
  }
}

// 选择私钥文件（使用 Electron 原生对话框）
const selectPrivateKeyFile = async (): Promise<void> => {
  try {
    const filePath = await window.api.dialog.openFile({
      title: '选择 SSH 私钥文件',
      buttonLabel: '选择',
      defaultPath: '~/.ssh'
    })

    if (filePath) {
      config.value.ssh.privateKey = filePath
      privateKeyInputMode.value = 'file'
    }
  } catch (error) {
    console.error('选择文件失败:', error)
    // 降级到浏览器文件选择
    fallbackFileSelection()
  }
}

// 降级方案：使用浏览器文件选择（开发环境或 API 不可用时）
const fallbackFileSelection = (): void => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pem,.key,.ppk,*'
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      // 浏览器环境只能获取文件名
      const path = (file as File & { path?: string }).path || file.name
      config.value.ssh.privateKey = path
      privateKeyInputMode.value = 'file'
    }
  }
  input.click()
}

// 切换到文本输入模式
const switchToTextMode = (): void => {
  privateKeyInputMode.value = 'text'
  config.value.ssh.privateKey = ''
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 固定头部 -->
    <div class="flex-shrink-0 mb-6 flex items-center justify-between">
      <div>
        <h2 class="text-3xl font-bold text-foreground">系统设置</h2>
        <p class="text-muted-foreground mt-2">配置系统参数和选项</p>
      </div>
      <div v-if="configPath" class="text-xs text-muted-foreground">
        <p>配置文件：{{ configPath }}</p>
      </div>
    </div>

    <!-- 可滚动内容区域 -->
    <div class="flex-1 overflow-y-auto pr-2">
      <div class="max-w-4xl space-y-6 pb-6">
        <!-- 数据库配置 -->
        <Card>
          <CardHeader>
            <CardTitle>远程数据库连接配置</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Host/IP 和 Port -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-2 md:col-span-2">
                <label class="text-sm font-medium leading-none">
                  Host/IP
                  <span class="text-red-500 ml-1">*</span>
                </label>
                <Input
                  v-model="config.database.host"
                  type="text"
                  placeholder="请输入数据库主机地址，例如：127.0.0.1"
                  :class="errors.dbHost ? 'border-red-500' : ''"
                  @input="clearError('dbHost')"
                />
                <p v-if="errors.dbHost" class="text-xs text-red-500 mt-1">
                  {{ errors.dbHost }}
                </p>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium leading-none">
                  Port
                  <span class="text-red-500 ml-1">*</span>
                </label>
                <Input
                  v-model.number="config.database.port"
                  type="number"
                  placeholder="3306"
                  :class="errors.dbPort ? 'border-red-500' : ''"
                  @input="clearError('dbPort')"
                />
                <p v-if="errors.dbPort" class="text-xs text-red-500 mt-1">
                  {{ errors.dbPort }}
                </p>
              </div>
            </div>

            <!-- User -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                User
                <span class="text-red-500 ml-1">*</span>
              </label>
              <Input
                v-model="config.database.user"
                type="text"
                placeholder="请输入数据库用户名"
                :class="errors.dbUser ? 'border-red-500' : ''"
                @input="clearError('dbUser')"
              />
              <p v-if="errors.dbUser" class="text-xs text-red-500 mt-1">
                {{ errors.dbUser }}
              </p>
            </div>

            <!-- Password -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                Password
                <span class="text-red-500 ml-1">*</span>
              </label>
              <Input
                v-model="config.database.password"
                type="password"
                placeholder="请输入数据库密码"
                :class="errors.dbPassword ? 'border-red-500' : ''"
                @input="clearError('dbPassword')"
              />
              <p v-if="errors.dbPassword" class="text-xs text-red-500 mt-1">
                {{ errors.dbPassword }}
              </p>
            </div>

            <!-- Database -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                Database
                <span class="text-red-500 ml-1">*</span>
              </label>
              <Input
                v-model="config.database.database"
                type="text"
                placeholder="请输入数据库名称"
                :class="errors.dbDatabase ? 'border-red-500' : ''"
                @input="clearError('dbDatabase')"
              />
              <p v-if="errors.dbDatabase" class="text-xs text-red-500 mt-1">
                {{ errors.dbDatabase }}
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- SSH配置 -->
        <Card>
          <CardHeader>
            <CardTitle>SSH 配置</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Server & Port -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-2 md:col-span-2">
                <label class="text-sm font-medium leading-none">
                  Server 地址
                  <span v-if="config.ssh.server.trim()" class="text-orange-500 ml-1 text-xs">
                    (填写后其他字段必填)
                  </span>
                </label>
                <Input
                  v-model="config.ssh.server"
                  type="text"
                  placeholder="例如：192.168.1.1 或 example.com"
                  :class="errors.sshServer ? 'border-red-500' : ''"
                  @input="clearError('sshServer')"
                />
                <p v-if="errors.sshServer" class="text-xs text-red-500 mt-1">
                  {{ errors.sshServer }}
                </p>
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium leading-none">
                  Port
                  <span v-if="config.ssh.server.trim()" class="text-red-500 ml-1">*</span>
                </label>
                <Input
                  v-model.number="config.ssh.port"
                  type="number"
                  placeholder="22"
                  :class="errors.sshPort ? 'border-red-500' : ''"
                  @input="clearError('sshPort')"
                />
                <p v-if="errors.sshPort" class="text-xs text-red-500 mt-1">
                  {{ errors.sshPort }}
                </p>
              </div>
            </div>

            <!-- User -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                User
                <span v-if="config.ssh.server.trim()" class="text-red-500 ml-1">*</span>
              </label>
              <Input
                v-model="config.ssh.user"
                type="text"
                placeholder="请输入用户名"
                :class="errors.sshUser ? 'border-red-500' : ''"
                @input="clearError('sshUser')"
              />
              <p v-if="errors.sshUser" class="text-xs text-red-500 mt-1">
                {{ errors.sshUser }}
              </p>
            </div>

            <!-- Password -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                Password
                <span
                  v-if="config.ssh.server.trim() && !config.ssh.useSshKey"
                  class="text-red-500 ml-1"
                >
                  *
                </span>
              </label>

              <Input
                v-model="config.ssh.password"
                type="password"
                placeholder="请输入密码"
                :disabled="config.ssh.useSshKey"
                :class="errors.sshAuth && !config.ssh.useSshKey ? 'border-red-500' : ''"
                @input="clearError('sshAuth')"
              />
            </div>

            <!-- Use SSH Key -->
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <Checkbox id="use-ssh-key" v-model="config.ssh.useSshKey" />
                <label
                  for="use-ssh-key"
                  class="text-sm font-medium leading-none cursor-pointer"
                  @click="config.ssh.useSshKey = !config.ssh.useSshKey"
                >
                  Use SSH key
                </label>
              </div>
              <!-- 认证错误提示 -->
              <p v-if="errors.sshAuth" class="text-xs text-red-500 mt-1">
                {{ errors.sshAuth }}
              </p>
            </div>

            <!-- SSH Private Key -->
            <div v-if="config.ssh.useSshKey" class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium leading-none">
                  SSH 私钥
                  <span v-if="config.ssh.server.trim()" class="text-red-500 ml-1">*</span>
                </label>
                <div class="flex gap-2">
                  <Button
                    v-if="privateKeyInputMode === 'text'"
                    variant="outline"
                    size="sm"
                    class="gap-2 h-8"
                    @click="selectPrivateKeyFile"
                  >
                    <Upload class="w-3 h-3" />
                    选择文件
                  </Button>
                  <Button
                    v-if="privateKeyInputMode === 'file'"
                    variant="outline"
                    size="sm"
                    class="gap-2 h-8"
                    @click="switchToTextMode"
                  >
                    <FileText class="w-3 h-3" />
                    手动输入
                  </Button>
                </div>
              </div>

              <!-- 文本输入模式 -->
              <div v-if="privateKeyInputMode === 'text'">
                <textarea
                  v-model="config.ssh.privateKey"
                  :class="[
                    'flex min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    errors.sshAuth && config.ssh.useSshKey ? 'border-red-500' : 'border-input'
                  ]"
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;请粘贴您的SSH私钥内容&#10;-----END OPENSSH PRIVATE KEY-----"
                  @input="clearError('sshAuth')"
                />
                <p class="text-xs text-muted-foreground mt-2">
                  直接粘贴私钥内容，或点击"选择文件"指定私钥文件路径
                </p>
              </div>

              <!-- 文件路径模式 -->
              <div v-else class="space-y-2">
                <div class="flex items-center gap-2">
                  <Input
                    v-model="config.ssh.privateKey"
                    type="text"
                    placeholder="私钥文件路径，例如：/Users/username/.ssh/id_rsa"
                    readonly
                    :class="[
                      'flex-1',
                      errors.sshAuth && config.ssh.useSshKey ? 'border-red-500' : ''
                    ]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-10 w-10 p-0"
                    @click="
                      () => {
                        config.ssh.privateKey = ''
                        privateKeyInputMode = 'text'
                      }
                    "
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
                <p class="text-xs text-muted-foreground">
                  已选择文件路径，系统将使用该路径的私钥文件
                </p>
              </div>

              <p class="text-xs text-muted-foreground">
                💡 提示：如果留空，系统将使用 ~/.ssh/config 中的默认配置
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- 账户配置 -->
        <Card>
          <CardHeader>
            <CardTitle>账户配置</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                登录地址
                <span class="text-red-500 ml-1">*</span>
              </label>
              <Input
                v-model="config.account.loginUrl"
                type="text"
                placeholder="请输入登录页面地址，例如：https://example.com/login"
              />
              <p class="text-xs text-muted-foreground">添加账户时将使用此地址打开登录窗口</p>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium leading-none"> 默认执行脚本 </label>
              <CodeEditor
                v-model="config.account.defaultScript"
                height="300px"
                theme="dark"
                placeholder="// 自定义JavaScript脚本，在默认自动填充后执行&#10;// 可以使用 waitForElement(selector, timeout) 函数&#10;// 例如：&#10;(async () => {&#10;  try {&#10;    const extraButton = await waitForElement('.extra-button');&#10;    extraButton.click();&#10;  } catch (error) {&#10;    console.error('错误:', error);&#10;  }&#10;})();"
              />
              <p class="text-xs text-muted-foreground">
                💡
                提示：默认已包含填充用户名、密码、勾选协议、点击提交的逻辑，此处只需填写额外的自定义操作
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- 监控配置 -->
        <!-- <Card>
          <CardHeader>
            <CardTitle>监控配置</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                监控频率
                <span class="text-red-500 ml-1">*</span>
              </label>
              <div class="flex items-center gap-3">
                <Input
                  v-model.number="config.monitor.interval"
                  type="number"
                  min="10"
                  max="3600"
                  placeholder="30"
                  class="w-32"
                />
                <span class="text-sm text-muted-foreground">秒</span>
              </div>
              <p class="text-xs text-muted-foreground">
                💡 提示：设置系统自动检查账户凭证有效性的时间间隔，建议设置为 30-300 秒
              </p>
              <p class="text-xs text-amber-600">
                ⚠️ 注意：设置过小可能导致频繁请求，设置过大可能无法及时发现凭证失效
              </p>
            </div>
          </CardContent>
        </Card> -->

        <!-- 调试配置 -->
        <Card>
          <CardHeader>
            <CardTitle>调试配置</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <label class="text-sm font-medium leading-none"> 网络请求调试 </label>
                  <p class="text-xs text-muted-foreground">
                    开启后将在控制台输出所有 API 请求和响应的详细信息
                  </p>
                </div>
                <Switch v-model="config.debug.enableNetworkDebug" />
              </div>
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <label class="text-sm font-medium leading-none"> 数据库调试 </label>
                  <p class="text-xs text-muted-foreground">
                    开启后将在控制台输出所有 数据库 详细信息
                  </p>
                </div>
                <Switch v-model="config.debug.enableSqlDebug" />
              </div>
              <div
                v-if="config.debug.enableNetworkDebug"
                class="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-md border border-amber-200 dark:border-amber-800"
              >
                <p class="text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ 调试模式已开启：所有 API
                  请求和响应将输出到控制台，包括请求头、请求数据、响应码和响应数据。请打开开发者工具（F12）查看调试日志。
                </p>
                <p class="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  💡 提示：调试完成后请关闭此功能，以避免控制台日志过多影响性能。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- 固定底部操作按钮 -->
    <div class="flex-shrink-0 border-t bg-background pt-4 mt-4">
      <div class="max-w-4xl flex items-center justify-between">
        <div>
          <Button variant="outline" class="gap-2" @click="resetConfig">
            <RotateCw class="w-4 h-4" />
            重置配置
          </Button>
        </div>
        <div class="flex flex-col items-end gap-2">
          <!-- 提示信息 -->
          <p v-if="!isTestPassed" class="text-xs text-amber-600">
            ⚠️ 数据库配置已修改，请先测试连接成功后再保存
          </p>
          <p v-else class="text-xs text-green-600">✅ 测试通过，可以保存配置</p>

          <!-- 按钮组 -->
          <div class="flex gap-3">
            <Button variant="outline" class="gap-2" :disabled="isTesting" @click="testConnection">
              <TestTube2 class="w-4 h-4" />
              {{ isTesting ? '测试中...' : '测试连接' }}
            </Button>
            <Button :disabled="isSaving" class="gap-2" @click="saveConfig">
              <Save class="w-4 h-4" />
              {{ isSaving ? '保存中...' : '保存配置' }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
