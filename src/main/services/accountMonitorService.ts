/**
 * 账户监控服务
 * 重构后的版本：移除自动扫描逻辑，仅保留账户凭证验证功能
 * 直播间数据监听由 liveRoomMonitorQueueService 负责
 */

import { BrowserWindow, Notification } from 'electron'
import { accountCacheService } from './accountCacheService'
import { configManager } from '../config/configManager'
import { liveRoomService } from './liveRoomService'

/**
 * 账户凭证验证结果
 */
export interface AccountValidationResult {
  accountId: number
  isValid: boolean
  statusCode?: number
  error?: string
  timestamp: number
}

/**
 * 账户监控服务类
 * 重构后仅负责账户凭证验证，不再进行直播间数据的自动采集
 */
export class AccountMonitorService {
  /** 轮询定时器 */
  private timer: NodeJS.Timeout | null = null

  /** 轮询间隔（毫秒）- 从配置中读取 */
  private get pollInterval(): number {
    const config = configManager.getConfig()
    return (config.monitor?.interval || 60) * 1000
  }

  /** 是否正在运行 */
  private isRunning = false

  /** 已提示过的账户ID集合，防止重复弹窗 */
  private notifiedAccounts = new Set<number>()

  /** 正在轮询中，防止并发轮询 */
  private isPolling = false

  /** 状态更新锁，防止数据竞争 */
  private statusUpdateLock = new Map<number, Promise<void>>()

  constructor() {
    console.log('[AccountMonitorService] Initialized (Refactored Version - Credential Check Only)')
  }

  /**
   * 启动监控
   * 重构后仅进行账户凭证验证，不再自动采集直播间数据
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[AccountMonitorService] Already running')
      return
    }

    this.isRunning = true
    console.log('[AccountMonitorService] Started - Credential validation only')

    // 立即执行一次凭证验证
    this.pollCredentials()

    // 设置定时轮询凭证验证
    this.timer = setInterval(() => {
      this.pollCredentials()
    }, this.pollInterval)
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    this.isRunning = false
    console.log('[AccountMonitorService] Stopped')
  }

  /**
   * 更新轮询间隔
   * 当配置中的轮询时间变更时调用，会重启定时器
   */
  updateInterval(): void {
    if (!this.isRunning) {
      return
    }

    // 重启定时器
    if (this.timer) {
      clearInterval(this.timer)
    }

    this.timer = setInterval(() => {
      this.pollCredentials()
    }, this.pollInterval)

    console.log(`[AccountMonitorService] Interval updated to ${this.pollInterval}ms`)
  }

  /**
   * 手动验证单个账户凭证
   */
  async validateSingleAccount(accountId: number): Promise<AccountValidationResult> {
    try {
      return await this.validateAccount(accountId)
    } catch (error) {
      console.error(`[AccountMonitorService] Failed to validate account ${accountId}:`, error)
      return {
        accountId,
        isValid: false,
        error: error instanceof Error ? error.message : '验证失败',
        timestamp: Date.now()
      }
    }
  }

  /**
   * 手动验证所有账户凭证
   */
  async validateAllAccounts(): Promise<AccountValidationResult[]> {
    try {
      const accounts = await accountCacheService.getAll()
      const results: AccountValidationResult[] = []

      for (const account of accounts) {
        const result = await this.validateAccount(account.id)
        results.push(result)

        // 更新账户状态
        await this.updateAccountStatus(account.id, result.isValid, account.account_name)
      }

      return results
    } catch (error) {
      console.error('[AccountMonitorService] Failed to validate all accounts:', error)
      return []
    }
  }

  /**
   * 显示凭证过期通知
   */
  private showCredentialExpiredNotification(accountId: number, accountName: string): void {
    if (this.notifiedAccounts.has(accountId)) {
      return
    }

    this.notifiedAccounts.add(accountId)

    // 创建系统通知
    const notification = new Notification({
      title: '账户凭证已过期',
      body: `账户 "${accountName}" 的登录凭证已过期，请重新登录`,
      icon: undefined, // 可以设置图标路径
      urgency: 'normal'
    })

    notification.on('click', () => {
      // 点击通知时，聚焦到主窗口
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        const mainWindow = windows[0]
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.focus()
      }
    })

    notification.show()
  }

  /**
   * 更新账户状态
   */
  private async updateAccountStatus(
    accountId: number,
    isValid: boolean,
    accountName: string
  ): Promise<void> {
    // 使用锁防止并发更新同一账户
    if (this.statusUpdateLock.has(accountId)) {
      await this.statusUpdateLock.get(accountId)
      return
    }

    const updatePromise = (async () => {
      try {
        await accountCacheService.updateValidStatus(accountId, isValid)
        console.log(`Account ${accountId} status updated to ${isValid ? 'valid' : 'invalid'}`)

        if (!isValid) {
          this.showCredentialExpiredNotification(accountId, accountName)
        } else {
          // 如果账户恢复有效，从已通知列表中移除
          this.notifiedAccounts.delete(accountId)
        }
      } catch (error) {
        console.error(`Failed to update account ${accountId} status:`, error)
      } finally {
        this.statusUpdateLock.delete(accountId)
      }
    })()

    this.statusUpdateLock.set(accountId, updatePromise)
    await updatePromise
  }

  /**
   * 轮询凭证验证（重构后的版本）
   * 仅验证账户凭证，不再进行直播间数据采集
   */
  private async pollCredentials(): Promise<void> {
    if (this.isPolling) {
      console.log('[AccountMonitorService] Already polling, skipping...')
      return
    }

    this.isPolling = true

    try {
      console.log('[AccountMonitorService] Starting credential validation cycle...')

      const accounts = await accountCacheService.getAll()
      console.log(`[AccountMonitorService] Found ${accounts.length} accounts to validate`)

      // 并发验证所有账户凭证
      const validationPromises = accounts.map(async (account) => {
        try {
          const result = await this.validateAccount(account.id)
          await this.updateAccountStatus(account.id, result.isValid, account.account_name)
          return result
        } catch (error) {
          console.error(`[AccountMonitorService] Failed to validate account ${account.id}:`, error)
          await this.updateAccountStatus(account.id, false, account.account_name)
          return {
            accountId: account.id,
            isValid: false,
            error: error instanceof Error ? error.message : '验证失败',
            timestamp: Date.now()
          }
        }
      })

      const results = await Promise.all(validationPromises)
      const validCount = results.filter((r) => r.isValid).length

      console.log(
        `[AccountMonitorService] Credential validation completed: ${validCount}/${accounts.length} accounts valid`
      )
    } catch (error) {
      console.error('[AccountMonitorService] Credential validation cycle failed:', error)
    } finally {
      this.isPolling = false
    }
  }

  /**
   * 验证单个账户凭证
   */
  private async validateAccount(accountId: number): Promise<AccountValidationResult> {
    try {
      const account = await accountCacheService.getById(accountId)
      if (!account) {
        throw new Error(`Account ${accountId} not found`)
      }

      // 使用 liveRoomService 验证凭证
      const result = await liveRoomService.getLiveRoomsByAccountId(account.id)

      return {
        accountId: account.id,
        isValid: result !== null && result !== undefined,
        statusCode: result ? 200 : 401,
        error: result ? undefined : 'Account credentials are invalid or expired',
        timestamp: Date.now()
      }
    } catch (error) {
      console.error(`[AccountMonitorService] Account ${accountId} validation failed:`, error)
      return {
        accountId,
        isValid: false,
        error: error instanceof Error ? error.message : '验证失败',
        timestamp: Date.now()
      }
    }
  }

  /**
   * 获取运行状态
   */
  get running(): boolean {
    return this.isRunning
  }
}

export const accountMonitorService = new AccountMonitorService()
