/**
 * 日志服务
 * 收集应用中的所有日志并通过 IPC 转发到渲染进程
 */

import { BrowserWindow } from 'electron'

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 日志唯一ID */
  id: string
  /** 时间戳 */
  timestamp: number
  /** 日志级别 */
  level: LogLevel
  /** 日志消息 */
  message: string
  /** 附加数据 */
  data?: unknown
  /** 来源 */
  source?: string
}

/**
 * 日志服务类
 */
class LoggerService {
  private logs: LogEntry[] = []
  private maxLogs = 10000 // 最多保存10000条日志
  private logId = 0
  private windows: Set<BrowserWindow> = new Set() // 支持多个窗口

  // 原始的 console 方法
  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  }

  /**
   * 初始化日志服务
   */
  initialize(mainWindow: BrowserWindow): void {
    this.addWindow(mainWindow)
    this.interceptConsole()
    this.log(LogLevel.INFO, '日志服务已启动', { maxLogs: this.maxLogs })
  }

  /**
   * 添加窗口到日志接收列表
   */
  addWindow(window: BrowserWindow): void {
    this.windows.add(window)

    // 窗口关闭时自动移除
    window.on('closed', () => {
      this.windows.delete(window)
    })

    console.log(`[LoggerService] Window added, total windows: ${this.windows.size}`)
  }

  /**
   * 移除窗口从日志接收列表
   */
  removeWindow(window: BrowserWindow): void {
    this.windows.delete(window)
    console.log(`[LoggerService] Window removed, total windows: ${this.windows.size}`)
  }

  /**
   * 拦截 console 方法
   */
  private interceptConsole(): void {
    console.log = (...args: unknown[]) => {
      this.originalConsole.log(...args)
      const message = this.formatMessage(args)
      // 直接使用原始消息，不再添加时间戳和级别标签
      this.sendRawLog(message)
    }

    console.info = (...args: unknown[]) => {
      this.originalConsole.info(...args)
      const message = this.formatMessage(args)
      this.sendRawLog(message)
    }

    console.warn = (...args: unknown[]) => {
      this.originalConsole.warn(...args)
      const message = this.formatMessage(args)
      this.sendRawLog(message)
    }

    console.error = (...args: unknown[]) => {
      this.originalConsole.error(...args)
      const message = this.formatMessage(args)
      this.sendRawLog(message)
    }

    console.debug = (...args: unknown[]) => {
      this.originalConsole.debug(...args)
      const message = this.formatMessage(args)
      this.sendRawLog(message)
    }
  }

  /**
   * 格式化消息
   */
  private formatMessage(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') {
          return arg
        }
        if (arg instanceof Error) {
          return `${arg.message}\n${arg.stack}`
        }
        try {
          return JSON.stringify(arg, null, 2)
        } catch {
          return String(arg)
        }
      })
      .join(' ')
  }

  /**
   * 添加日志
   */
  log(level: LogLevel, message: string, data?: unknown, source?: string): void {
    // 防御性编程：确保 message 有值
    if (!message) {
      message = '[Empty message]'
    }

    const entry: LogEntry = {
      id: `log-${this.logId++}`,
      timestamp: Date.now(), // 总是使用当前时间
      level: level || LogLevel.INFO, // 默认 INFO 级别
      message,
      data,
      source
    }

    this.logs.push(entry)

    // 超过最大数量时删除最旧的日志
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 实时推送到渲染进程
    this.sendLogToRenderer(entry)
  }

  /**
   * 发送日志到渲染进程
   */
  private sendLogToRenderer(entry: LogEntry): void {
    this.windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('logger:new-log', entry)
      }
    })
  }

  /**
   * 发送原始日志（不添加格式化）
   */
  private sendRawLog(message: string): void {
    this.windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('logger:raw-log', message)
      }
    })
  }

  /**
   * 获取所有日志
   */
  getAllLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = []
    this.windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('logger:clear')
      }
    })
  }

  /**
   * 恢复原始 console 方法
   */
  restore(): void {
    console.log = this.originalConsole.log
    console.info = this.originalConsole.info
    console.warn = this.originalConsole.warn
    console.error = this.originalConsole.error
    console.debug = this.originalConsole.debug
  }
}

export const loggerService = new LoggerService()
