# 账户配置指南

## 概述

系统现在支持在**系统设置**中统一配置登录地址和默认执行脚本，所有账户共享这些配置，避免重复配置。

## 配置项说明

### 1. 登录地址（必填）

在**系统设置 > 账户配置 > 登录地址**中配置统一的登录页面URL。

- **作用**：所有账户登录时都会使用此URL打开登录窗口
- **示例**：`https://example.com/login`
- **注意**：必须填写完整的URL，包括协议（http://或https://）

### 2. 默认执行脚本（可选）

在**系统设置 > 账户配置 > 默认执行脚本**中配置额外的自定义JavaScript代码。

- **作用**：在默认的自动填充流程后执行额外的自定义操作
- **示例**：关闭弹窗、填充额外字段、处理验证码等
- **注意**：留空表示只执行默认的自动登录流程

## 默认自动登录流程

系统会自动执行以下操作（无需配置）：

1. ✅ 等待并填充用户名到 `input[name="email"]`
2. ✅ 等待并填充密码到 `input[type="password"]`
3. ✅ 等待并检查协议复选框 `.account-center-agreement-check`
   - 如果未勾选则自动点击
4. ✅ 等待提交按钮 `.account-center-submit`
   - 检查内部 button 是否有 `form-validate-error` class
   - 只有在没有验证错误时才点击提交

## 使用步骤

### 步骤1：配置登录地址

1. 打开**系统设置**页面
2. 找到**账户配置**卡片
3. 在**登录地址**输入框中填写登录页面URL
   ```
   https://your-login-page.com/login
   ```
4. 点击**测试连接**（可选）
5. 点击**保存配置**

### 步骤2：配置默认执行脚本（可选）

如果需要在基本登录流程之外执行额外操作，可以配置默认执行脚本。

#### 示例1：关闭弹窗

```javascript
;(async () => {
  try {
    // 等待并关闭弹窗
    const closeButton = await waitForElement('.popup-close', 3000)
    closeButton.click()
    console.log('已关闭弹窗')
  } catch (error) {
    console.log('未检测到弹窗')
  }
})()
```

#### 示例2：填充额外字段

```javascript
;(async () => {
  try {
    // 填充公司代码
    const companyCodeInput = await waitForElement('#company-code')
    companyCodeInput.value = 'COMPANY123'
    companyCodeInput.dispatchEvent(new Event('input', { bubbles: true }))
    console.log('已填充公司代码')
  } catch (error) {
    console.error('填充失败:', error)
  }
})()
```

#### 示例3：勾选"记住我"

```javascript
;(async () => {
  try {
    const rememberMe = await waitForElement('.remember-me-checkbox', 3000)
    if (!rememberMe.checked && !rememberMe.classList.contains('checked')) {
      rememberMe.click()
      console.log('已勾选记住我')
    }
  } catch (error) {
    console.log('未找到记住我选项')
  }
})()
```

### 步骤3：添加账户

配置完成后，在**添加账户**页面：

1. 填写用户名和密码
2. 点击**添加账户**按钮
3. 系统会自动：
   - 使用配置的登录地址打开登录窗口
   - 执行默认的自动填充和提交流程
   - 如果配置了默认脚本，在默认流程后执行
   - 获取Cookie并保存

## 配置文件结构

配置会保存在以下位置：

### 开发环境

```
/项目根目录/config.dev.json
```

### 生产环境

```
~/Library/Application Support/your-app-name/config.json  (macOS)
```

### 配置文件格式

```json
{
  "api": {
    "apiUrl": "https://api.example.com",
    "testApiUrl": "/ping"
  },
  "ssh": {
    "server": "",
    "port": 22,
    "user": "",
    "password": "",
    "useSshKey": false,
    "privateKey": ""
  },
  "account": {
    "loginUrl": "https://example.com/login",
    "defaultScript": "(async () => {\n  // 自定义脚本\n})();"
  }
}
```

## 内置工具函数

在默认执行脚本中可以使用以下工具函数：

### waitForElement(selector, timeout)

等待指定的DOM元素出现。

**参数：**

- `selector` (string): CSS选择器
- `timeout` (number, 可选): 超时时间（毫秒），默认10000

**返回：**

- Promise<Element>: 找到的DOM元素

**示例：**

```javascript
const button = await waitForElement('.my-button', 5000)
button.click()
```

## 常见问题

### Q1: 为什么要在系统设置中配置？

**A:** 统一配置避免每次添加账户时都要填写相同的登录地址和脚本，特别是当有多个账户需要登录同一个网站时，可以大大提高效率。

### Q2: 我可以为不同账户使用不同的脚本吗？

**A:** 当前版本只支持统一的默认脚本。如果不同账户需要不同的逻辑，建议在脚本中添加条件判断。未来版本可能会支持账户级别的自定义脚本。

### Q3: 配置保存后可以修改吗？

**A:** 可以。随时在系统设置中修改配置，修改后记得点击"保存配置"。已添加的账户不会受影响，新添加的账户会使用新配置。

### Q4: 默认执行脚本什么时候执行？

**A:** 在默认的自动登录流程（填充用户名、密码、勾选协议、提交表单）完成后执行。

### Q5: 如果不需要额外的自定义操作，是否可以不填默认执行脚本？

**A:** 是的，默认执行脚本是可选的。如果不填写，系统只会执行默认的自动登录流程，这对大多数场景已经足够。

## 注意事项

⚠️ **重要提示**：

1. **登录地址是必填项**：如果不配置登录地址，将无法添加账户
2. **脚本语法错误**：如果默认执行脚本有语法错误，可能导致登录失败
3. **异步操作**：建议使用 async/await 处理异步操作
4. **错误处理**：添加 try-catch 确保一个错误不影响整个流程
5. **调试方法**：开发环境下会自动打开DevTools，可以查看控制台日志

## 相关文档

- [自定义登录脚本使用文档](./CUSTOM_LOGIN_SCRIPT.md)
- [登录脚本示例](./LOGIN_SCRIPT_EXAMPLES.md)

## 变更记录

### v1.0.0 (当前版本)

- ✅ 新增系统级别的账户配置
- ✅ 支持统一的登录地址配置
- ✅ 支持统一的默认执行脚本配置
- ✅ 添加账户时自动从配置中读取
