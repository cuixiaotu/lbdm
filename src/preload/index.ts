import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  IPC_CHANNELS,
  LOGGER_CHANNELS,
  LIVE_ROOM_CHANNELS,
  ACCOUNT_MONITOR_CHANNELS,
  MONITOR_QUEUE_CHANNELS,
  type IPCTypeMap,
  type LogEntry,
  type AccountLiveRooms,
  type RemoveMonitorRequest,
  type AccountWithSimpleRoom
} from '../shared/ipc'

// Custom APIs for renderer
const api = {
  config: {
    get: () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET) as Promise<IPCTypeMap['config:get']['response']>,
    save: (config: IPCTypeMap['config:save']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE, config) as Promise<
        IPCTypeMap['config:save']['response']
      >,
    reset: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RESET) as Promise<IPCTypeMap['config:reset']['response']>,
    getPath: () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_PATH) as Promise<
        IPCTypeMap['config:getPath']['response']
      >,
    testConnection: (config: IPCTypeMap['config:testConnection']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_CONNECTION, config) as Promise<
        IPCTypeMap['config:testConnection']['response']
      >
  },
  dialog: {
    openFile: (options?: IPCTypeMap['dialog:openFile']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE, options) as Promise<
        IPCTypeMap['dialog:openFile']['response']
      >,
    openFiles: (options?: IPCTypeMap['dialog:openFiles']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILES, options) as Promise<
        IPCTypeMap['dialog:openFiles']['response']
      >,
    openDirectory: (options?: IPCTypeMap['dialog:openDirectory']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.OPEN_DIRECTORY, options) as Promise<
        IPCTypeMap['dialog:openDirectory']['response']
      >,
    saveFile: (options?: IPCTypeMap['dialog:saveFile']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE, options) as Promise<
        IPCTypeMap['dialog:saveFile']['response']
      >,
    showMessage: (options: IPCTypeMap['dialog:showMessage']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.SHOW_MESSAGE, options) as Promise<
        IPCTypeMap['dialog:showMessage']['response']
      >
  },
  account: {
    openLoginWindow: (request: IPCTypeMap['account:openLoginWindow']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.OPEN_LOGIN_WINDOW, request) as Promise<
        IPCTypeMap['account:openLoginWindow']['response']
      >,
    add: (request: IPCTypeMap['account:add']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADD, request) as Promise<
        IPCTypeMap['account:add']['response']
      >,
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.LIST) as Promise<IPCTypeMap['account:list']['response']>,
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE, { id }) as Promise<
        IPCTypeMap['account:delete']['response']
      >,
    update: (account: IPCTypeMap['account:update']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE, account) as Promise<
        IPCTypeMap['account:update']['response']
      >,
    reverify: (request: IPCTypeMap['account:reverify']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.REVERIFY, request) as Promise<
        IPCTypeMap['account:reverify']['response']
      >,
    validateCredentials: (accountId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_CREDENTIALS, { accountId }) as Promise<{
        success: boolean
        isValid: boolean
        error?: string
      }>
  },
  logger: {
    getAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_ALL) as Promise<IPCTypeMap['logger:get-all']['response']>,
    clear: () =>
      ipcRenderer.invoke(IPC_CHANNELS.CLEAR) as Promise<IPCTypeMap['logger:clear']['response']>,
    on: (callback: (event: unknown, log: LogEntry) => void) => {
      console.log('[Preload] Adding listener for', IPC_CHANNELS.NEW_LOG)
      ipcRenderer.on(IPC_CHANNELS.NEW_LOG, callback)
    },
    off: (callback: (event: unknown, log: LogEntry) => void) => {
      console.log(
        '[Preload] Removing listener for',
        IPC_CHANNELS.NEW_LOG,
        'callback:',
        callback.name || 'anonymous'
      )
      ipcRenderer.removeListener(IPC_CHANNELS.NEW_LOG, callback)
      console.log('[Preload] Listener removed successfully')
    },
    onClear: (callback: () => void) => {
      console.log('[Preload] Adding listener for', IPC_CHANNELS.CLEAR)
      ipcRenderer.on(IPC_CHANNELS.CLEAR, callback)
    },
    offClear: (callback: () => void) => {
      console.log('[Preload] Removing listener for', IPC_CHANNELS.CLEAR)
      ipcRenderer.removeListener(IPC_CHANNELS.CLEAR, callback)
      console.log('[Preload] Clear listener removed successfully')
    },
    onRaw: (callback: (event: unknown, message: string) => void) => {
      console.log('[Preload] Adding listener for', LOGGER_CHANNELS.RAW_LOG)
      ipcRenderer.on(LOGGER_CHANNELS.RAW_LOG, callback)
    },
    offRaw: (callback: (event: unknown, message: string) => void) => {
      console.log('[Preload] Removing listener for', LOGGER_CHANNELS.RAW_LOG)
      ipcRenderer.removeListener(LOGGER_CHANNELS.RAW_LOG, callback)
      console.log('[Preload] Raw log listener removed successfully')
    },
    notifyCleanupComplete: () => {
      console.log('[Preload] Sending window:cleanup-complete to main process')
      ipcRenderer.send('window:cleanup-complete')
    }
  },
  liveRoom: {
    getAll: () =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_ALL) as Promise<
        IPCTypeMap['live-room:get-all']['response']
      >,
    getByAccount: (accountId: number) =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_BY_ACCOUNT, { accountId }) as Promise<
        IPCTypeMap['live-room:get-by-account']['response']
      >,
    refresh: () =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.REFRESH) as Promise<
        IPCTypeMap['live-room:refresh']['response']
      >,
    refreshAccount: (accountId: number) =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.REFRESH_ACCOUNT, { accountId }) as Promise<
        IPCTypeMap['live-room:refresh-account']['response']
      >,
    refreshAccountForce: (accountId: number) =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.FORCE_REFRESH_ACCOUNT, { accountId }) as Promise<
        IPCTypeMap['live-room:refresh-account']['response']
      >,
    getStatistics: () =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_STATISTICS) as Promise<
        IPCTypeMap['live-room:get-statistics']['response']
      >,
    getAttributes: (accountId: number, roomIds: string[], attributes: string[]) =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_ATTRIBUTES, {
        accountId,
        roomIds,
        attributes
      }) as Promise<IPCTypeMap['live-room:get-attributes']['response']>,
    getFlowList: (
      accountId: number,
      roomIds: string[],
      startTime: number,
      endTime: number,
      dims: number
    ) =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_FLOW_LIST, {
        accountId,
        roomIds,
        startTime,
        endTime,
        dims
      }) as Promise<IPCTypeMap['live-room:get-flow-list']['response']>,
    getUserImage: (
      accountId: number,
      roomIds: string[],
      startTime: number,
      endTime: number,
      dims: number
    ) =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_USER_IMAGE, {
        accountId,
        roomIds,
        startTime,
        endTime,
        dims
      }) as Promise<IPCTypeMap['live-room:get-user-image']['response']>,
    getComment: (accountId: number, roomIds: string[], startTime: number, endTime: number) =>
      ipcRenderer.invoke(LIVE_ROOM_CHANNELS.GET_COMMENT, {
        accountId,
        roomIds,
        startTime,
        endTime
      }) as Promise<IPCTypeMap['live-room:get-comment']['response']>,
    onUpdated: (callback: (data: AccountLiveRooms[]) => void) => {
      const listener = (_event: unknown, data: AccountLiveRooms[]): void => callback(data)
      ipcRenderer.on(LIVE_ROOM_CHANNELS.UPDATED, listener)
      return () => ipcRenderer.removeListener(LIVE_ROOM_CHANNELS.UPDATED, listener)
    }
  },
  accountMonitor: {
    start: () =>
      ipcRenderer.invoke(ACCOUNT_MONITOR_CHANNELS.START) as Promise<{
        success: boolean
        error?: string
      }>,
    stop: () =>
      ipcRenderer.invoke(ACCOUNT_MONITOR_CHANNELS.STOP) as Promise<{
        success: boolean
        error?: string
      }>,
    getStatus: () =>
      ipcRenderer.invoke(ACCOUNT_MONITOR_CHANNELS.GET_STATUS) as Promise<{ isRunning: boolean }>
  },

  monitorQueue: {
    add: (request: AccountWithSimpleRoom) =>
      ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.ADD, request),
    remove: (request: RemoveMonitorRequest) =>
      ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.REMOVE, request),
    list: () => ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.LIST),
    getByAccount: (accountId: number) =>
      ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.GET_BY_ACCOUNT, { accountId }),
    getStats: () => ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.GET_STATS),
    clear: () => ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.CLEAR),
    start: () => ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.START),
    stop: () => ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.STOP),
    getStatus: () => ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.GET_STATUS),
    setInterval: (interval: number) =>
      ipcRenderer.invoke(MONITOR_QUEUE_CHANNELS.SET_INTERVAL, { interval })
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
