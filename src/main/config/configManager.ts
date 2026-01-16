import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { accountMonitorService } from '../services/accountMonitorService'

/**
 * 系统配置接口定义
 */
export interface DatabaseConfig {
  /** 数据库主机地址 */
  host: string
  /** 数据库端口 */
  port: number
  /** 数据库用户名 */
  user: string
  /** 数据库密码 */
  password: string
  /** 数据库名称 */
  database: string
}

export interface SshConfig {
  /** SSH服务器地址 */
  server: string
  /** SSH端口 */
  port: number
  /** 用户名 */
  user: string
  /** 密码 */
  password: string
  /** 是否使用SSH密钥 */
  useSshKey: boolean
  /** SSH私钥内容 */
  privateKey?: string
}

export interface AccountConfig {
  /** 登录页面URL */
  loginUrl: string
  /** 默认执行的JavaScript代码 */
  defaultScript: string
}

export interface MonitorConfig {
  /** 监控频率（秒）*/
  interval: number
}

export interface DebugConfig {
  /** 网络请求调试开关 */
  enableNetworkDebug: boolean
  /** SQL调试开关 */
  enableSqlDebug: boolean
}

export interface SystemConfig {
  /** 数据库配置 */
  database: DatabaseConfig
  /** SSH配置 */
  ssh: SshConfig
  /** 账户配置 */
  account: AccountConfig
  /** 监控配置 */
  monitor: MonitorConfig
  /** 调试配置 */
  debug: DebugConfig
}

/**
 * 默认配置
 */
const defaultConfig: SystemConfig = {
  database: {
    host: '',
    port: 3306,
    user: '',
    password: '',
    database: ''
  },
  ssh: {
    server: '',
    port: 22,
    user: '',
    password: '',
    useSshKey: false,
    privateKey: ''
  },
  // https://business.oceanengine.com/nbs/api/bm/dashboard/managed_list
  account: {
    loginUrl: 'https://business.oceanengine.com/login',
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
    interval: 60 // 默认60秒
  },
  debug: {
    enableNetworkDebug: false, // 默认关闭网络调试
    enableSqlDebug: false // 默认关闭SQL调试
  }
}

/**
 * 配置管理器
 */
export class ConfigManager {
  private configPath: string
  private config: SystemConfig

  constructor() {
    // 配置文件路径：
    // - 开发环境：项目根目录/tmp/config.dev.json
    // - 生产环境：用户数据目录/config.json
    if (app.isPackaged) {
      // 生产环境：使用用户数据目录
      const userDataPath = app.getPath('userData')
      this.configPath = path.join(userDataPath, 'config.json')
    } else {
      // 开发环境：使用项目根目录的 tmp 目录
      const rootPath = app.getAppPath()
      const tmpDir = path.join(rootPath, 'tmp')
      // 确保 tmp 目录存在
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }
      this.configPath = path.join(tmpDir, 'config.dev.json')
    }

    this.config = this.loadConfig()

    // 开发环境下输出配置文件路径
    if (!app.isPackaged) {
      console.log(`[开发模式] 配置文件路径: ${this.configPath}`)
    }
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * 加载配置
   */
  private loadConfig(): SystemConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        const loadedConfig = JSON.parse(data) as SystemConfig

        // 合并默认配置，确保新增字段有默认值
        return {
          database: { ...defaultConfig.database, ...loadedConfig.database },
          ssh: { ...defaultConfig.ssh, ...loadedConfig.ssh },
          account: {
            ...defaultConfig.account,
            ...(loadedConfig.account || {})
          },
          monitor: {
            ...defaultConfig.monitor,
            ...(loadedConfig.monitor || {})
          },
          debug: {
            ...defaultConfig.debug,
            ...(loadedConfig.debug || {})
          }
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }

    return { ...defaultConfig }
  }

  /**
   * 获取配置
   */
  getConfig(): SystemConfig {
    return { ...this.config }
  }

  /**
   * 保存配置
   */
  saveConfig(config: SystemConfig): void {
    try {
      // 检查监控间隔是否变更
      const oldInterval = this.config.monitor?.interval
      const newInterval = config.monitor?.interval
      const intervalChanged = oldInterval !== newInterval

      this.config = config

      // 确保目录存在
      const dir = path.dirname(this.configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // 写入文件
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')

      // 如果监控间隔变更，通知监控服务更新
      if (intervalChanged) {
        console.log(
          `[ConfigManager] Monitor interval changed from ${oldInterval}s to ${newInterval}s, updating service...`
        )
        // 延迟导入，避免循环依赖
        accountMonitorService.updateInterval()
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      throw new Error('保存配置失败')
    }
  }

  /**
   * 重置配置
   */
  resetConfig(): SystemConfig {
    this.config = { ...defaultConfig }
    this.saveConfig(this.config)
    return this.getConfig()
  }

  /**
   * 删除配置文件
   */
  deleteConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath)
      }
      this.config = { ...defaultConfig }
    } catch (error) {
      console.error('删除配置失败:', error)
      throw new Error('删除配置失败')
    }
  }
}

// 导出单例
export const configManager = new ConfigManager()
