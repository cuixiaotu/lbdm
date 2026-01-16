# 请求拦截正则配置 - 更新说明

## 更新概述

本次更新将登录窗口服务中硬编码的请求拦截规则 `*://*/*credentials*` 改为可配置项,通过系统配置管理。

## 修改文件列表

### 1. 类型定义

#### `src/shared/ipc/types.ts`

- ✅ 在 `AccountConfig` 接口中添加 `requestFilterPattern: string` 字段
- ✅ 在 `OpenLoginWindowRequest` 接口中添加 `requestFilterPattern: string` 字段

### 2. 主进程

#### `src/main/services/loginWindowService.ts`

- ✅ 在 `LoginWindowOptions` 接口中添加 `requestFilterPattern: string` 字段
- ✅ 修改 `filter.urls` 使用 `options.requestFilterPattern` 替代硬编码值

修改前:

```typescript
const filter = {
  urls: ['*://*/*credentials*'] // 匹配包含 credentials 的 URL
}
```

修改后:

```typescript
const filter = {
  urls: [options.requestFilterPattern]
}
```

#### `src/main/config/configManager.ts`

- ✅ 在 `AccountConfig` 接口中添加 `requestFilterPattern: string` 字段
- ✅ 在默认配置中添加 `requestFilterPattern: '*://*/*credentials*'`

### 3. 渲染进程

#### `src/renderer/src/stores/config.ts`

- ✅ 在默认配置中添加 `requestFilterPattern: '*://*/*credentials*'`

#### `src/renderer/src/views/Configuration.vue`

- ✅ 在配置初始化中添加 `requestFilterPattern` 字段
- ✅ 在"账户配置"卡片中添加"请求拦截正则"输入框(必填项)
- ✅ 添加输入框提示文本,说明URL模式规则

界面位置:

```
系统配置 > 账户配置
├── 登录地址 (*)
├── 请求拦截正则 (*) <- 新增
└── 默认执行脚本
```

#### `src/renderer/src/components/AccountAdd.vue`

- ✅ 添加请求拦截正则配置检查
- ✅ 在调用 `openLoginWindow` 时传递 `requestFilterPattern` 参数

修改前:

```typescript
const result = await window.api.account.openLoginWindow({
  username: newAccount.value.username,
  password: newAccount.value.password,
  loginUrl: config.value.account.loginUrl,
  customScript: config.value.account.defaultScript || undefined
})
```

修改后:

```typescript
const result = await window.api.account.openLoginWindow({
  username: newAccount.value.username,
  password: newAccount.value.password,
  loginUrl: config.value.account.loginUrl,
  requestFilterPattern: config.value.account.requestFilterPattern,
  customScript: config.value.account.defaultScript || undefined
})
```

### 4. 配置文件

#### `config.dev.example.json`

- ✅ 在 `account` 配置中添加 `requestFilterPattern: "*://*/*credentials*"`

## 配置项说明

### requestFilterPattern (请求拦截正则)

- **类型**: `string`
- **必填**: 是
- **默认值**: `*://*/*credentials*`
- **说明**: 用于匹配需要拦截Cookie的请求URL模式,支持通配符 `*`

### 常见URL模式示例

```javascript
// 1. 匹配包含特定关键词
'*://*/*credentials*' // 包含 credentials
'*://*/*auth*' // 包含 auth
'*://*/*login*' // 包含 login

// 2. 匹配特定域名
'*://api.example.com/*' // api.example.com 下所有请求
'https://business.oceanengine.com/*' // 特定域名HTTPS请求

// 3. 匹配特定路径
'*://*/api/login*' // 所有域名下 /api/login 开头的路径
'*://*/sso/callback*' // 所有域名下 /sso/callback 开头的路径

// 4. 精确匹配
'https://api.example.com/auth/credentials' // 完整URL匹配
```

## 使用流程

### 1. 配置请求拦截正则

在系统配置页面:

1. 打开"系统配置"
2. 找到"账户配置"卡片
3. 填写"请求拦截正则"(必填)
4. 保存配置

### 2. 如何确定拦截URL模式

1. 打开登录窗口(开发环境会自动打开DevTools)
2. 切换到 Network 面板
3. 执行登录操作
4. 查找返回Cookie的请求
5. 复制URL格式作为模式

### 3. 测试配置

1. 在系统配置中设置URL模式
2. 添加测试账户
3. 观察控制台日志:
   ```
   拦截到匹配的请求: https://api.example.com/auth/credentials
   获取到 Cookie: sessionId=xxx; token=yyy
   ```

## 验证检查

### 配置验证

在添加账户时,会检查以下必填配置:

```typescript
// 1. 检查登录地址
if (!config.value.account.loginUrl) {
  // 提示: 请先在系统配置中设置登录地址
}

// 2. 检查请求拦截正则
if (!config.value.account.requestFilterPattern) {
  // 提示: 请先在系统配置中设置请求拦截正则
}
```

### 类型安全

所有修改都保持了TypeScript类型安全:

```typescript
// shared/ipc/types.ts
export interface AccountConfig {
  loginUrl: string
  defaultScript: string
  requestFilterPattern: string // 新增,必填
}

export interface OpenLoginWindowRequest {
  username: string
  password: string
  loginUrl: string
  requestFilterPattern: string // 新增,必填
  customScript?: string
}
```

## 向后兼容

### 默认值处理

如果旧配置文件中缺少 `requestFilterPattern`,系统会自动使用默认值:

```typescript
account: {
  ...defaultConfig.account,
  ...(loadedConfig.account || {})
}
```

默认值为: `*://*/*credentials*`

### 配置迁移

旧配置文件格式:

```json
{
  "account": {
    "loginUrl": "https://example.com/login",
    "defaultScript": "..."
  }
}
```

新配置文件格式:

```json
{
  "account": {
    "loginUrl": "https://example.com/login",
    "requestFilterPattern": "*://*/*credentials*",
    "defaultScript": "..."
  }
}
```

## 测试建议

### 1. 功能测试

- [ ] 在系统配置中设置请求拦截正则
- [ ] 保存配置并验证配置文件已更新
- [ ] 添加测试账户,验证Cookie拦截功能
- [ ] 测试不同的URL模式是否正确匹配

### 2. 边界测试

- [ ] 测试空值处理(必填项验证)
- [ ] 测试特殊字符(如 `*`, `/`, `?`)
- [ ] 测试过长的URL模式
- [ ] 测试配置文件缺失字段的降级处理

### 3. 兼容性测试

- [ ] 测试旧配置文件的加载和迁移
- [ ] 测试不同浏览器内核的URL匹配规则
- [ ] 测试HTTP和HTTPS协议匹配

## 注意事项

1. **必填项**: `requestFilterPattern` 是必填项,未配置时无法添加账户
2. **通配符规则**: 只支持 `*` 通配符,不支持正则表达式
3. **大小写敏感**: URL模式匹配是大小写敏感的
4. **性能影响**: 避免使用过于宽泛的模式(如单独的 `*`)
5. **调试工具**: 开发环境下会自动打开DevTools便于调试

## 相关文档

- [请求拦截正则配置详细说明](./REQUEST_FILTER_CONFIG.md)
- [配置文件使用指南](./CONFIG_SETUP_GUIDE.md)
- [登录脚本重构说明](./LOGIN_SCRIPT_REFACTOR.md)

## 总结

本次更新实现了请求拦截规则的配置化管理,提升了系统的灵活性和可维护性:

✅ **灵活性提升**: 用户可以根据不同平台自定义拦截规则
✅ **代码解耦**: 业务规则与代码分离
✅ **类型安全**: 完整的TypeScript类型支持
✅ **向后兼容**: 保持旧配置文件的兼容性
✅ **用户友好**: 清晰的UI提示和验证机制
