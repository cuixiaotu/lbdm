/**
 * 账户凭证验证服务
 * 在每次接口请求前验证账户凭证是否有效
 */

import { accountCacheService } from './accountCacheService'
import { AccountRow } from '../database/tables/accounts'

export class AccountCredentialValidator {
  /**
   * 验证账户凭证是否有效
   * @param accountId 账户ID
   * @returns 是否有效
   */
  checkAccountValid(accountId: number): {
    account: AccountRow
    valid: boolean
  } {
    const account = accountCacheService.getById(accountId)

    if (!account) {
      console.error(`[LiveRoomAttributesService] Account ${accountId} not found in cache`)
      return {
        account: {} as AccountRow,
        valid: false
      }
    }

    // 检查内存中的账户状态
    if (account.is_valid === 0) {
      console.warn(
        `[LiveRoomAttributesService] Account ${accountId} (${account.account_name}) is marked as invalid, skipping request`
      )
      return {
        account: {} as AccountRow,
        valid: false
      }
    }

    return {
      account,
      valid: true
    }
  }
}

// 导出单例
export const accountCredentialValidator = new AccountCredentialValidator()
