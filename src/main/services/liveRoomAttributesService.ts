// /**
//  * 直播间属性服务
//  * 负责获取单个直播间的属性数据（标题、状态、观看人数等）
//  */

// import { apiService } from './apiService'
// import type { LiveRoomAttributesData, LiveRoomAttributesRequest } from './apiService'

// export class LiveRoomAttributesService {
//   constructor() {
//     console.log('[LiveRoomAttributesService] Initialized')
//   }

//   /**
//    * 获取单个直播间的属性
//    * @param accountId 账户ID
//    * @param roomId 直播间ID
//    * @param attributes 需要获取的属性列表
//    */
//   async getLiveRoomAttributes(
//     accountId: number,
//     roomId: string,
//     attributes: string[]
//   ): Promise<LiveRoomAttributesData | null> {
//     try {
//       const requestData: LiveRoomAttributesRequest = {
//         roomIds: [roomId], // 单个直播间也使用数组格式
//         attributes
//       }

//       const response = await apiService.getLiveRoomsAttributes(requestData, {
//         cookie: account.cookie,
//         csrfToken: account.csrf_token,
//         groupId: account.organization_id,
//         accountId
//       })

//       if (response.code !== 0) {
//         console.error(
//           '[LiveRoomAttributesService] Failed to get live room attributes:',
//           response.msg
//         )
//         // 处理 API 失败，检查凭证并更新状态
//         await this.handleApiFailure(accountId, accountName, response.code)
//         return null
//       }

//       return response.data || null
//     } catch (error) {
//       console.error('[LiveRoomAttributesService] Error getting live room attributes:', error)
//       return null
//     }
//   }
// }

// // 导出单例
// export const liveRoomAttributesService = new LiveRoomAttributesService()
