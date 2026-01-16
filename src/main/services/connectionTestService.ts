/**
 * 连接测试服务
 * 复用 DatabaseService 进行 MySQL 连接测试
 */

import { DatabaseService } from './databaseService'
import type { SystemConfig, ConnectionTestResult } from '../../shared/ipc'

/**
 * 连接测试服务类
 */
export class ConnectionTestService {
  /**
   * 测试数据库连接
   * @param config 系统配置（当前表单填写的配置，未保存）
   * @returns 测试结果
   */
  async testConnection(config: SystemConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now()
    const dbService = new DatabaseService()

    try {
      console.log('[ConnectionTest] Starting database connection test...')

      // 使用 DatabaseService 初始化连接（会自动判断SSH或直连）
      await dbService.initialize(config)

      // 检查连接是否有效
      const isConnected = await dbService.isConnected()

      if (!isConnected) {
        throw new Error('数据库连接验证失败')
      }

      const responseTime = Date.now() - startTime
      const usedSsh = this.shouldUseSsh(config)

      console.log('[ConnectionTest] Database connection test passed')

      // 关闭测试连接
      await dbService.close()

      return {
        success: true,
        statusCode: 200,
        responseTime,
        usedSsh,
        details: `成功连接到 MySQL 数据库 ${config.database.host}:${config.database.port}/${config.database.database}${usedSsh ? ' (通过SSH隧道)' : ''}`
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const mysqlError = error as Error & { code?: string; errno?: number; sqlMessage?: string }

      console.error('[ConnectionTest] Database connection test failed:', mysqlError)

      // 确保关闭连接
      try {
        await dbService.close()
      } catch {
        // 忽略关闭错误
      }

      return {
        success: false,
        responseTime,
        error: `MySQL连接失败: ${mysqlError.message}`,
        details: this.getMySQLErrorDetails(mysqlError),
        usedSsh: this.shouldUseSsh(config)
      }
    }
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
   * 获取MySQL错误详情
   */
  private getMySQLErrorDetails(
    error: Error & {
      code?: string
      errno?: number
      sqlMessage?: string
    }
  ): string {
    const code = error.code
    const errno = error.errno

    // MySQL特定错误
    if (errno === 1045) {
      return 'MySQL认证失败，请检查用户名和密码是否正确'
    }
    if (errno === 1049) {
      return `数据库不存在，请检查数据库名称是否正确`
    }
    if (errno === 2003 || code === 'ECONNREFUSED') {
      return '连接被拒绝，请检查MySQL服务是否启动以及主机地址和端口是否正确'
    }
    if (code === 'ETIMEDOUT') {
      return '连接超时，请检查网络连接和防火墙设置'
    }
    if (code === 'ENOTFOUND') {
      return '无法解析主机地址，请检查Host/IP是否正确'
    }
    if (code === 'EHOSTUNREACH') {
      return '无法访问主机，请检查网络连接'
    }
    if (code === 'ER_ACCESS_DENIED_ERROR') {
      return 'MySQL访问被拒绝，请检查用户权限'
    }

    return error.sqlMessage || error.message
  }
}

// 导出单例
export const connectionTestService = new ConnectionTestService()
