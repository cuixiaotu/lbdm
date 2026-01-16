# 请求拦截正则配置说明

## 概述

新增"请求拦截正则"配置项,用于自定义拦截网络请求的URL模式,替代原来硬编码的 `*://*/*credentials*` 规则。

## 配置位置

在系统配置的"账户配置"卡片中,增加了"请求拦截正则"输入框,与"登录地址"和"默认执行脚本"并列。

## 配置说明

### 字段名称

- **配置键**: `requestFilterPattern`
- **类型**: `string`
- **必填**: 是

### 功能说明

该配置项用于匹配需要拦截Cookie的请求URL模式。当登录窗口中的网络请求URL匹配此模式时,系统会:

1. 拦截该请求
2. 获取请求的Cookie
3. 将Cookie保存到账户信息中
4. 关闭登录窗口

### URL模式规则

支持使用通配符 `*` 来匹配URL:

- `*` - 匹配任意字符(包括空字符)
- 支持多个 `*` 组合使用

### 常见示例

#### 1. 匹配包含特定关键词的URL

```
*://*/*credentials*
```

匹配任何包含 `credentials` 关键词的URL,例如:

- `https://api.example.com/auth/credentials`
- `http://example.com/api/credentials/verify`

#### 2. 匹配特定域名下的所有请求

```
*://api.example.com/*
```

匹配 `api.example.com` 域名下的所有请求。

#### 3. 匹配特定路径

```
*://*/api/login*
```

匹配任何域名下 `/api/login` 开头的路径。

#### 4. 匹配特定协议和域名

```
https://business.oceanengine.com/*
```

仅匹配 HTTPS 协议下 `business.oceanengine.com` 的请求。

#### 5. 精确匹配完整URL

```
https://api.example.com/auth/login/callback
```

精确匹配特定的完整URL。

## 配置方法

### 方法一:在系统配置页面设置

1. 打开应用,进入"系统配置"页面
2. 找到"账户配置"卡片
3. 在"请求拦截正则"输入框中填写URL模式
4. 点击"保存配置"

### 方法二:直接编辑配置文件

开发环境下编辑 `config.dev.json`:

```json
{
  "account": {
    "loginUrl": "https://example.com/login",
    "requestFilterPattern": "*://*/*credentials*",
    "defaultScript": "..."
  }
}
```

## 技术实现

### 类型定义

#### shared/ipc/types.ts

```typescript
export interface AccountConfig {
  /** 登录页面URL */
  loginUrl: string
  /** 默认执行的JavaScript代码 */
  defaultScript: string
  /** 请求拦截正则表达式 */
  requestFilterPattern: string
}

export interface OpenLoginWindowRequest {
  username: string
  password: string
  loginUrl: string
  customScript?: string
  /** 请求拦截正则表达式 */
  requestFilterPattern: string
}
```

### 主进程使用

#### main/services/loginWindowService.ts

```typescript
// 监听网络请求,使用配置的正则表达式
const filter = {
  urls: [options.requestFilterPattern]
}

// 拦截响应
windowSession.webRequest.onCompleted(filter, async (details) => {
  console.log('拦截到匹配的请求:', details.url)
  // ... 获取Cookie并处理
})
```

### 渲染进程使用

#### renderer/components/AccountAdd.vue

```typescript
// 从配置中读取请求拦截正则
const result = await window.api.account.openLoginWindow({
  username: newAccount.value.username,
  password: newAccount.value.password,
  loginUrl: config.value.account.loginUrl,
  requestFilterPattern: config.value.account.requestFilterPattern,
  customScript: config.value.account.defaultScript || undefined
})
```

## 默认值

### 开发环境默认值

```
*://*/*credentials*
```

该模式匹配任何包含 `credentials` 关键词的URL,适用于大多数登录场景。

## 调试技巧

### 1. 查看控制台日志

开发环境下,登录窗口会自动打开开发者工具,可以在控制台查看:

```
拦截到匹配的请求: https://api.example.com/auth/credentials
```

### 2. 使用Network面板

在登录窗口的开发者工具中:

1. 打开 Network 面板
2. 执行登录操作
3. 查看哪些请求被发送
4. 确认需要拦截的请求URL模式

### 3. 测试不同的模式

可以在配置中尝试不同的URL模式,观察哪个模式能成功拦截到Cookie:

```
*://*/*credentials*     // 匹配包含 credentials 的URL
*://*/*auth*            // 匹配包含 auth 的URL
*://*/api/login*        // 匹配 /api/login 开头的路径
```

## 常见问题

### Q: 为什么没有拦截到Cookie?

A: 可能的原因:

1. URL模式不匹配 - 检查实际请求的URL格式
2. 请求时机不对 - Cookie可能在其他请求中返回
3. 需要更宽泛的模式 - 尝试使用 `*` 来匹配更多情况

### Q: 可以配置多个拦截规则吗?

A: 当前版本只支持单个模式。如需匹配多种URL,可以使用更宽泛的通配符,例如:

```
*://api.example.com/*
```

### Q: 如何确定应该拦截哪个URL?

A:

1. 在登录窗口打开开发者工具
2. 切换到 Network 面板
3. 执行登录操作
4. 查找返回Cookie的请求
5. 复制该请求的URL格式作为模式

### Q: 正则表达式支持吗?

A: 不支持正则表达式,只支持简单的通配符 `*`。这是Electron的 `webRequest.onCompleted` API的限制。

## 注意事项

1. **必填项**: 请求拦截正则是必填项,未配置时无法添加账户
2. **大小写敏感**: URL模式匹配是大小写敏感的
3. **协议匹配**: 注意区分 `http://` 和 `https://`
4. **性能考虑**: 过于宽泛的模式(如 `*`)可能会拦截所有请求,影响性能
5. **安全性**: 确保只拦截必要的请求,避免泄露其他敏感信息

## 最佳实践

1. **优先使用精确模式**: 能精确匹配就不要使用通配符
2. **包含关键路径**: 在模式中包含登录相关的关键路径,如 `/auth/`, `/login/`, `/credentials/`
3. **测试后再使用**: 在开发环境充分测试后再应用到生产环境
4. **记录实际URL**: 记录实际拦截到的URL,便于后续优化模式

## 示例配置

### 示例1: 某电商平台

```json
{
  "account": {
    "loginUrl": "https://business.example.com/login",
    "requestFilterPattern": "*://*/api/auth/credentials*",
    "defaultScript": "..."
  }
}
```

### 示例2: 某广告平台

```json
{
  "account": {
    "loginUrl": "https://ads.platform.com/login",
    "requestFilterPattern": "*://*/sso/login/callback*",
    "defaultScript": "..."
  }
}
```

### 示例3: 通用模式

```json
{
  "account": {
    "loginUrl": "https://example.com/login",
    "requestFilterPattern": "*://*/*credentials*",
    "defaultScript": "..."
  }
}
```

## 相关文档

- [配置文件使用指南](./CONFIG_SETUP_GUIDE.md)
- [登录脚本重构说明](./LOGIN_SCRIPT_REFACTOR.md)
- [账户配置指南](./ACCOUNT_CONFIG_GUIDE.md)

## 更新日志

- **2025-01-XX**: 新增请求拦截正则配置项,替代硬编码的URL模式
