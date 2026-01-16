# 管理器系统快速参考

## 导入

```typescript
import {
  windowManager,
  threadManager,
  WindowType,
  ThreadType,
  WindowEvent,
  ThreadEvent,
  ThreadPriority
} from '@/main/managers'
```

## WindowManager 常用 API

### 创建窗口
```typescript
const window = await windowManager.create({
  type: WindowType.MAIN,      // 必填：窗口类型
  singleton: true,             // 可选：单例模式
  width: 1200,
  height: 800,
  url: 'http://localhost:5173',
  showImmediately: true
})
```

### 查找窗口
```typescript
// 通过 ID
const window = windowManager.get('window-id')

// 通过类型
const mainWindow = windowManager.findByType(WindowType.MAIN)

// 查询
const windows = windowManager.find({ state: WindowState.READY })

// 获取所有
const all = windowManager.getAll()
```

### 窗口控制
```typescript
windowManager.show('window-id')
windowManager.hide('window-id')
windowManager.focus('window-id')
windowManager.destroy('window-id')
windowManager.destroyAll()
```

### 窗口通信
```typescript
// 发送消息到特定窗口
windowManager.sendMessage('window-id', 'channel', data)

// 广播到所有窗口
windowManager.broadcast('event-name', data)
```

### 事件监听
```typescript
windowManager.on(WindowEvent.CREATED, (window) => {
  console.log('Window created:', window.id)
})

windowManager.on(WindowEvent.CLOSE, (window) => {
  console.log('Window closed:', window.id)
})
```

## ThreadManager 常用 API

### 初始化
```typescript
await threadManager.initialize()
```

### 创建线程
```typescript
const thread = await threadManager.create({
  type: ThreadType.CUSTOM,     // 必填：线程类型
  modulePath: './worker.js',   // 必填：模块路径
  priority: ThreadPriority.HIGH,
  autoRestart: true,
  maxRestarts: 3,
  args: ['--mode=prod'],
  env: { NODE_ENV: 'production' },
  data: { taskId: '123' }
})
```

### 查找线程
```typescript
// 通过 ID
const thread = threadManager.get('thread-id')

// 通过类型
const threads = threadManager.findByType(ThreadType.DATA_PROCESSOR)

// 查询
const running = threadManager.find({ state: ThreadState.RUNNING })

// 获取所有
const all = threadManager.getAll()
```

### 线程控制
```typescript
threadManager.stop('thread-id')
threadManager.stopAll()
await threadManager.restart('thread-id')
```

### 线程通信
```typescript
// 发送消息
threadManager.sendMessage('thread-id', {
  type: 'command',
  data: { action: 'process' },
  timestamp: Date.now()
})

// 监听消息
threadManager.on(ThreadEvent.MESSAGE, (thread, message) => {
  console.log('Thread message:', message.data)
})
```

### 统计信息
```typescript
const stats = threadManager.getStats()
// {
//   total: 5,
//   running: 3,
//   stopped: 2,
//   error: 0,
//   byType: { 'data-processor': 2, ... },
//   byState: { running: 3, ... }
// }
```

### 事件监听
```typescript
threadManager.on(ThreadEvent.CREATED, (thread) => {
  console.log('Thread created:', thread.id)
})

threadManager.on(ThreadEvent.STOPPED, (thread) => {
  console.log('Thread stopped:', thread.id)
})

threadManager.on(ThreadEvent.RESTARTED, (thread) => {
  console.log('Thread restarted:', thread.id)
})
```

## 枚举值

### WindowType
- `MAIN` - 主窗口
- `SETTINGS` - 设置窗口
- `ABOUT` - 关于窗口
- `FLOATING` - 悬浮窗口
- `CUSTOM` - 自定义窗口

### WindowState
- `CREATING` - 创建中
- `READY` - 已就绪
- `MINIMIZED` - 最小化
- `MAXIMIZED` - 最大化
- `FULLSCREEN` - 全屏
- `CLOSING` - 关闭中
- `CLOSED` - 已关闭

### WindowEvent
- `CREATED` - 窗口创建
- `READY` - 窗口就绪
- `SHOW` - 窗口显示
- `HIDE` - 窗口隐藏
- `MINIMIZE` - 窗口最小化
- `MAXIMIZE` - 窗口最大化
- `RESTORE` - 窗口还原
- `CLOSE` - 窗口关闭
- `FOCUS` - 窗口焦点
- `BLUR` - 窗口失焦

### ThreadType
- `DATA_PROCESSOR` - 数据处理
- `FILE_PROCESSOR` - 文件处理
- `NETWORK_WORKER` - 网络任务
- `SSH_WORKER` - SSH 任务
- `CUSTOM` - 自定义

### ThreadState
- `INITIALIZING` - 初始化中
- `RUNNING` - 运行中
- `PAUSED` - 已暂停
- `STOPPING` - 停止中
- `STOPPED` - 已停止
- `ERROR` - 错误

### ThreadPriority
- `LOW` - 低优先级
- `NORMAL` - 普通优先级
- `HIGH` - 高优先级

### ThreadEvent
- `CREATED` - 线程创建
- `STARTED` - 线程启动
- `STOPPED` - 线程停止
- `RESTARTED` - 线程重启
- `MESSAGE` - 收到消息

## 清理资源

```typescript
// 应用退出前
app.on('before-quit', () => {
  threadManager.dispose()
  windowManager.dispose()
})
```

## 完整示例

```typescript
import { app } from 'electron'
import { windowManager, threadManager, WindowType, ThreadType } from '@/main/managers'

app.whenReady().then(async () => {
  // 初始化线程管理器
  await threadManager.initialize()

  // 创建主窗口
  const mainWindow = await windowManager.create({
    type: WindowType.MAIN,
    singleton: true,
    width: 1200,
    height: 800,
    url: 'http://localhost:5173'
  })

  // 创建后台线程
  const thread = await threadManager.create({
    type: ThreadType.CUSTOM,
    modulePath: './worker.js',
    autoRestart: true
  })

  // 监听事件
  windowManager.on(WindowEvent.CLOSE, (window) => {
    if (window.type === WindowType.MAIN) {
      app.quit()
    }
  })
})

app.on('before-quit', () => {
  threadManager.dispose()
  windowManager.dispose()
})
```

## 详细文档

查看 `docs/MANAGERS.md` 获取完整的 API 文档和使用指南。
