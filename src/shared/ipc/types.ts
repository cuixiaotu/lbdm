/**
 * 远程数据库配置接口
 */
export interface DatabaseConfig {
  /** 数据库主机地址 */
  host: string
  /** 数据库端口 */
  port: number
  /** 数据库用户名 */
  user: string
  /** 数据库密码 */
  password: string
  /** 数据库名称 */
  database: string
}

/**
 * SSH 配置接口
 */
export interface SshConfig {
  server: string
  port: number
  user: string
  password: string
  useSshKey: boolean
  privateKey?: string
}

/**
 * 账户配置接口
 */
export interface AccountConfig {
  /** 登录页面URL */
  loginUrl: string
  /** 默认执行的JavaScript代码 */
  defaultScript: string
}

/**
 * 监控配置接口
 */
export interface MonitorConfig {
  /** 监控频率（秒）*/
  interval: number
}

/**
 * 调试配置接口
 */
export interface DebugConfig {
  /** 网络请求调试开关 */
  enableNetworkDebug: boolean
  /** SQL调试开关 */
  enableSqlDebug: boolean
  /** 直播调试开关 */
  enableLiveRoomDebug: boolean
}

/**
 * 系统配置接口
 */
export interface SystemConfig {
  database: DatabaseConfig
  ssh: SshConfig
  account: AccountConfig
  monitor: MonitorConfig
  debug: DebugConfig
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  /** 是否成功 */
  success: boolean
  /** 响应状态码 */
  statusCode?: number
  /** 响应时间（毫秒） */
  responseTime?: number
  /** 错误消息 */
  error?: string
  /** 是否使用了 SSH 隧道 */
  usedSsh?: boolean
  /** 详细信息 */
  details?: string
}

/**
 * 文件过滤器
 */
export interface FileFilter {
  name: string
  extensions: string[]
}

/**
 * 文件对话框选项
 */
export interface OpenFileOptions {
  /** 对话框标题 */
  title?: string
  /** 确认按钮文字 */
  buttonLabel?: string
  /** 默认路径 */
  defaultPath?: string
  /** 文件类型过滤器 */
  filters?: FileFilter[]
}

/**
 * 保存文件对话框选项
 */
export interface SaveFileOptions {
  /** 对话框标题 */
  title?: string
  /** 默认文件名 */
  defaultPath?: string
  /** 确认按钮文字 */
  buttonLabel?: string
}

/**
 * 消息框类型
 */
export type MessageType = 'info' | 'error' | 'warning' | 'success'

/**
 * 消息框选项
 */
export interface MessageBoxOptions {
  /** 消息类型 */
  type: MessageType
  /** 标题 */
  title?: string
  /** 消息内容 */
  message: string
  /** 详细信息 */
  detail?: string
  /** 按钮文本数组 */
  buttons?: string[]
  /** 默认按钮索引 */
  defaultId?: number
  /** 取消按钮索引 */
  cancelId?: number
}

/**
 * 消息框响应
 */
export interface MessageBoxResponse {
  /** 用户点击的按钮索引 */
  response: number
}

/**
 * 账户信息
 */
export interface Account {
  /** 账户ID */
  id: number
  /** 账户名称 */
  accountName: string
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 管家账号（组织ID） */
  organizationId: string
  /** Cookie */
  cookie: string
  /** CSRF Token */
  csrfToken: string
  /** 备注 */
  remark?: string
  /** 凭证有效状态 */
  isValid: boolean
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /** 监控中的直播间数量 */
  monitoringCount?: number
}

/**
 * 添加账户请求
 */
export interface AddAccountRequest {
  /** 账户名称 */
  accountName: string
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 管家账号（组织ID） */
  organizationId: string
  /** Cookie */
  cookie: string
  /** CSRF Token */
  csrfToken: string
  /** 备注 */
  remark?: string
}

/**
 * 添加账户响应
 */
export interface AddAccountResponse {
  /** 是否成功 */
  success: boolean
  /** 账户ID */
  id?: number
  /** 账户信息 */
  account?: Account
  /** 错误消息 */
  error?: string
}

/**
 * 打开登录窗口请求
 */
export interface OpenLoginWindowRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 登录URL */
  loginUrl: string
  /** 可选：自定义执行的JavaScript代码 */
  customScript?: string
  /** 管家账号（组织ID） */
  organizationId: string
}

/**
 * 打开登录窗口响应
 */
export interface OpenLoginWindowResponse {
  /** 是否成功 */
  success: boolean
  /** Cookie */
  cookie?: string
  /** 错误消息 */
  error?: string
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 日志唯一ID */
  id: string
  /** 时间戳 */
  timestamp: number
  /** 日志级别 */
  level: LogLevel
  /** 日志消息 */
  message: string
  /** 附加数据 */
  data?: unknown
  /** 来源 */
  source?: string
}

/**
 * 直播间指标数据
 */
export interface LiveMetrics {
  live_st: number
  live_dt: number
  total_live_watch_cnt: number
  total_live_avg_watch_duration: number
  total_live_follow_cnt: number
  total_live_comment_cnt: number
  total_live_like_cnt: number
  live_card_icon_component_click_count: number
  stat_cost: number
  total_live_watch_ucnt?: number
  total_live_watch_duration?: number
  cost?: number
}

/**
 * 直播间信息
 */
export interface LiveRoomInfo {
  user_id: string
  unique_id: string
  nickname: string
  avatar_thumb: string
  room_id: string
  stream_url: string
  status: number
  user_count: number
  metrics: LiveMetrics
  promotion_status: string
  start_time?: number
}

export interface AccountWithLiveRoom {
  accountId: number
  accountName: string
  organizationId: string
  liveRoom: LiveRoomInfo
}

export interface AccountWithSimpleRoom {
  accountId: number
  accountName: string
  organizationId: string
  roomId: string
  anchorNickname: string
}

/**
 * 直播概览数据
 */
export interface LiveOverview {
  line_online_count: number
  promotion_count: number
  cumulative_views_count: number
  avg_views_count: number
}

/**
 * 分页信息
 */
export interface Pagination {
  page: number
  limit: number
  total: number
}

/**
 * 直播列表响应数据
 */
export interface LiveIESListData {
  list: LiveRoomInfo[]
  overview: LiveOverview
  ies_count: number
  pagination: Pagination
}

/**
 * 账户直播间数据
 */
export interface AccountLiveRooms {
  accountId: number
  accountName: string
  organizationId: string
  liveData: LiveIESListData | null
  lastUpdate: number
  success: boolean
  error?: string
}

/**
 * 直播间统计信息
 */
export interface LiveRoomStatistics {
  totalAccounts: number
  successAccounts: number
  failedAccounts: number
  totalLiveRooms: number
  totalOnlineRooms: number
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
 * 监听队列项
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
  /** 是否正在监听 */
  isActive: boolean
}

/**
 * 添加监听请求
 */
export interface AddMonitorRequest {
  /** 直播间ID */
  roomId: string
  /** 账户ID */
  accountId: number
}

/**
 * 批量添加监听请求
 */
export interface BatchAddMonitorRequest {
  /** 监听项列表 */
  items: AddMonitorRequest[]
}

/**
 * 移除监听请求
 */
export interface RemoveMonitorRequest {
  /** 直播间ID */
  roomId: string
  /** 账户ID */
  accountId: number
}

/**
 * 批量移除监听请求
 */
export interface BatchRemoveMonitorRequest {
  /** 监听项列表 */
  items: RemoveMonitorRequest[]
}

/**
 * 监听操作结果
 */
export interface MonitorOperationResult {
  /** 是否成功 */
  success: boolean
  /** 错误消息 */
  message?: string
  /** 返回数据 */
  data?:
    | MonitorQueueItem
    | MonitorQueueItem[]
    | Array<{
        roomId: string
        success: boolean
        message?: string
      }>
}

/**
 * 监听队列统计
 */
export interface MonitorQueueStats {
  /** 总监听数量 */
  total: number
  /** 活跃监听数量 */
  active: number
  /** 暂停监听数量 */
  paused: number
  /** 按账户分组的统计 */
  byAccount: Array<{
    accountId: number
    accountName: string
    count: number
  }>
}

/**
 * IPC 请求和响应类型映射
 */
export interface IPCTypeMap {
  // 配置管理
  'config:get': {
    request: void
    response: SystemConfig
  }
  'config:save': {
    request: SystemConfig
    response: { success: boolean }
  }
  'config:reset': {
    request: void
    response: SystemConfig
  }
  'config:getPath': {
    request: void
    response: string
  }
  'config:testConnection': {
    request: SystemConfig
    response: ConnectionTestResult
  }

  // 文件对话框
  'dialog:openFile': {
    request: OpenFileOptions | undefined
    response: string | null
  }
  'dialog:openFiles': {
    request: OpenFileOptions | undefined
    response: string[]
  }
  'dialog:openDirectory': {
    request: OpenFileOptions | undefined
    response: string | null
  }
  'dialog:saveFile': {
    request: SaveFileOptions | undefined
    response: string | null
  }
  'dialog:showMessage': {
    request: MessageBoxOptions
    response: MessageBoxResponse | void
  }

  // 账户管理
  'account:add': {
    request: AddAccountRequest
    response: AddAccountResponse
  }
  'account:delete': {
    request: { id: number }
    response: { success: boolean }
  }
  'account:list': {
    request: void
    response: Account[]
  }
  'account:update': {
    request: Account
    response: { success: boolean }
  }
  'account:openLoginWindow': {
    request: OpenLoginWindowRequest
    response: OpenLoginWindowResponse
  }
  'account:reverify': {
    request: OpenLoginWindowRequest & { accountId: number }
    response: OpenLoginWindowResponse
  }

  // 日志管理
  'logger:get-all': {
    request: void
    response: LogEntry[]
  }
  'logger:clear': {
    request: void
    response: { success: boolean }
  }

  // 直播间管理
  'live-room:get-all': {
    request: void
    response: AccountLiveRooms[]
  }
  'live-room:get-by-account': {
    request: { accountId: number }
    response: AccountLiveRooms | null
  }
  'live-room:refresh': {
    request: void
    response: { success: boolean }
  }
  'live-room:refresh-account': {
    request: { accountId: number }
    response: AccountLiveRooms | null
  }
  'live-room:get-statistics': {
    request: void
    response: LiveRoomStatistics
  }
  'live-room:get-attributes': {
    request: { accountId: number; roomIds: string[]; attributes: string[] }
    response: LiveRoomAttributesData | null
  }
  'live-room:get-flow-list': {
    request: {
      accountId: number
      roomIds: string[]
      startTime: number
      endTime: number
      dims: number
    }
    response: LiveRoomFlowListData | null
  }
  'live-room:get-user-image': {
    request: {
      accountId: number
      roomIds: string[]
      startTime: number
      endTime: number
      dims: UserImageDimension | number
    }
    response: LiveRoomUserImageData | null
  }
  'live-room:get-comment': {
    request: {
      accountId: number
      roomIds: string[]
      startTime: number
      endTime: number
    }
    response: LiveRoomCommentData | null
  }

  // 监听队列管理接口
  'monitor-queue:add': {
    request: AddMonitorRequest
    response: MonitorOperationResult
  }
  'monitor-queue:batch-add': {
    request: BatchAddMonitorRequest
    response: MonitorOperationResult
  }
  'monitor-queue:remove': {
    request: RemoveMonitorRequest
    response: MonitorOperationResult
  }
  'monitor-queue:batch-remove': {
    request: BatchRemoveMonitorRequest
    response: MonitorOperationResult
  }
  'monitor-queue:list': {
    request: void
    response: MonitorQueueItem[]
  }
  'monitor-queue:get-by-account': {
    request: { accountId: number }
    response: MonitorQueueItem[]
  }
  'monitor-queue:get-stats': {
    request: void
    response: MonitorQueueStats
  }
  'monitor-queue:clear': {
    request: void
    response: MonitorOperationResult
  }
  'monitor-queue:start': {
    request: void
    response: { success: boolean }
  }
  'monitor-queue:stop': {
    request: void
    response: { success: boolean }
  }
  'monitor-queue:set-interval': {
    request: { interval: number }
    response: { success: boolean }
  }
}

/**
 * IPC 调用辅助类型
 */
export type IPCInvoke<T extends keyof IPCTypeMap> = (
  channel: T,
  ...args: IPCTypeMap[T]['request'] extends void ? [] : [IPCTypeMap[T]['request']]
) => Promise<IPCTypeMap[T]['response']>
