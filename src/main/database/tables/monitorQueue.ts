import { BaseTable } from '../baseTable'
import type Database from 'better-sqlite3-multiple-ciphers'

export interface MonitorQueueRow {
  id: number // 主键，自增
  room_id: string // 直播间ID
  account_id: number // 账户ID
  account_name: string // 账户名称（冗余字段，便于查询）
  organization_id: string // 组织ID
  is_active: number // 是否活跃：1-活跃，0-暂停（SQLite使用INTEGER存储布尔值）
  added_at: number // 添加时间
  last_updated: number // 最后更新时间
  created_at: number // 创建时间
  updated_at: number // 更新时间
}

export class MonitorQueueTable extends BaseTable {
  constructor(db: Database.Database) {
    super(db, 'monitor_queue')
  }

  /**
   * 返回建表 SQL
   */
  getCreateTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS monitor_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        account_id INTEGER NOT NULL,
        account_name TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        added_at INTEGER NOT NULL,
        last_updated INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        UNIQUE(room_id, account_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_monitor_queue_account_id ON monitor_queue(account_id);
      CREATE INDEX IF NOT EXISTS idx_monitor_queue_room_id ON monitor_queue(room_id);
      CREATE INDEX IF NOT EXISTS idx_monitor_queue_is_active ON monitor_queue(is_active);
    `
  }

  /**
   * 添加监听项
   */
  add(item: Omit<MonitorQueueRow, 'id' | 'created_at' | 'updated_at'>): MonitorQueueRow {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO monitor_queue (
        room_id, account_id, account_name, organization_id, 
        is_active, added_at, last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      item.room_id,
      item.account_id,
      item.account_name,
      item.organization_id,
      item.is_active,
      item.added_at,
      item.last_updated,
      now,
      now
    )

    return this.getById(result.lastInsertRowid as number)!
  }

  /**
   * 批量添加监听项
   */
  batchAdd(items: Array<Omit<MonitorQueueRow, 'id' | 'created_at' | 'updated_at'>>): void {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO monitor_queue (
        room_id, account_id, account_name, organization_id, 
        is_active, added_at, last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction(
      (items: Array<Omit<MonitorQueueRow, 'id' | 'created_at' | 'updated_at'>>) => {
        for (const item of items) {
          stmt.run(
            item.room_id,
            item.account_id,
            item.account_name,
            item.organization_id,
            item.is_active,
            item.added_at,
            item.last_updated,
            now,
            now
          )
        }
      }
    )

    transaction(items)
  }

  /**
   * 移除监听项
   */
  remove(roomId: string, accountId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM monitor_queue WHERE room_id = ? AND account_id = ?')
    const result = stmt.run(roomId, accountId)
    return result.changes > 0
  }

  /**
   * 批量移除监听项
   */
  batchRemove(items: Array<{ roomId: string; accountId: number }>): number {
    const stmt = this.db.prepare('DELETE FROM monitor_queue WHERE room_id = ? AND account_id = ?')

    const transaction = this.db.transaction(
      (items: Array<{ roomId: string; accountId: number }>) => {
        let totalChanges = 0
        for (const item of items) {
          const result = stmt.run(item.roomId, item.accountId)
          totalChanges += result.changes
        }
        return totalChanges
      }
    )

    return transaction(items)
  }

  /**
   * 获取所有监听项
   */
  getAll(): MonitorQueueRow[] {
    const stmt = this.db.prepare('SELECT * FROM monitor_queue ORDER BY created_at DESC')
    return stmt.all() as MonitorQueueRow[]
  }

  /**
   * 根据账户ID获取监听项
   */
  getByAccountId(accountId: number): MonitorQueueRow[] {
    const stmt = this.db.prepare(
      'SELECT * FROM monitor_queue WHERE account_id = ? ORDER BY created_at DESC'
    )
    return stmt.all(accountId) as MonitorQueueRow[]
  }

  /**
   * 根据ID获取监听项
   */
  getById(id: number): MonitorQueueRow | null {
    const stmt = this.db.prepare('SELECT * FROM monitor_queue WHERE id = ?')
    return (stmt.get(id) as MonitorQueueRow) || null
  }

  /**
   * 检查监听项是否存在
   */
  exists(roomId: string, accountId: number): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM monitor_queue WHERE room_id = ? AND account_id = ?')
    return !!stmt.get(roomId, accountId)
  }

  /**
   * 更新监听项状态
   */
  updateStatus(roomId: string, accountId: number, isActive: boolean): boolean {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE monitor_queue 
      SET is_active = ?, last_updated = ?, updated_at = ? 
      WHERE room_id = ? AND account_id = ?
    `)
    const result = stmt.run(isActive ? 1 : 0, now, now, roomId, accountId)
    return result.changes > 0
  }

  /**
   * 更新最后更新时间
   */
  updateLastUpdated(roomId: string, accountId: number): boolean {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE monitor_queue 
      SET last_updated = ?, updated_at = ? 
      WHERE room_id = ? AND account_id = ?
    `)
    const result = stmt.run(now, now, roomId, accountId)
    return result.changes > 0
  }

  /**
   * 清空所有监听项
   */
  clear(): number {
    const stmt = this.db.prepare('DELETE FROM monitor_queue')
    const result = stmt.run()
    return result.changes
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number
    active: number
    paused: number
    byAccount: Array<{ accountId: number; accountName: string; count: number }>
  } {
    // 总数和活跃数
    const totalStmt = this.db.prepare(
      'SELECT COUNT(*) as total, SUM(is_active) as active FROM monitor_queue'
    )
    const totalResult = totalStmt.get() as { total: number; active: number }

    // 按账户分组统计
    const byAccountStmt = this.db.prepare(`
      SELECT account_id, account_name, COUNT(*) as count 
      FROM monitor_queue 
      GROUP BY account_id, account_name 
      ORDER BY count DESC
    `)
    const byAccountResult = byAccountStmt.all() as Array<{
      account_id: number
      account_name: string
      count: number
    }>

    return {
      total: totalResult.total || 0,
      active: totalResult.active || 0,
      paused: (totalResult.total || 0) - (totalResult.active || 0),
      byAccount: byAccountResult.map((item) => ({
        accountId: item.account_id,
        accountName: item.account_name,
        count: item.count
      }))
    }
  }
}
