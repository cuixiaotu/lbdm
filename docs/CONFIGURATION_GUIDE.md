# 系统设置使用指南

## 功能已完成 ✅

系统设置页面已经完成，包含以下功能：

### 1. 接口配置
- ✅ 接口地址输入
- ✅ 数据持久化保存

### 2. SSH 配置
- ✅ Server 地址输入
- ✅ Port 输入（默认 22）
- ✅ User 用户名输入
- ✅ Password 密码输入
- ✅ Use SSH key 复选框
- ✅ SSH 私钥文本框（当启用 SSH Key 时显示）
- ✅ 数据持久化保存

### 3. 操作功能
- ✅ 保存配置按钮
- ✅ 测试连接按钮（功能占位）
- ✅ 重置配置按钮
- ✅ 保存成功/失败提示

## 文件说明

### 新增文件

1. **Checkbox 组件**
   - 文件：`src/renderer/src/components/ui/checkbox/Checkbox.vue`
   - 文件：`src/renderer/src/components/ui/checkbox/index.ts`
   - 说明：复选框 UI 组件，用于"Use SSH key"选项

2. **配置存储服务**
   - 文件：`src/renderer/src/stores/config.ts`
   - 说明：提供配置的加载、保存、重置功能
   - 接口：
     - `ConfigStore.load()` - 加载配置
     - `ConfigStore.save(config)` - 保存配置
     - `ConfigStore.reset()` - 重置为默认值
     - `ConfigStore.clear()` - 清除配置

3. **配置说明文档**
   - 文件：`docs/CONFIGURATION.md`
   - 说明：详细的配置功能说明和使用指南

### 修改文件

1. **系统设置页面**
   - 文件：`src/renderer/src/views/Configuration.vue`
   - 说明：完整的系统设置界面，包含所有配置项

## 数据结构

```typescript
interface SystemConfig {
  api: {
    apiUrl: string  // 接口地址
  }
  ssh: {
    server: string      // SSH 服务器地址
    port: number        // SSH 端口
    user: string        // 用户名
    password: string    // 密码
    useSshKey: boolean  // 是否使用 SSH Key
    privateKey?: string // SSH 私钥内容
  }
}
```

## 使用方法

### 在其他组件中使用配置

```typescript
import { ConfigStore } from '@/stores/config'

// 加载配置
const config = ConfigStore.load()

// 使用配置
console.log('API地址:', config.api.apiUrl)
console.log('SSH服务器:', config.ssh.server)

// 保存配置
config.api.apiUrl = 'https://new-api.example.com'
ConfigStore.save(config)
```

## 数据持久化

- 使用 `localStorage` 存储
- 键名：`system_config`
- 格式：JSON
- 自动加载：页面刷新后自动恢复配置

## 安全提示

当前密码和私钥存储在 localStorage 中，适合开发和测试。

生产环境建议：
1. 使用加密存储
2. 集成系统密钥链（Keychain/Keyring）
3. 实现主密码保护

## 后续优化

可以考虑的改进：
1. 添加表单验证（必填项、格式校验）
2. 实现真实的 SSH 连接测试
3. 支持多个配置 Profile
4. 配置导入/导出功能
5. 使用更安全的存储方式

## 测试

访问路径：导航到"系统设置"菜单项

测试步骤：
1. 输入接口地址
2. 配置 SSH 连接信息
3. 点击"保存配置"
4. 刷新页面，检查配置是否保留
5. 点击"重置配置"，检查是否恢复默认值
