# 登录脚本重构说明

## 概述

将登录窗口服务中硬编码的默认执行脚本移除,改为完全由系统配置管理。

## 修改内容

### 1. loginWindowService.ts

**修改前:**

- 包含硬编码的 `defaultScript` 变量(约100行代码)
- 在页面加载完成后自动执行默认脚本
- 可选择性合并自定义脚本

**修改后:**

- 移除了硬编码的 `defaultScript`
- 仅当 `options.customScript` 存在时才执行脚本
- 支持在脚本中使用 `${options.username}` 和 `${options.password}` 占位符,会自动替换

```typescript
// 如果提供了自定义脚本,则在页面加载完成后执行
this.loginWindow.webContents.on('did-finish-load', () => {
  if (this.loginWindow && !this.loginWindow.isDestroyed() && options.customScript) {
    // 注入自定义脚本
    // 注意:脚本中可以使用 ${options.username} 和 ${options.password} 占位符
    const scriptToExecute = options.customScript
      .replace(/\$\{options\.username\}/g, options.username)
      .replace(/\$\{options\.password\}/g, options.password)

    this.loginWindow.webContents.executeJavaScript(scriptToExecute).catch((err) => {
      console.error('注入脚本失败:', err)
    })
  }
})
```

### 2. configManager.ts 和 config.ts

在默认配置的 `account.defaultScript` 中添加了完整的示例脚本,包含:

1. **waitForElement 辅助函数**
   - 使用 `MutationObserver` 监听 DOM 变化
   - 支持超时设置(默认10秒)
   - 返回 Promise 便于异步等待

2. **完整的自动登录逻辑**
   - 等待并填充用户名 (`input[name="email"]`)
   - 等待并填充密码 (`input[type="password"]`)
   - 自动勾选协议 (`.account-center-agreement-check`)
   - 验证表单后提交 (`.account-center-submit`)

3. **占位符支持**
   - 使用 `\${options.username}` 表示用户名占位符
   - 使用 `\${options.password}` 表示密码占位符
   - 注意:模板字符串中需要转义 `\${...}`

## 使用方式

### 方式一:使用系统配置的默认脚本

1. 在系统配置中设置登录地址
2. 在"默认执行脚本"中填写完整的自动登录脚本
3. 添加账户时会自动使用配置的脚本

```typescript
// AccountAdd.vue
const result = await window.api.account.openLoginWindow({
  username: newAccount.value.username,
  password: newAccount.value.password,
  loginUrl: config.value.account.loginUrl,
  customScript: config.value.account.defaultScript || undefined
})
```

### 方式二:临时使用自定义脚本

可以在调用时传入不同的 `customScript`:

```typescript
const result = await window.api.account.openLoginWindow({
  username: 'user@example.com',
  password: 'password123',
  loginUrl: 'https://example.com/login',
  customScript: `
    // 自定义登录逻辑
    console.log('用户名:', '\${options.username}');
    console.log('密码:', '\${options.password}');
    // ... 其他操作
  `
})
```

## 脚本示例

默认配置提供的完整脚本示例:

```javascript
// 等待DOM元素出现的辅助函数
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector)
      if (element) {
        obs.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    setTimeout(() => {
      observer.disconnect()
      reject(new Error('等待元素超时: ' + selector))
    }, timeout)
  })
}

// 等待并填充表单
;(async () => {
  try {
    console.log('开始等待表单元素...')

    // 等待用户名输入框出现
    const usernameInput = await waitForElement('input[name="email"]')
    console.log('找到用户名输入框')

    // 等待密码输入框出现
    const passwordInput = await waitForElement('input[type="password"]')
    console.log('找到密码输入框')

    // 填充用户名 (使用 ${options.username} 占位符)
    usernameInput.value = '${options.username}'
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }))
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }))

    // 填充密码 (使用 ${options.password} 占位符)
    passwordInput.value = '${options.password}'
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }))

    console.log('已自动填充用户名和密码')

    // 等待协议复选框出现
    const agreementCheckDiv = await waitForElement('.account-center-agreement-check')
    console.log('找到协议复选框')

    // 检查是否已勾选
    if (!agreementCheckDiv.classList.contains('checked')) {
      console.log('协议未勾选,自动点击勾选')
      agreementCheckDiv.click()
      await new Promise((resolve) => setTimeout(resolve, 300))
    } else {
      console.log('协议已勾选,跳过')
    }

    // 等待提交按钮出现
    const submitButton = await waitForElement('.account-center-submit')
    console.log('找到提交按钮')

    // 检查提交按钮内的 button 标签是否有验证错误
    const innerButton = submitButton.querySelector('button')
    if (innerButton && innerButton.classList.contains('form-validate-error')) {
      console.log('表单验证失败,存在 form-validate-error,跳过提交')
    } else {
      submitButton.click()
      console.log('已自动点击提交按钮')
    }
  } catch (error) {
    console.error('自动填充失败:', error.message)
  }
})()
```

## 优势

1. **灵活性更高**: 用户可以在系统配置中自定义登录脚本,适应不同的登录页面结构
2. **代码解耦**: 业务逻辑(脚本)与服务代码分离,更易维护
3. **可配置性**: 通过 CodeMirror 编辑器提供更好的脚本编辑体验
4. **可复用性**: 默认脚本提供了通用的示例,用户可以基于此修改

## 注意事项

1. 脚本中的占位符 `${options.username}` 和 `${options.password}` 会在执行前被替换
2. 如果未配置 `defaultScript`,添加账户时不会执行任何脚本,需要手动登录
3. 脚本执行失败不会影响登录窗口的打开,只是不会自动填充
4. 建议在开发环境下测试脚本,登录窗口会自动打开开发者工具

## 相关文件

- `/src/main/services/loginWindowService.ts` - 登录窗口服务
- `/src/main/config/configManager.ts` - 主进程配置管理
- `/src/renderer/src/stores/config.ts` - 渲染进程配置存储
- `/src/renderer/src/views/Configuration.vue` - 系统配置页面
- `/src/renderer/src/components/CodeEditor.vue` - 脚本编辑器组件
- `/src/renderer/src/components/AccountAdd.vue` - 添加账户组件
