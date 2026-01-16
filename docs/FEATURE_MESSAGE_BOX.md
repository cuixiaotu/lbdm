# 功能更新：原生消息框

## 更新日期

2025-10-23

## 更新概述

将系统设置页面的保存消息提示从页面内提示改为使用 Electron 原生消息框（Message Box），提供更好的用户体验和桌面应用的原生感觉。

---

## 功能特性

### 1. 原生桌面体验

- ✅ 使用 Electron 的 `dialog.showMessageBox` API
- ✅ 系统原生样式的对话框
- ✅ 模态窗口，确保用户关注消息
- ✅ 支持多种消息类型（info、error、warning、success）

### 2. 消息类型

#### 信息提示（info）

用于一般性信息提示：

```typescript
await window.api.dialog.showMessage({
  type: 'info',
  title: '提示',
  message: '测试连接功能待实现'
})
```

#### 成功提示（success）

用于操作成功反馈：

```typescript
await window.api.dialog.showMessage({
  type: 'success',
  title: '成功',
  message: '配置保存成功！'
})
```

#### 警告提示（warning）

用于警告和验证失败：

```typescript
await window.api.dialog.showMessage({
  type: 'warning',
  title: '验证失败',
  message: '请填写必填项'
})
```

#### 错误提示（error）

用于错误和异常情况：

```typescript
await window.api.dialog.showMessage({
  type: 'error',
  title: '错误',
  message: '配置保存失败',
  detail: '网络连接超时，请稍后重试'
})
```

### 3. 确认对话框

支持多按钮选择，用于确认操作：

```typescript
const result = await window.api.dialog.showMessage({
  type: 'warning',
  title: '确认重置',
  message: '确定要重置所有配置吗？',
  detail: '此操作将清除所有自定义设置，恢复为默认值。',
  buttons: ['取消', '确定'],
  defaultId: 0, // 默认选中"取消"
  cancelId: 0 // ESC键对应"取消"
})

if (result && result.response === 1) {
  // 用户点击了"确定"
}
```

---

## 技术实现

### 架构设计

采用标准的 Electron IPC 三层架构：

```
┌─────────────────────────────────────────────┐
│         渲染进程（Renderer Process）          │
│  Configuration.vue                          │
│  window.api.dialog.showMessage()            │
└─────────────────┬───────────────────────────┘
                  │ IPC
                  │
┌─────────────────▼───────────────────────────┐
│         Preload 层（Context Bridge）         │
│  暴露安全的 API 接口                         │
└─────────────────┬───────────────────────────┘
                  │ IPC
                  │
┌─────────────────▼───────────────────────────┐
│         主进程（Main Process）               │
│  dialog.showMessageBox()                    │
│  原生系统对话框                              │
└─────────────────────────────────────────────┘
```

### 修改文件

#### 1. 类型定义

**文件**: [`src/shared/ipc/types.ts`](../src/shared/ipc/types.ts)

```typescript
/**
 * 消息框类型
 */
export type MessageType = 'info' | 'error' | 'warning' | 'success'

/**
 * 消息框选项
 */
export interface MessageBoxOptions {
  /** 消息类型 */
  type: MessageType
  /** 标题 */
  title?: string
  /** 消息内容 */
  message: string
  /** 详细信息 */
  detail?: string
  /** 按钮文本数组 */
  buttons?: string[]
  /** 默认按钮索引 */
  defaultId?: number
  /** 取消按钮索引 */
  cancelId?: number
}

/**
 * 消息框响应
 */
export interface MessageBoxResponse {
  /** 用户点击的按钮索引 */
  response: number
}
```

#### 2. IPC 通道

**文件**: [`src/shared/ipc/channels.ts`](../src/shared/ipc/channels.ts)

```typescript
export const DIALOG_CHANNELS = {
  // ... 其他通道
  /** 显示消息框 */
  SHOW_MESSAGE: 'dialog:showMessage'
} as const
```

#### 3. 主进程处理器

**文件**: [`src/main/ipc/handlers.ts`](../src/main/ipc/handlers.ts)

```typescript
// 显示消息框
ipcMain.handle(
  IPC_CHANNELS.SHOW_MESSAGE,
  async (event, options: MessageBoxOptions): Promise<MessageBoxResponse | void> => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return

    // 消息类型映射
    const typeMap: Record<MessageBoxOptions['type'], 'info' | 'error' | 'warning' | 'none'> = {
      info: 'info',
      error: 'error',
      warning: 'warning',
      success: 'info' // Electron 没有 success 类型，使用 info
    }

    const result = await dialog.showMessageBox(window, {
      type: typeMap[options.type],
      title: options.title || '提示',
      message: options.message,
      detail: options.detail,
      buttons: options.buttons || ['确定'],
      defaultId: options.defaultId,
      cancelId: options.cancelId
    })

    // 如果有多个按钮，返回用户选择
    if (options.buttons && options.buttons.length > 1) {
      return { response: result.response }
    }
  }
)
```

#### 4. Preload API

**文件**: [`src/preload/index.ts`](../src/preload/index.ts)

```typescript
const api = {
  dialog: {
    // ... 其他对话框 API
    showMessage: (options: IPCTypeMap['dialog:showMessage']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.SHOW_MESSAGE, options) as Promise<
        IPCTypeMap['dialog:showMessage']['response']
      >
  }
}
```

#### 5. Configuration.vue

**文件**: [`src/renderer/src/views/Configuration.vue`](../src/renderer/src/views/Configuration.vue)

**移除内容**:

- ❌ `saveMessage` ref 状态
- ❌ 页面底部的提示框组件

**新增内容**:

- ✅ 所有提示改用 `window.api.dialog.showMessage()`
- ✅ 保存成功/失败使用原生对话框
- ✅ 验证失败使用原生对话框
- ✅ 重置确认使用原生对话框

**示例代码**:

```typescript
// 保存配置
const saveConfig = async (): Promise<void> => {
  try {
    isSaving.value = true

    // 验证失败
    if (!validateApiUrl()) {
      await window.api.dialog.showMessage({
        type: 'warning',
        title: '验证失败',
        message: '请填写必填项'
      })
      return
    }

    // 保存成功
    await ConfigStore.save(config.value)
    await window.api.dialog.showMessage({
      type: 'success',
      title: '成功',
      message: '配置保存成功！'
    })
  } catch (error) {
    // 保存失败
    await window.api.dialog.showMessage({
      type: 'error',
      title: '错误',
      message: '配置保存失败',
      detail: error instanceof Error ? error.message : '请重试'
    })
  } finally {
    isSaving.value = false
  }
}

// 重置配置（带确认）
const resetConfig = async (): Promise<void> => {
  const result = await window.api.dialog.showMessage({
    type: 'warning',
    title: '确认重置',
    message: '确定要重置所有配置吗？',
    detail: '此操作将清除所有自定义设置，恢复为默认值。',
    buttons: ['取消', '确定'],
    defaultId: 0,
    cancelId: 0
  })

  if (result && result.response === 1) {
    config.value = await ConfigStore.reset()
    await window.api.dialog.showMessage({
      type: 'success',
      title: '成功',
      message: '配置已重置为默认值'
    })
  }
}
```

---

## 使用场景

### 场景 1: 简单提示（单按钮）

用于显示信息，不需要用户做选择：

```typescript
await window.api.dialog.showMessage({
  type: 'info',
  message: '这是一条提示消息'
})
```

### 场景 2: 详细错误信息

显示错误时提供详细信息：

```typescript
await window.api.dialog.showMessage({
  type: 'error',
  title: '连接失败',
  message: '无法连接到服务器',
  detail: 'Error: ECONNREFUSED 192.168.1.100:22'
})
```

### 场景 3: 确认操作

需要用户确认的操作：

```typescript
const result = await window.api.dialog.showMessage({
  type: 'warning',
  title: '确认删除',
  message: '确定要删除此项吗？',
  detail: '删除后无法恢复',
  buttons: ['取消', '删除'],
  defaultId: 0,
  cancelId: 0
})

if (result && result.response === 1) {
  // 执行删除操作
}
```

### 场景 4: 多选项对话框

提供多个选项供用户选择：

```typescript
const result = await window.api.dialog.showMessage({
  type: 'info',
  title: '保存更改',
  message: '是否保存当前更改？',
  buttons: ['不保存', '取消', '保存'],
  defaultId: 2, // 默认选中"保存"
  cancelId: 1 // ESC键对应"取消"
})

switch (result?.response) {
  case 0: // 不保存
    break
  case 1: // 取消
    break
  case 2: // 保存
    break
}
```

---

## 优势对比

### 之前（页面内提示）

```vue
<!-- 模板 -->
<div v-if="saveMessage" class="p-4 rounded-md border">
  {{ saveMessage }}
</div>

<!-- 脚本 -->
saveMessage.value = '配置保存成功！' setTimeout(() => { saveMessage.value = '' }, 3000)
```

**缺点**:

- ❌ 用户可能错过提示（自动消失）
- ❌ 提示样式不够醒目
- ❌ 需要管理定时器
- ❌ 缺少桌面应用的原生感

### 现在（原生对话框）

```typescript
await window.api.dialog.showMessage({
  type: 'success',
  title: '成功',
  message: '配置保存成功！'
})
```

**优点**:

- ✅ 模态对话框，确保用户看到
- ✅ 系统原生样式，更专业
- ✅ 代码更简洁，无需管理状态
- ✅ 桌面应用标准体验
- ✅ 支持确认操作
- ✅ 可提供详细错误信息

---

## 最佳实践

### 1. 选择合适的消息类型

| 类型      | 使用场景      | 示例                 |
| --------- | ------------- | -------------------- |
| `info`    | 一般信息      | "测试连接功能待实现" |
| `success` | 操作成功      | "配置保存成功！"     |
| `warning` | 警告/验证失败 | "请填写必填项"       |
| `error`   | 错误/异常     | "配置保存失败"       |

### 2. 提供清晰的标题

```typescript
// ✅ 好的做法
await window.api.dialog.showMessage({
  type: 'error',
  title: '保存失败', // 清晰的标题
  message: '无法保存配置文件'
})

// ❌ 避免
await window.api.dialog.showMessage({
  type: 'error',
  message: '保存失败：无法保存配置文件' // 没有标题
})
```

### 3. 错误时提供详细信息

```typescript
try {
  await saveConfig()
} catch (error) {
  await window.api.dialog.showMessage({
    type: 'error',
    title: '错误',
    message: '配置保存失败',
    detail: error instanceof Error ? error.message : '未知错误'
  })
}
```

### 4. 确认操作的按钮顺序

按照平台惯例：

- macOS: `['取消', '确定']`
- Windows/Linux: `['确定', '取消']`

当前实现统一使用 `['取消', '确定']`

---

## 兼容性

- ✅ macOS: 原生 macOS 对话框样式
- ✅ Windows: 原生 Windows 对话框样式
- ✅ Linux: 原生 Linux 对话框样式

---

## 未来改进

1. **自动按平台调整按钮顺序**

   ```typescript
   const buttons = process.platform === 'darwin' ? ['取消', '确定'] : ['确定', '取消']
   ```

2. **支持自定义图标**

   ```typescript
   interface MessageBoxOptions {
     icon?: NativeImage
   }
   ```

3. **支持复选框**
   ```typescript
   interface MessageBoxOptions {
     checkboxLabel?: string
     checkboxChecked?: boolean
   }
   ```

---

## 相关文档

- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [故障排查指南](./TROUBLESHOOTING.md)
- [IPC 通信规范](./IPC_COMMUNICATION.md)

---

**更新日期**: 2025-10-23
**更新者**: AI Assistant
**状态**: ✅ 已完成
