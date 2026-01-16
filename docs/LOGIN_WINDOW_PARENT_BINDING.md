# 登录窗口父子窗口绑定实现

## 概述

登录窗口通过设置 `parent` 属性实现与主窗口的自动联动，窗口会自动跟随父窗口移动和调整。

## 核心实现

### 1. 设置父窗口

```typescript
this.loginWindow = new BrowserWindow({
  width: this.loginWindowWidth,
  height: updatedMainBounds.height,
  x: updatedMainBounds.x + updatedMainBounds.width,
  y: updatedMainBounds.y,
  parent: mainWindow, // 关键：设置父窗口，实现自动跟随
  frame: true,
  show: false,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: true
  }
})
```

### 2. 智能空间调整

在创建登录窗口前，检查屏幕右侧空间是否足够：

```typescript
// 检查右侧空间
const rightSpace = displayBounds.x + displayBounds.width - (mainBounds.x + mainBounds.width)
const needsAdjustment = rightSpace < this.loginWindowWidth + 20

if (needsAdjustment) {
  // 优先左移主窗口
  // 如果左侧空间不足，则缩小主窗口宽度
}
```

### 3. 恢复主窗口状态

关闭登录窗口时，恢复主窗口原始位置和尺寸：

```typescript
closeLoginWindow(): void {
  if (this.loginWindow && !this.loginWindow.isDestroyed()) {
    const mainWindow = this.loginWindow.getParentWindow()
    this.loginWindow.close()

    if (this.originalMainWindowBounds && mainWindow) {
      mainWindow.setBounds(this.originalMainWindowBounds, true) // 启用动画
    }
  }
}
```

## 优势

1. **无需手动监听事件** - `parent` 属性让子窗口自动跟随父窗口
2. **平滑动画** - `setBounds(..., true)` 启用 Electron 内置动画
3. **智能布局** - 自动调整主窗口以腾出空间
4. **状态恢复** - 关闭时恢复主窗口原始状态

## 参考

基于 deepchat 项目的 searchManager.ts 实现方式。
