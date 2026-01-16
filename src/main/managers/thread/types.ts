/**
 * 线程管理器类型定义
 */

import type { UtilityProcess } from 'electron'

/**
 * 线程类型枚举
 */
export enum ThreadType {
  /** 数据处理线程 */
  DATA_PROCESSOR = 'data-processor',
  /** 文件处理线程 */
  FILE_PROCESSOR = 'file-processor',
  /** 网络请求线程 */
  NETWORK_WORKER = 'network-worker',
  /** SSH 连接线程 */
  SSH_WORKER = 'ssh-worker',
  /** 账户监控线程 */
  ACCOUNT_MONITOR = 'account-monitor',
  /** 自定义线程 */
  CUSTOM = 'custom'
}

/**
 * 线程状态
 */
export enum ThreadState {
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 运行中 */
  RUNNING = 'running',
  /** 暂停中 */
  PAUSED = 'paused',
  /** 停止中 */
  STOPPING = 'stopping',
  /** 已停止 */
  STOPPED = 'stopped',
  /** 错误 */
  ERROR = 'error'
}

/**
 * 线程优先级
 */
export enum ThreadPriority {
  /** 低优先级 */
  LOW = 'low',
  /** 普通优先级 */
  NORMAL = 'normal',
  /** 高优先级 */
  HIGH = 'high',
  /** 紧急优先级 */
  CRITICAL = 'critical'
}

/**
 * 线程配置选项
 */
export interface ThreadOptions {
  /** 线程类型 */
  type: ThreadType
  /** 线程 ID（可选，不提供则自动生成） */
  id?: string
  /** 线程脚本路径 */
  modulePath: string
  /** 线程参数 */
  args?: string[]
  /** 环境变量 */
  env?: Record<string, string>
  /** 优先级 */
  priority?: ThreadPriority
  /** 是否自动重启 */
  autoRestart?: boolean
  /** 最大重启次数 */
  maxRestarts?: number
  /** 超时时间（毫秒） */
  timeout?: number
  /** 自定义数据 */
  data?: Record<string, unknown>
}

/**
 * 线程实例信息
 */
export interface ThreadInstance {
  /** 线程唯一标识 */
  id: string
  /** 线程类型 */
  type: ThreadType
  /** UtilityProcess 实例 */
  process: UtilityProcess
  /** 线程状态 */
  state: ThreadState
  /** 创建时间 */
  createdAt: number
  /** 启动时间 */
  startedAt?: number
  /** 停止时间 */
  stoppedAt?: number
  /** 重启次数 */
  restartCount: number
  /** 线程配置 */
  options: ThreadOptions
  /** 最后错误 */
  lastError?: Error
  /** 自定义数据 */
  data?: Record<string, unknown>
}

/**
 * 线程事件类型
 */
export enum ThreadEvent {
  /** 线程创建 */
  CREATED = 'thread:created',
  /** 线程启动 */
  STARTED = 'thread:started',
  /** 线程消息 */
  MESSAGE = 'thread:message',
  /** 线程错误 */
  ERROR = 'thread:error',
  /** 线程停止 */
  STOPPED = 'thread:stopped',
  /** 线程重启 */
  RESTARTED = 'thread:restarted'
}

/**
 * 线程消息
 */
export interface ThreadMessage<T = unknown> {
  /** 消息类型 */
  type: string
  /** 消息数据 */
  data: T
  /** 时间戳 */
  timestamp: number
}

/**
 * 线程事件回调
 */
export type ThreadEventCallback = (thread: ThreadInstance, ...args: unknown[]) => void

/**
 * 线程管理器配置
 */
export interface ThreadManagerOptions {
  /** 最大线程数 */
  maxThreads?: number
  /** 默认优先级 */
  defaultPriority?: ThreadPriority
  /** 是否自动清理已停止的线程 */
  autoCleanup?: boolean
  /** 是否启用日志 */
  enableLogging?: boolean
}

/**
 * 线程查询条件
 */
export interface ThreadQuery {
  /** 线程 ID */
  id?: string
  /** 线程类型 */
  type?: ThreadType
  /** 线程状态 */
  state?: ThreadState
  /** 优先级 */
  priority?: ThreadPriority
}

/**
 * 线程统计信息
 */
export interface ThreadStats {
  /** 总线程数 */
  total: number
  /** 运行中的线程数 */
  running: number
  /** 已停止的线程数 */
  stopped: number
  /** 错误的线程数 */
  error: number
  /** 按类型分组 */
  byType: Record<ThreadType, number>
  /** 按状态分组 */
  byState: Record<ThreadState, number>
}
