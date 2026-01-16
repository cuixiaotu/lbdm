/**
 * 窗口管理器
 * 统一管理应用中的所有窗口
 */

import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { EventEmitter } from 'events'
import {
  WindowType,
  WindowState,
  WindowEvent,
  type WindowOptions,
  type WindowInstance,
  type WindowEventCallback,
  type WindowManagerOptions,
  type WindowQuery
} from './types'

/**
 * 窗口管理器类
 */
export class WindowManager extends EventEmitter {
  /** 窗口实例映射表 */
  private windows: Map<string, WindowInstance> = new Map()

  /** 窗口计数器（用于生成唯一 ID） */
  private windowCounter = 0

  /** 管理器配置 */
  private options: WindowManagerOptions

  /** 是否已初始化 */
  private initialized = false

  constructor(options: WindowManagerOptions = {}) {
    super()
    this.options = {
      enableDevTools: is.dev,
      autoManageLifecycle: true,
      ...options
    }
  }

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[WindowManager] Already initialized')
      return
    }

    // 监听应用退出事件
    if (this.options.autoManageLifecycle) {
      app.on('before-quit', () => {
        console.log('[WindowManager] App is closing, destroying all windows...')
        this.destroyAll()
      })
    }

    this.initialized = true
    console.log('[WindowManager] Initialized')
  }

  /**
   * 创建窗口
   */
  async create(options: WindowOptions): Promise<WindowInstance> {
    // 检查单例模式
    if (options.singleton) {
      const existing = this.findByType(options.type)
      if (existing) {
        // 如果窗口已存在，聚焦并返回
        existing.window.focus()
        return existing
      }
    }

    // 生成窗口 ID
    const id = options.id || this.generateId(options.type)

    // 合并配置
    const windowOptions = {
      ...this.options.defaultOptions,
      ...options,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        ...options.webPreferences
      }
    }

    // 创建窗口实例
    const browserWindow = new BrowserWindow(windowOptions)

    // 创建窗口信息对象
    const windowInstance: WindowInstance = {
      id,
      type: options.type,
      window: browserWindow,
      state: WindowState.CREATING,
      createdAt: Date.now(),
      options,
      data: options.data
    }

    // 存储窗口实例
    this.windows.set(id, windowInstance)

    // 先绑定窗口事件（在加载内容之前）
    this.bindWindowEvents(windowInstance)

    // 加载内容
    await this.loadContent(windowInstance)

    // 触发创建事件
    this.emit(WindowEvent.CREATED, windowInstance)

    // 如果需要立即显示，等待 ready-to-show 事件
    if (options.showImmediately) {
      console.log('[WindowManager] showImmediately is true, waiting for ready-to-show...')
      // 如果已经就绪，直接显示
      if (windowInstance.state === WindowState.READY) {
        console.log('[WindowManager] Window already ready, showing immediately')
        browserWindow.show()
      } else {
        // 否则等待 ready-to-show 事件
        console.log('[WindowManager] Waiting for ready-to-show event')
        browserWindow.once('ready-to-show', () => {
          console.log('[WindowManager] ready-to-show received, showing window')
          browserWindow.show()
        })
      }
    }

    return windowInstance
  }

  /**
   * 绑定窗口事件
   */
  private bindWindowEvents(instance: WindowInstance): void {
    const { window, id } = instance

    console.log('[WindowManager] Binding events for window:', id)

    // 窗口就绪
    window.on('ready-to-show', () => {
      console.log('[WindowManager] ready-to-show event for window:', id)
      instance.state = WindowState.READY
      this.emit(WindowEvent.READY, instance)
    })

    // 窗口显示
    window.on('show', () => {
      this.emit(WindowEvent.SHOW, instance)
    })

    // 窗口隐藏
    window.on('hide', () => {
      this.emit(WindowEvent.HIDE, instance)
    })

    // 窗口最小化
    window.on('minimize', () => {
      instance.state = WindowState.MINIMIZED
      this.emit(WindowEvent.MINIMIZE, instance)
    })

    // 窗口最大化
    window.on('maximize', () => {
      instance.state = WindowState.MAXIMIZED
      this.emit(WindowEvent.MAXIMIZE, instance)
    })

    // 窗口还原
    window.on('unmaximize', () => {
      instance.state = WindowState.READY
      this.emit(WindowEvent.RESTORE, instance)
    })

    // 窗口关闭事件（用户点击关闭按钮）
    window.on('close', (event) => {
      console.log('[WindowManager] close event for window:', id, 'type:', instance.type)

      // 对于主窗口，阻止默认关闭行为，改为隐藏
      if (instance.type === WindowType.MAIN) {
        event.preventDefault()
        console.log('[WindowManager] Main window close prevented, hiding instead')
        window.hide()
        return
      }

      // 其他窗口：发射事件给监听器处理（如 tray 中的日志窗口清理逻辑）
      this.emit(WindowEvent.CLOSE, instance, event)
    })

    // 窗口已关闭事件（窗口实际被销毁时）
    window.on('closed', () => {
      console.log('[WindowManager] closed event for window:', id)
      instance.state = WindowState.CLOSED
      // 注意：这里不再发射 CLOSE 事件，避免与 close 事件重复

      // 如果设置了 closeAndDelete 或者不是主窗口，则从管理器中删除
      if (instance.options.closeAndDelete || instance.type !== WindowType.MAIN) {
        this.windows.delete(id)
      }
    })

    // 窗口聚焦
    window.on('focus', () => {
      this.emit(WindowEvent.FOCUS, instance)
    })

    // 窗口失焦
    window.on('blur', () => {
      this.emit(WindowEvent.BLUR, instance)
    })

    // 开发者工具
    if (this.options.enableDevTools) {
      window.webContents.openDevTools()
    }
  }

  /**
   * 加载窗口内容
   */
  private async loadContent(instance: WindowInstance): Promise<void> {
    const { window, options } = instance

    console.log('[WindowManager] Loading content for window:', instance.id)
    console.log('[WindowManager] URL option:', options.url)
    console.log('[WindowManager] HTML file option:', options.htmlFile)

    if (options.url) {
      console.log('[WindowManager] Loading URL:', options.url)
      await window.loadURL(options.url)
      console.log('[WindowManager] URL loaded successfully')
    } else if (options.htmlFile) {
      console.log('[WindowManager] Loading HTML file:', options.htmlFile)
      await window.loadFile(options.htmlFile)
      console.log('[WindowManager] HTML file loaded successfully')
    } else if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      console.log('[WindowManager] Loading dev URL:', process.env['ELECTRON_RENDERER_URL'])
      await window.loadURL(process.env['ELECTRON_RENDERER_URL'])
      console.log('[WindowManager] Dev URL loaded successfully')
    } else {
      const defaultPath = join(__dirname, '../renderer/index.html')
      console.log('[WindowManager] Loading default HTML file:', defaultPath)
      await window.loadFile(defaultPath)
      console.log('[WindowManager] Default HTML file loaded successfully')
    }
  }

  /**
   * 获取窗口实例
   */
  get(id: string): WindowInstance | undefined {
    return this.windows.get(id)
  }

  /**
   * 根据类型查找窗口
   */
  findByType(type: WindowType): WindowInstance | undefined {
    return Array.from(this.windows.values()).find((w) => w.type === type)
  }

  /**
   * 查询窗口
   */
  find(query: WindowQuery): WindowInstance[] {
    return Array.from(this.windows.values()).filter((window) => {
      if (query.id && window.id !== query.id) return false
      if (query.type && window.type !== query.type) return false
      if (query.state && window.state !== query.state) return false
      return true
    })
  }

  /**
   * 获取所有窗口
   */
  getAll(): WindowInstance[] {
    return Array.from(this.windows.values())
  }

  /**
   * 销毁窗口
   */
  destroy(id: string): boolean {
    const instance = this.windows.get(id)
    if (!instance) {
      return false
    }

    instance.state = WindowState.CLOSING
    instance.window.destroy()
    this.windows.delete(id)
    return true
  }

  /**
   * 销毁所有窗口
   */
  destroyAll(): void {
    Array.from(this.windows.keys()).forEach((id) => {
      this.destroy(id)
    })
  }

  /**
   * 显示窗口
   */
  show(id: string): boolean {
    const instance = this.windows.get(id)
    if (!instance) return false

    instance.window.show()
    return true
  }

  /**
   * 隐藏窗口
   */
  hide(id: string): boolean {
    const instance = this.windows.get(id)
    if (!instance) return false

    instance.window.hide()
    return true
  }

  /**
   * 聚焦窗口
   */
  focus(id: string): boolean {
    const instance = this.windows.get(id)
    if (!instance) return false

    instance.window.focus()
    return true
  }

  /**
   * 最小化窗口
   */
  minimize(id: string): boolean {
    const instance = this.windows.get(id)
    if (!instance) return false

    instance.window.minimize()
    return true
  }

  /**
   * 最大化窗口
   */
  maximize(id: string): boolean {
    const instance = this.windows.get(id)
    if (!instance) return false

    if (instance.window.isMaximized()) {
      instance.window.unmaximize()
    } else {
      instance.window.maximize()
    }
    return true
  }

  /**
   * 向窗口发送消息
   */
  sendMessage(id: string, channel: string, ...args: unknown[]): boolean {
    const instance = this.windows.get(id)
    if (!instance) return false

    instance.window.webContents.send(channel, ...args)
    return true
  }

  /**
   * 广播消息到所有窗口
   */
  broadcast(channel: string, ...args: unknown[]): void {
    this.windows.forEach((instance) => {
      instance.window.webContents.send(channel, ...args)
    })
  }

  /**
   * 注册窗口事件监听器
   */
  on(event: WindowEvent, callback: WindowEventCallback): this {
    return super.on(event, callback)
  }

  /**
   * 移除窗口事件监听器
   */
  off(event: WindowEvent, callback: WindowEventCallback): this {
    return super.off(event, callback)
  }

  /**
   * 生成窗口 ID
   */
  private generateId(type: WindowType): string {
    return `${type}-${++this.windowCounter}-${Date.now()}`
  }

  /**
   * 获取窗口数量
   */
  get count(): number {
    return this.windows.size
  }

  /**
   * 检查是否有窗口
   */
  get hasWindows(): boolean {
    return this.windows.size > 0
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.destroyAll()
    this.removeAllListeners()
    this.initialized = false
  }
}

// 导出单例
export const windowManager = new WindowManager()
