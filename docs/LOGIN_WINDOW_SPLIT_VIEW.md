# 登录窗口分屏效果实现

## 功能概述

使用 Electron 的 BrowserView 实现类似 VSCode 侧边栏的分屏效果,登录界面作为主窗口的子视图显示在右侧。

## 设计思路

### 为什么使用 BrowserView?

**之前的方案**:创建独立的 BrowserWindow,通过监听主窗口事件实现"粘性"跟随

- ❌ 两个独立窗口,无法真正实现分屏效果
- ❌ 需要复杂的位置计算和同步逻辑
- ❌ 用户体验不够流畅

**新方案**:使用 BrowserView 作为主窗口的子视图

- ✅ 真正的分屏效果,登录界面嵌入主窗口内部
- ✅ 自动跟随主窗口尺寸和位置变化
- ✅ 类似 VSCode 的侧边栏体验
- ✅ 代码更简洁,逻辑更清晰

## 技术实现

### 1. 核心变更

#### 从 BrowserWindow 改为 BrowserView

**之前**:

```typescript
private loginWindow: BrowserWindow | null = null
```

**现在**:

```typescript
private loginView: BrowserView | null = null
private mainWindow: BrowserWindow | null = null
private loginViewWidthRatio = 0.5  // 登录视图占主窗口宽度的50%
```

### 2. 创建登录视图

```typescript
// 获取主窗口
const mainWindowInstance = windowManager.findByType(WindowType.MAIN)
if (!mainWindowInstance) {
  throw new Error('主窗口不存在')
}
this.mainWindow = mainWindowInstance.window

// 创建 BrowserView 作为登录视图
this.loginView = new BrowserView({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: true
  }
})

// 将 BrowserView 添加到主窗口
this.mainWindow.addBrowserView(this.loginView)

// 设置 BrowserView 的位置和尺寸
this.updateLoginViewBounds()
```

### 3. 更新视图边界

```typescript
private updateLoginViewBounds(): void {
  if (!this.loginView || !this.mainWindow || this.mainWindow.isDestroyed()) return

  // 获取主窗口内容区域的尺寸
  const bounds = this.mainWindow.getContentBounds()

  // 计算登录视图的宽度(主窗口的50%)
  const loginViewWidth = Math.floor(bounds.width * this.loginViewWidthRatio)

  // 设置 BrowserView 的位置：占据主窗口右侧
  this.loginView.setBounds({
    x: bounds.width - loginViewWidth,  // 右侧对齐
    y: 0,
    width: loginViewWidth,
    height: bounds.height
  })
}
```

### 4. 监听主窗口事件

只需监听主窗口的尺寸变化事件,无需监听移动事件:

```typescript
private bindMainWindowEvents(): void {
  if (!this.mainWindow) return

  // 主窗口尺寸改变时，调整登录视图
  this.mainWindowListeners.resize = () => {
    this.updateLoginViewBounds()
  }
  this.mainWindow.on('resize', this.mainWindowListeners.resize)

  // 主窗口最大化时
  this.mainWindowListeners.maximize = () => {
    this.updateLoginViewBounds()
  }
  this.mainWindow.on('maximize', this.mainWindowListeners.maximize)

  // 主窗口取消最大化时
  this.mainWindowListeners.unmaximize = () => {
    this.updateLoginViewBounds()
  }
  this.mainWindow.on('unmaximize', this.mainWindowListeners.unmaximize)
}
```

### 5. 资源清理

```typescript
closeLoginWindow(): void {
  // 解绑主窗口事件
  this.unbindMainWindowEvents()

  // 移除 BrowserView
  if (this.loginView && this.mainWindow && !this.mainWindow.isDestroyed()) {
    this.mainWindow.removeBrowserView(this.loginView)
    // 销毁 webContents
    this.loginView.webContents.destroy()
    this.loginView = null
  }

  this.mainWindow = null
}
```

## 功能特性

### ✅ 真正的分屏效果

- 登录界面嵌入主窗口内部,不是独立窗口
- 类似 VSCode 的侧边栏,与主窗口融为一体
- 登录视图占据主窗口右侧 50% 的宽度

### ✅ 自动适配

- 主窗口尺寸改变时,登录视图自动调整
- 主窗口最大化/还原时,登录视图同步调整
- 无需手动计算位置,BrowserView 自动跟随

### ✅ 简洁的代码

- 不需要监听主窗口的 `move` 事件
- 不需要计算屏幕边界
- 不需要设置最小/最大尺寸限制
- 代码量减少约 40%

## 与之前方案的对比

### 独立窗口方案 (之前)

```typescript
// 创建独立的 BrowserWindow
this.loginWindow = new BrowserWindow({
  width: loginWindowWidth,
  height: loginWindowHeight,
  x: loginX,
  y: loginY,
  minWidth: mainBounds.width,
  minHeight: mainBounds.height,
  resizable: true,
  maximizable: false
})

// 需要监听多个事件
mainWindow.on('move', () => {
  /* 计算位置 */
})
mainWindow.on('resize', () => {
  /* 调整尺寸和位置 */
})
mainWindow.on('maximize', () => {
  /* 调整尺寸和位置 */
})
mainWindow.on('unmaximize', () => {
  /* 调整尺寸和位置 */
})
```

**问题**:

- ❌ 两个独立窗口,不是真正的分屏
- ❌ 需要复杂的位置计算
- ❌ 需要处理屏幕边界
- ❌ 代码复杂,维护困难

### BrowserView 方案 (现在)

```typescript
// 创建 BrowserView
this.loginView = new BrowserView({
  /* 配置 */
})
this.mainWindow.addBrowserView(this.loginView)

// 只需监听尺寸变化
this.mainWindow.on('resize', () => {
  this.updateLoginViewBounds()
})
this.mainWindow.on('maximize', () => {
  this.updateLoginViewBounds()
})
this.mainWindow.on('unmaximize', () => {
  this.updateLoginViewBounds()
})
```

**优势**:

- ✅ 真正的分屏效果
- ✅ 代码简洁清晰
- ✅ 自动跟随主窗口
- ✅ 维护成本低

## 用户体验

### 视觉效果

```
┌─────────────────────────────────────┐
│ 主窗口                               │
│ ┌─────────────┬─────────────────────┐│
│ │             │  登录界面(50%)      ││
│ │ 主内容区域   │                     ││
│ │ (50%)       │  ┌───────────────┐  ││
│ │             │  │  用户名输入    │  ││
│ │             │  ├───────────────┤  ││
│ │             │  │  密码输入      │  ││
│ │             │  ├───────────────┤  ││
│ │             │  │  [登录按钮]    │  ││
│ │             │  └───────────────┘  ││
│ │             │                     ││
│ └─────────────┴─────────────────────┘│
└─────────────────────────────────────┘
```

### 交互体验

1. **无缝集成**: 登录界面和主窗口完全融为一体
2. **自动适配**: 调整主窗口大小时,登录界面自动调整
3. **统一操作**: 只需要操作一个窗口,不会出现"分离"的情况
4. **类似IDE**: 类似 VSCode、WebStorm 等 IDE 的侧边栏体验

## 配置说明

### 调整登录视图宽度

通过修改 `loginViewWidthRatio` 可以调整登录视图的宽度比例:

```typescript
// 占据主窗口的 30%
private loginViewWidthRatio = 0.3

// 占据主窗口的 50% (默认)
private loginViewWidthRatio = 0.5

// 占据主窗口的 60%
private loginViewWidthRatio = 0.6
```

### 固定宽度模式

如果需要固定宽度而非比例,可以修改 `updateLoginViewBounds` 方法:

```typescript
private updateLoginViewBounds(): void {
  if (!this.loginView || !this.mainWindow || this.mainWindow.isDestroyed()) return

  const bounds = this.mainWindow.getContentBounds()
  const loginViewWidth = 600  // 固定宽度 600px

  this.loginView.setBounds({
    x: bounds.width - loginViewWidth,
    y: 0,
    width: loginViewWidth,
    height: bounds.height
  })
}
```

## 注意事项

### 1. BrowserView 的限制

- BrowserView 不能独立于父窗口存在
- BrowserView 的 webContents 没有 destroy 方法的类型定义,需要使用 `@ts-ignore`
- BrowserView 不支持某些 BrowserWindow 的特性(如独立的标题栏)

### 2. 资源清理

必须在关闭时:

1. 先从主窗口移除 BrowserView
2. 然后销毁 BrowserView 的 webContents
3. 最后将引用置为 null

```typescript
this.mainWindow.removeBrowserView(this.loginView)
this.loginView.webContents.destroy()
this.loginView = null
```

### 3. 开发者工具

BrowserView 的开发者工具需要以独立窗口模式打开:

```typescript
this.loginView.webContents.openDevTools({ mode: 'detach' })
```

## 测试建议

### 功能测试

1. **初始显示**: 验证登录视图是否正确显示在主窗口右侧
2. **尺寸调整**: 调整主窗口大小,验证登录视图是否同步调整
3. **最大化**: 最大化主窗口,验证登录视图是否正确填充
4. **还原**: 还原主窗口,验证登录视图是否正确调整
5. **关闭**: 关闭登录视图,验证资源是否正确释放

### 视觉测试

1. **比例验证**: 验证登录视图宽度是否为主窗口的 50%
2. **边界对齐**: 验证登录视图是否紧贴主窗口右侧
3. **高度匹配**: 验证登录视图高度是否与主窗口一致
4. **内容显示**: 验证登录表单是否完整显示

### 性能测试

1. **快速调整**: 快速调整主窗口大小,验证是否流畅
2. **资源占用**: 监控内存使用,验证是否有内存泄漏
3. **多次开关**: 多次打开关闭登录视图,验证资源释放

## 后续优化建议

### 1. 可调整宽度

添加拖动条,允许用户调整登录视图的宽度:

```typescript
// 添加一个可拖动的分隔条
// 用户可以拖动分隔条调整登录视图宽度
```

### 2. 动画效果

添加打开/关闭的动画效果:

```typescript
// 登录视图从右侧滑入/滑出
// 使用 CSS transition 或 Web Animations API
```

### 3. 保存用户偏好

记住用户调整的宽度:

```typescript
// 保存到本地存储
localStorage.setItem('loginViewWidth', width.toString())

// 下次打开时恢复
const savedWidth = localStorage.getItem('loginViewWidth')
```

### 4. 左右切换

支持将登录视图显示在左侧或右侧:

```typescript
// 左侧显示
this.loginView.setBounds({
  x: 0,
  y: 0,
  width: loginViewWidth,
  height: bounds.height
})

// 右侧显示(默认)
this.loginView.setBounds({
  x: bounds.width - loginViewWidth,
  y: 0,
  width: loginViewWidth,
  height: bounds.height
})
```

## 相关文档

- [Electron BrowserView 官方文档](https://www.electronjs.org/docs/latest/api/browser-view)
- [登录窗口粘性效果实现](./LOGIN_WINDOW_STICKY_EFFECT.md) - 之前的独立窗口方案

## 更新日志

- **2025-01-XX**: 从独立窗口方案重构为 BrowserView 分屏方案
  - 使用 BrowserView 替代 BrowserWindow
  - 实现真正的分屏效果
  - 简化代码逻辑
  - 提升用户体验
