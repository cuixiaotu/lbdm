import Database from 'better-sqlite3-multiple-ciphers'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { AccountsTable } from './tables/accounts'
import { MonitorQueueTable } from './tables/monitorQueue'

export class DatabaseManager {
  private static instance: DatabaseManager | null = null
  private db!: Database.Database
  private accountsTable!: AccountsTable
  private monitorQueueTable!: MonitorQueueTable
  private dbPath: string
  private currentVersion: number = 1

  private constructor() {
    // 数据库文件路径：
    // - 开发环境：项目根目录/tmp/database.db
    // - 生产环境：应用数据目录/database.db
    if (app.isPackaged) {
      // 生产环境：使用用户数据目录
      const userDataPath = app.getPath('userData')
      this.dbPath = path.join(userDataPath, 'database.db')
    } else {
      // 开发环境：使用项目根目录的 tmp 目录
      const rootPath = app.getAppPath()
      const tmpDir = path.join(rootPath, 'tmp')
      // 确保 tmp 目录存在
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }
      this.dbPath = path.join(tmpDir, 'database.db')
      console.log(`[开发模式] 数据库文件路径: ${this.dbPath}`)
    }
    this.init()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  /**
   * 初始化数据库
   */
  private init(): void {
    try {
      // 确保数据库目录存在
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // 初始化数据库连接
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL')

      // 初始化表
      this.accountsTable = new AccountsTable(this.db)
      this.accountsTable.init()

      this.monitorQueueTable = new MonitorQueueTable(this.db)
      this.monitorQueueTable.init()

      // 版本管理
      this.initVersionTable()
      this.runMigrations()

      console.log('数据库初始化成功:', this.dbPath)
    } catch (error) {
      console.error('数据库初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化版本表
   */
  private initVersionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY,
        updated_at INTEGER NOT NULL
      );
    `)

    const row = this.db.prepare('SELECT version FROM db_version LIMIT 1').get() as
      | { version: number }
      | undefined
    this.currentVersion = row?.version || 0

    if (this.currentVersion === 0) {
      // 第一次初始化，设置为 v1
      this.db.prepare('INSERT INTO db_version (version, updated_at) VALUES (1, ?)').run(Date.now())
      this.currentVersion = 1
      console.log('数据库版本初始化: v1')
    } else {
      console.log(`当前数据库版本: v${this.currentVersion}`)
    }
  }

  /**
   * 运行数据库迁移（第一次发布，暂无迁移）
   */
  private runMigrations(): void {
    // 第一次发布，暂无需要迁移逻辑
    // 未来如需迁移，可在此添加迁移代码
  }

  /**
   * 获取账户表实例
   */
  public getAccountsTable(): AccountsTable {
    return this.accountsTable
  }

  /**
   * 获取监听队列表实例
   */
  public getMonitorQueueTable(): MonitorQueueTable {
    return this.monitorQueueTable
  }

  /**
   * 关闭数据库连接
   */
  public close(): void {
    if (this.db) {
      this.db.close()
      console.log('数据库连接已关闭')
    }
  }
}

// 导出单例获取方法
export const getDatabase = (): DatabaseManager => {
  return DatabaseManager.getInstance()
}
