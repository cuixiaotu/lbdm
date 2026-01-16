# Electron 原生文件对话框实现

## 概述

SSH 私钥文件选择现已升级为使用 Electron 原生文件对话框，提供更好的用户体验和完整的文件路径支持。

## 为什么使用主进程？

### 浏览器 `<input type="file">` 的局限性

❌ **问题：**
1. **无法获取真实路径** - 出于安全考虑，浏览器只能获取文件名
2. **伪造的路径** - `C:\fakepath\filename.txt`
3. **用户体验差** - 不是原生系统对话框
4. **功能受限** - 无法设置默认目录、文件过滤等

### Electron 原生对话框的优势

✅ **优势：**
1. **真实文件路径** - 获取完整的绝对路径
2. **原生体验** - 使用操作系统原生对话框
3. **功能丰富** - 支持默认目录、文件过滤、多选等
4. **权限完整** - 主进程有完整的文件系统访问权限
5. **更安全** - 可以进行文件验证和权限检查

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      渲染进程                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Configuration.vue                                │   │
│  │  selectPrivateKeyFile()                         │   │
│  │    ↓                                            │   │
│  │  window.api.dialog.openFile()                   │   │
│  └─────────────────┬───────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────┘
                     │ IPC
                     │ invoke('dialog:openFile')
                     ↓
┌─────────────────────────────────────────────────────────┐
│                      Preload                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ipcRenderer.invoke('dialog:openFile', options)  │   │
│  └─────────────────┬───────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────┘
                     │ IPC
                     ↓
┌─────────────────────────────────────────────────────────┐
│                      主进程                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ipcMain.handle('dialog:openFile')               │   │
│  │   ↓                                             │   │
│  │ dialog.showOpenDialog({                         │   │
│  │   properties: ['openFile'],                     │   │
│  │   filters: [...],                               │   │
│  │   defaultPath: ~/.ssh                           │   │
│  │ })                                              │   │
│  │   ↓                                             │   │
│  │ return filePath                                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 实现细节

### 主进程 (src/main/index.ts)

```typescript
import { dialog } from 'electron'
import * as os from 'os'

// 注册文件对话框 IPC 处理器
ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'SSH Keys', extensions: ['pem', 'key', 'ppk'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: join(os.homedir(), '.ssh'),
    ...options
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})
```

### Preload (src/preload/index.ts)

```typescript
const api = {
  dialog: {
    openFile: (options?: unknown) => ipcRenderer.invoke('dialog:openFile', options)
  }
}
```

### 类型定义 (src/preload/index.d.ts)

```typescript
interface DialogAPI {
  openFile: (options?: { title?: string; buttonLabel?: string }) => Promise<string | null>
}

interface Window {
  api: {
    dialog: DialogAPI
  }
}
```

### 渲染进程 (Configuration.vue)

```typescript
// 使用原生对话框
const selectPrivateKeyFile = async (): Promise<void> => {
  try {
    const filePath = await window.api.dialog.openFile({
      title: '选择 SSH 私钥文件',
      buttonLabel: '选择'
    })

    if (filePath) {
      config.value.ssh.privateKey = filePath
      privateKeyInputMode.value = 'file'
    }
  } catch (error) {
    console.error('选择文件失败:', error)
    // 降级方案
    fallbackFileSelection()
  }
}
```

## 对话框配置选项

### 基本选项

```typescript
{
  // 对话框标题
  title: string

  // 确认按钮文字
  buttonLabel: string

  // 默认打开的目录
  defaultPath: string

  // 对话框属性
  properties: [
    'openFile',      // 允许选择文件
    'openDirectory', // 允许选择目录
    'multiSelections', // 允许多选
    'showHiddenFiles', // 显示隐藏文件
    'createDirectory'  // 允许创建目录
  ]

  // 文件过滤器
  filters: [
    { name: 'SSH Keys', extensions: ['pem', 'key', 'ppk'] },
    { name: 'All Files', extensions: ['*'] }
  ]
}
```

### SSH 私钥文件选择配置

```typescript
{
  properties: ['openFile'],
  filters: [
    { name: 'SSH Keys', extensions: ['pem', 'key', 'ppk'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  defaultPath: join(os.homedir(), '.ssh'),
  title: '选择 SSH 私钥文件',
  buttonLabel: '选择'
}
```

## 不同平台的文件路径

### macOS
```
/Users/username/.ssh/id_rsa
/Users/username/.ssh/id_ed25519
```

### Linux
```
/home/username/.ssh/id_rsa
/home/username/.ssh/id_ed25519
```

### Windows
```
C:\Users\username\.ssh\id_rsa
C:\Users\username\.ssh\id_ed25519
```

## 降级方案

为了确保在某些情况下（如开发环境或 API 不可用）仍能选择文件，实现了降级方案：

```typescript
const fallbackFileSelection = (): void => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pem,.key,.ppk,*'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      // 注意：这里只能获取文件名，不是完整路径
      config.value.ssh.privateKey = file.name
      privateKeyInputMode.value = 'file'
    }
  }
  input.click()
}
```

## 用户体验对比

### 原生对话框（推荐）

```
┌─────────────────────────────────────────────┐
│  选择 SSH 私钥文件                    × ▢ ▽ │
├─────────────────────────────────────────────┤
│  ◂  ▸  ⌂  ~/.ssh                     ▼     │
├─────────────────────────────────────────────┤
│  📁 .ssh                                    │
│    📄 id_rsa                    2024-01-15  │
│    📄 id_rsa.pub                2024-01-15  │
│    📄 id_ed25519                2024-01-20  │
│    📄 id_ed25519.pub            2024-01-20  │
│    📄 known_hosts               2024-10-23  │
├─────────────────────────────────────────────┤
│  文件名: id_rsa                             │
│  文件类型: SSH Keys (*.pem, *.key, *.ppk)  │
│                          [取消]  [选择]     │
└─────────────────────────────────────────────┘
```

### 浏览器文件选择（降级方案）

```
┌────────────────────────────┐
│  选择文件                   │
├────────────────────────────┤
│  C:\fakepath\id_rsa  [浏览] │
└────────────────────────────┘
```

## 安全性增强

### 文件验证

可以在主进程中添加文件验证：

```typescript
import * as fs from 'fs'

ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog({ ... })

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]

    // 验证文件存在
    if (!fs.existsSync(filePath)) {
      throw new Error('文件不存在')
    }

    // 验证文件权限
    const stats = fs.statSync(filePath)
    if (stats.mode & 0o044) {
      // 警告：文件对其他用户可读
      console.warn('警告：私钥文件权限过于宽松')
    }

    // 验证文件格式
    const content = fs.readFileSync(filePath, 'utf-8')
    if (!content.includes('BEGIN') || !content.includes('PRIVATE KEY')) {
      throw new Error('不是有效的私钥文件')
    }

    return filePath
  }
  return null
})
```

### 权限检查

```typescript
// 检查文件权限（仅 Unix-like 系统）
function checkFilePermissions(filePath: string): void {
  const stats = fs.statSync(filePath)
  const mode = stats.mode & parseInt('777', 8)

  // 推荐权限：600 (rw-------)
  if (mode !== parseInt('600', 8)) {
    console.warn(`警告：私钥文件权限为 ${mode.toString(8)}，建议设置为 600`)
  }
}
```

## 错误处理

### 用户取消选择

```typescript
const filePath = await window.api.dialog.openFile()
if (!filePath) {
  // 用户取消了选择
  console.log('用户取消了文件选择')
  return
}
```

### API 调用失败

```typescript
try {
  const filePath = await window.api.dialog.openFile()
  // 处理文件路径
} catch (error) {
  console.error('文件选择失败:', error)
  // 使用降级方案或显示错误提示
}
```

## 扩展功能

### 1. 多文件选择

```typescript
ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  })
  return result.filePaths
})
```

### 2. 目录选择

```typescript
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.filePaths[0]
})
```

### 3. 保存文件对话框

```typescript
ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog({
    defaultPath: 'config.json',
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options
  })
  return result.filePath
})
```

## 测试

### 手动测试步骤

1. **打开系统设置页面**
2. **勾选 "Use SSH key"**
3. **点击 "选择文件" 按钮**
4. **验证原生对话框打开**
   - 默认目录应该是 `~/.ssh`
   - 文件过滤器显示 "SSH Keys"
5. **选择私钥文件**
6. **验证完整路径显示**
   - 应该显示完整的绝对路径
   - 例如：`/Users/username/.ssh/id_rsa`
7. **保存配置**
8. **重启应用**
9. **验证路径保留**

### 自动化测试

```typescript
describe('File Dialog', () => {
  it('should open native file dialog', async () => {
    const result = await window.api.dialog.openFile({
      title: 'Test'
    })
    expect(typeof result).toBe('string')
  })

  it('should return null when canceled', async () => {
    // 模拟用户取消
    const result = await window.api.dialog.openFile()
    expect(result).toBeNull()
  })
})
```

## 常见问题

### Q: 为什么不直接在渲染进程中使用 dialog？

A: 渲染进程不应该直接访问 Electron 的主进程模块。应该通过 IPC 通信，这样更安全且符合 Electron 安全最佳实践。

### Q: 能否记住用户上次选择的目录？

A: 可以。保存上次选择的目录路径，下次作为 `defaultPath` 使用：

```typescript
let lastDirectory = join(os.homedir(), '.ssh')

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    defaultPath: lastDirectory
  })

  if (!result.canceled && result.filePaths.length > 0) {
    lastDirectory = path.dirname(result.filePaths[0])
    return result.filePaths[0]
  }
  return null
})
```

### Q: 如何限制只能选择特定目录下的文件？

A: 可以在主进程中验证文件路径：

```typescript
const allowedDir = join(os.homedir(), '.ssh')

if (!filePath.startsWith(allowedDir)) {
  throw new Error('只能选择 ~/.ssh 目录下的文件')
}
```

## 相关文件

- **主进程**: [`src/main/index.ts`](../src/main/index.ts)
- **Preload**: [`src/preload/index.ts`](../src/preload/index.ts)
- **类型定义**: [`src/preload/index.d.ts`](../src/preload/index.d.ts)
- **配置页面**: [`src/renderer/src/views/Configuration.vue`](../src/renderer/src/views/Configuration.vue)

## 参考资源

- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [Electron IPC 通信](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron 安全最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)

## 更新日志

### v1.2 (当前版本)

- ✅ 使用 Electron 原生文件对话框
- ✅ 获取真实文件路径
- ✅ 支持文件过滤和默认目录
- ✅ 实现降级方案
- ✅ 改进用户体验
