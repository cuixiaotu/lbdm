# 故障排查指南

## IPC 通信相关问题

### 错误：An object could not be cloned

#### 问题描述

在保存配置时，控制台出现错误：

```
Error: An object could not be cloned
```

#### 问题原因

当通过 Electron IPC 发送数据时，数据会经过结构化克隆算法（Structured Clone Algorithm）进行序列化。Vue 3 的响应式对象（通过 `ref`、`reactive` 创建）包含了内部的响应式属性（如 Proxy、Symbol 等），这些属性无法被序列化，导致克隆失败。

**触发场景：**

- 直接将 Vue 响应式对象发送给主进程
- 对象中包含函数、DOM 节点、Symbol 等不可克隆的值
- 对象中存在循环引用

#### 解决方案

**方案 1：使用 Vue 的 `toRaw()` 方法（推荐）**

```typescript
import { toRaw } from 'vue'

// ❌ 错误：直接发送响应式对象
await window.api.config.save(config.value)

// ✅ 正确：使用 toRaw 转换为纯对象
const rawConfig = toRaw(config.value)
await window.api.config.save(rawConfig)
```

**方案 2：使用深拷贝**

```typescript
// 使用 JSON 序列化（简单但会丢失特殊类型）
const plainConfig = JSON.parse(JSON.stringify(config.value))
await window.api.config.save(plainConfig)
```

**方案 3：手动构造纯对象**

```typescript
const plainConfig = {
  api: {
    apiUrl: config.value.api.apiUrl,
    testApi: config.value.api.testApi
  },
  ssh: {
    server: config.value.ssh.server,
    port: config.value.ssh.port,
    user: config.value.ssh.user,
    password: config.value.ssh.password,
    useSshKey: config.value.ssh.useSshKey,
    privateKey: config.value.ssh.privateKey
  }
}
await window.api.config.save(plainConfig)
```

#### 最佳实践

1. **发送数据前转换**
   - 所有通过 IPC 发送的 Vue 响应式对象都应该先用 `toRaw()` 转换
   - 或者在 Store 层统一处理转换

2. **Store 层封装**

   ```typescript
   // src/renderer/src/stores/config.ts
   static async save(config: SystemConfig): Promise<void> {
     try {
       // 在 Store 层统一处理转换，调用方无需关心
       const rawConfig = toRaw(config)
       await window.api.config.save(rawConfig)
     } catch (error) {
       console.error('保存配置失败:', error)
       throw new Error('保存配置失败')
     }
   }
   ```

3. **类型安全**
   - 确保 IPC 类型定义与实际传输的数据结构一致
   - 使用 TypeScript 严格模式检查类型

#### 相关链接

- [Vue 3 - toRaw()](https://vuejs.org/api/reactivity-advanced.html#toraw)
- [MDN - Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
- [Electron - IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)

---

## 配置管理相关问题

### 配置文件路径

**问题：找不到配置文件**

配置文件存储在 Electron 的用户数据目录：

- **Windows**: `%APPDATA%/<app-name>/config.json`
- **macOS**: `~/Library/Application Support/<app-name>/config.json`
- **Linux**: `~/.config/<app-name>/config.json`

可以通过以下方式获取路径：

```typescript
const configPath = await window.api.config.getPath()
console.log('配置文件路径:', configPath)
```

### 配置重置

**问题：配置损坏或需要恢复默认值**

使用重置功能：

```typescript
const defaultConfig = await ConfigStore.reset()
```

这会：

1. 将配置恢复为默认值
2. 重新写入配置文件
3. 返回默认配置对象

---

## 文件对话框相关问题

### 文件路径为空

**问题：选择文件后路径为 null**

可能的原因：

1. 用户点击了"取消"按钮
2. 对话框权限不足（macOS/Linux）
3. 默认路径不存在

**解决方案：**

```typescript
const filePath = await window.api.dialog.openFile({
  title: '选择文件',
  defaultPath: '~/.ssh', // 确保路径存在或使用 os.homedir()
  filters: [{ name: 'All Files', extensions: ['*'] }]
})

if (filePath) {
  // 用户选择了文件
  config.value.ssh.privateKey = filePath
} else {
  // 用户取消了选择
  console.log('用户取消了文件选择')
}
```

---

## 表单验证相关问题

### 验证不触发

**问题：点击保存按钮后验证没有生效**

检查以下几点：

1. 验证函数是否正确调用
2. 错误状态是否正确绑定到输入框
3. 清除错误的逻辑是否正确

**示例：**

```vue
<script setup lang="ts">
const errors = ref({
  apiUrl: ''
})

const validateApiUrl = (): boolean => {
  if (!config.value.api.apiUrl.trim()) {
    errors.value.apiUrl = '接口地址为必填项'
    return false
  }
  errors.value.apiUrl = ''
  return true
}

const saveConfig = async () => {
  // 先验证
  if (!validateApiUrl()) {
    return
  }

  // 再保存
  await ConfigStore.save(toRaw(config.value))
}
</script>

<template>
  <Input
    v-model="config.api.apiUrl"
    :class="errors.apiUrl ? 'border-red-500' : ''"
    @input="errors.apiUrl = ''"
  />
  <p v-if="errors.apiUrl" class="text-xs text-red-500">
    {{ errors.apiUrl }}
  </p>
</template>
```

### 条件验证不生效

**问题：SSH 条件验证没有按预期工作**

确保验证逻辑正确：

```typescript
const validateSshConfig = (): boolean => {
  // 先清空错误
  errors.value.sshPort = ''
  errors.value.sshUser = ''
  errors.value.sshAuth = ''

  const server = config.value.ssh.server.trim()

  // 如果没有填写 server，不验证其他字段
  if (!server) {
    return true
  }

  // 填写了 server，验证其他字段
  let isValid = true

  if (!config.value.ssh.port || config.value.ssh.port <= 0) {
    errors.value.sshPort = 'Port 为必填项'
    isValid = false
  }

  // ... 其他验证

  return isValid
}
```

---

## 开发环境问题

### 热重载失败

**问题：修改代码后页面没有自动刷新**

1. 检查 Vite 开发服务器是否正常运行
2. 清除缓存重启：
   ```bash
   pnpm dev
   ```

### 类型检查错误

**问题：TypeScript 报错但功能正常**

1. 重新生成类型定义：

   ```bash
   pnpm type-check
   ```

2. 重启 TypeScript 服务器（VS Code）：
   - `Cmd/Ctrl + Shift + P`
   - 输入 "TypeScript: Restart TS Server"

---

## 性能优化

### 配置保存慢

**问题：保存配置需要很长时间**

可能的优化：

1. 减少不必要的验证逻辑
2. 使用防抖（debounce）避免频繁保存
3. 检查配置文件大小

```typescript
import { debounce } from 'lodash-es'

const debouncedSave = debounce(async () => {
  await ConfigStore.save(toRaw(config.value))
}, 500)
```

---

## 常见错误信息

| 错误信息                                  | 原因                     | 解决方案                             |
| ----------------------------------------- | ------------------------ | ------------------------------------ |
| `An object could not be cloned`           | IPC 传输的对象无法序列化 | 使用 `toRaw()` 转换响应式对象        |
| `Cannot read property 'xxx' of undefined` | 配置对象结构不完整       | 检查默认配置，确保所有字段都有初始值 |
| `ENOENT: no such file or directory`       | 配置文件或路径不存在     | 检查文件路径，确保父目录存在         |
| `Permission denied`                       | 文件权限不足             | 检查文件权限，确保应用有读写权限     |

---

**更新日期**: 2025-10-23
**维护者**: 开发团队
**状态**: ✅ 持续更新
