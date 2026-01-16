/**
 * 直播间监听队列管理服务
 * 负责管理手动添加的直播间监听列表，替代原有的全量自动扫描模式
 */

import { EventEmitter } from 'events'
import { accountCacheService } from './accountCacheService'
import { liveRoomService } from './liveRoomService'
import { liveRoomFlowService } from './liveRoomFlowService'
import { liveRoomPerMinuteMetricService } from './liveRoomPerMinuteMetricService'
import { liveRoomCommentService } from './liveRoomCommentService'
import { liveRoomMetricService } from './liveRoomMetric'
import { liveRoomUserImageService } from './liveRoomUserImageService'
import {
  AccountWithSimpleRoom,
  type AccountWithLiveRoom,
  type LiveRoomInfo
} from '../../shared/ipc/types'
import dayjs from 'dayjs'
import { apiService, LiveRoomFlowListRequest } from './apiService'
import { databaseService } from './databaseService'
import { Notification } from 'electron'

/**
 * 监听队列中的直播间项目
 */
export interface MonitorQueueItem {
  /** 直播间ID */
  roomId: string
  /** 账户ID */
  accountId: number
  /** 账户名称 */
  accountName: string
  /** 主播昵称 */
  anchorNickname: string
  /** 组织ID */
  organizationId: string
  /** 添加时间 */
  addedAt: number
  /** 最后更新时间 */
  lastUpdated: number
  /** 是否活跃 */
  isActive: boolean
  /** 完整的直播间信息 */
  liveRoomInfo: LiveRoomInfo
}

/**
 * 添加监听请求
 */
export interface AddMonitorRequest {
  accountId: number
  roomId: string
}

/**
 * 移除监听请求
 */
export interface RemoveMonitorRequest {
  accountId: number
  roomId: string
}

/**
 * 批量操作请求
 */
export interface BatchMonitorRequest {
  accountId: number
  roomIds: string[]
  action: 'add' | 'remove'
}

/**
 * 监听队列操作结果
 */
export interface MonitorOperationResult {
  success: boolean
  message: string
  data?:
    | MonitorQueueItem
    | MonitorQueueItem[]
    | Array<{ roomId: string; success: boolean; message: string }>
}

/**
 * 直播间监听队列管理服务类
 */
export class LiveRoomMonitorQueueService extends EventEmitter {
  /** 监听队列 - 使用 Map 存储，key 为 accountId:roomId */
  private monitorQueue = new Map<string, MonitorQueueItem>()

  /** 轮询定时器 */
  private timer: NodeJS.Timeout | null = null

  /** 轮询间隔（毫秒）- 默认30秒 */
  private pollInterval = 60 * 1000

  /** 是否正在运行 */
  private isRunning = false

  /** 正在轮询中，防止并发轮询 */
  private isPolling = false

  /** 频率控制 - 每个账户的最后操作时间 */
  private lastOperationTime = new Map<number, number>()

  // /** 频率控制间隔（毫秒）- 防止过度请求 */
  // private readonly RATE_LIMIT_INTERVAL = 1000 // 1秒
  // private readonly MAX_OPERATIONS_PER_MINUTE = 30 // 每分钟最多30次操作
  // private operationCount = new Map<number, { count: number; resetTime: number }>()

  constructor() {
    super()
    console.log('[LiveRoomMonitorQueueService] Initialized')
  }

  /**
   * 启动监听服务
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[LiveRoomMonitorQueueService] Already running')
      return
    }

    this.isRunning = true
    console.log('[LiveRoomMonitorQueueService] Started')

    databaseService.initialize()

    // 立即执行一次
    this.poll()

    // 设置定时轮询
    this.timer = setInterval(() => {
      this.poll()
    }, this.pollInterval)

    this.emit('started')
  }

  /**
   * 停止监听服务
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    databaseService.close()

    this.isRunning = false
    console.log('[LiveRoomMonitorQueueService] Stopped')
    this.emit('stopped')
  }

  /**
   * 设置轮询间隔
   */
  setPollInterval(intervalSeconds: number): void {
    this.pollInterval = intervalSeconds * 1000

    if (this.isRunning && this.timer) {
      // 重启定时器
      clearInterval(this.timer)
      this.timer = setInterval(() => {
        this.poll()
      }, this.pollInterval)

      console.log(`[LiveRoomMonitorQueueService] Poll interval updated to ${intervalSeconds}s`)
    }
  }

  /**
   * 添加直播间到监听队列
   */
  async addToMonitorQueue(request: AccountWithSimpleRoom): Promise<MonitorOperationResult> {
    try {
      console.log(
        `[LiveRoomMonitorQueueService] Adding room ${request.roomId} for account ${request.accountId} to monitor queue`
      )

      // 1. 频率控制检查
      // const rateLimitCheck = this.checkRateLimit(request.accountId)
      // if (!rateLimitCheck.allowed) {
      //   console.log(
      //     `[LiveRoomMonitorQueueService] Rate limit exceeded for account ${request.accountId}`
      //   )
      //   return {
      //     success: false,
      //     message: rateLimitCheck.message || '操作被限制'
      //   }
      // }

      // 2. 账户权限验证
      const permissionCheck = await this.checkLiveRoomPermissions(
        request.accountId,
        request.roomId,
        'add'
      )
      if (!permissionCheck.allowed) {
        console.log(
          `[LiveRoomMonitorQueueService] Permission check failed for account ${request.accountId}-${request.roomId}: ${permissionCheck.message}`
        )
        return {
          success: false,
          message: permissionCheck.message || '权限验证失败'
        }
      }

      // 3. 获取账户信息（权限验证已确保账户存在）
      const account = accountCacheService.getById(request.accountId)!
      console.log(
        `[LiveRoomMonitorQueueService] Account found: ${account.account_name} (${account.id})`
      )

      if (!account.is_valid) {
        console.log(
          `[LiveRoomMonitorQueueService] Account ${request.accountId} credentials are invalid`
        )
        return {
          success: false,
          message: '账户凭证已失效，请重新登录'
        }
      }

      // 4. 获取直播间信息并验证API响应
      console.log(
        `[LiveRoomMonitorQueueService] Fetching and validating live room data for account ${request.accountId}`
      )
      const liveRoomData = await liveRoomService.getLiveRoomsByAccountId(request.accountId)

      // 验证API响应状态
      if (!liveRoomData) {
        console.error(
          `[LiveRoomMonitorQueueService] API returned null for account ${request.accountId}`
        )
        return {
          success: false,
          message: 'API响应为空，无法验证直播间信息'
        }
      }

      if (!liveRoomData.success) {
        console.error(
          `[LiveRoomMonitorQueueService] API validation failed for account ${request.accountId}: ${liveRoomData.error}`
        )
        return {
          success: false,
          message: `API验证失败: ${liveRoomData.error || '未知错误'}`
        }
      }

      if (!liveRoomData.liveData || !liveRoomData.liveData.list) {
        console.error(
          `[LiveRoomMonitorQueueService] No live data returned for account ${request.accountId}`
        )
        return {
          success: false,
          message: '无法获取直播间数据'
        }
      }

      // 5. 查找指定的直播间
      const targetRoom = liveRoomData.liveData.list.find((room) => room.room_id === request.roomId)
      if (!targetRoom) {
        console.log(
          `[LiveRoomMonitorQueueService] Room ${request.roomId} not found in account ${request.accountId} live rooms`
        )
        return {
          success: false,
          message: '直播间不存在或无权限访问'
        }
      }

      // 6. 验证直播间数据完整性
      if (!targetRoom.user_id || !targetRoom.nickname || !targetRoom.room_id) {
        console.error(`[LiveRoomMonitorQueueService] Incomplete room data for ${request.roomId}`)
        return {
          success: false,
          message: '直播间数据不完整，无法添加到监听队列'
        }
      }

      // 7. 生成队列项ID
      const queueId = this.generateQueueId(request.accountId, request.roomId)

      // 8. 检查是否已存在
      if (this.monitorQueue.has(queueId)) {
        console.log(
          `[LiveRoomMonitorQueueService] Room ${request.roomId} already in monitor queue for account ${request.accountId}`
        )
        return {
          success: false,
          message: '该直播间已在监听队列中'
        }
      }

      // 9. 创建监听队列项，存储完整的直播间信息
      const queueItem: MonitorQueueItem = {
        roomId: request.roomId,
        accountId: request.accountId,
        accountName: account.account_name,
        organizationId: account.organization_id,
        anchorNickname: targetRoom.nickname,
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        isActive: true,
        liveRoomInfo: targetRoom // 存储完整的直播间信息
      }

      // 10. 添加到队列
      this.monitorQueue.set(queueId, queueItem)

      console.log(
        `[LiveRoomMonitorQueueService] Successfully added room ${request.roomId} (${targetRoom.nickname}) to monitor queue`
      )

      // 11. 更新频率控制
      // this.updateRateLimit(request.accountId)

      // 12. 触发事件
      this.emit('roomAdded', queueItem)

      return {
        success: true,
        message: '直播间已添加到监听队列',
        data: queueItem
      }
    } catch (error) {
      console.error('[LiveRoomMonitorQueueService] Failed to add room to monitor queue:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '添加失败'
      }
    }
  }

  /**
   * 从监听队列移除直播间
   */
  async removeFromMonitorQueue(request: RemoveMonitorRequest): Promise<MonitorOperationResult> {
    try {
      // 1. 频率控制检查
      // const rateLimitCheck = this.checkRateLimit(request.accountId)
      // if (!rateLimitCheck.allowed) {
      //   return {
      //     success: false,
      //     message: rateLimitCheck.message || '操作被限制'
      //   }
      // }

      // 2. 账户权限验证
      const permissionCheck = await this.checkLiveRoomPermissions(
        request.accountId,
        request.roomId,
        'remove'
      )
      if (!permissionCheck.allowed) {
        return {
          success: false,
          message: permissionCheck.message || '权限验证失败'
        }
      }

      const queueId = this.generateQueueId(request.accountId, request.roomId)
      const queueItem = this.monitorQueue.get(queueId)

      if (!queueItem) {
        return {
          success: false,
          message: '该直播间不在监听队列中'
        }
      }

      // 从队列中移除
      this.monitorQueue.delete(queueId)

      // 数据库持久化已移除，仅使用内存存储
      console.log(`[LiveRoomMonitorQueueService] Removed room ${request.roomId} from memory queue`)

      // 更新频率控制
      // this.updateRateLimit(request.accountId)

      console.log(
        `[LiveRoomMonitorQueueService] Removed room ${request.roomId} for account ${request.accountId} from monitor queue`
      )

      // 触发事件
      this.emit('roomRemoved', queueItem)

      return {
        success: true,
        message: '直播间已从监听队列移除',
        data: queueItem
      }
    } catch (error) {
      console.error(
        '[LiveRoomMonitorQueueService] Failed to remove room from monitor queue:',
        error
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : '移除失败'
      }
    }
  }

  /**
   * 获取监听队列列表
   */
  getMonitorQueue(): MonitorQueueItem[] {
    return Array.from(this.monitorQueue.values())
  }

  /**
   * 获取指定账户的监听队列
   */
  getMonitorQueueByAccount(accountId: number): MonitorQueueItem[] {
    return Array.from(this.monitorQueue.values()).filter((item) => item.accountId === accountId)
  }

  /**
   * 检查直播间是否在监听队列中
   */
  isInMonitorQueue(accountId: number, roomId: string): boolean {
    const queueId = this.generateQueueId(accountId, roomId)
    return this.monitorQueue.has(queueId)
  }

  /**
   * 获取监听队列统计信息
   */
  getMonitorQueueStats(): {
    total: number
    active: number
    byAccount: Record<number, number>
  } {
    const items = Array.from(this.monitorQueue.values())
    const byAccount: Record<number, number> = {}

    for (const item of items) {
      byAccount[item.accountId] = (byAccount[item.accountId] || 0) + 1
    }

    return {
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      byAccount
    }
  }

  /**
   * 获取账户监听限制信息
   */
  // getAccountLimits(accountId: number): {
  //   currentRooms: number
  //   maxOperationsPerMinute: number
  //   currentOperations: number
  //   remainingOperations: number
  // } {
  //   const currentRooms = this.getMonitorQueueByAccount(accountId).length
  //   const operationData = this.operationCount.get(accountId)
  //   const currentOperations = operationData ? operationData.count : 0

  //   return {
  //     currentRooms,
  //     maxOperationsPerMinute: this.MAX_OPERATIONS_PER_MINUTE,
  //     currentOperations,
  //     remainingOperations: Math.max(0, this.MAX_OPERATIONS_PER_MINUTE - currentOperations)
  //   }
  // }

  /**
   * 清空指定账户的监听队列
   */
  async clearAccountQueue(request: AccountWithLiveRoom): Promise<MonitorOperationResult> {
    try {
      // 权限验证
      const permissionCheck = await this.checkLiveRoomPermissions(request.accountId, '', 'remove')
      if (!permissionCheck.allowed) {
        return {
          success: false,
          message: permissionCheck.message || '权限验证失败'
        }
      }

      const accountItems = this.getMonitorQueueByAccount(request.accountId)
      if (accountItems.length === 0) {
        return {
          success: true,
          message: '该账户没有监听的直播间',
          data: []
        }
      }

      // 从内存中移除
      for (const item of accountItems) {
        const queueId = this.generateQueueId(item.accountId, item.roomId)
        this.monitorQueue.delete(queueId)
      }

      // 数据库持久化已移除，仅使用内存存储
      console.log(
        `[LiveRoomMonitorQueueService] Cleared ${accountItems.length} items from memory queue for account ${request.accountId}`
      )

      // 更新频率控制
      // this.updateRateLimit(request.accountId)

      console.log(
        `[LiveRoomMonitorQueueService] Cleared ${accountItems.length} items for account ${request.accountId}`
      )

      return {
        success: true,
        message: `已清空账户监听队列，共移除 ${accountItems.length} 个直播间`,
        data: accountItems
      }
    } catch (error) {
      console.error('[LiveRoomMonitorQueueService] Failed to clear account queue:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '清空失败'
      }
    }
  }

  /**
   * 轮询监听队列中的直播间
   */
  private async poll(): Promise<void> {
    if (this.isPolling) {
      console.warn('[LiveRoomMonitorQueueService] Poll already in progress, skipping...')
      return
    }

    this.isPolling = true

    try {
      const activeItems = Array.from(this.monitorQueue.values()).filter((item) => item.isActive)

      if (activeItems.length === 0) {
        console.log('[LiveRoomMonitorQueueService] No active rooms to monitor')
        return
      }

      console.log(`[LiveRoomMonitorQueueService] Polling ${activeItems.length} active rooms...`)
      const startTime = Date.now()

      // 按账户分组处理
      const accountGroups = new Map<number, MonitorQueueItem[]>()
      for (const item of activeItems) {
        if (!accountGroups.has(item.accountId)) {
          accountGroups.set(item.accountId, [])
        }
        accountGroups.get(item.accountId)!.push(item)
      }

      // 并发处理每个账户的直播间
      const promises = Array.from(accountGroups.entries()).map(async ([accountId, items]) => {
        try {
          // 直接使用Map中存储的直播间信息，不再通过API重新获取
          console.log(
            `[LiveRoomMonitorQueueService] Processing ${items.length} rooms for account ${accountId} using cached data`
          )

          // 构造AccountWithLiveRoom格式用于数据推送
          const accountWithLiveRooms: AccountWithLiveRoom[] = items.map((item) => ({
            accountId: item.accountId,
            accountName: item.accountName,
            organizationId: item.organizationId,
            liveRoom: item.liveRoomInfo // 直接使用存储的直播间信息
          }))

          // 推送数据
          await this.fetchAndPushLiveRoomData(accountWithLiveRooms)

          console.log(
            `[LiveRoomMonitorQueueService] Successfully processed ${items.length} rooms for account ${accountId}`
          )
        } catch (error) {
          console.error(
            `[LiveRoomMonitorQueueService] Error processing account ${accountId}:`,
            error
          )
        }
      })

      await Promise.all(promises)

      // 更新最后更新时间（仅内存）
      const now = Date.now()
      for (const item of activeItems) {
        item.lastUpdated = now
      }

      const duration = Date.now() - startTime
      console.log(
        `[LiveRoomMonitorQueueService] Poll completed in ${duration}ms, processed ${activeItems.length} rooms`
      )

      this.emit('pollCompleted', { duration, roomCount: activeItems.length })
    } catch (error) {
      console.error('[LiveRoomMonitorQueueService] Poll error:', error)
      this.emit('pollError', error)
    } finally {
      this.isPolling = false
    }
  }

  /**
   * 获取并推送直播间数据到远程数据库
   * 复用原有的数据推送逻辑
   */
  private async fetchAndPushLiveRoomData(
    accountWithLiveRooms: AccountWithLiveRoom[]
  ): Promise<void> {
    const promises = accountWithLiveRooms.map(async (accountWithLiveRoom) => {
      const liveRoom = accountWithLiveRoom.liveRoom
      const now = Date.now()

      const attributes = await liveRoomMetricService.getLiveRoomAttributes(accountWithLiveRoom, [
        'room_status'
      ])

      if (!attributes || attributes.room_status !== '2') {
        await this.removeFromMonitorQueue({
          accountId: accountWithLiveRoom.accountId,
          roomId: accountWithLiveRoom.liveRoom.room_id
        })
        new Notification({
          title: '监听失败',
          body: `无法继续监听"${liveRoom.room_id}-${liveRoom.nickname}"，可能已停播，已从队列中移除`
        }).show()
        return
      }

      if (!liveRoom.start_time) {
        liveRoom.start_time = liveRoom.metrics.live_st
      } else {
        liveRoom.start_time = dayjs(now).subtract(3, 'minutes').unix()
      }

      // 依次执行各个数据获取和推送任务
      await Promise.allSettled([
        liveRoomFlowService.fetchLiveRoomAllFlowAndPushToRemoteDB(
          accountWithLiveRoom,
          dayjs.unix(liveRoom.metrics.live_st).subtract(24, 'hour').unix(),
          ~~(now / 1000)
        ),
        liveRoomFlowService.fetchLiveRoomOrganicFlowAndPushToRemoteDB(
          accountWithLiveRoom,
          dayjs.unix(liveRoom.metrics.live_st).subtract(24, 'hour').unix(),
          ~~(now / 1000)
        ),
        liveRoomMetricService.fetchLiveRoomMetricsAndPushToRemoteDB(
          accountWithLiveRoom,
          dayjs.unix(liveRoom.metrics.live_st).subtract(24, 'hour').unix(),
          ~~(now / 1000)
        ),
        liveRoomPerMinuteMetricService.fetchLiveRoomWatchCountPerMinuteMetricAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1000)
        ),
        liveRoomPerMinuteMetricService.fetchLiveRoomAllPerMinuteMetricAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1000)
        ),
        liveRoomCommentService.fetchLiveRoomCommentAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1000)
        ),
        liveRoomUserImageService.fetchLiveRoomAgeUserImageAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1000)
        ),
        liveRoomUserImageService.fetchLiveRoomGenderUserImageAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1000)
        ),
        liveRoomUserImageService.fetchLiveRoomRegionUserImageAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1000)
        )
      ])
    })

    await Promise.allSettled(promises)
  }

  /**
   * 生成队列项ID
   */
  private generateQueueId(accountId: number, roomId: string): string {
    return `${accountId}:${roomId}`
  }

  /**
   * 检查频率控制和权限
   */
  // private checkRateLimit(accountId: number): { allowed: boolean; message?: string } {
  //   const now = Date.now()

  //   // 1. 检查基本频率控制（1秒间隔）
  //   const lastTime = this.lastOperationTime.get(accountId)
  //   if (lastTime && now - lastTime < this.RATE_LIMIT_INTERVAL) {
  //     return { allowed: false, message: '操作过于频繁，请稍后再试' }
  //   }

  //   // 2. 检查每分钟操作次数限制
  //   const operationData = this.operationCount.get(accountId)
  //   if (operationData) {
  //     // 如果超过1分钟，重置计数
  //     if (now - operationData.resetTime > 60000) {
  //       this.operationCount.set(accountId, { count: 0, resetTime: now })
  //     } else if (operationData.count >= this.MAX_OPERATIONS_PER_MINUTE) {
  //       return { allowed: false, message: '每分钟操作次数超限，请稍后再试' }
  //     }
  //   }

  //   return { allowed: true }
  // }

  /**
   * 检查账户权限和限制
   */
  private async checkLiveRoomPermissions(
    accountId: number,
    roomId: string,
    action: 'add' | 'remove'
  ): Promise<{ allowed: boolean; message?: string }> {
    try {
      // 1. 验证账户是否存在
      let account = accountCacheService.getById(accountId)

      // 如果账户不存在，尝试刷新缓存再检查一次
      // 这可以解决账户刚添加后立即使用时缓存未同步的问题
      if (!account) {
        console.log(
          `[LiveRoomMonitorQueueService] Account ${accountId} not found in cache, refreshing cache...`
        )
        await accountCacheService.refresh()
        account = accountCacheService.getById(accountId)

        if (!account) {
          return { allowed: false, message: '账户不存在或已被删除' }
        } else {
          console.log(
            `[LiveRoomMonitorQueueService] Account ${accountId} found after cache refresh`
          )
        }
      }

      // 2. 验证账户cookie有效性（仅在添加操作时验证）
      if (action === 'add') {
        console.log(
          `[LiveRoomMonitorQueueService] Validating account ${accountId} credentials via API...`
        )

        // 使用getLiveRoomsUserImage API来验证cookie有效性
        const now = Date.now()
        const startTime = Math.floor(now / 1000) - 3600 // 1小时前
        const endTime = Math.floor(now / 1000)

        try {
          const requestData: LiveRoomFlowListRequest = {
            startTime,
            endTime,
            roomIds: [roomId], // 单个直播间也使用数组格式
            dims: 5
          }

          const response = await apiService.getLiveRoomFlowList(requestData, {
            cookie: account.cookie,
            csrfToken: account.csrf_token,
            groupId: account.organization_id,
            accountId
          })

          if (response.code !== 0) {
            return {
              allowed: false,
              message: `账户凭证验证失败：status=${response.code} message=${response.msg}`
            }
          }
          console.log(`[LiveRoomMonitorQueueService] Account ${accountId} cookie validation passed`)
        } catch (error) {
          console.error(
            `[LiveRoomMonitorQueueService] Account ${accountId} cookie validation error:`,
            error
          )
          return {
            allowed: false,
            message: '账户凭证验证失败：' + (error instanceof Error ? error.message : '未知错误')
          }
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('[LiveRoomMonitorQueueService] Error checking account permissions:', error)
      return { allowed: false, message: '权限验证失败' }
    }
  }

  /**
   * 更新频率控制时间和操作计数
   */
  // private updateRateLimit(accountId: number): void {
  //   const now = Date.now()
  //   this.lastOperationTime.set(accountId, now)

  //   // 更新操作计数
  //   const operationData = this.operationCount.get(accountId)
  //   if (operationData) {
  //     // 如果超过1分钟，重置计数
  //     if (now - operationData.resetTime > 60000) {
  //       this.operationCount.set(accountId, { count: 1, resetTime: now })
  //     } else {
  //       operationData.count++
  //     }
  //   } else {
  //     this.operationCount.set(accountId, { count: 1, resetTime: now })
  //   }
  // }

  /**
   * 获取运行状态
   */
  get running(): boolean {
    return this.isRunning
  }
}

// 导出单例
export const liveRoomMonitorQueueService = new LiveRoomMonitorQueueService()
