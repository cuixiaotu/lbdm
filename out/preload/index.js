"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const CONFIG_CHANNELS = {
  /** 获取配置 */
  GET: "config:get",
  /** 保存配置 */
  SAVE: "config:save",
  /** 重置配置 */
  RESET: "config:reset",
  /** 获取配置文件路径 */
  GET_PATH: "config:getPath",
  /** 测试连接 */
  TEST_CONNECTION: "config:testConnection"
};
const DIALOG_CHANNELS = {
  /** 打开文件选择对话框 */
  OPEN_FILE: "dialog:openFile",
  /** 打开多文件选择对话框 */
  OPEN_FILES: "dialog:openFiles",
  /** 打开目录选择对话框 */
  OPEN_DIRECTORY: "dialog:openDirectory",
  /** 保存文件对话框 */
  SAVE_FILE: "dialog:saveFile",
  /** 显示消息框 */
  SHOW_MESSAGE: "dialog:showMessage"
};
const ACCOUNT_CHANNELS = {
  /** 添加账户 */
  ADD: "account:add",
  /** 删除账户 */
  DELETE: "account:delete",
  /** 获取账户列表 */
  LIST: "account:list",
  /** 更新账户 */
  UPDATE: "account:update",
  /** 打开登录窗口 */
  OPEN_LOGIN_WINDOW: "account:openLoginWindow",
  /** 重新验证账户凭证 */
  REVERIFY: "account:reverify",
  /** 验证账户凭证是否有效 */
  VALIDATE_CREDENTIALS: "account:validateCredentials"
};
const LOGGER_CHANNELS = {
  /** 获取所有日志 */
  GET_ALL: "logger:get-all",
  /** 清空日志 */
  CLEAR: "logger:clear",
  /** 新日志（事件） */
  NEW_LOG: "logger:new-log",
  /** 原始日志（事件） */
  RAW_LOG: "logger:raw-log"
};
const LIVE_ROOM_CHANNELS = {
  /** 获取所有直播间数据 */
  GET_ALL: "live-room:get-all",
  /** 获取指定账户的直播间数据 */
  GET_BY_ACCOUNT: "live-room:get-by-account",
  /** 刷新所有直播间数据 */
  REFRESH: "live-room:refresh",
  /** 刷新指定账户的直播间数据 */
  REFRESH_ACCOUNT: "live-room:refresh-account",
  /** 强制刷新指定账户的直播间数据 */
  FORCE_REFRESH_ACCOUNT: "live-room:force_refresh-account",
  /** 直播间数据更新（事件） */
  UPDATED: "live-room:updated",
  /** 获取统计信息 */
  GET_STATISTICS: "live-room:get-statistics",
  /** 获取直播间属性 */
  GET_ATTRIBUTES: "live-room:get-attributes",
  /** 获取直播间流量列表 */
  GET_FLOW_LIST: "live-room:get-flow-list",
  /** 获取直播间用户画像 */
  GET_USER_IMAGE: "live-room:get-user-image",
  /** 获取直播间评论 */
  GET_COMMENT: "live-room:get-comment"
};
const ACCOUNT_MONITOR_CHANNELS = {
  /** 启动监控 */
  START: "account-monitor:start",
  /** 停止监控 */
  STOP: "account-monitor:stop",
  /** 获取监控状态 */
  GET_STATUS: "account-monitor:get-status"
};
const MONITOR_QUEUE_CHANNELS = {
  /** 添加单个直播间到监听队列 */
  ADD: "monitor-queue:add",
  /** 批量添加直播间到监听队列 */
  BATCH_ADD: "monitor-queue:batch-add",
  /** 从监听队列移除单个直播间 */
  REMOVE: "monitor-queue:remove",
  /** 批量从监听队列移除直播间 */
  BATCH_REMOVE: "monitor-queue:batch-remove",
  /** 获取监听队列列表 */
  LIST: "monitor-queue:list",
  /** 根据账户ID获取监听队列 */
  GET_BY_ACCOUNT: "monitor-queue:get-by-account",
  /** 获取监听队列统计 */
  GET_STATS: "monitor-queue:get-stats",
  /** 清空监听队列 */
  CLEAR: "monitor-queue:clear",
  /** 启动监听队列服务 */
  START: "monitor-queue:start",
  /** 停止监听队列服务 */
  STOP: "monitor-queue:stop",
  /** 获取监听队列服务状态 */
  GET_STATUS: "monitor-queue:get-status",
  /** 设置监听队列轮询间隔 */
  SET_INTERVAL: "monitor-queue:set-interval"
};
const IPC_CHANNELS = {
  ...CONFIG_CHANNELS,
  ...DIALOG_CHANNELS,
  ...LOGGER_CHANNELS,
  ...LIVE_ROOM_CHANNELS,
  ...ACCOUNT_MONITOR_CHANNELS,
  ...MONITOR_QUEUE_CHANNELS,
  ...ACCOUNT_CHANNELS
};
const api = {
  config: {
    get: () => electron.ipcRenderer.invoke(IPC_CHANNELS.GET),
    save: (config) => electron.ipcRenderer.invoke(IPC_CHANNELS.SAVE, config),
    reset: () => electron.ipcRenderer.invoke(IPC_CHANNELS.RESET),
    getPath: () => electron.ipcRenderer.invoke(IPC_CHANNELS.GET_PATH),
    testConnection: (config) => electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_CONNECTION, config)
  },
  dialog: {
    openFile: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE, options),
    openFiles: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILES, options),
    openDirectory: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.OPEN_DIRECTORY, options),
    saveFile: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE, options),
    showMessage: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.SHOW_MESSAGE, options)
  },
  account: {
    openLoginWindow: (request) => electron.ipcRenderer.invoke(IPC_CHANNELS.OPEN_LOGIN_WINDOW, request),
    add: (request) => electron.ipcRenderer.invoke(IPC_CHANNELS.ADD, request),
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.LIST),
    delete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.DELETE, { id }),
    update: (account) => electron.ipcRenderer.invoke(IPC_CHANNELS.UPDATE, account),
    reverify: (request) => electron.ipcRenderer.invoke(IPC_CHANNELS.REVERIFY, request),
    validateCredentials: (accountId) => electron.ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_CREDENTIALS, { accountId })
  },
  logger: {
    getAll: () => electron.ipcRenderer.invoke(IPC_CHANNELS.GET_ALL),
    clear: () => electron.ipcRenderer.invoke(IPC_CHANNELS.CLEAR),
    on: (callback) => {
      console.log("[Preload] Adding listener for", IPC_CHANNELS.NEW_LOG);
      electron.ipcRenderer.on(IPC_CHANNELS.NEW_LOG, callback);
    },
    off: (callback) => {
      console.log(
        "[Preload] Removing listener for",
        IPC_CHANNELS.NEW_LOG,
        "callback:",
        callback.name || "anonymous"
      );
      electron.ipcRenderer.removeListener(IPC_CHANNELS.NEW_LOG, callback);
      console.log("[Preload] Listener removed successfully");
    },
    onClear: (callback) => {
      console.log("[Preload] Adding listener for", IPC_CHANNELS.CLEAR);
      electron.ipcRenderer.on(IPC_CHANNELS.CLEAR, callback);
    },
    offClear: (callback) => {
      console.log("[Preload] Removing listener for", IPC_CHANNELS.CLEAR);
      electron.ipcRenderer.removeListener(IPC_CHANNELS.CLEAR, callback);
      console.log("[Preload] Clear listener removed successfully");
    },
    onRaw: (callback) => {
      console.log("[Preload] Adding listener for", LOGGER_CHANNELS.RAW_LOG);
      electron.ipcRenderer.on(LOGGER_CHANNELS.RAW_LOG, callback);
    },
    offRaw: (callback) => {
      console.log("[Preload] Removing listener for", LOGGER_CHANNELS.RAW_LOG);
      electron.ipcRenderer.removeListener(LOGGER_CHANNELS.RAW_LOG, callback);
      console.log("[Preload] Raw log listener removed successfully");
    },
    notifyCleanupComplete: () => {
      console.log("[Preload] Sending window:cleanup-complete to main process");
      electron.ipcRenderer.send("window:cleanup-complete");
    }
  },
  liveRoom: {
    getAll: () => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_ALL),
    getByAccount: (accountId) => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_BY_ACCOUNT, { accountId }),
    refresh: () => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.REFRESH),
    refreshAccount: (accountId) => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.REFRESH_ACCOUNT, { accountId }),
    refreshAccountForce: (accountId) => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.FORCE_REFRESH_ACCOUNT, { accountId }),
    getStatistics: () => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_STATISTICS),
    getAttributes: (accountId, roomIds, attributes) => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_ATTRIBUTES, {
      accountId,
      roomIds,
      attributes
    }),
    getFlowList: (accountId, roomIds, startTime, endTime, dims) => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_FLOW_LIST, {
      accountId,
      roomIds,
      startTime,
      endTime,
      dims
    }),
    getUserImage: (accountId, roomIds, startTime, endTime, dims) => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_USER_IMAGE, {
      accountId,
      roomIds,
      startTime,
      endTime,
      dims
    }),
    getComment: (accountId, roomIds, startTime, endTime) => electron.ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_COMMENT, {
      accountId,
      roomIds,
      startTime,
      endTime
    }),
    onUpdated: (callback) => {
      const listener = (_event, data) => callback(data);
      electron.ipcRenderer.on(LIVE_ROOM_CHANNELS.UPDATED, listener);
      return () => electron.ipcRenderer.removeListener(LIVE_ROOM_CHANNELS.UPDATED, listener);
    }
  },
  accountMonitor: {
    start: () => electron.ipcRenderer.invoke(ACCOUNT_MONITOR_CHANNELS.START),
    stop: () => electron.ipcRenderer.invoke(ACCOUNT_MONITOR_CHANNELS.STOP),
    getStatus: () => electron.ipcRenderer.invoke(ACCOUNT_MONITOR_CHANNELS.GET_STATUS)
  },
  monitorQueue: {
    add: (request) => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.ADD, request),
    remove: (request) => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.REMOVE, request),
    list: () => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.LIST),
    getByAccount: (accountId) => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.GET_BY_ACCOUNT, { accountId }),
    getStats: () => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.GET_STATS),
    clear: () => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.CLEAR),
    start: () => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.START),
    stop: () => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.STOP),
    getStatus: () => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.GET_STATUS),
    setInterval: (interval) => electron.ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.SET_INTERVAL, { interval })
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
