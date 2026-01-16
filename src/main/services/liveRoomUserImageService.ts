/**
 * 直播间用户画像服务
 * 负责获取单个直播间的用户画像数据（性别、年龄、地域分布等）
 */

import { apiService } from './apiService'
import { databaseService } from './databaseService'
import { accountCredentialValidator } from './accountCredentialValidator'
import type {
  LiveRoomUserImageData,
  LiveRoomUserImageRequest,
  UserImageDimension,
  UserImageItem
} from './apiService'
import { UserImageDimension as UserImageDimensionValue } from './apiService'
import type { AccountWithLiveRoom } from '../../shared/ipc'

export class LiveRoomUserImageService {
  constructor() {
    console.log('[LiveRoomUserImageService] Initialized')
  }

  /**
   * 获取并推送直播间用户画像数据（年龄维度）到远程数据库
   * @param accountWithLiveRoom 账户和直播间信息
   * @param startTime 直播开始时间（时间戳，秒）
   * @param endTime 直播结束时间（时间戳，秒）
   */
  async fetchLiveRoomAgeUserImageAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // 验证账户凭证
      const validationResult = accountCredentialValidator.checkAccountValid(
        accountWithLiveRoom.accountId
      )
      if (!validationResult.valid) {
        return { success: false, message: '账户验证失败' }
      }

      const userImageData = await this.getLiveRoomUserImage(
        accountWithLiveRoom,
        startTime,
        endTime,
        UserImageDimensionValue.AGE
      )

      if (!userImageData || userImageData.length === 0) {
        return { success: true, message: '没有新的年龄画像数据', count: 0 }
      }

      // 推送到远程数据库
      const pushResult = await this.pushUserImageDataToRemoteDB(
        userImageData,
        accountWithLiveRoom.liveRoom.unique_id,
        accountWithLiveRoom.liveRoom.room_id,
        'age',
        startTime,
        endTime
      )

      return pushResult
    } catch (error) {
      console.error(
        '[LiveRoomUserImageService] Error in fetchLiveRoomAgeUserImageAndPushToRemoteDB:',
        error
      )
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 获取并推送直播间用户画像数据（地域维度）到远程数据库
   * @param accountWithLiveRoom 账户和直播间信息
   * @param startTime 直播开始时间（时间戳，秒）
   * @param endTime 直播结束时间（时间戳，秒）
   */
  async fetchLiveRoomRegionUserImageAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // 验证账户凭证
      const validationResult = accountCredentialValidator.checkAccountValid(
        accountWithLiveRoom.accountId
      )
      if (!validationResult.valid) {
        return { success: false, message: '账户验证失败' }
      }

      const userImageData = await this.getLiveRoomUserImage(
        accountWithLiveRoom,
        startTime,
        endTime,
        UserImageDimensionValue.REGION
      )

      if (!userImageData || userImageData.length === 0) {
        return { success: true, message: '没有新的地域画像数据', count: 0 }
      }

      // 推送到远程数据库
      const pushResult = await this.pushUserImageDataToRemoteDB(
        userImageData,
        accountWithLiveRoom.liveRoom.unique_id,
        accountWithLiveRoom.liveRoom.room_id,
        'region',
        startTime,
        endTime
      )

      return pushResult
    } catch (error) {
      console.error(
        '[LiveRoomUserImageService] Error in fetchLiveRoomRegionUserImageAndPushToRemoteDB:',
        error
      )
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 获取并推送直播间用户画像数据（性别维度）到远程数据库
   * @param accountWithLiveRoom 账户和直播间信息
   * @param startTime 直播开始时间（时间戳，秒）
   * @param endTime 直播结束时间（时间戳，秒）
   */
  async fetchLiveRoomGenderUserImageAndPushToRemoteDB(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const userImageData = await this.getLiveRoomUserImage(
        accountWithLiveRoom,
        startTime,
        endTime,
        UserImageDimensionValue.GENDER
      )

      if (!userImageData || userImageData.length === 0) {
        return { success: true, message: '没有新的性别画像数据', count: 0 }
      }

      // 推送到远程数据库
      const pushResult = await this.pushUserImageDataToRemoteDB(
        userImageData,
        accountWithLiveRoom.liveRoom.unique_id,
        accountWithLiveRoom.liveRoom.room_id,
        'gender',
        startTime,
        endTime
      )

      return pushResult
    } catch (error) {
      console.error(
        '[LiveRoomUserImageService] Error in fetchLiveRoomGenderUserImageAndPushToRemoteDB:',
        error
      )
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  }

  /**
   * 获取单个直播间的用户画像
   * @param accountWithLiveRoom 账户和直播间信息
   * @param startTime 开始时间（时间戳，秒）
   * @param endTime 结束时间（时间戳，秒）
   * @param dims 维度类型（1-性别, 2-年龄, 3-地域等）
   */
  async getLiveRoomUserImage(
    accountWithLiveRoom: AccountWithLiveRoom,
    startTime: number,
    endTime: number,
    dims: UserImageDimension | number
  ): Promise<LiveRoomUserImageData | null> {
    try {
      const { accountId, liveRoom, organizationId } = accountWithLiveRoom

      // 验证账户凭证
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId)
      if (!valid) {
        throw new Error(`Account ${accountId} is not valid`)
      }

      console.log(
        `[LiveRoomUserImageService] Fetching user image for room ${liveRoom.room_id} of account ${accountId}, dims: ${dims}`
      )

      const requestData: LiveRoomUserImageRequest = {
        startTime,
        endTime,
        roomIds: [liveRoom.room_id], // 单个直播间也使用数组格式
        dims
      }

      const response = await apiService.getLiveRoomsUserImage(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: organizationId,
        accountId
      })

      // 再次验证账户凭证（请求后）
      const afterValidationResult = accountCredentialValidator.checkAccountValid(accountId)
      if (!afterValidationResult.valid) {
        throw new Error(`Account ${accountId} is not valid after request`)
      }

      if (response.code !== 0) {
        console.error('[LiveRoomUserImageService] Failed to get user image:', response.msg)
        return null
      }

      return response.data || null
    } catch (error) {
      console.error('[LiveRoomUserImageService] Error getting user image:', error)
      return null
    }
  }

  /**
   * 推送用户画像数据到远程数据库
   * @param userImageData 用户画像数据
   * @param uniqueId 组织ID
   * @param roomId 直播间ID
   * @param group 分组类型（age/region/gender）
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  private async pushUserImageDataToRemoteDB(
    userImageData: LiveRoomUserImageData,
    uniqueId: string,
    roomId: string,
    group: 'age' | 'region' | 'gender',
    startTime: number,
    endTime: number
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const records = userImageData.map((item: UserImageItem) => ({
        unique_id: uniqueId,
        room_id: roomId,
        user_image_group: group,
        user_image_label: item.label,
        user_image_value: item.count,
        started_at: new Date(startTime * 1000),
        ended_at: new Date(endTime * 1000)
      }))

      await databaseService.insertBatchOnDuplicateKeyUpdate('sl_live_room_user_images', records, [
        'user_image_value',
        'started_at'
      ])

      console.log(
        `[LiveRoomUserImageService] Successfully pushed ${records.length} user image records for room ${roomId}, group: ${group}`
      )
      return { success: true, message: '用户画像数据推送成功', count: records.length }
    } catch (error) {
      console.error(
        `[LiveRoomUserImageService] Error pushing user image data to remote DB for room ${roomId}, group: ${group}:`,
        error
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : '推送用户画像数据失败'
      }
    }
  }
}

// 导出单例
export const liveRoomUserImageService = new LiveRoomUserImageService()
