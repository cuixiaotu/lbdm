import { BaseTable } from '../baseTable'
import type Database from 'better-sqlite3-multiple-ciphers'

export interface AccountRow {
  id: number
  account_name: string // 账户名称
  username: string // 用户名
  password: string // 密码（加密存储）
  organization_id: string // 管家账号（组织ID）
  cookie: string // Cookie
  csrf_token: string // CSRF Token
  remark?: string // 备注
  is_valid: number // 凭证有效状态：1-有效，0-无效（SQLite使用INTEGER存储布尔值）
  created_at: number // 创建时间
  updated_at: number // 更新时间
}

export class AccountsTable extends BaseTable {
  constructor(db: Database.Database) {
    super(db, 'accounts')
  }

  getCreateTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_name TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        cookie TEXT NOT NULL,
        csrf_token TEXT NOT NULL DEFAULT '',
        remark TEXT,
        is_valid INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(organization_id, username)
      );
      CREATE INDEX IF NOT EXISTS idx_accounts_is_valid ON accounts(is_valid);
      CREATE INDEX IF NOT EXISTS idx_accounts_updated ON accounts(updated_at DESC);
    `
  }

  /**
   * 创建账户
   */
  create(data: {
    accountName: string
    username: string
    password: string
    organizationId: string
    cookie: string
    csrfToken: string
    remark?: string
  }): number {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO accounts (account_name, username, password, organization_id, cookie, csrf_token, remark, is_valid, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `)

    const result = stmt.run(
      data.accountName,
      data.username,
      data.password,
      data.organizationId,
      data.cookie,
      data.csrfToken,
      data.remark || null,
      now,
      now
    )

    return result.lastInsertRowid as number
  }

  /**
   * 获取所有账户
   */
  list(): AccountRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts ORDER BY updated_at DESC
    `)
    return stmt.all() as AccountRow[]
  }

  /**
   * 获取有效的账户列表
   */
  listValid(): AccountRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts WHERE is_valid = 1 ORDER BY updated_at DESC
    `)
    return stmt.all() as AccountRow[]
  }

  /**
   * 根据ID获取账户
   */
  getById(id: number): AccountRow | null {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts WHERE id = ?
    `)
    return (stmt.get(id) as AccountRow) || null
  }

  /**
   * 更新账户凭证有效状态
   */
  updateValidStatus(id: number, isValid: boolean): void {
    const stmt = this.db.prepare(`
      UPDATE accounts SET is_valid = ?, updated_at = ? WHERE id = ?
    `)
    stmt.run(isValid ? 1 : 0, Date.now(), id)
  }

  /**
   * 更新账户凭证（Cookie和CSRF Token）并设置为有效
   */
  updateCredentials(id: number, cookie: string, csrfToken: string): void {
    const stmt = this.db.prepare(`
      UPDATE accounts SET cookie = ?, csrf_token = ?, is_valid = 1, updated_at = ? WHERE id = ?
    `)
    stmt.run(cookie, csrfToken, Date.now(), id)
  }

  /**
   * @deprecated 使用 updateValidStatus 代替
   */
  updateStatus(id: number, status: number): void {
    // 为了向后兼容，保留此方法
    const isValid = status === 2 || status === 1
    this.updateValidStatus(id, isValid)
  }

  /**
   * 更新账户Cookie和CSRF Token
   */
  updateCookie(id: number, cookie: string, csrfToken?: string): void {
    if (csrfToken !== undefined) {
      const stmt = this.db.prepare(`
        UPDATE accounts SET cookie = ?, csrf_token = ?, updated_at = ? WHERE id = ?
      `)
      stmt.run(cookie, csrfToken, Date.now(), id)
    } else {
      const stmt = this.db.prepare(`
        UPDATE accounts SET cookie = ?, updated_at = ? WHERE id = ?
      `)
      stmt.run(cookie, Date.now(), id)
    }
  }

  /**
   * 删除账户
   */
  delete(id: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM accounts WHERE id = ?
    `)
    stmt.run(id)
  }

  /**
   * 更新账户信息
   */
  update(
    id: number,
    data: {
      accountName?: string
      username?: string
      password?: string
      organizationId?: string
      cookie?: string
      csrfToken?: string
      remark?: string
    }
  ): void {
    const fields: string[] = []
    const values: unknown[] = []

    if (data.accountName !== undefined) {
      fields.push('account_name = ?')
      values.push(data.accountName)
    }
    if (data.username !== undefined) {
      fields.push('username = ?')
      values.push(data.username)
    }
    if (data.password !== undefined) {
      fields.push('password = ?')
      values.push(data.password)
    }
    if (data.organizationId !== undefined) {
      fields.push('organization_id = ?')
      values.push(data.organizationId)
    }
    if (data.cookie !== undefined) {
      fields.push('cookie = ?')
      values.push(data.cookie)
    }
    if (data.csrfToken !== undefined) {
      fields.push('csrf_token = ?')
      values.push(data.csrfToken)
    }
    if (data.remark !== undefined) {
      fields.push('remark = ?')
      values.push(data.remark)
    }

    if (fields.length === 0) return

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE accounts SET ${fields.join(', ')} WHERE id = ?
    `)
    stmt.run(...values)
  }
}
