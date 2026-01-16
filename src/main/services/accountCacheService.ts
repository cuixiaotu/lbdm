/**
 * 账户缓存服务
 * 在内存中维护账户列表，减少数据库读取频率，提高性能
 */

import { getDatabase } from '../database'
import type { AccountRow } from '../database/tables/accounts'
import type { AccountLiveRooms } from './liveRoomService'

export class AccountCacheService {
  /** 内存中的账户列表缓存 */
  private cache: AccountRow[] = []

  /** 账户直播列表缓存 (accountId -> AccountLiveRooms) */
  private liveRoomsCache: Map<number, AccountLiveRooms> = new Map()

  /** 缓存是否已初始化 */
  private initialized = false

  /** 读写锁，防止并发问题 */
  private updateLock: Promise<void> = Promise.resolve()

  constructor() {
    console.log('[AccountCacheService] Initialized')
  }

  /**
   * 初始化缓存（从数据库加载所有账户）
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[AccountCacheService] Cache already initialized')
      return
    }

    await this.executeWithLock(async () => {
      try {
        console.log('[AccountCacheService] Loading accounts from database...')
        const db = getDatabase()
        const accountsTable = db.getAccountsTable()

        this.cache = accountsTable.list()
        this.initialized = true

        console.log(`[AccountCacheService] Cache initialized with ${this.cache.length} accounts`)
      } catch (error) {
        console.error('[AccountCacheService] Failed to initialize cache:', error)
        throw error
      }
    })
  }

  /**
   * 获取所有账户（从缓存）
   */
  getAll(): AccountRow[] {
    this.ensureInitialized()
    return [...this.cache] // 返回副本，防止外部修改
  }

  /**
   * 获取有效的账户列表（从缓存）
   */
  getValid(): AccountRow[] {
    this.ensureInitialized()
    return this.cache.filter((account) => account.is_valid === 1)
  }

  /**
   * 根据ID获取账户（从缓存）
   */
  getById(id: number): AccountRow | null {
    this.ensureInitialized()
    return this.cache.find((account) => account.id === id) || null
  }

  /**
   * 添加账户（同时写入数据库和更新缓存）
   */
  async add(account: {
    accountName: string
    username: string
    password: string
    organizationId: string
    cookie: string
    csrfToken: string
    remark?: string
  }): Promise<AccountRow> {
    return await this.executeWithLock(async () => {
      try {
        console.log('[AccountCacheService] Adding account:', account.accountName)

        const db = getDatabase()
        const accountsTable = db.getAccountsTable()

        // 写入数据库
        const id = accountsTable.create(account)

        // 从数据库读取完整数据
        const newAccount = accountsTable.getById(id)
        if (!newAccount) {
          throw new Error('Failed to retrieve newly created account')
        }

        // 更新缓存
        this.cache.push(newAccount)
        console.log(`[AccountCacheService] Account ${id} added to cache`)

        return newAccount
      } catch (error) {
        console.error('[AccountCacheService] Failed to add account:', error)
        throw error
      }
    })
  }

  /**
   * 更新账户凭证状态（同时写入数据库和更新缓存）
   */
  async updateValidStatus(id: number, isValid: boolean): Promise<void> {
    await this.executeWithLock(async () => {
      try {
        console.log(`[AccountCacheService] Updating account ${id} valid status to ${isValid}`)

        const db = getDatabase()
        const accountsTable = db.getAccountsTable()

        // 写入数据库
        accountsTable.updateValidStatus(id, isValid)

        // 更新缓存
        const account = this.cache.find((a) => a.id === id)
        if (account) {
          account.is_valid = isValid ? 1 : 0
          account.updated_at = Date.now()
          console.log(`[AccountCacheService] Account ${id} cache updated`)
        } else {
          console.warn(`[AccountCacheService] Account ${id} not found in cache`)
        }
      } catch (error) {
        console.error('[AccountCacheService] Failed to update valid status:', error)
        throw error
      }
    })
  }

  /**
   * 更新账户凭证（同时写入数据库和更新缓存）
   */
  async updateCredentials(id: number, cookie: string, csrfToken: string): Promise<void> {
    await this.executeWithLock(async () => {
      try {
        console.log(`[AccountCacheService] Updating account ${id} credentials`)

        const db = getDatabase()
        const accountsTable = db.getAccountsTable()

        // 写入数据库
        accountsTable.updateCredentials(id, cookie, csrfToken)

        // 更新缓存
        const account = this.cache.find((a) => a.id === id)
        if (account) {
          account.cookie = cookie
          account.csrf_token = csrfToken
          account.is_valid = 1
          account.updated_at = Date.now()
          console.log(`[AccountCacheService] Account ${id} credentials updated in cache`)
        } else {
          console.warn(`[AccountCacheService] Account ${id} not found in cache`)
        }
      } catch (error) {
        console.error('[AccountCacheService] Failed to update credentials:', error)
        throw error
      }
    })
  }

  /**
   * 删除账户（同时从数据库删除和从缓存移除）
   */
  async delete(id: number): Promise<void> {
    await this.executeWithLock(async () => {
      try {
        console.log(`[AccountCacheService] Deleting account ${id}`)

        const db = getDatabase()
        const accountsTable = db.getAccountsTable()

        // 从数据库删除
        accountsTable.delete(id)

        // 从缓存移除
        const index = this.cache.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.cache.splice(index, 1)
          console.log(`[AccountCacheService] Account ${id} removed from cache`)
        } else {
          console.warn(`[AccountCacheService] Account ${id} not found in cache`)
        }
      } catch (error) {
        console.error('[AccountCacheService] Failed to delete account:', error)
        throw error
      }
    })
  }

  /**
   * 更新账户信息（同时写入数据库和更新缓存）
   */
  async update(
    id: number,
    data: {
      accountName?: string
      username?: string
      password?: string
      organizationId?: string
      cookie?: string
      csrfToken?: string
      remark?: string
    }
  ): Promise<void> {
    await this.executeWithLock(async () => {
      try {
        console.log(`[AccountCacheService] Updating account ${id}`)

        const db = getDatabase()
        const accountsTable = db.getAccountsTable()

        // 写入数据库
        accountsTable.update(id, data)

        // 更新缓存
        const account = this.cache.find((a) => a.id === id)
        if (account) {
          if (data.accountName !== undefined) account.account_name = data.accountName
          if (data.username !== undefined) account.username = data.username
          if (data.password !== undefined) account.password = data.password
          if (data.organizationId !== undefined) account.organization_id = data.organizationId
          if (data.cookie !== undefined) account.cookie = data.cookie
          if (data.csrfToken !== undefined) account.csrf_token = data.csrfToken
          if (data.remark !== undefined) account.remark = data.remark
          account.updated_at = Date.now()
          console.log(`[AccountCacheService] Account ${id} updated in cache`)
        } else {
          console.warn(`[AccountCacheService] Account ${id} not found in cache`)
        }
      } catch (error) {
        console.error('[AccountCacheService] Failed to update account:', error)
        throw error
      }
    })
  }

  /**
   * 强制刷新缓存（从数据库重新加载）
   */
  async refresh(): Promise<void> {
    await this.executeWithLock(async () => {
      try {
        console.log('[AccountCacheService] Refreshing cache from database...')
        const db = getDatabase()
        const accountsTable = db.getAccountsTable()

        this.cache = accountsTable.list()
        console.log(`[AccountCacheService] Cache refreshed with ${this.cache.length} accounts`)
      } catch (error) {
        console.error('[AccountCacheService] Failed to refresh cache:', error)
        throw error
      }
    })
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { total: number; valid: number; invalid: number } {
    this.ensureInitialized()
    const valid = this.cache.filter((a) => a.is_valid === 1).length
    return {
      total: this.cache.length,
      valid,
      invalid: this.cache.length - valid
    }
  }

  /**
   * 设置账户的直播列表缓存
   * @param accountId 账户ID
   * @param liveRooms 直播列表数据
   */
  setLiveRooms(accountId: number, liveRooms: AccountLiveRooms): void {
    this.liveRoomsCache.set(accountId, liveRooms)
    console.log(
      `[AccountCacheService] Live rooms cached for account ${accountId} (${liveRooms.liveData?.list.length || 0} rooms)`
    )
  }

  /**
   * 获取账户的直播列表缓存
   * @param accountId 账户ID
   * @returns 直播列表数据，如果不存在则返回 null
   */
  getLiveRooms(accountId: number): AccountLiveRooms | null {
    return this.liveRoomsCache.get(accountId) || null
  }

  /**
   * 清除账户的直播列表缓存
   * @param accountId 账户ID
   */
  clearLiveRooms(accountId: number): void {
    this.liveRoomsCache.delete(accountId)
    console.log(`[AccountCacheService] Live rooms cache cleared for account ${accountId}`)
  }

  /**
   * 清除所有直播列表缓存
   */
  clearAllLiveRooms(): void {
    this.liveRoomsCache.clear()
    console.log('[AccountCacheService] All live rooms cache cleared')
  }

  /**
   * 确保缓存已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AccountCacheService not initialized. Call initialize() first.')
    }
  }

  /**
   * 执行带锁的操作，防止并发冲突
   */
  private async executeWithLock<T>(operation: () => Promise<T>): Promise<T> {
    // 等待之前的操作完成
    await this.updateLock

    // 创建新的操作
    let resolve: () => void
    let reject: (error: unknown) => void

    this.updateLock = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })

    try {
      const result = await operation()
      resolve!()
      return result
    } catch (error) {
      reject!(error)
      throw error
    }
  }
}

// 导出单例
export const accountCacheService = new AccountCacheService()
