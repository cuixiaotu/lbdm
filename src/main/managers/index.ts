/**
 * 统一的管理器模块导出
 */

// 窗口管理器
export {
  WindowManager,
  windowManager,
  WindowType,
  WindowState,
  WindowEvent,
  type WindowOptions,
  type WindowInstance,
  type WindowEventCallback,
  type WindowManagerOptions,
  type WindowQuery
} from './window'

// 线程管理器
export {
  ThreadManager,
  threadManager,
  ThreadType,
  ThreadState,
  ThreadEvent,
  ThreadPriority,
  type ThreadOptions,
  type ThreadInstance,
  type ThreadEventCallback,
  type ThreadManagerOptions,
  type ThreadQuery,
  type ThreadStats,
  type ThreadMessage
} from './thread'
