# 配置文件使用指南

## 概述

本项目使用 JSON 配置文件管理系统设置,支持开发环境和生产环境的配置分离。

## 配置文件位置

### 开发环境

- **配置文件**: `config.dev.json` (项目根目录)
- **示例文件**: `config.dev.example.json` (项目根目录)
- **说明**: `config.dev.json` 已被 `.gitignore` 忽略,不会被提交到仓库

### 生产环境

- **配置文件**: `config.json`
- **位置**: 用户数据目录 (`app.getPath('userData')`)
  - Windows: `%APPDATA%/lbdm/config.json`
  - macOS: `~/Library/Application Support/lbdm/config.json`
  - Linux: `~/.config/lbdm/config.json`

## 首次使用设置

### 1. 复制示例配置文件

在项目根目录执行:

```bash
cp config.dev.example.json config.dev.json
```

### 2. 编辑配置文件

打开 `config.dev.json`,根据实际情况修改配置项。

## 配置项说明

### API 配置 (`api`)

用于配置接口地址,支持正式环境和测试环境切换。

```json
{
  "api": {
    "apiUrl": "https://api.example.com", // 正式环境接口地址
    "testApiUrl": "https://test-api.example.com" // 测试环境接口地址
  }
}
```

### SSH 配置 (`ssh`)

用于配置远程服务器连接信息。

```json
{
  "ssh": {
    "server": "192.168.1.100", // SSH 服务器地址
    "port": 22, // SSH 端口
    "user": "admin", // 用户名
    "password": "", // 密码 (不推荐,建议使用 SSH 密钥)
    "useSshKey": false, // 是否使用 SSH 密钥认证
    "privateKey": "" // SSH 私钥内容 (PEM 格式)
  }
}
```

**安全建议**:

- 生产环境建议使用 SSH 密钥认证而非密码
- 不要将包含真实密码的配置文件提交到版本控制系统

### 账户配置 (`account`)

用于配置自动登录功能。

```json
{
  "account": {
    "loginUrl": "https://example.com/login", // 登录页面地址
    "defaultScript": "/* JavaScript 代码 */" // 默认执行的自动登录脚本
  }
}
```

#### loginUrl

指定账户登录页面的 URL 地址。

#### defaultScript

默认执行的 JavaScript 脚本,用于自动填充表单并提交。脚本中可以使用以下占位符:

- `${options.username}` - 会被替换为实际的用户名
- `${options.password}` - 会被替换为实际的密码

**示例脚本结构**:

```javascript
// 1. 定义辅助函数
function waitForElement(selector, timeout = 10000) {
  // ... 等待 DOM 元素出现
}

// 2. 执行自动登录逻辑
;(async () => {
  try {
    // 等待并填充用户名
    const usernameInput = await waitForElement('input[name="email"]')
    usernameInput.value = '${options.username}'
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }))

    // 等待并填充密码
    const passwordInput = await waitForElement('input[type="password"]')
    passwordInput.value = '${options.password}'
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    // 勾选协议
    const agreementCheck = await waitForElement('.agreement-check')
    if (!agreementCheck.classList.contains('checked')) {
      agreementCheck.click()
    }

    // 提交表单
    const submitButton = await waitForElement('.submit-button')
    submitButton.click()
  } catch (error) {
    console.error('自动登录失败:', error)
  }
})()
```

**脚本说明**:

1. **waitForElement 函数**
   - 使用 `MutationObserver` 监听 DOM 变化
   - 支持超时设置(默认 10 秒)
   - 异步等待元素出现后返回

2. **自动登录流程**
   - 等待表单元素加载完成
   - 填充用户名和密码
   - 触发 `input` 和 `change` 事件(适配 Vue/React 等框架)
   - 自动勾选协议复选框
   - 验证表单后提交

3. **选择器自定义**
   - 根据实际登录页面的 DOM 结构修改选择器
   - 常见选择器:
     - 用户名: `input[name="email"]`, `input[name="username"]`, `#username`
     - 密码: `input[type="password"]`, `#password`
     - 提交按钮: `button[type="submit"]`, `.submit-btn`, `#login-btn`

## 配置文件管理

### 在应用中修改配置

可以通过应用的"系统配置"页面修改配置,无需手动编辑配置文件。

1. 打开应用
2. 进入"系统配置"页面
3. 修改配置项
4. 点击"保存"按钮

配置会自动保存到本地配置文件。

### 手动编辑配置

也可以直接编辑配置文件:

```bash
# 开发环境
vim config.dev.json

# 生产环境 (macOS)
vim ~/Library/Application\ Support/lbdm/config.json
```

**注意**: 手动编辑后需要重启应用才能生效。

### 重置配置

如果配置文件损坏或需要恢复默认值:

1. 删除现有配置文件

   ```bash
   # 开发环境
   rm config.dev.json

   # 生产环境 (macOS)
   rm ~/Library/Application\ Support/lbdm/config.json
   ```

2. 重新复制示例文件 (开发环境)
   ```bash
   cp config.dev.example.json config.dev.json
   ```

或在应用的"系统配置"页面点击"重置配置"按钮。

## 常见问题

### 配置不生效?

1. 检查 JSON 格式是否正确 (可使用 JSON 验证工具)
2. 确认配置文件路径是否正确
3. 重启应用

### 自动登录脚本不执行?

1. 检查 `loginUrl` 是否正确
2. 检查 `defaultScript` 是否为空
3. 打开开发者工具查看控制台错误信息
4. 确认选择器是否匹配实际页面元素

### 如何调试自动登录脚本?

开发环境下,登录窗口会自动打开开发者工具:

1. 查看 Console 面板的日志输出
2. 检查 Elements 面板确认选择器是否正确
3. 在 Console 中手动执行选择器测试:
   ```javascript
   document.querySelector('input[name="email"]')
   ```

### 配置文件包含敏感信息怎么办?

1. 确保 `config.dev.json` 已被 `.gitignore` 忽略
2. 不要将真实密码提交到版本控制系统
3. 生产环境使用 SSH 密钥而非密码
4. 团队协作时,只共享 `config.dev.example.json` 示例文件

## 最佳实践

1. **使用示例文件**: 保持 `config.dev.example.json` 为可公开的示例配置
2. **本地配置**: 在 `config.dev.json` 中填写真实配置,此文件不会被提交
3. **密钥管理**: 敏感信息使用环境变量或密钥管理工具
4. **脚本测试**: 在开发环境充分测试自动登录脚本后再用于生产环境
5. **备份配置**: 定期备份生产环境的配置文件

## 相关文档

- [登录脚本重构说明](./LOGIN_SCRIPT_REFACTOR.md)
- [账户配置指南](./ACCOUNT_CONFIG_GUIDE.md)
- [代码编辑器组件文档](./CODE_EDITOR_COMPONENT.md)
