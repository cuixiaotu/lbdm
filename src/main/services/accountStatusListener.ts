/**
 * 账户状态变更监听器
 * 解耦账户状态变更的通知和处理逻辑
 */

export type AccountStatusChangeHandler = (
  accountId: number,
  isValid: boolean
) => void | Promise<void>

/**
 * 账户状态监听器类
 */
export class AccountStatusListener {
  /** 监听器列表 */
  private listeners: Set<AccountStatusChangeHandler> = new Set()

  /**
   * 注册监听器
   * @param handler 状态变更处理函数
   */
  on(handler: AccountStatusChangeHandler): void {
    this.listeners.add(handler)
    console.log(`[AccountStatusListener] Registered listener, total: ${this.listeners.size}`)
  }

  /**
   * 移除监听器
   * @param handler 状态变更处理函数
   */
  off(handler: AccountStatusChangeHandler): void {
    this.listeners.delete(handler)
    console.log(`[AccountStatusListener] Unregistered listener, total: ${this.listeners.size}`)
  }

  /**
   * 触发状态变更事件
   * @param accountId 账户ID
   * @param isValid 是否有效
   */
  async emit(accountId: number, isValid: boolean): Promise<void> {
    console.log(
      `[AccountStatusListener] Emitting status change: account ${accountId} -> ${isValid ? 'VALID' : 'INVALID'}`
    )

    const promises = Array.from(this.listeners).map(async (handler) => {
      try {
        await handler(accountId, isValid)
      } catch (error) {
        console.error('[AccountStatusListener] Error in listener handler:', error)
      }
    })

    await Promise.all(promises)
  }

  /**
   * 移除所有监听器
   */
  clear(): void {
    this.listeners.clear()
    console.log('[AccountStatusListener] Cleared all listeners')
  }
}

// 导出单例
export const accountStatusListener = new AccountStatusListener()
