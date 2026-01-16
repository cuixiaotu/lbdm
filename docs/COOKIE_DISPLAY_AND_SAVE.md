# Cookie 回显与按钮状态切换

## 概述

在获取到登录 Cookie 后，将 Cookie 回显到账户添加抽屉中的 Textarea，并将"开始登录"按钮切换为"保存"按钮。

## 实现内容

### 1. 新增 Textarea 组件

**文件**: `src/renderer/src/components/ui/textarea/Textarea.vue`

创建了 Textarea 组件，支持以下属性：

- `modelValue` - v-model 绑定
- `placeholder` - 占位符
- `rows` - 行数
- `readonly` - 只读模式
- `disabled` - 禁用状态

### 2. AccountAdd 组件修改

**文件**: `src/renderer/src/components/AccountAdd.vue`

#### 2.1 状态管理

```typescript
// 添加 Cookie 字段
const newAccount = ref({
  username: '',
  password: '',
  cookie: '' // 新增
})

// 登录状态
const isLoggedIn = ref(false)
```

#### 2.2 按钮文本计算

```typescript
const buttonText = computed(() => {
  return isLoggedIn.value ? '保存' : '开始登录'
})
```

#### 2.3 登录流程修改

```typescript
if (result.success && result.cookie) {
  // 将 Cookie 回显到表单
  newAccount.value.cookie = result.cookie
  isLoggedIn.value = true
  // 不再立即关闭抽屉，等待用户点击保存
}
```

#### 2.4 新增保存功能

```typescript
const handleSaveAccount = async (): Promise<void> => {
  // TODO: 调用主进程保存账户（带上 Cookie）
  console.log('保存账户:', newAccount.value)

  // 显示成功提示
  await window.api.dialog.showMessage({
    type: 'success',
    title: '成功',
    message: `账户 ${newAccount.value.username} 添加成功！`
  })

  // 关闭抽屉
  isDrawerOpen.value = false
}
```

#### 2.5 按钮点击处理

```typescript
const handleButtonClick = async (): Promise<void> => {
  if (isLoggedIn.value) {
    // 已登录，执行保存
    await handleSaveAccount()
  } else {
    // 未登录，执行登录
    await handleStartLogin()
  }
}
```

### 3. UI 展示

#### 3.1 Cookie 回显区域

```vue
<!-- 仅在已登录状态显示 -->
<div v-if="isLoggedIn" class="space-y-2">
  <label class="text-sm font-medium leading-none">Cookie</label>
  <Textarea
    v-model="newAccount.cookie"
    placeholder="Cookie 将在登录成功后显示"
    rows="6"
    class="font-mono text-xs"
    readonly
  />
  <p class="text-xs text-muted-foreground">
    ✓ Cookie 获取成功，请点击保存按钮完成账户添加
  </p>
</div>
```

#### 3.2 表单输入禁用

登录成功后，用户名和密码输入框自动禁用：

```vue
<Input v-model="newAccount.username" :disabled="isLoggedIn" ... />

<Input v-model="newAccount.password" :disabled="isLoggedIn" ... />
```

#### 3.3 按钮文本动态切换

```vue
<Button @click="handleButtonClick">
  {{ buttonText }}  <!-- "开始登录" 或 "保存" -->
</Button>
```

## 用户流程

1. **打开抽屉** → 输入用户名和密码 → 点击"开始登录"
2. **登录窗口打开** → 自动填充表单 → 获取 Cookie
3. **Cookie 回显** → Textarea 显示 Cookie → 用户名/密码禁用 → 按钮变为"保存"
4. **点击保存** → 账户添加成功 → 抽屉关闭

## 待完成事项

- [ ] 实现账户保存到主进程（IPC 调用）
- [ ] 通知父组件刷新账户列表
- [ ] 添加账户持久化存储

## 相关文件

- `src/renderer/src/components/AccountAdd.vue` - 账户添加组件
- `src/renderer/src/components/ui/textarea/Textarea.vue` - Textarea 组件
- `src/main/services/loginWindowService.ts` - 登录窗口服务
