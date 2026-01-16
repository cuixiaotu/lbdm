/**
 * 数据库服务
 * 支持直接连接和通过SSH隧道连接MySQL数据库
 */

import * as mysql from "mysql2/promise";
import { Client as SSHClient, type ConnectConfig } from 'ssh2'
import * as net from 'net'
import * as fs from 'fs'
import { configManager } from '../config/configManager'
import type { SystemConfig } from '../../shared/ipc/types'
import * as crypto from "crypto"

/**
 * SSH隧道服务器接口
 */
interface SSHTunnel {
  client: SSHClient
  server: net.Server
  localPort: number
}

/**
 * 数据库连接池
 */
interface DatabasePool {
  pool: mysql.Pool
  tunnel?: SSHTunnel
}

/**
 * 数据库服务类
 */
export class DatabaseService {
  private pool: mysql.Pool | null = null
  private tunnel: SSHTunnel | null = null
  private currentConfig: SystemConfig | null = null
  private debugEnabled = false
  private lastCredentialTimestamp: number = 0
  private credentialTTL = 600
  private reinitPromise: Promise<void> | null = null

  /**
   * 默认密钥
   */
  private defaultPort = 51888;
  private defaultSuffix = "88888888";
  private defaultSecretKey = "88888888";
  private defaultXorKey = "88888888";

  constructor() {
    this.loadDebugConfig()
  }

  /**
   * 加载调试配置
   */
  private loadDebugConfig(): void {
    try {
      const config = configManager.getConfig()
      this.debugEnabled = config.debug?.enableSqlDebug || false
      if (this.debugEnabled) {
        console.log('[DatabaseService] SQL调试已开启')
      }
    } catch (error) {
      console.error('[DatabaseService] 加载调试配置失败:', error)
    }
  }

  /**
   * 设置调试模式
   */
  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    console.log(`[DatabaseService] SQL调试${enabled ? '已开启' : '已关闭'}`)
  }

  /**
   * 判断是否应该使用SSH隧道
   */
  private shouldUseSsh(config: SystemConfig): boolean {
    const ssh = config.ssh

    // 如果没有填写SSH服务器，则不使用SSH
    if (!ssh.server || !ssh.server.trim()) {
      return false
    }

    // 如果填写了SSH服务器，检查必要的连接信息
    if (!ssh.user || !ssh.user.trim()) {
      return false
    }

    // 检查认证方式：密码或密钥至少有一个
    const hasPassword = !!(ssh.password && ssh.password.trim().length > 0)
    const hasPrivateKey = !!(ssh.useSshKey && ssh.privateKey && ssh.privateKey.trim().length > 0)

    return hasPassword || hasPrivateKey
  }

  /**
   * 获取SSH连接配置
   */
  private getSSHConfig(config: SystemConfig): ConnectConfig {
    const ssh = config.ssh
    const sshConfig: ConnectConfig = {
      host: ssh.server,
      port: ssh.port || 22,
      username: ssh.user,
      readyTimeout: 30000 // 30秒超时
    }

    // 配置认证方式
    if (ssh.useSshKey && ssh.privateKey) {
      // 使用SSH密钥
      try {
        // 判断是文件路径还是密钥内容
        if (fs.existsSync(ssh.privateKey)) {
          // 是文件路径，读取文件内容
          sshConfig.privateKey = fs.readFileSync(ssh.privateKey, 'utf8')
        } else {
          // 是密钥内容
          sshConfig.privateKey = ssh.privateKey
        }

        // 如果同时有密码，可能是密钥的passphrase
        if (ssh.password) {
          sshConfig.passphrase = ssh.password
        }
      } catch (error) {
        console.error('读取私钥失败:', error)
        // 降级使用密码认证
        if (ssh.password) {
          sshConfig.password = ssh.password
        }
      }
    } else {
      // 使用密码认证
      sshConfig.password = ssh.password
    }

    return sshConfig
  }

  /**
   * 创建SSH隧道
   */
  private async createSSHTunnel(config: SystemConfig): Promise<SSHTunnel> {
    return new Promise((resolve, reject) => {
      const sshClient = new SSHClient()
      const sshConfig = this.getSSHConfig(config)

      console.log('[DatabaseService] Creating SSH tunnel...')

      sshClient
        .on('ready', () => {
          console.log('[DatabaseService] SSH connection established')

          // 创建本地服务器用于端口转发
          const server = net.createServer((sock) => {
            console.log('[DatabaseService] Local connection established')

            sshClient.forwardOut(
              sock.remoteAddress!,
              sock.remotePort!,
              config.database.host,
              config.database.port,
              (err, stream) => {
                if (err) {
                  console.error('[DatabaseService] SSH forwarding error:', err)
                  sock.end()
                  return
                }

                sock.pipe(stream).pipe(sock)

                stream.on('error', (err) => {
                  console.error('[DatabaseService] Stream error:', err)
                  sock.end()
                })

                sock.on('error', (err) => {
                  console.error('[DatabaseService] Socket error:', err)
                  stream.end()
                })
              }
            )
          })

          // 监听随机可用端口
          server.listen(0, '127.0.0.1', () => {
            const address = server.address()
            if (!address || typeof address === 'string') {
              sshClient.end()
              reject(new Error('Failed to get server address'))
              return
            }
            const localPort = address.port
            console.log(`[DatabaseService] SSH tunnel listening on port ${localPort}`)

            resolve({
              client: sshClient,
              server,
              localPort
            })
          })

          server.on('error', (err) => {
            console.error('[DatabaseService] Local server error:', err)
            sshClient.end()
            reject(err)
          })
        })
        .on('error', (err) => {
          console.error('[DatabaseService] SSH connection error:', err)
          reject(new Error(`SSH连接失败: ${err.message}`))
        })
        .connect(sshConfig)
    })
  }

  /**
   * 动态认证：生成 username
   */
  private encodeUsername(rawUser: string): string {
    const ts = Math.floor(Date.now() / 1000)
    this.lastCredentialTimestamp = ts
    const raw = Buffer.from(`${rawUser}|${ts}`, "utf-8");
    const keyBuf = Buffer.from(this.defaultXorKey, "utf-8");
    const xorBytes = Buffer.alloc(raw.length);
    for (let i = 0; i < raw.length; i++) {
      xorBytes[i] = raw[i] ^ keyBuf[i % keyBuf.length];
    }
    return Buffer.from(xorBytes).toString("base64")
  }

  /**
   * 动态认证：生成 password = HMAC_SHA256(username_base64)
   */
  private generatePassword(usernameBase64: string): string {
    return crypto
      .createHmac("sha256", this.defaultSecretKey)
      .update(usernameBase64)
      .digest("hex")
  }

  /**
   * 如果 UI 没填密码 → 使用动态认证
   */
  private buildAuth(user: string, password: string, port: number) {
    const triggerPass = user + this.defaultSuffix
    const shouldUseDynamic = (password === triggerPass) && (port === this.defaultPort)
    if (!shouldUseDynamic) {
      this.lastCredentialTimestamp = Infinity
      return { user, password }
    }
    const encodedUsername = this.encodeUsername(user)
    const dynamicPassword = this.generatePassword(encodedUsername)
    return { user: encodedUsername, password: dynamicPassword }
  }

  /**
   * 创建数据库连接池（直接连接）
   */
  private async createDirectPool(config: SystemConfig): Promise<mysql.Pool> {
    console.log('[DatabaseService] Creating direct database connection pool...')
    const { user: finalUser, password: finalPassword } = this.buildAuth(config.database.user, config.database.password, config.database.port)
    const pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: finalUser,
      password: finalPassword,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    })

    // 测试连接
    try {
      const connection = await pool.getConnection()
      console.log('[DatabaseService] Direct database connection successful')
      connection.release()
    } catch (error) {
      await pool.end()
      throw error
    }

    return pool
  }

  /**
   * 创建数据库连接池（通过SSH隧道）
   */
  private async createTunnelPool(config: SystemConfig): Promise<DatabasePool> {
    console.log('[DatabaseService] Creating database connection through SSH tunnel...')

    // 创建SSH隧道
    const tunnel = await this.createSSHTunnel(config)

    try {
      const { user: finalUser, password: finalPassword } = this.buildAuth(config.database.user, config.database.password, config.database.port)
      // 创建连接到本地端口的数据库连接池
      const pool = mysql.createPool({
        host: '127.0.0.1',
        port: tunnel.localPort,
        user: finalUser,
        password: finalPassword,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      })

      // 测试连接
      try {
        const connection = await pool.getConnection()
        console.log('[DatabaseService] SSH tunneled database connection successful')
        connection.release()
      } catch (error) {
        await pool.end()
        throw error
      }

      return { pool, tunnel }
    } catch (error) {
      // 如果连接失败，关闭隧道
      tunnel.server.close()
      tunnel.client.end()
      throw error
    }
  }

  /**
   * 初始化数据库连接
   * 自动判断是否需要使用SSH隧道
   */
  async initialize(config?: SystemConfig | null): Promise<void> {
    // 如果已有连接，先关闭
    await this.close()

    // 使用传入的配置或从配置管理器获取
    const dbConfig = config || configManager.getConfig()
    this.currentConfig = dbConfig

    try {
      if (this.shouldUseSsh(dbConfig)) {
        console.log('[DatabaseService] Using SSH tunnel connection')
        const { pool, tunnel } = await this.createTunnelPool(dbConfig)
        this.pool = pool
        this.tunnel = tunnel!
      } else {
        console.log('[DatabaseService] Using direct connection')
        this.pool = await this.createDirectPool(dbConfig)
      }

      console.log('[DatabaseService] Database service initialized successfully')
    } catch (error) {
      console.error('[DatabaseService] Failed to initialize:', error)
      throw new Error(`数据库初始化失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 重新初始化连接池
   */
  private async reinitializePool() {
    console.log("[DatabaseService] Credentials expired, rebuilding pool...");
    const oldPool = this.pool;
    this.pool = null
    await this.initialize(this.currentConfig);
    if (oldPool) {
      setTimeout(() => oldPool.end(), 1000);
    }
    console.log("[DatabaseService] Pool rebuilt.");
  }

  /**
   * 判断是否过期
   */
  private isCredentialExpired(): boolean {
    if (this.lastCredentialTimestamp === Infinity) return false
    if (!this.lastCredentialTimestamp) return true
    const now = Math.floor(Date.now() / 1000)
    return now - this.lastCredentialTimestamp > this.credentialTTL
  }

  /**
   * 获取数据库连接池
   */
  async getPool(): Promise<mysql.Pool> {
    if (this.isCredentialExpired()) {
      if (!this.reinitPromise) {
        this.reinitPromise = this.reinitializePool()
          .finally(() => this.reinitPromise = null)
      }
      await this.reinitPromise
    }
    if (!this.pool) {
      throw new Error('数据库未初始化，请先调用 initialize()')
    }
    return this.pool
  }

  /**
   * 执行查询
   */
  async query<T = unknown>(sql: string, values?: unknown[]): Promise<T> {
    const pool = await this.getPool()
    console.log('[DatabaseService] 执行查询:', sql, values ? `参数: ${JSON.stringify(values)}` : '')
    try {
      const [rows] = await pool.execute(sql, values)
      console.log('[DatabaseService] 查询成功')
      return rows as T
    } catch (error) {
      console.error('[DatabaseService] 查询失败:', error)
      console.error('  - 失败的SQL:', sql)
      console.error('  - 失败的参数:', values)
      throw error
    }
  }

  /**
   * 插入数据
   * @param table 表名
   * @param data 数据对象
   * @returns 插入结果
   */
  async insert(table: string, data: Record<string, unknown>): Promise<mysql.ResultSetHeader> {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool()
      const keys = Object.keys(data)
      const quotedKeys = keys.map((key) => `\`${key}\``)
      const placeholders = keys.map(() => '?').join(', ')
      const sql = `INSERT INTO \`${table}\` (${quotedKeys.join(', ')}) VALUES (${placeholders})`
      // 将 undefined 转换为 null，因为 MySQL2 不允许 undefined 值
      const values = Object.values(data).map((value) => (value === undefined ? null : value))

      if (this.debugEnabled) {
        console.log('[DatabaseService] insert 执行参数:')
        console.log('  - 表名:', table)
        console.log('  - 字段列表:', keys)
        console.log('  - SQL语句:', sql)
        console.log('  - 参数值:', values)
      }

      try {
        const [result] = await pool.execute(sql, values)
        const resultHeader = result as mysql.ResultSetHeader
        this.debugEnabled &&
          console.log('[DatabaseService] 插入成功, 影响行数:', resultHeader.affectedRows)
        return resultHeader
      } catch (error) {
        if (this.debugEnabled) {
          console.error('[DatabaseService] 插入失败:', error)
          console.error('  - 失败的SQL:', sql)
          console.error('  - 失败的参数:', values)
        }
        throw error
      }
    })
  }

  /**
   * 批量插入数据
   * @param table 表名
   * @param dataList 数据对象数组
   * @param batchSize 批量大小，默认为50，用于减少死锁概率
   * @returns 插入结果
   */
  async insertBatch(
    table: string,
    dataList: Record<string, unknown>[],
    batchSize: number = 10
  ): Promise<mysql.ResultSetHeader> {
    if (dataList.length === 0) {
      throw new Error('数据列表不能为空')
    }

    // 如果数据量较小，直接执行
    if (dataList.length <= batchSize) {
      return this.executeBatch(table, dataList)
    }

    // 分批处理大数据量
    console.log(`[DatabaseService] 大批量数据(${dataList.length}条)，分批处理，每批${batchSize}条`)
    let totalAffectedRows = 0
    let lastResult: mysql.ResultSetHeader | null = null

    for (let i = 0; i < dataList.length; i += batchSize) {
      const batch = dataList.slice(i, i + batchSize)
      console.log(
        `[DatabaseService] 处理第${Math.floor(i / batchSize) + 1}批，数据范围: ${i + 1}-${Math.min(i + batchSize, dataList.length)}`
      )

      const result = await this.executeBatch(table, batch)
      totalAffectedRows += result.affectedRows
      lastResult = result
    }

    // 返回最后一批的结果，但更新总影响行数
    if (lastResult) {
      lastResult.affectedRows = totalAffectedRows
    }

    console.log(`[DatabaseService] 分批处理完成，总影响行数: ${totalAffectedRows}`)
    return lastResult!
  }

  /**
   * 执行单批次的批量插入操作
   */
  private async executeBatch(
    table: string,
    dataList: Record<string, unknown>[]
  ): Promise<mysql.ResultSetHeader> {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool()
      const keys = Object.keys(dataList[0])
      const quotedKeys = keys.map((key) => `\`${key}\``)
      const placeholders = keys.map(() => '?').join(', ')
      const valuesPlaceholder = dataList.map(() => `(${placeholders})`).join(', ')

      const sql = `INSERT INTO \`${table}\` (${quotedKeys.join(', ')}) VALUES ${valuesPlaceholder}`
      // 将 undefined 转换为 null，因为 MySQL2 不允许 undefined 值
      const values = dataList.flatMap((data) =>
        Object.values(data).map((value) => (value === undefined ? null : value))
      )

      if (this.debugEnabled) {
        console.log('[DatabaseService] executeBatch 执行参数:')
        console.log('  - 表名:', table)
        console.log('  - 数据条数:', dataList.length)
        console.log('  - 字段列表:', keys)
        console.log('  - SQL语句:', sql)
        console.log('  - 参数值:', values.slice(0, 20), values.length > 20 ? '...(更多)' : '')
      }

      try {
        const [result] = await pool.execute(sql, values)
        const resultHeader = result as mysql.ResultSetHeader
        console.log('[DatabaseService] 批量插入成功, 影响行数:', resultHeader.affectedRows)
        return resultHeader
      } catch (error) {
        if (this.debugEnabled) {
          console.error('[DatabaseService] 批量插入失败:', error)
          console.error('  - 失败的SQL:', sql)
          console.error('  - 失败的参数:', values)
        }
        throw error
      }
    })
  }

  /**
   * 批量插入数据，支持 ON DUPLICATE KEY UPDATE
   * @param table 表名
   * @param dataList 数据列表
   * @param updateFields 当遇到重复键时需要更新的字段，如果为空则更新所有字段（除了主键）
   * @param batchSize 批量大小，默认为50，用于减少死锁概率
   * @returns 插入结果
   */
  async insertBatchOnDuplicateKeyUpdate(
    table: string,
    dataList: Record<string, unknown>[],
    updateFields?: string[],
    batchSize: number = 10
  ): Promise<mysql.ResultSetHeader> {
    if (dataList.length === 0) {
      throw new Error('数据列表不能为空')
    }

    // 对于高冲突表使用更小的批量大小
    const isHighConflictTable = [
      'sl_live_room_per_minute_metrics',
      'sl_live_room_watch_count_per_minute_metrics'
    ].includes(table)
    const effectiveBatchSize = isHighConflictTable ? Math.min(batchSize, 3) : batchSize

    // 如果数据量较小，直接执行
    if (dataList.length <= effectiveBatchSize) {
      return this.executeBatchOnDuplicateKeyUpdate(table, dataList, updateFields)
    }

    // 分批处理大数据量
    console.log(
      `[DatabaseService] 大批量数据(${dataList.length}条)，分批处理，每批${effectiveBatchSize}条${isHighConflictTable ? ' (高冲突表)' : ''}`
    )
    let totalAffectedRows = 0
    let lastResult: mysql.ResultSetHeader | null = null

    for (let i = 0; i < dataList.length; i += effectiveBatchSize) {
      const batch = dataList.slice(i, i + effectiveBatchSize)
      console.log(
        `[DatabaseService] 处理第${Math.floor(i / effectiveBatchSize) + 1}批，数据范围: ${i + 1}-${Math.min(i + effectiveBatchSize, dataList.length)}`
      )

      const result = await this.executeBatchOnDuplicateKeyUpdate(table, batch, updateFields)
      totalAffectedRows += result.affectedRows
      lastResult = result

      // 对于高冲突表，在批次之间添加短暂延迟
      if (isHighConflictTable && i + effectiveBatchSize < dataList.length) {
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20))
      }
    }

    // 返回最后一批的结果，但更新总影响行数
    if (lastResult) {
      lastResult.affectedRows = totalAffectedRows
    }

    console.log(`[DatabaseService] 分批处理完成，总影响行数: ${totalAffectedRows}`)
    return lastResult!
  }

  /**
   * 执行单批次的 ON DUPLICATE KEY UPDATE 操作
   */
  private async executeBatchOnDuplicateKeyUpdate(
    table: string,
    dataList: Record<string, unknown>[],
    updateFields?: string[]
  ): Promise<mysql.ResultSetHeader> {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool()

      // 对于高冲突表，使用更低的事务隔离级别
      const isHighConflictTable = [
        'sl_live_room_per_minute_metrics',
        'sl_live_room_watch_count_per_minute_metrics'
      ].includes(table)

      if (isHighConflictTable) {
        // 使用 READ COMMITTED 隔离级别减少锁竞争
        await pool.execute('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED')
      }

      const keys = Object.keys(dataList[0])

      // 为字段名添加反引号以避免保留关键字冲突
      const quotedKeys = keys.map((key) => `\`${key}\``)
      const placeholders = keys.map(() => '?').join(', ')
      const valuesPlaceholder = dataList.map(() => `(${placeholders})`).join(', ')

      // 构建 ON DUPLICATE KEY UPDATE 子句
      const fieldsToUpdate = updateFields || keys.filter((key) => key !== 'id') // 排除主键
      const updateClause = fieldsToUpdate
        .map((field) => `\`${field}\` = VALUES(\`${field}\`)`)
        .join(', ')

      const sql = `INSERT INTO \`${table}\` (${quotedKeys.join(', ')}) VALUES ${valuesPlaceholder} ON DUPLICATE KEY UPDATE ${updateClause}`
      // 将 undefined 转换为 null，因为 MySQL2 不允许 undefined 值
      const values = dataList.flatMap((data) =>
        Object.values(data).map((value) => (value === undefined ? null : value))
      )

      if (this.debugEnabled) {
        console.log('[DatabaseService] executeBatchOnDuplicateKeyUpdate 执行参数:')
        console.log('  - 表名:', table)
        console.log('  - 数据条数:', dataList.length)
        console.log('  - 字段列表:', keys)
        console.log('  - 更新字段:', fieldsToUpdate)
        console.log('  - 高冲突表优化:', isHighConflictTable)
        console.log('  - SQL语句:', sql)
        console.log('  - 参数值:', values.slice(0, 20), values.length > 20 ? '...(更多)' : '')
      }

      try {
        const [result] = await pool.execute(sql, values)
        const resultHeader = result as mysql.ResultSetHeader
        console.log('[DatabaseService] 批量插入成功, 影响行数:', resultHeader.affectedRows)

        // 恢复默认事务隔离级别
        if (isHighConflictTable) {
          await pool.execute('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ')
        }

        return resultHeader
      } catch (error) {
        if (this.debugEnabled) {
          console.error('[DatabaseService] 批量插入失败:', error)
          console.error('  - 失败的SQL:', sql)
          console.error('  - 失败的参数:', values)
        }

        // 恢复默认事务隔离级别
        if (isHighConflictTable) {
          try {
            await pool.execute('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ')
          } catch (resetError) {
            console.error('[DatabaseService] 恢复事务隔离级别失败:', resetError)
          }
        }

        throw error
      }
    })
  }

  /**
   * 更新数据
   * @param table 表名
   * @param data 更新的数据
   * @param where WHERE条件对象
   * @returns 更新结果
   */
  async update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): Promise<mysql.ResultSetHeader> {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool()

      const setKeys = Object.keys(data)
      const setValues = Object.values(data)
      const setClause = setKeys.map((key) => `${key} = ?`).join(', ')

      const whereKeys = Object.keys(where)
      const whereValues = Object.values(where)
      const whereClause = whereKeys.map((key) => `${key} = ?`).join(' AND ')

      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`
      const values = [...setValues, ...whereValues]

      const [result] = await pool.execute(sql, values)
      return result as mysql.ResultSetHeader
    })
  }

  /**
   * 删除数据
   * @param table 表名
   * @param where WHERE条件对象
   * @returns 删除结果
   */
  async delete(table: string, where: Record<string, unknown>): Promise<mysql.ResultSetHeader> {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool()

      const whereKeys = Object.keys(where)
      const whereValues = Object.values(where)
      const whereClause = whereKeys.map((key) => `${key} = ?`).join(' AND ')

      const sql = `DELETE FROM ${table} WHERE ${whereClause}`
      const [result] = await pool.execute(sql, whereValues)

      return result as mysql.ResultSetHeader
    })
  }

  /**
   * 查询数据
   * @param table 表名
   * @param where WHERE条件对象（可选）
   * @param fields 查询字段（可选，默认为*）
   * @returns 查询结果
   */
  async select<T = unknown>(
    table: string,
    where?: Record<string, unknown>,
    fields: string[] = ['*']
  ): Promise<T[]> {
    const pool = await this.getPool()
    const fieldStr = fields.join(', ')

    let sql = `SELECT ${fieldStr} FROM ${table}`
    let values: unknown[] = []

    if (where && Object.keys(where).length > 0) {
      const whereKeys = Object.keys(where)
      values = Object.values(where)
      const whereClause = whereKeys.map((key) => `${key} = ?`).join(' AND ')
      sql += ` WHERE ${whereClause}`
    }

    const [rows] = await pool.execute(sql, values)
    return rows as T[]
  }

  /**
   * 执行事务
   * @param callback 事务回调函数
   */
  async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const pool = await this.getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()
      const result = await callback(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * 检查连接是否有效
   */
  async isConnected(): Promise<boolean> {
    if (!this.pool) {
      return false
    }

    try {
      const connection = await this.pool.getConnection()
      await connection.ping()
      connection.release()
      return true
    } catch (error) {
      console.error('[DatabaseService] Connection check failed:', error)
      return false
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.pool) {
      console.log('[DatabaseService] Closing database connection pool...')
      await this.pool.end()
      this.pool = null
    }

    if (this.tunnel) {
      console.log('[DatabaseService] Closing SSH tunnel...')
      this.tunnel.server.close()
      this.tunnel.client.end()
      this.tunnel = null
    }

    this.currentConfig = null
    console.log('[DatabaseService] Database service closed')
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): SystemConfig | null {
    return this.currentConfig
  }

  /**
   * 检查是否为死锁错误
   */
  private isDeadlockError(error: unknown): boolean {
    const mysqlError = error as { code?: string; sqlMessage?: string }
    return (
      mysqlError?.code === 'ER_LOCK_DEADLOCK' ||
      (mysqlError?.sqlMessage?.includes('Deadlock found when trying to get lock') ?? false)
    )
  }

  /**
   * 执行带有死锁重试的数据库操作
   */
  private async executeWithDeadlockRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    baseDelay: number = 50
  ): Promise<T> {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (this.isDeadlockError(error) && attempt < maxRetries) {
          // 指数退避延迟：100ms, 200ms, 400ms...
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 50
          console.log(
            `[DatabaseService] 检测到死锁，第${attempt}次重试，延迟${Math.round(delay)}ms`
          )

          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // 非死锁错误或达到最大重试次数，直接抛出
        throw error
      }
    }

    throw lastError
  }
}

// 导出单例
export const databaseService = new DatabaseService()
