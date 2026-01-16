# 管理器系统实现总结

## 概述

本项目已成功实现了统一的窗口和线程管理系统,为未来的多窗口和多线程需求提供了完善的基础架构。

## 已完成的工作

### 1. 窗口管理器 (WindowManager)

**位置**: `src/main/managers/window/`

**文件结构**:
```
src/main/managers/window/
├── types.ts           # 类型定义
├── WindowManager.ts   # 核心实现
└── index.ts          # 模块导出
```

**核心功能**:
- ✅ 窗口创建和销毁
- ✅ 单例模式支持
- ✅ 窗口状态管理 (创建中、就绪、最小化、最大化等)
- ✅ 事件系统 (基于 EventEmitter)
- ✅ 窗口间通信 (sendMessage, broadcast)
- ✅ 生命周期自动管理
- ✅ 类型安全的 API

**窗口类型**:
- MAIN - 主窗口
- SETTINGS - 设置窗口
- ABOUT - 关于窗口
- FLOATING - 悬浮窗口
- CUSTOM - 自定义窗口

### 2. 线程管理器 (ThreadManager)

**位置**: `src/main/managers/thread/`

**文件结构**:
```
src/main/managers/thread/
├── types.ts           # 类型定义
├── ThreadManager.ts   # 核心实现
└── index.ts          # 模块导出
```

**核心功能**:
- ✅ 线程创建和停止
- ✅ 线程状态监控
- ✅ 自动重启机制
- ✅ 线程通信 (使用 postMessage)
- ✅ 优先级管理
- ✅ 统计信息收集
- ✅ 事件系统
- ✅ 类型安全的 API

**线程类型**:
- DATA_PROCESSOR - 数据处理
- FILE_PROCESSOR - 文件处理
- NETWORK_WORKER - 网络任务
- SSH_WORKER - SSH 任务
- CUSTOM - 自定义

**线程优先级**:
- LOW - 低优先级
- NORMAL - 普通优先级
- HIGH - 高优先级

### 3. 统一导出

**位置**: `src/main/managers/index.ts`

提供了统一的模块导出,方便其他模块使用:

```typescript
import {
  windowManager,
  threadManager,
  WindowType,
  ThreadType,
  WindowEvent,
  ThreadEvent
} from '@/main/managers'
```

### 4. 文档

#### MANAGERS.md
**位置**: `docs/MANAGERS.md`

详细的使用文档,包含:
- API 参考
- 使用示例
- 最佳实践
- 配置选项说明
- Worker 线程编写指南

#### index.with-managers.ts
**位置**: `src/main/index.with-managers.ts`

完整的集成示例,展示如何:
- 使用 WindowManager 创建主窗口
- 初始化 ThreadManager
- 监听窗口事件
- 创建设置窗口
- 创建后台线程
- 清理资源

## 技术亮点

### 1. 架构设计

- **单例模式**: WindowManager 和 ThreadManager 均导出单例实例
- **事件驱动**: 使用 EventEmitter 实现松耦合的事件系统
- **生命周期管理**: 自动管理窗口和线程的生命周期
- **状态机**: 清晰的状态转换逻辑

### 2. 类型安全

- 完整的 TypeScript 类型定义
- 泛型支持
- 严格的类型检查
- 类型映射和推断

### 3. 通信机制

- **窗口通信**: 支持单点发送和广播
- **线程通信**: 使用 Electron UtilityProcess 的 postMessage API
- **事件监听**: 统一的事件监听接口

### 4. 错误处理

- 完善的错误检查
- 自动重启机制 (线程)
- 资源泄漏防护
- 日志系统

## 使用指南

### 快速开始

1. **导入管理器**:
```typescript
import { windowManager, threadManager } from '@/main/managers'
```

2. **初始化** (在 app.whenReady() 中):
```typescript
await threadManager.initialize()
```

3. **创建窗口**:
```typescript
const mainWindow = await windowManager.create({
  type: WindowType.MAIN,
  singleton: true,
  width: 1200,
  height: 800,
  url: 'http://localhost:5173'
})
```

4. **创建线程**:
```typescript
const thread = await threadManager.create({
  type: ThreadType.DATA_PROCESSOR,
  modulePath: path.join(__dirname, '../workers/processor.js'),
  autoRestart: true
})
```

### 与现有代码集成

管理器系统与现有的 IPC 架构完全兼容:

- 可以与现有的 `src/main/ipc/handlers.ts` 配合使用
- 不影响现有的窗口创建逻辑
- 可以逐步迁移到新的管理器系统

如果要完全使用管理器系统,可以:
1. 将 `src/main/index.ts` 重命名为 `index.old.ts`
2. 将 `src/main/index.with-managers.ts` 重命名为 `index.ts`

## 最佳实践

### 1. 窗口管理

```typescript
// ✅ 好的做法：使用单例
await windowManager.create({
  type: WindowType.SETTINGS,
  singleton: true
})

// ✅ 好的做法：监听事件
windowManager.on(WindowEvent.CLOSE, (window) => {
  if (window.type === WindowType.MAIN) {
    app.quit()
  }
})

// ❌ 避免：手动管理 BrowserWindow
const window = new BrowserWindow({...})
```

### 2. 线程管理

```typescript
// ✅ 好的做法：设置自动重启
await threadManager.create({
  type: ThreadType.DATA_PROCESSOR,
  autoRestart: true,
  maxRestarts: 3
})

// ✅ 好的做法：使用优先级
await threadManager.create({
  type: ThreadType.SSH_WORKER,
  priority: ThreadPriority.HIGH
})

// ✅ 好的做法：监听线程消息
threadManager.on(ThreadEvent.MESSAGE, (thread, message) => {
  console.log('Thread message:', message)
})
```

### 3. 资源清理

```typescript
// ✅ 好的做法：在应用退出前清理
app.on('before-quit', () => {
  threadManager.dispose()
  windowManager.dispose()
})
```

## 性能考虑

- **线程数量限制**: 默认最大 10 个线程
- **窗口创建**: 支持延迟显示 (`showImmediately: false`)
- **自动清理**: 窗口关闭后自动清理资源
- **单例模式**: 避免重复创建相同类型的窗口

## 未来扩展

### 可能的改进方向

1. **窗口布局管理**
   - 保存和恢复窗口位置
   - 多显示器支持
   - 窗口组管理

2. **线程池**
   - 实现线程池模式
   - 任务队列管理
   - 负载均衡

3. **性能监控**
   - CPU 使用率监控
   - 内存使用率监控
   - 性能指标收集

4. **持久化**
   - 窗口状态持久化
   - 线程配置持久化

## 相关文件

- `src/main/managers/` - 管理器源代码
- `docs/MANAGERS.md` - 详细使用文档
- `src/main/index.with-managers.ts` - 集成示例
- `docs/IPC_MANAGEMENT.md` - IPC 通信文档

## 维护说明

- 所有类型定义在 `types.ts` 文件中
- 核心实现在对应的 Manager 类中
- 通过 `index.ts` 统一导出
- 事件常量使用枚举定义
- 遵循单一职责原则

---

**创建日期**: 2025-10-23
**版本**: 1.0.0
**维护者**: 开发团队
