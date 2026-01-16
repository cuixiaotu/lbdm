# 窗口无法显示问题修复文档

## 问题描述

应用启动时没有报错，托盘图标正常显示，但主窗口无法显示。点击图标也无法唤起窗口。

## 问题分析

### 🔴 问题 1: URL/HtmlFile 加载逻辑错误

**位置**: `src/main/index.ts` - `createMainWindow()` 函数

**问题代码**:
```typescript
// ❌ 错误的逻辑
url: is.dev && process.env['ELECTRON_RENDERER_URL']
  ? process.env['ELECTRON_RENDERER_URL']
  : undefined,  // 生产环境返回 undefined

htmlFile: !is.dev || !process.env['ELECTRON_RENDERER_URL']
  ? join(__dirname, '../renderer/index.html')
  : undefined  // 开发环境有 URL 时返回 undefined
```

**问题原因**:
- 开发环境：如果 `ELECTRON_RENDERER_URL` 存在，`url` 有值，但 `htmlFile` 也可能有值（取决于条件）
- 生产环境：`url` 为 `undefined`，`htmlFile` 的条件 `!is.dev || !process.env['ELECTRON_RENDERER_URL']` 总是 true，但在某些情况下可能导致冲突

**修复方案**:
```typescript
// ✅ 正确的逻辑
url: is.dev && process.env['ELECTRON_RENDERER_URL']
  ? process.env['ELECTRON_RENDERER_URL']
  : undefined,

htmlFile: is.dev && process.env['ELECTRON_RENDERER_URL']
  ? undefined  // 开发环境有 URL 时不使用 htmlFile
  : join(__dirname, '../renderer/index.html')  // 否则使用 htmlFile
```

### 🔴 问题 2: WindowManager 未初始化

**位置**: `src/main/index.ts` - `app.whenReady()` 回调

**问题代码**:
```typescript
app.whenReady().then(async () => {
  // ... 其他初始化代码

  // 初始化线程管理器（如果需要使用线程）
  await threadManager.initialize()

  // ❌ 缺少 windowManager.initialize()

  // 创建主窗口
  await createMainWindow()
})
```

**问题原因**:
- ThreadManager 被初始化，但 WindowManager 没有
- WindowManager 需要初始化来设置生命周期管理和事件监听

**修复方案**:
```typescript
app.whenReady().then(async () => {
  // ... 其他初始化代码

  // ✅ 初始化窗口管理器（重要！）
  await windowManager.initialize()

  // 初始化线程管理器（如果需要使用线程）
  await threadManager.initialize()

  // 创建主窗口
  await createMainWindow()
})
```

### 🟡 问题 3: 事件绑定顺序（已优化）

**位置**: `src/main/managers/window/WindowManager.ts` - `create()` 方法

**原始代码**:
```typescript
async create(options: WindowOptions): Promise<WindowInstance> {
  // ... 创建窗口实例

  // 绑定窗口事件
  this.bindWindowEvents(windowInstance)

  // 加载内容
  await this.loadContent(windowInstance)

  // ...
}
```

**潜在问题**:
- 虽然代码顺序是正确的（先绑定事件，后加载内容），但注释不够清晰

**优化方案**:
```typescript
async create(options: WindowOptions): Promise<WindowInstance> {
  // ... 创建窗口实例

  // 先绑定窗口事件（在加载内容之前）
  this.bindWindowEvents(windowInstance)

  // 加载内容
  await this.loadContent(windowInstance)

  // ...
}
```

## 修复内容

### 文件 1: `src/main/index.ts`

#### 修复 1: URL/HtmlFile 逻辑
```diff
  async function createMainWindow(): Promise<void> {
    const mainWindowInstance = await windowManager.create({
      // ... 其他配置
-     // 使用 url 或 htmlFile 选项
      url: is.dev && process.env['ELECTRON_RENDERER_URL']
        ? process.env['ELECTRON_RENDERER_URL']
        : undefined,
-     htmlFile: !is.dev || !process.env['ELECTRON_RENDERER_URL']
+     // 修复 URL 和 htmlFile 逻辑
+     htmlFile: is.dev && process.env['ELECTRON_RENDERER_URL']
+       ? undefined
        : join(__dirname, '../renderer/index.html')
-       : undefined,
      showImmediately: false
    })
```

#### 修复 2: WindowManager 初始化
```diff
  app.whenReady().then(async () => {
    // ... 其他初始化代码

    // 注册 IPC 处理器
    registerIPCHandlers()

+   // 初始化窗口管理器（重要！）
+   await windowManager.initialize()
+
    // 初始化线程管理器（如果需要使用线程）
    await threadManager.initialize()

    // 创建主窗口
    await createMainWindow()
```

### 文件 2: `src/main/managers/window/WindowManager.ts`

#### 优化: 注释改进
```diff
  async create(options: WindowOptions): Promise<WindowInstance> {
    // ... 创建窗口实例和配置

-   // 绑定窗口事件
+   // 先绑定窗口事件（在加载内容之前）
    this.bindWindowEvents(windowInstance)

    // 加载内容
    await this.loadContent(windowInstance)
```

## 验证步骤

### 1. 开发环境验证

```bash
# 启动开发环境
pnpm dev
```

**预期结果**:
- ✅ 应用正常启动
- ✅ 主窗口自动显示
- ✅ 窗口内容正确加载（Vue 应用）
- ✅ 开发者工具自动打开（如果配置了）

### 2. 生产环境验证

```bash
# 构建生产版本
pnpm build

# 启动生产版本（根据平台）
pnpm build:mac    # macOS
pnpm build:win    # Windows
pnpm build:linux  # Linux
```

**预期结果**:
- ✅ 应用打包成功
- ✅ 启动应用后主窗口显示
- ✅ 窗口内容正确加载
- ✅ 托盘图标正常工作

### 3. 功能验证

#### 窗口显示
- [ ] 主窗口能正常显示
- [ ] 窗口尺寸正确（1200x800）
- [ ] 最小尺寸限制生效（800x600）
- [ ] ready-to-show 事件正确触发

#### 窗口管理
- [ ] 单例模式生效（无法创建多个主窗口）
- [ ] 窗口事件正确触发（CREATED, READY 等）
- [ ] 窗口可以正常最小化/最大化/关闭
- [ ] macOS 上点击 Dock 图标能重新打开窗口

#### 内容加载
- [ ] Vue 应用正确渲染
- [ ] 路由系统正常工作
- [ ] IPC 通信正常

## 技术要点

### 1. URL vs HtmlFile

Electron 窗口加载内容有两种方式：

```typescript
// 方式 1: 使用 URL（开发环境，HMR）
await window.loadURL('http://localhost:5173')

// 方式 2: 使用本地文件（生产环境）
await window.loadFile(join(__dirname, '../renderer/index.html'))
```

**关键规则**:
- 两者只能选其一，不能同时使用
- 开发环境优先使用 URL（支持热更新）
- 生产环境使用本地文件

### 2. WindowManager 初始化的重要性

WindowManager 的 `initialize()` 方法执行以下关键任务：

```typescript
async initialize(): Promise<void> {
  // 1. 设置初始化标志
  this.initialized = true

  // 2. 注册应用级生命周期事件
  if (this.options.autoManageLifecycle) {
    app.on('before-quit', () => {
      this.destroyAll()  // 自动清理所有窗口
    })
  }

  // 3. 日志记录
  console.log('[WindowManager] Initialized')
}
```

**如果不初始化**:
- ❌ 应用退出时窗口可能无法正确清理
- ❌ 可能导致资源泄漏
- ❌ 生命周期管理失效

### 3. 事件绑定顺序

正确的窗口创建流程：

```typescript
// 1. 创建 BrowserWindow 实例
const browserWindow = new BrowserWindow(options)

// 2. 创建窗口信息对象
const windowInstance = { id, type, window: browserWindow, ... }

// 3. 存储到管理器
this.windows.set(id, windowInstance)

// 4. 绑定事件监听器（必须在加载内容之前）
this.bindWindowEvents(windowInstance)

// 5. 加载内容（触发 ready-to-show 等事件）
await this.loadContent(windowInstance)

// 6. 可选：立即显示
if (options.showImmediately) {
  browserWindow.show()
}
```

**为什么顺序重要**:
- `ready-to-show` 事件在内容加载完成后触发
- 如果先加载内容再绑定事件，可能会错过事件
- 导致窗口永远不会显示

## 最佳实践

### 1. 使用 WindowManager 创建窗口

```typescript
// ✅ 推荐：使用 WindowManager
const window = await windowManager.create({
  type: WindowType.MAIN,
  singleton: true,
  width: 1200,
  height: 800,
  showImmediately: false
})

// ❌ 避免：直接使用 BrowserWindow
const window = new BrowserWindow({
  width: 1200,
  height: 800
})
```

### 2. 正确处理窗口显示

```typescript
// ✅ 方式 1: 使用 showImmediately
await windowManager.create({
  type: WindowType.MAIN,
  showImmediately: true  // 加载完成后立即显示
})

// ✅ 方式 2: 监听 ready-to-show
const instance = await windowManager.create({
  type: WindowType.MAIN,
  show: false,
  showImmediately: false
})

instance.window.on('ready-to-show', () => {
  instance.window.show()
})

// ❌ 避免：在创建时就 show: true
await windowManager.create({
  type: WindowType.MAIN,
  show: true  // 可能导致白屏闪烁
})
```

### 3. 初始化顺序

```typescript
app.whenReady().then(async () => {
  // 1. 应用级配置
  electronApp.setAppUserModelId('com.electron')

  // 2. 注册全局处理器
  registerIPCHandlers()

  // 3. 初始化管理器
  await windowManager.initialize()
  await threadManager.initialize()

  // 4. 创建窗口
  await createMainWindow()

  // 5. 注册事件监听
  windowManager.on(WindowEvent.CLOSE, handleClose)
})
```

## 故障排查

### 问题：窗口仍然不显示

**检查清单**:
1. [ ] WindowManager 是否已初始化？
2. [ ] URL 或 htmlFile 是否正确设置？
3. [ ] 是否有 JavaScript 错误？（检查开发者工具）
4. [ ] ready-to-show 事件是否触发？（添加日志）
5. [ ] 窗口是否在屏幕外？（检查位置）

**调试代码**:
```typescript
async function createMainWindow(): Promise<void> {
  console.log('Creating main window...')

  const instance = await windowManager.create({
    type: WindowType.MAIN,
    // ... 配置
  })

  console.log('Window created:', instance.id)

  instance.window.on('ready-to-show', () => {
    console.log('Window ready to show')
    instance.window.show()
  })

  instance.window.webContents.on('did-finish-load', () => {
    console.log('Content loaded')
  })

  instance.window.webContents.on('did-fail-load', (event, code, desc) => {
    console.error('Failed to load:', code, desc)
  })
}
```

### 问题：开发环境正常，生产环境不显示

**可能原因**:
1. htmlFile 路径不正确
2. 资源文件未正确打包
3. CSP（内容安全策略）限制

**检查步骤**:
```typescript
// 添加详细日志
private async loadContent(instance: WindowInstance): Promise<void> {
  const { window, options } = instance

  if (options.url) {
    console.log('Loading URL:', options.url)
    await window.loadURL(options.url)
  } else if (options.htmlFile) {
    console.log('Loading file:', options.htmlFile)
    // 检查文件是否存在
    const fs = require('fs')
    if (!fs.existsSync(options.htmlFile)) {
      console.error('HTML file not found:', options.htmlFile)
      return
    }
    await window.loadFile(options.htmlFile)
  }
}
```

## 相关文档

- [WindowManager API 文档](./MANAGERS.md#windowmanager---窗口管理器)
- [快速参考](./MANAGERS_QUICK_REFERENCE.md)
- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)

---

**修复日期**: 2025-10-23
**影响范围**: WindowManager, 主进程启动逻辑
**测试状态**: ✅ 待验证
