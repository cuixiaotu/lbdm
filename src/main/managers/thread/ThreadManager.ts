/**
 * 线程管理器
 * 统一管理应用中的所有后台线程（Utility Process）
 */

import { utilityProcess, app } from 'electron'
import { EventEmitter } from 'events'
import {
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
} from './types'

/**
 * 线程管理器类
 */
export class ThreadManager extends EventEmitter {
  /** 线程实例映射表 */
  private threads: Map<string, ThreadInstance> = new Map()

  /** 线程计数器（用于生成唯一 ID） */
  private threadCounter = 0

  /** 管理器配置 */
  private options: ThreadManagerOptions

  /** 是否已初始化 */
  private initialized = false

  constructor(options: ThreadManagerOptions = {}) {
    super()
    this.options = {
      maxThreads: 10,
      defaultPriority: ThreadPriority.NORMAL,
      autoCleanup: true,
      enableLogging: true,
      ...options
    }
  }

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[ThreadManager] Already initialized')
      return
    }

    // 监听应用退出事件
    app.on('before-quit', () => {
      this.stopAll()
    })

    this.initialized = true
    this.log('Initialized')
  }

  /**
   * 创建并启动线程
   */
  async create(options: ThreadOptions): Promise<ThreadInstance> {
    // 检查线程数量限制
    if (this.threads.size >= this.options.maxThreads!) {
      throw new Error(`Maximum thread limit (${this.options.maxThreads}) reached`)
    }

    // 生成线程 ID
    const id = options.id || this.generateId(options.type)

    // 检查是否已存在
    if (this.threads.has(id)) {
      throw new Error(`Thread with id '${id}' already exists`)
    }

    // 创建 UtilityProcess
    const process = utilityProcess.fork(options.modulePath, options.args, {
      env: options.env,
      stdio: 'pipe'
    })

    // 创建线程实例
    const instance: ThreadInstance = {
      id,
      type: options.type,
      process,
      state: ThreadState.INITIALIZING,
      createdAt: Date.now(),
      restartCount: 0,
      options: {
        priority: this.options.defaultPriority,
        autoRestart: false,
        maxRestarts: 3,
        ...options
      },
      data: options.data
    }

    // 存储线程实例
    this.threads.set(id, instance)

    // 绑定线程事件
    this.bindThreadEvents(instance)

    // 更新状态为运行中
    instance.state = ThreadState.RUNNING
    instance.startedAt = Date.now()

    // 触发创建事件
    this.emit(ThreadEvent.CREATED, instance)
    this.emit(ThreadEvent.STARTED, instance)

    this.log(`Thread '${id}' created and started`)

    return instance
  }

  /**
   * 绑定线程事件
   */
  private bindThreadEvents(instance: ThreadInstance): void {
    const { process, id } = instance

    // 监听 postMessage 消息
    process.on('message', (message) => {
      const threadMessage: ThreadMessage = {
        type: 'message',
        data: message,
        timestamp: Date.now()
      }
      this.emit(ThreadEvent.MESSAGE, instance, threadMessage)
    })

    // 监听标准输出（用于日志）
    if (process.stdout) {
      process.stdout.on('data', (data) => {
        const message: ThreadMessage = {
          type: 'stdout',
          data: data.toString(),
          timestamp: Date.now()
        }
        this.emit(ThreadEvent.MESSAGE, instance, message)
      })
    }

    // 监听标准错误（用于日志）
    if (process.stderr) {
      process.stderr.on('data', (data) => {
        const message: ThreadMessage = {
          type: 'stderr',
          data: data.toString(),
          timestamp: Date.now()
        }
        this.emit(ThreadEvent.MESSAGE, instance, message)
        this.log(`Thread '${id}' stderr: ${data.toString()}`, 'error')
      })
    }

    // 监听进程退出
    process.on('exit', (code) => {
      this.log(`Thread '${id}' exited with code ${code}`)

      if (instance.state !== ThreadState.STOPPING) {
        // 非正常退出
        instance.state = ThreadState.ERROR
        instance.stoppedAt = Date.now()

        // 检查是否需要自动重启
        if (
          instance.options.autoRestart &&
          instance.restartCount < instance.options.maxRestarts!
        ) {
          this.restart(id)
        } else {
          this.emit(ThreadEvent.STOPPED, instance)
        }
      } else {
        // 正常停止
        instance.state = ThreadState.STOPPED
        instance.stoppedAt = Date.now()
        this.emit(ThreadEvent.STOPPED, instance)
      }

      // 自动清理
      if (this.options.autoCleanup) {
        setTimeout(() => {
          if (instance.state === ThreadState.STOPPED) {
            this.threads.delete(id)
          }
        }, 5000)
      }
    })
  }

  /**
   * 获取线程实例
   */
  get(id: string): ThreadInstance | undefined {
    return this.threads.get(id)
  }

  /**
   * 根据类型查找线程
   */
  findByType(type: ThreadType): ThreadInstance[] {
    return Array.from(this.threads.values()).filter(t => t.type === type)
  }

  /**
   * 查询线程
   */
  find(query: ThreadQuery): ThreadInstance[] {
    return Array.from(this.threads.values()).filter(thread => {
      if (query.id && thread.id !== query.id) return false
      if (query.type && thread.type !== query.type) return false
      if (query.state && thread.state !== query.state) return false
      if (query.priority && thread.options.priority !== query.priority) return false
      return true
    })
  }

  /**
   * 获取所有线程
   */
  getAll(): ThreadInstance[] {
    return Array.from(this.threads.values())
  }

  /**
   * 停止线程
   */
  stop(id: string): boolean {
    const instance = this.threads.get(id)
    if (!instance) {
      return false
    }

    if (instance.state === ThreadState.STOPPED || instance.state === ThreadState.STOPPING) {
      return false
    }

    instance.state = ThreadState.STOPPING
    instance.process.kill()

    this.log(`Thread '${id}' stopping`)
    return true
  }

  /**
   * 停止所有线程
   */
  stopAll(): void {
    Array.from(this.threads.keys()).forEach(id => {
      this.stop(id)
    })
  }

  /**
   * 重启线程
   */
  async restart(id: string): Promise<ThreadInstance | undefined> {
    const instance = this.threads.get(id)
    if (!instance) {
      return undefined
    }

    // 停止当前线程
    this.stop(id)

    // 等待停止完成
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 移除旧实例
    this.threads.delete(id)

    // 增加重启计数
    const options = {
      ...instance.options,
      id: instance.id
    }

    // 创建新实例
    const newInstance = await this.create(options)
    newInstance.restartCount = instance.restartCount + 1

    this.emit(ThreadEvent.RESTARTED, newInstance)
    this.log(`Thread '${id}' restarted (count: ${newInstance.restartCount})`)

    return newInstance
  }

  /**
   * 向线程发送消息
   */
  sendMessage(id: string, message: ThreadMessage): boolean {
    const instance = this.threads.get(id)
    if (!instance || instance.state !== ThreadState.RUNNING) {
      return false
    }

    try {
      instance.process.postMessage(message)
      return true
    } catch (error) {
      this.log(`Failed to send message to thread '${id}': ${error}`, 'error')
      return false
    }
  }

  /**
   * 获取线程统计信息
   */
  getStats(): ThreadStats {
    const threads = Array.from(this.threads.values())

    const stats: ThreadStats = {
      total: threads.length,
      running: 0,
      stopped: 0,
      error: 0,
      byType: {} as Record<ThreadType, number>,
      byState: {} as Record<ThreadState, number>
    }

    threads.forEach(thread => {
      // 按状态统计
      if (thread.state === ThreadState.RUNNING) stats.running++
      if (thread.state === ThreadState.STOPPED) stats.stopped++
      if (thread.state === ThreadState.ERROR) stats.error++

      // 按类型分组
      stats.byType[thread.type] = (stats.byType[thread.type] || 0) + 1

      // 按状态分组
      stats.byState[thread.state] = (stats.byState[thread.state] || 0) + 1
    })

    return stats
  }

  /**
   * 注册线程事件监听器
   */
  on(event: ThreadEvent, callback: ThreadEventCallback): this {
    return super.on(event, callback)
  }

  /**
   * 移除线程事件监听器
   */
  off(event: ThreadEvent, callback: ThreadEventCallback): this {
    return super.off(event, callback)
  }

  /**
   * 生成线程 ID
   */
  private generateId(type: ThreadType): string {
    return `${type}-${++this.threadCounter}-${Date.now()}`
  }

  /**
   * 日志输出
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.options.enableLogging) return

    const prefix = '[ThreadManager]'
    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`)
        break
      case 'warn':
        console.warn(`${prefix} ${message}`)
        break
      case 'error':
        console.error(`${prefix} ${message}`)
        break
    }
  }

  /**
   * 获取线程数量
   */
  get count(): number {
    return this.threads.size
  }

  /**
   * 检查是否有线程
   */
  get hasThreads(): boolean {
    return this.threads.size > 0
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopAll()
    this.threads.clear()
    this.removeAllListeners()
    this.initialized = false
  }
}

// 导出单例
export const threadManager = new ThreadManager()
