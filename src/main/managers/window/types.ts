/**
 * 窗口管理器类型定义
 */

import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'

/**
 * 窗口类型枚举
 */
export enum WindowType {
  /** 主窗口 */
  MAIN = 'main',
  /** 设置窗口 */
  SETTINGS = 'settings',
  /** 关于窗口 */
  ABOUT = 'about',
  /** 悬浮窗口 */
  FLOATING = 'floating',
  /** 日志窗口 */
  LOG_VIEWER = 'log-viewer',
  /** 自定义窗口 */
  CUSTOM = 'custom'
}

/**
 * 窗口状态
 */
export enum WindowState {
  /** 创建中 */
  CREATING = 'creating',
  /** 已就绪 */
  READY = 'ready',
  /** 最小化 */
  MINIMIZED = 'minimized',
  /** 最大化 */
  MAXIMIZED = 'maximized',
  /** 全屏 */
  FULLSCREEN = 'fullscreen',
  /** 关闭中 */
  CLOSING = 'closing',
  /** 已关闭 */
  CLOSED = 'closed'
}

/**
 * 窗口配置选项
 */
export interface WindowOptions extends BrowserWindowConstructorOptions {
  /** 窗口类型 */
  type: WindowType
  /** 窗口 ID（可选，不提供则自动生成） */
  id?: string
  /** URL 路径 */
  url?: string
  /** HTML 文件路径 */
  htmlFile?: string
  /** 是否单例模式 */
  singleton?: boolean
  /** 父窗口 ID */
  parentId?: string
  /** 创建后是否立即显示 */
  showImmediately?: boolean
  /** 自定义数据 */
  data?: Record<string, unknown>
  /** 关闭时是否删除 */
  closeAndDelete?: boolean
}

/**
 * 窗口实例信息
 */
export interface WindowInstance {
  /** 窗口唯一标识 */
  id: string
  /** 窗口类型 */
  type: WindowType
  /** BrowserWindow 实例 */
  window: BrowserWindow
  /** 窗口状态 */
  state: WindowState
  /** 创建时间 */
  createdAt: number
  /** 窗口配置 */
  options: WindowOptions
  /** 自定义数据 */
  data?: Record<string, unknown>
}

/**
 * 窗口事件类型
 */
export enum WindowEvent {
  /** 窗口创建 */
  CREATED = 'window:created',
  /** 窗口就绪 */
  READY = 'window:ready',
  /** 窗口显示 */
  SHOW = 'window:show',
  /** 窗口隐藏 */
  HIDE = 'window:hide',
  /** 窗口最小化 */
  MINIMIZE = 'window:minimize',
  /** 窗口最大化 */
  MAXIMIZE = 'window:maximize',
  /** 窗口还原 */
  RESTORE = 'window:restore',
  /** 窗口关闭 */
  CLOSE = 'window:close',
  /** 窗口焦点 */
  FOCUS = 'window:focus',
  /** 窗口失焦 */
  BLUR = 'window:blur'
}

/**
 * 窗口事件回调
 */
export type WindowEventCallback = (window: WindowInstance, event?: Electron.Event) => void

/**
 * 窗口管理器配置
 */
export interface WindowManagerOptions {
  /** 是否启用开发者工具 */
  enableDevTools?: boolean
  /** 默认窗口配置 */
  defaultOptions?: Partial<BrowserWindowConstructorOptions>
  /** 是否自动管理生命周期 */
  autoManageLifecycle?: boolean
}

/**
 * 窗口查询条件
 */
export interface WindowQuery {
  /** 窗口 ID */
  id?: string
  /** 窗口类型 */
  type?: WindowType
  /** 窗口状态 */
  state?: WindowState
}
