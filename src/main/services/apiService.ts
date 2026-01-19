/**
 * API 服务管理
 * 统一管理所有业务 API 接口请求
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { accountCacheService } from './accountCacheService'
import { accountStatusListener } from './accountStatusListener'

/**
 * 扩展 Axios 请求配置，添加 metadata 字段
 */
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number
  }
}

/**
 * API 请求配置
 */
export interface ApiRequestConfig extends AxiosRequestConfig {
  /** Cookie */
  cookie: string
  /** CSRF Token */
  csrfToken: string
  /** 组织ID */
  groupId: string
  /** 账户ID */
  accountId: number
}

/**
 * API 响应结果
 */
/**
 * API 响应格式
 */
export interface ApiResponse<T = unknown> {
  /** 响应码 */
  code: number
  /** 响应数据 - http状态码<300成功时字段一定存在 */
  data?: T
  /** 响应消息 */
  msg: string
  /** 请求ID - http状态码<300成功时字段一定存在 */
  request_id?: string
}

/**
 * 管家账号列表数据
 */
export interface ManagedListData {
  [key: string]: unknown
}

/**
 * 直播列表请求参数
 */
export interface LiveIESListRequest {
  /** 页码 */
  page: number
  /** 每页数量 */
  limit: number
  /** 直播类型 */
  live_type: string
  /** 推广状态 */
  promotion_status: string
  /** 搜索关键词 */
  search_key: string
  /** 指标列表 */
  metrics: string[]
}

/**
 * 直播列表V2请求参数
 */
export interface LiveRoomListRequest {
  /** 直播开始时间 格式: 2026-01-19 */
  startTime: string
  /** 直播结束时间 */
  endTime: string
  /** 页码 */
  page: number
  /** 每页数量 */
  limit: number
  /** 过滤类型 */
  fields: string[]
  /** 过滤类型 */
  filters: {
    /** 用户ID数组 */
    anchorIds: string[],
    /** 直播房间号 */
    roomId: string
  }
  /** 排序字段 */
  orderField: string
  /** 指标字段 */
  dimensionFields: string[]
}

/**
 * 直播列表V2返回数据
 */
export interface LiveRoomListData {
  /** 直播间列表 */
  list: LiveRoomListInfo[]
  /** 总直播间数量 */
  total: number
}

/**
 * 直播间信息
 */
export interface LiveRoomListInfo {
  /** 直播房间名 */
  roomName: string
  /** 直播房间ID */
  roomId: string
  /** 昵称 */
  anchorName: string
  /** 头像URL */
  avatarUrl: string
  /** 抖音用户Id */
  awemeId: string
  /** ies用户ID */
  iesCoreUserId: string
  /** 推广数 */
  promotionCount: number
  /** 广告数 */
  adCount: number
  /** 推广状态 */
  promotionStatus: boolean
  /** 直播开始时间 */
  startTime: string
  /** 直播结束时间 */
  endTime: string
  /** 直播状态 */
  liveRoomStatus: boolean
  /** 统计字段 */
  fields: Record<string, string>
}


/**
 * 抖音用户列表请求参数
 */
export interface AwemeListRequest {
}

/**
 * 抖音用户列表返回数据
 */
export interface AwemeListData {
  /** 直播间列表 */
  list: AwemeListInfo[]
  /** 总直播间数量 */
  total: number
}

/**
 * 抖音用户信息
 */
export interface AwemeListInfo {
  /** 用户名 */
  nickName: string
  /** 抖音ID */
  awemeId: string
  /** 用户ID */
  userId: string
}




/**
 * 直播间指标数据
 */
export interface LiveMetrics {
  /** 开播时间戳 */
  live_st: number
  /** 直播时长（秒） */
  live_dt: number
  /** 总观看人次 */
  total_live_watch_cnt: number
  /** 平均观看时长（秒） */
  total_live_avg_watch_duration: number
  /** 总关注数 */
  total_live_follow_cnt: number
  /** 总评论数 */
  total_live_comment_cnt: number
  /** 总点赞数 */
  total_live_like_cnt: number
  /** 卡片点击数 */
  live_card_icon_component_click_count: number
  /** 消耗金额（元） */
  stat_cost: number
  /** 总观看UV */
  total_live_watch_ucnt?: number
  /** 总观看时长 */
  total_live_watch_duration?: number
  /** 消耗金额（分） */
  cost?: number
}

/**
 * 直播间信息
 */
export interface LiveRoomInfo {
  /** 用户ID */
  user_id: string
  /** 抖音号 */
  unique_id: string
  /** 昵称 */
  nickname: string
  /** 头像URL */
  avatar_thumb: string
  /** 直播间ID */
  room_id: string
  /** 推流地址 */
  stream_url: string
  /** 直播状态：2-直播中 */
  status: number
  /** 当前观看人数 */
  user_count: number
  /** 指标数据 */
  metrics: LiveMetrics
  /** 推广状态 */
  promotion_status: string
  /** 抓取开始时间 */
  start_time: number
}

/**
 * 直播概览数据
 */
export interface LiveOverview {
  /** 在线直播数量 */
  line_online_count: number
  /** 推广中数量 */
  promotion_count: number
  /** 累计观看人次 */
  cumulative_views_count: number
  /** 平均观看人次 */
  avg_views_count: number
}

/**
 * 分页信息
 */
export interface Pagination {
  /** 当前页码 */
  page: number
  /** 每页数量 */
  limit: number
  /** 总记录数 */
  total: number
}

/**
 * 直播列表响应数据
 */
export interface LiveIESListData {
  /** 直播间列表 */
  list: LiveRoomInfo[]
  /** 概览统计 */
  overview: LiveOverview
  /** 总直播间数量 */
  ies_count: number
  /** 分页信息 */
  pagination: Pagination
}

/**
 * API 标准响应格式
 */
export interface StandardApiResponse<T> {
  /** 响应码：0 表示成功 */
  code: number
  /** 响应数据 */
  data: T
  /** 额外信息 */
  extra: Record<string, unknown>
  /** 响应消息 */
  msg: string
  /** 请求ID */
  request_id: string
}

export interface LiveRoomMetricsRequest {
  /** 直播间ID数组 */
  roomIds: string[]
  /** 开始时间戳 */
  startTime: number
  /** 结束时间戳 */
  endTime: number
  /** 需要获取的指标列表 */
  fields: string[]
}

export type LiveRoomMetricsField = keyof LiveRoomMetricsData

export interface LiveRoomMetricsData {
  /** 在投计划数 */
  distinct_ad_id?: string
  /** 在投广告数 */
  distinct_promotion_id?: string
  /** 安卓应用激活 */
  live_app_active_count?: string
  /** 首次付费数 */
  live_app_active_pay_count?: string
  /** 安卓应用下载开始 */
  live_app_download_start_count?: string
  /** 安卓应用安装完成 */
  live_app_install_finish_count?: string
  /** 组件点击数 */
  live_card_icon_component_click_count?: string
  /** 表单提交数 */
  live_form_submit_count?: string
  /** 团购支付订单数 */
  live_groupbuy_order_count?: string
  /** 团购下单量 */
  live_groupbuy_pay_click_count?: string
  /** 团购点击量 */
  live_groupbuy_product_click_count?: string
  /** 团购支付订单金额 */
  stat_live_groupbuy_order_gmv?: string
  /** 平均停留时长 */
  total_live_avg_watch_duration?: string
  /** 评论数 */
  total_live_comment_cnt?: string
  /** 新增关注数 */
  total_live_follow_cnt?: string
  /** 点赞数 */
  total_live_like_cnt?: string
  /** 累计观看数 */
  total_live_watch_cnt?: string
  /** 在投广告消耗 */
  stat_cost?: string
  /** 直播间在线人数 */
  online_user_count?: string
}

/**
 * 直播间属性请求参数
 */
export interface LiveRoomAttributesRequest {
  /** 直播间ID数组 */
  roomIds: string[]
  /** 需要获取的属性列表 */
  attributes: string[]
}

/**
 * 直播间属性数据项
 * 注意：所有字段都是字符串类型，即使是数字
 */
export interface LiveRoomAttributeItem {
  /** 直播状态："2" 表示直播中 */
  room_status?: string
  /** 在线人数（字符串格式） */
  online_user_count?: string
  /** 下播时间："None" 表示未下播 */
  room_end_time?: string
  /** 直播间ID */
  room_id?: string
  /** 直播间标题 */
  room_title?: string
  /** 开播时间 */
  room_start_time?: string
  [key: string]: unknown
}

/**
 * 直播间属性响应数据（与 roomIds 顺序对应）
 */
export type LiveRoomAttributesData = LiveRoomAttributeItem[]

/**
 * 直播间流量列表请求参数
 */
export interface LiveRoomFlowListRequest {
  /** 开始时间戳 */
  startTime: number
  /** 结束时间戳 */
  endTime: number
  /** 直播间ID数组 */
  roomIds: string[]
  /** 维度 */
  dims: number
}

/**
 * 直播间流量数据项
 */
export interface LiveRoomFlowItem {
  /** 流量来源名称，如："其他"、"竞价广告"、"自然流量" */
  name: string
  /** 流量数值（字符串格式） */
  value: string
}

/**
 * 直播间流量列表响应数据
 */
export type LiveRoomFlowListData = LiveRoomFlowItem[]

/**
 * 用户画像维度枚举
 */
export enum UserImageDimension {
  /** 地域画像 */
  REGION = 1,
  /** 性别画像 */
  GENDER = 3,
  /** 年龄画像 */
  AGE = 4
}

/**
 * 用户画像请求参数
 */
export interface LiveRoomUserImageRequest {
  /** 开始时间戳 */
  startTime: number
  /** 结束时间戳 */
  endTime: number
  /** 直播间ID数组 */
  roomIds: string[]
  /** 画像维度：1=地域画像, 3=性别, 4=年龄画像 */
  dims: UserImageDimension | number
}

/**
 * 用户画像数据项
 */
export interface UserImageItem {
  /** 标签名称，如："广东"、"男"、"18-23岁" */
  label: string
  /** 数量（字符串格式） */
  count: string
}

/**
 * 用户画像响应数据
 */
export type LiveRoomUserImageData = UserImageItem[]

/**
 * 直播间评论请求参数
 */
export interface LiveRoomCommentRequest {
  /** 开始时间戳 */
  startTime: number
  /** 结束时间戳 */
  endTime: number
  /** 直播间ID数组 */
  roomIds: string[]
}

/**
 * 直播间评论数据项
 */
export interface CommentItem {
  /** 评论文本 */
  text: string
  /** 创建者ID */
  creator_id: number
  /** 创建者昵称 */
  creator: string
  /** 评论ID */
  id: number
  /** 创建时间戳 */
  create_timestamp: number
}

/**
 * 直播间评论响应数据
 */
export type LiveRoomCommentData = CommentItem[]

/**
 * 直播间每分钟指标请求参数
 */
export interface LiveRoomPerMinuteMetricRequest {
  /** 开始时间（秒级时间戳） */
  startTime: number
  /** 结束时间（秒级时间戳） */
  endTime: number
  /** 直播间ID数组 */
  roomIds: string[]
  /** 数据维度 */
  dims: number
  /** 子维度（可选） */
  subDims?: number
  /** 需要获取的指标字段列表（可选） */
  fields?: string[]
  /** 类型（可选） */
  type?: string
  /** 限制数量（可选，-1表示不限制） */
  limit?: number
}

/**
 * 直播间每分钟指标数据项（简单模式 - 示例1）
 */
export interface LiveRoomWatchCountPerMinuteMetricItem {
  /** 时间标签（HH:MM） */
  time: string
  /** 时间戳（秒） */
  timeStamp: number
  /** 分类名称（如"全部"、"自然流量"等） */
  name: string
  /** 指标值（字符串格式） */
  value: string
}

/**
 * 直播间每分钟指标数据项（详细模式 - 示例2）
 */
export interface LiveRoomPerMinuteMetricItem {
  /** 时间标签（HH:MM） */
  time: string
  /** 时间戳（秒） */
  timeStamp: number
  /** 指标字典（所有指标值都是字符串） */
  metrics: Record<string, string>
}

export interface LiveRoomPerMinute {
  /** 时间标签（HH:MM） */
  time: string
  /** 时间戳（秒） */
  timeStamp: number
  /** 分类名称（如"全部"、"自然流量"等） */
  name: string
  /** 指标值（字符串格式） */
  value: string
  /** 指标字典（所有指标值都是字符串） */
  metrics: Record<string, string>
}

/**
 * API 服务类
 */
export class ApiService {
  private readonly axios: AxiosInstance
  private readonly BASE_URL = 'https://business.oceanengine.com'
  private readonly DEFAULT_TIMEOUT = 10000
  private debugEnabled = false

  constructor() {
    this.axios = axios.create({
      baseURL: this.BASE_URL,
      timeout: this.DEFAULT_TIMEOUT,
      validateStatus: () => true
    })

    // 加载调试配置
    this.loadDebugConfig()

    // 设置请求拦截器
    this.setupRequestInterceptor()

    // 设置响应拦截器
    this.setupResponseInterceptor()
  }

  /**
   * 加载调试配置
   */
  private loadDebugConfig(): void {
    try {
      import('../config/configManager').then(({ configManager }) => {
        const config = configManager.getConfig()
        this.debugEnabled = config.debug?.enableNetworkDebug || false
        if (this.debugEnabled) {
          console.log('[ApiService] 网络调试已开启')
        }
      })
    } catch (error) {
      console.error('[ApiService] 加载调试配置失败:', error)
    }
  }

  /**
   * 设置调试模式
   */
  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    console.log(`[ApiService] 网络调试${enabled ? '已开启' : '已关闭'}`)
  }

  /**
   * 设置请求拦截器
   */
  private setupRequestInterceptor(): void {
    this.axios.interceptors.request.use(
      (config: ExtendedAxiosRequestConfig) => {
        if (!this.debugEnabled) return config

        // ANSI 颜色代码
        const colors = {
          reset: '\x1b[0m',
          bright: '\x1b[1m',
          cyan: '\x1b[36m',
          yellow: '\x1b[33m',
          gray: '\x1b[90m'
        }

        const method = config.method?.toUpperCase() || 'UNKNOWN'
        const url = config.url || ''

        console.log('\n' + '='.repeat(80))
        console.log(
          `${colors.cyan}[API Request]${colors.reset} ${colors.bright}${method}${colors.reset} ${url}`
        )
        console.log(`${colors.gray}Time: ${new Date().toISOString()}${colors.reset}`)

        if (config.headers) {
          console.log(
            `${colors.yellow}Headers:${colors.reset}`,
            JSON.stringify(config.headers, null, 2)
          )
        }

        if (config.data) {
          console.log(
            `${colors.yellow}Request Data:${colors.reset}`,
            JSON.stringify(config.data, null, 2)
          )
        }

        console.log('='.repeat(80) + '\n')

        // 在 config 上添加请求开始时间
        config.metadata = { startTime: Date.now() }

        return config
      },
      (error) => {
        if (this.debugEnabled) {
          console.error('[API Request Error]', error)
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * 设置响应拦截器
   */
  private setupResponseInterceptor(): void {
    this.axios.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        if (this.debugEnabled) {
          // ANSI 颜色代码
          const colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            cyan: '\x1b[36m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            red: '\x1b[31m',
            gray: '\x1b[90m'
          }

          const method = response.config.method?.toUpperCase() || 'UNKNOWN'
          const url = response.config.url || ''
          const statusCode = response.status
          const extendedConfig = response.config as ExtendedAxiosRequestConfig
          const startTime = extendedConfig.metadata?.startTime || Date.now()
          const responseTime = Date.now() - startTime

          // 根据状态码选择颜色
          const statusColor =
            statusCode >= 200 && statusCode < 300
              ? colors.green
              : statusCode === 0
                ? colors.red
                : colors.yellow

          console.log('\n' + '='.repeat(80))
          console.log(
            `${colors.cyan}[API Response]${colors.reset} ${colors.bright}${method}${colors.reset} ${url}`
          )
          console.log(`${colors.gray}Time: ${new Date().toISOString()}${colors.reset}`)
          console.log(
            `${colors.yellow}Status Code:${colors.reset} ${statusColor}${statusCode}${colors.reset}`
          )
          console.log(
            `${colors.yellow}Response Time:${colors.reset} ${colors.green}${responseTime}ms${colors.reset}`
          )
          console.log(
            `${colors.yellow}Response Data:${colors.reset}`,
            JSON.stringify(response.data, null, 2)
          )
          console.log('='.repeat(80) + '\n')
        }
        return response
      },
      (error) => {
        if (!this.debugEnabled) return Promise.reject(error)

        const colors = {
          reset: '\x1b[0m',
          bright: '\x1b[1m',
          cyan: '\x1b[36m',
          red: '\x1b[31m',
          yellow: '\x1b[33m',
          gray: '\x1b[90m'
        }

        const method = error.config?.method?.toUpperCase() || 'UNKNOWN'
        const url = error.config?.url || ''
        const extendedConfig = error.config as ExtendedAxiosRequestConfig | undefined
        const startTime = extendedConfig?.metadata?.startTime || Date.now()
        const responseTime = Date.now() - startTime

        console.log('\n' + '='.repeat(80))
        console.log(
          `${colors.cyan}[API Error]${colors.reset} ${colors.bright}${method}${colors.reset} ${url}`
        )
        console.log(`${colors.gray}Time: ${new Date().toISOString()}${colors.reset}`)
        console.log(`${colors.red}Status Code: 0${colors.reset}`)
        console.log(
          `${colors.yellow}Response Time:${colors.reset} ${colors.red}${responseTime}ms${colors.reset}`
        )
        console.log(`${colors.red}Error:${colors.reset}`, error.message || 'Unknown error')
        console.log('='.repeat(80) + '\n')

        return Promise.reject(error)
      }
    )
  }

  /**
   * 通用请求处理方法（带调试日志）
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    url: string,
    headers: Record<string, string>,
    data?: unknown,
    timeout?: number
  ): Promise<ApiResponse<T>> {
    const response =
      method === 'GET'
        ? await this.axios.get(url, { headers, timeout: timeout || this.DEFAULT_TIMEOUT })
        : await this.axios.post(url, data, { headers, timeout: timeout || this.DEFAULT_TIMEOUT })

    // 直接返回API响应数据，因为它已经符合我们的ApiResponse格式
    return response.data as ApiResponse<T>
  }

  private async validateResponse(response: ApiResponse, config: ApiRequestConfig): Promise<void> {
    if (response.code === 403) {
      await accountCacheService.updateValidStatus(config.accountId, false)
      // 触发账户状态变更事件
      await accountStatusListener.emit(config.accountId, false)
    }
  }

  /**
   * 获取直播列表
   * @param groupId 组织ID
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveIESList(
    requestData: LiveIESListRequest = {
      page: 1,
      limit: 100,
      live_type: '1',
      promotion_status: '0',
      search_key: '',
      metrics: [
        'live_st',
        'live_dt',
        'total_live_watch_cnt',
        'total_live_avg_watch_duration',
        'total_live_follow_cnt',
        'total_live_comment_cnt',
        'total_live_like_cnt',
        'live_card_icon_component_click_count',
        'stat_cost'
      ]
    },
    config: ApiRequestConfig
  ): Promise<ApiResponse<LiveIESListData>> {
    const url = `/nbs/api/bm/operate/live/ies_list?group_id=${config.groupId}`
    const headers = this.buildHeaders(
      config.cookie,
      config.csrfToken,
      `https://business.oceanengine.com/site/operate/bp/live?cc_id=${config.groupId}`
    )

    const response = await this.makeRequest<LiveIESListData>(
      'POST',
      url,
      headers,
      requestData,
      config.timeout
    )

    await this.validateResponse(response, config)

    return response
  }

  /**
   * 获取有权限的抖音列表
   * @param groupId 组织ID
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getAwemeList(
    requestData: undefined,
    config: ApiRequestConfig
  ): Promise<ApiResponse<AwemeListData>> {
    const url = `/bp/api/analysis/operate/get_aweme_list`
    const headers = this.buildHeaders(
      config.cookie,
      config.csrfToken,
      `https://business.oceanengine.com/site/analysis/scenes/live`
    )
    const response = await this.makeRequest<AwemeListData>(
      'POST',
      url,
      headers,
      requestData,
      config.timeout
    )

    await this.validateResponse(response, config)
    return response
  }

  async getLiveRoomList(
    requestData: LiveRoomListRequest,
    config: ApiRequestConfig
  ): Promise<ApiResponse<LiveRoomListData>> {
    const url = `/bp/api/analysis/operate/get_room_list`
    const headers = this.buildHeaders(
      config.cookie,
      config.csrfToken,
      `https://business.oceanengine.com/site/analysis/scenes/live`
    )
    const response = await this.makeRequest<LiveRoomListData>(
      'POST',
      url,
      headers,
      requestData,
      config.timeout
    )

    await this.validateResponse(response, config)

    return response
  }
  /**
   * 获取直播间在线人数
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomMetrics(
    requestData: LiveRoomMetricsRequest,
    config: ApiRequestConfig
  ): Promise<ApiResponse<LiveRoomMetricsData>> {
    const url = '/nbs/api/statistics/bm/live_show/online_room/metrics/'
    const headers = this.buildHeaders(config.cookie, config.csrfToken)

    const response = await this.makeRequest<LiveRoomMetricsData>(
      'POST',
      url,
      headers,
      requestData,
      config.timeout
    )

    await this.validateResponse(response, config)

    return response
  }

  /**
   * 获取直播间属性
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomsAttributes(
    requestData: LiveRoomAttributesRequest,
    config: ApiRequestConfig
  ): Promise<ApiResponse<LiveRoomAttributesData>> {
    const url = '/nbs/api/statistics/bm/live_show/online_room/attributes'
    const headers = this.buildHeaders(config.cookie, config.csrfToken)

    const response = await this.makeRequest<LiveRoomAttributesData>(
      'POST',
      url,
      headers,
      requestData,
      config.timeout
    )

    await this.validateResponse(response, config)

    return response
  }

  /**
   * 获取直播间流量列表
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomFlowList(
    requestData: LiveRoomFlowListRequest,
    config: ApiRequestConfig
  ): Promise<ApiResponse<LiveRoomFlowListData>> {
    const url = '/nbs/api/statistics/bm/live_show/flow/list'
    const headers = this.buildHeaders(config.cookie, config.csrfToken)

    const response = await this.makeRequest<LiveRoomFlowListData>(
      'POST',
      url,
      headers,
      requestData,
      config.timeout
    )

    await this.validateResponse(response, config)

    return response
  }

  /**
   * 获取直播间用户画像
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomsUserImage(
    requestData: LiveRoomUserImageRequest,
    config: ApiRequestConfig
  ): Promise<ApiResponse<LiveRoomUserImageData>> {
    const url = '/nbs/api/statistics/bm/live_show/user_image/list'
    const headers = this.buildHeaders(config.cookie, config.csrfToken)

    const response = await this.makeRequest<LiveRoomUserImageData>(
      'POST',
      url,
      headers,
      requestData,
      config.timeout
    )

    await this.validateResponse(response, config)

    return response
  }

  /**
   * 获取直播间评论列表
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomsComment(
    requestData: LiveRoomCommentRequest,
    config: ApiRequestConfig
  ): Promise<ApiResponse<LiveRoomCommentData>> {
    const url = '/nbs/api/statistics/bm/live_show/comment/list'
    const headers = this.buildHeaders(config.cookie, config.csrfToken)

    const response = await this.makeRequest<LiveRoomCommentData>(
      'POST',
      url,
      headers,
      requestData,
      config.timeout
    )

    await this.validateResponse(response, config)

    return response
  }

  /**
   * 获取直播间每分钟指标
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomPerMinuteMetrics<T>(
    requestData: LiveRoomPerMinuteMetricRequest,
    config: ApiRequestConfig
  ): Promise<ApiResponse<T[]>> {
    const url = '/nbs/api/statistics/bm/live_show/per_minute_metrics'
    const headers = this.buildHeaders(config.cookie, config.csrfToken)

    const response = await this.makeRequest<T[]>('POST', url, headers, requestData, config.timeout)

    await this.validateResponse(response, config)

    return response
  }

  private buildHeaders(
    cookie: string,
    csrfToken: string,
    referer: string = 'https://business.oceanengine.com/site/index'
  ): Record<string, string> {
    return {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'zh,en;q=0.9,en-US;q=0.8,ru;q=0.7,zh-HK;q=0.6,zh-CN;q=0.5,zh-TW;q=0.4',
      'cache-control': 'no-cache',
      cookie: cookie,
      pragma: 'no-cache',
      priority: 'u=1, i',
      referer: referer,
      'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'x-csrf-token': csrfToken,
      'x-csrftoken': csrfToken
    }
  }
}

export const apiService = new ApiService()
