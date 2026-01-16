# 系统配置功能说明

## 功能概述

系统设置页面提供了完整的配置管理功能，包括接口配置和SSH配置，所有配置都会持久化保存到本地存储。

## 配置项说明

### 第一部分：接口配置

- **接口地址**：API 服务的基础URL地址

### 第二部分：SSH 配置

- **Server 地址**：SSH 服务器的 IP 地址或域名
- **Port**：SSH 服务端口（默认 22）
- **User**：SSH 登录用户名
- **Password**：SSH 登录密码（当不使用 SSH Key 时）
- **Use SSH key**：是否使用 SSH 密钥认证
- **SSH 私钥**：当启用 SSH Key 时，可以粘贴私钥内容

## 使用说明

### 1. 配置接口地址

在"接口配置"卡片中输入您的 API 服务地址，例如：
```
https://api.example.com
```

### 2. 配置 SSH 连接

#### 使用密码认证

1. 输入 Server 地址（例如：192.168.1.100）
2. 输入 Port（默认 22）
3. 输入 User（用户名）
4. 输入 Password（密码）
5. 确保"Use SSH key"未勾选

#### 使用 SSH Key 认证

1. 输入 Server 地址和 Port
2. 输入 User（用户名）
3. 勾选"Use SSH key"
4. 在文本框中粘贴您的 SSH 私钥内容
5. 如果留空私钥，系统将使用 `~/.ssh/config` 中的配置

### 3. 保存配置

点击"保存配置"按钮，配置将自动保存到本地存储（localStorage），下次打开应用时会自动加载。

### 4. 测试连接

点击"测试连接"按钮可以测试 SSH 连接是否正常（功能待实现）。

### 5. 重置配置

点击"重置配置"按钮将所有配置恢复为默认值。

## 技术实现

### 数据持久化

使用 `localStorage` 进行配置持久化：
- 配置键名：`system_config`
- 存储格式：JSON
- 自动合并默认值，确保向后兼容

### 配置存储服务

位于 `src/renderer/src/stores/config.ts`：

```typescript
import { ConfigStore, type SystemConfig } from '@/stores/config'

// 加载配置
const config = ConfigStore.load()

// 保存配置
ConfigStore.save(config)

// 重置配置
ConfigStore.reset()

// 清除配置
ConfigStore.clear()
```

### 数据结构

```typescript
interface SystemConfig {
  api: {
    apiUrl: string
  }
  ssh: {
    server: string
    port: number
    user: string
    password: string
    useSshKey: boolean
    privateKey?: string
  }
}
```

## 安全建议

1. **密码安全**：目前密码存储在 localStorage 中，生产环境建议：
   - 使用加密存储
   - 考虑使用系统密钥链（Keychain/Keyring）
   - 实现主密码保护

2. **SSH Key 安全**：
   - 建议使用带密码保护的私钥
   - 考虑使用系统 SSH Agent
   - 生产环境应加密存储私钥

## 后续优化建议

1. **安全性增强**
   - 集成系统密钥链存储敏感信息
   - 实现配置导入/导出功能
   - 添加配置备份功能

2. **功能完善**
   - 实现真实的 SSH 连接测试
   - 添加连接历史记录
   - 支持多个 SSH 配置文件

3. **用户体验**
   - 添加表单验证
   - 改进错误提示
   - 添加配置模板

## 组件文件

- 配置页面：`src/renderer/src/views/Configuration.vue`
- 配置存储：`src/renderer/src/stores/config.ts`
- Checkbox 组件：`src/renderer/src/components/ui/checkbox/Checkbox.vue`
