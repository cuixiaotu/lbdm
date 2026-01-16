/**
 * 登录窗口服务
 * 创建独立的登录窗口,通过parent属性实现与主窗口的粘性联动效果
 */

import { BrowserWindow, screen, session } from 'electron'

export interface LoginWindowOptions {
  username: string
  password: string
  loginUrl: string
  /** 可选：自定义执行的JavaScript代码 */
  customScript?: string
  /** 管家账号（组织ID） */
  organizationId: string
}

export interface LoginResult {
  success: boolean
  cookie?: string
  error?: string
}

export class LoginWindowService {
  private loginWindow: BrowserWindow | null = null
  private loginWindowWidth = 800 // 登录窗口宽度
  private originalMainWindowBounds: { x: number; y: number; width: number; height: number } | null =
    null

  /**
   * 打开登录窗口并获取 Cookie
   * 通过parent属性实现窗口自动跟随主窗口
   */
  async openLoginWindow(
    options: LoginWindowOptions,
    mainWindow: BrowserWindow
  ): Promise<LoginResult> {
    return new Promise((resolve) => {
      try {
        // 获取主窗口的位置和尺寸
        const mainBounds = mainWindow.getBounds()

        // 保存主窗口原始位置和尺寸，用于关闭登录窗口时恢复
        this.originalMainWindowBounds = { ...mainBounds }

        // 获取当前屏幕可用空间
        const displayBounds = screen.getDisplayMatching(mainBounds).workArea

        // 检查右侧是否有足够空间放置登录窗口
        const rightSpace = displayBounds.x + displayBounds.width - (mainBounds.x + mainBounds.width)
        const needsAdjustment = rightSpace < this.loginWindowWidth + 20 // 加20px作为间隔

        // 如果右侧空间不足，调整主窗口位置或尺寸
        if (needsAdjustment) {
          const neededSpace = this.loginWindowWidth + 20 - rightSpace
          const availableLeftSpace = mainBounds.x - displayBounds.x

          // 优先移动窗口位置
          if (availableLeftSpace >= neededSpace) {
            // 有足够空间向左移动
            const newX = Math.max(displayBounds.x, mainBounds.x - neededSpace)
            mainWindow.setPosition(newX, mainBounds.y, true) // true 启用动画
          } else {
            // 左侧空间不足，先尽可能左移
            if (availableLeftSpace > 0) {
              mainWindow.setPosition(displayBounds.x, mainBounds.y, true)
            }

            // 然后缩小主窗口宽度
            const remainingNeededSpace = neededSpace - availableLeftSpace
            if (remainingNeededSpace > 0) {
              const newWidth = Math.max(
                800, // 主窗口最小宽度
                mainBounds.width - remainingNeededSpace
              )
              mainWindow.setSize(newWidth, mainBounds.height, true)
            }
          }
        }

        // 获取调整后的主窗口位置
        const updatedMainBounds = mainWindow.getBounds()

        const sessionPath = 'persist:incognito-' + new Date().getTime().toString()
        console.log('sessionPath', sessionPath)
        // 创建登录窗口，设置parent实现自动跟随
        this.loginWindow = new BrowserWindow({
          width: this.loginWindowWidth,
          height: updatedMainBounds.height,
          x: updatedMainBounds.x + updatedMainBounds.width, // 紧贴主窗口右侧
          y: updatedMainBounds.y,
          parent: mainWindow, // 关键：设置父窗口，实现自动跟随
          frame: true,
          show: false, // 先不显示，等加载完成后再显示
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            devTools: true,
            session: session.fromPartition(sessionPath, {
              cache: false
            })
          }
        })

        // 获取窗口的 session
        const windowSession = this.loginWindow.webContents.session

        // 监听窗口关闭事件
        this.loginWindow.on('closed', () => {
          console.log('登录窗口已关闭')
          this.loginWindow = null

          // 如果窗口被手动关闭，返回失败
          resolve({
            success: false,
            error: '用户取消登录'
          })
        })

        // 加载登录页面
        this.loginWindow.loadURL(options.loginUrl)

        // 页面加载完成后显示窗口
        this.loginWindow.once('ready-to-show', () => {
          this.loginWindow?.show()
        })

        // 如果提供了自定义脚本,则在页面加载完成后执行
        this.loginWindow.webContents.on('did-finish-load', () => {
          if (this.loginWindow && !this.loginWindow.isDestroyed() && options.customScript) {
            // 注入自定义脚本
            // 注意:脚本中可以使用 ${options.username} 和 ${options.password} 占位符
            const scriptToExecute = options.customScript
              .replace(/\$\{options\.username\}/g, options.username)
              .replace(/\$\{options\.password\}/g, options.password)
              .replace(/\$\{options\.organizationId\}/g, options.organizationId)

            this.loginWindow.webContents
              .executeJavaScript(scriptToExecute)
              .then(() => {
                windowSession.cookies
                  .get({
                    url: 'https://business.oceanengine.com'
                  })
                  .then((cookies) => {
                    if (cookies.length > 0) {
                      // 将 Cookie 转换为字符串格式
                      const cookieString = cookies
                        .map((cookie) => `${cookie.name}=${cookie.value}`)
                        .join('; ')
                      console.log('获取到 Cookie:', cookieString)
                      // 关闭窗口
                      if (this.loginWindow && !this.loginWindow.isDestroyed()) {
                        this.loginWindow.close()
                        this.loginWindow = null
                      }
                      // 返回成功结果
                      resolve({
                        success: true,
                        cookie: cookieString
                      })
                    }
                  })
                  .catch((error) => {
                    console.error('获取 Cookie 失败:', error)
                    resolve({
                      success: false,
                      error: error instanceof Error ? error.message : '获取 Cookie 失败'
                    })
                  })
              })
              .catch((err) => {
                console.error('注入脚本失败:', err)
              })
          }
        })
      } catch (error) {
        console.error('创建登录窗口失败:', error)
        resolve({
          success: false,
          error: error instanceof Error ? error.message : '创建登录窗口失败'
        })
      }
    })
  }

  /**
   * 关闭登录窗口并恢复主窗口原始状态
   */
  closeLoginWindow(): void {
    // 关闭登录窗口
    if (this.loginWindow && !this.loginWindow.isDestroyed()) {
      const mainWindow = this.loginWindow.getParentWindow()

      this.loginWindow.close()
      this.loginWindow = null

      // 恢复主窗口原始位置和尺寸
      if (this.originalMainWindowBounds && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setBounds(this.originalMainWindowBounds, true) // true 启用动画
        this.originalMainWindowBounds = null
      }
    }
  }

  /**
   * 获取所有 Cookie（备用方法）
   */
  async getAllCookies(url: string): Promise<string> {
    if (!this.loginWindow) {
      throw new Error('登录窗口不存在')
    }

    const windowSession = this.loginWindow.webContents.session
    const cookies = await windowSession.cookies.get({ url })

    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
  }
}

// 导出单例
export const loginWindowService = new LoginWindowService()
