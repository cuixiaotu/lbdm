/**
 * 使用管理器系统的主进程入口示例
 *
 * 这个文件展示了如何使用 WindowManager 和 ThreadManager
 * 替代传统的窗口和进程管理方式
 */

import { app, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIPCHandlers } from './ipc'
import { windowManager, threadManager, WindowType, ThreadType } from './managers'
import { getDatabase } from './database'
import { accountMonitorService } from './services/accountMonitorService'
import { loggerService } from './services/loggerService'
import { initAppTray, disposeAppTray } from './tray'
import { isWin } from './constant'

if (isWin) {
  app.commandLine.appendSwitch('wm-window-animations-disabled')
}

/**
 * 使用 WindowManager 创建主窗口
 */
async function createMainWindow(): Promise<void> {
  console.log('[Main] Creating main window...')
  console.log('[Main] is.dev:', is.dev)
  console.log('[Main] ELECTRON_RENDERER_URL:', process.env['ELECTRON_RENDERER_URL'])

  const mainWindowInstance = await windowManager.create({
    type: WindowType.MAIN,
    singleton: true, // 确保只有一个主窗口
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    transparent: false,
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: is.dev
    },
    // 修复 URL 和 htmlFile 逻辑
    url:
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? process.env['ELECTRON_RENDERER_URL']
        : undefined,
    htmlFile:
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? undefined
        : join(__dirname, '../renderer/index.html'),
    showImmediately: true // 修复：直接显示窗口
  })

  console.log('[Main] Window instance created:', mainWindowInstance.id)

  const mainWindow = mainWindowInstance.window

  // 监听加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Window content loaded')
  })

  // 监听加载失败事件
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Main] Window failed to load:', errorCode, errorDescription)
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  console.log('[Main] Main window setup complete')
}

/**
 * 初始化应用
 */
app.whenReady().then(async () => {
  // 设置应用用户模型 ID
  electronApp.setAppUserModelId('com.electron')

  // 开发工具快捷键
  app.on('browser-window-created', (_, window) => {
    if (is.dev) {
      optimizer.watchWindowShortcuts(window)
    }
  })

  // 初始化数据库
  try {
    getDatabase()
    console.log('[Main] Database initialized successfully')
  } catch (error) {
    console.error('[Main] Failed to initialize database:', error)
  }

  // 初始化账户缓存服务（必须在数据库初始化之后）
  try {
    import('./services/accountCacheService').then(async ({ accountCacheService }) => {
      await accountCacheService.initialize()
      const stats = accountCacheService.getStats()
      console.log(
        `[Main] Account cache initialized - Total: ${stats.total}, Valid: ${stats.valid}, Invalid: ${stats.invalid}`
      )
    })
  } catch (error) {
    console.error('[Main] Failed to initialize account cache:', error)
  }

  // 注册 IPC 处理器
  registerIPCHandlers()

  // 初始化窗口管理器（重要！）
  await windowManager.initialize()

  // 初始化线程管理器（如果需要使用线程）
  await threadManager.initialize()

  // 创建主窗口
  await createMainWindow()

  // 初始化系统托盘菜单
  initAppTray()

  // 获取主窗口并初始化服务
  const mainWindowInstance = windowManager.findByType(WindowType.MAIN)
  if (mainWindowInstance) {
    loggerService.initialize(mainWindowInstance.window)
    console.log('[Main] Logger service initialized')
  }

  // 注意：账户监控服务默认不启动，需要在监控列表中手动触发
  console.log(
    '[Main] Account monitor service initialized (not started, waiting for manual trigger)'
  )

  // macOS 激活事件
  app.on('activate', async () => {
    // 如果没有窗口，重新创建主窗口
    if (windowManager.count === 0) {
      await createMainWindow()
    }
  })
})

/**
 * 所有窗口关闭时
 * 注意：不在这里退出应用，因为主窗口只是隐藏了
 * 只有用户点击托盘菜单的"退出"才会真正退出
 */
app.on('window-all-closed', () => {
  console.log('[Main] All windows closed, but app continues running in tray')
  // 不调用 app.quit()，让应用继续运行
})

/**
 * 应用退出前清理资源
 */
app.on('before-quit', () => {
  console.log('Application quitting, cleaning up resources...')

  // 停止账户监控服务
  accountMonitorService.stop()
  console.log('[Main] Account monitor service stopped')

  // 恢复原始 console 方法
  loggerService.restore()
  console.log('[Main] Logger service restored')

  // 关闭数据库连接
  try {
    const db = getDatabase()
    db.close()
    console.log('[Main] Database connection closed')
  } catch (error) {
    console.error('[Main] Failed to close database:', error)
  }

  // 清理所有线程
  threadManager.dispose()

  // 清理所有窗口（会自动关闭所有窗口）
  windowManager.dispose()

  // 销毁托盘
  disposeAppTray()
})

/**
 * 示例：如何创建其他窗口
 * 可以在 IPC 处理器中调用
 */
export async function createSettingsWindow(): Promise<void> {
  const mainWindow = windowManager.findByType(WindowType.MAIN)

  await windowManager.create({
    type: WindowType.SETTINGS,
    singleton: true, // 只允许一个设置窗口
    width: 800,
    height: 600,
    resizable: false,
    modal: true,
    parent: mainWindow?.window,
    url:
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/#/configuration`
        : undefined,
    htmlFile:
      !is.dev || !process.env['ELECTRON_RENDERER_URL']
        ? join(__dirname, '../renderer/index.html#/configuration')
        : undefined,
    showImmediately: true
  })
}

/**
 * 示例：如何创建后台线程处理任务
 * 注意：需要先创建对应的 worker 文件
 */
export async function createDataProcessorThread(): Promise<string> {
  const thread = await threadManager.create({
    type: ThreadType.CUSTOM,
    modulePath: join(__dirname, '../workers/data-processor.js'),
    args: ['--mode=production'],
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production'
    },
    autoRestart: true,
    maxRestarts: 3,
    data: {
      createdAt: new Date().toISOString()
    }
  })

  // 更多线程通信的示例请参考 docs/MANAGERS.md

  return thread.id
}
