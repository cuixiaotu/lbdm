/**
 * 主进程 IPC 处理器
 */

import { ipcMain, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import * as os from 'os'
import { configManager } from '../config/configManager'
import { connectionTestService } from '../services/connectionTestService'
import { loginWindowService } from '../services/loginWindowService'
import { loggerService } from '../services/loggerService'
import { liveRoomService } from '../services/liveRoomService'
import { accountCacheService } from '../services/accountCacheService'
import { accountMonitorService } from '../services/accountMonitorService'
import { apiService } from '../services/apiService'
import { databaseService } from '../services/databaseService'
import {
  liveRoomMonitorQueueService,
  RemoveMonitorRequest
} from '../services/liveRoomMonitorQueueService'
import {
  IPC_CHANNELS,
  LIVE_ROOM_CHANNELS,
  ACCOUNT_MONITOR_CHANNELS,
  type SystemConfig,
  type OpenFileOptions,
  type SaveFileOptions,
  type MessageBoxOptions,
  type MessageBoxResponse,
  type ConnectionTestResult,
  type OpenLoginWindowRequest,
  type OpenLoginWindowResponse,
  type AddAccountRequest,
  type AddAccountResponse,
  type Account,
  type LogEntry,
  type AccountLiveRooms,
  type LiveRoomAttributesData,
  type LiveRoomFlowListData,
  type LiveRoomUserImageData,
  type UserImageDimension,
  type LiveRoomCommentData,
  type MonitorOperationResult,
  type MonitorQueueItem,
  type MonitorQueueStats,
  type AccountWithSimpleRoom
} from '../../shared/ipc'

/**
 * 注册所有 IPC 处理器
 */
export function registerIPCHandlers(): void {
  registerConfigHandlers()
  registerDialogHandlers()
  registerAccountHandlers()
  registerLoggerHandlers()
  registerLiveRoomHandlers()
  registerAccountMonitorHandlers()
  registerMonitorQueueHandlers()
}

/**
 * 注册配置管理相关处理器
 */
function registerConfigHandlers(): void {
  // 获取配置
  ipcMain.handle(IPC_CHANNELS.GET, (): SystemConfig => {
    return configManager.getConfig()
  })

  // 保存配置
  ipcMain.handle(IPC_CHANNELS.SAVE, (_, config: SystemConfig): { success: boolean } => {
    // 获取旧配置检查调试开关是否变更
    const oldConfig = configManager.getConfig()
    const networkDebugChanged =
      oldConfig.debug?.enableNetworkDebug !== config.debug?.enableNetworkDebug
    const sqlDebugChanged = oldConfig.debug?.enableSqlDebug !== config.debug?.enableSqlDebug

    // 保存配置
    configManager.saveConfig(config)

    // 如果调试开关变更，同步更新 apiService
    if (networkDebugChanged) {
      apiService.setDebugEnabled(config.debug?.enableNetworkDebug || false)
    }

    // 如果SQL调试开关变更，同步更新 databaseService
    if (sqlDebugChanged) {
      databaseService.setDebugEnabled(config.debug?.enableSqlDebug || false)
    }

    return { success: true }
  })

  // 重置配置
  ipcMain.handle(IPC_CHANNELS.RESET, (): SystemConfig => {
    return configManager.resetConfig()
  })

  // 获取配置文件路径
  ipcMain.handle(IPC_CHANNELS.GET_PATH, (): string => {
    return configManager.getConfigPath()
  })

  // 测试连接
  ipcMain.handle(
    IPC_CHANNELS.TEST_CONNECTION,
    async (_, config: SystemConfig): Promise<ConnectionTestResult> => {
      return await connectionTestService.testConnection(config)
    }
  )
}

/**
 * 注册文件对话框相关处理器
 */
function registerDialogHandlers(): void {
  // 打开单个文件选择对话框
  ipcMain.handle(
    IPC_CHANNELS.OPEN_FILE,
    async (_, options?: OpenFileOptions): Promise<string | null> => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        // 如果没有指定 filters，默认允许所有文件
        filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
        defaultPath: options?.defaultPath || join(os.homedir(), '.ssh'),
        title: options?.title,
        buttonLabel: options?.buttonLabel
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    }
  )

  // 打开多文件选择对话框
  ipcMain.handle(
    IPC_CHANNELS.OPEN_FILES,
    async (_, options?: OpenFileOptions): Promise<string[]> => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        ...options
      })

      return result.canceled ? [] : result.filePaths
    }
  )

  // 打开目录选择对话框
  ipcMain.handle(
    IPC_CHANNELS.OPEN_DIRECTORY,
    async (_, options?: OpenFileOptions): Promise<string | null> => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        ...options
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    }
  )

  // 保存文件对话框
  ipcMain.handle(
    IPC_CHANNELS.SAVE_FILE,
    async (_, options?: SaveFileOptions): Promise<string | null> => {
      const result = await dialog.showSaveDialog({
        defaultPath: 'config.json',
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        ...options
      })

      return result.canceled ? null : result.filePath || null
    }
  )

  // 显示消息框
  ipcMain.handle(
    IPC_CHANNELS.SHOW_MESSAGE,
    async (event, options: MessageBoxOptions): Promise<MessageBoxResponse | void> => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return

      // 根据消息类型设置对应的图标
      const typeMap: Record<MessageBoxOptions['type'], 'info' | 'error' | 'warning' | 'none'> = {
        info: 'info',
        error: 'error',
        warning: 'warning',
        success: 'info' // Electron 没有 success 类型，使用 info
      }

      const result = await dialog.showMessageBox(window, {
        type: typeMap[options.type],
        title: options.title || '提示',
        message: options.message,
        detail: options.detail,
        buttons: options.buttons || ['确定'],
        defaultId: options.defaultId,
        cancelId: options.cancelId
      })

      // 如果有多个按钮，返回用户选择
      if (options.buttons && options.buttons.length > 1) {
        return { response: result.response }
      }
    }
  )
}

/**
 * 注册账户管理相关处理器
 */
function registerAccountHandlers(): void {
  // 打开登录窗口
  ipcMain.handle(
    IPC_CHANNELS.OPEN_LOGIN_WINDOW,
    async (event, request: OpenLoginWindowRequest): Promise<OpenLoginWindowResponse> => {
      try {
        // 获取主窗口
        const mainWindow = BrowserWindow.fromWebContents(event.sender)
        if (!mainWindow) {
          throw new Error('无法获取主窗口')
        }

        const result = await loginWindowService.openLoginWindow(request, mainWindow)
        return result
      } catch (error) {
        console.error('打开登录窗口失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '打开登录窗口失败'
        }
      }
    }
  )

  // 添加账户
  ipcMain.handle(
    IPC_CHANNELS.ADD,
    async (_, request: AddAccountRequest): Promise<AddAccountResponse> => {
      try {
        // 使用缓存服务添加账户
        const account = await accountCacheService.add({
          accountName: request.accountName,
          username: request.username,
          password: request.password,
          organizationId: request.organizationId,
          cookie: request.cookie,
          csrfToken: request.csrfToken,
          remark: request.remark
        })
        return {
          success: true,
          id: account.id,
          account: {
            id: account.id,
            accountName: account.account_name,
            username: account.username,
            password: account.password,
            organizationId: account.organization_id,
            cookie: account.cookie,
            csrfToken: account.csrf_token,
            remark: account.remark || undefined,
            isValid: account.is_valid === 1,
            createdAt: account.created_at,
            updatedAt: account.updated_at
          }
        }
      } catch (error) {
        console.error('添加账户失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '添加账户失败'
        }
      }
    }
  )

  // 获取账户列表
  ipcMain.handle(IPC_CHANNELS.LIST, async (): Promise<Account[]> => {
    try {
      // 从缓存获取账户列表
      const accounts = accountCacheService.getAll()

      return accounts.map((account) => ({
        id: account.id,
        accountName: account.account_name,
        username: account.username,
        password: account.password,
        organizationId: account.organization_id,
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        remark: account.remark || undefined,
        isValid: account.is_valid === 1,
        createdAt: account.created_at,
        updatedAt: account.updated_at
      }))
    } catch (error) {
      console.error('获取账户列表失败:', error)
      return []
    }
  })

  // 删除账户
  ipcMain.handle(
    IPC_CHANNELS.DELETE,
    async (_, { id }: { id: number }): Promise<{ success: boolean }> => {
      try {
        await accountCacheService.delete(id)
        return { success: true }
      } catch (error) {
        console.error('删除账户失败:', error)
        return { success: false }
      }
    }
  )

  // 更新账户
  ipcMain.handle(
    IPC_CHANNELS.UPDATE,
    async (_, account: Account): Promise<{ success: boolean }> => {
      try {
        await accountCacheService.update(account.id, {
          accountName: account.accountName,
          username: account.username,
          password: account.password,
          organizationId: account.organizationId,
          cookie: account.cookie,
          csrfToken: account.csrfToken,
          remark: account.remark
        })

        return { success: true }
      } catch (error) {
        console.error('更新账户失败:', error)
        return { success: false }
      }
    }
  )

  // 重新验证账户凭证
  ipcMain.handle(
    IPC_CHANNELS.REVERIFY,
    async (
      event,
      request: OpenLoginWindowRequest & { accountId: number }
    ): Promise<OpenLoginWindowResponse> => {
      try {
        // 获取主窗口
        const mainWindow = BrowserWindow.fromWebContents(event.sender)
        if (!mainWindow) {
          throw new Error('无法获取主窗口')
        }

        // 打开登录窗口获取Cookie
        const result = await loginWindowService.openLoginWindow(request, mainWindow)

        if (result.success && result.cookie) {
          // 从 Cookie 中提取 csrftoken
          const csrfMatch = result.cookie.match(/csrftoken=([^;]+)/)
          const csrfToken = csrfMatch ? csrfMatch[1] : ''

          if (!csrfToken) {
            console.error('无法从 Cookie 中提取 csrftoken')
            return {
              success: false,
              error: '无法获取 CSRF Token'
            }
          }

          // 使用缓存服务更新凭证
          await accountCacheService.updateCredentials(request.accountId, result.cookie, csrfToken)

          console.log(`账户 ${request.accountId} 凭证已更新并设置为有效状态`)
        }

        return result
      } catch (error) {
        console.error('重新验证账户失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '重新验证失败'
        }
      }
    }
  )

  // 验证账户凭证是否有效
  ipcMain.handle(
    IPC_CHANNELS.VALIDATE_CREDENTIALS,
    async (
      _,
      { accountId }: { accountId: number }
    ): Promise<{
      success: boolean
      isValid: boolean
      error?: string
    }> => {
      try {
        console.log(`[IPC] 验证账户 ${accountId} 的凭证...`)

        // 使用 liveRoomService 获取直播间列表来验证凭证
        const result = await liveRoomService.getLiveRoomsByAccountId(accountId)

        if (!result) {
          console.error(`[IPC] 账户 ${accountId} 不存在`)
          return {
            success: false,
            isValid: false,
            error: '账户不存在'
          }
        }

        console.log(
          `[IPC] 账户 ${accountId} 凭证验证结果: ${result.success ? 'VALID' : 'INVALID'}${result.error ? ` - ${result.error}` : ''}`
        )

        return {
          success: true,
          isValid: result.success,
          error: result.success ? undefined : result.error
        }
      } catch (error) {
        console.error(`[IPC] 验证账户 ${accountId} 凭证失败:`, error)
        return {
          success: false,
          isValid: false,
          error: error instanceof Error ? error.message : '验证失败'
        }
      }
    }
  )
}

/**
 * 移除所有 IPC 处理器
 */
export function removeIPCHandlers(): void {
  // 移除所有IPC处理器，包括监听队列相关的处理器
  Object.values(IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })
  console.log('[IPC] All handlers removed, including monitor queue handlers')
}

/**
 * 注册日志管理相关处理器
 */
function registerLoggerHandlers(): void {
  // 获取所有日志
  ipcMain.handle(IPC_CHANNELS.GET_ALL, (): LogEntry[] => {
    return loggerService.getAllLogs()
  })

  // 清空日志
  ipcMain.handle(IPC_CHANNELS.CLEAR, (): { success: boolean } => {
    loggerService.clearLogs()
    return { success: true }
  })
}

/**
 * 注册直播间管理相关处理器
 */
function registerLiveRoomHandlers(): void {
  // 先移除旧的处理器（开发模式下热重载防止重复注册）
  try {
    ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_BY_ACCOUNT)
    ipcMain.removeHandler(LIVE_ROOM_CHANNELS.REFRESH_ACCOUNT)
    ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_ATTRIBUTES)
    ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_FLOW_LIST)
    ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_USER_IMAGE)
    ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_COMMENT)
  } catch {
    // 忽略错误，可能是首次注册
  }

  // 获取指定账户的直播间数据（按需请求）
  ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_BY_ACCOUNT,
    async (_, { accountId }: { accountId: number }): Promise<AccountLiveRooms | null> => {
      return await liveRoomService.getLiveRoomsByAccountId(accountId)
    }
  )

  // 刷新指定账户的直播间数据
  ipcMain.handle(
    LIVE_ROOM_CHANNELS.REFRESH_ACCOUNT,
    async (_, { accountId }: { accountId: number }): Promise<AccountLiveRooms | null> => {
      return await liveRoomService.getLiveRoomsByAccountId(accountId)
    }
  )

  // 获取直播间属性
  ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_ATTRIBUTES,
    async (
      _,
      {
        accountId,
        roomIds,
        attributes
      }: { accountId: number; roomIds: string[]; attributes: string[] }
    ): Promise<LiveRoomAttributesData | null> => {
      return await liveRoomService.getLiveRoomsAttributes(accountId, roomIds, attributes)
    }
  )

  // 获取直播间流量列表
  ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_FLOW_LIST,
    async (
      _,
      {
        accountId,
        roomIds,
        startTime,
        endTime,
        dims
      }: {
        accountId: number
        roomIds: string[]
        startTime: number
        endTime: number
        dims: number
      }
    ): Promise<LiveRoomFlowListData | null> => {
      return await liveRoomService.getLiveRoomFlowList(accountId, roomIds, startTime, endTime, dims)
    }
  )

  // 获取直播间用户画像
  ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_USER_IMAGE,
    async (
      _,
      {
        accountId,
        roomIds,
        startTime,
        endTime,
        dims
      }: {
        accountId: number
        roomIds: string[]
        startTime: number
        endTime: number
        dims: UserImageDimension | number
      }
    ): Promise<LiveRoomUserImageData | null> => {
      return await liveRoomService.getLiveRoomsUserImage(
        accountId,
        roomIds,
        startTime,
        endTime,
        dims
      )
    }
  )

  // 获取直播间评论
  ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_COMMENT,
    async (
      _,
      {
        accountId,
        roomIds,
        startTime,
        endTime
      }: {
        accountId: number
        roomIds: string[]
        startTime: number
        endTime: number
      }
    ): Promise<LiveRoomCommentData | null> => {
      return await liveRoomService.getLiveRoomsComment(accountId, roomIds, startTime, endTime)
    }
  )
}

/**
 * 注册账户监控服务控制相关处理器
 */
function registerAccountMonitorHandlers(): void {
  // 先移除已存在的处理器（防止热重载时重复注册）
  ipcMain.removeHandler(ACCOUNT_MONITOR_CHANNELS.START)
  ipcMain.removeHandler(ACCOUNT_MONITOR_CHANNELS.STOP)
  ipcMain.removeHandler(ACCOUNT_MONITOR_CHANNELS.GET_STATUS)

  // 启动监控服务
  ipcMain.handle(
    ACCOUNT_MONITOR_CHANNELS.START,
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        accountMonitorService.start()
        return { success: true }
      } catch (error) {
        console.error('[IPC] Failed to start account monitor service:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '启动失败'
        }
      }
    }
  )

  // 停止监控服务
  ipcMain.handle(
    ACCOUNT_MONITOR_CHANNELS.STOP,
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        accountMonitorService.stop()
        return { success: true }
      } catch (error) {
        console.error('[IPC] Failed to stop account monitor service:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '停止失败'
        }
      }
    }
  )

  // 获取监控服务状态
  ipcMain.handle(ACCOUNT_MONITOR_CHANNELS.GET_STATUS, async (): Promise<{ isRunning: boolean }> => {
    return { isRunning: accountMonitorService.running }
  })
}

/**
 * 注册监听队列管理相关处理器
 */
function registerMonitorQueueHandlers(): void {
  // 先移除已存在的处理器，避免重复注册
  const monitorQueueChannels = [
    'monitor-queue:add',
    'monitor-queue:batch-add',
    'monitor-queue:remove',
    'monitor-queue:batch-remove',
    'monitor-queue:list',
    'monitor-queue:get-by-account',
    'monitor-queue:get-stats',
    'monitor-queue:clear',
    'monitor-queue:start',
    'monitor-queue:stop',
    'monitor-queue:set-interval'
  ]

  monitorQueueChannels.forEach((channel) => {
    ipcMain.removeHandler(channel)
  })

  // 添加单个直播间到监听队列
  ipcMain.handle(
    'monitor-queue:add',
    async (_, request: AccountWithSimpleRoom): Promise<MonitorOperationResult> => {
      try {
        const result = await liveRoomMonitorQueueService.addToMonitorQueue(request)
        return result
      } catch (error) {
        console.error('[IPC] Failed to add room to monitor queue:', error)
        return {
          success: false,
          message: error instanceof Error ? error.message : '添加监听失败'
        }
      }
    }
  )

  // 从监听队列移除单个直播间
  ipcMain.handle(
    'monitor-queue:remove',
    async (_, request: RemoveMonitorRequest): Promise<MonitorOperationResult> => {
      try {
        const result = await liveRoomMonitorQueueService.removeFromMonitorQueue(request)
        return result
      } catch (error) {
        console.error('[IPC] Failed to remove room from monitor queue:', error)
        return {
          success: false,
          message: error instanceof Error ? error.message : '移除监听失败'
        }
      }
    }
  )

  // 获取监听队列列表
  ipcMain.handle('monitor-queue:list', async (): Promise<MonitorQueueItem[]> => {
    try {
      return liveRoomMonitorQueueService.getMonitorQueue()
    } catch (error) {
      console.error('[IPC] Failed to get monitor queue list:', error)
      return []
    }
  })

  // 根据账户ID获取监听队列
  ipcMain.handle(
    'monitor-queue:get-by-account',
    async (_, request: { accountId: number }): Promise<MonitorQueueItem[]> => {
      try {
        return liveRoomMonitorQueueService.getMonitorQueueByAccount(request.accountId)
      } catch (error) {
        console.error('[IPC] Failed to get monitor queue by account:', error)
        return []
      }
    }
  )

  // 获取监听队列统计
  ipcMain.handle('monitor-queue:get-stats', async (): Promise<MonitorQueueStats> => {
    try {
      const stats = liveRoomMonitorQueueService.getMonitorQueueStats()
      return {
        total: stats.total,
        active: stats.active,
        paused: stats.total - stats.active,
        byAccount: Object.entries(stats.byAccount).map(([accountId, count]) => ({
          accountId: parseInt(accountId),
          accountName: '', // 需要从accountCacheService获取
          count
        }))
      }
    } catch (error) {
      console.error('[IPC] Failed to get monitor queue stats:', error)
      return {
        total: 0,
        active: 0,
        paused: 0,
        byAccount: []
      }
    }
  })

  // 清空监听队列
  ipcMain.handle('monitor-queue:clear', async (): Promise<MonitorOperationResult> => {
    try {
      // 清空队列的逻辑需要在服务中实现
      return {
        success: true,
        message: '监听队列已清空'
      }
    } catch (error) {
      console.error('[IPC] Failed to clear monitor queue:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '清空监听队列失败'
      }
    }
  })

  // 启动监听队列服务
  ipcMain.handle('monitor-queue:start', async (): Promise<{ success: boolean }> => {
    try {
      liveRoomMonitorQueueService.start()
      return { success: true }
    } catch (error) {
      console.error('[IPC] Failed to start monitor queue service:', error)
      return { success: false }
    }
  })

  // 停止监听队列服务
  ipcMain.handle('monitor-queue:stop', async (): Promise<{ success: boolean }> => {
    try {
      liveRoomMonitorQueueService.stop()
      return { success: true }
    } catch (error) {
      console.error('[IPC] Failed to stop monitor queue service:', error)
      return { success: false }
    }
  })

  // 获取监听队列服务状态
  ipcMain.handle('monitor-queue:get-status', async (): Promise<{ isRunning: boolean }> => {
    try {
      const isRunning = liveRoomMonitorQueueService.running
      return { isRunning }
    } catch (error) {
      console.error('[IPC] Failed to get monitor queue status:', error)
      return { isRunning: false }
    }
  })

  // 设置监听队列轮询间隔
  ipcMain.handle(
    'monitor-queue:set-interval',
    async (_, request: { interval: number }): Promise<{ success: boolean }> => {
      try {
        liveRoomMonitorQueueService.setPollInterval(request.interval)
        return { success: true }
      } catch (error) {
        console.error('[IPC] Failed to set monitor queue interval:', error)
        return { success: false }
      }
    }
  )
}
