/**
 * IPC 通信频道定义
 * 主进程和渲染进程共享的事件名称常量
 */

/**
 * 配置管理相关频道
 */
export const CONFIG_CHANNELS = {
  /** 获取配置 */
  GET: 'config:get',
  /** 保存配置 */
  SAVE: 'config:save',
  /** 重置配置 */
  RESET: 'config:reset',
  /** 获取配置文件路径 */
  GET_PATH: 'config:getPath',
  /** 测试连接 */
  TEST_CONNECTION: 'config:testConnection'
} as const

/**
 * 文件对话框相关频道
 */
export const DIALOG_CHANNELS = {
  /** 打开文件选择对话框 */
  OPEN_FILE: 'dialog:openFile',
  /** 打开多文件选择对话框 */
  OPEN_FILES: 'dialog:openFiles',
  /** 打开目录选择对话框 */
  OPEN_DIRECTORY: 'dialog:openDirectory',
  /** 保存文件对话框 */
  SAVE_FILE: 'dialog:saveFile',
  /** 显示消息框 */
  SHOW_MESSAGE: 'dialog:showMessage'
} as const

/**
 * 账户管理相关频道
 */
export const ACCOUNT_CHANNELS = {
  /** 添加账户 */
  ADD: 'account:add',
  /** 删除账户 */
  DELETE: 'account:delete',
  /** 获取账户列表 */
  LIST: 'account:list',
  /** 更新账户 */
  UPDATE: 'account:update',
  /** 打开登录窗口 */
  OPEN_LOGIN_WINDOW: 'account:openLoginWindow',
  /** 重新验证账户凭证 */
  REVERIFY: 'account:reverify',
  /** 验证账户凭证是否有效 */
  VALIDATE_CREDENTIALS: 'account:validateCredentials'
} as const

/**
 * 日志管理相关频道
 */
export const LOGGER_CHANNELS = {
  /** 获取所有日志 */
  GET_ALL: 'logger:get-all',
  /** 清空日志 */
  CLEAR: 'logger:clear',
  /** 新日志（事件） */
  NEW_LOG: 'logger:new-log',
  /** 原始日志（事件） */
  RAW_LOG: 'logger:raw-log'
} as const

/**
 * 直播间管理相关频道
 */
export const LIVE_ROOM_CHANNELS = {
  /** 获取所有直播间数据 */
  GET_ALL: 'live-room:get-all',
  /** 获取指定账户的直播间数据 */
  GET_BY_ACCOUNT: 'live-room:get-by-account',
  /** 刷新所有直播间数据 */
  REFRESH: 'live-room:refresh',
  /** 刷新指定账户的直播间数据 */
  REFRESH_ACCOUNT: 'live-room:refresh-account',
  /** 强制刷新指定账户的直播间数据 */
  FORCE_REFRESH_ACCOUNT: 'live-room:force_refresh-account',
  /** 直播间数据更新（事件） */
  UPDATED: 'live-room:updated',
  /** 获取统计信息 */
  GET_STATISTICS: 'live-room:get-statistics',
  /** 获取直播间属性 */
  GET_ATTRIBUTES: 'live-room:get-attributes',
  /** 获取直播间流量列表 */
  GET_FLOW_LIST: 'live-room:get-flow-list',
  /** 获取直播间用户画像 */
  GET_USER_IMAGE: 'live-room:get-user-image',
  /** 获取直播间评论 */
  GET_COMMENT: 'live-room:get-comment'
} as const

/**
 * 账户监控服务控制相关频道
 */
export const ACCOUNT_MONITOR_CHANNELS = {
  /** 启动监控 */
  START: 'account-monitor:start',
  /** 停止监控 */
  STOP: 'account-monitor:stop',
  /** 获取监控状态 */
  GET_STATUS: 'account-monitor:get-status'
} as const

/**
 * 监听队列管理相关频道
 */
export const MONITOR_QUEUE_CHANNELS = {
  /** 添加单个直播间到监听队列 */
  ADD: 'monitor-queue:add',
  /** 批量添加直播间到监听队列 */
  BATCH_ADD: 'monitor-queue:batch-add',
  /** 从监听队列移除单个直播间 */
  REMOVE: 'monitor-queue:remove',
  /** 批量从监听队列移除直播间 */
  BATCH_REMOVE: 'monitor-queue:batch-remove',
  /** 获取监听队列列表 */
  LIST: 'monitor-queue:list',
  /** 根据账户ID获取监听队列 */
  GET_BY_ACCOUNT: 'monitor-queue:get-by-account',
  /** 获取监听队列统计 */
  GET_STATS: 'monitor-queue:get-stats',
  /** 清空监听队列 */
  CLEAR: 'monitor-queue:clear',
  /** 启动监听队列服务 */
  START: 'monitor-queue:start',
  /** 停止监听队列服务 */
  STOP: 'monitor-queue:stop',
  /** 获取监听队列服务状态 */
  GET_STATUS: 'monitor-queue:get-status',
  /** 设置监听队列轮询间隔 */
  SET_INTERVAL: 'monitor-queue:set-interval'
} as const

/**
 * 所有 IPC 频道的联合类型
 */
export const IPC_CHANNELS = {
  ...CONFIG_CHANNELS,
  ...DIALOG_CHANNELS,
  ...LOGGER_CHANNELS,
  ...LIVE_ROOM_CHANNELS,
  ...ACCOUNT_MONITOR_CHANNELS,
  ...MONITOR_QUEUE_CHANNELS,
  ...ACCOUNT_CHANNELS
} as const

/**
 * IPC 频道类型
 */
export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
