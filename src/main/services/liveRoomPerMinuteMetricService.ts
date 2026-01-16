/**
 * 直播间每分钟指标服务
 * 负责获取单个直播间的每分钟级别指标数据（观看人数、互动数据等时序指标）
 */

import { apiService, LiveRoomPerMinuteMetricItem } from './apiService'
import { accountCacheService } from './accountCacheService'
import { accountStatusListener } from './accountStatusListener'
import { databaseService } from './databaseService'
import { LiveRoomPerMinuteMetricRequest, LiveRoomWatchCountPerMinuteMetricItem } from './apiService'
import { AccountWithLiveRoom } from '../../shared/ipc'
import { accountCredentialValidator } from './accountCredentialValidator'

export class LiveRoomPerMinuteMetricService {
  constructor() {
    console.log('[LiveRoomPerMinuteMetricService] Initialized')
  }

  /**
   * 检查账户凭证是否有效（从缓存查询）
   */
  private checkAccountValid(accountId: number): {
    account: {
      id: number
      account_name: string
      cookie: string
      csrf_token: string
      organization_id: string
      is_valid: number
    }
    accountName: string
  } | null {
    const account = accountCacheService.getById(accountId)

    if (!account) {
      console.error(`[LiveRoomPerMinuteMetricService] Account ${accountId} not found in cache`)
      return null
    }

    // 检查内存中的账户状态
    if (account.is_valid === 0) {
      console.warn(
        `[LiveRoomPerMinuteMetricService] Account ${accountId} (${account.account_name}) is marked as invalid, skipping request`
      )
      return null
    }

    return {
      account,
      accountName: account.account_name
    }
  }

  /**
   * 推送每分钟指标数据到远程数据库
   * @param metricData 每分钟指标数据
   * @param uniqueId 组织ID
   * @param roomId 直播间ID
   */
  private async pushPerMinuteMetricDataToRemoteDB(
    metricData: LiveRoomPerMinuteMetricItem[],
    uniqueId: string,
    roomId: string
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      if (!metricData || metricData.length === 0) {
        return { success: true, message: '没有数据需要推送', count: 0 }
      }

      // 将API数据转换为数据库记录格式
      const dbRecords = metricData.map((item) => {
        const metrics = item.metrics || {}
        return {
          unique_id: uniqueId,
          room_id: roomId,
          live_app_active_count: parseInt(metrics.live_app_active_count || '0'),
          live_app_download_start_count: parseInt(metrics.live_app_download_start_count || '0'),
          live_app_install_finish_count: parseInt(metrics.live_app_install_finish_count || '0'),
          live_card_icon_component_click_count: parseInt(
            metrics.live_card_icon_component_click_count || '0'
          ),
          live_form_submit_count: parseInt(metrics.live_form_submit_count || '0'),
          live_groupbuy_order_count: parseInt(metrics.live_groupbuy_order_count || '0'),
          live_groupbuy_pay_click_count: parseInt(metrics.live_groupbuy_pay_click_count || '0'),
          live_groupbuy_product_click_count: parseInt(
            metrics.live_groupbuy_product_click_count || '0'
          ),
          live_in_wechat_pay_count: parseInt(metrics.live_in_wechat_pay_count || '0'),
          live_premium_payment: parseInt(metrics.live_premium_payment || '0'),
          stat_live_groupbuy_order_gmv: parseInt(metrics.stat_live_groupbuy_order_gmv || '0'),
          total_live_comment_cnt: parseInt(metrics.total_live_comment_cnt || '0'),
          total_live_dislike_cnt: parseInt(metrics.total_live_dislike_cnt || '0'),
          total_live_dislike_ucnt: parseInt(metrics.total_live_dislike_ucnt || '0'),
          total_live_follow_cnt: parseInt(metrics.total_live_follow_cnt || '0'),
          total_live_gift_amount: parseInt(metrics.total_live_gift_amount || '0'),
          total_live_gift_cnt: parseInt(metrics.total_live_gift_cnt || '0'),
          total_live_like_cnt: parseInt(metrics.total_live_like_cnt || '0'),
          total_live_pcu: parseInt(metrics.total_live_pcu || '0'),
          total_live_watch_cnt: parseInt(metrics.total_live_watch_cnt || '0'),
          work_wechat_added_count: parseInt(metrics.work_wechat_added_count || '0'),
          timeline: item.time || '',
          timestamp: item.timeStamp ? new Date(item.timeStamp * 1000) : null
        }
      })

      if (dbRecords.length === 0) {
        return { success: true, message: '没有有效数据需要推送', count: 0 }
      }

      // 使用批量插入，遇到重复键时更新所有指标字段
      const updateFields = [
        'live_app_active_count',
        'live_app_download_start_count',
        'live_app_install_finish_count',
        'live_card_icon_component_click_count',
        'live_form_submit_count',
        'live_groupbuy_order_count',
        'live_groupbuy_pay_click_count',
        'live_groupbuy_product_click_count',
        'live_in_wechat_pay_count',
        'live_premium_payment',
        'stat_live_groupbuy_order_gmv',
        'total_live_comment_cnt',
        'total_live_dislike_cnt',
        'total_live_dislike_ucnt',
        'total_live_follow_cnt',
        'total_live_gift_amount',
        'total_live_gift_cnt',
        'total_live_like_cnt',
        'total_live_pcu',
        'work_wechat_added_count',
        'timestamp'
      ]

      await databaseService.insertBatchOnDuplicateKeyUpdate(
        'sl_live_room_per_minute_metrics',
        dbRecords,
        updateFields
      )

      console.log(
        `[LiveRoomPerMinuteMetricService] Successfully pushed ${dbRecords.length} per-minute metric records to remote DB`
      )

      return {
        success: true,
        message: `成功推送 ${dbRecords.length} 条每分钟指标数据`,
        count: dbRecords.length
      }
    } catch (error) {
      console.error(
        '[LiveRoomPerMinuteMetricService] Error pushing per-minute metric data to remote DB:',
        error
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : '推送数据到远程数据库失败'
      }
    }
  }

  /**
   * 推送每分钟观看人数指标数据到远程数据库
   * @param metricData 每分钟指标数据
   * @param uniqueId 组织ID
   * @param roomId 直播间ID
   */
  private async pushWatchCountPerMinuteMetricDataToRemoteDB(
    metricData: LiveRoomWatchCountPerMinuteMetricItem[],
    uniqueId: string,
    roomId: string
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      if (!metricData || metricData.length === 0) {
        return { success: true, message: '没有数据需要推送', count: 0 }
      }

      // 将API数据转换为数据库记录格式
      const dbRecords = metricData.map((item) => {
        return {
          unique_id: uniqueId,
          room_id: roomId,
          total_live_watch_cnt: item.value || 0,
          timeline: item.time,
          timestamp: item.timeStamp ? new Date(item.timeStamp * 1000) : null
        }
      })

      if (dbRecords.length === 0) {
        return { success: true, message: '没有有效数据需要推送', count: 0 }
      }

      // 使用批量插入，遇到重复键时更新所有指标字段
      const updateFields = ['total_live_watch_cnt', 'timestamp']

      await databaseService.insertBatchOnDuplicateKeyUpdate(
        'sl_live_room_watch_count_per_minute_metrics',
        dbRecords,
        updateFields
      )

      console.log(
        `[LiveRoomPerMinuteMetricService] Successfully pushed ${dbRecords.length} watch count per-minute metric records to remote DB`
      )

      return {
        success: true,
        message: `成功推送 ${dbRecords.length} 条每分钟指标数据`,
        count: dbRecords.length
      }
    } catch (error) {
      console.error(
        '[LiveRoomPerMinuteMetricService] Error pushing watch count per-minute metric data to remote DB:',
        error
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : '推送数据到远程数据库失败'
      }
    }
  }

  /**
   * 处理 API 请求失败，检查凭证失效并更新状态
   */
  private async handleApiFailure(
    accountId: number,
    accountName: string,
    statusCode: number
  ): Promise<void> {
    // 检查凭证是否失效（> 299）
    if (statusCode > 299) {
      console.error(
        `[LiveRoomPerMinuteMetricService] Account ${accountId} (${accountName}) credential expired (${statusCode}), updating status...`
      )
    }
    if (statusCode === 403) {
      // 更新内存和数据库状态
      await accountCacheService.updateValidStatus(accountId, false)

      // 触发账户状态变更事件
      await accountStatusListener.emit(accountId, false)
    }
  }

  /**
   * 获取单个直播间的每分钟观看人数指标数据并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async fetchLiveRoomWatchCountPerMinuteMetricAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    const {
      liveRoom: { room_id: roomId, unique_id }
    } = accountWithLiveRoom
    try {
      const result = await this.getLiveRoomPerMinuteMetric<LiveRoomWatchCountPerMinuteMetricItem>(
        accountWithLiveRoom,
        startTime,
        endTime,
        9,
        {
          fields: ['total_live_watch_cnt'],
          type: 'watch_count',
          subDims: 5
        }
      )

      if (!result || result.length === 0) {
        return { success: true, message: '没有新的指标数据', count: 0 }
      }

      // 推送到远程数据库
      const pushResult = await this.pushWatchCountPerMinuteMetricDataToRemoteDB(
        result,
        unique_id,
        roomId
      )

      return pushResult
    } catch (error) {
      console.error(
        '[LiveRoomPerMinuteMetricService] Error in fetchLiveRoomWatchCountPerMinuteMetricAndPushToRemoteDB:',
        error
      )
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 获取单个直播间的每分钟指标数据（所有指标）并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间（秒级时间戳）
   * @param endTime 结束时间（秒级时间戳）
   */
  async fetchLiveRoomAllPerMinuteMetricAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    const {
      liveRoom: { room_id: roomId, unique_id }
    } = accountWithLiveRoom
    try {
      const result = await this.getLiveRoomPerMinuteMetric<LiveRoomPerMinuteMetricItem>(
        accountWithLiveRoom,
        startTime,
        endTime,
        9,
        {
          fields: [
            'total_live_pcu',
            'total_live_watch_cnt',
            'total_live_follow_cnt',
            'total_live_comment_cnt',
            'total_live_like_cnt',
            'total_live_gift_cnt',
            'total_live_gift_amount',
            'total_live_dislike_ucnt',
            'total_live_dislike_cnt',
            'live_card_icon_component_click_count',
            'live_form_submit_count',
            'live_app_download_start_count',
            'live_app_install_finish_count',
            'live_app_active_count',
            'live_groupbuy_product_click_count',
            'live_groupbuy_pay_click_count',
            'live_groupbuy_order_count',
            'stat_live_groupbuy_order_gmv',
            'live_premium_payment',
            'live_in_wechat_pay_count',
            'work_wechat_added_count'
          ],
          limit: -1
        }
      )

      if (!result || result.length === 0) {
        return { success: true, message: '没有新的每分钟指标数据', count: 0 }
      }

      // 推送到远程数据库
      const pushResult = await this.pushPerMinuteMetricDataToRemoteDB(result, unique_id, roomId)

      return pushResult
    } catch (error) {
      console.error(
        '[LiveRoomPerMinuteMetricService] Error in fetchLiveRoomAllPerMinuteMetricAndPushToRemoteDB:',
        error
      )
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 获取单个直播间的每分钟指标数据
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间（秒级时间戳）
   * @param endTime 结束时间（秒级时间戳）
   * @param dims 数据维度
   * @param options 可选参数
   */
  async getLiveRoomPerMinuteMetric<T>(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number,
    dims: number,
    options?: {
      /** 子维度 */
      subDims?: number
      /** 需要获取的指标字段列表 */
      fields?: string[]
      /** 类型 */
      type?: string
      /** 限制数量（-1表示不限制） */
      limit?: number
    }
  ): Promise<T[]> {
    const {
      accountId,
      organizationId,
      liveRoom: { room_id: roomId }
    } = accountWithLiveRoom
    try {
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!valid) {
        throw new Error(`Account ${accountId} is not valid`)
      }

      console.log(
        `[LiveRoomPerMinuteMetricService] Fetching per-minute metrics for room ${roomId} of account ${accountId}`
      )

      const requestData: LiveRoomPerMinuteMetricRequest = {
        startTime,
        endTime,
        roomIds: [roomId], // 单个直播间也使用数组格式
        dims,
        ...(options?.subDims !== undefined && { subDims: options.subDims }),
        ...(options?.fields && { fields: options.fields }),
        ...(options?.type && { type: options.type }),
        ...(options?.limit !== undefined && { limit: options.limit })
      }

      const response = await apiService.getLiveRoomPerMinuteMetrics<T>(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: organizationId,
        accountId
      })

      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!afterValid) {
        throw new Error(`Account ${accountId} is not valid after request`)
      }

      if (response.code === 0) {
        return response.data || []
      }

      return []
    } catch (error) {
      console.error('[LiveRoomPerMinuteMetricService] Error getting per-minute metrics:', error)
      return []
    }
  }
}

// 导出单例
export const liveRoomPerMinuteMetricService = new LiveRoomPerMinuteMetricService()
