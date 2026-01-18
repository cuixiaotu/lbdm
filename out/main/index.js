"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const os = require("os");
const fs = require("fs");
const Database = require("better-sqlite3-multiple-ciphers");
const axios = require("axios");
const mysql = require("mysql2/promise");
const ssh2 = require("ssh2");
const net = require("net");
const crypto = require("crypto");
const events = require("events");
const dayjs = require("dayjs");
const main = require("electron/main");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const mysql__namespace = /* @__PURE__ */ _interopNamespaceDefault(mysql);
const net__namespace = /* @__PURE__ */ _interopNamespaceDefault(net);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const icon = path.join(__dirname, "../../resources/icon.png");
class BaseTable {
  db;
  tableName;
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
  }
  /**
   * 初始化表
   */
  init() {
    const sql = this.getCreateTableSQL();
    this.db.exec(sql);
  }
}
class AccountsTable extends BaseTable {
  constructor(db) {
    super(db, "accounts");
  }
  getCreateTableSQL() {
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
    `;
  }
  /**
   * 创建账户
   */
  create(data) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO accounts (account_name, username, password, organization_id, cookie, csrf_token, remark, is_valid, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
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
    );
    return result.lastInsertRowid;
  }
  /**
   * 获取所有账户
   */
  list() {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts ORDER BY updated_at DESC
    `);
    return stmt.all();
  }
  /**
   * 获取有效的账户列表
   */
  listValid() {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts WHERE is_valid = 1 ORDER BY updated_at DESC
    `);
    return stmt.all();
  }
  /**
   * 根据ID获取账户
   */
  getById(id) {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts WHERE id = ?
    `);
    return stmt.get(id) || null;
  }
  /**
   * 更新账户凭证有效状态
   */
  updateValidStatus(id, isValid) {
    const stmt = this.db.prepare(`
      UPDATE accounts SET is_valid = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(isValid ? 1 : 0, Date.now(), id);
  }
  /**
   * 更新账户凭证（Cookie和CSRF Token）并设置为有效
   */
  updateCredentials(id, cookie, csrfToken) {
    const stmt = this.db.prepare(`
      UPDATE accounts SET cookie = ?, csrf_token = ?, is_valid = 1, updated_at = ? WHERE id = ?
    `);
    stmt.run(cookie, csrfToken, Date.now(), id);
  }
  /**
   * @deprecated 使用 updateValidStatus 代替
   */
  updateStatus(id, status) {
    const isValid = status === 2 || status === 1;
    this.updateValidStatus(id, isValid);
  }
  /**
   * 更新账户Cookie和CSRF Token
   */
  updateCookie(id, cookie, csrfToken) {
    if (csrfToken !== void 0) {
      const stmt = this.db.prepare(`
        UPDATE accounts SET cookie = ?, csrf_token = ?, updated_at = ? WHERE id = ?
      `);
      stmt.run(cookie, csrfToken, Date.now(), id);
    } else {
      const stmt = this.db.prepare(`
        UPDATE accounts SET cookie = ?, updated_at = ? WHERE id = ?
      `);
      stmt.run(cookie, Date.now(), id);
    }
  }
  /**
   * 删除账户
   */
  delete(id) {
    const stmt = this.db.prepare(`
      DELETE FROM accounts WHERE id = ?
    `);
    stmt.run(id);
  }
  /**
   * 更新账户信息
   */
  update(id, data) {
    const fields = [];
    const values = [];
    if (data.accountName !== void 0) {
      fields.push("account_name = ?");
      values.push(data.accountName);
    }
    if (data.username !== void 0) {
      fields.push("username = ?");
      values.push(data.username);
    }
    if (data.password !== void 0) {
      fields.push("password = ?");
      values.push(data.password);
    }
    if (data.organizationId !== void 0) {
      fields.push("organization_id = ?");
      values.push(data.organizationId);
    }
    if (data.cookie !== void 0) {
      fields.push("cookie = ?");
      values.push(data.cookie);
    }
    if (data.csrfToken !== void 0) {
      fields.push("csrf_token = ?");
      values.push(data.csrfToken);
    }
    if (data.remark !== void 0) {
      fields.push("remark = ?");
      values.push(data.remark);
    }
    if (fields.length === 0) return;
    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);
    const stmt = this.db.prepare(`
      UPDATE accounts SET ${fields.join(", ")} WHERE id = ?
    `);
    stmt.run(...values);
  }
}
class MonitorQueueTable extends BaseTable {
  constructor(db) {
    super(db, "monitor_queue");
  }
  /**
   * 返回建表 SQL
   */
  getCreateTableSQL() {
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
    `;
  }
  /**
   * 添加监听项
   */
  add(item) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO monitor_queue (
        room_id, account_id, account_name, organization_id, 
        is_active, added_at, last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
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
    );
    return this.getById(result.lastInsertRowid);
  }
  /**
   * 批量添加监听项
   */
  batchAdd(items) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO monitor_queue (
        room_id, account_id, account_name, organization_id, 
        is_active, added_at, last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const transaction = this.db.transaction(
      (items2) => {
        for (const item of items2) {
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
          );
        }
      }
    );
    transaction(items);
  }
  /**
   * 移除监听项
   */
  remove(roomId, accountId) {
    const stmt = this.db.prepare("DELETE FROM monitor_queue WHERE room_id = ? AND account_id = ?");
    const result = stmt.run(roomId, accountId);
    return result.changes > 0;
  }
  /**
   * 批量移除监听项
   */
  batchRemove(items) {
    const stmt = this.db.prepare("DELETE FROM monitor_queue WHERE room_id = ? AND account_id = ?");
    const transaction = this.db.transaction(
      (items2) => {
        let totalChanges = 0;
        for (const item of items2) {
          const result = stmt.run(item.roomId, item.accountId);
          totalChanges += result.changes;
        }
        return totalChanges;
      }
    );
    return transaction(items);
  }
  /**
   * 获取所有监听项
   */
  getAll() {
    const stmt = this.db.prepare("SELECT * FROM monitor_queue ORDER BY created_at DESC");
    return stmt.all();
  }
  /**
   * 根据账户ID获取监听项
   */
  getByAccountId(accountId) {
    const stmt = this.db.prepare(
      "SELECT * FROM monitor_queue WHERE account_id = ? ORDER BY created_at DESC"
    );
    return stmt.all(accountId);
  }
  /**
   * 根据ID获取监听项
   */
  getById(id) {
    const stmt = this.db.prepare("SELECT * FROM monitor_queue WHERE id = ?");
    return stmt.get(id) || null;
  }
  /**
   * 检查监听项是否存在
   */
  exists(roomId, accountId) {
    const stmt = this.db.prepare("SELECT 1 FROM monitor_queue WHERE room_id = ? AND account_id = ?");
    return !!stmt.get(roomId, accountId);
  }
  /**
   * 更新监听项状态
   */
  updateStatus(roomId, accountId, isActive) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE monitor_queue 
      SET is_active = ?, last_updated = ?, updated_at = ? 
      WHERE room_id = ? AND account_id = ?
    `);
    const result = stmt.run(isActive ? 1 : 0, now, now, roomId, accountId);
    return result.changes > 0;
  }
  /**
   * 更新最后更新时间
   */
  updateLastUpdated(roomId, accountId) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE monitor_queue 
      SET last_updated = ?, updated_at = ? 
      WHERE room_id = ? AND account_id = ?
    `);
    const result = stmt.run(now, now, roomId, accountId);
    return result.changes > 0;
  }
  /**
   * 清空所有监听项
   */
  clear() {
    const stmt = this.db.prepare("DELETE FROM monitor_queue");
    const result = stmt.run();
    return result.changes;
  }
  /**
   * 获取统计信息
   */
  getStats() {
    const totalStmt = this.db.prepare(
      "SELECT COUNT(*) as total, SUM(is_active) as active FROM monitor_queue"
    );
    const totalResult = totalStmt.get();
    const byAccountStmt = this.db.prepare(`
      SELECT account_id, account_name, COUNT(*) as count 
      FROM monitor_queue 
      GROUP BY account_id, account_name 
      ORDER BY count DESC
    `);
    const byAccountResult = byAccountStmt.all();
    return {
      total: totalResult.total || 0,
      active: totalResult.active || 0,
      paused: (totalResult.total || 0) - (totalResult.active || 0),
      byAccount: byAccountResult.map((item) => ({
        accountId: item.account_id,
        accountName: item.account_name,
        count: item.count
      }))
    };
  }
}
class DatabaseManager {
  static instance = null;
  db;
  accountsTable;
  monitorQueueTable;
  dbPath;
  currentVersion = 1;
  constructor() {
    if (electron.app.isPackaged) {
      const userDataPath = electron.app.getPath("userData");
      this.dbPath = path.join(userDataPath, "database.db");
    } else {
      const rootPath = electron.app.getAppPath();
      const tmpDir = path.join(rootPath, "tmp");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      this.dbPath = path.join(tmpDir, "database.db");
      console.log(`[开发模式] 数据库文件路径: ${this.dbPath}`);
    }
    this.init();
  }
  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  /**
   * 初始化数据库
   */
  init() {
    try {
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.accountsTable = new AccountsTable(this.db);
      this.accountsTable.init();
      this.monitorQueueTable = new MonitorQueueTable(this.db);
      this.monitorQueueTable.init();
      this.initVersionTable();
      this.runMigrations();
      console.log("数据库初始化成功:", this.dbPath);
    } catch (error) {
      console.error("数据库初始化失败:", error);
      throw error;
    }
  }
  /**
   * 初始化版本表
   */
  initVersionTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY,
        updated_at INTEGER NOT NULL
      );
    `);
    const row = this.db.prepare("SELECT version FROM db_version LIMIT 1").get();
    this.currentVersion = row?.version || 0;
    if (this.currentVersion === 0) {
      this.db.prepare("INSERT INTO db_version (version, updated_at) VALUES (1, ?)").run(Date.now());
      this.currentVersion = 1;
      console.log("数据库版本初始化: v1");
    } else {
      console.log(`当前数据库版本: v${this.currentVersion}`);
    }
  }
  /**
   * 运行数据库迁移（第一次发布，暂无迁移）
   */
  runMigrations() {
  }
  /**
   * 获取账户表实例
   */
  getAccountsTable() {
    return this.accountsTable;
  }
  /**
   * 获取监听队列表实例
   */
  getMonitorQueueTable() {
    return this.monitorQueueTable;
  }
  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log("数据库连接已关闭");
    }
  }
}
const getDatabase = () => {
  return DatabaseManager.getInstance();
};
class AccountCacheService {
  /** 内存中的账户列表缓存 */
  cache = [];
  /** 账户直播列表缓存 (accountId -> AccountLiveRooms) */
  liveRoomsCache = /* @__PURE__ */ new Map();
  /** 缓存是否已初始化 */
  initialized = false;
  /** 读写锁，防止并发问题 */
  updateLock = Promise.resolve();
  constructor() {
    console.log("[AccountCacheService] Initialized");
  }
  /**
   * 初始化缓存（从数据库加载所有账户）
   */
  async initialize() {
    if (this.initialized) {
      console.log("[AccountCacheService] Cache already initialized");
      return;
    }
    await this.executeWithLock(async () => {
      try {
        console.log("[AccountCacheService] Loading accounts from database...");
        const db = getDatabase();
        const accountsTable = db.getAccountsTable();
        this.cache = accountsTable.list();
        this.initialized = true;
        console.log(`[AccountCacheService] Cache initialized with ${this.cache.length} accounts`);
      } catch (error) {
        console.error("[AccountCacheService] Failed to initialize cache:", error);
        throw error;
      }
    });
  }
  /**
   * 获取所有账户（从缓存）
   */
  getAll() {
    this.ensureInitialized();
    return [...this.cache];
  }
  /**
   * 获取有效的账户列表（从缓存）
   */
  getValid() {
    this.ensureInitialized();
    return this.cache.filter((account) => account.is_valid === 1);
  }
  /**
   * 根据ID获取账户（从缓存）
   */
  getById(id) {
    this.ensureInitialized();
    return this.cache.find((account) => account.id === id) || null;
  }
  /**
   * 添加账户（同时写入数据库和更新缓存）
   */
  async add(account) {
    return await this.executeWithLock(async () => {
      try {
        console.log("[AccountCacheService] Adding account:", account.accountName);
        const db = getDatabase();
        const accountsTable = db.getAccountsTable();
        const id = accountsTable.create(account);
        const newAccount = accountsTable.getById(id);
        if (!newAccount) {
          throw new Error("Failed to retrieve newly created account");
        }
        this.cache.push(newAccount);
        console.log(`[AccountCacheService] Account ${id} added to cache`);
        return newAccount;
      } catch (error) {
        console.error("[AccountCacheService] Failed to add account:", error);
        throw error;
      }
    });
  }
  /**
   * 更新账户凭证状态（同时写入数据库和更新缓存）
   */
  async updateValidStatus(id, isValid) {
    await this.executeWithLock(async () => {
      try {
        console.log(`[AccountCacheService] Updating account ${id} valid status to ${isValid}`);
        const db = getDatabase();
        const accountsTable = db.getAccountsTable();
        accountsTable.updateValidStatus(id, isValid);
        const account = this.cache.find((a) => a.id === id);
        if (account) {
          account.is_valid = isValid ? 1 : 0;
          account.updated_at = Date.now();
          console.log(`[AccountCacheService] Account ${id} cache updated`);
        } else {
          console.warn(`[AccountCacheService] Account ${id} not found in cache`);
        }
      } catch (error) {
        console.error("[AccountCacheService] Failed to update valid status:", error);
        throw error;
      }
    });
  }
  /**
   * 更新账户凭证（同时写入数据库和更新缓存）
   */
  async updateCredentials(id, cookie, csrfToken) {
    await this.executeWithLock(async () => {
      try {
        console.log(`[AccountCacheService] Updating account ${id} credentials`);
        const db = getDatabase();
        const accountsTable = db.getAccountsTable();
        accountsTable.updateCredentials(id, cookie, csrfToken);
        const account = this.cache.find((a) => a.id === id);
        if (account) {
          account.cookie = cookie;
          account.csrf_token = csrfToken;
          account.is_valid = 1;
          account.updated_at = Date.now();
          console.log(`[AccountCacheService] Account ${id} credentials updated in cache`);
        } else {
          console.warn(`[AccountCacheService] Account ${id} not found in cache`);
        }
      } catch (error) {
        console.error("[AccountCacheService] Failed to update credentials:", error);
        throw error;
      }
    });
  }
  /**
   * 删除账户（同时从数据库删除和从缓存移除）
   */
  async delete(id) {
    await this.executeWithLock(async () => {
      try {
        console.log(`[AccountCacheService] Deleting account ${id}`);
        const db = getDatabase();
        const accountsTable = db.getAccountsTable();
        accountsTable.delete(id);
        const index = this.cache.findIndex((a) => a.id === id);
        if (index !== -1) {
          this.cache.splice(index, 1);
          console.log(`[AccountCacheService] Account ${id} removed from cache`);
        } else {
          console.warn(`[AccountCacheService] Account ${id} not found in cache`);
        }
      } catch (error) {
        console.error("[AccountCacheService] Failed to delete account:", error);
        throw error;
      }
    });
  }
  /**
   * 更新账户信息（同时写入数据库和更新缓存）
   */
  async update(id, data) {
    await this.executeWithLock(async () => {
      try {
        console.log(`[AccountCacheService] Updating account ${id}`);
        const db = getDatabase();
        const accountsTable = db.getAccountsTable();
        accountsTable.update(id, data);
        const account = this.cache.find((a) => a.id === id);
        if (account) {
          if (data.accountName !== void 0) account.account_name = data.accountName;
          if (data.username !== void 0) account.username = data.username;
          if (data.password !== void 0) account.password = data.password;
          if (data.organizationId !== void 0) account.organization_id = data.organizationId;
          if (data.cookie !== void 0) account.cookie = data.cookie;
          if (data.csrfToken !== void 0) account.csrf_token = data.csrfToken;
          if (data.remark !== void 0) account.remark = data.remark;
          account.updated_at = Date.now();
          console.log(`[AccountCacheService] Account ${id} updated in cache`);
        } else {
          console.warn(`[AccountCacheService] Account ${id} not found in cache`);
        }
      } catch (error) {
        console.error("[AccountCacheService] Failed to update account:", error);
        throw error;
      }
    });
  }
  /**
   * 强制刷新缓存（从数据库重新加载）
   */
  async refresh() {
    await this.executeWithLock(async () => {
      try {
        console.log("[AccountCacheService] Refreshing cache from database...");
        const db = getDatabase();
        const accountsTable = db.getAccountsTable();
        this.cache = accountsTable.list();
        console.log(`[AccountCacheService] Cache refreshed with ${this.cache.length} accounts`);
      } catch (error) {
        console.error("[AccountCacheService] Failed to refresh cache:", error);
        throw error;
      }
    });
  }
  /**
   * 获取缓存统计信息
   */
  getStats() {
    this.ensureInitialized();
    const valid = this.cache.filter((a) => a.is_valid === 1).length;
    return {
      total: this.cache.length,
      valid,
      invalid: this.cache.length - valid
    };
  }
  /**
   * 设置账户的直播列表缓存
   * @param accountId 账户ID
   * @param liveRooms 直播列表数据
   */
  setLiveRooms(accountId, liveRooms) {
    this.liveRoomsCache.set(accountId, liveRooms);
    console.log(
      `[AccountCacheService] Live rooms cached for account ${accountId} (${liveRooms.liveData?.list.length || 0} rooms)`
    );
  }
  /**
   * 获取账户的直播列表缓存
   * @param accountId 账户ID
   * @returns 直播列表数据，如果不存在则返回 null
   */
  getLiveRooms(accountId) {
    return this.liveRoomsCache.get(accountId) || null;
  }
  /**
   * 清除账户的直播列表缓存
   * @param accountId 账户ID
   */
  clearLiveRooms(accountId) {
    this.liveRoomsCache.delete(accountId);
    console.log(`[AccountCacheService] Live rooms cache cleared for account ${accountId}`);
  }
  /**
   * 清除所有直播列表缓存
   */
  clearAllLiveRooms() {
    this.liveRoomsCache.clear();
    console.log("[AccountCacheService] All live rooms cache cleared");
  }
  /**
   * 确保缓存已初始化
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("AccountCacheService not initialized. Call initialize() first.");
    }
  }
  /**
   * 执行带锁的操作，防止并发冲突
   */
  async executeWithLock(operation) {
    await this.updateLock;
    let resolve;
    let reject;
    this.updateLock = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    try {
      const result = await operation();
      resolve();
      return result;
    } catch (error) {
      reject(error);
      throw error;
    }
  }
}
const accountCacheService = new AccountCacheService();
const accountCacheService$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AccountCacheService,
  accountCacheService
}, Symbol.toStringTag, { value: "Module" }));
class AccountStatusListener {
  /** 监听器列表 */
  listeners = /* @__PURE__ */ new Set();
  /**
   * 注册监听器
   * @param handler 状态变更处理函数
   */
  on(handler) {
    this.listeners.add(handler);
    console.log(`[AccountStatusListener] Registered listener, total: ${this.listeners.size}`);
  }
  /**
   * 移除监听器
   * @param handler 状态变更处理函数
   */
  off(handler) {
    this.listeners.delete(handler);
    console.log(`[AccountStatusListener] Unregistered listener, total: ${this.listeners.size}`);
  }
  /**
   * 触发状态变更事件
   * @param accountId 账户ID
   * @param isValid 是否有效
   */
  async emit(accountId, isValid) {
    console.log(
      `[AccountStatusListener] Emitting status change: account ${accountId} -> ${isValid ? "VALID" : "INVALID"}`
    );
    const promises = Array.from(this.listeners).map(async (handler) => {
      try {
        await handler(accountId, isValid);
      } catch (error) {
        console.error("[AccountStatusListener] Error in listener handler:", error);
      }
    });
    await Promise.all(promises);
  }
  /**
   * 移除所有监听器
   */
  clear() {
    this.listeners.clear();
    console.log("[AccountStatusListener] Cleared all listeners");
  }
}
const accountStatusListener = new AccountStatusListener();
var UserImageDimension = /* @__PURE__ */ ((UserImageDimension2) => {
  UserImageDimension2[UserImageDimension2["REGION"] = 1] = "REGION";
  UserImageDimension2[UserImageDimension2["GENDER"] = 3] = "GENDER";
  UserImageDimension2[UserImageDimension2["AGE"] = 4] = "AGE";
  return UserImageDimension2;
})(UserImageDimension || {});
class ApiService {
  axios;
  BASE_URL = "https://business.oceanengine.com";
  DEFAULT_TIMEOUT = 1e4;
  debugEnabled = false;
  constructor() {
    this.axios = axios.create({
      baseURL: this.BASE_URL,
      timeout: this.DEFAULT_TIMEOUT,
      validateStatus: () => true
    });
    this.loadDebugConfig();
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }
  /**
   * 加载调试配置
   */
  loadDebugConfig() {
    try {
      Promise.resolve().then(() => configManager$1).then(({ configManager: configManager2 }) => {
        const config = configManager2.getConfig();
        this.debugEnabled = config.debug?.enableNetworkDebug || false;
        if (this.debugEnabled) {
          console.log("[ApiService] 网络调试已开启");
        }
      });
    } catch (error) {
      console.error("[ApiService] 加载调试配置失败:", error);
    }
  }
  /**
   * 设置调试模式
   */
  setDebugEnabled(enabled) {
    this.debugEnabled = enabled;
    console.log(`[ApiService] 网络调试${enabled ? "已开启" : "已关闭"}`);
  }
  /**
   * 设置请求拦截器
   */
  setupRequestInterceptor() {
    this.axios.interceptors.request.use(
      (config) => {
        if (!this.debugEnabled) return config;
        const colors = {
          reset: "\x1B[0m",
          bright: "\x1B[1m",
          cyan: "\x1B[36m",
          yellow: "\x1B[33m",
          gray: "\x1B[90m"
        };
        const method = config.method?.toUpperCase() || "UNKNOWN";
        const url = config.url || "";
        console.log("\n" + "=".repeat(80));
        console.log(
          `${colors.cyan}[API Request]${colors.reset} ${colors.bright}${method}${colors.reset} ${url}`
        );
        console.log(`${colors.gray}Time: ${(/* @__PURE__ */ new Date()).toISOString()}${colors.reset}`);
        if (config.headers) {
          console.log(
            `${colors.yellow}Headers:${colors.reset}`,
            JSON.stringify(config.headers, null, 2)
          );
        }
        if (config.data) {
          console.log(
            `${colors.yellow}Request Data:${colors.reset}`,
            JSON.stringify(config.data, null, 2)
          );
        }
        console.log("=".repeat(80) + "\n");
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => {
        if (this.debugEnabled) {
          console.error("[API Request Error]", error);
        }
        return Promise.reject(error);
      }
    );
  }
  /**
   * 设置响应拦截器
   */
  setupResponseInterceptor() {
    this.axios.interceptors.response.use(
      (response) => {
        if (this.debugEnabled) {
          const colors = {
            reset: "\x1B[0m",
            bright: "\x1B[1m",
            cyan: "\x1B[36m",
            green: "\x1B[32m",
            yellow: "\x1B[33m",
            red: "\x1B[31m",
            gray: "\x1B[90m"
          };
          const method = response.config.method?.toUpperCase() || "UNKNOWN";
          const url = response.config.url || "";
          const statusCode = response.status;
          const extendedConfig = response.config;
          const startTime = extendedConfig.metadata?.startTime || Date.now();
          const responseTime = Date.now() - startTime;
          const statusColor = statusCode >= 200 && statusCode < 300 ? colors.green : statusCode === 0 ? colors.red : colors.yellow;
          console.log("\n" + "=".repeat(80));
          console.log(
            `${colors.cyan}[API Response]${colors.reset} ${colors.bright}${method}${colors.reset} ${url}`
          );
          console.log(`${colors.gray}Time: ${(/* @__PURE__ */ new Date()).toISOString()}${colors.reset}`);
          console.log(
            `${colors.yellow}Status Code:${colors.reset} ${statusColor}${statusCode}${colors.reset}`
          );
          console.log(
            `${colors.yellow}Response Time:${colors.reset} ${colors.green}${responseTime}ms${colors.reset}`
          );
          console.log(
            `${colors.yellow}Response Data:${colors.reset}`,
            JSON.stringify(response.data, null, 2)
          );
          console.log("=".repeat(80) + "\n");
        }
        return response;
      },
      (error) => {
        if (!this.debugEnabled) return Promise.reject(error);
        const colors = {
          reset: "\x1B[0m",
          bright: "\x1B[1m",
          cyan: "\x1B[36m",
          red: "\x1B[31m",
          yellow: "\x1B[33m",
          gray: "\x1B[90m"
        };
        const method = error.config?.method?.toUpperCase() || "UNKNOWN";
        const url = error.config?.url || "";
        const extendedConfig = error.config;
        const startTime = extendedConfig?.metadata?.startTime || Date.now();
        const responseTime = Date.now() - startTime;
        console.log("\n" + "=".repeat(80));
        console.log(
          `${colors.cyan}[API Error]${colors.reset} ${colors.bright}${method}${colors.reset} ${url}`
        );
        console.log(`${colors.gray}Time: ${(/* @__PURE__ */ new Date()).toISOString()}${colors.reset}`);
        console.log(`${colors.red}Status Code: 0${colors.reset}`);
        console.log(
          `${colors.yellow}Response Time:${colors.reset} ${colors.red}${responseTime}ms${colors.reset}`
        );
        console.log(`${colors.red}Error:${colors.reset}`, error.message || "Unknown error");
        console.log("=".repeat(80) + "\n");
        return Promise.reject(error);
      }
    );
  }
  /**
   * 通用请求处理方法（带调试日志）
   */
  async makeRequest(method, url, headers, data, timeout) {
    const response = method === "GET" ? await this.axios.get(url, { headers, timeout: timeout || this.DEFAULT_TIMEOUT }) : await this.axios.post(url, data, { headers, timeout: timeout || this.DEFAULT_TIMEOUT });
    return response.data;
  }
  async validateResponse(response, config) {
    if (response.code === 403) {
      await accountCacheService.updateValidStatus(config.accountId, false);
      await accountStatusListener.emit(config.accountId, false);
    }
  }
  /**
   * 获取直播列表
   * @param groupId 组织ID
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveIESList(requestData = {
    page: 1,
    limit: 100,
    live_type: "1",
    promotion_status: "0",
    search_key: "",
    metrics: [
      "live_st",
      "live_dt",
      "total_live_watch_cnt",
      "total_live_avg_watch_duration",
      "total_live_follow_cnt",
      "total_live_comment_cnt",
      "total_live_like_cnt",
      "live_card_icon_component_click_count",
      "stat_cost"
    ]
  }, config) {
    const url = `/nbs/api/bm/operate/live/ies_list?group_id=${config.groupId}`;
    const headers = this.buildHeaders(
      config.cookie,
      config.csrfToken,
      `https://business.oceanengine.com/site/operate/bp/live?cc_id=${config.groupId}`
    );
    const response = await this.makeRequest(
      "POST",
      url,
      headers,
      requestData,
      config.timeout
    );
    await this.validateResponse(response, config);
    return response;
  }
  /**
   * 获取直播间在线人数
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomMetrics(requestData, config) {
    const url = "/nbs/api/statistics/bm/live_show/online_room/metrics/";
    const headers = this.buildHeaders(config.cookie, config.csrfToken);
    const response = await this.makeRequest(
      "POST",
      url,
      headers,
      requestData,
      config.timeout
    );
    await this.validateResponse(response, config);
    return response;
  }
  /**
   * 获取直播间属性
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomsAttributes(requestData, config) {
    const url = "/nbs/api/statistics/bm/live_show/online_room/attributes";
    const headers = this.buildHeaders(config.cookie, config.csrfToken);
    const response = await this.makeRequest(
      "POST",
      url,
      headers,
      requestData,
      config.timeout
    );
    await this.validateResponse(response, config);
    return response;
  }
  /**
   * 获取直播间流量列表
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomFlowList(requestData, config) {
    const url = "/nbs/api/statistics/bm/live_show/flow/list";
    const headers = this.buildHeaders(config.cookie, config.csrfToken);
    const response = await this.makeRequest(
      "POST",
      url,
      headers,
      requestData,
      config.timeout
    );
    await this.validateResponse(response, config);
    return response;
  }
  /**
   * 获取直播间用户画像
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomsUserImage(requestData, config) {
    const url = "/nbs/api/statistics/bm/live_show/user_image/list";
    const headers = this.buildHeaders(config.cookie, config.csrfToken);
    const response = await this.makeRequest(
      "POST",
      url,
      headers,
      requestData,
      config.timeout
    );
    await this.validateResponse(response, config);
    return response;
  }
  /**
   * 获取直播间评论列表
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomsComment(requestData, config) {
    const url = "/nbs/api/statistics/bm/live_show/comment/list";
    const headers = this.buildHeaders(config.cookie, config.csrfToken);
    const response = await this.makeRequest(
      "POST",
      url,
      headers,
      requestData,
      config.timeout
    );
    await this.validateResponse(response, config);
    return response;
  }
  /**
   * 获取直播间每分钟指标
   * @param requestData 请求参数
   * @param config API请求配置
   */
  async getLiveRoomPerMinuteMetrics(requestData, config) {
    const url = "/nbs/api/statistics/bm/live_show/per_minute_metrics";
    const headers = this.buildHeaders(config.cookie, config.csrfToken);
    const response = await this.makeRequest("POST", url, headers, requestData, config.timeout);
    await this.validateResponse(response, config);
    return response;
  }
  buildHeaders(cookie, csrfToken, referer = "https://business.oceanengine.com/site/index") {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh,en;q=0.9,en-US;q=0.8,ru;q=0.7,zh-HK;q=0.6,zh-CN;q=0.5,zh-TW;q=0.4",
      "cache-control": "no-cache",
      cookie,
      pragma: "no-cache",
      priority: "u=1, i",
      referer,
      "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "x-csrf-token": csrfToken,
      "x-csrftoken": csrfToken
    };
  }
}
const apiService = new ApiService();
class LiveRoomService {
  constructor() {
    console.log("[LiveRoomService] Initialized (on-demand mode)");
  }
  /**
   * 检查 API 响应状态，判断是否凭证失效
   * @param statusCode HTTP 状态码
   * @param accountName 账户名称
   */
  checkCredentialExpired(statusCode, accountName) {
    if (statusCode > 299) {
      console.error(`[LiveRoomService] Account "${accountName}" credential expired (${statusCode})`);
      const mainWindow = electron.BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        electron.dialog.showMessageBox(mainWindow, {
          type: "warning",
          title: "凭证失效提示",
          message: `账户 "${accountName}" 的登录凭证已失效`,
          detail: "请重新登录该账户以更新凭证信息。",
          buttons: ["确定"]
        });
      }
    }
  }
  /**
   * 检查账户凭证是否有效（从缓存查询）
   * @param accountId 账户ID
   * @returns 账户信息，如果凭证失效则返回 null
   */
  checkAccountValid(accountId) {
    const account = accountCacheService.getById(accountId);
    if (!account) {
      console.error(`[LiveRoomService] Account ${accountId} not found in cache`);
      return null;
    }
    if (account.is_valid === 0) {
      console.warn(
        `[LiveRoomService] Account ${accountId} (${account.account_name}) is marked as invalid, skipping request`
      );
      return null;
    }
    return {
      account,
      accountName: account.account_name
    };
  }
  /**
   * 处理 API 请求失败，检查凭证失效并更新状态
   * @param accountId 账户ID
   * @param accountName 账户名称
   * @param statusCode HTTP 状态码
   */
  async handleApiFailure(accountId, accountName, statusCode) {
    if (statusCode === 403) {
      console.error(
        `[LiveRoomService] Account ${accountId} (${accountName}) credential expired (${statusCode}), updating status...`
      );
      await accountCacheService.updateValidStatus(accountId, false);
      await accountStatusListener.emit(accountId, false);
      this.checkCredentialExpired(statusCode, accountName);
    }
  }
  /**
   * 获取单个账户的直播间列表
   */
  async fetchAccountLiveRooms(accountId, accountName, organizationId, cookie, csrfToken) {
    try {
      console.log(`[LiveRoomService] Fetching live rooms for account ${accountId} (${accountName})`);
      const response = await apiService.getLiveIESList(
        void 0,
        // 使用默认参数
        {
          cookie,
          csrfToken,
          groupId: organizationId,
          accountId
        }
      );
      if (response.code !== 0) {
        console.warn(
          `[LiveRoomService] Account ${accountId} failed: ${response.msg} (${response.code})`
        );
        await this.handleApiFailure(accountId, accountName, response.code);
        return {
          accountId,
          accountName,
          organizationId,
          liveData: null,
          lastUpdate: Date.now(),
          success: false,
          error: response.msg
        };
      }
      const liveData = response.data;
      if (!liveData) {
        console.warn(`[LiveRoomService] Account ${accountId} no data returned`);
        return {
          accountId,
          accountName,
          organizationId,
          liveData: null,
          lastUpdate: Date.now(),
          success: false,
          error: "No data returned"
        };
      }
      console.log(
        `[LiveRoomService] Account ${accountId} success: ${liveData.list.length} live rooms, ${liveData.overview.line_online_count} online`
      );
      return {
        accountId,
        accountName,
        organizationId,
        liveData,
        lastUpdate: Date.now(),
        success: true
      };
    } catch (error) {
      console.error(`[LiveRoomService] Account ${accountId} exception:`, error);
      return {
        accountId,
        accountName,
        organizationId,
        liveData: null,
        lastUpdate: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 获取指定账户的直播间数据（直接调用 API，根据结果返回）
   * 成功获取数据后会自动缓存到 accountCacheService
   */
  async getLiveRoomsByAccountId(accountId) {
    try {
      const db = getDatabase();
      const accountsTable = db.getAccountsTable();
      const account = accountsTable.getById(accountId);
      if (!account) {
        console.error(`[LiveRoomService] Account ${accountId} not found`);
        return null;
      }
      const liveRoomData = await this.fetchAccountLiveRooms(
        account.id,
        account.account_name,
        account.organization_id,
        account.cookie,
        account.csrf_token
      );
      if (liveRoomData && liveRoomData.success && liveRoomData.liveData) {
        console.log(
          `[LiveRoomService] Caching live rooms data for account ${accountId}, count: ${liveRoomData.liveData.list.length}`
        );
        accountCacheService.setLiveRooms(accountId, liveRoomData);
      } else {
        console.warn(
          `[LiveRoomService] Failed to get live rooms for account ${accountId}, not caching`
        );
      }
      return liveRoomData;
    } catch (error) {
      console.error(`[LiveRoomService] Failed to get live rooms for account ${accountId}:`, error);
      return null;
    }
  }
  /**
   * 获取直播间属性
   * @param accountId 账户ID
   * @param roomIds 直播间ID数组
   * @param attributes 需要获取的属性列表
   */
  async getLiveRoomsAttributes(accountId, roomIds, attributes) {
    try {
      const accountCheck = this.checkAccountValid(accountId);
      if (!accountCheck) {
        return null;
      }
      const { account, accountName } = accountCheck;
      console.log(
        `[LiveRoomService] Fetching attributes for rooms ${roomIds.join(", ")} of account ${accountId}`
      );
      const requestData = {
        roomIds,
        attributes
      };
      const response = await apiService.getLiveRoomsAttributes(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      });
      if (response.code !== 0) {
        console.error("[LiveRoomService] Failed to get live rooms attributes:", response.msg);
        await this.handleApiFailure(accountId, accountName, response.code);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error("[LiveRoomService] Error getting live rooms attributes:", error);
      return null;
    }
  }
  /**
   * 获取直播间流量列表
   */
  async getLiveRoomFlowList(accountId, roomIds, startTime, endTime, dims) {
    try {
      const accountCheck = this.checkAccountValid(accountId);
      if (!accountCheck) {
        return null;
      }
      const { account, accountName } = accountCheck;
      console.log(
        `[LiveRoomService] Fetching flow list for rooms ${roomIds.join(", ")} of account ${accountId}`
      );
      const requestData = {
        startTime,
        endTime,
        roomIds,
        dims
      };
      const response = await apiService.getLiveRoomFlowList(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      });
      if (response.code !== 0) {
        console.error("[LiveRoomService] Failed to get live room flow list:", response.msg);
        await this.handleApiFailure(accountId, accountName, response.code);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error("[LiveRoomService] Error getting live room flow list:", error);
      return null;
    }
  }
  /**
   * 获取直播间用户画像
   */
  async getLiveRoomsUserImage(accountId, roomIds, startTime, endTime, dims) {
    try {
      const accountCheck = this.checkAccountValid(accountId);
      if (!accountCheck) {
        return null;
      }
      const { account, accountName } = accountCheck;
      console.log(
        `[LiveRoomService] Fetching user image for rooms ${roomIds.join(", ")} of account ${accountId}, dims: ${dims}`
      );
      const requestData = {
        startTime,
        endTime,
        roomIds,
        dims
      };
      const response = await apiService.getLiveRoomsUserImage(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      });
      if (response.code !== 0) {
        console.error("[LiveRoomService] Failed to get user image:", response.msg);
        await this.handleApiFailure(accountId, accountName, response.code);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error("[LiveRoomService] Error getting user image:", error);
      return null;
    }
  }
  /**
   * 获取直播间评论列表
   */
  async getLiveRoomsComment(accountId, roomIds, startTime, endTime) {
    try {
      const accountCheck = this.checkAccountValid(accountId);
      if (!accountCheck) {
        return null;
      }
      const { account, accountName } = accountCheck;
      console.log(
        `[LiveRoomService] Fetching comments for rooms ${roomIds.join(", ")} of account ${accountId}`
      );
      const requestData = {
        startTime,
        endTime,
        roomIds
      };
      const response = await apiService.getLiveRoomsComment(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      });
      if (response.code !== 0) {
        console.error("[LiveRoomService] Failed to get live room comments:", response.msg);
        await this.handleApiFailure(accountId, accountName, response.code);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error("[LiveRoomService] Error getting live room comments:", error);
      return null;
    }
  }
}
const liveRoomService = new LiveRoomService();
class AccountMonitorService {
  /** 轮询定时器 */
  timer = null;
  /** 轮询间隔（毫秒）- 从配置中读取 */
  get pollInterval() {
    const config = configManager.getConfig();
    return (config.monitor?.interval || 60) * 1e3;
  }
  /** 是否正在运行 */
  isRunning = false;
  /** 已提示过的账户ID集合，防止重复弹窗 */
  notifiedAccounts = /* @__PURE__ */ new Set();
  /** 正在轮询中，防止并发轮询 */
  isPolling = false;
  /** 状态更新锁，防止数据竞争 */
  statusUpdateLock = /* @__PURE__ */ new Map();
  constructor() {
    console.log("[AccountMonitorService] Initialized (Refactored Version - Credential Check Only)");
  }
  /**
   * 启动监控
   * 重构后仅进行账户凭证验证，不再自动采集直播间数据
   */
  start() {
    if (this.isRunning) {
      console.warn("[AccountMonitorService] Already running");
      return;
    }
    this.isRunning = true;
    console.log("[AccountMonitorService] Started - Credential validation only");
    this.pollCredentials();
    this.timer = setInterval(() => {
      this.pollCredentials();
    }, this.pollInterval);
  }
  /**
   * 停止监控
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log("[AccountMonitorService] Stopped");
  }
  /**
   * 更新轮询间隔
   * 当配置中的轮询时间变更时调用，会重启定时器
   */
  updateInterval() {
    if (!this.isRunning) {
      return;
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.pollCredentials();
    }, this.pollInterval);
    console.log(`[AccountMonitorService] Interval updated to ${this.pollInterval}ms`);
  }
  /**
   * 手动验证单个账户凭证
   */
  async validateSingleAccount(accountId) {
    try {
      return await this.validateAccount(accountId);
    } catch (error) {
      console.error(`[AccountMonitorService] Failed to validate account ${accountId}:`, error);
      return {
        accountId,
        isValid: false,
        error: error instanceof Error ? error.message : "验证失败",
        timestamp: Date.now()
      };
    }
  }
  /**
   * 手动验证所有账户凭证
   */
  async validateAllAccounts() {
    try {
      const accounts = await accountCacheService.getAll();
      const results = [];
      for (const account of accounts) {
        const result = await this.validateAccount(account.id);
        results.push(result);
        await this.updateAccountStatus(account.id, result.isValid, account.account_name);
      }
      return results;
    } catch (error) {
      console.error("[AccountMonitorService] Failed to validate all accounts:", error);
      return [];
    }
  }
  /**
   * 显示凭证过期通知
   */
  showCredentialExpiredNotification(accountId, accountName) {
    if (this.notifiedAccounts.has(accountId)) {
      return;
    }
    this.notifiedAccounts.add(accountId);
    const notification = new electron.Notification({
      title: "账户凭证已过期",
      body: `账户 "${accountName}" 的登录凭证已过期，请重新登录`,
      icon: void 0,
      // 可以设置图标路径
      urgency: "normal"
    });
    notification.on("click", () => {
      const windows = electron.BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        const mainWindow = windows[0];
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
    });
    notification.show();
  }
  /**
   * 更新账户状态
   */
  async updateAccountStatus(accountId, isValid, accountName) {
    if (this.statusUpdateLock.has(accountId)) {
      await this.statusUpdateLock.get(accountId);
      return;
    }
    const updatePromise = (async () => {
      try {
        await accountCacheService.updateValidStatus(accountId, isValid);
        console.log(`Account ${accountId} status updated to ${isValid ? "valid" : "invalid"}`);
        if (!isValid) {
          this.showCredentialExpiredNotification(accountId, accountName);
        } else {
          this.notifiedAccounts.delete(accountId);
        }
      } catch (error) {
        console.error(`Failed to update account ${accountId} status:`, error);
      } finally {
        this.statusUpdateLock.delete(accountId);
      }
    })();
    this.statusUpdateLock.set(accountId, updatePromise);
    await updatePromise;
  }
  /**
   * 轮询凭证验证（重构后的版本）
   * 仅验证账户凭证，不再进行直播间数据采集
   */
  async pollCredentials() {
    if (this.isPolling) {
      console.log("[AccountMonitorService] Already polling, skipping...");
      return;
    }
    this.isPolling = true;
    try {
      console.log("[AccountMonitorService] Starting credential validation cycle...");
      const accounts = await accountCacheService.getAll();
      console.log(`[AccountMonitorService] Found ${accounts.length} accounts to validate`);
      const validationPromises = accounts.map(async (account) => {
        try {
          const result = await this.validateAccount(account.id);
          await this.updateAccountStatus(account.id, result.isValid, account.account_name);
          return result;
        } catch (error) {
          console.error(`[AccountMonitorService] Failed to validate account ${account.id}:`, error);
          await this.updateAccountStatus(account.id, false, account.account_name);
          return {
            accountId: account.id,
            isValid: false,
            error: error instanceof Error ? error.message : "验证失败",
            timestamp: Date.now()
          };
        }
      });
      const results = await Promise.all(validationPromises);
      const validCount = results.filter((r) => r.isValid).length;
      console.log(
        `[AccountMonitorService] Credential validation completed: ${validCount}/${accounts.length} accounts valid`
      );
    } catch (error) {
      console.error("[AccountMonitorService] Credential validation cycle failed:", error);
    } finally {
      this.isPolling = false;
    }
  }
  /**
   * 验证单个账户凭证
   */
  async validateAccount(accountId) {
    try {
      const account = await accountCacheService.getById(accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }
      const result = await liveRoomService.getLiveRoomsByAccountId(account.id);
      return {
        accountId: account.id,
        isValid: result !== null && result !== void 0,
        statusCode: result ? 200 : 401,
        error: result ? void 0 : "Account credentials are invalid or expired",
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`[AccountMonitorService] Account ${accountId} validation failed:`, error);
      return {
        accountId,
        isValid: false,
        error: error instanceof Error ? error.message : "验证失败",
        timestamp: Date.now()
      };
    }
  }
  /**
   * 获取运行状态
   */
  get running() {
    return this.isRunning;
  }
}
const accountMonitorService = new AccountMonitorService();
const defaultConfig = {
  database: {
    host: "",
    port: 3306,
    user: "",
    password: "",
    database: ""
  },
  ssh: {
    server: "",
    port: 22,
    user: "",
    password: "",
    useSshKey: false,
    privateKey: ""
  },
  // https://business.oceanengine.com/nbs/api/bm/dashboard/managed_list
  account: {
    loginUrl: "https://business.oceanengine.com/login",
    defaultScript: `// 等待DOM元素出现的辅助函数
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // 先检查元素是否已存在
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 设置超时
    setTimeout(() => {
      observer.disconnect();
      reject(new Error('等待元素超时: ' + selector));
    }, timeout);
  });
}

function waitForElements(selector, includes = undefined, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // 先检查元素是否已存在
    const elements = document.querySelectorAll(selector);
    const content = Array.from(elements).map(ele => ele.textContent.trim()).join(';')
    if (elements.length > 0) {
      if (includes !== undefined && content.includes(includes)) {
        console.info('[waitForElements] 发现元素1')
        resolve(elements);
      } else {
        console.info('[waitForElements] 发现元素2')
        resolve(elements);
      }
      return;
    }

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations, obs) => {
      const elements = document.querySelectorAll(selector);
      const content = Array.from(elements).map(ele => ele.textContent.trim()).join(';')
      if (elements.length > 0) {
        if (includes !== undefined && content.includes(includes)) {
          console.info('[waitForElements] 发现元素3')
          obs.disconnect();
          resolve(elements);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 设置超时
    setTimeout(() => {
      observer.disconnect();
      reject(new Error('等待元素超时: ' + selector));
    }, timeout);
  });
}

// 等待并填充表单
(async () => {
  try {
    const href = window.location.href

    if (href.includes('login')) {
      console.log('开始等待表单元素...');

      // 等待用户名输入框出现
      const usernameInput = await waitForElement('input[name="email"]');
      console.log('找到用户名输入框');

      // 等待密码输入框出现
      const passwordInput = await waitForElement('input[type="password"]');
      console.log('找到密码输入框');

      // 填充用户名 (使用 \${options.username} 占位符)
      usernameInput.value = '\${options.username}';
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

      // 填充密码 (使用 \${options.password} 占位符)
      passwordInput.value = '\${options.password}';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('已自动填充用户名和密码');

      // 等待协议复选框出现
      const agreementCheckDiv = await waitForElement('.account-center-agreement-check');
      console.log('找到协议复选框');

      // 检查是否已勾选
      if (!agreementCheckDiv.classList.contains('checked')) {
        console.log('协议未勾选，自动点击勾选');
        agreementCheckDiv.click();
        // 等待一小段时间确保状态更新
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.log('协议已勾选，跳过');
      }

      // 等待提交按钮出现
      const submitButton = await waitForElement('.account-center-submit button');
      console.log('找到提交按钮');

      // 检查提交按钮内的 button 标签是否有验证错误
      const innerButton = submitButton.querySelector('button');
      if (innerButton && innerButton.classList.contains('form-validate-error')) {
        console.log('表单验证失败，存在 form-validate-error，跳过提交');
      } else {
        // 点击提交按钮
        submitButton.click();
        console.log('已自动点击提交按钮');
      }
    }
    const liveNav = await waitForElement('div[x-navigator-header-item="operate"]')
    if (liveNav && liveNav.textContent.trim() === '直播') {
      liveNav.click();
    } else {
      console.error('点击直播导航失败')
      return
    }
    const organizations = await waitForElements('#group-select-container div', '\${options.organizationId}')
    console.log('找到组织下拉框: ', organizations.length);
    console.table(Array.from(organizations).map(org => org.textContent.trim()))
    const wrappers = Array.from(organizations).filter(div => div.className.includes('new_group-options-list-item-wrapper'))
    if (wrappers.length == 0) {
      console.error('wrapper未发现')
      return
    }
    console.table(wrappers.map(org => org.textContent.trim()))
    const targetOrganization = wrappers.filter(div => div.textContent.trim().includes('\${options.organizationId}'))
    if (targetOrganization.length === 0) {
      console.error('未找到组织-\${options.organizationId}')
      console.table()
      return
    }
    targetOrganization[0].click()
  } catch (error) {
    console.error('自动化操作执行失败:', error.message);
  }
})();
`
  },
  monitor: {
    interval: 60
    // 默认60秒
  },
  debug: {
    enableNetworkDebug: false,
    // 默认关闭网络调试
    enableSqlDebug: false
    // 默认关闭SQL调试
  }
};
class ConfigManager {
  configPath;
  config;
  constructor() {
    if (electron.app.isPackaged) {
      const userDataPath = electron.app.getPath("userData");
      this.configPath = path__namespace.join(userDataPath, "config.json");
    } else {
      const rootPath = electron.app.getAppPath();
      const tmpDir = path__namespace.join(rootPath, "tmp");
      if (!fs__namespace.existsSync(tmpDir)) {
        fs__namespace.mkdirSync(tmpDir, { recursive: true });
      }
      this.configPath = path__namespace.join(tmpDir, "config.dev.json");
    }
    this.config = this.loadConfig();
    if (!electron.app.isPackaged) {
      console.log(`[开发模式] 配置文件路径: ${this.configPath}`);
    }
  }
  /**
   * 获取配置文件路径
   */
  getConfigPath() {
    return this.configPath;
  }
  /**
   * 加载配置
   */
  loadConfig() {
    try {
      if (fs__namespace.existsSync(this.configPath)) {
        const data = fs__namespace.readFileSync(this.configPath, "utf-8");
        const loadedConfig = JSON.parse(data);
        return {
          database: { ...defaultConfig.database, ...loadedConfig.database },
          ssh: { ...defaultConfig.ssh, ...loadedConfig.ssh },
          account: {
            ...defaultConfig.account,
            ...loadedConfig.account || {}
          },
          monitor: {
            ...defaultConfig.monitor,
            ...loadedConfig.monitor || {}
          },
          debug: {
            ...defaultConfig.debug,
            ...loadedConfig.debug || {}
          }
        };
      }
    } catch (error) {
      console.error("加载配置失败:", error);
    }
    return { ...defaultConfig };
  }
  /**
   * 获取配置
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * 保存配置
   */
  saveConfig(config) {
    try {
      const oldInterval = this.config.monitor?.interval;
      const newInterval = config.monitor?.interval;
      const intervalChanged = oldInterval !== newInterval;
      this.config = config;
      const dir = path__namespace.dirname(this.configPath);
      if (!fs__namespace.existsSync(dir)) {
        fs__namespace.mkdirSync(dir, { recursive: true });
      }
      fs__namespace.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
      if (intervalChanged) {
        console.log(
          `[ConfigManager] Monitor interval changed from ${oldInterval}s to ${newInterval}s, updating service...`
        );
        accountMonitorService.updateInterval();
      }
    } catch (error) {
      console.error("保存配置失败:", error);
      throw new Error("保存配置失败");
    }
  }
  /**
   * 重置配置
   */
  resetConfig() {
    this.config = { ...defaultConfig };
    this.saveConfig(this.config);
    return this.getConfig();
  }
  /**
   * 删除配置文件
   */
  deleteConfig() {
    try {
      if (fs__namespace.existsSync(this.configPath)) {
        fs__namespace.unlinkSync(this.configPath);
      }
      this.config = { ...defaultConfig };
    } catch (error) {
      console.error("删除配置失败:", error);
      throw new Error("删除配置失败");
    }
  }
}
const configManager = new ConfigManager();
const configManager$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ConfigManager,
  configManager
}, Symbol.toStringTag, { value: "Module" }));
class DatabaseService {
  pool = null;
  tunnel = null;
  currentConfig = null;
  debugEnabled = false;
  lastCredentialTimestamp = 0;
  credentialTTL = 600;
  reinitPromise = null;
  /**
   * 默认密钥
   */
  defaultPort = 51888;
  defaultSuffix = "88888888";
  defaultSecretKey = "88888888";
  defaultXorKey = "88888888";
  constructor() {
    this.loadDebugConfig();
  }
  /**
   * 加载调试配置
   */
  loadDebugConfig() {
    try {
      const config = configManager.getConfig();
      this.debugEnabled = config.debug?.enableSqlDebug || false;
      if (this.debugEnabled) {
        console.log("[DatabaseService] SQL调试已开启");
      }
    } catch (error) {
      console.error("[DatabaseService] 加载调试配置失败:", error);
    }
  }
  /**
   * 设置调试模式
   */
  setDebugEnabled(enabled) {
    this.debugEnabled = enabled;
    console.log(`[DatabaseService] SQL调试${enabled ? "已开启" : "已关闭"}`);
  }
  /**
   * 判断是否应该使用SSH隧道
   */
  shouldUseSsh(config) {
    const ssh = config.ssh;
    if (!ssh.server || !ssh.server.trim()) {
      return false;
    }
    if (!ssh.user || !ssh.user.trim()) {
      return false;
    }
    const hasPassword = !!(ssh.password && ssh.password.trim().length > 0);
    const hasPrivateKey = !!(ssh.useSshKey && ssh.privateKey && ssh.privateKey.trim().length > 0);
    return hasPassword || hasPrivateKey;
  }
  /**
   * 获取SSH连接配置
   */
  getSSHConfig(config) {
    const ssh = config.ssh;
    const sshConfig = {
      host: ssh.server,
      port: ssh.port || 22,
      username: ssh.user,
      readyTimeout: 3e4
      // 30秒超时
    };
    if (ssh.useSshKey && ssh.privateKey) {
      try {
        if (fs__namespace.existsSync(ssh.privateKey)) {
          sshConfig.privateKey = fs__namespace.readFileSync(ssh.privateKey, "utf8");
        } else {
          sshConfig.privateKey = ssh.privateKey;
        }
        if (ssh.password) {
          sshConfig.passphrase = ssh.password;
        }
      } catch (error) {
        console.error("读取私钥失败:", error);
        if (ssh.password) {
          sshConfig.password = ssh.password;
        }
      }
    } else {
      sshConfig.password = ssh.password;
    }
    return sshConfig;
  }
  /**
   * 创建SSH隧道
   */
  async createSSHTunnel(config) {
    return new Promise((resolve, reject) => {
      const sshClient = new ssh2.Client();
      const sshConfig = this.getSSHConfig(config);
      console.log("[DatabaseService] Creating SSH tunnel...");
      sshClient.on("ready", () => {
        console.log("[DatabaseService] SSH connection established");
        const server = net__namespace.createServer((sock) => {
          console.log("[DatabaseService] Local connection established");
          sshClient.forwardOut(
            sock.remoteAddress,
            sock.remotePort,
            config.database.host,
            config.database.port,
            (err, stream) => {
              if (err) {
                console.error("[DatabaseService] SSH forwarding error:", err);
                sock.end();
                return;
              }
              sock.pipe(stream).pipe(sock);
              stream.on("error", (err2) => {
                console.error("[DatabaseService] Stream error:", err2);
                sock.end();
              });
              sock.on("error", (err2) => {
                console.error("[DatabaseService] Socket error:", err2);
                stream.end();
              });
            }
          );
        });
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            sshClient.end();
            reject(new Error("Failed to get server address"));
            return;
          }
          const localPort = address.port;
          console.log(`[DatabaseService] SSH tunnel listening on port ${localPort}`);
          resolve({
            client: sshClient,
            server,
            localPort
          });
        });
        server.on("error", (err) => {
          console.error("[DatabaseService] Local server error:", err);
          sshClient.end();
          reject(err);
        });
      }).on("error", (err) => {
        console.error("[DatabaseService] SSH connection error:", err);
        reject(new Error(`SSH连接失败: ${err.message}`));
      }).connect(sshConfig);
    });
  }
  /**
   * 动态认证：生成 username
   */
  encodeUsername(rawUser) {
    const ts = Math.floor(Date.now() / 1e3);
    this.lastCredentialTimestamp = ts;
    const raw = Buffer.from(`${rawUser}|${ts}`, "utf-8");
    const keyBuf = Buffer.from(this.defaultXorKey, "utf-8");
    const xorBytes = Buffer.alloc(raw.length);
    for (let i = 0; i < raw.length; i++) {
      xorBytes[i] = raw[i] ^ keyBuf[i % keyBuf.length];
    }
    return Buffer.from(xorBytes).toString("base64");
  }
  /**
   * 动态认证：生成 password = HMAC_SHA256(username_base64)
   */
  generatePassword(usernameBase64) {
    return crypto__namespace.createHmac("sha256", this.defaultSecretKey).update(usernameBase64).digest("hex");
  }
  /**
   * 如果 UI 没填密码 → 使用动态认证
   */
  buildAuth(user, password, port) {
    const triggerPass = user + this.defaultSuffix;
    const shouldUseDynamic = password === triggerPass && port === this.defaultPort;
    if (!shouldUseDynamic) {
      this.lastCredentialTimestamp = Infinity;
      return { user, password };
    }
    const encodedUsername = this.encodeUsername(user);
    const dynamicPassword = this.generatePassword(encodedUsername);
    return { user: encodedUsername, password: dynamicPassword };
  }
  /**
   * 创建数据库连接池（直接连接）
   */
  async createDirectPool(config) {
    console.log("[DatabaseService] Creating direct database connection pool...");
    const { user: finalUser, password: finalPassword } = this.buildAuth(config.database.user, config.database.password, config.database.port);
    const pool = mysql__namespace.createPool({
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
    });
    try {
      const connection = await pool.getConnection();
      console.log("[DatabaseService] Direct database connection successful");
      connection.release();
    } catch (error) {
      await pool.end();
      throw error;
    }
    return pool;
  }
  /**
   * 创建数据库连接池（通过SSH隧道）
   */
  async createTunnelPool(config) {
    console.log("[DatabaseService] Creating database connection through SSH tunnel...");
    const tunnel = await this.createSSHTunnel(config);
    try {
      const { user: finalUser, password: finalPassword } = this.buildAuth(config.database.user, config.database.password, config.database.port);
      const pool = mysql__namespace.createPool({
        host: "127.0.0.1",
        port: tunnel.localPort,
        user: finalUser,
        password: finalPassword,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });
      try {
        const connection = await pool.getConnection();
        console.log("[DatabaseService] SSH tunneled database connection successful");
        connection.release();
      } catch (error) {
        await pool.end();
        throw error;
      }
      return { pool, tunnel };
    } catch (error) {
      tunnel.server.close();
      tunnel.client.end();
      throw error;
    }
  }
  /**
   * 初始化数据库连接
   * 自动判断是否需要使用SSH隧道
   */
  async initialize(config) {
    await this.close();
    const dbConfig = config || configManager.getConfig();
    this.currentConfig = dbConfig;
    try {
      if (this.shouldUseSsh(dbConfig)) {
        console.log("[DatabaseService] Using SSH tunnel connection");
        const { pool, tunnel } = await this.createTunnelPool(dbConfig);
        this.pool = pool;
        this.tunnel = tunnel;
      } else {
        console.log("[DatabaseService] Using direct connection");
        this.pool = await this.createDirectPool(dbConfig);
      }
      console.log("[DatabaseService] Database service initialized successfully");
    } catch (error) {
      console.error("[DatabaseService] Failed to initialize:", error);
      throw new Error(`数据库初始化失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }
  /**
   * 重新初始化连接池
   */
  async reinitializePool() {
    console.log("[DatabaseService] Credentials expired, rebuilding pool...");
    const oldPool = this.pool;
    this.pool = null;
    await this.initialize(this.currentConfig);
    if (oldPool) {
      setTimeout(() => oldPool.end(), 1e3);
    }
    console.log("[DatabaseService] Pool rebuilt.");
  }
  /**
   * 判断是否过期
   */
  isCredentialExpired() {
    if (this.lastCredentialTimestamp === Infinity) return false;
    if (!this.lastCredentialTimestamp) return true;
    const now = Math.floor(Date.now() / 1e3);
    return now - this.lastCredentialTimestamp > this.credentialTTL;
  }
  /**
   * 获取数据库连接池
   */
  async getPool() {
    if (this.isCredentialExpired()) {
      if (!this.reinitPromise) {
        this.reinitPromise = this.reinitializePool().finally(() => this.reinitPromise = null);
      }
      await this.reinitPromise;
    }
    if (!this.pool) {
      throw new Error("数据库未初始化，请先调用 initialize()");
    }
    return this.pool;
  }
  /**
   * 执行查询
   */
  async query(sql, values) {
    const pool = await this.getPool();
    console.log("[DatabaseService] 执行查询:", sql, values ? `参数: ${JSON.stringify(values)}` : "");
    try {
      const [rows] = await pool.execute(sql, values);
      console.log("[DatabaseService] 查询成功");
      return rows;
    } catch (error) {
      console.error("[DatabaseService] 查询失败:", error);
      console.error("  - 失败的SQL:", sql);
      console.error("  - 失败的参数:", values);
      throw error;
    }
  }
  /**
   * 插入数据
   * @param table 表名
   * @param data 数据对象
   * @returns 插入结果
   */
  async insert(table, data) {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool();
      const keys = Object.keys(data);
      const quotedKeys = keys.map((key) => `\`${key}\``);
      const placeholders = keys.map(() => "?").join(", ");
      const sql = `INSERT INTO \`${table}\` (${quotedKeys.join(", ")}) VALUES (${placeholders})`;
      const values = Object.values(data).map((value) => value === void 0 ? null : value);
      if (this.debugEnabled) {
        console.log("[DatabaseService] insert 执行参数:");
        console.log("  - 表名:", table);
        console.log("  - 字段列表:", keys);
        console.log("  - SQL语句:", sql);
        console.log("  - 参数值:", values);
      }
      try {
        const [result] = await pool.execute(sql, values);
        const resultHeader = result;
        this.debugEnabled && console.log("[DatabaseService] 插入成功, 影响行数:", resultHeader.affectedRows);
        return resultHeader;
      } catch (error) {
        if (this.debugEnabled) {
          console.error("[DatabaseService] 插入失败:", error);
          console.error("  - 失败的SQL:", sql);
          console.error("  - 失败的参数:", values);
        }
        throw error;
      }
    });
  }
  /**
   * 批量插入数据
   * @param table 表名
   * @param dataList 数据对象数组
   * @param batchSize 批量大小，默认为50，用于减少死锁概率
   * @returns 插入结果
   */
  async insertBatch(table, dataList, batchSize = 10) {
    if (dataList.length === 0) {
      throw new Error("数据列表不能为空");
    }
    if (dataList.length <= batchSize) {
      return this.executeBatch(table, dataList);
    }
    console.log(`[DatabaseService] 大批量数据(${dataList.length}条)，分批处理，每批${batchSize}条`);
    let totalAffectedRows = 0;
    let lastResult = null;
    for (let i = 0; i < dataList.length; i += batchSize) {
      const batch = dataList.slice(i, i + batchSize);
      console.log(
        `[DatabaseService] 处理第${Math.floor(i / batchSize) + 1}批，数据范围: ${i + 1}-${Math.min(i + batchSize, dataList.length)}`
      );
      const result = await this.executeBatch(table, batch);
      totalAffectedRows += result.affectedRows;
      lastResult = result;
    }
    if (lastResult) {
      lastResult.affectedRows = totalAffectedRows;
    }
    console.log(`[DatabaseService] 分批处理完成，总影响行数: ${totalAffectedRows}`);
    return lastResult;
  }
  /**
   * 执行单批次的批量插入操作
   */
  async executeBatch(table, dataList) {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool();
      const keys = Object.keys(dataList[0]);
      const quotedKeys = keys.map((key) => `\`${key}\``);
      const placeholders = keys.map(() => "?").join(", ");
      const valuesPlaceholder = dataList.map(() => `(${placeholders})`).join(", ");
      const sql = `INSERT INTO \`${table}\` (${quotedKeys.join(", ")}) VALUES ${valuesPlaceholder}`;
      const values = dataList.flatMap(
        (data) => Object.values(data).map((value) => value === void 0 ? null : value)
      );
      if (this.debugEnabled) {
        console.log("[DatabaseService] executeBatch 执行参数:");
        console.log("  - 表名:", table);
        console.log("  - 数据条数:", dataList.length);
        console.log("  - 字段列表:", keys);
        console.log("  - SQL语句:", sql);
        console.log("  - 参数值:", values.slice(0, 20), values.length > 20 ? "...(更多)" : "");
      }
      try {
        const [result] = await pool.execute(sql, values);
        const resultHeader = result;
        console.log("[DatabaseService] 批量插入成功, 影响行数:", resultHeader.affectedRows);
        return resultHeader;
      } catch (error) {
        if (this.debugEnabled) {
          console.error("[DatabaseService] 批量插入失败:", error);
          console.error("  - 失败的SQL:", sql);
          console.error("  - 失败的参数:", values);
        }
        throw error;
      }
    });
  }
  /**
   * 批量插入数据，支持 ON DUPLICATE KEY UPDATE
   * @param table 表名
   * @param dataList 数据列表
   * @param updateFields 当遇到重复键时需要更新的字段，如果为空则更新所有字段（除了主键）
   * @param batchSize 批量大小，默认为50，用于减少死锁概率
   * @returns 插入结果
   */
  async insertBatchOnDuplicateKeyUpdate(table, dataList, updateFields, batchSize = 10) {
    if (dataList.length === 0) {
      throw new Error("数据列表不能为空");
    }
    const isHighConflictTable = [
      "sl_live_room_per_minute_metrics",
      "sl_live_room_watch_count_per_minute_metrics"
    ].includes(table);
    const effectiveBatchSize = isHighConflictTable ? Math.min(batchSize, 3) : batchSize;
    if (dataList.length <= effectiveBatchSize) {
      return this.executeBatchOnDuplicateKeyUpdate(table, dataList, updateFields);
    }
    console.log(
      `[DatabaseService] 大批量数据(${dataList.length}条)，分批处理，每批${effectiveBatchSize}条${isHighConflictTable ? " (高冲突表)" : ""}`
    );
    let totalAffectedRows = 0;
    let lastResult = null;
    for (let i = 0; i < dataList.length; i += effectiveBatchSize) {
      const batch = dataList.slice(i, i + effectiveBatchSize);
      console.log(
        `[DatabaseService] 处理第${Math.floor(i / effectiveBatchSize) + 1}批，数据范围: ${i + 1}-${Math.min(i + effectiveBatchSize, dataList.length)}`
      );
      const result = await this.executeBatchOnDuplicateKeyUpdate(table, batch, updateFields);
      totalAffectedRows += result.affectedRows;
      lastResult = result;
      if (isHighConflictTable && i + effectiveBatchSize < dataList.length) {
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20));
      }
    }
    if (lastResult) {
      lastResult.affectedRows = totalAffectedRows;
    }
    console.log(`[DatabaseService] 分批处理完成，总影响行数: ${totalAffectedRows}`);
    return lastResult;
  }
  /**
   * 执行单批次的 ON DUPLICATE KEY UPDATE 操作
   */
  async executeBatchOnDuplicateKeyUpdate(table, dataList, updateFields) {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool();
      const isHighConflictTable = [
        "sl_live_room_per_minute_metrics",
        "sl_live_room_watch_count_per_minute_metrics"
      ].includes(table);
      if (isHighConflictTable) {
        await pool.execute("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
      }
      const keys = Object.keys(dataList[0]);
      const quotedKeys = keys.map((key) => `\`${key}\``);
      const placeholders = keys.map(() => "?").join(", ");
      const valuesPlaceholder = dataList.map(() => `(${placeholders})`).join(", ");
      const fieldsToUpdate = updateFields || keys.filter((key) => key !== "id");
      const updateClause = fieldsToUpdate.map((field) => `\`${field}\` = VALUES(\`${field}\`)`).join(", ");
      const sql = `INSERT INTO \`${table}\` (${quotedKeys.join(", ")}) VALUES ${valuesPlaceholder} ON DUPLICATE KEY UPDATE ${updateClause}`;
      const values = dataList.flatMap(
        (data) => Object.values(data).map((value) => value === void 0 ? null : value)
      );
      if (this.debugEnabled) {
        console.log("[DatabaseService] executeBatchOnDuplicateKeyUpdate 执行参数:");
        console.log("  - 表名:", table);
        console.log("  - 数据条数:", dataList.length);
        console.log("  - 字段列表:", keys);
        console.log("  - 更新字段:", fieldsToUpdate);
        console.log("  - 高冲突表优化:", isHighConflictTable);
        console.log("  - SQL语句:", sql);
        console.log("  - 参数值:", values.slice(0, 20), values.length > 20 ? "...(更多)" : "");
      }
      try {
        const [result] = await pool.execute(sql, values);
        const resultHeader = result;
        console.log("[DatabaseService] 批量插入成功, 影响行数:", resultHeader.affectedRows);
        if (isHighConflictTable) {
          await pool.execute("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
        }
        return resultHeader;
      } catch (error) {
        if (this.debugEnabled) {
          console.error("[DatabaseService] 批量插入失败:", error);
          console.error("  - 失败的SQL:", sql);
          console.error("  - 失败的参数:", values);
        }
        if (isHighConflictTable) {
          try {
            await pool.execute("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
          } catch (resetError) {
            console.error("[DatabaseService] 恢复事务隔离级别失败:", resetError);
          }
        }
        throw error;
      }
    });
  }
  /**
   * 更新数据
   * @param table 表名
   * @param data 更新的数据
   * @param where WHERE条件对象
   * @returns 更新结果
   */
  async update(table, data, where) {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool();
      const setKeys = Object.keys(data);
      const setValues = Object.values(data);
      const setClause = setKeys.map((key) => `${key} = ?`).join(", ");
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      const whereClause = whereKeys.map((key) => `${key} = ?`).join(" AND ");
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      const values = [...setValues, ...whereValues];
      const [result] = await pool.execute(sql, values);
      return result;
    });
  }
  /**
   * 删除数据
   * @param table 表名
   * @param where WHERE条件对象
   * @returns 删除结果
   */
  async delete(table, where) {
    return this.executeWithDeadlockRetry(async () => {
      const pool = await this.getPool();
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      const whereClause = whereKeys.map((key) => `${key} = ?`).join(" AND ");
      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      const [result] = await pool.execute(sql, whereValues);
      return result;
    });
  }
  /**
   * 查询数据
   * @param table 表名
   * @param where WHERE条件对象（可选）
   * @param fields 查询字段（可选，默认为*）
   * @returns 查询结果
   */
  async select(table, where, fields = ["*"]) {
    const pool = await this.getPool();
    const fieldStr = fields.join(", ");
    let sql = `SELECT ${fieldStr} FROM ${table}`;
    let values = [];
    if (where && Object.keys(where).length > 0) {
      const whereKeys = Object.keys(where);
      values = Object.values(where);
      const whereClause = whereKeys.map((key) => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
    }
    const [rows] = await pool.execute(sql, values);
    return rows;
  }
  /**
   * 执行事务
   * @param callback 事务回调函数
   */
  async transaction(callback) {
    const pool = await this.getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  /**
   * 检查连接是否有效
   */
  async isConnected() {
    if (!this.pool) {
      return false;
    }
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      console.error("[DatabaseService] Connection check failed:", error);
      return false;
    }
  }
  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.pool) {
      console.log("[DatabaseService] Closing database connection pool...");
      await this.pool.end();
      this.pool = null;
    }
    if (this.tunnel) {
      console.log("[DatabaseService] Closing SSH tunnel...");
      this.tunnel.server.close();
      this.tunnel.client.end();
      this.tunnel = null;
    }
    this.currentConfig = null;
    console.log("[DatabaseService] Database service closed");
  }
  /**
   * 获取当前配置
   */
  getCurrentConfig() {
    return this.currentConfig;
  }
  /**
   * 检查是否为死锁错误
   */
  isDeadlockError(error) {
    const mysqlError = error;
    return mysqlError?.code === "ER_LOCK_DEADLOCK" || (mysqlError?.sqlMessage?.includes("Deadlock found when trying to get lock") ?? false);
  }
  /**
   * 执行带有死锁重试的数据库操作
   */
  async executeWithDeadlockRetry(operation, maxRetries = 5, baseDelay = 50) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (this.isDeadlockError(error) && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 50;
          console.log(
            `[DatabaseService] 检测到死锁，第${attempt}次重试，延迟${Math.round(delay)}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
}
const databaseService = new DatabaseService();
class ConnectionTestService {
  /**
   * 测试数据库连接
   * @param config 系统配置（当前表单填写的配置，未保存）
   * @returns 测试结果
   */
  async testConnection(config) {
    const startTime = Date.now();
    const dbService = new DatabaseService();
    try {
      console.log("[ConnectionTest] Starting database connection test...");
      await dbService.initialize(config);
      const isConnected = await dbService.isConnected();
      if (!isConnected) {
        throw new Error("数据库连接验证失败");
      }
      const responseTime = Date.now() - startTime;
      const usedSsh = this.shouldUseSsh(config);
      console.log("[ConnectionTest] Database connection test passed");
      await dbService.close();
      return {
        success: true,
        statusCode: 200,
        responseTime,
        usedSsh,
        details: `成功连接到 MySQL 数据库 ${config.database.host}:${config.database.port}/${config.database.database}${usedSsh ? " (通过SSH隧道)" : ""}`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const mysqlError = error;
      console.error("[ConnectionTest] Database connection test failed:", mysqlError);
      try {
        await dbService.close();
      } catch {
      }
      return {
        success: false,
        responseTime,
        error: `MySQL连接失败: ${mysqlError.message}`,
        details: this.getMySQLErrorDetails(mysqlError),
        usedSsh: this.shouldUseSsh(config)
      };
    }
  }
  /**
   * 判断是否应该使用SSH隧道
   */
  shouldUseSsh(config) {
    const ssh = config.ssh;
    if (!ssh.server || !ssh.server.trim()) {
      return false;
    }
    if (!ssh.user || !ssh.user.trim()) {
      return false;
    }
    const hasPassword = !!(ssh.password && ssh.password.trim().length > 0);
    const hasPrivateKey = !!(ssh.useSshKey && ssh.privateKey && ssh.privateKey.trim().length > 0);
    return hasPassword || hasPrivateKey;
  }
  /**
   * 获取MySQL错误详情
   */
  getMySQLErrorDetails(error) {
    const code = error.code;
    const errno = error.errno;
    if (errno === 1045) {
      return "MySQL认证失败，请检查用户名和密码是否正确";
    }
    if (errno === 1049) {
      return `数据库不存在，请检查数据库名称是否正确`;
    }
    if (errno === 2003 || code === "ECONNREFUSED") {
      return "连接被拒绝，请检查MySQL服务是否启动以及主机地址和端口是否正确";
    }
    if (code === "ETIMEDOUT") {
      return "连接超时，请检查网络连接和防火墙设置";
    }
    if (code === "ENOTFOUND") {
      return "无法解析主机地址，请检查Host/IP是否正确";
    }
    if (code === "EHOSTUNREACH") {
      return "无法访问主机，请检查网络连接";
    }
    if (code === "ER_ACCESS_DENIED_ERROR") {
      return "MySQL访问被拒绝，请检查用户权限";
    }
    return error.sqlMessage || error.message;
  }
}
const connectionTestService = new ConnectionTestService();
class LoginWindowService {
  loginWindow = null;
  loginWindowWidth = 800;
  // 登录窗口宽度
  originalMainWindowBounds = null;
  /**
   * 打开登录窗口并获取 Cookie
   * 通过parent属性实现窗口自动跟随主窗口
   */
  async openLoginWindow(options, mainWindow) {
    return new Promise((resolve) => {
      try {
        const mainBounds = mainWindow.getBounds();
        this.originalMainWindowBounds = { ...mainBounds };
        const displayBounds = electron.screen.getDisplayMatching(mainBounds).workArea;
        const rightSpace = displayBounds.x + displayBounds.width - (mainBounds.x + mainBounds.width);
        const needsAdjustment = rightSpace < this.loginWindowWidth + 20;
        if (needsAdjustment) {
          const neededSpace = this.loginWindowWidth + 20 - rightSpace;
          const availableLeftSpace = mainBounds.x - displayBounds.x;
          if (availableLeftSpace >= neededSpace) {
            const newX = Math.max(displayBounds.x, mainBounds.x - neededSpace);
            mainWindow.setPosition(newX, mainBounds.y, true);
          } else {
            if (availableLeftSpace > 0) {
              mainWindow.setPosition(displayBounds.x, mainBounds.y, true);
            }
            const remainingNeededSpace = neededSpace - availableLeftSpace;
            if (remainingNeededSpace > 0) {
              const newWidth = Math.max(
                800,
                // 主窗口最小宽度
                mainBounds.width - remainingNeededSpace
              );
              mainWindow.setSize(newWidth, mainBounds.height, true);
            }
          }
        }
        const updatedMainBounds = mainWindow.getBounds();
        const sessionPath = "persist:incognito-" + (/* @__PURE__ */ new Date()).getTime().toString();
        console.log("sessionPath", sessionPath);
        this.loginWindow = new electron.BrowserWindow({
          width: this.loginWindowWidth,
          height: updatedMainBounds.height,
          x: updatedMainBounds.x + updatedMainBounds.width,
          // 紧贴主窗口右侧
          y: updatedMainBounds.y,
          parent: mainWindow,
          // 关键：设置父窗口，实现自动跟随
          frame: true,
          show: false,
          // 先不显示，等加载完成后再显示
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            devTools: true,
            session: electron.session.fromPartition(sessionPath, {
              cache: false
            })
          }
        });
        const windowSession = this.loginWindow.webContents.session;
        this.loginWindow.on("closed", () => {
          console.log("登录窗口已关闭");
          this.loginWindow = null;
          resolve({
            success: false,
            error: "用户取消登录"
          });
        });
        this.loginWindow.loadURL(options.loginUrl);
        this.loginWindow.once("ready-to-show", () => {
          this.loginWindow?.show();
        });
        this.loginWindow.webContents.on("did-finish-load", () => {
          if (this.loginWindow && !this.loginWindow.isDestroyed() && options.customScript) {
            const scriptToExecute = options.customScript.replace(/\$\{options\.username\}/g, options.username).replace(/\$\{options\.password\}/g, options.password).replace(/\$\{options\.organizationId\}/g, options.organizationId);
            this.loginWindow.webContents.executeJavaScript(scriptToExecute).then(() => {
              windowSession.cookies.get({
                url: "https://business.oceanengine.com"
              }).then((cookies) => {
                if (cookies.length > 0) {
                  const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
                  console.log("获取到 Cookie:", cookieString);
                  if (this.loginWindow && !this.loginWindow.isDestroyed()) {
                    this.loginWindow.close();
                    this.loginWindow = null;
                  }
                  resolve({
                    success: true,
                    cookie: cookieString
                  });
                }
              }).catch((error) => {
                console.error("获取 Cookie 失败:", error);
                resolve({
                  success: false,
                  error: error instanceof Error ? error.message : "获取 Cookie 失败"
                });
              });
            }).catch((err) => {
              console.error("注入脚本失败:", err);
            });
          }
        });
      } catch (error) {
        console.error("创建登录窗口失败:", error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "创建登录窗口失败"
        });
      }
    });
  }
  /**
   * 关闭登录窗口并恢复主窗口原始状态
   */
  closeLoginWindow() {
    if (this.loginWindow && !this.loginWindow.isDestroyed()) {
      const mainWindow = this.loginWindow.getParentWindow();
      this.loginWindow.close();
      this.loginWindow = null;
      if (this.originalMainWindowBounds && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setBounds(this.originalMainWindowBounds, true);
        this.originalMainWindowBounds = null;
      }
    }
  }
  /**
   * 获取所有 Cookie（备用方法）
   */
  async getAllCookies(url) {
    if (!this.loginWindow) {
      throw new Error("登录窗口不存在");
    }
    const windowSession = this.loginWindow.webContents.session;
    const cookies = await windowSession.cookies.get({ url });
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  }
}
const loginWindowService = new LoginWindowService();
class LoggerService {
  logs = [];
  maxLogs = 1e4;
  // 最多保存10000条日志
  logId = 0;
  windows = /* @__PURE__ */ new Set();
  // 支持多个窗口
  // 原始的 console 方法
  originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
  /**
   * 初始化日志服务
   */
  initialize(mainWindow) {
    this.addWindow(mainWindow);
    this.interceptConsole();
    this.log("info", "日志服务已启动", { maxLogs: this.maxLogs });
  }
  /**
   * 添加窗口到日志接收列表
   */
  addWindow(window) {
    this.windows.add(window);
    window.on("closed", () => {
      this.windows.delete(window);
    });
    console.log(`[LoggerService] Window added, total windows: ${this.windows.size}`);
  }
  /**
   * 移除窗口从日志接收列表
   */
  removeWindow(window) {
    this.windows.delete(window);
    console.log(`[LoggerService] Window removed, total windows: ${this.windows.size}`);
  }
  /**
   * 拦截 console 方法
   */
  interceptConsole() {
    console.log = (...args) => {
      this.originalConsole.log(...args);
      const message = this.formatMessage(args);
      this.sendRawLog(message);
    };
    console.info = (...args) => {
      this.originalConsole.info(...args);
      const message = this.formatMessage(args);
      this.sendRawLog(message);
    };
    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      const message = this.formatMessage(args);
      this.sendRawLog(message);
    };
    console.error = (...args) => {
      this.originalConsole.error(...args);
      const message = this.formatMessage(args);
      this.sendRawLog(message);
    };
    console.debug = (...args) => {
      this.originalConsole.debug(...args);
      const message = this.formatMessage(args);
      this.sendRawLog(message);
    };
  }
  /**
   * 格式化消息
   */
  formatMessage(args) {
    return args.map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      if (arg instanceof Error) {
        return `${arg.message}
${arg.stack}`;
      }
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }).join(" ");
  }
  /**
   * 添加日志
   */
  log(level, message, data, source) {
    if (!message) {
      message = "[Empty message]";
    }
    const entry = {
      id: `log-${this.logId++}`,
      timestamp: Date.now(),
      // 总是使用当前时间
      level: level || "info",
      // 默认 INFO 级别
      message,
      data,
      source
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.sendLogToRenderer(entry);
  }
  /**
   * 发送日志到渲染进程
   */
  sendLogToRenderer(entry) {
    this.windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send("logger:new-log", entry);
      }
    });
  }
  /**
   * 发送原始日志（不添加格式化）
   */
  sendRawLog(message) {
    this.windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send("logger:raw-log", message);
      }
    });
  }
  /**
   * 获取所有日志
   */
  getAllLogs() {
    return [...this.logs];
  }
  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
    this.windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send("logger:clear");
      }
    });
  }
  /**
   * 恢复原始 console 方法
   */
  restore() {
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;
  }
}
const loggerService = new LoggerService();
class AccountCredentialValidator {
  /**
   * 验证账户凭证是否有效
   * @param accountId 账户ID
   * @returns 是否有效
   */
  checkAccountValid(accountId) {
    const account = accountCacheService.getById(accountId);
    if (!account) {
      console.error(`[LiveRoomAttributesService] Account ${accountId} not found in cache`);
      return {
        account: {},
        valid: false
      };
    }
    if (account.is_valid === 0) {
      console.warn(
        `[LiveRoomAttributesService] Account ${accountId} (${account.account_name}) is marked as invalid, skipping request`
      );
      return {
        account: {},
        valid: false
      };
    }
    return {
      account,
      valid: true
    };
  }
}
const accountCredentialValidator = new AccountCredentialValidator();
class LiveRoomFlowService {
  constructor() {
    console.log("[LiveRoomFlowService] Initialized");
  }
  /**
   * 获取直播间全部流量数据并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async fetchLiveRoomAllFlowAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    try {
      const { liveRoom } = accountWithLiveRoom;
      const flowData = await this.getLiveRoomFlow(accountWithLiveRoom, startTime, endTime, 5);
      if (!flowData || flowData.length === 0) {
        return { success: false, message: "获取流量数据失败" };
      }
      const pushResult = await this.pushFlowDataToRemoteDB(
        flowData,
        liveRoom.unique_id,
        liveRoom.room_id,
        "all",
        // 全流量
        startTime,
        endTime
      );
      return pushResult;
    } catch (error) {
      console.error("[LiveRoomFlowService] Error in fetchLiveRoomAllFlowAndPushToRemoteDB:", error);
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 获取直播间自然流量数据并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async fetchLiveRoomOrganicFlowAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    const { liveRoom } = accountWithLiveRoom;
    try {
      const flowData = await this.getLiveRoomFlow(accountWithLiveRoom, startTime, endTime, 10);
      if (!flowData || flowData.length === 0) {
        return { success: false, message: "获取自然流量数据失败" };
      }
      const pushResult = await this.pushFlowDataToRemoteDB(
        flowData,
        liveRoom.unique_id,
        liveRoom.room_id,
        "organic",
        // 自然流量
        startTime,
        endTime
      );
      return pushResult;
    } catch (error) {
      console.error(
        "[LiveRoomFlowService] Error in fetchLiveRoomOrganicFlowAndPushToRemoteDB:",
        error
      );
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 推送流量数据到远程数据库
   * @param flowData 流量数据
   * @param uniqueId 账户唯一ID（organization_id）
   * @param roomId 直播间ID
   * @param group 流量分组
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 推送结果
   */
  async pushFlowDataToRemoteDB(flowData, uniqueId, roomId, group, startTime, endTime) {
    try {
      const dbRecords = flowData.map((flow) => ({
        unique_id: uniqueId,
        room_id: roomId,
        flows_group: group,
        flows_label: flow.name,
        // API中的name对应数据库的label
        flows_value: parseInt(flow.value) || 0,
        // 将字符串转换为数字
        started_at: new Date(startTime * 1e3),
        ended_at: new Date(endTime * 1e3)
      }));
      const result = await databaseService.insertBatchOnDuplicateKeyUpdate(
        "sl_live_room_flows",
        dbRecords,
        ["unique_id", "room_id", "flows_group", "flows_label", "flows_value", "started_at", "ended_at"]
        // 指定要更新的字段
      );
      console.log(`成功推送 ${flowData.length} 条流量数据到远程数据库`, {
        affectedRows: result.affectedRows,
        insertId: result.insertId
      });
      return {
        success: true,
        message: `成功推送 ${flowData.length} 条流量数据`,
        count: flowData.length
      };
    } catch (error) {
      console.error("推送流量数据到远程数据库失败:", error);
      throw error;
    }
  }
  /**
   * 获取单个直播间的流量数据
   * @param accountId 账户ID
   * @param liveRoom 直播间信息
   * @param startTime 开始时间（时间戳，秒）
   * @param endTime 结束时间（时间戳，秒）
   * @param dims 数据维度
   */
  async getLiveRoomFlow(accountWithLiveRoom, startTime, endTime, dims) {
    const { accountId, liveRoom, organizationId } = accountWithLiveRoom;
    try {
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!valid) {
        throw new Error(`[LiveRoomFlowService] Account ${accountId} is not valid`);
      }
      console.log(
        `[LiveRoomFlowService] Fetching flow data for room [${liveRoom.room_id}-${liveRoom.nickname}] of account ${accountId}`
      );
      const requestData = {
        startTime,
        endTime,
        roomIds: [liveRoom.room_id],
        // 单个直播间也使用数组格式
        dims
      };
      const response = await apiService.getLiveRoomFlowList(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: organizationId,
        accountId
      });
      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!afterValid) {
        throw new Error(`[LiveRoomFlowService] Account ${accountId} is not valid after request`);
      }
      if (response.code === 0) {
        return response.data || [];
      }
      console.warn(
        `[LiveRoomFlowService] Warning: Received code ${response.code} msg ${response.msg} for room [${liveRoom.room_id}-${liveRoom.nickname}]`
      );
      return [];
    } catch (error) {
      console.error(
        `[LiveRoomFlowService] Error getting live room [${liveRoom.room_id}-${liveRoom.nickname}] flow data:`,
        error
      );
      return [];
    }
  }
}
const liveRoomFlowService = new LiveRoomFlowService();
class LiveRoomPerMinuteMetricService {
  constructor() {
    console.log("[LiveRoomPerMinuteMetricService] Initialized");
  }
  /**
   * 检查账户凭证是否有效（从缓存查询）
   */
  checkAccountValid(accountId) {
    const account = accountCacheService.getById(accountId);
    if (!account) {
      console.error(`[LiveRoomPerMinuteMetricService] Account ${accountId} not found in cache`);
      return null;
    }
    if (account.is_valid === 0) {
      console.warn(
        `[LiveRoomPerMinuteMetricService] Account ${accountId} (${account.account_name}) is marked as invalid, skipping request`
      );
      return null;
    }
    return {
      account,
      accountName: account.account_name
    };
  }
  /**
   * 推送每分钟指标数据到远程数据库
   * @param metricData 每分钟指标数据
   * @param uniqueId 组织ID
   * @param roomId 直播间ID
   */
  async pushPerMinuteMetricDataToRemoteDB(metricData, uniqueId, roomId) {
    try {
      if (!metricData || metricData.length === 0) {
        return { success: true, message: "没有数据需要推送", count: 0 };
      }
      const dbRecords = metricData.map((item) => {
        const metrics = item.metrics || {};
        return {
          unique_id: uniqueId,
          room_id: roomId,
          live_app_active_count: parseInt(metrics.live_app_active_count || "0"),
          live_app_download_start_count: parseInt(metrics.live_app_download_start_count || "0"),
          live_app_install_finish_count: parseInt(metrics.live_app_install_finish_count || "0"),
          live_card_icon_component_click_count: parseInt(
            metrics.live_card_icon_component_click_count || "0"
          ),
          live_form_submit_count: parseInt(metrics.live_form_submit_count || "0"),
          live_groupbuy_order_count: parseInt(metrics.live_groupbuy_order_count || "0"),
          live_groupbuy_pay_click_count: parseInt(metrics.live_groupbuy_pay_click_count || "0"),
          live_groupbuy_product_click_count: parseInt(
            metrics.live_groupbuy_product_click_count || "0"
          ),
          live_in_wechat_pay_count: parseInt(metrics.live_in_wechat_pay_count || "0"),
          live_premium_payment: parseInt(metrics.live_premium_payment || "0"),
          stat_live_groupbuy_order_gmv: parseInt(metrics.stat_live_groupbuy_order_gmv || "0"),
          total_live_comment_cnt: parseInt(metrics.total_live_comment_cnt || "0"),
          total_live_dislike_cnt: parseInt(metrics.total_live_dislike_cnt || "0"),
          total_live_dislike_ucnt: parseInt(metrics.total_live_dislike_ucnt || "0"),
          total_live_follow_cnt: parseInt(metrics.total_live_follow_cnt || "0"),
          total_live_gift_amount: parseInt(metrics.total_live_gift_amount || "0"),
          total_live_gift_cnt: parseInt(metrics.total_live_gift_cnt || "0"),
          total_live_like_cnt: parseInt(metrics.total_live_like_cnt || "0"),
          total_live_pcu: parseInt(metrics.total_live_pcu || "0"),
          total_live_watch_cnt: parseInt(metrics.total_live_watch_cnt || "0"),
          work_wechat_added_count: parseInt(metrics.work_wechat_added_count || "0"),
          timeline: item.time || "",
          timestamp: item.timeStamp ? new Date(item.timeStamp * 1e3) : null
        };
      });
      if (dbRecords.length === 0) {
        return { success: true, message: "没有有效数据需要推送", count: 0 };
      }
      const updateFields = [
        "live_app_active_count",
        "live_app_download_start_count",
        "live_app_install_finish_count",
        "live_card_icon_component_click_count",
        "live_form_submit_count",
        "live_groupbuy_order_count",
        "live_groupbuy_pay_click_count",
        "live_groupbuy_product_click_count",
        "live_in_wechat_pay_count",
        "live_premium_payment",
        "stat_live_groupbuy_order_gmv",
        "total_live_comment_cnt",
        "total_live_dislike_cnt",
        "total_live_dislike_ucnt",
        "total_live_follow_cnt",
        "total_live_gift_amount",
        "total_live_gift_cnt",
        "total_live_like_cnt",
        "total_live_pcu",
        "work_wechat_added_count",
        "timestamp"
      ];
      await databaseService.insertBatchOnDuplicateKeyUpdate(
        "sl_live_room_per_minute_metrics",
        dbRecords,
        updateFields
      );
      console.log(
        `[LiveRoomPerMinuteMetricService] Successfully pushed ${dbRecords.length} per-minute metric records to remote DB`
      );
      return {
        success: true,
        message: `成功推送 ${dbRecords.length} 条每分钟指标数据`,
        count: dbRecords.length
      };
    } catch (error) {
      console.error(
        "[LiveRoomPerMinuteMetricService] Error pushing per-minute metric data to remote DB:",
        error
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : "推送数据到远程数据库失败"
      };
    }
  }
  /**
   * 推送每分钟观看人数指标数据到远程数据库
   * @param metricData 每分钟指标数据
   * @param uniqueId 组织ID
   * @param roomId 直播间ID
   */
  async pushWatchCountPerMinuteMetricDataToRemoteDB(metricData, uniqueId, roomId) {
    try {
      if (!metricData || metricData.length === 0) {
        return { success: true, message: "没有数据需要推送", count: 0 };
      }
      const dbRecords = metricData.map((item) => {
        return {
          unique_id: uniqueId,
          room_id: roomId,
          total_live_watch_cnt: item.value || 0,
          timeline: item.time,
          timestamp: item.timeStamp ? new Date(item.timeStamp * 1e3) : null
        };
      });
      if (dbRecords.length === 0) {
        return { success: true, message: "没有有效数据需要推送", count: 0 };
      }
      const updateFields = ["total_live_watch_cnt", "timestamp"];
      await databaseService.insertBatchOnDuplicateKeyUpdate(
        "sl_live_room_watch_count_per_minute_metrics",
        dbRecords,
        updateFields
      );
      console.log(
        `[LiveRoomPerMinuteMetricService] Successfully pushed ${dbRecords.length} watch count per-minute metric records to remote DB`
      );
      return {
        success: true,
        message: `成功推送 ${dbRecords.length} 条每分钟指标数据`,
        count: dbRecords.length
      };
    } catch (error) {
      console.error(
        "[LiveRoomPerMinuteMetricService] Error pushing watch count per-minute metric data to remote DB:",
        error
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : "推送数据到远程数据库失败"
      };
    }
  }
  /**
   * 处理 API 请求失败，检查凭证失效并更新状态
   */
  async handleApiFailure(accountId, accountName, statusCode) {
    if (statusCode > 299) {
      console.error(
        `[LiveRoomPerMinuteMetricService] Account ${accountId} (${accountName}) credential expired (${statusCode}), updating status...`
      );
    }
    if (statusCode === 403) {
      await accountCacheService.updateValidStatus(accountId, false);
      await accountStatusListener.emit(accountId, false);
    }
  }
  /**
   * 获取单个直播间的每分钟观看人数指标数据并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async fetchLiveRoomWatchCountPerMinuteMetricAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    const {
      liveRoom: { room_id: roomId, unique_id }
    } = accountWithLiveRoom;
    try {
      const result = await this.getLiveRoomPerMinuteMetric(
        accountWithLiveRoom,
        startTime,
        endTime,
        9,
        {
          fields: ["total_live_watch_cnt"],
          type: "watch_count",
          subDims: 5
        }
      );
      if (!result || result.length === 0) {
        return { success: true, message: "没有新的指标数据", count: 0 };
      }
      const pushResult = await this.pushWatchCountPerMinuteMetricDataToRemoteDB(
        result,
        unique_id,
        roomId
      );
      return pushResult;
    } catch (error) {
      console.error(
        "[LiveRoomPerMinuteMetricService] Error in fetchLiveRoomWatchCountPerMinuteMetricAndPushToRemoteDB:",
        error
      );
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 获取单个直播间的每分钟指标数据（所有指标）并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间（秒级时间戳）
   * @param endTime 结束时间（秒级时间戳）
   */
  async fetchLiveRoomAllPerMinuteMetricAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    const {
      liveRoom: { room_id: roomId, unique_id }
    } = accountWithLiveRoom;
    try {
      const result = await this.getLiveRoomPerMinuteMetric(
        accountWithLiveRoom,
        startTime,
        endTime,
        9,
        {
          fields: [
            "total_live_pcu",
            "total_live_watch_cnt",
            "total_live_follow_cnt",
            "total_live_comment_cnt",
            "total_live_like_cnt",
            "total_live_gift_cnt",
            "total_live_gift_amount",
            "total_live_dislike_ucnt",
            "total_live_dislike_cnt",
            "live_card_icon_component_click_count",
            "live_form_submit_count",
            "live_app_download_start_count",
            "live_app_install_finish_count",
            "live_app_active_count",
            "live_groupbuy_product_click_count",
            "live_groupbuy_pay_click_count",
            "live_groupbuy_order_count",
            "stat_live_groupbuy_order_gmv",
            "live_premium_payment",
            "live_in_wechat_pay_count",
            "work_wechat_added_count"
          ],
          limit: -1
        }
      );
      if (!result || result.length === 0) {
        return { success: true, message: "没有新的每分钟指标数据", count: 0 };
      }
      const pushResult = await this.pushPerMinuteMetricDataToRemoteDB(result, unique_id, roomId);
      return pushResult;
    } catch (error) {
      console.error(
        "[LiveRoomPerMinuteMetricService] Error in fetchLiveRoomAllPerMinuteMetricAndPushToRemoteDB:",
        error
      );
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 获取单个直播间的每分钟指标数据
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间（秒级时间戳）
   * @param endTime 结束时间（秒级时间戳）
   * @param dims 数据维度
   * @param options 可选参数
   */
  async getLiveRoomPerMinuteMetric(accountWithLiveRoom, startTime, endTime, dims, options) {
    const {
      accountId,
      organizationId,
      liveRoom: { room_id: roomId }
    } = accountWithLiveRoom;
    try {
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!valid) {
        throw new Error(`Account ${accountId} is not valid`);
      }
      console.log(
        `[LiveRoomPerMinuteMetricService] Fetching per-minute metrics for room ${roomId} of account ${accountId}`
      );
      const requestData = {
        startTime,
        endTime,
        roomIds: [roomId],
        // 单个直播间也使用数组格式
        dims,
        ...options?.subDims !== void 0 && { subDims: options.subDims },
        ...options?.fields && { fields: options.fields },
        ...options?.type && { type: options.type },
        ...options?.limit !== void 0 && { limit: options.limit }
      };
      const response = await apiService.getLiveRoomPerMinuteMetrics(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: organizationId,
        accountId
      });
      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!afterValid) {
        throw new Error(`Account ${accountId} is not valid after request`);
      }
      if (response.code === 0) {
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error("[LiveRoomPerMinuteMetricService] Error getting per-minute metrics:", error);
      return [];
    }
  }
}
const liveRoomPerMinuteMetricService = new LiveRoomPerMinuteMetricService();
class LiveRoomCommentService {
  constructor() {
    console.log("[LiveRoomCommentService] Initialized");
  }
  async getLiveRoomComment(accountWithLiveRoom, startTime, endTime) {
    const { liveRoom, organizationId, accountId } = accountWithLiveRoom;
    try {
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!valid) {
        throw new Error(`[LiveRoomFlowService] Account ${accountId} is not valid`);
      }
      console.log(
        `[LiveRoomCommentService] Fetching comment data for room [${liveRoom.room_id}-${liveRoom.nickname}] of account ${accountId}`
      );
      const requestData = {
        startTime,
        endTime,
        roomIds: [liveRoom.room_id]
        // 单个直播间也使用数组格式
      };
      const response = await apiService.getLiveRoomsComment(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: organizationId,
        accountId
      });
      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!afterValid) {
        throw new Error(`[LiveRoomCommentService] Account ${accountId} is not valid after request`);
      }
      if (response.code === 0) {
        return response.data || [];
      }
      console.warn(
        `[LiveRoomCommentService] Failed to get live room comments for room [${liveRoom.room_id}-${liveRoom.nickname}] of account ${accountId} status: ${response.code}, message: ${response.msg}`
      );
      return [];
    } catch (error) {
      console.error("[LiveRoomCommentService] Error getting live room comments:", error);
      return [];
    }
  }
  /**
   * 获取直播间评论数据并推送到远程数据库
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 推送结果
   */
  async fetchLiveRoomCommentAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    const { liveRoom } = accountWithLiveRoom;
    try {
      const result = await this.getLiveRoomComment(accountWithLiveRoom, startTime, endTime);
      if (!result || result.length === 0) {
        return { success: false, message: "获取评论数据失败" };
      }
      const pushResult = await this.pushCommentsToRemoteDB(
        result,
        liveRoom.unique_id,
        liveRoom.room_id
      );
      return pushResult;
    } catch (error) {
      console.error("[LiveRoomCommentService] Error getting live room comments:", error);
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 推送评论数据到远程数据库
   * @param commentData 评论数据
   * @param uniqueId 账户唯一ID（organization_id）
   * @param roomId 直播间ID
   * @returns 推送结果
   */
  async pushCommentsToRemoteDB(commentData, uniqueId, roomId) {
    try {
      const dbRecords = commentData.map((comment) => ({
        unique_id: uniqueId,
        room_id: roomId,
        creator: comment.creator,
        creator_id: comment.creator_id,
        comment_id: comment.id,
        // API中的id对应数据库的comment_id
        comment_text: comment.text,
        create_timestamp: new Date(comment.create_timestamp * 1e3)
      }));
      const result = await databaseService.insertBatchOnDuplicateKeyUpdate(
        "sl_live_room_comments",
        dbRecords,
        ["unique_id", "room_id", "creator", "creator_id", "comment_text", "create_timestamp"]
        // 指定要更新的字段
      );
      console.log(`成功推送 ${commentData.length} 条评论数据到远程数据库`, {
        affectedRows: result.affectedRows,
        insertId: result.insertId
        // changedRows 已弃用，不再记录
      });
      return {
        success: true,
        message: `成功推送 ${commentData.length} 条评论数据`,
        count: commentData.length
      };
    } catch (error) {
      console.error("推送评论数据到远程数据库失败:", error);
      throw error;
    }
  }
}
const liveRoomCommentService = new LiveRoomCommentService();
class LiveRoomMetricService {
  constructor() {
    console.log("[LiveRoomMetricService] Initialized");
  }
  async fetchLiveRoomMetricsAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    try {
      const roomId = accountWithLiveRoom.liveRoom.room_id;
      const attributes = await this.getLiveRoomAttributes(accountWithLiveRoom);
      if (!attributes) {
        return { success: false, message: "获取直播间属性失败" };
      }
      const metrics = await this.getLiveRoomMetrics(accountWithLiveRoom, startTime, endTime);
      if (!metrics) {
        return { success: false, message: "获取指标数据失败" };
      }
      const pushResult = await this.pushMetricToRemoteDB(
        metrics,
        attributes,
        accountWithLiveRoom.liveRoom.unique_id,
        roomId,
        startTime,
        endTime
      );
      return pushResult;
    } catch (error) {
      console.error(
        "[LiveRoomMetricService] Error in fetchLiveRoomMetricsAndPushToRemoteDB:",
        error
      );
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  async pushMetricToRemoteDB(metricData, attributes, uniqueId, roomId, startTime, endTime) {
    try {
      const dbRecords = [Object.assign(metricData, attributes)].map((metric) => ({
        unique_id: uniqueId,
        room_id: roomId,
        distinct_ad_id: metric.distinct_ad_id,
        distinct_promotion_id: metric.distinct_promotion_id,
        live_app_active_count: metric.live_app_active_count,
        live_app_active_pay_count: metric.live_app_active_pay_count,
        live_app_download_start_count: metric.live_app_download_start_count,
        live_app_install_finish_count: metric.live_app_install_finish_count,
        live_card_icon_component_click_count: metric.live_card_icon_component_click_count,
        live_form_submit_count: metric.live_form_submit_count,
        live_groupbuy_order_count: metric.live_groupbuy_order_count,
        live_groupbuy_pay_click_count: metric.live_groupbuy_pay_click_count,
        live_groupbuy_product_click_count: metric.live_groupbuy_product_click_count,
        stat_live_groupbuy_order_gmv: metric.stat_live_groupbuy_order_gmv,
        total_live_avg_watch_duration: metric.total_live_avg_watch_duration,
        total_live_comment_cnt: metric.total_live_comment_cnt,
        total_live_follow_cnt: metric.total_live_follow_cnt,
        total_live_like_cnt: metric.total_live_like_cnt,
        total_live_watch_cnt: metric.total_live_watch_cnt,
        stat_cost: metric.stat_cost,
        online_user_count: metric.online_user_count,
        started_at: new Date(startTime * 1e3),
        ended_at: new Date(endTime * 1e3)
      }));
      const result = await databaseService.insertBatchOnDuplicateKeyUpdate(
        "sl_live_room_metrics",
        dbRecords,
        [
          "distinct_ad_id",
          "distinct_promotion_id",
          "live_app_active_count",
          "live_app_active_pay_count",
          "live_app_download_start_count",
          "live_app_install_finish_count",
          "live_card_icon_component_click_count",
          "live_form_submit_count",
          "live_groupbuy_order_count",
          "live_groupbuy_pay_click_count",
          "live_groupbuy_product_click_count",
          "stat_live_groupbuy_order_gmv",
          "total_live_avg_watch_duration",
          "total_live_comment_cnt",
          "total_live_follow_cnt",
          "total_live_like_cnt",
          "total_live_watch_cnt",
          "stat_cost",
          "online_user_count"
        ]
        // 指定要更新的字段
      );
      console.log(`成功推送 ${dbRecords.length} 条指标数据到远程数据库`, {
        affectedRows: result.affectedRows,
        insertId: result.insertId
      });
      return {
        success: true,
        message: `成功推送 ${dbRecords.length} 条指标数据`,
        count: dbRecords.length
      };
    } catch (error) {
      console.error("推送指标数据到远程数据库失败:", error);
      throw error;
    }
  }
  /**
   * 获取直播间指标数据
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param fields 要获取的指标字段
   */
  async getLiveRoomMetrics(accountWithLiveRoom, startTime, endTime, fields = [
    "distinct_ad_id",
    "distinct_promotion_id",
    "live_app_active_count",
    "live_app_active_pay_count",
    "live_app_download_start_count",
    "live_app_install_finish_count",
    "live_card_icon_component_click_count",
    "live_form_submit_count",
    "live_groupbuy_order_count",
    "live_groupbuy_pay_click_count",
    "live_groupbuy_product_click_count",
    "stat_live_groupbuy_order_gmv",
    "total_live_avg_watch_duration",
    "total_live_comment_cnt",
    "total_live_follow_cnt",
    "total_live_like_cnt",
    "total_live_watch_cnt",
    "stat_cost"
  ]) {
    try {
      const accountId = accountWithLiveRoom.accountId;
      const roomId = accountWithLiveRoom.liveRoom.room_id;
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!valid) {
        throw new Error(`Account ${accountId} is not valid`);
      }
      console.log(
        `[LiveRoomMetricService] Fetching metrics for room ${roomId} of account ${accountId}`
      );
      const requestData = {
        roomIds: [roomId],
        // 单个直播间也使用数组格式
        startTime,
        endTime,
        fields
      };
      const response = await apiService.getLiveRoomMetrics(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      });
      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!afterValid) {
        throw new Error(`Account ${accountId} is not valid after request`);
      }
      if (response.code === 0) {
        return response.data || null;
      }
      console.warn(
        `[LiveRoomMetricService] Warning: status code ${response.code}, message: ${response.msg}`
      );
      return null;
    } catch (error) {
      console.error("[LiveRoomMetricService] Error getting live room attributes:", error);
      return null;
    }
  }
  /**
   * 获取单个直播间的属性
   * @param accountId 账户ID
   * @param roomId 直播间ID
   * @param attributes 需要获取的属性列表
   */
  async getLiveRoomAttributes(accountWithLiveRoom, attributes = ["room_status", "online_user_count", "room_end_time"]) {
    try {
      const accountId = accountWithLiveRoom.accountId;
      const roomId = accountWithLiveRoom.liveRoom.room_id;
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!valid) {
        throw new Error(`Account ${accountId} is not valid`);
      }
      console.log(
        `[LiveRoomMetricService] Fetching attributes for room ${roomId} of account ${accountId}`
      );
      const requestData = {
        roomIds: [roomId],
        // 单个直播间也使用数组格式
        attributes
      };
      const response = await apiService.getLiveRoomsAttributes(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: account.organization_id,
        accountId
      });
      const { valid: afterValid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!afterValid) {
        throw new Error(`Account ${accountId} is not valid after request`);
      }
      return response.data && response.data[0] || null;
    } catch (error) {
      console.error("[LiveRoomMetricService] Error getting live room attributes:", error);
      return null;
    }
  }
}
const liveRoomMetricService = new LiveRoomMetricService();
class LiveRoomUserImageService {
  constructor() {
    console.log("[LiveRoomUserImageService] Initialized");
  }
  /**
   * 获取并推送直播间用户画像数据（年龄维度）到远程数据库
   * @param accountWithLiveRoom 账户和直播间信息
   * @param startTime 直播开始时间（时间戳，秒）
   * @param endTime 直播结束时间（时间戳，秒）
   */
  async fetchLiveRoomAgeUserImageAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    try {
      const validationResult = accountCredentialValidator.checkAccountValid(
        accountWithLiveRoom.accountId
      );
      if (!validationResult.valid) {
        return { success: false, message: "账户验证失败" };
      }
      const userImageData = await this.getLiveRoomUserImage(
        accountWithLiveRoom,
        startTime,
        endTime,
        UserImageDimension.AGE
      );
      if (!userImageData || userImageData.length === 0) {
        return { success: true, message: "没有新的年龄画像数据", count: 0 };
      }
      const pushResult = await this.pushUserImageDataToRemoteDB(
        userImageData,
        accountWithLiveRoom.liveRoom.unique_id,
        accountWithLiveRoom.liveRoom.room_id,
        "age",
        startTime,
        endTime
      );
      return pushResult;
    } catch (error) {
      console.error(
        "[LiveRoomUserImageService] Error in fetchLiveRoomAgeUserImageAndPushToRemoteDB:",
        error
      );
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 获取并推送直播间用户画像数据（地域维度）到远程数据库
   * @param accountWithLiveRoom 账户和直播间信息
   * @param startTime 直播开始时间（时间戳，秒）
   * @param endTime 直播结束时间（时间戳，秒）
   */
  async fetchLiveRoomRegionUserImageAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    try {
      const validationResult = accountCredentialValidator.checkAccountValid(
        accountWithLiveRoom.accountId
      );
      if (!validationResult.valid) {
        return { success: false, message: "账户验证失败" };
      }
      const userImageData = await this.getLiveRoomUserImage(
        accountWithLiveRoom,
        startTime,
        endTime,
        UserImageDimension.REGION
      );
      if (!userImageData || userImageData.length === 0) {
        return { success: true, message: "没有新的地域画像数据", count: 0 };
      }
      const pushResult = await this.pushUserImageDataToRemoteDB(
        userImageData,
        accountWithLiveRoom.liveRoom.unique_id,
        accountWithLiveRoom.liveRoom.room_id,
        "region",
        startTime,
        endTime
      );
      return pushResult;
    } catch (error) {
      console.error(
        "[LiveRoomUserImageService] Error in fetchLiveRoomRegionUserImageAndPushToRemoteDB:",
        error
      );
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 获取并推送直播间用户画像数据（性别维度）到远程数据库
   * @param accountWithLiveRoom 账户和直播间信息
   * @param startTime 直播开始时间（时间戳，秒）
   * @param endTime 直播结束时间（时间戳，秒）
   */
  async fetchLiveRoomGenderUserImageAndPushToRemoteDB(accountWithLiveRoom, startTime, endTime) {
    try {
      const userImageData = await this.getLiveRoomUserImage(
        accountWithLiveRoom,
        startTime,
        endTime,
        UserImageDimension.GENDER
      );
      if (!userImageData || userImageData.length === 0) {
        return { success: true, message: "没有新的性别画像数据", count: 0 };
      }
      const pushResult = await this.pushUserImageDataToRemoteDB(
        userImageData,
        accountWithLiveRoom.liveRoom.unique_id,
        accountWithLiveRoom.liveRoom.room_id,
        "gender",
        startTime,
        endTime
      );
      return pushResult;
    } catch (error) {
      console.error(
        "[LiveRoomUserImageService] Error in fetchLiveRoomGenderUserImageAndPushToRemoteDB:",
        error
      );
      return { success: false, message: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 获取单个直播间的用户画像
   * @param accountWithLiveRoom 账户和直播间信息
   * @param startTime 开始时间（时间戳，秒）
   * @param endTime 结束时间（时间戳，秒）
   * @param dims 维度类型（1-性别, 2-年龄, 3-地域等）
   */
  async getLiveRoomUserImage(accountWithLiveRoom, startTime, endTime, dims) {
    try {
      const { accountId, liveRoom, organizationId } = accountWithLiveRoom;
      const { account, valid } = accountCredentialValidator.checkAccountValid(accountId);
      if (!valid) {
        throw new Error(`Account ${accountId} is not valid`);
      }
      console.log(
        `[LiveRoomUserImageService] Fetching user image for room ${liveRoom.room_id} of account ${accountId}, dims: ${dims}`
      );
      const requestData = {
        startTime,
        endTime,
        roomIds: [liveRoom.room_id],
        // 单个直播间也使用数组格式
        dims
      };
      const response = await apiService.getLiveRoomsUserImage(requestData, {
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        groupId: organizationId,
        accountId
      });
      const afterValidationResult = accountCredentialValidator.checkAccountValid(accountId);
      if (!afterValidationResult.valid) {
        throw new Error(`Account ${accountId} is not valid after request`);
      }
      if (response.code !== 0) {
        console.error("[LiveRoomUserImageService] Failed to get user image:", response.msg);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error("[LiveRoomUserImageService] Error getting user image:", error);
      return null;
    }
  }
  /**
   * 推送用户画像数据到远程数据库
   * @param userImageData 用户画像数据
   * @param uniqueId 组织ID
   * @param roomId 直播间ID
   * @param group 分组类型（age/region/gender）
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async pushUserImageDataToRemoteDB(userImageData, uniqueId, roomId, group, startTime, endTime) {
    try {
      const records = userImageData.map((item) => ({
        unique_id: uniqueId,
        room_id: roomId,
        user_image_group: group,
        user_image_label: item.label,
        user_image_value: item.count,
        started_at: new Date(startTime * 1e3),
        ended_at: new Date(endTime * 1e3)
      }));
      await databaseService.insertBatchOnDuplicateKeyUpdate("sl_live_room_user_images", records, [
        "user_image_value",
        "started_at"
      ]);
      console.log(
        `[LiveRoomUserImageService] Successfully pushed ${records.length} user image records for room ${roomId}, group: ${group}`
      );
      return { success: true, message: "用户画像数据推送成功", count: records.length };
    } catch (error) {
      console.error(
        `[LiveRoomUserImageService] Error pushing user image data to remote DB for room ${roomId}, group: ${group}:`,
        error
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : "推送用户画像数据失败"
      };
    }
  }
}
const liveRoomUserImageService = new LiveRoomUserImageService();
class LiveRoomMonitorQueueService extends events.EventEmitter {
  /** 监听队列 - 使用 Map 存储，key 为 accountId:roomId */
  monitorQueue = /* @__PURE__ */ new Map();
  /** 轮询定时器 */
  timer = null;
  /** 轮询间隔（毫秒）- 默认30秒 */
  pollInterval = 60 * 1e3;
  /** 是否正在运行 */
  isRunning = false;
  /** 正在轮询中，防止并发轮询 */
  isPolling = false;
  /** 频率控制 - 每个账户的最后操作时间 */
  lastOperationTime = /* @__PURE__ */ new Map();
  // /** 频率控制间隔（毫秒）- 防止过度请求 */
  // private readonly RATE_LIMIT_INTERVAL = 1000 // 1秒
  // private readonly MAX_OPERATIONS_PER_MINUTE = 30 // 每分钟最多30次操作
  // private operationCount = new Map<number, { count: number; resetTime: number }>()
  constructor() {
    super();
    console.log("[LiveRoomMonitorQueueService] Initialized");
  }
  /**
   * 启动监听服务
   */
  start() {
    if (this.isRunning) {
      console.warn("[LiveRoomMonitorQueueService] Already running");
      return;
    }
    this.isRunning = true;
    console.log("[LiveRoomMonitorQueueService] Started");
    databaseService.initialize();
    this.poll();
    this.timer = setInterval(() => {
      this.poll();
    }, this.pollInterval);
    this.emit("started");
  }
  /**
   * 停止监听服务
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    databaseService.close();
    this.isRunning = false;
    console.log("[LiveRoomMonitorQueueService] Stopped");
    this.emit("stopped");
  }
  /**
   * 设置轮询间隔
   */
  setPollInterval(intervalSeconds) {
    this.pollInterval = intervalSeconds * 1e3;
    if (this.isRunning && this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.poll();
      }, this.pollInterval);
      console.log(`[LiveRoomMonitorQueueService] Poll interval updated to ${intervalSeconds}s`);
    }
  }
  /**
   * 添加直播间到监听队列
   */
  async addToMonitorQueue(request) {
    try {
      console.log(
        `[LiveRoomMonitorQueueService] Adding room ${request.roomId} for account ${request.accountId} to monitor queue`
      );
      const permissionCheck = await this.checkLiveRoomPermissions(
        request.accountId,
        request.roomId,
        "add"
      );
      if (!permissionCheck.allowed) {
        console.log(
          `[LiveRoomMonitorQueueService] Permission check failed for account ${request.accountId}-${request.roomId}: ${permissionCheck.message}`
        );
        return {
          success: false,
          message: permissionCheck.message || "权限验证失败"
        };
      }
      const account = accountCacheService.getById(request.accountId);
      console.log(
        `[LiveRoomMonitorQueueService] Account found: ${account.account_name} (${account.id})`
      );
      if (!account.is_valid) {
        console.log(
          `[LiveRoomMonitorQueueService] Account ${request.accountId} credentials are invalid`
        );
        return {
          success: false,
          message: "账户凭证已失效，请重新登录"
        };
      }
      console.log(
        `[LiveRoomMonitorQueueService] Fetching and validating live room data for account ${request.accountId}`
      );
      const liveRoomData = await liveRoomService.getLiveRoomsByAccountId(request.accountId);
      if (!liveRoomData) {
        console.error(
          `[LiveRoomMonitorQueueService] API returned null for account ${request.accountId}`
        );
        return {
          success: false,
          message: "API响应为空，无法验证直播间信息"
        };
      }
      if (!liveRoomData.success) {
        console.error(
          `[LiveRoomMonitorQueueService] API validation failed for account ${request.accountId}: ${liveRoomData.error}`
        );
        return {
          success: false,
          message: `API验证失败: ${liveRoomData.error || "未知错误"}`
        };
      }
      if (!liveRoomData.liveData || !liveRoomData.liveData.list) {
        console.error(
          `[LiveRoomMonitorQueueService] No live data returned for account ${request.accountId}`
        );
        return {
          success: false,
          message: "无法获取直播间数据"
        };
      }
      const targetRoom = liveRoomData.liveData.list.find((room) => room.room_id === request.roomId);
      if (!targetRoom) {
        console.log(
          `[LiveRoomMonitorQueueService] Room ${request.roomId} not found in account ${request.accountId} live rooms`
        );
        return {
          success: false,
          message: "直播间不存在或无权限访问"
        };
      }
      if (!targetRoom.user_id || !targetRoom.nickname || !targetRoom.room_id) {
        console.error(`[LiveRoomMonitorQueueService] Incomplete room data for ${request.roomId}`);
        return {
          success: false,
          message: "直播间数据不完整，无法添加到监听队列"
        };
      }
      const queueId = this.generateQueueId(request.accountId, request.roomId);
      if (this.monitorQueue.has(queueId)) {
        console.log(
          `[LiveRoomMonitorQueueService] Room ${request.roomId} already in monitor queue for account ${request.accountId}`
        );
        return {
          success: false,
          message: "该直播间已在监听队列中"
        };
      }
      const queueItem = {
        roomId: request.roomId,
        accountId: request.accountId,
        accountName: account.account_name,
        organizationId: account.organization_id,
        anchorNickname: targetRoom.nickname,
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        isActive: true,
        liveRoomInfo: targetRoom
        // 存储完整的直播间信息
      };
      this.monitorQueue.set(queueId, queueItem);
      console.log(
        `[LiveRoomMonitorQueueService] Successfully added room ${request.roomId} (${targetRoom.nickname}) to monitor queue`
      );
      this.emit("roomAdded", queueItem);
      return {
        success: true,
        message: "直播间已添加到监听队列",
        data: queueItem
      };
    } catch (error) {
      console.error("[LiveRoomMonitorQueueService] Failed to add room to monitor queue:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "添加失败"
      };
    }
  }
  /**
   * 从监听队列移除直播间
   */
  async removeFromMonitorQueue(request) {
    try {
      const permissionCheck = await this.checkLiveRoomPermissions(
        request.accountId,
        request.roomId,
        "remove"
      );
      if (!permissionCheck.allowed) {
        return {
          success: false,
          message: permissionCheck.message || "权限验证失败"
        };
      }
      const queueId = this.generateQueueId(request.accountId, request.roomId);
      const queueItem = this.monitorQueue.get(queueId);
      if (!queueItem) {
        return {
          success: false,
          message: "该直播间不在监听队列中"
        };
      }
      this.monitorQueue.delete(queueId);
      console.log(`[LiveRoomMonitorQueueService] Removed room ${request.roomId} from memory queue`);
      console.log(
        `[LiveRoomMonitorQueueService] Removed room ${request.roomId} for account ${request.accountId} from monitor queue`
      );
      this.emit("roomRemoved", queueItem);
      return {
        success: true,
        message: "直播间已从监听队列移除",
        data: queueItem
      };
    } catch (error) {
      console.error(
        "[LiveRoomMonitorQueueService] Failed to remove room from monitor queue:",
        error
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : "移除失败"
      };
    }
  }
  /**
   * 获取监听队列列表
   */
  getMonitorQueue() {
    return Array.from(this.monitorQueue.values());
  }
  /**
   * 获取指定账户的监听队列
   */
  getMonitorQueueByAccount(accountId) {
    return Array.from(this.monitorQueue.values()).filter((item) => item.accountId === accountId);
  }
  /**
   * 检查直播间是否在监听队列中
   */
  isInMonitorQueue(accountId, roomId) {
    const queueId = this.generateQueueId(accountId, roomId);
    return this.monitorQueue.has(queueId);
  }
  /**
   * 获取监听队列统计信息
   */
  getMonitorQueueStats() {
    const items = Array.from(this.monitorQueue.values());
    const byAccount = {};
    for (const item of items) {
      byAccount[item.accountId] = (byAccount[item.accountId] || 0) + 1;
    }
    return {
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      byAccount
    };
  }
  /**
   * 获取账户监听限制信息
   */
  // getAccountLimits(accountId: number): {
  //   currentRooms: number
  //   maxOperationsPerMinute: number
  //   currentOperations: number
  //   remainingOperations: number
  // } {
  //   const currentRooms = this.getMonitorQueueByAccount(accountId).length
  //   const operationData = this.operationCount.get(accountId)
  //   const currentOperations = operationData ? operationData.count : 0
  //   return {
  //     currentRooms,
  //     maxOperationsPerMinute: this.MAX_OPERATIONS_PER_MINUTE,
  //     currentOperations,
  //     remainingOperations: Math.max(0, this.MAX_OPERATIONS_PER_MINUTE - currentOperations)
  //   }
  // }
  /**
   * 清空指定账户的监听队列
   */
  async clearAccountQueue(request) {
    try {
      const permissionCheck = await this.checkLiveRoomPermissions(request.accountId, "", "remove");
      if (!permissionCheck.allowed) {
        return {
          success: false,
          message: permissionCheck.message || "权限验证失败"
        };
      }
      const accountItems = this.getMonitorQueueByAccount(request.accountId);
      if (accountItems.length === 0) {
        return {
          success: true,
          message: "该账户没有监听的直播间",
          data: []
        };
      }
      for (const item of accountItems) {
        const queueId = this.generateQueueId(item.accountId, item.roomId);
        this.monitorQueue.delete(queueId);
      }
      console.log(
        `[LiveRoomMonitorQueueService] Cleared ${accountItems.length} items from memory queue for account ${request.accountId}`
      );
      console.log(
        `[LiveRoomMonitorQueueService] Cleared ${accountItems.length} items for account ${request.accountId}`
      );
      return {
        success: true,
        message: `已清空账户监听队列，共移除 ${accountItems.length} 个直播间`,
        data: accountItems
      };
    } catch (error) {
      console.error("[LiveRoomMonitorQueueService] Failed to clear account queue:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "清空失败"
      };
    }
  }
  /**
   * 轮询监听队列中的直播间
   */
  async poll() {
    if (this.isPolling) {
      console.warn("[LiveRoomMonitorQueueService] Poll already in progress, skipping...");
      return;
    }
    this.isPolling = true;
    try {
      const activeItems = Array.from(this.monitorQueue.values()).filter((item) => item.isActive);
      if (activeItems.length === 0) {
        console.log("[LiveRoomMonitorQueueService] No active rooms to monitor");
        return;
      }
      console.log(`[LiveRoomMonitorQueueService] Polling ${activeItems.length} active rooms...`);
      const startTime = Date.now();
      const accountGroups = /* @__PURE__ */ new Map();
      for (const item of activeItems) {
        if (!accountGroups.has(item.accountId)) {
          accountGroups.set(item.accountId, []);
        }
        accountGroups.get(item.accountId).push(item);
      }
      const promises = Array.from(accountGroups.entries()).map(async ([accountId, items]) => {
        try {
          console.log(
            `[LiveRoomMonitorQueueService] Processing ${items.length} rooms for account ${accountId} using cached data`
          );
          const accountWithLiveRooms = items.map((item) => ({
            accountId: item.accountId,
            accountName: item.accountName,
            organizationId: item.organizationId,
            liveRoom: item.liveRoomInfo
            // 直接使用存储的直播间信息
          }));
          await this.fetchAndPushLiveRoomData(accountWithLiveRooms);
          console.log(
            `[LiveRoomMonitorQueueService] Successfully processed ${items.length} rooms for account ${accountId}`
          );
        } catch (error) {
          console.error(
            `[LiveRoomMonitorQueueService] Error processing account ${accountId}:`,
            error
          );
        }
      });
      await Promise.all(promises);
      const now = Date.now();
      for (const item of activeItems) {
        item.lastUpdated = now;
      }
      const duration = Date.now() - startTime;
      console.log(
        `[LiveRoomMonitorQueueService] Poll completed in ${duration}ms, processed ${activeItems.length} rooms`
      );
      this.emit("pollCompleted", { duration, roomCount: activeItems.length });
    } catch (error) {
      console.error("[LiveRoomMonitorQueueService] Poll error:", error);
      this.emit("pollError", error);
    } finally {
      this.isPolling = false;
    }
  }
  /**
   * 获取并推送直播间数据到远程数据库
   * 复用原有的数据推送逻辑
   */
  async fetchAndPushLiveRoomData(accountWithLiveRooms) {
    const promises = accountWithLiveRooms.map(async (accountWithLiveRoom) => {
      const liveRoom = accountWithLiveRoom.liveRoom;
      const now = Date.now();
      const attributes = await liveRoomMetricService.getLiveRoomAttributes(accountWithLiveRoom, [
        "room_status"
      ]);
      if (!attributes || attributes.room_status !== "2") {
        await this.removeFromMonitorQueue({
          accountId: accountWithLiveRoom.accountId,
          roomId: accountWithLiveRoom.liveRoom.room_id
        });
        new electron.Notification({
          title: "监听失败",
          body: `无法继续监听"${liveRoom.room_id}-${liveRoom.nickname}"，可能已停播，已从队列中移除`
        }).show();
        return;
      }
      if (!liveRoom.start_time) {
        liveRoom.start_time = liveRoom.metrics.live_st;
      } else {
        liveRoom.start_time = dayjs(now).subtract(3, "minutes").unix();
      }
      await Promise.allSettled([
        liveRoomFlowService.fetchLiveRoomAllFlowAndPushToRemoteDB(
          accountWithLiveRoom,
          dayjs.unix(liveRoom.metrics.live_st).subtract(24, "hour").unix(),
          ~~(now / 1e3)
        ),
        liveRoomFlowService.fetchLiveRoomOrganicFlowAndPushToRemoteDB(
          accountWithLiveRoom,
          dayjs.unix(liveRoom.metrics.live_st).subtract(24, "hour").unix(),
          ~~(now / 1e3)
        ),
        liveRoomMetricService.fetchLiveRoomMetricsAndPushToRemoteDB(
          accountWithLiveRoom,
          dayjs.unix(liveRoom.metrics.live_st).subtract(24, "hour").unix(),
          ~~(now / 1e3)
        ),
        liveRoomPerMinuteMetricService.fetchLiveRoomWatchCountPerMinuteMetricAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1e3)
        ),
        liveRoomPerMinuteMetricService.fetchLiveRoomAllPerMinuteMetricAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1e3)
        ),
        liveRoomCommentService.fetchLiveRoomCommentAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1e3)
        ),
        liveRoomUserImageService.fetchLiveRoomAgeUserImageAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1e3)
        ),
        liveRoomUserImageService.fetchLiveRoomGenderUserImageAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1e3)
        ),
        liveRoomUserImageService.fetchLiveRoomRegionUserImageAndPushToRemoteDB(
          accountWithLiveRoom,
          liveRoom.start_time,
          ~~(now / 1e3)
        )
      ]);
    });
    await Promise.allSettled(promises);
  }
  /**
   * 生成队列项ID
   */
  generateQueueId(accountId, roomId) {
    return `${accountId}:${roomId}`;
  }
  /**
   * 检查频率控制和权限
   */
  // private checkRateLimit(accountId: number): { allowed: boolean; message?: string } {
  //   const now = Date.now()
  //   // 1. 检查基本频率控制（1秒间隔）
  //   const lastTime = this.lastOperationTime.get(accountId)
  //   if (lastTime && now - lastTime < this.RATE_LIMIT_INTERVAL) {
  //     return { allowed: false, message: '操作过于频繁，请稍后再试' }
  //   }
  //   // 2. 检查每分钟操作次数限制
  //   const operationData = this.operationCount.get(accountId)
  //   if (operationData) {
  //     // 如果超过1分钟，重置计数
  //     if (now - operationData.resetTime > 60000) {
  //       this.operationCount.set(accountId, { count: 0, resetTime: now })
  //     } else if (operationData.count >= this.MAX_OPERATIONS_PER_MINUTE) {
  //       return { allowed: false, message: '每分钟操作次数超限，请稍后再试' }
  //     }
  //   }
  //   return { allowed: true }
  // }
  /**
   * 检查账户权限和限制
   */
  async checkLiveRoomPermissions(accountId, roomId, action) {
    try {
      let account = accountCacheService.getById(accountId);
      if (!account) {
        console.log(
          `[LiveRoomMonitorQueueService] Account ${accountId} not found in cache, refreshing cache...`
        );
        await accountCacheService.refresh();
        account = accountCacheService.getById(accountId);
        if (!account) {
          return { allowed: false, message: "账户不存在或已被删除" };
        } else {
          console.log(
            `[LiveRoomMonitorQueueService] Account ${accountId} found after cache refresh`
          );
        }
      }
      if (action === "add") {
        console.log(
          `[LiveRoomMonitorQueueService] Validating account ${accountId} credentials via API...`
        );
        const now = Date.now();
        const startTime = Math.floor(now / 1e3) - 3600;
        const endTime = Math.floor(now / 1e3);
        try {
          const requestData = {
            startTime,
            endTime,
            roomIds: [roomId],
            // 单个直播间也使用数组格式
            dims: 5
          };
          const response = await apiService.getLiveRoomFlowList(requestData, {
            cookie: account.cookie,
            csrfToken: account.csrf_token,
            groupId: account.organization_id,
            accountId
          });
          if (response.code !== 0) {
            return {
              allowed: false,
              message: `账户凭证验证失败：status=${response.code} message=${response.msg}`
            };
          }
          console.log(`[LiveRoomMonitorQueueService] Account ${accountId} cookie validation passed`);
        } catch (error) {
          console.error(
            `[LiveRoomMonitorQueueService] Account ${accountId} cookie validation error:`,
            error
          );
          return {
            allowed: false,
            message: "账户凭证验证失败：" + (error instanceof Error ? error.message : "未知错误")
          };
        }
      }
      return { allowed: true };
    } catch (error) {
      console.error("[LiveRoomMonitorQueueService] Error checking account permissions:", error);
      return { allowed: false, message: "权限验证失败" };
    }
  }
  /**
   * 更新频率控制时间和操作计数
   */
  // private updateRateLimit(accountId: number): void {
  //   const now = Date.now()
  //   this.lastOperationTime.set(accountId, now)
  //   // 更新操作计数
  //   const operationData = this.operationCount.get(accountId)
  //   if (operationData) {
  //     // 如果超过1分钟，重置计数
  //     if (now - operationData.resetTime > 60000) {
  //       this.operationCount.set(accountId, { count: 1, resetTime: now })
  //     } else {
  //       operationData.count++
  //     }
  //   } else {
  //     this.operationCount.set(accountId, { count: 1, resetTime: now })
  //   }
  // }
  /**
   * 获取运行状态
   */
  get running() {
    return this.isRunning;
  }
}
const liveRoomMonitorQueueService = new LiveRoomMonitorQueueService();
const CONFIG_CHANNELS = {
  /** 获取配置 */
  GET: "config:get",
  /** 保存配置 */
  SAVE: "config:save",
  /** 重置配置 */
  RESET: "config:reset",
  /** 获取配置文件路径 */
  GET_PATH: "config:getPath",
  /** 测试连接 */
  TEST_CONNECTION: "config:testConnection"
};
const DIALOG_CHANNELS = {
  /** 打开文件选择对话框 */
  OPEN_FILE: "dialog:openFile",
  /** 打开多文件选择对话框 */
  OPEN_FILES: "dialog:openFiles",
  /** 打开目录选择对话框 */
  OPEN_DIRECTORY: "dialog:openDirectory",
  /** 保存文件对话框 */
  SAVE_FILE: "dialog:saveFile",
  /** 显示消息框 */
  SHOW_MESSAGE: "dialog:showMessage"
};
const ACCOUNT_CHANNELS = {
  /** 添加账户 */
  ADD: "account:add",
  /** 删除账户 */
  DELETE: "account:delete",
  /** 获取账户列表 */
  LIST: "account:list",
  /** 更新账户 */
  UPDATE: "account:update",
  /** 打开登录窗口 */
  OPEN_LOGIN_WINDOW: "account:openLoginWindow",
  /** 重新验证账户凭证 */
  REVERIFY: "account:reverify",
  /** 验证账户凭证是否有效 */
  VALIDATE_CREDENTIALS: "account:validateCredentials"
};
const LOGGER_CHANNELS = {
  /** 获取所有日志 */
  GET_ALL: "logger:get-all",
  /** 清空日志 */
  CLEAR: "logger:clear",
  /** 新日志（事件） */
  NEW_LOG: "logger:new-log",
  /** 原始日志（事件） */
  RAW_LOG: "logger:raw-log"
};
const LIVE_ROOM_CHANNELS = {
  /** 获取所有直播间数据 */
  GET_ALL: "live-room:get-all",
  /** 获取指定账户的直播间数据 */
  GET_BY_ACCOUNT: "live-room:get-by-account",
  /** 刷新所有直播间数据 */
  REFRESH: "live-room:refresh",
  /** 刷新指定账户的直播间数据 */
  REFRESH_ACCOUNT: "live-room:refresh-account",
  /** 直播间数据更新（事件） */
  UPDATED: "live-room:updated",
  /** 获取统计信息 */
  GET_STATISTICS: "live-room:get-statistics",
  /** 获取直播间属性 */
  GET_ATTRIBUTES: "live-room:get-attributes",
  /** 获取直播间流量列表 */
  GET_FLOW_LIST: "live-room:get-flow-list",
  /** 获取直播间用户画像 */
  GET_USER_IMAGE: "live-room:get-user-image",
  /** 获取直播间评论 */
  GET_COMMENT: "live-room:get-comment"
};
const ACCOUNT_MONITOR_CHANNELS = {
  /** 启动监控 */
  START: "account-monitor:start",
  /** 停止监控 */
  STOP: "account-monitor:stop",
  /** 获取监控状态 */
  GET_STATUS: "account-monitor:get-status"
};
const MONITOR_QUEUE_CHANNELS = {
  /** 添加单个直播间到监听队列 */
  ADD: "monitor-queue:add",
  /** 批量添加直播间到监听队列 */
  BATCH_ADD: "monitor-queue:batch-add",
  /** 从监听队列移除单个直播间 */
  REMOVE: "monitor-queue:remove",
  /** 批量从监听队列移除直播间 */
  BATCH_REMOVE: "monitor-queue:batch-remove",
  /** 获取监听队列列表 */
  LIST: "monitor-queue:list",
  /** 根据账户ID获取监听队列 */
  GET_BY_ACCOUNT: "monitor-queue:get-by-account",
  /** 获取监听队列统计 */
  GET_STATS: "monitor-queue:get-stats",
  /** 清空监听队列 */
  CLEAR: "monitor-queue:clear",
  /** 启动监听队列服务 */
  START: "monitor-queue:start",
  /** 停止监听队列服务 */
  STOP: "monitor-queue:stop",
  /** 获取监听队列服务状态 */
  GET_STATUS: "monitor-queue:get-status",
  /** 设置监听队列轮询间隔 */
  SET_INTERVAL: "monitor-queue:set-interval"
};
const IPC_CHANNELS = {
  ...CONFIG_CHANNELS,
  ...DIALOG_CHANNELS,
  ...LOGGER_CHANNELS,
  ...LIVE_ROOM_CHANNELS,
  ...ACCOUNT_MONITOR_CHANNELS,
  ...MONITOR_QUEUE_CHANNELS,
  ...ACCOUNT_CHANNELS
};
function registerIPCHandlers() {
  registerConfigHandlers();
  registerDialogHandlers();
  registerAccountHandlers();
  registerLoggerHandlers();
  registerLiveRoomHandlers();
  registerAccountMonitorHandlers();
  registerMonitorQueueHandlers();
}
function registerConfigHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.GET, () => {
    return configManager.getConfig();
  });
  electron.ipcMain.handle(IPC_CHANNELS.SAVE, (_, config) => {
    const oldConfig = configManager.getConfig();
    const networkDebugChanged = oldConfig.debug?.enableNetworkDebug !== config.debug?.enableNetworkDebug;
    const sqlDebugChanged = oldConfig.debug?.enableSqlDebug !== config.debug?.enableSqlDebug;
    configManager.saveConfig(config);
    if (networkDebugChanged) {
      apiService.setDebugEnabled(config.debug?.enableNetworkDebug || false);
    }
    if (sqlDebugChanged) {
      databaseService.setDebugEnabled(config.debug?.enableSqlDebug || false);
    }
    return { success: true };
  });
  electron.ipcMain.handle(IPC_CHANNELS.RESET, () => {
    return configManager.resetConfig();
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_PATH, () => {
    return configManager.getConfigPath();
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.TEST_CONNECTION,
    async (_, config) => {
      return await connectionTestService.testConnection(config);
    }
  );
}
function registerDialogHandlers() {
  electron.ipcMain.handle(
    IPC_CHANNELS.OPEN_FILE,
    async (_, options) => {
      const result = await electron.dialog.showOpenDialog({
        properties: ["openFile"],
        // 如果没有指定 filters，默认允许所有文件
        filters: options?.filters || [{ name: "All Files", extensions: ["*"] }],
        defaultPath: options?.defaultPath || path.join(os__namespace.homedir(), ".ssh"),
        title: options?.title,
        buttonLabel: options?.buttonLabel
      });
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.OPEN_FILES,
    async (_, options) => {
      const result = await electron.dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        ...options
      });
      return result.canceled ? [] : result.filePaths;
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.OPEN_DIRECTORY,
    async (_, options) => {
      const result = await electron.dialog.showOpenDialog({
        properties: ["openDirectory"],
        ...options
      });
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.SAVE_FILE,
    async (_, options) => {
      const result = await electron.dialog.showSaveDialog({
        defaultPath: "config.json",
        filters: [
          { name: "JSON", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] }
        ],
        ...options
      });
      return result.canceled ? null : result.filePath || null;
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.SHOW_MESSAGE,
    async (event, options) => {
      const window = electron.BrowserWindow.fromWebContents(event.sender);
      if (!window) return;
      const typeMap = {
        info: "info",
        error: "error",
        warning: "warning",
        success: "info"
        // Electron 没有 success 类型，使用 info
      };
      const result = await electron.dialog.showMessageBox(window, {
        type: typeMap[options.type],
        title: options.title || "提示",
        message: options.message,
        detail: options.detail,
        buttons: options.buttons || ["确定"],
        defaultId: options.defaultId,
        cancelId: options.cancelId
      });
      if (options.buttons && options.buttons.length > 1) {
        return { response: result.response };
      }
    }
  );
}
function registerAccountHandlers() {
  electron.ipcMain.handle(
    IPC_CHANNELS.OPEN_LOGIN_WINDOW,
    async (event, request) => {
      try {
        const mainWindow = electron.BrowserWindow.fromWebContents(event.sender);
        if (!mainWindow) {
          throw new Error("无法获取主窗口");
        }
        const result = await loginWindowService.openLoginWindow(request, mainWindow);
        return result;
      } catch (error) {
        console.error("打开登录窗口失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "打开登录窗口失败"
        };
      }
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.ADD,
    async (_, request) => {
      try {
        const account = await accountCacheService.add({
          accountName: request.accountName,
          username: request.username,
          password: request.password,
          organizationId: request.organizationId,
          cookie: request.cookie,
          csrfToken: request.csrfToken,
          remark: request.remark
        });
        return {
          success: true,
          id: account.id,
          account: {
            id: account.id,
            accountName: account.account_name,
            username: account.username,
            password: account.password,
            organizationId: account.organization_id,
            cookie: account.cookie,
            csrfToken: account.csrf_token,
            remark: account.remark || void 0,
            isValid: account.is_valid === 1,
            createdAt: account.created_at,
            updatedAt: account.updated_at
          }
        };
      } catch (error) {
        console.error("添加账户失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "添加账户失败"
        };
      }
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.LIST, async () => {
    try {
      const accounts = accountCacheService.getAll();
      return accounts.map((account) => ({
        id: account.id,
        accountName: account.account_name,
        username: account.username,
        password: account.password,
        organizationId: account.organization_id,
        cookie: account.cookie,
        csrfToken: account.csrf_token,
        remark: account.remark || void 0,
        isValid: account.is_valid === 1,
        createdAt: account.created_at,
        updatedAt: account.updated_at
      }));
    } catch (error) {
      console.error("获取账户列表失败:", error);
      return [];
    }
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.DELETE,
    async (_, { id }) => {
      try {
        await accountCacheService.delete(id);
        return { success: true };
      } catch (error) {
        console.error("删除账户失败:", error);
        return { success: false };
      }
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.UPDATE,
    async (_, account) => {
      try {
        await accountCacheService.update(account.id, {
          accountName: account.accountName,
          username: account.username,
          password: account.password,
          organizationId: account.organizationId,
          cookie: account.cookie,
          csrfToken: account.csrfToken,
          remark: account.remark
        });
        return { success: true };
      } catch (error) {
        console.error("更新账户失败:", error);
        return { success: false };
      }
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.REVERIFY,
    async (event, request) => {
      try {
        const mainWindow = electron.BrowserWindow.fromWebContents(event.sender);
        if (!mainWindow) {
          throw new Error("无法获取主窗口");
        }
        const result = await loginWindowService.openLoginWindow(request, mainWindow);
        if (result.success && result.cookie) {
          const csrfMatch = result.cookie.match(/csrftoken=([^;]+)/);
          const csrfToken = csrfMatch ? csrfMatch[1] : "";
          if (!csrfToken) {
            console.error("无法从 Cookie 中提取 csrftoken");
            return {
              success: false,
              error: "无法获取 CSRF Token"
            };
          }
          await accountCacheService.updateCredentials(request.accountId, result.cookie, csrfToken);
          console.log(`账户 ${request.accountId} 凭证已更新并设置为有效状态`);
        }
        return result;
      } catch (error) {
        console.error("重新验证账户失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "重新验证失败"
        };
      }
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.VALIDATE_CREDENTIALS,
    async (_, { accountId }) => {
      try {
        console.log(`[IPC] 验证账户 ${accountId} 的凭证...`);
        const result = await liveRoomService.getLiveRoomsByAccountId(accountId);
        if (!result) {
          console.error(`[IPC] 账户 ${accountId} 不存在`);
          return {
            success: false,
            isValid: false,
            error: "账户不存在"
          };
        }
        console.log(
          `[IPC] 账户 ${accountId} 凭证验证结果: ${result.success ? "VALID" : "INVALID"}${result.error ? ` - ${result.error}` : ""}`
        );
        return {
          success: true,
          isValid: result.success,
          error: result.success ? void 0 : result.error
        };
      } catch (error) {
        console.error(`[IPC] 验证账户 ${accountId} 凭证失败:`, error);
        return {
          success: false,
          isValid: false,
          error: error instanceof Error ? error.message : "验证失败"
        };
      }
    }
  );
}
function registerLoggerHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.GET_ALL, () => {
    return loggerService.getAllLogs();
  });
  electron.ipcMain.handle(IPC_CHANNELS.CLEAR, () => {
    loggerService.clearLogs();
    return { success: true };
  });
}
function registerLiveRoomHandlers() {
  try {
    electron.ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_BY_ACCOUNT);
    electron.ipcMain.removeHandler(LIVE_ROOM_CHANNELS.REFRESH_ACCOUNT);
    electron.ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_ATTRIBUTES);
    electron.ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_FLOW_LIST);
    electron.ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_USER_IMAGE);
    electron.ipcMain.removeHandler(LIVE_ROOM_CHANNELS.GET_COMMENT);
  } catch {
  }
  electron.ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_BY_ACCOUNT,
    async (_, { accountId }) => {
      return await liveRoomService.getLiveRoomsByAccountId(accountId);
    }
  );
  electron.ipcMain.handle(
    LIVE_ROOM_CHANNELS.REFRESH_ACCOUNT,
    async (_, { accountId }) => {
      return await liveRoomService.getLiveRoomsByAccountId(accountId);
    }
  );
  electron.ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_ATTRIBUTES,
    async (_, {
      accountId,
      roomIds,
      attributes
    }) => {
      return await liveRoomService.getLiveRoomsAttributes(accountId, roomIds, attributes);
    }
  );
  electron.ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_FLOW_LIST,
    async (_, {
      accountId,
      roomIds,
      startTime,
      endTime,
      dims
    }) => {
      return await liveRoomService.getLiveRoomFlowList(accountId, roomIds, startTime, endTime, dims);
    }
  );
  electron.ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_USER_IMAGE,
    async (_, {
      accountId,
      roomIds,
      startTime,
      endTime,
      dims
    }) => {
      return await liveRoomService.getLiveRoomsUserImage(
        accountId,
        roomIds,
        startTime,
        endTime,
        dims
      );
    }
  );
  electron.ipcMain.handle(
    LIVE_ROOM_CHANNELS.GET_COMMENT,
    async (_, {
      accountId,
      roomIds,
      startTime,
      endTime
    }) => {
      return await liveRoomService.getLiveRoomsComment(accountId, roomIds, startTime, endTime);
    }
  );
}
function registerAccountMonitorHandlers() {
  electron.ipcMain.removeHandler(ACCOUNT_MONITOR_CHANNELS.START);
  electron.ipcMain.removeHandler(ACCOUNT_MONITOR_CHANNELS.STOP);
  electron.ipcMain.removeHandler(ACCOUNT_MONITOR_CHANNELS.GET_STATUS);
  electron.ipcMain.handle(
    ACCOUNT_MONITOR_CHANNELS.START,
    async () => {
      try {
        accountMonitorService.start();
        return { success: true };
      } catch (error) {
        console.error("[IPC] Failed to start account monitor service:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "启动失败"
        };
      }
    }
  );
  electron.ipcMain.handle(
    ACCOUNT_MONITOR_CHANNELS.STOP,
    async () => {
      try {
        accountMonitorService.stop();
        return { success: true };
      } catch (error) {
        console.error("[IPC] Failed to stop account monitor service:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "停止失败"
        };
      }
    }
  );
  electron.ipcMain.handle(ACCOUNT_MONITOR_CHANNELS.GET_STATUS, async () => {
    return { isRunning: accountMonitorService.running };
  });
}
function registerMonitorQueueHandlers() {
  const monitorQueueChannels = [
    "monitor-queue:add",
    "monitor-queue:batch-add",
    "monitor-queue:remove",
    "monitor-queue:batch-remove",
    "monitor-queue:list",
    "monitor-queue:get-by-account",
    "monitor-queue:get-stats",
    "monitor-queue:clear",
    "monitor-queue:start",
    "monitor-queue:stop",
    "monitor-queue:set-interval"
  ];
  monitorQueueChannels.forEach((channel) => {
    electron.ipcMain.removeHandler(channel);
  });
  electron.ipcMain.handle(
    "monitor-queue:add",
    async (_, request) => {
      try {
        const result = await liveRoomMonitorQueueService.addToMonitorQueue(request);
        return result;
      } catch (error) {
        console.error("[IPC] Failed to add room to monitor queue:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "添加监听失败"
        };
      }
    }
  );
  electron.ipcMain.handle(
    "monitor-queue:remove",
    async (_, request) => {
      try {
        const result = await liveRoomMonitorQueueService.removeFromMonitorQueue(request);
        return result;
      } catch (error) {
        console.error("[IPC] Failed to remove room from monitor queue:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "移除监听失败"
        };
      }
    }
  );
  electron.ipcMain.handle("monitor-queue:list", async () => {
    try {
      return liveRoomMonitorQueueService.getMonitorQueue();
    } catch (error) {
      console.error("[IPC] Failed to get monitor queue list:", error);
      return [];
    }
  });
  electron.ipcMain.handle(
    "monitor-queue:get-by-account",
    async (_, request) => {
      try {
        return liveRoomMonitorQueueService.getMonitorQueueByAccount(request.accountId);
      } catch (error) {
        console.error("[IPC] Failed to get monitor queue by account:", error);
        return [];
      }
    }
  );
  electron.ipcMain.handle("monitor-queue:get-stats", async () => {
    try {
      const stats = liveRoomMonitorQueueService.getMonitorQueueStats();
      return {
        total: stats.total,
        active: stats.active,
        paused: stats.total - stats.active,
        byAccount: Object.entries(stats.byAccount).map(([accountId, count]) => ({
          accountId: parseInt(accountId),
          accountName: "",
          // 需要从accountCacheService获取
          count
        }))
      };
    } catch (error) {
      console.error("[IPC] Failed to get monitor queue stats:", error);
      return {
        total: 0,
        active: 0,
        paused: 0,
        byAccount: []
      };
    }
  });
  electron.ipcMain.handle("monitor-queue:clear", async () => {
    try {
      return {
        success: true,
        message: "监听队列已清空"
      };
    } catch (error) {
      console.error("[IPC] Failed to clear monitor queue:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "清空监听队列失败"
      };
    }
  });
  electron.ipcMain.handle("monitor-queue:start", async () => {
    try {
      liveRoomMonitorQueueService.start();
      return { success: true };
    } catch (error) {
      console.error("[IPC] Failed to start monitor queue service:", error);
      return { success: false };
    }
  });
  electron.ipcMain.handle("monitor-queue:stop", async () => {
    try {
      liveRoomMonitorQueueService.stop();
      return { success: true };
    } catch (error) {
      console.error("[IPC] Failed to stop monitor queue service:", error);
      return { success: false };
    }
  });
  electron.ipcMain.handle("monitor-queue:get-status", async () => {
    try {
      const isRunning = liveRoomMonitorQueueService.running;
      return { isRunning };
    } catch (error) {
      console.error("[IPC] Failed to get monitor queue status:", error);
      return { isRunning: false };
    }
  });
  electron.ipcMain.handle(
    "monitor-queue:set-interval",
    async (_, request) => {
      try {
        liveRoomMonitorQueueService.setPollInterval(request.interval);
        return { success: true };
      } catch (error) {
        console.error("[IPC] Failed to set monitor queue interval:", error);
        return { success: false };
      }
    }
  );
}
var WindowType = /* @__PURE__ */ ((WindowType2) => {
  WindowType2["MAIN"] = "main";
  WindowType2["SETTINGS"] = "settings";
  WindowType2["ABOUT"] = "about";
  WindowType2["FLOATING"] = "floating";
  WindowType2["LOG_VIEWER"] = "log-viewer";
  WindowType2["CUSTOM"] = "custom";
  return WindowType2;
})(WindowType || {});
var WindowState = /* @__PURE__ */ ((WindowState2) => {
  WindowState2["CREATING"] = "creating";
  WindowState2["READY"] = "ready";
  WindowState2["MINIMIZED"] = "minimized";
  WindowState2["MAXIMIZED"] = "maximized";
  WindowState2["FULLSCREEN"] = "fullscreen";
  WindowState2["CLOSING"] = "closing";
  WindowState2["CLOSED"] = "closed";
  return WindowState2;
})(WindowState || {});
var WindowEvent = /* @__PURE__ */ ((WindowEvent2) => {
  WindowEvent2["CREATED"] = "window:created";
  WindowEvent2["READY"] = "window:ready";
  WindowEvent2["SHOW"] = "window:show";
  WindowEvent2["HIDE"] = "window:hide";
  WindowEvent2["MINIMIZE"] = "window:minimize";
  WindowEvent2["MAXIMIZE"] = "window:maximize";
  WindowEvent2["RESTORE"] = "window:restore";
  WindowEvent2["CLOSE"] = "window:close";
  WindowEvent2["FOCUS"] = "window:focus";
  WindowEvent2["BLUR"] = "window:blur";
  return WindowEvent2;
})(WindowEvent || {});
class WindowManager extends events.EventEmitter {
  /** 窗口实例映射表 */
  windows = /* @__PURE__ */ new Map();
  /** 窗口计数器（用于生成唯一 ID） */
  windowCounter = 0;
  /** 管理器配置 */
  options;
  /** 是否已初始化 */
  initialized = false;
  constructor(options = {}) {
    super();
    this.options = {
      enableDevTools: utils.is.dev,
      autoManageLifecycle: true,
      ...options
    };
  }
  /**
   * 初始化管理器
   */
  async initialize() {
    if (this.initialized) {
      console.warn("[WindowManager] Already initialized");
      return;
    }
    if (this.options.autoManageLifecycle) {
      electron.app.on("before-quit", () => {
        console.log("[WindowManager] App is closing, destroying all windows...");
        this.destroyAll();
      });
    }
    this.initialized = true;
    console.log("[WindowManager] Initialized");
  }
  /**
   * 创建窗口
   */
  async create(options) {
    if (options.singleton) {
      const existing = this.findByType(options.type);
      if (existing) {
        existing.window.focus();
        return existing;
      }
    }
    const id = options.id || this.generateId(options.type);
    const windowOptions = {
      ...this.options.defaultOptions,
      ...options,
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        sandbox: false,
        contextIsolation: true,
        ...options.webPreferences
      }
    };
    const browserWindow = new electron.BrowserWindow(windowOptions);
    const windowInstance = {
      id,
      type: options.type,
      window: browserWindow,
      state: WindowState.CREATING,
      createdAt: Date.now(),
      options,
      data: options.data
    };
    this.windows.set(id, windowInstance);
    this.bindWindowEvents(windowInstance);
    await this.loadContent(windowInstance);
    this.emit(WindowEvent.CREATED, windowInstance);
    if (options.showImmediately) {
      console.log("[WindowManager] showImmediately is true, waiting for ready-to-show...");
      if (windowInstance.state === WindowState.READY) {
        console.log("[WindowManager] Window already ready, showing immediately");
        browserWindow.show();
      } else {
        console.log("[WindowManager] Waiting for ready-to-show event");
        browserWindow.once("ready-to-show", () => {
          console.log("[WindowManager] ready-to-show received, showing window");
          browserWindow.show();
        });
      }
    }
    return windowInstance;
  }
  /**
   * 绑定窗口事件
   */
  bindWindowEvents(instance) {
    const { window, id } = instance;
    console.log("[WindowManager] Binding events for window:", id);
    window.on("ready-to-show", () => {
      console.log("[WindowManager] ready-to-show event for window:", id);
      instance.state = WindowState.READY;
      this.emit(WindowEvent.READY, instance);
    });
    window.on("show", () => {
      this.emit(WindowEvent.SHOW, instance);
    });
    window.on("hide", () => {
      this.emit(WindowEvent.HIDE, instance);
    });
    window.on("minimize", () => {
      instance.state = WindowState.MINIMIZED;
      this.emit(WindowEvent.MINIMIZE, instance);
    });
    window.on("maximize", () => {
      instance.state = WindowState.MAXIMIZED;
      this.emit(WindowEvent.MAXIMIZE, instance);
    });
    window.on("unmaximize", () => {
      instance.state = WindowState.READY;
      this.emit(WindowEvent.RESTORE, instance);
    });
    window.on("close", (event) => {
      console.log("[WindowManager] close event for window:", id, "type:", instance.type);
      if (instance.type === WindowType.MAIN) {
        event.preventDefault();
        console.log("[WindowManager] Main window close prevented, hiding instead");
        window.hide();
        return;
      }
      this.emit(WindowEvent.CLOSE, instance, event);
    });
    window.on("closed", () => {
      console.log("[WindowManager] closed event for window:", id);
      instance.state = WindowState.CLOSED;
      if (instance.options.closeAndDelete || instance.type !== WindowType.MAIN) {
        this.windows.delete(id);
      }
    });
    window.on("focus", () => {
      this.emit(WindowEvent.FOCUS, instance);
    });
    window.on("blur", () => {
      this.emit(WindowEvent.BLUR, instance);
    });
    if (this.options.enableDevTools) {
      window.webContents.openDevTools();
    }
  }
  /**
   * 加载窗口内容
   */
  async loadContent(instance) {
    const { window, options } = instance;
    console.log("[WindowManager] Loading content for window:", instance.id);
    console.log("[WindowManager] URL option:", options.url);
    console.log("[WindowManager] HTML file option:", options.htmlFile);
    if (options.url) {
      console.log("[WindowManager] Loading URL:", options.url);
      await window.loadURL(options.url);
      console.log("[WindowManager] URL loaded successfully");
    } else if (options.htmlFile) {
      console.log("[WindowManager] Loading HTML file:", options.htmlFile);
      await window.loadFile(options.htmlFile);
      console.log("[WindowManager] HTML file loaded successfully");
    } else if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      console.log("[WindowManager] Loading dev URL:", process.env["ELECTRON_RENDERER_URL"]);
      await window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
      console.log("[WindowManager] Dev URL loaded successfully");
    } else {
      const defaultPath = path.join(__dirname, "../renderer/index.html");
      console.log("[WindowManager] Loading default HTML file:", defaultPath);
      await window.loadFile(defaultPath);
      console.log("[WindowManager] Default HTML file loaded successfully");
    }
  }
  /**
   * 获取窗口实例
   */
  get(id) {
    return this.windows.get(id);
  }
  /**
   * 根据类型查找窗口
   */
  findByType(type) {
    return Array.from(this.windows.values()).find((w) => w.type === type);
  }
  /**
   * 查询窗口
   */
  find(query) {
    return Array.from(this.windows.values()).filter((window) => {
      if (query.id && window.id !== query.id) return false;
      if (query.type && window.type !== query.type) return false;
      if (query.state && window.state !== query.state) return false;
      return true;
    });
  }
  /**
   * 获取所有窗口
   */
  getAll() {
    return Array.from(this.windows.values());
  }
  /**
   * 销毁窗口
   */
  destroy(id) {
    const instance = this.windows.get(id);
    if (!instance) {
      return false;
    }
    instance.state = WindowState.CLOSING;
    instance.window.destroy();
    this.windows.delete(id);
    return true;
  }
  /**
   * 销毁所有窗口
   */
  destroyAll() {
    Array.from(this.windows.keys()).forEach((id) => {
      this.destroy(id);
    });
  }
  /**
   * 显示窗口
   */
  show(id) {
    const instance = this.windows.get(id);
    if (!instance) return false;
    instance.window.show();
    return true;
  }
  /**
   * 隐藏窗口
   */
  hide(id) {
    const instance = this.windows.get(id);
    if (!instance) return false;
    instance.window.hide();
    return true;
  }
  /**
   * 聚焦窗口
   */
  focus(id) {
    const instance = this.windows.get(id);
    if (!instance) return false;
    instance.window.focus();
    return true;
  }
  /**
   * 最小化窗口
   */
  minimize(id) {
    const instance = this.windows.get(id);
    if (!instance) return false;
    instance.window.minimize();
    return true;
  }
  /**
   * 最大化窗口
   */
  maximize(id) {
    const instance = this.windows.get(id);
    if (!instance) return false;
    if (instance.window.isMaximized()) {
      instance.window.unmaximize();
    } else {
      instance.window.maximize();
    }
    return true;
  }
  /**
   * 向窗口发送消息
   */
  sendMessage(id, channel, ...args) {
    const instance = this.windows.get(id);
    if (!instance) return false;
    instance.window.webContents.send(channel, ...args);
    return true;
  }
  /**
   * 广播消息到所有窗口
   */
  broadcast(channel, ...args) {
    this.windows.forEach((instance) => {
      instance.window.webContents.send(channel, ...args);
    });
  }
  /**
   * 注册窗口事件监听器
   */
  on(event, callback) {
    return super.on(event, callback);
  }
  /**
   * 移除窗口事件监听器
   */
  off(event, callback) {
    return super.off(event, callback);
  }
  /**
   * 生成窗口 ID
   */
  generateId(type) {
    return `${type}-${++this.windowCounter}-${Date.now()}`;
  }
  /**
   * 获取窗口数量
   */
  get count() {
    return this.windows.size;
  }
  /**
   * 检查是否有窗口
   */
  get hasWindows() {
    return this.windows.size > 0;
  }
  /**
   * 清理资源
   */
  dispose() {
    this.destroyAll();
    this.removeAllListeners();
    this.initialized = false;
  }
}
const windowManager = new WindowManager();
var ThreadType = /* @__PURE__ */ ((ThreadType2) => {
  ThreadType2["DATA_PROCESSOR"] = "data-processor";
  ThreadType2["FILE_PROCESSOR"] = "file-processor";
  ThreadType2["NETWORK_WORKER"] = "network-worker";
  ThreadType2["SSH_WORKER"] = "ssh-worker";
  ThreadType2["ACCOUNT_MONITOR"] = "account-monitor";
  ThreadType2["CUSTOM"] = "custom";
  return ThreadType2;
})(ThreadType || {});
var ThreadState = /* @__PURE__ */ ((ThreadState2) => {
  ThreadState2["INITIALIZING"] = "initializing";
  ThreadState2["RUNNING"] = "running";
  ThreadState2["PAUSED"] = "paused";
  ThreadState2["STOPPING"] = "stopping";
  ThreadState2["STOPPED"] = "stopped";
  ThreadState2["ERROR"] = "error";
  return ThreadState2;
})(ThreadState || {});
var ThreadPriority = /* @__PURE__ */ ((ThreadPriority2) => {
  ThreadPriority2["LOW"] = "low";
  ThreadPriority2["NORMAL"] = "normal";
  ThreadPriority2["HIGH"] = "high";
  ThreadPriority2["CRITICAL"] = "critical";
  return ThreadPriority2;
})(ThreadPriority || {});
var ThreadEvent = /* @__PURE__ */ ((ThreadEvent2) => {
  ThreadEvent2["CREATED"] = "thread:created";
  ThreadEvent2["STARTED"] = "thread:started";
  ThreadEvent2["MESSAGE"] = "thread:message";
  ThreadEvent2["ERROR"] = "thread:error";
  ThreadEvent2["STOPPED"] = "thread:stopped";
  ThreadEvent2["RESTARTED"] = "thread:restarted";
  return ThreadEvent2;
})(ThreadEvent || {});
class ThreadManager extends events.EventEmitter {
  /** 线程实例映射表 */
  threads = /* @__PURE__ */ new Map();
  /** 线程计数器（用于生成唯一 ID） */
  threadCounter = 0;
  /** 管理器配置 */
  options;
  /** 是否已初始化 */
  initialized = false;
  constructor(options = {}) {
    super();
    this.options = {
      maxThreads: 10,
      defaultPriority: ThreadPriority.NORMAL,
      autoCleanup: true,
      enableLogging: true,
      ...options
    };
  }
  /**
   * 初始化管理器
   */
  async initialize() {
    if (this.initialized) {
      console.warn("[ThreadManager] Already initialized");
      return;
    }
    electron.app.on("before-quit", () => {
      this.stopAll();
    });
    this.initialized = true;
    this.log("Initialized");
  }
  /**
   * 创建并启动线程
   */
  async create(options) {
    if (this.threads.size >= this.options.maxThreads) {
      throw new Error(`Maximum thread limit (${this.options.maxThreads}) reached`);
    }
    const id = options.id || this.generateId(options.type);
    if (this.threads.has(id)) {
      throw new Error(`Thread with id '${id}' already exists`);
    }
    const process2 = electron.utilityProcess.fork(options.modulePath, options.args, {
      env: options.env,
      stdio: "pipe"
    });
    const instance = {
      id,
      type: options.type,
      process: process2,
      state: ThreadState.INITIALIZING,
      createdAt: Date.now(),
      restartCount: 0,
      options: {
        priority: this.options.defaultPriority,
        autoRestart: false,
        maxRestarts: 3,
        ...options
      },
      data: options.data
    };
    this.threads.set(id, instance);
    this.bindThreadEvents(instance);
    instance.state = ThreadState.RUNNING;
    instance.startedAt = Date.now();
    this.emit(ThreadEvent.CREATED, instance);
    this.emit(ThreadEvent.STARTED, instance);
    this.log(`Thread '${id}' created and started`);
    return instance;
  }
  /**
   * 绑定线程事件
   */
  bindThreadEvents(instance) {
    const { process: process2, id } = instance;
    process2.on("message", (message) => {
      const threadMessage = {
        type: "message",
        data: message,
        timestamp: Date.now()
      };
      this.emit(ThreadEvent.MESSAGE, instance, threadMessage);
    });
    if (process2.stdout) {
      process2.stdout.on("data", (data) => {
        const message = {
          type: "stdout",
          data: data.toString(),
          timestamp: Date.now()
        };
        this.emit(ThreadEvent.MESSAGE, instance, message);
      });
    }
    if (process2.stderr) {
      process2.stderr.on("data", (data) => {
        const message = {
          type: "stderr",
          data: data.toString(),
          timestamp: Date.now()
        };
        this.emit(ThreadEvent.MESSAGE, instance, message);
        this.log(`Thread '${id}' stderr: ${data.toString()}`, "error");
      });
    }
    process2.on("exit", (code) => {
      this.log(`Thread '${id}' exited with code ${code}`);
      if (instance.state !== ThreadState.STOPPING) {
        instance.state = ThreadState.ERROR;
        instance.stoppedAt = Date.now();
        if (instance.options.autoRestart && instance.restartCount < instance.options.maxRestarts) {
          this.restart(id);
        } else {
          this.emit(ThreadEvent.STOPPED, instance);
        }
      } else {
        instance.state = ThreadState.STOPPED;
        instance.stoppedAt = Date.now();
        this.emit(ThreadEvent.STOPPED, instance);
      }
      if (this.options.autoCleanup) {
        setTimeout(() => {
          if (instance.state === ThreadState.STOPPED) {
            this.threads.delete(id);
          }
        }, 5e3);
      }
    });
  }
  /**
   * 获取线程实例
   */
  get(id) {
    return this.threads.get(id);
  }
  /**
   * 根据类型查找线程
   */
  findByType(type) {
    return Array.from(this.threads.values()).filter((t) => t.type === type);
  }
  /**
   * 查询线程
   */
  find(query) {
    return Array.from(this.threads.values()).filter((thread) => {
      if (query.id && thread.id !== query.id) return false;
      if (query.type && thread.type !== query.type) return false;
      if (query.state && thread.state !== query.state) return false;
      if (query.priority && thread.options.priority !== query.priority) return false;
      return true;
    });
  }
  /**
   * 获取所有线程
   */
  getAll() {
    return Array.from(this.threads.values());
  }
  /**
   * 停止线程
   */
  stop(id) {
    const instance = this.threads.get(id);
    if (!instance) {
      return false;
    }
    if (instance.state === ThreadState.STOPPED || instance.state === ThreadState.STOPPING) {
      return false;
    }
    instance.state = ThreadState.STOPPING;
    instance.process.kill();
    this.log(`Thread '${id}' stopping`);
    return true;
  }
  /**
   * 停止所有线程
   */
  stopAll() {
    Array.from(this.threads.keys()).forEach((id) => {
      this.stop(id);
    });
  }
  /**
   * 重启线程
   */
  async restart(id) {
    const instance = this.threads.get(id);
    if (!instance) {
      return void 0;
    }
    this.stop(id);
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    this.threads.delete(id);
    const options = {
      ...instance.options,
      id: instance.id
    };
    const newInstance = await this.create(options);
    newInstance.restartCount = instance.restartCount + 1;
    this.emit(ThreadEvent.RESTARTED, newInstance);
    this.log(`Thread '${id}' restarted (count: ${newInstance.restartCount})`);
    return newInstance;
  }
  /**
   * 向线程发送消息
   */
  sendMessage(id, message) {
    const instance = this.threads.get(id);
    if (!instance || instance.state !== ThreadState.RUNNING) {
      return false;
    }
    try {
      instance.process.postMessage(message);
      return true;
    } catch (error) {
      this.log(`Failed to send message to thread '${id}': ${error}`, "error");
      return false;
    }
  }
  /**
   * 获取线程统计信息
   */
  getStats() {
    const threads = Array.from(this.threads.values());
    const stats = {
      total: threads.length,
      running: 0,
      stopped: 0,
      error: 0,
      byType: {},
      byState: {}
    };
    threads.forEach((thread) => {
      if (thread.state === ThreadState.RUNNING) stats.running++;
      if (thread.state === ThreadState.STOPPED) stats.stopped++;
      if (thread.state === ThreadState.ERROR) stats.error++;
      stats.byType[thread.type] = (stats.byType[thread.type] || 0) + 1;
      stats.byState[thread.state] = (stats.byState[thread.state] || 0) + 1;
    });
    return stats;
  }
  /**
   * 注册线程事件监听器
   */
  on(event, callback) {
    return super.on(event, callback);
  }
  /**
   * 移除线程事件监听器
   */
  off(event, callback) {
    return super.off(event, callback);
  }
  /**
   * 生成线程 ID
   */
  generateId(type) {
    return `${type}-${++this.threadCounter}-${Date.now()}`;
  }
  /**
   * 日志输出
   */
  log(message, level = "info") {
    if (!this.options.enableLogging) return;
    const prefix = "[ThreadManager]";
    switch (level) {
      case "info":
        console.log(`${prefix} ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`);
        break;
      case "error":
        console.error(`${prefix} ${message}`);
        break;
    }
  }
  /**
   * 获取线程数量
   */
  get count() {
    return this.threads.size;
  }
  /**
   * 检查是否有线程
   */
  get hasThreads() {
    return this.threads.size > 0;
  }
  /**
   * 清理资源
   */
  dispose() {
    this.stopAll();
    this.threads.clear();
    this.removeAllListeners();
    this.initialized = false;
  }
}
const threadManager = new ThreadManager();
const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";
process.platform === "linux";
process.env.NODE_ENV === "development";
isWin && "PORTABLE_EXECUTABLE_DIR" in process.env;
const titleBarOverlayDark = {
  height: 42,
  color: isWin ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0)",
  symbolColor: "#fff"
};
const titleBarOverlayLight = {
  height: 42,
  color: "rgba(255,255,255,0)",
  symbolColor: "#000"
};
let tray = null;
function initAppTray() {
  if (tray) {
    console.log("[Tray] Tray already exists, skipping initialization");
    return;
  }
  console.log("[Tray] Initializing tray...");
  console.log("[Tray] Platform:", process.platform);
  console.log("[Tray] NODE_ENV:", process.env.NODE_ENV);
  try {
    let trayImage;
    if (process.platform === "darwin") {
      const svgPath = path.resolve(__dirname, "../../../resources/tray-icon.svg");
      const iconPath = icon;
      console.log("[Tray] SVG path:", svgPath);
      console.log("[Tray] PNG path:", iconPath);
      console.log("[Tray] SVG exists:", fs.existsSync(svgPath));
      console.log("[Tray] PNG exists:", fs.existsSync(iconPath));
      if (fs.existsSync(svgPath)) {
        trayImage = electron.nativeImage.createFromPath(svgPath);
        console.log("[Tray] Using SVG icon");
      } else {
        const image = electron.nativeImage.createFromPath(iconPath);
        console.log("[Tray] Original image size:", image.getSize());
        trayImage = image.resize({ width: 16, height: 16 });
        console.log("[Tray] Resized image size:", trayImage.getSize());
      }
      console.log("[Tray] Image empty:", trayImage.isEmpty());
      const isDev = process.env.NODE_ENV !== "production";
      if (!isDev) {
        trayImage.setTemplateImage(true);
        console.log("[Tray] Template image enabled for production");
      }
      tray = new electron.Tray(trayImage);
    } else {
      const iconPath = icon;
      tray = new electron.Tray(iconPath);
    }
    tray.setToolTip(electron.app.getName());
    console.log("[Tray] Tooltip set to:", electron.app.getName());
    const contextMenu = electron.Menu.buildFromTemplate(buildTemplate());
    tray.setContextMenu(contextMenu);
    console.log("[Tray] Context menu set");
    tray.on("click", () => {
      console.log("[Tray] Tray clicked");
      updateTrayMenu();
      tray?.popUpContextMenu();
    });
    tray.on("right-click", () => {
      console.log("[Tray] Tray right-clicked");
      updateTrayMenu();
      tray?.popUpContextMenu();
    });
    tray.on("double-click", () => {
      console.log("[Tray] Tray double-clicked");
      const main2 = windowManager.findByType(WindowType.MAIN);
      const win = main2?.window;
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    });
    liveRoomMonitorQueueService.on("roomAdded", () => {
      console.log("[Tray] Room added to queue, updating menu...");
      updateTrayMenu();
    });
    liveRoomMonitorQueueService.on("roomRemoved", () => {
      console.log("[Tray] Room removed from queue, updating menu...");
      updateTrayMenu();
    });
    liveRoomMonitorQueueService.on("started", () => {
      console.log("[Tray] Monitor service started, updating menu...");
      updateTrayMenu();
    });
    liveRoomMonitorQueueService.on("stopped", () => {
      console.log("[Tray] Monitor service stopped, updating menu...");
      updateTrayMenu();
    });
    console.log("[Tray] Tray initialized successfully");
  } catch (error) {
    console.error("[Tray] Failed to initialize tray:", error);
  }
}
function disposeAppTray() {
  if (!tray) return;
  tray.destroy();
  tray = null;
}
function updateTrayMenu() {
  if (!tray) {
    console.warn("[Tray] Tray not initialized, cannot update menu");
    return;
  }
  try {
    const contextMenu = electron.Menu.buildFromTemplate(buildTemplate());
    tray.setContextMenu(contextMenu);
    console.log("[Tray] Menu updated successfully");
  } catch (error) {
    console.error("[Tray] Failed to update menu:", error);
  }
}
function buildTemplate() {
  const menuItems = [
    {
      label: "显示主窗口",
      click: () => {
        console.log("[Tray] Show main window clicked");
        const main2 = windowManager.findByType(WindowType.MAIN);
        const win = main2?.window;
        if (win) {
          console.log("[Tray] Main window found, showing...");
          if (win.isMinimized()) {
            console.log("[Tray] Window is minimized, restoring...");
            win.restore();
          }
          if (!win.isVisible()) {
            console.log("[Tray] Window is hidden, showing...");
            win.show();
          }
          console.log("[Tray] Focusing window...");
          win.focus();
          if (process.platform === "darwin") {
            electron.app.focus({ steal: true });
          }
        } else {
          console.error("[Tray] Main window not found", windowManager.getAll().length);
        }
      }
    },
    { type: "separator" }
  ];
  menuItems.push({
    id: "toggle-monitor",
    label: liveRoomMonitorQueueService.running ? "停止监控" : "启动监控",
    type: "checkbox",
    checked: liveRoomMonitorQueueService.running,
    click: async () => {
      try {
        if (liveRoomMonitorQueueService.running) {
          liveRoomMonitorQueueService.stop();
          console.log("[Tray] Monitor service stopped");
        } else {
          const config = await configManager.getConfig();
          if (!config.database.host || !config.database.user || !config.database.password || !config.database.database) {
            electron.dialog.showErrorBox("配置不完整", "请先在系统设置中配置 MySQL 数据库连接信息");
            return;
          }
          const testResult = await connectionTestService.testConnection(config);
          console.log("[MonitorQueue] Testing MySQL connection...");
          if (!testResult.success) {
            console.error("[MonitorQueue] MySQL connection test failed:", testResult);
            new electron.dialog.showErrorBox("MySQL 连接失败", "无法连接到 MySQL 数据库，无法启动监控服务");
            return;
          }
          liveRoomMonitorQueueService.start();
          console.log("[Tray] Monitor service started");
        }
        updateTrayMenu();
      } catch (error) {
        console.error("[Tray] Toggle monitor failed:", error);
      }
    }
  });
  menuItems.push({ type: "separator" });
  try {
    const accounts = accountCacheService.getAll();
    console.log(`[Tray] Building menu for ${accounts.length} accounts`);
    for (const account of accounts) {
      const accountSubMenu = buildAccountSubmenu(account);
      menuItems.push({
        label: account.account_name,
        submenu: accountSubMenu
      });
    }
  } catch (error) {
    console.error("[Tray] Failed to build account menu:", error);
  }
  menuItems.push({ type: "separator" });
  menuItems.push({
    label: "查看日志",
    click: async () => {
      console.log("[Tray] Open log viewer clicked");
      await openLogViewer();
    }
  });
  menuItems.push({ type: "separator" });
  menuItems.push({
    label: "退出",
    click: () => {
      console.log("[Tray] Quit clicked");
      electron.app.quit();
    }
  });
  return menuItems;
}
function buildAccountSubmenu(account) {
  const submenu = [];
  const credentialStatus = account.is_valid === 1 ? "✓ 凭证有效" : "✗ 凭证无效";
  submenu.push({
    label: credentialStatus,
    enabled: false
  });
  submenu.push({ type: "separator" });
  const cachedLiveRooms = accountCacheService.getLiveRooms(account.id);
  if (cachedLiveRooms && cachedLiveRooms.liveData && cachedLiveRooms.liveData.list) {
    const rooms = cachedLiveRooms.liveData.list;
    console.log(
      `[Tray] Building submenu for account ${account.id} with ${rooms.length} cached rooms`
    );
    if (rooms.length === 0) {
      submenu.push({
        label: "暂无直播间",
        enabled: false
      });
    } else {
      for (const room of rooms) {
        const isInQueue = liveRoomMonitorQueueService.isInMonitorQueue(account.id, room.room_id);
        submenu.push({
          label: `${room.nickname || room.room_id}`,
          type: "checkbox",
          checked: isInQueue,
          click: async () => {
            await toggleRoomMonitoring(account.id, room.room_id, room.nickname);
          }
        });
      }
    }
    submenu.push({ type: "separator" });
  } else {
    submenu.push({
      label: "点击下方按钮加载直播间",
      enabled: false
    });
    submenu.push({ type: "separator" });
  }
  submenu.push({
    label: "刷新直播间列表",
    click: async () => {
      console.log(`[Tray] Manually refreshing live rooms for account ${account.id}...`);
      await loadLiveRoomsForAccount(account.id);
    }
  });
  const shouldRefresh = !cachedLiveRooms || !cachedLiveRooms.liveData || Date.now() - cachedLiveRooms.lastUpdate > 6e4;
  if (shouldRefresh) {
    console.log(`[Tray] Triggering background refresh for account ${account.id}`);
    loadLiveRoomsForAccount(account.id).catch((error) => {
      console.error(`[Tray] Background refresh failed for account ${account.id}:`, error);
    });
  }
  return submenu;
}
async function loadLiveRoomsForAccount(accountId) {
  try {
    console.log(`[Tray] Loading live rooms for account ${accountId} in background...`);
    const result = await liveRoomService.getLiveRoomsByAccountId(accountId);
    if (result && result.success && result.liveData) {
      console.log(
        `[Tray] Successfully loaded live rooms for account ${accountId}, count: ${result.liveData.list.length}`
      );
      updateTrayMenu();
    } else {
      console.error(
        `[Tray] Failed to load live rooms for account ${accountId}:`,
        result?.error || "Unknown error"
      );
    }
  } catch (error) {
    console.error(`[Tray] Error loading live rooms for account ${accountId}:`, error);
  }
}
async function toggleRoomMonitoring(accountId, roomId, nickname) {
  try {
    const isInQueue = liveRoomMonitorQueueService.isInMonitorQueue(accountId, roomId);
    const account = accountCacheService.getById(accountId);
    if (!account) {
      const errorMsg = `账户 ${accountId} 不存在`;
      console.error(`[Tray] Account ${accountId} not found`);
      new electron.Notification({
        title: "操作失败",
        body: errorMsg,
        icon
      }).show();
      return;
    }
    if (isInQueue) {
      console.log(`[Tray] Removing room ${roomId} from monitor queue`);
      const result = await liveRoomMonitorQueueService.removeFromMonitorQueue({
        accountId,
        roomId
      });
      if (result.success) {
        console.log(`[Tray] Successfully removed ${nickname} from monitoring`);
        new electron.Notification({
          title: "移除成功",
          body: `已将 "${nickname}" 从监控队列移除`,
          icon
        }).show();
      } else {
        const errorMsg = result.message || "移除失败";
        console.error(`[Tray] Failed to remove ${nickname}:`, errorMsg);
        new electron.Notification({
          title: "移除失败",
          body: `无法移除 "${nickname}": ${errorMsg}`,
          icon
        }).show();
      }
    } else {
      console.log(`[Tray] Adding room ${roomId} to monitor queue`);
      const result = await liveRoomMonitorQueueService.addToMonitorQueue({
        accountId,
        accountName: account.account_name,
        organizationId: account.organization_id,
        roomId,
        anchorNickname: nickname
      });
      if (result.success) {
        console.log(`[Tray] Successfully added ${nickname} to monitoring`);
        new electron.Notification({
          title: "添加成功",
          body: `已将 "${nickname}" 添加到监控队列`,
          icon
        }).show();
      } else {
        const errorMsg = result.message || "添加失败";
        console.error(`[Tray] Failed to add ${nickname}:`, errorMsg);
        new electron.Notification({
          title: "添加失败",
          body: `无法添加 "${nickname}": ${errorMsg}`,
          icon
        }).show();
      }
    }
    updateTrayMenu();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    console.error("[Tray] Toggle room monitoring failed:", error);
    new electron.Notification({
      title: "操作异常",
      body: `监控状态切换失败: ${errorMsg}`,
      icon
    }).show();
  }
}
async function openLogViewer() {
  try {
    const existingLogWindow = windowManager.findByType(WindowType.LOG_VIEWER);
    if (existingLogWindow) {
      console.log("[Tray] Log viewer window already exists, focusing...");
      existingLogWindow.window.focus();
      if (process.platform === "darwin") {
        electron.app.focus({ steal: true });
      }
      return;
    }
    console.log("[Tray] Creating new log viewer window...");
    const logViewerInstance = await windowManager.create({
      type: WindowType.LOG_VIEWER,
      singleton: true,
      showImmediately: true,
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: "日志查看器",
      autoHideMenuBar: true,
      transparent: false,
      vibrancy: "sidebar",
      visualEffectState: "active",
      closeAndDelete: true,
      backgroundColor: isMac ? void 0 : electron.nativeTheme.shouldUseDarkColors ? "#181818" : "#FFFFFF",
      darkTheme: electron.nativeTheme.shouldUseDarkColors,
      ...isMac ? {
        titleBarStyle: "hidden",
        titleBarOverlay: electron.nativeTheme.shouldUseDarkColors ? titleBarOverlayDark : titleBarOverlayLight,
        trafficLightPosition: { x: 8, y: 13 }
      } : {
        frame: false
        // Frameless window for Windows and Linux
      },
      // 在开发模式下加载开发服务器的 URL
      url: process.env["ELECTRON_RENDERER_URL"] ? `${process.env["ELECTRON_RENDERER_URL"]}/log-viewer.html` : void 0,
      // 在生产模式下加载 HTML 文件
      htmlFile: !process.env["ELECTRON_RENDERER_URL"] ? path.join(__dirname, "../renderer/log-viewer.html") : void 0
    });
    loggerService.addWindow(logViewerInstance.window);
    logViewerInstance.window.on("close", (event) => {
      const window = logViewerInstance.window;
      console.log("[Tray] Log viewer window closing, cleaning up...");
      event.preventDefault();
      console.log("[WindowManager] Window close prevented, waiting for renderer cleanup");
      const cleanupTimeout = setTimeout(() => {
        console.warn(
          "[WindowManager] Cleanup timeout (500ms), forcing window close for:",
          logViewerInstance.id
        );
        main.ipcMain.removeAllListeners("window:cleanup-complete");
        if (!window.isDestroyed()) {
          window.destroy();
        }
      }, 500);
      const handleCleanupComplete = (ipcEvent) => {
        if (ipcEvent.sender.id !== window.webContents.id) {
          return;
        }
        console.log(
          "[WindowManager] Received cleanup-complete signal from renderer for:",
          logViewerInstance.id
        );
        clearTimeout(cleanupTimeout);
        main.ipcMain.removeListener("window:cleanup-complete", handleCleanupComplete);
        if (!window.isDestroyed()) {
          console.log("[WindowManager] Destroying window after cleanup:", logViewerInstance.id);
          window.destroy();
        }
      };
      main.ipcMain.once("window:cleanup-complete", handleCleanupComplete);
      console.log("[WindowManager] Sending window:will-close event to renderer");
      try {
        window.webContents.send("window:will-close");
      } catch (error) {
        console.error("[WindowManager] Failed to send window:will-close event:", error);
        clearTimeout(cleanupTimeout);
        main.ipcMain.removeAllListeners("window:cleanup-complete");
        window.destroy();
      }
    });
    console.log("[Tray] Log viewer window created successfully");
  } catch (error) {
    console.error("[Tray] Failed to open log viewer:", error);
    new electron.Notification({
      title: "打开日志失败",
      body: `无法打开日志查看器: ${error instanceof Error ? error.message : "未知错误"}`,
      icon
    }).show();
  }
}
if (isWin) {
  electron.app.commandLine.appendSwitch("wm-window-animations-disabled");
}
async function createMainWindow() {
  console.log("[Main] Creating main window...");
  console.log("[Main] is.dev:", utils.is.dev);
  console.log("[Main] ELECTRON_RENDERER_URL:", process.env["ELECTRON_RENDERER_URL"]);
  console.log("NODE_MODULE_VERSION:", process.versions.modules);
  const mainWindowInstance = await windowManager.create({
    type: WindowType.MAIN,
    singleton: true,
    // 确保只有一个主窗口
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    transparent: false,
    vibrancy: "sidebar",
    visualEffectState: "active",
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      devTools: utils.is.dev
    },
    // 修复 URL 和 htmlFile 逻辑
    url: utils.is.dev && process.env["ELECTRON_RENDERER_URL"] ? process.env["ELECTRON_RENDERER_URL"] : void 0,
    htmlFile: utils.is.dev && process.env["ELECTRON_RENDERER_URL"] ? void 0 : path.join(__dirname, "../renderer/index.html"),
    showImmediately: true
    // 修复：直接显示窗口
  });
  console.log("[Main] Window instance created:", mainWindowInstance.id);
  const mainWindow = mainWindowInstance.window;
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[Main] Window content loaded");
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("[Main] Window failed to load:", errorCode, errorDescription);
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  console.log("[Main] Main window setup complete");
}
electron.app.whenReady().then(async () => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    if (utils.is.dev) {
      utils.optimizer.watchWindowShortcuts(window);
    }
  });
  try {
    getDatabase();
    console.log("[Main] Database initialized successfully");
  } catch (error) {
    console.error("[Main] Failed to initialize database:", error);
  }
  try {
    Promise.resolve().then(() => accountCacheService$1).then(async ({ accountCacheService: accountCacheService2 }) => {
      await accountCacheService2.initialize();
      const stats = accountCacheService2.getStats();
      console.log(
        `[Main] Account cache initialized - Total: ${stats.total}, Valid: ${stats.valid}, Invalid: ${stats.invalid}`
      );
    });
  } catch (error) {
    console.error("[Main] Failed to initialize account cache:", error);
  }
  registerIPCHandlers();
  await windowManager.initialize();
  await threadManager.initialize();
  await createMainWindow();
  initAppTray();
  const mainWindowInstance = windowManager.findByType(WindowType.MAIN);
  if (mainWindowInstance) {
    loggerService.initialize(mainWindowInstance.window);
    console.log("[Main] Logger service initialized");
  }
  console.log(
    "[Main] Account monitor service initialized (not started, waiting for manual trigger)"
  );
  electron.app.on("activate", async () => {
    if (windowManager.count === 0) {
      await createMainWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  console.log("[Main] All windows closed, but app continues running in tray");
});
electron.app.on("before-quit", () => {
  console.log("Application quitting, cleaning up resources...");
  accountMonitorService.stop();
  console.log("[Main] Account monitor service stopped");
  loggerService.restore();
  console.log("[Main] Logger service restored");
  try {
    const db = getDatabase();
    db.close();
    console.log("[Main] Database connection closed");
  } catch (error) {
    console.error("[Main] Failed to close database:", error);
  }
  threadManager.dispose();
  windowManager.dispose();
  disposeAppTray();
});
async function createSettingsWindow() {
  const mainWindow = windowManager.findByType(WindowType.MAIN);
  await windowManager.create({
    type: WindowType.SETTINGS,
    singleton: true,
    // 只允许一个设置窗口
    width: 800,
    height: 600,
    resizable: false,
    modal: true,
    parent: mainWindow?.window,
    url: utils.is.dev && process.env["ELECTRON_RENDERER_URL"] ? `${process.env["ELECTRON_RENDERER_URL"]}/#/configuration` : void 0,
    htmlFile: !utils.is.dev || !process.env["ELECTRON_RENDERER_URL"] ? path.join(__dirname, "../renderer/index.html#/configuration") : void 0,
    showImmediately: true
  });
}
async function createDataProcessorThread() {
  const thread = await threadManager.create({
    type: ThreadType.CUSTOM,
    modulePath: path.join(__dirname, "../workers/data-processor.js"),
    args: ["--mode=production"],
    env: {
      NODE_ENV: process.env.NODE_ENV || "production"
    },
    autoRestart: true,
    maxRestarts: 3,
    data: {
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
  return thread.id;
}
exports.createDataProcessorThread = createDataProcessorThread;
exports.createSettingsWindow = createSettingsWindow;
