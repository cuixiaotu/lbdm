import {
  app,
  Menu,
  MenuItemConstructorOptions,
  Tray,
  nativeImage,
  Notification,
  dialog,
  nativeTheme
} from 'electron'
import icon from '../../../resources/icon.png?asset'
import fs from 'fs'
import path from 'path'
import { windowManager, WindowType } from '../managers'
import { liveRoomMonitorQueueService } from '../services/liveRoomMonitorQueueService'
import { accountCacheService } from '../services/accountCacheService'
import { liveRoomService } from '../services/liveRoomService'
import type { AccountRow } from '../database/tables/accounts'
import { configManager } from '../config/configManager'
import { connectionTestService } from '../services/connectionTestService'
import { loggerService } from '../services/loggerService'
import { isMac, titleBarOverlayDark, titleBarOverlayLight } from '../constant'
import { ipcMain } from 'electron/main'

let tray: Tray | null = null

export function initAppTray(): void {
  if (tray) {
    console.log('[Tray] Tray already exists, skipping initialization')
    return
  }

  console.log('[Tray] Initializing tray...')
  console.log('[Tray] Platform:', process.platform)
  console.log('[Tray] NODE_ENV:', process.env.NODE_ENV)

  try {
    let trayImage: Electron.NativeImage

    if (process.platform === 'darwin') {
      // 在macOS上，尝试使用SVG图标，如果不存在则使用PNG
      const svgPath = path.resolve(__dirname, '../../../resources/tray-icon.svg')
      const iconPath = icon as unknown as string

      console.log('[Tray] SVG path:', svgPath)
      console.log('[Tray] PNG path:', iconPath)
      console.log('[Tray] SVG exists:', fs.existsSync(svgPath))
      console.log('[Tray] PNG exists:', fs.existsSync(iconPath))

      if (fs.existsSync(svgPath)) {
        // 使用SVG图标
        trayImage = nativeImage.createFromPath(svgPath)
        console.log('[Tray] Using SVG icon')
      } else {
        // 使用PNG图标并调整大小
        const image = nativeImage.createFromPath(iconPath)
        console.log('[Tray] Original image size:', image.getSize())

        // 调整图标大小为标准托盘图标尺寸
        trayImage = image.resize({ width: 16, height: 16 })
        console.log('[Tray] Resized image size:', trayImage.getSize())
      }

      console.log('[Tray] Image empty:', trayImage.isEmpty())

      // 在开发环境下不使用模板图像，确保图标可见
      const isDev = process.env.NODE_ENV !== 'production'
      if (!isDev) {
        trayImage.setTemplateImage(true)
        console.log('[Tray] Template image enabled for production')
      }

      tray = new Tray(trayImage)
    } else {
      // 非macOS平台
      const iconPath = icon as unknown as string
      tray = new Tray(iconPath)
    }

    tray.setToolTip(app.getName())
    console.log('[Tray] Tooltip set to:', app.getName())

    const contextMenu = Menu.buildFromTemplate(buildTemplate())
    tray.setContextMenu(contextMenu)
    console.log('[Tray] Context menu set')

    // 左键点击也弹出菜单，便于发现
    tray.on('click', () => {
      console.log('[Tray] Tray clicked')
      updateTrayMenu()
      tray?.popUpContextMenu()
    })

    // 添加右键点击事件
    tray.on('right-click', () => {
      console.log('[Tray] Tray right-clicked')
      updateTrayMenu()
      tray?.popUpContextMenu()
    })

    // 双击显示主窗口
    tray.on('double-click', () => {
      console.log('[Tray] Tray double-clicked')
      const main = windowManager.findByType(WindowType.MAIN)
      const win = main?.window
      if (win) {
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      }
    })

    // 监听监控队列变化，自动更新托盘菜单
    liveRoomMonitorQueueService.on('roomAdded', () => {
      console.log('[Tray] Room added to queue, updating menu...')
      updateTrayMenu()
    })

    liveRoomMonitorQueueService.on('roomRemoved', () => {
      console.log('[Tray] Room removed from queue, updating menu...')
      updateTrayMenu()
    })

    liveRoomMonitorQueueService.on('started', () => {
      console.log('[Tray] Monitor service started, updating menu...')
      updateTrayMenu()
    })

    liveRoomMonitorQueueService.on('stopped', () => {
      console.log('[Tray] Monitor service stopped, updating menu...')
      updateTrayMenu()
    })

    console.log('[Tray] Tray initialized successfully')
  } catch (error) {
    console.error('[Tray] Failed to initialize tray:', error)
  }
}

export function disposeAppTray(): void {
  if (!tray) return
  tray.destroy()
  tray = null
}

/**
 * 更新托盘菜单
 * 支持动态刷新账户列表和监控状态
 */
export function updateTrayMenu(): void {
  if (!tray) {
    console.warn('[Tray] Tray not initialized, cannot update menu')
    return
  }

  try {
    const contextMenu = Menu.buildFromTemplate(buildTemplate())
    tray.setContextMenu(contextMenu)
    console.log('[Tray] Menu updated successfully')
  } catch (error) {
    console.error('[Tray] Failed to update menu:', error)
  }
}

function buildTemplate(): MenuItemConstructorOptions[] {
  // 1. 显示主窗口
  const menuItems: MenuItemConstructorOptions[] = [
    {
      label: '显示主窗口',
      click: () => {
        console.log('[Tray] Show main window clicked')
        const main = windowManager.findByType(WindowType.MAIN)
        const win = main?.window
        if (win) {
          console.log('[Tray] Main window found, showing...')
          if (win.isMinimized()) {
            console.log('[Tray] Window is minimized, restoring...')
            win.restore()
          }
          if (!win.isVisible()) {
            console.log('[Tray] Window is hidden, showing...')
            win.show()
          }
          console.log('[Tray] Focusing window...')
          win.focus()

          // macOS 特殊处理：激活应用
          if (process.platform === 'darwin') {
            app.focus({ steal: true })
          }
        } else {
          console.error('[Tray] Main window not found', windowManager.getAll().length)
        }
      }
    },
    { type: 'separator' }
  ]

  // 2. 监控服务控制
  menuItems.push({
    id: 'toggle-monitor',
    label: liveRoomMonitorQueueService.running ? '停止监控' : '启动监控',
    type: 'checkbox',
    checked: liveRoomMonitorQueueService.running,
    click: async () => {
      try {
        if (liveRoomMonitorQueueService.running) {
          liveRoomMonitorQueueService.stop()
          console.log('[Tray] Monitor service stopped')
        } else {
          // 获取配置并验证数据库连接
          const config = await configManager.getConfig()

          if (
            !config.database.host ||
            !config.database.user ||
            !config.database.password ||
            !config.database.database
          ) {
            dialog.showErrorBox('配置不完整', '请先在系统设置中配置 MySQL 数据库连接信息')
            return
          }

          const testResult = await connectionTestService.testConnection(config)

          // 测试数据库连接
          console.log('[MonitorQueue] Testing MySQL connection...')

          if (!testResult.success) {
            console.error('[MonitorQueue] MySQL connection test failed:', testResult)
            new dialog.showErrorBox('MySQL 连接失败', '无法连接到 MySQL 数据库，无法启动监控服务')
            return
          }
          liveRoomMonitorQueueService.start()
          console.log('[Tray] Monitor service started')
        }
        // 更新菜单以反映新状态
        updateTrayMenu()
      } catch (error) {
        console.error('[Tray] Toggle monitor failed:', error)
      }
    }
  })

  menuItems.push({ type: 'separator' })

  // 3. 动态账户列表
  try {
    const accounts = accountCacheService.getAll()
    console.log(`[Tray] Building menu for ${accounts.length} accounts`)

    // 为每个账户创建子菜单
    for (const account of accounts) {
      const accountSubMenu = buildAccountSubmenu(account)
      menuItems.push({
        label: account.account_name,
        submenu: accountSubMenu
      })
    }
  } catch (error) {
    console.error('[Tray] Failed to build account menu:', error)
  }

  menuItems.push({ type: 'separator' })

  // 4. 查看日志
  menuItems.push({
    label: '查看日志',
    click: async () => {
      console.log('[Tray] Open log viewer clicked')
      await openLogViewer()
    }
  })

  menuItems.push({ type: 'separator' })

  // 5. 退出
  menuItems.push({
    label: '退出',
    click: () => {
      console.log('[Tray] Quit clicked')
      app.quit()
    }
  })

  return menuItems
}

/**
 * 为单个账户构建子菜单
 * 同步函数，从缓存读取数据，同时触发后台 API 更新
 */
function buildAccountSubmenu(account: AccountRow): MenuItemConstructorOptions[] {
  const submenu: MenuItemConstructorOptions[] = []

  // 1. 凭证状态（固定在顶部）
  const credentialStatus = account.is_valid === 1 ? '✓ 凭证有效' : '✗ 凭证无效'
  submenu.push({
    label: credentialStatus,
    enabled: false
  })

  submenu.push({ type: 'separator' })

  // 2. 尝试从缓存获取直播间列表
  const cachedLiveRooms = accountCacheService.getLiveRooms(account.id)

  if (cachedLiveRooms && cachedLiveRooms.liveData && cachedLiveRooms.liveData.list) {
    const rooms = cachedLiveRooms.liveData.list
    console.log(
      `[Tray] Building submenu for account ${account.id} with ${rooms.length} cached rooms`
    )

    if (rooms.length === 0) {
      submenu.push({
        label: '暂无直播间',
        enabled: false
      })
    } else {
      // 为每个直播间创建复选框菜单项
      for (const room of rooms) {
        const isInQueue = liveRoomMonitorQueueService.isInMonitorQueue(account.id, room.room_id)

        submenu.push({
          label: `${room.nickname || room.room_id}`,
          type: 'checkbox',
          checked: isInQueue,
          click: async () => {
            await toggleRoomMonitoring(account.id, room.room_id, room.nickname)
          }
        })
      }
    }

    submenu.push({ type: 'separator' })
  } else {
    // 缓存中没有数据，显示提示
    submenu.push({
      label: '点击下方按钮加载直播间',
      enabled: false
    })
    submenu.push({ type: 'separator' })
  }

  // 3. 添加刷新按钮（实时调用 API）
  submenu.push({
    label: '刷新直播间列表',
    click: async () => {
      console.log(`[Tray] Manually refreshing live rooms for account ${account.id}...`)
      await loadLiveRoomsForAccount(account.id)
    }
  })

  // 4. 后台自动刷新（不阻塞菜单构建）
  // 如果缓存中没有数据，或者数据过旧，则后台刷新
  const shouldRefresh =
    !cachedLiveRooms || !cachedLiveRooms.liveData || Date.now() - cachedLiveRooms.lastUpdate > 60000 // 超过 1 分钟

  if (shouldRefresh) {
    console.log(`[Tray] Triggering background refresh for account ${account.id}`)
    loadLiveRoomsForAccount(account.id).catch((error) => {
      console.error(`[Tray] Background refresh failed for account ${account.id}:`, error)
    })
  }

  return submenu
}

/**
 * 异步加载指定账户的直播间列表
 * 加载完成后自动更新托盘菜单
 */
async function loadLiveRoomsForAccount(accountId: number): Promise<void> {
  try {
    console.log(`[Tray] Loading live rooms for account ${accountId} in background...`)

    // 调用 API 获取最新数据
    const result = await liveRoomService.getLiveRoomsByAccountId(accountId)

    if (result && result.success && result.liveData) {
      console.log(
        `[Tray] Successfully loaded live rooms for account ${accountId}, count: ${result.liveData.list.length}`
      )

      // 数据加载完成后，立即更新托盘菜单
      updateTrayMenu()
    } else {
      console.error(
        `[Tray] Failed to load live rooms for account ${accountId}:`,
        result?.error || 'Unknown error'
      )
    }
  } catch (error) {
    console.error(`[Tray] Error loading live rooms for account ${accountId}:`, error)
  }
}

/**
 * 切换直播间监控状态
 */
async function toggleRoomMonitoring(
  accountId: number,
  roomId: string,
  nickname: string
): Promise<void> {
  try {
    const isInQueue = liveRoomMonitorQueueService.isInMonitorQueue(accountId, roomId)

    // 获取账户信息
    const account = accountCacheService.getById(accountId)
    if (!account) {
      const errorMsg = `账户 ${accountId} 不存在`
      console.error(`[Tray] Account ${accountId} not found`)

      // 系统通知提示
      new Notification({
        title: '操作失败',
        body: errorMsg,
        icon: icon as unknown as string
      }).show()

      return
    }

    if (isInQueue) {
      // 从监控队列移除
      console.log(`[Tray] Removing room ${roomId} from monitor queue`)
      const result = await liveRoomMonitorQueueService.removeFromMonitorQueue({
        accountId,
        roomId
      })
      if (result.success) {
        console.log(`[Tray] Successfully removed ${nickname} from monitoring`)

        // 成功通知
        new Notification({
          title: '移除成功',
          body: `已将 "${nickname}" 从监控队列移除`,
          icon: icon as unknown as string
        }).show()
      } else {
        const errorMsg = result.message || '移除失败'
        console.error(`[Tray] Failed to remove ${nickname}:`, errorMsg)

        // 失败通知
        new Notification({
          title: '移除失败',
          body: `无法移除 "${nickname}": ${errorMsg}`,
          icon: icon as unknown as string
        }).show()
      }
    } else {
      // 添加到监控队列
      console.log(`[Tray] Adding room ${roomId} to monitor queue`)
      const result = await liveRoomMonitorQueueService.addToMonitorQueue({
        accountId,
        accountName: account.account_name,
        organizationId: account.organization_id,
        roomId,
        anchorNickname: nickname
      })
      if (result.success) {
        console.log(`[Tray] Successfully added ${nickname} to monitoring`)

        // 成功通知
        new Notification({
          title: '添加成功',
          body: `已将 "${nickname}" 添加到监控队列`,
          icon: icon as unknown as string
        }).show()
      } else {
        const errorMsg = result.message || '添加失败'
        console.error(`[Tray] Failed to add ${nickname}:`, errorMsg)

        // 失败通知
        new Notification({
          title: '添加失败',
          body: `无法添加 "${nickname}": ${errorMsg}`,
          icon: icon as unknown as string
        }).show()
      }
    }

    // 更新托盘菜单以反映新状态
    updateTrayMenu()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    console.error('[Tray] Toggle room monitoring failed:', error)

    // 异常通知
    new Notification({
      title: '操作异常',
      body: `监控状态切换失败: ${errorMsg}`,
      icon: icon as unknown as string
    }).show()
  }
}

/**
 * 打开日志查看器窗口
 */
async function openLogViewer(): Promise<void> {
  try {
    // 检查是否已经有日志窗口打开
    const existingLogWindow = windowManager.findByType(WindowType.LOG_VIEWER)

    if (existingLogWindow) {
      // 如果已存在，就聚焦它
      console.log('[Tray] Log viewer window already exists, focusing...')
      existingLogWindow.window.focus()

      // macOS 特殊处理
      if (process.platform === 'darwin') {
        app.focus({ steal: true })
      }
      return
    }

    // 创建新的日志窗口
    console.log('[Tray] Creating new log viewer window...')

    const logViewerInstance = await windowManager.create({
      type: WindowType.LOG_VIEWER,
      singleton: true,
      showImmediately: true,
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: '日志查看器',
      autoHideMenuBar: true,
      transparent: false,
      vibrancy: 'sidebar',
      visualEffectState: 'active',
      closeAndDelete: true,
      backgroundColor: isMac ? undefined : nativeTheme.shouldUseDarkColors ? '#181818' : '#FFFFFF',
      darkTheme: nativeTheme.shouldUseDarkColors,
      ...(isMac
        ? {
            titleBarStyle: 'hidden',
            titleBarOverlay: nativeTheme.shouldUseDarkColors
              ? titleBarOverlayDark
              : titleBarOverlayLight,
            trafficLightPosition: { x: 8, y: 13 }
          }
        : {
            frame: false // Frameless window for Windows and Linux
          }),
      // 在开发模式下加载开发服务器的 URL
      url: process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/log-viewer.html`
        : undefined,
      // 在生产模式下加载 HTML 文件
      htmlFile: !process.env['ELECTRON_RENDERER_URL']
        ? path.join(__dirname, '../renderer/log-viewer.html')
        : undefined
    })

    // 将日志窗口注册到日志服务
    loggerService.addWindow(logViewerInstance.window)

    // 监听窗口关闭事件，确保清理
    logViewerInstance.window.on('close', (event) => {
      const window = logViewerInstance.window
      console.log('[Tray] Log viewer window closing, cleaning up...')
      // 窗口关闭时会自动从 loggerService 的 windows Set 中移除（在 addWindow 中已设置）
      // 其他窗口：阻止默认关闭，等待渲染进程清理完成
      event.preventDefault()
      console.log('[WindowManager] Window close prevented, waiting for renderer cleanup')

      // 设置超时，防止渲染进程无响应导致窗口无法关闭
      const cleanupTimeout = setTimeout(() => {
        console.warn(
          '[WindowManager] Cleanup timeout (500ms), forcing window close for:',
          logViewerInstance.id
        )
        // 超时时移除监听器（修复：防止监听器泄漏）
        ipcMain.removeAllListeners('window:cleanup-complete')
        if (!window.isDestroyed()) {
          window.destroy()
        }
      }, 500) // 500ms 超时

      // 监听渲染进程的清理完成信号
      const handleCleanupComplete = (ipcEvent: Electron.IpcMainEvent): void => {
        // 验证是否来自当前窗口
        if (ipcEvent.sender.id !== window.webContents.id) {
          return
        }

        console.log(
          '[WindowManager] Received cleanup-complete signal from renderer for:',
          logViewerInstance.id
        )
        clearTimeout(cleanupTimeout)

        // 移除监听器（重要：防止内存泄漏）
        ipcMain.removeListener('window:cleanup-complete', handleCleanupComplete)

        // 现在安全地关闭窗口
        if (!window.isDestroyed()) {
          console.log('[WindowManager] Destroying window after cleanup:', logViewerInstance.id)
          window.destroy()
        }
      }

      // 使用 once 替代 on，确保只触发一次（修复内存泄漏）
      ipcMain.once('window:cleanup-complete', handleCleanupComplete)

      // 通知渲染进程执行清理操作
      console.log('[WindowManager] Sending window:will-close event to renderer')
      try {
        window.webContents.send('window:will-close')
      } catch (error) {
        console.error('[WindowManager] Failed to send window:will-close event:', error)
        // 如果发送失败，清除超时并直接关闭窗口（修复：移除监听器）
        clearTimeout(cleanupTimeout)
        ipcMain.removeAllListeners('window:cleanup-complete')
        window.destroy()
      }
    })

    console.log('[Tray] Log viewer window created successfully')
  } catch (error) {
    console.error('[Tray] Failed to open log viewer:', error)

    // 显示错误通知
    new Notification({
      title: '打开日志失败',
      body: `无法打开日志查看器: ${error instanceof Error ? error.message : '未知错误'}`,
      icon: icon as unknown as string
    }).show()
  }
}
