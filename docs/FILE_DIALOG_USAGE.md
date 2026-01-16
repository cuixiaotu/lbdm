# 文件对话框使用指南

## 概述

本项目使用 Electron 原生的文件对话框 API 来选择文件，支持完全的文件类型过滤控制。

## 基本用法

### 1. 允许选择任意类型的文件（默认）

如果不指定 `filters` 参数，默认允许选择所有类型的文件：

```typescript
// 选择任意类型的文件
const filePath = await window.api.dialog.openFile({
  title: '选择文件',
  buttonLabel: '选择',
  defaultPath: '~/'
})
```

### 2. 限制特定文件类型

通过 `filters` 参数可以限制用户只能选择特定类型的文件：

```typescript
// 只允许选择图片文件
const imagePath = await window.api.dialog.openFile({
  title: '选择图片',
  buttonLabel: '选择',
  filters: [
    { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
    { name: 'All Files', extensions: ['*'] }
  ]
})

// 只允许选择 JSON 文件
const jsonPath = await window.api.dialog.openFile({
  title: '选择配置文件',
  filters: [
    { name: 'JSON', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] }
  ]
})

// 只允许选择 SSH 密钥文件
const keyPath = await window.api.dialog.openFile({
  title: '选择 SSH 私钥',
  filters: [
    { name: 'SSH Keys', extensions: ['pem', 'key', 'ppk'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  defaultPath: '~/.ssh'
})
```

## 完整的 API 选项

### OpenFileOptions

```typescript
interface OpenFileOptions {
  /** 对话框标题 */
  title?: string

  /** 确认按钮文字 */
  buttonLabel?: string

  /** 默认路径 */
  defaultPath?: string

  /** 文件类型过滤器 */
  filters?: FileFilter[]
}

interface FileFilter {
  /** 过滤器名称（在对话框中显示） */
  name: string

  /** 文件扩展名数组（不包含点） */
  extensions: string[]
}
```

## 使用示例

### 示例 1: SSH 私钥文件选择（任意类型）

```typescript
// Configuration.vue 中的实现
const selectPrivateKeyFile = async (): Promise<void> => {
  try {
    const filePath = await window.api.dialog.openFile({
      title: '选择 SSH 私钥文件',
      buttonLabel: '选择',
      defaultPath: '~/.ssh'
      // 不指定 filters，允许选择任意类型的文件
    })

    if (filePath) {
      config.value.ssh.privateKey = filePath
      privateKeyInputMode.value = 'file'
    }
  } catch (error) {
    console.error('选择文件失败:', error)
  }
}
```

### 示例 2: 配置文件导入

```typescript
const importConfig = async () => {
  const filePath = await window.api.dialog.openFile({
    title: '导入配置文件',
    buttonLabel: '导入',
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'YAML', extensions: ['yml', 'yaml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (filePath) {
    // 处理导入逻辑
  }
}
```

### 示例 3: 多文件选择

```typescript
const selectMultipleFiles = async () => {
  const filePaths = await window.api.dialog.openFiles({
    title: '选择多个文件',
    filters: [
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  console.log('选择的文件:', filePaths)
}
```

### 示例 4: 目录选择

```typescript
const selectDirectory = async () => {
  const dirPath = await window.api.dialog.openDirectory({
    title: '选择项目目录',
    defaultPath: '~/'
  })

  if (dirPath) {
    console.log('选择的目录:', dirPath)
  }
}
```

### 示例 5: 保存文件

```typescript
const saveConfig = async () => {
  const filePath = await window.api.dialog.saveFile({
    title: '保存配置',
    defaultPath: 'config.json',
    buttonLabel: '保存',
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (filePath) {
    // 保存到指定路径
  }
}
```

## 常见文件类型过滤器

```typescript
// 图片文件
filters: [
  { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] }
]

// 文档文件
filters: [
  { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] }
]

// 压缩文件
filters: [
  { name: 'Archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz'] }
]

// 代码文件
filters: [
  { name: 'Source Code', extensions: ['js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java'] }
]

// 配置文件
filters: [
  { name: 'Config', extensions: ['json', 'yaml', 'yml', 'toml', 'ini', 'conf'] }
]

// 证书和密钥
filters: [
  { name: 'Certificates', extensions: ['pem', 'crt', 'cer', 'p12', 'pfx'] },
  { name: 'Private Keys', extensions: ['key', 'pem', 'ppk'] }
]

// 所有文件（总是建议添加）
filters: [
  { name: 'All Files', extensions: ['*'] }
]
```

## 最佳实践

### 1. 始终提供"所有文件"选项

即使您想限制特定文件类型，也建议添加"All Files"作为备选：

```typescript
filters: [
  { name: 'JSON', extensions: ['json'] },
  { name: 'All Files', extensions: ['*'] }  // ✅ 提供备选
]
```

### 2. 提供清晰的过滤器名称

```typescript
// ✅ 好的做法
filters: [
  { name: 'SSH Private Keys', extensions: ['pem', 'key', 'ppk'] }
]

// ❌ 避免
filters: [
  { name: 'Files', extensions: ['pem', 'key', 'ppk'] }
]
```

### 3. 设置合理的默认路径

```typescript
// ✅ SSH 密钥通常在 ~/.ssh
defaultPath: '~/.ssh'

// ✅ 配置文件通常在用户目录
defaultPath: '~/'

// ✅ 项目文件使用当前工作目录
defaultPath: process.cwd()
```

### 4. 处理取消操作

用户可能会取消文件选择，务必处理 `null` 返回值：

```typescript
const filePath = await window.api.dialog.openFile({...})

if (filePath) {
  // ✅ 只有选择了文件才处理
  handleFile(filePath)
} else {
  // 用户取消了选择
  console.log('用户取消了文件选择')
}
```

### 5. 错误处理

```typescript
try {
  const filePath = await window.api.dialog.openFile({...})
  if (filePath) {
    await processFile(filePath)
  }
} catch (error) {
  console.error('文件选择失败:', error)
  // 提供降级方案或错误提示
}
```

## 平台差异

### macOS
- 文件对话框是原生的 macOS 样式
- 支持快捷键（Cmd+Shift+G 跳转路径）
- 支持拖放文件到对话框

### Windows
- 文件对话框是原生的 Windows 样式
- 支持快速访问和最近使用的文件夹
- 过滤器显示在右下角的下拉菜单中

### Linux
- 取决于桌面环境（GTK/Qt）
- 功能类似但界面可能不同

## 技术实现

### 类型定义 (src/shared/ipc/types.ts)

```typescript
export interface FileFilter {
  name: string
  extensions: string[]
}

export interface OpenFileOptions {
  title?: string
  buttonLabel?: string
  defaultPath?: string
  filters?: FileFilter[]
}
```

### 主进程处理器 (src/main/ipc/handlers.ts)

```typescript
ipcMain.handle(IPC_CHANNELS.OPEN_FILE, async (_, options?: OpenFileOptions) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    // 如果没有指定 filters，默认允许所有文件
    filters: options?.filters || [
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: options?.defaultPath || join(os.homedir(), '.ssh'),
    title: options?.title,
    buttonLabel: options?.buttonLabel
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})
```

### 渲染进程调用 (Vue 组件)

```typescript
const filePath = await window.api.dialog.openFile({
  title: '选择文件',
  buttonLabel: '选择',
  defaultPath: '~/',
  filters: [
    { name: 'All Files', extensions: ['*'] }
  ]
})
```

## 相关文档

- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [IPC 通信管理](./IPC_MANAGEMENT.md)
- [系统配置说明](./CONFIGURATION.md)

---

**最后更新**: 2025-10-23
