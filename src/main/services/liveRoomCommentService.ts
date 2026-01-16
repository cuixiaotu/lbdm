/**
 * 直播间评论服务
 * 负责获取单个直播间的评论数据
 */

import { apiService } from './apiService'
import { databaseService } from './databaseService'
import type { LiveRoomCommentData, LiveRoomCommentRequest } from './apiService'
import { AccountWithLiveRoom } from '../../shared/ipc'
import { accountCredentialValidator } from './accountCredentialValidator'

export class LiveRoomCommentService {
  constructor() {
    console.log('[LiveRoomCommentService] Initialized')
  }

  async getLiveRoomComment(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<LiveRoomCommentData> {
    const { liveRoom, organizationId, accountId } = accountWithLiveRoom
    try {
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!valid) {
        throw new Error(`[LiveRoomFlowService] Account ${accountId} is not valid`)
      }

      console.log(
        `[LiveRoomCommentService] Fetching comment data for room [${liveRoom.room_id}-${liveRoom.nickname}] of account ${accountId}`
      )

      const requestData: LiveRoomCommentRequest = {
        startTime,
        endTime,
        roomIds: [liveRoom.room_id] // 单个直播间也使用数组格式
      }

      const response = await apiService.getLiveRoomsComment(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: organizationId,
        accountId
      })

      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId)

      if (!afterValid) {
        throw new Error(`[LiveRoomCommentService] Account ${accountId} is not valid after request`)
      }

      if (response.code === 0) {
        return response.data || []
      }

      console.warn(
        `[LiveRoomCommentService] Failed to get live room comments for room [${liveRoom.room_id}-${liveRoom.nickname}] of account ${accountId} status: ${response.code}, message: ${response.msg}`
      )

      return []
    } catch (error) {
      console.error('[LiveRoomCommentService] Error getting live room comments:', error)
      return []
    }
  }

  /**
   * 获取直播间评论数据并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 推送结果
   */
  async fetchLiveRoomCommentAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    const { liveRoom } = accountWithLiveRoom
    try {
      const result = await this.getLiveRoomComment(accountWithLiveRoom, startTime, endTime)

      if (!result || result.length === 0) {
        return { success: false, message: '获取评论数据失败' }
      }

      // 推送到远程数据库
      const pushResult = await this.pushCommentsToRemoteDB(
        result,
        liveRoom.unique_id,
        liveRoom.room_id
      )

      return pushResult
    } catch (error) {
      console.error('[LiveRoomCommentService] Error getting live room comments:', error)
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 推送评论数据到远程数据库
   * @param commentData 评论数据
   * @param uniqueId 账户唯一ID（organization_id）
   * @param roomId 直播间ID
   * @returns 推送结果
   */
  private async pushCommentsToRemoteDB(
    commentData: LiveRoomCommentData,
    uniqueId: string,
    roomId: string
  ): Promise<{ success: boolean; message: string; count: number }> {
    try {
      // 转换数据格式以匹配数据库表结构
      const dbRecords = commentData.map((comment) => ({
        unique_id: uniqueId,
        room_id: roomId,
        creator: comment.creator,
        creator_id: comment.creator_id,
        comment_id: comment.id, // API中的id对应数据库的comment_id
        comment_text: comment.text,
        create_timestamp: new Date(comment.create_timestamp * 1000)
      }))

      // 使用批量插入，遇到重复键时更新除id外的所有字段
      const result = await databaseService.insertBatchOnDuplicateKeyUpdate(
        'sl_live_room_comments',
        dbRecords,
        ['unique_id', 'room_id', 'creator', 'creator_id', 'comment_text', 'create_timestamp'] // 指定要更新的字段
      )

      console.log(`成功推送 ${commentData.length} 条评论数据到远程数据库`, {
        affectedRows: result.affectedRows,
        insertId: result.insertId
        // changedRows 已弃用，不再记录
      })

      return {
        success: true,
        message: `成功推送 ${commentData.length} 条评论数据`,
        count: commentData.length
      }
    } catch (error) {
      console.error('推送评论数据到远程数据库失败:', error)
      throw error
    }
  }
}

// 导出单例
export const liveRoomCommentService = new LiveRoomCommentService()
