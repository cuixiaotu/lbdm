/**
 * 直播间列表服务
 * 按需请求直播间数据，不再使用定时轮询
 */

import { getDatabase } from '../database'
import { apiService, AwemeListInfo, LiveOverview, LiveRoomInfo, LiveRoomListRequest } from "./apiService";
import { accountCacheService } from './accountCacheService'
import { accountStatusListener } from './accountStatusListener'
import type {
  LiveIESListData,
  LiveRoomAttributesRequest,
  LiveRoomAttributesData,
  LiveRoomFlowListRequest,
  LiveRoomFlowListData,
  LiveRoomUserImageRequest,
  LiveRoomUserImageData,
  UserImageDimension,
  LiveRoomCommentRequest,
  LiveRoomCommentData
} from './apiService'
import { BrowserWindow, dialog } from 'electron'
import dayjs from "dayjs";
import { configManager } from "../config/configManager";

/**
 * 账户直播间数据
 */
export interface AccountLiveRooms {
  /** 账户ID */
  accountId: number
  /** 账户名称 */
  accountName: string
  /** 组织ID */
  organizationId: string
  /** 直播间列表数据 */
  liveData: LiveIESListData | null
  /** 最后更新时间 */
  lastUpdate: number
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
}

/**
 * 直播间列表服务类
 */
export class LiveRoomService {
  constructor() {
    console.log('[LiveRoomService] Initialized (on-demand mode)')
  }

  /**
   * 检查 API 响应状态，判断是否凭证失效
   * @param statusCode HTTP 状态码
   * @param accountName 账户名称
   */
  private checkCredentialExpired(statusCode: number, accountName: string): void {
    // 401 表示未授权，凭证失效
    if (statusCode > 299) {
      console.error(`[LiveRoomService] Account "${accountName}" credential expired (${statusCode})`)

      // 获取主窗口
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        // 弹出系统提示
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: '凭证失效提示',
          message: `账户 "${accountName}" 的登录凭证已失效`,
          detail: '请重新登录该账户以更新凭证信息。',
          buttons: ['确定']
        })
      }
    }
  }

  /**
   * 检查账户凭证是否有效（从缓存查询）
   * @param accountId 账户ID
   * @returns 账户信息，如果凭证失效则返回 null
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
      console.error(`[LiveRoomService] Account ${accountId} not found in cache`)
      return null
    }

    // 检查内存中的账户状态
    if (account.is_valid === 0) {
      console.warn(
        `[LiveRoomService] Account ${accountId} (${account.account_name}) is marked as invalid, skipping request`
      )
      return null
    }

    return {
      account,
      accountName: account.account_name
    }
  }

  /**
   * 处理 API 请求失败，检查凭证失效并更新状态
   * @param accountId 账户ID
   * @param accountName 账户名称
   * @param statusCode HTTP 状态码
   */
  private async handleApiFailure(
    accountId: number,
    accountName: string,
    statusCode: number
  ): Promise<void> {
    if (statusCode === 403) {
      console.error(
        `[LiveRoomService] Account ${accountId} (${accountName}) credential expired (${statusCode}), updating status...`
      )

      // 更新内存和数据库状态
      await accountCacheService.updateValidStatus(accountId, false)

      // 触发账户状态变更事件
      await accountStatusListener.emit(accountId, false)

      // 弹出提示
      this.checkCredentialExpired(statusCode, accountName)
    }
  }

  /**
   * 获取单个账户的直播间列表
   */
  private async fetchAccountLiveRooms(
    accountId: number,
    accountName: string,
    organizationId: string,
    cookie: string,
    csrfToken: string
  ): Promise<AccountLiveRooms> {
    try {
      console.log(`[LiveRoomService] Fetching live rooms for account ${accountId} (${accountName})`)

      // 调用 getLiveIESList 接口
      const response = await apiService.getLiveIESList(
        undefined, // 使用默认参数
        {
          cookie,
          csrfToken,
          groupId: organizationId,
          accountId
        }
      )

      if (response.code !== 0) {
        console.warn(
          `[LiveRoomService] Account ${accountId} failed: ${response.msg} (${response.code})`
        )
        await this.handleApiFailure(accountId, accountName, response.code)
        return {
          accountId,
          accountName,
          organizationId,
          liveData: null,
          lastUpdate: Date.now(),
          success: false,
          error: response.msg
        }
      }

      // 直接使用响应数据
      const liveData = response.data

      if (!liveData) {
        console.warn(`[LiveRoomService] Account ${accountId} no data returned`)
        return {
          accountId,
          accountName,
          organizationId,
          liveData: null,
          lastUpdate: Date.now(),
          success: false,
          error: 'No data returned'
        }
      }

      console.log(
        `[LiveRoomService] Account ${accountId} success: ${liveData.list.length} live rooms, ${liveData.overview.line_online_count} online`
      )

      return {
        accountId,
        accountName,
        organizationId,
        liveData: liveData,
        lastUpdate: Date.now(),
        success: true
      }
    } catch (error) {
      console.error(`[LiveRoomService] Account ${accountId} exception:`, error)
      return {
        accountId,
        accountName,
        organizationId,
        liveData: null,
        lastUpdate: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取单个账户的直播间列表
   */
  private async fetchAccountLiveRoomsV2(
    accountId: number,
    accountName: string,
    organizationId: string,
    cookie: string,
    csrfToken: string
  ): Promise<AccountLiveRooms> {
    try {
      console.log(
        `[LiveRoomService] Fetching live roomsV2 for account ${accountId} (${accountName})`
      )

      /** Step 1：获取 aweme 列表（主播来源） */
      const awemeResp = await apiService.getAwemeList(
        undefined,
        {
          cookie,
          csrfToken,
          groupId: organizationId,
          accountId
        }
      )

      if (awemeResp.code !== 0) {
        await this.handleApiFailure(accountId, accountName, awemeResp.code)
        return {
          accountId,
          accountName,
          organizationId,
          liveData: null,
          lastUpdate: Date.now(),
          success: false,
          error: awemeResp.msg
        }
      }

      const awemeData = awemeResp.data
      if (!awemeData || !awemeData.list?.length) {
        return {
          accountId,
          accountName,
          organizationId,
          liveData: null,
          lastUpdate: Date.now(),
          success: false,
          error: '获取抖音号列表异常'
        }
      }

      /** Step 2：初始化 LiveIESListData */
      const liveData: LiveIESListData = {
        list: [],
        overview: {
          line_online_count: 0,
          promotion_count: 0,
          cumulative_views_count: 0,
          avg_views_count: 0
        },
        ies_count: 0,
        pagination: {
          page: 1,
          limit: 10,
          total: 0
        }
      }

      /** Step 3：抽取 userIds */
      const userIds = awemeData.list
        .map((item: AwemeListInfo) => item.userId)
        .filter(Boolean)

      /** Step 4：按 10 个一批查询直播间 */
      const BATCH_SIZE = 10
      const startTime = dayjs().format("YYYY-MM-DD");
      const endTime = startTime;

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batchAnchorIds = userIds.slice(i, i + BATCH_SIZE)
        const req: LiveRoomListRequest = {
          startTime,
          endTime,
          page: 1,
          limit: 20,
          fields: [],
          filters: {
            anchorIds: batchAnchorIds,
            roomId: ""
          },
          orderField: "stat_cost",
          dimensionFields: [
            "room_name",
            "room_id",
            "aweme_id",
            "anchor_name",
            "live_start_time",
            "live_end_time",
            "ies_core_user_id",
            "ies_avatar_url",
            "live_room_status",
            "dim_live_ad_promotion_count",
            "dim_live_ad_count",
            "ad_delivery_status"
          ]
        }

        const liveResp = await apiService.getLiveRoomList(
          req,
          {
            cookie,
            csrfToken,
            groupId: organizationId,
            accountId
          }
        )

        if (liveResp.code !== 0 || !liveResp.data) {
          console.warn(
            `[LiveRoomService] LiveRoomList failed for anchors: ${batchAnchorIds.join(',')}`
          )
          continue
        }

        const data = liveResp.data
        if (!data || !data.list) {
          continue
        }

        for (const d of data.list) {
          if (!d.liveRoomStatus){
            continue
          }
          liveData.list.push({
            user_id: d.iesCoreUserId,
            unique_id: d.awemeId,
            nickname: d.anchorName,
            avatar_thumb: d.avatarUrl,
            room_id: d.roomId,
            stream_url: "",
            status: 2,
            user_count: 0,
            promotion_status: d.promotionStatus? "推广中":"未推广",
            start_time: dayjs(d.startTime).unix(),
          } as LiveRoomInfo);
          liveData.overview.line_online_count++
          if (d.promotionStatus){
            liveData.overview.promotion_count++
          }
          liveData.pagination.total++
        }
        const sleep = (ms: number): Promise<void> =>
          new Promise((resolve) => setTimeout(resolve, ms));
        await sleep(2000)
      }
      console.log(
        `[LiveRoomService] Account ${accountId} success: ${liveData.list.length} live rooms`
      )

      return {
        accountId,
        accountName,
        organizationId,
        liveData,
        lastUpdate: Date.now(),
        success: true
      }
    } catch (error) {
      console.error(`[LiveRoomService] Account ${accountId} exception:`, error)
      return {
        accountId,
        accountName,
        organizationId,
        liveData: null,
        lastUpdate: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取指定账户的直播间数据（直接调用 API，根据结果返回）
   * 成功获取数据后会自动缓存到 accountCacheService
   */
  async getLiveRoomsByAccountId(accountId: number, newVesion: boolean = false): Promise<AccountLiveRooms | null> {
    try {
      const db = getDatabase()
      const accountsTable = db.getAccountsTable()
      const account = accountsTable.getById(accountId)

      if (!account) {
        console.error(`[LiveRoomService] Account ${accountId} not found`)
        return null
      }

      // 直接调用 API 获取直播间列表，根据结果判断凭证是否有效
      const config = configManager.getConfig()
      let liveRoomData
      if (config.debug.enableLiveRoomDebug && newVesion) {
        liveRoomData = await this.fetchAccountLiveRoomsV2(
          account.id,
          account.account_name,
          account.organization_id,
          account.cookie,
          account.csrf_token
        )
      }else {
        liveRoomData = await this.fetchAccountLiveRooms(
          account.id,
          account.account_name,
          account.organization_id,
          account.cookie,
          account.csrf_token
        )
      }

      // 如果成功获取数据，则缓存到 accountCacheService
      if (liveRoomData && liveRoomData.success && liveRoomData.liveData) {
        console.log(
          `[LiveRoomService] Caching live rooms data for account ${accountId}, count: ${liveRoomData.liveData.list.length}`
        )
        accountCacheService.setLiveRooms(accountId, liveRoomData)
      } else {
        console.warn(
          `[LiveRoomService] Failed to get live rooms for account ${accountId}, not caching`
        )
      }

      return liveRoomData
    } catch (error) {
      console.error(`[LiveRoomService] Failed to get live rooms for account ${accountId}:`, error)
      return null
    }
  }

  /**
   * 获取直播间属性
   * @param accountId 账户ID
   * @param roomIds 直播间ID数组
   * @param attributes 需要获取的属性列表
   */
  async getLiveRoomsAttributes(
    accountId: number,
    roomIds: string[],
    attributes: string[]
  ): Promise<LiveRoomAttributesData | null> {
    try {
      // 检查账户凭证是否有效（从内存查询）
      const accountCheck = this.checkAccountValid(accountId)
      if (!accountCheck) {
        return null
      }

      const { account, accountName } = accountCheck

      console.log(
        `[LiveRoomService] Fetching attributes for rooms ${roomIds.join(', ')} of account ${accountId}`
      )

      const requestData: LiveRoomAttributesRequest = {
        roomIds,
        attributes
      }

      const response = await apiService.getLiveRoomsAttributes(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      })

      if (response.code !== 0) {
        console.error('[LiveRoomService] Failed to get live rooms attributes:', response.msg)
        // 处理 API 失败，检查凭证并更新状态
        await this.handleApiFailure(accountId, accountName, response.code)
        return null
      }

      return response.data || null
    } catch (error) {
      console.error('[LiveRoomService] Error getting live rooms attributes:', error)
      return null
    }
  }

  /**
   * 获取直播间流量列表
   */
  async getLiveRoomFlowList(
    accountId: number,
    roomIds: string[],
    startTime: number,
    endTime: number,
    dims: number
  ): Promise<LiveRoomFlowListData | null> {
    try {
      // 检查账户凭证是否有效（从内存查询）
      const accountCheck = this.checkAccountValid(accountId)
      if (!accountCheck) {
        return null
      }

      const { account, accountName } = accountCheck

      console.log(
        `[LiveRoomService] Fetching flow list for rooms ${roomIds.join(', ')} of account ${accountId}`
      )

      const requestData: LiveRoomFlowListRequest = {
        startTime,
        endTime,
        roomIds,
        dims
      }

      const response = await apiService.getLiveRoomFlowList(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      })

      if (response.code !== 0) {
        console.error('[LiveRoomService] Failed to get live room flow list:', response.msg)
        // 处理 API 失败，检查凭证并更新状态
        await this.handleApiFailure(accountId, accountName, response.code)
        return null
      }

      return response.data || null
    } catch (error) {
      console.error('[LiveRoomService] Error getting live room flow list:', error)
      return null
    }
  }

  /**
   * 获取直播间用户画像
   */
  async getLiveRoomsUserImage(
    accountId: number,
    roomIds: string[],
    startTime: number,
    endTime: number,
    dims: UserImageDimension | number
  ): Promise<LiveRoomUserImageData | null> {
    try {
      // 检查账户凭证是否有效（从内存查询）
      const accountCheck = this.checkAccountValid(accountId)
      if (!accountCheck) {
        return null
      }

      const { account, accountName } = accountCheck

      console.log(
        `[LiveRoomService] Fetching user image for rooms ${roomIds.join(', ')} of account ${accountId}, dims: ${dims}`
      )

      const requestData: LiveRoomUserImageRequest = {
        startTime,
        endTime,
        roomIds,
        dims
      }

      const response = await apiService.getLiveRoomsUserImage(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      })

      if (response.code !== 0) {
        console.error('[LiveRoomService] Failed to get user image:', response.msg)
        // 处理 API 失败，检查凭证并更新状态
        await this.handleApiFailure(accountId, accountName, response.code)
        return null
      }

      return response.data || null
    } catch (error) {
      console.error('[LiveRoomService] Error getting user image:', error)
      return null
    }
  }

  /**
   * 获取直播间评论列表
   */
  async getLiveRoomsComment(
    accountId: number,
    roomIds: string[],
    startTime: number,
    endTime: number
  ): Promise<LiveRoomCommentData | null> {
    try {
      // 检查账户凭证是否有效（从内存查询）
      const accountCheck = this.checkAccountValid(accountId)
      if (!accountCheck) {
        return null
      }

      const { account, accountName } = accountCheck

      console.log(
        `[LiveRoomService] Fetching comments for rooms ${roomIds.join(', ')} of account ${accountId}`
      )

      const requestData: LiveRoomCommentRequest = {
        startTime,
        endTime,
        roomIds
      }

      const response = await apiService.getLiveRoomsComment(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      })

      if (response.code !== 0) {
        console.error('[LiveRoomService] Failed to get live room comments:', response.msg)
        // 处理 API 失败，检查凭证并更新状态
        await this.handleApiFailure(accountId, accountName, response.code)
        return null
      }

      return response.data || null
    } catch (error) {
      console.error('[LiveRoomService] Error getting live room comments:', error)
      return null
    }
  }
}

// 导出单例
export const liveRoomService = new LiveRoomService()
