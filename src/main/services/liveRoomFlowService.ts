/**
 * 直播间流量服务
 * 负责获取单个直播间的流量数据（观看人数、进入人数等时序数据）
 */

import { apiService } from './apiService'
import { databaseService } from './databaseService'
import type { LiveRoomFlowListData, LiveRoomFlowListRequest } from './apiService'
import { AccountWithLiveRoom } from '../../shared/ipc'
import { accountCredentialValidator } from './accountCredentialValidator'

export class LiveRoomFlowService {
  constructor() {
    console.log('[LiveRoomFlowService] Initialized')
  }

  /**
   * 获取直播间全部流量数据并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async fetchLiveRoomAllFlowAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const { liveRoom } = accountWithLiveRoom
      const flowData = await this.getLiveRoomFlow(accountWithLiveRoom, startTime, endTime, 5)

      if (!flowData || flowData.length === 0) {
        return { success: false, message: '获取流量数据失败' }
      }

      // 推送到远程数据库
      const pushResult = await this.pushFlowDataToRemoteDB(
        flowData,
        liveRoom.unique_id,
        liveRoom.room_id,
        'all', // 全流量
        startTime,
        endTime
      )

      return pushResult
    } catch (error) {
      console.error('[LiveRoomFlowService] Error in fetchLiveRoomAllFlowAndPushToRemoteDB:', error)
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 获取直播间自然流量数据并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async fetchLiveRoomOrganicFlowAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    const { liveRoom } = accountWithLiveRoom
    try {
      const flowData = await this.getLiveRoomFlow(accountWithLiveRoom, startTime, endTime, 10)

      if (!flowData || flowData.length === 0) {
        return { success: false, message: '获取自然流量数据失败' }
      }

      // 推送到远程数据库
      const pushResult = await this.pushFlowDataToRemoteDB(
        flowData,
        liveRoom.unique_id,
        liveRoom.room_id,
        'organic', // 自然流量
        startTime,
        endTime
      )

      return pushResult
    } catch (error) {
      console.error(
        '[LiveRoomFlowService] Error in fetchLiveRoomOrganicFlowAndPushToRemoteDB:',
        error
      )
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 推送流量数据到远程数据库
   * @param flowData 流量数据
   * @param uniqueId 账户唯一ID（organization_id）
   * @param roomId 直播间ID
   * @param group 流量分组
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 推送结果
   */
  private async pushFlowDataToRemoteDB(
    flowData: LiveRoomFlowListData,
    uniqueId: string,
    roomId: string,
    group: 'all' | 'organic' | 'other' | 'ad',
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count: number }> {
    try {
      // 转换数据格式以匹配数据库表结构
      const dbRecords = flowData.map((flow) => ({
        unique_id: uniqueId,
        room_id: roomId,
        flows_group: group,
        flows_label: flow.name, // API中的name对应数据库的label
        flows_value: parseInt(flow.value) || 0, // 将字符串转换为数字
        started_at: new Date(startTime * 1000),
        ended_at: new Date(endTime * 1000)
      }))

      // console.log(`[LiveRoomFlowService] Preparing to push ${dbRecords.length} flow records:`, {
      //   uniqueId,
      //   roomId,
      //   group,
      //   startTime,
      //   endTime,
      //   records: dbRecords
      // })

      // 使用批量插入，遇到重复键时更新除id外的所有字段
      const result = await databaseService.insertBatchOnDuplicateKeyUpdate(
        'sl_live_room_flows',
        dbRecords,
        ['unique_id', 'room_id', 'flows_group', 'flows_label', 'flows_value', 'started_at', 'ended_at'] // 指定要更新的字段
      )

      console.log(`成功推送 ${flowData.length} 条流量数据到远程数据库`, {
        affectedRows: result.affectedRows,
        insertId: result.insertId
      })

      return {
        success: true,
        message: `成功推送 ${flowData.length} 条流量数据`,
        count: flowData.length
      }
    } catch (error) {
      console.error('推送流量数据到远程数据库失败:', error)
      throw error
    }
  }

  /**
   * 获取单个直播间的流量数据
   * @param accountId 账户ID
   * @param liveRoom 直播间信息
   * @param startTime 开始时间（时间戳，秒）
   * @param endTime 结束时间（时间戳，秒）
   * @param dims 数据维度
   */
  async getLiveRoomFlow(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number,
    dims: number
  ): Promise<LiveRoomFlowListData> {
    const { accountId, liveRoom, organizationId } = accountWithLiveRoom
    try {
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!valid) {
        throw new Error(`[LiveRoomFlowService] Account ${accountId} is not valid`)
      }

      console.log(
        `[LiveRoomFlowService] Fetching flow data for room [${liveRoom.room_id}-${liveRoom.nickname}] of account ${accountId}`
      )

      const requestData: LiveRoomFlowListRequest = {
        startTime,
        endTime,
        roomIds: [liveRoom.room_id], // 单个直播间也使用数组格式
        dims
      }

      const response = await apiService.getLiveRoomFlowList(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: organizationId,
        accountId
      })

      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!afterValid) {
        throw new Error(`[LiveRoomFlowService] Account ${accountId} is not valid after request`)
      }

      if (response.code === 0) {
        return response.data || []
      }

      console.warn(
        `[LiveRoomFlowService] Warning: Received code ${response.code} msg ${response.msg} for room [${liveRoom.room_id}-${liveRoom.nickname}]`
      )

      return []
    } catch (error) {
      console.error(
        `[LiveRoomFlowService] Error getting live room [${liveRoom.room_id}-${liveRoom.nickname}] flow data:`,
        error
      )
      return []
    }
  }
}

// 导出单例
export const liveRoomFlowService = new LiveRoomFlowService()
