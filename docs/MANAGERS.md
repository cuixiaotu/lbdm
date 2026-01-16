# 管理器系统文档

本文档介绍应用中的统一管理器系统，用于集中管理窗口和线程。

## 目录

- [WindowManager - 窗口管理器](#windowmanager---窗口管理器)
- [ThreadManager - 线程管理器](#threadmanager---线程管理器)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)

---

## WindowManager - 窗口管理器

窗口管理器提供统一的 API 来管理应用中的所有窗口，包括创建、销毁、通信和生命周期管理。

### 核心功能

- ✅ 窗口创建和销毁
- ✅ 单例模式支持（防止重复创建）
- ✅ 窗口状态管理
- ✅ 事件系统（基于 EventEmitter）
- ✅ 窗口间通信
- ✅ 自动生命周期管理

### 窗口类型

```typescript
enum WindowType {
  MAIN = 'main',           // 主窗口
  SETTINGS = 'settings',   // 设置窗口
  ABOUT = 'about',         // 关于窗口
  FLOATING = 'floating',   // 悬浮窗口
  CUSTOM = 'custom'        // 自定义窗口
}
```

### 窗口状态

```typescript
enum WindowState {
  CREATING = 'creating',       // 创建中
  READY = 'ready',            // 已就绪
  MINIMIZED = 'minimized',    // 最小化
  MAXIMIZED = 'maximized',    // 最大化
  FULLSCREEN = 'fullscreen',  // 全屏
  CLOSING = 'closing',        // 关闭中
  CLOSED = 'closed'           // 已关闭
}
```

### API 参考

#### 创建窗口

```typescript
import { windowManager, WindowType } from '@/main/managers'

const mainWindow = await windowManager.create({
  type: WindowType.MAIN,
  singleton: true,  // 单例模式，防止重复创建
  width: 1200,
  height: 800,
  url: 'http://localhost:5173',
  showImmediately: true
})
```

#### 获取窗口

```typescript
// 通过 ID 获取
const window = windowManager.get('main-1234')

// 通过类型查找
const mainWindows = windowManager.findByType(WindowType.MAIN)

// 查询窗口
const readyWindows = windowManager.find({ state: WindowState.READY })

// 获取所有窗口
const allWindows = windowManager.getAll()
```

#### 窗口控制

```typescript
// 显示窗口
windowManager.show('window-id')

// 隐藏窗口
windowManager.hide('window-id')

// 聚焦窗口
windowManager.focus('window-id')

// 销毁窗口
windowManager.destroy('window-id')

// 销毁所有窗口
windowManager.destroyAll()
```

#### 窗口通信

```typescript
// 向特定窗口发送消息
windowManager.sendMessage('window-id', 'channel-name', { data: 'value' })

// 广播消息到所有窗口
windowManager.broadcast('global-event', { message: 'Hello all windows' })
```

#### 事件监听

```typescript
import { WindowEvent } from '@/main/managers'

// 监听窗口创建
windowManager.on(WindowEvent.CREATED, (window) => {
  console.log('Window created:', window.id)
})

// 监听窗口关闭
windowManager.on(WindowEvent.CLOSE, (window) => {
  console.log('Window closed:', window.id)
})

// 移除监听器
windowManager.off(WindowEvent.CREATED, callback)
```

### 配置选项

```typescript
interface WindowOptions extends BrowserWindowConstructorOptions {
  type: WindowType              // 窗口类型（必填）
  id?: string                   // 窗口 ID（可选）
  url?: string                  // URL 路径
  htmlFile?: string            // HTML 文件路径
  singleton?: boolean          // 是否单例模式
  parentId?: string            // 父窗口 ID
  showImmediately?: boolean    // 创建后是否立即显示
  data?: Record<string, unknown>  // 自定义数据
}
```

---

## ThreadManager - 线程管理器

线程管理器使用 Electron 的 `UtilityProcess` API 来管理后台线程，实现 CPU 密集型任务的并行处理。

### 核心功能

- ✅ 线程创建和停止
- ✅ 线程状态监控
- ✅ 自动重启机制
- ✅ 线程间通信（postMessage）
- ✅ 线程优先级管理
- ✅ 统计信息收集

### 线程类型

```typescript
enum ThreadType {
  DATA_PROCESSOR = 'data-processor',    // 数据处理
  FILE_PROCESSOR = 'file-processor',    // 文件处理
  NETWORK_WORKER = 'network-worker',    // 网络任务
  SSH_WORKER = 'ssh-worker',            // SSH 任务
  CUSTOM = 'custom'                     // 自定义
}
```

### 线程状态

```typescript
enum ThreadState {
  INITIALIZING = 'initializing',  // 初始化中
  RUNNING = 'running',            // 运行中
  PAUSED = 'paused',              // 已暂停
  STOPPING = 'stopping',          // 停止中
  STOPPED = 'stopped',            // 已停止
  ERROR = 'error'                 // 错误
}
```

### 线程优先级

```typescript
enum ThreadPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}
```

### API 参考

#### 初始化管理器

```typescript
import { threadManager } from '@/main/managers'

await threadManager.initialize()
```

#### 创建线程

```typescript
import { ThreadType, ThreadPriority } from '@/main/managers'

const thread = await threadManager.create({
  type: ThreadType.DATA_PROCESSOR,
  modulePath: path.join(__dirname, '../workers/data-processor.js'),
  args: ['--mode=production'],
  env: { NODE_ENV: 'production' },
  priority: ThreadPriority.HIGH,
  autoRestart: true,      // 崩溃时自动重启
  maxRestarts: 3,         // 最大重启次数
  data: {                 // 自定义数据
    taskId: '12345'
  }
})
```

#### 获取线程

```typescript
// 通过 ID 获取
const thread = threadManager.get('thread-id')

// 通过类型查找
const dataThreads = threadManager.findByType(ThreadType.DATA_PROCESSOR)

// 查询线程
const runningThreads = threadManager.find({ state: ThreadState.RUNNING })

// 获取所有线程
const allThreads = threadManager.getAll()
```

#### 线程控制

```typescript
// 停止线程
threadManager.stop('thread-id')

// 停止所有线程
threadManager.stopAll()

// 重启线程
await threadManager.restart('thread-id')
```

#### 线程通信

```typescript
import { ThreadEvent } from '@/main/managers'

// 发送消息到线程
threadManager.sendMessage('thread-id', {
  type: 'command',
  data: { action: 'process', payload: {...} },
  timestamp: Date.now()
})

// 监听线程消息
threadManager.on(ThreadEvent.MESSAGE, (thread, message) => {
  console.log('Message from thread:', message.data)
})
```

#### 统计信息

```typescript
const stats = threadManager.getStats()
console.log('Total threads:', stats.total)
console.log('Running:', stats.running)
console.log('By type:', stats.byType)
console.log('By state:', stats.byState)
```

#### 事件监听

```typescript
import { ThreadEvent } from '@/main/managers'

// 监听线程创建
threadManager.on(ThreadEvent.CREATED, (thread) => {
  console.log('Thread created:', thread.id)
})

// 监听线程停止
threadManager.on(ThreadEvent.STOPPED, (thread) => {
  console.log('Thread stopped:', thread.id)
})

// 监听线程重启
threadManager.on(ThreadEvent.RESTARTED, (thread) => {
  console.log('Thread restarted:', thread.id)
})
```

### 配置选项

```typescript
interface ThreadOptions {
  type: ThreadType                      // 线程类型（必填）
  modulePath: string                    // 模块路径（必填）
  id?: string                           // 线程 ID
  args?: string[]                       // 命令行参数
  env?: Record<string, string>          // 环境变量
  priority?: ThreadPriority             // 优先级
  autoRestart?: boolean                 // 自动重启
  maxRestarts?: number                  // 最大重启次数
  data?: Record<string, unknown>        // 自定义数据
}
```

---

## 使用示例

### 示例 1: 创建主窗口和设置窗口

```typescript
import { windowManager, WindowType } from '@/main/managers'

// 在 app ready 后初始化
app.whenReady().then(async () => {
  // 创建主窗口
  const mainWindow = await windowManager.create({
    type: WindowType.MAIN,
    singleton: true,
    width: 1200,
    height: 800,
    url: 'http://localhost:5173',
    showImmediately: true
  })

  // 监听主窗口关闭
  windowManager.on(WindowEvent.CLOSE, (window) => {
    if (window.type === WindowType.MAIN) {
      app.quit()
    }
  })
})

// IPC 处理器：打开设置窗口
ipcMain.handle('open-settings', async () => {
  const settingsWindow = await windowManager.create({
    type: WindowType.SETTINGS,
    singleton: true,  // 只允许一个设置窗口
    width: 800,
    height: 600,
    url: 'http://localhost:5173/#/settings',
    showImmediately: true,
    modal: true,
    parent: windowManager.findByType(WindowType.MAIN)[0]?.window
  })

  return settingsWindow.id
})
```

### 示例 2: 创建数据处理线程

```typescript
import { threadManager, ThreadType, ThreadEvent } from '@/main/managers'

// 初始化线程管理器
await threadManager.initialize()

// 创建数据处理线程
const thread = await threadManager.create({
  type: ThreadType.DATA_PROCESSOR,
  modulePath: path.join(__dirname, '../workers/data-processor.js'),
  priority: ThreadPriority.HIGH,
  autoRestart: true,
  maxRestarts: 3,
  data: {
    batchSize: 1000
  }
})

// 监听线程消息
threadManager.on(ThreadEvent.MESSAGE, (threadInstance, message) => {
  if (message.type === 'message') {
    console.log('Processing result:', message.data)

    // 通知渲染进程
    windowManager.broadcast('data-processed', message.data)
  }
})

// 发送任务到线程
threadManager.sendMessage(thread.id, {
  type: 'task',
  data: {
    action: 'process',
    items: [...]
  },
  timestamp: Date.now()
})
```

### 示例 3: Worker 线程代码（data-processor.js）

```javascript
// workers/data-processor.js
const { parentPort } = require('worker_threads')

// 监听主进程消息
process.parentPort.on('message', (message) => {
  if (message.type === 'task') {
    const { action, items } = message.data

    if (action === 'process') {
      // 处理数据
      const result = items.map(item => processItem(item))

      // 发送结果回主进程
      process.parentPort.postMessage({
        type: 'result',
        data: result
      })
    }
  }
})

function processItem(item) {
  // 实际的数据处理逻辑
  return item * 2
}

// 准备就绪
process.parentPort.postMessage({
  type: 'ready',
  data: null
})
```

### 示例 4: 在主进程中集成管理器

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron'
import { windowManager, threadManager } from './managers'
import { registerIPCHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

app.whenReady().then(async () => {
  // 注册 IPC 处理器
  registerIPCHandlers()

  // 初始化线程管理器
  await threadManager.initialize()

  // 创建主窗口
  const mainWindowInstance = await windowManager.create({
    type: WindowType.MAIN,
    singleton: true,
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    url: process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173',
    showImmediately: true
  })

  mainWindow = mainWindowInstance.window
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // 清理所有线程
  threadManager.dispose()

  // 清理所有窗口
  windowManager.dispose()
})
```

---

## 最佳实践

### 1. 窗口管理

- ✅ **使用单例模式**：对于设置窗口、关于窗口等只需要一个实例的窗口，启用 `singleton: true`
- ✅ **监听生命周期事件**：使用事件监听器追踪窗口状态变化
- ✅ **合理使用父子窗口**：模态对话框应设置 `parent` 和 `modal`
- ✅ **及时清理资源**：窗口关闭后，管理器会自动清理，无需手动处理

### 2. 线程管理

- ✅ **初始化管理器**：在使用前调用 `threadManager.initialize()`
- ✅ **设置合理的重启策略**：对于关键任务，启用 `autoRestart` 并设置 `maxRestarts`
- ✅ **使用优先级**：CPU 密集型任务使用 `HIGH`，后台任务使用 `LOW`
- ✅ **监控线程状态**：定期调用 `getStats()` 获取统计信息
- ✅ **正确处理消息**：使用 `postMessage` 而不是 stdin/stdout 进行通信

### 3. 性能优化

- ⚡ **控制线程数量**：默认最大 10 个线程，根据需要调整 `maxThreads`
- ⚡ **避免重复创建**：使用 `singleton` 或在创建前检查是否已存在
- ⚡ **合理分配任务**：将 CPU 密集型任务分配到线程，UI 任务保持在主进程
- ⚡ **监控资源使用**：定期检查线程和窗口数量

### 4. 错误处理

- 🔒 **捕获异常**：所有 API 调用都应该包含错误处理
- 🔒 **监听错误事件**：监听 `ThreadEvent.STOPPED` 检测线程异常退出
- 🔒 **设置重启限制**：防止无限重启循环

### 5. 类型安全

- 📝 **使用 TypeScript**：充分利用类型定义
- 📝 **导入正确的类型**：从 `@/main/managers` 导入所有类型
- 📝 **定义消息格式**：为线程通信定义明确的消息接口

---

## 相关文档

- [IPC 通信管理](./IPC_MANAGEMENT.md)
- [Electron 官方文档](https://www.electronjs.org/docs/latest/)
- [UtilityProcess API](https://www.electronjs.org/docs/latest/api/utility-process)
- [BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window)

---

**最后更新**: 2025-10-23
