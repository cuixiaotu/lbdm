/**
 * 账户登录逻辑 Composable
 * 提取公共的登录流程，供添加账户和重新验证功能使用
 */

import { ref } from 'vue'
import type { SystemConfig } from '../../../shared/ipc/types'
import { showDialog } from '@/composables/useDialog'

/**
 * 登录参数接口
 */
export interface LoginParams {
  username: string
  password: string
  accountId?: number // 可选，用于重新验证时传递账户ID
  /** 管家账号（组织ID） */
  organizationId: string
}

/**
 * 登录结果接口
 */
export interface LoginResult {
  success: boolean
  cookie?: string
  csrfToken?: string
  error?: string
}

/**
 * 从 Cookie 字符串中提取 csrftoken
 */
const extractCsrfToken = (cookieString: string): string => {
  const match = cookieString.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ''
}

/**
 * 账户登录 Composable
 */
export function useAccountLogin(): {
  loadConfig: () => Promise<void>
  executeLogin: (params: LoginParams) => Promise<LoginResult>
} {
  const config = ref<SystemConfig | null>(null)

  /**
   * 加载系统配置
   */
  const loadConfig = async (): Promise<void> => {
    config.value = await window.api.config.get()
  }

  /**
   * 执行登录流程
   * @param params 登录参数
   * @returns 登录结果
   */
  const executeLogin = async (params: LoginParams): Promise<LoginResult> => {
    // 检查配置是否加载
    if (!config.value) {
      await loadConfig()
    }

    if (!config.value) {
      await showDialog({
        type: 'warning',
        title: '配置未加载',
        message: '配置未加载，请稍后再试'
      })
      return { success: false, error: '配置未加载' }
    }

    // 检查必要配置项
    if (!config.value.account.loginUrl) {
      await showDialog({
        type: 'warning',
        title: '配置缺失',
        message: '请先在系统配置中设置登录地址'
      })
      return { success: false, error: '登录地址未配置' }
    }

    try {
      console.log('开始登录流程:', params.username)

      // 打开登录窗口获取 Cookie
      const result = params.accountId
        ? // 重新验证模式
          await window.api.account.reverify({
            accountId: params.accountId,
            username: params.username,
            password: params.password,
            organizationId: params.organizationId,
            loginUrl: config.value.account.loginUrl,
            customScript: config.value.account.defaultScript || undefined
          })
        : // 新增账户模式
          await window.api.account.openLoginWindow({
            username: params.username,
            password: params.password,
            organizationId: params.organizationId,
            loginUrl: config.value.account.loginUrl,
            customScript: config.value.account.defaultScript || undefined
          })

      if (result.success && result.cookie) {
        console.log('获取到 Cookie')

        // 提取 csrftoken
        const csrfToken = extractCsrfToken(result.cookie)
        console.log('提取到 csrftoken:', csrfToken)

        // 检查 csrftoken 是否提取成功
        if (!csrfToken) {
          console.warn('csrftoken 提取失败')

          // 显示错误提示
          await showDialog({
            type: 'warning',
            title: 'csrftoken 提取失败',
            message: '未能从 Cookie 中提取到 csrftoken，请重新登录',
            detail: '请确保登录成功后 Cookie 中包含 csrftoken 字段'
          })

          return {
            success: false,
            error: 'csrftoken 提取失败'
          }
        }

        // 登录成功
        return {
          success: true,
          cookie: result.cookie,
          csrfToken
        }
      } else {
        await showDialog({
          type: 'error',
          title: '错误',
          message: '获取 Cookie 失败',
          detail: result.error || '未知错误'
        })

        return {
          success: false,
          error: result.error || '获取 Cookie 失败'
        }
      }
    } catch (error) {
      console.error('登录失败:', error)
      await showDialog({
        type: 'error',
        title: '错误',
        message: '登录失败',
        detail: error instanceof Error ? error.message : '请重试'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  return {
    loadConfig,
    executeLogin
  }
}
