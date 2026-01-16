/**
 * 直播间属性服务
 * 负责获取单个直播间的属性数据（标题、状态、观看人数等）
 */

import { apiService } from './apiService'
import type {
  LiveRoomMetricsField,
  LiveRoomAttributesRequest,
  LiveRoomMetricsData,
  LiveRoomMetricsRequest,
  LiveRoomAttributeItem
} from './apiService'
import { databaseService } from './databaseService'
import { accountCredentialValidator } from './accountCredentialValidator'
import { AccountWithLiveRoom } from '../../shared/ipc'

export class LiveRoomMetricService {
  constructor() {
    console.log('[LiveRoomMetricService] Initialized')
  }

  async fetchLiveRoomMetricsAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const roomId = accountWithLiveRoom.liveRoom.room_id
      const attributes = await this.getLiveRoomAttributes(accountWithLiveRoom)

      if (!attributes) {
        return { success: false, message: '获取直播间属性失败' }
      }

      const metrics = await this.getLiveRoomMetrics(accountWithLiveRoom, startTime, endTime)

      if (!metrics) {
        return { success: false, message: '获取指标数据失败' }
      }

      // 推送到远程数据库
      const pushResult = await this.pushMetricToRemoteDB(
        metrics,
        attributes,
        accountWithLiveRoom.liveRoom.unique_id,
        roomId,
        startTime,
        endTime
      )
      return pushResult
    } catch (error) {
      console.error(
        '[LiveRoomMetricService] Error in fetchLiveRoomMetricsAndPushToRemoteDB:',
        error
      )
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  private async pushMetricToRemoteDB(
    metricData: LiveRoomMetricsData,
    attributes: LiveRoomAttributeItem,
    uniqueId: string,
    roomId: string,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // 转换数据格式以匹配数据库表结构
      const dbRecords = [Object.assign(metricData, attributes)].map((metric) => ({
        unique_id: uniqueId,
        room_id: roomId,
        distinct_ad_id: metric.distinct_ad_id,
        distinct_promotion_id: metric.distinct_promotion_id,
        live_app_active_count: metric.live_app_active_count,
        live_app_active_pay_count: metric.live_app_active_pay_count,
        live_app_download_start_count: metric.live_app_download_start_count,
        live_app_install_finish_count: metric.live_app_install_finish_count,
        live_card_icon_component_click_count: metric.live_card_icon_component_click_count,
        live_form_submit_count: metric.live_form_submit_count,
        live_groupbuy_order_count: metric.live_groupbuy_order_count,
        live_groupbuy_pay_click_count: metric.live_groupbuy_pay_click_count,
        live_groupbuy_product_click_count: metric.live_groupbuy_product_click_count,
        stat_live_groupbuy_order_gmv: metric.stat_live_groupbuy_order_gmv,
        total_live_avg_watch_duration: metric.total_live_avg_watch_duration,
        total_live_comment_cnt: metric.total_live_comment_cnt,
        total_live_follow_cnt: metric.total_live_follow_cnt,
        total_live_like_cnt: metric.total_live_like_cnt,
        total_live_watch_cnt: metric.total_live_watch_cnt,
        stat_cost: metric.stat_cost,
        online_user_count: metric.online_user_count,
        started_at: new Date(startTime * 1000),
        ended_at: new Date(endTime * 1000)
      }))

      // console.log(`[LiveRoomMetricService] Preparing to push ${dbRecords.length} metric records:`, {
      //   uniqueId,
      //   roomId,
      //   startTime,
      //   endTime,
      //   records: dbRecords
      // })

      // 使用批量插入，遇到重复键时更新除id外的所有字段
      const result = await databaseService.insertBatchOnDuplicateKeyUpdate(
        'sl_live_room_metrics',
        dbRecords,
        [
          'distinct_ad_id',
          'distinct_promotion_id',
          'live_app_active_count',
          'live_app_active_pay_count',
          'live_app_download_start_count',
          'live_app_install_finish_count',
          'live_card_icon_component_click_count',
          'live_form_submit_count',
          'live_groupbuy_order_count',
          'live_groupbuy_pay_click_count',
          'live_groupbuy_product_click_count',
          'stat_live_groupbuy_order_gmv',
          'total_live_avg_watch_duration',
          'total_live_comment_cnt',
          'total_live_follow_cnt',
          'total_live_like_cnt',
          'total_live_watch_cnt',
          'stat_cost',
          'online_user_count'
        ] // 指定要更新的字段
      )

      console.log(`成功推送 ${dbRecords.length} 条指标数据到远程数据库`, {
        affectedRows: result.affectedRows,
        insertId: result.insertId
      })

      return {
        success: true,
        message: `成功推送 ${dbRecords.length} 条指标数据`,
        count: dbRecords.length
      }
    } catch (error) {
      console.error('推送指标数据到远程数据库失败:', error)
      throw error
    }
  }

  /**
   * 获取直播间指标数据
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param fields 要获取的指标字段
   */
  async getLiveRoomMetrics(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number,
    fields: LiveRoomMetricsField[] = [
      'distinct_ad_id',
      'distinct_promotion_id',
      'live_app_active_count',
      'live_app_active_pay_count',
      'live_app_download_start_count',
      'live_app_install_finish_count',
      'live_card_icon_component_click_count',
      'live_form_submit_count',
      'live_groupbuy_order_count',
      'live_groupbuy_pay_click_count',
      'live_groupbuy_product_click_count',
      'stat_live_groupbuy_order_gmv',
      'total_live_avg_watch_duration',
      'total_live_comment_cnt',
      'total_live_follow_cnt',
      'total_live_like_cnt',
      'total_live_watch_cnt',
      'stat_cost'
    ]
  ): Promise<LiveRoomMetricsData | null> {
    try {
      const accountId = accountWithLiveRoom.accountId
      const roomId = accountWithLiveRoom.liveRoom.room_id
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!valid) {
        throw new Error(`Account ${accountId} is not valid`)
      }

      console.log(
        `[LiveRoomMetricService] Fetching metrics for room ${roomId} of account ${accountId}`
      )

      const requestData: LiveRoomMetricsRequest = {
        roomIds: [roomId], // 单个直播间也使用数组格式
        startTime: startTime,
        endTime: endTime,
        fields: fields
      }

      const response = await apiService.getLiveRoomMetrics(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      })

      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!afterValid) {
        throw new Error(`Account ${accountId} is not valid after request`)
      }

      if (response.code === 0) {
        return response.data || null
      }

      console.warn(
        `[LiveRoomMetricService] Warning: status code ${response.code}, message: ${response.msg}`
      )

      return null
    } catch (error) {
      console.error('[LiveRoomMetricService] Error getting live room attributes:', error)
      return null
    }
  }

  /**
   * 获取单个直播间的属性
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param attributes 需要获取的属性列表
   */
  async getLiveRoomAttributes(
    accountWithLiveRoom: AccountWithLiveRoom,
    attributes: string[] = ['room_status', 'online_user_count', 'room_end_time']
  ): Promise<LiveRoomAttributeItem | null> {
    try {
      const accountId = accountWithLiveRoom.accountId
      const roomId = accountWithLiveRoom.liveRoom.room_id
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!valid) {
        throw new Error(`Account ${accountId} is not valid`)
      }

      console.log(
        `[LiveRoomMetricService] Fetching attributes for room ${roomId} of account ${accountId}`
      )

      const requestData: LiveRoomAttributesRequest = {
        roomIds: [roomId], // 单个直播间也使用数组格式
        attributes
      }

      const response = await apiService.getLiveRoomsAttributes(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      })

      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!afterValid) {
        throw new Error(`Account ${accountId} is not valid after request`)
      }

      return (response.data && response.data[0]) || null
    } catch (error) {
      console.error('[LiveRoomMetricService] Error getting live room attributes:', error)
      return null
    }
  }
}

// 导出单例
export const liveRoomMetricService = new LiveRoomMetricService()
