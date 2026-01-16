import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  SystemConfig,
  OpenFileOptions,
  SaveFileOptions,
  MessageBoxOptions,
  MessageBoxResponse,
  ConnectionTestResult,
  OpenLoginWindowRequest,
  OpenLoginWindowResponse,
  AddAccountRequest,
  AddAccountResponse,
  Account,
  LogEntry,
  AccountLiveRooms,
  LiveRoomStatistics,
  LiveRoomAttributesData,
  LiveRoomFlowListData,
  LiveRoomUserImageData,
  LiveRoomCommentData,
  MonitorQueueItem,
  RemoveMonitorRequest,
  MonitorOperationResult,
  MonitorQueueStats,
  AccountWithSimpleRoom
} from '../shared/ipc'

interface ConfigAPI {
  get: () => Promise<SystemConfig>
  save: (config: SystemConfig) => Promise<{ success: boolean }>
  reset: () => Promise<SystemConfig>
  getPath: () => Promise<string>
  testConnection: (config: SystemConfig) => Promise<ConnectionTestResult>
}

interface DialogAPI {
  openFile: (options?: OpenFileOptions) => Promise<string | null>
  openFiles: (options?: OpenFileOptions) => Promise<string[]>
  openDirectory: (options?: OpenFileOptions) => Promise<string | null>
  saveFile: (options?: SaveFileOptions) => Promise<string | null>
  showMessage: (options: MessageBoxOptions) => Promise<MessageBoxResponse | void>
}

interface AccountAPI {
  openLoginWindow: (request: OpenLoginWindowRequest) => Promise<OpenLoginWindowResponse>
  add: (request: AddAccountRequest) => Promise<AddAccountResponse>
  list: () => Promise<Account[]>
  delete: (id: number) => Promise<{ success: boolean }>
  update: (account: Account) => Promise<{ success: boolean }>
  reverify: (
    request: OpenLoginWindowRequest & { accountId: number }
  ) => Promise<OpenLoginWindowResponse>
  validateCredentials: (
    accountId: number
  ) => Promise<{ success: boolean; isValid: boolean; error?: string }>
}

interface LoggerAPI {
  getAll: () => Promise<LogEntry[]>
  clear: () => Promise<{ success: boolean }>
  on: (callback: (event: unknown, log: LogEntry) => void) => void
  off: (callback: (event: unknown, log: LogEntry) => void) => void
  onClear: (callback: () => void) => void
  offClear: (callback: () => void) => void
  onRaw: (callback: (event: unknown, message: string) => void) => void
  offRaw: (callback: (event: unknown, message: string) => void) => void
  notifyCleanupComplete: () => void
}

interface LiveRoomAPI {
  getAll: () => Promise<AccountLiveRooms[]>
  getStatistics: () => Promise<LiveRoomStatistics>
  getByAccount: (accountId: number) => Promise<AccountLiveRooms | null>
  refresh: () => Promise<{ success: boolean }>
  refreshAccount: (accountId: number) => Promise<AccountLiveRooms | null>
  getAttributes: (
    accountId: number,
    roomIds: string[],
    attributes: string[]
  ) => Promise<LiveRoomAttributesData | null>
  getFlowList: (
    accountId: number,
    roomIds: string[],
    startTime: number,
    endTime: number,
    dims: number
  ) => Promise<LiveRoomFlowListData | null>
  getUserImage: (
    accountId: number,
    roomIds: string[],
    startTime: number,
    endTime: number,
    dims: number
  ) => Promise<LiveRoomUserImageData | null>
  getComment: (
    accountId: number,
    roomIds: string[],
    startTime: number,
    endTime: number
  ) => Promise<LiveRoomCommentData | null>
  onUpdated: (callback: (data: AccountLiveRooms[]) => void) => () => void
}

interface AccountMonitorAPI {
  start: () => Promise<{ success: boolean; error?: string }>
  stop: () => Promise<{ success: boolean; error?: string }>
  getStatus: () => Promise<{ isRunning: boolean }>
}

interface MonitorQueueAPI {
  add: (request: AccountWithSimpleRoom) => Promise<MonitorOperationResult>
  remove: (request: RemoveMonitorRequest) => Promise<MonitorOperationResult>
  list: () => Promise<MonitorQueueItem[]>
  getByAccount: (accountId: number) => Promise<MonitorQueueItem[]>
  getStats: () => Promise<MonitorQueueStats>
  clear: () => Promise<MonitorOperationResult>
  start: () => Promise<{ success: boolean }>
  stop: () => Promise<{ success: boolean }>
  getStatus: () => Promise<{ isRunning: boolean }>
  setInterval: (interval: number) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      config: ConfigAPI
      dialog: DialogAPI
      account: AccountAPI
      logger: LoggerAPI
      liveRoom: LiveRoomAPI
      accountMonitor: AccountMonitorAPI
      monitorQueue: MonitorQueueAPI
    }
  }
}
