# 开发环境配置文件管理

## 概述

本项目的配置文件在开发环境和生产环境下使用不同的存储位置：

- **开发环境**：配置文件保存在项目根目录下的 `config.dev.json`，方便开发调试
- **生产环境**：配置文件保存在用户数据目录下的 `config.json`，符合桌面应用规范

---

## 配置文件位置

### 开发环境（未打包）

**文件路径**: `项目根目录/config.dev.json`

**示例路径**:

```
/Users/yourname/Workspace/project/config.dev.json
```

**特点**:

- ✅ 位于项目根目录，方便查看和编辑
- ✅ 被 Git 忽略，不会提交到版本控制
- ✅ 控制台输出配置文件路径，便于调试
- ✅ 可以直接编辑文件来测试不同配置

### 生产环境（已打包）

**文件路径**: 用户数据目录下的 `config.json`

**各平台路径**:

- **macOS**: `~/Library/Application Support/<app-name>/config.json`
- **Windows**: `%APPDATA%/<app-name>/config.json`
- **Linux**: `~/.config/<app-name>/config.json`

**特点**:

- ✅ 符合各平台的应用数据存储规范
- ✅ 用户卸载应用后配置仍可保留
- ✅ 多用户环境下配置隔离

---

## Git 忽略规则

### .gitignore 配置

```gitignore
# Development configuration
config.dev.json
```

**说明**:

- `config.dev.json` 被 Git 忽略，不会提交到仓库
- `config.dev.example.json` 是示例文件，会提交到仓库供参考

---

## 使用指南

### 1. 开发环境配置

#### 首次使用

1. **复制示例配置文件**:

   ```bash
   cp config.dev.example.json config.dev.json
   ```

2. **编辑配置文件**:

   ```json
   {
     "api": {
       "apiUrl": "https://your-api.example.com",
       "testApi": "https://test-api.example.com"
     },
     "ssh": {
       "server": "192.168.1.100",
       "port": 22,
       "user": "admin",
       "password": "your-password",
       "useSshKey": false,
       "privateKey": ""
     }
   }
   ```

3. **启动开发环境**:

   ```bash
   pnpm dev
   ```

4. **查看配置文件路径**:
   控制台会输出：
   ```
   [开发模式] 配置文件路径: /path/to/project/config.dev.json
   ```

#### 通过应用界面配置

1. 启动应用后，打开"系统设置"页面
2. 填写各项配置
3. 点击"保存配置"
4. 配置自动保存到 `config.dev.json`

### 2. 查看配置文件

**方法 1: 通过应用界面**

- 打开"系统设置"页面
- 页面顶部显示配置文件路径

**方法 2: 控制台查看**

- 启动应用时控制台会输出配置文件路径

**方法 3: 直接打开文件**

```bash
# macOS/Linux
cat config.dev.json

# Windows
type config.dev.json
```

### 3. 手动编辑配置

您可以直接编辑 `config.dev.json` 文件：

```json
{
  "api": {
    "apiUrl": "https://api.example.com",
    "testApi": "https://test-api.example.com"
  },
  "ssh": {
    "server": "192.168.1.100",
    "port": 22,
    "user": "admin",
    "password": "your-password",
    "useSshKey": false,
    "privateKey": ""
  }
}
```

**注意事项**:

- ✅ 修改后重启应用生效
- ✅ 确保 JSON 格式正确
- ✅ 敏感信息不要提交到 Git

### 4. 重置配置

**方法 1: 通过应用界面**

- 打开"系统设置"页面
- 点击"重置配置"按钮
- 确认后恢复为默认值

**方法 2: 删除配置文件**

```bash
rm config.dev.json
```

重启应用后会使用默认配置。

---

## 实现原理

### 配置路径判断

```typescript
constructor() {
  // 开发环境下使用项目根目录，生产环境使用用户数据目录
  if (app.isPackaged) {
    // 生产环境：使用用户数据目录
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'config.json')
  } else {
    // 开发环境：使用项目根目录
    const rootPath = app.getAppPath()
    this.configPath = path.join(rootPath, 'config.dev.json')
  }

  this.config = this.loadConfig()

  // 开发环境下输出配置文件路径
  if (!app.isPackaged) {
    console.log(`[开发模式] 配置文件路径: ${this.configPath}`)
  }
}
```

### 判断依据

- **`app.isPackaged`**: Electron 提供的 API，判断应用是否已打包
  - `true`: 生产环境（已打包）
  - `false`: 开发环境（未打包）

- **`app.getAppPath()`**: 获取应用根目录
  - 开发环境：返回项目根目录
  - 生产环境：返回 ASAR 包目录

- **`app.getPath('userData')`**: 获取用户数据目录
  - 各平台自动适配正确的路径

---

## 配置文件结构

### 完整配置示例

```json
{
  "api": {
    "apiUrl": "https://api.example.com",
    "testApi": "https://test-api.example.com"
  },
  "ssh": {
    "server": "192.168.1.100",
    "port": 22,
    "user": "admin",
    "password": "your-password",
    "useSshKey": false,
    "privateKey": "/path/to/private/key"
  }
}
```

### 字段说明

#### API 配置

| 字段      | 类型   | 必填 | 说明         |
| --------- | ------ | ---- | ------------ |
| `apiUrl`  | string | ✅   | 接口地址     |
| `testApi` | string | ❌   | 测试接口地址 |

#### SSH 配置

| 字段         | 类型    | 必填 | 说明                |
| ------------ | ------- | ---- | ------------------- |
| `server`     | string  | ❌   | SSH 服务器地址      |
| `port`       | number  | ❌   | SSH 端口（默认 22） |
| `user`       | string  | ❌   | 用户名              |
| `password`   | string  | ❌   | 密码                |
| `useSshKey`  | boolean | ❌   | 是否使用 SSH 密钥   |
| `privateKey` | string  | ❌   | 私钥内容或路径      |

---

## 最佳实践

### 1. 开发环境

**✅ 推荐做法**:

- 使用 `config.dev.json` 存储本地配置
- 将 `config.dev.json` 添加到 `.gitignore`
- 提供 `config.dev.example.json` 作为模板
- 在 README 中说明配置方法

**❌ 避免做法**:

- 将包含真实密码的配置文件提交到 Git
- 在代码中硬编码配置信息
- 删除 `.gitignore` 中的配置文件规则

### 2. 团队协作

**配置共享**:

```bash
# 新成员加入时
cp config.dev.example.json config.dev.json
# 然后编辑 config.dev.json 填入自己的配置
```

**敏感信息管理**:

- 使用环境变量存储敏感信息
- 使用密钥管理工具（如 1Password、Keychain）
- 定期更换密码和密钥

### 3. 生产部署

**打包前检查**:

- ✅ 确认 `config.dev.json` 未被打包
- ✅ 确认应用使用用户数据目录
- ✅ 测试首次运行时的默认配置

**用户配置迁移**:

- 提供配置导入/导出功能
- 版本升级时合并默认配置
- 提供配置重置功能

---

## 故障排查

### 问题 1: 配置文件未生效

**症状**: 修改配置文件后应用仍使用旧配置

**解决方案**:

1. 确认是否重启了应用
2. 检查控制台输出的配置文件路径
3. 验证 JSON 格式是否正确
4. 查看应用是否有权限读写文件

### 问题 2: 找不到配置文件

**症状**: 应用提示无法加载配置

**解决方案**:

1. 检查 `config.dev.json` 是否存在
2. 复制 `config.dev.example.json` 为 `config.dev.json`
3. 确认文件路径与控制台输出一致

### 问题 3: 配置被提交到 Git

**症状**: `config.dev.json` 出现在 Git 状态中

**解决方案**:

```bash
# 从 Git 中移除
git rm --cached config.dev.json

# 确认 .gitignore 包含规则
echo "config.dev.json" >> .gitignore

# 提交更改
git add .gitignore
git commit -m "chore: ignore development config file"
```

### 问题 4: 生产环境找不到配置

**症状**: 打包后的应用无法保存配置

**解决方案**:

1. 确认应用有用户数据目录的写权限
2. 检查 `app.getPath('userData')` 返回的路径
3. 查看应用日志中的错误信息

---

## 配置文件迁移

### 从开发到生产

开发环境的配置不会自动迁移到生产环境。用户需要：

1. 在生产环境中打开"系统设置"
2. 重新填写配置信息
3. 保存到用户数据目录

### 从旧版本升级

配置管理器会自动合并新字段的默认值：

```typescript
// 合并默认配置，确保新增字段有默认值
return {
  api: { ...defaultConfig.api, ...loadedConfig.api },
  ssh: { ...defaultConfig.ssh, ...loadedConfig.ssh }
}
```

---

## 相关文件

- [`src/main/config/configManager.ts`](../src/main/config/configManager.ts) - 配置管理器实现
- [`config.dev.example.json`](../config.dev.example.json) - 配置文件模板
- [`.gitignore`](../.gitignore) - Git 忽略规则
- [`docs/CONFIGURATION.md`](./CONFIGURATION.md) - 配置管理文档

---

## FAQ

### Q: 为什么开发环境使用项目根目录？

**A**: 方便开发调试：

- 可以直接查看和编辑配置文件
- 无需查找用户数据目录
- 便于快速切换配置测试
- 与代码在同一位置，方便管理

### Q: 生产环境为什么不能使用项目根目录？

**A**: 安全和规范原因：

- 应用安装目录通常是只读的
- 用户数据应该存储在用户目录
- 符合各平台的应用规范
- 方便卸载和升级

### Q: 如何在开发环境使用生产环境的配置路径？

**A**: 修改代码强制使用用户数据目录：

```typescript
// 临时修改构造函数
constructor() {
  const userDataPath = app.getPath('userData')
  this.configPath = path.join(userDataPath, 'config.json')
  this.config = this.loadConfig()
}
```

### Q: 配置文件可以加密吗？

**A**: 可以，建议对敏感字段加密：

```typescript
// 保存时加密
const encryptedPassword = encrypt(config.ssh.password)

// 读取时解密
const password = decrypt(loadedConfig.ssh.password)
```

---

**创建日期**: 2025-10-23
**更新日期**: 2025-10-23
**维护者**: 开发团队
**状态**: ✅ 已实现
