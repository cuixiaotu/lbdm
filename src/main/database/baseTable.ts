import type Database from 'better-sqlite3-multiple-ciphers'

export abstract class BaseTable {
  protected db: Database.Database
  protected tableName: string

  constructor(db: Database.Database, tableName: string) {
    this.db = db
    this.tableName = tableName
  }

  /**
   * 返回建表 SQL
   */
  abstract getCreateTableSQL(): string

  /**
   * 初始化表
   */
  init(): void {
    const sql = this.getCreateTableSQL()
    this.db.exec(sql)
  }
}
