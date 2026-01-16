# 更新日志：开发环境配置文件

## 更新日期

2025-10-23

## 更新概述

实现开发环境和生产环境使用不同的配置文件存储位置，开发环境下配置文件保存在项目根目录并被 Git 忽略。

---

## 功能特性

### 1. 环境区分

#### 开发环境（未打包）

- **配置文件**: `config.dev.json`
- **存储位置**: 项目根目录
- **特点**:
  - ✅ 方便查看和编辑
  - ✅ 被 Git 忽略
  - ✅ 控制台显示路径
  - ✅ 可直接编辑测试

#### 生产环境（已打包）

- **配置文件**: `config.json`
- **存储位置**: 用户数据目录
  - macOS: `~/Library/Application Support/<app-name>/config.json`
  - Windows: `%APPDATA%/<app-name>/config.json`
  - Linux: `~/.config/<app-name>/config.json`
- **特点**:
  - ✅ 符合平台规范
  - ✅ 用户级别隔离
  - ✅ 卸载后可保留

### 2. Git 管理

#### .gitignore 规则

```gitignore
# Development configuration
config.dev.json
```

#### 示例文件

- `config.dev.example.json` - 配置模板（已提交）
- `config.dev.json` - 实际配置（被忽略）

---

## 技术实现

### 配置路径判断

**文件**: [`src/main/config/configManager.ts`](../src/main/config/configManager.ts)

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

### 实现要点

1. **使用 `app.isPackaged` 判断环境**
   - `true`: 生产环境（应用已打包）
   - `false`: 开发环境（源码运行）

2. **不同环境使用不同文件名**
   - 开发: `config.dev.json`
   - 生产: `config.json`

3. **开发环境调试信息**
   - 控制台输出配置文件路径
   - 便于开发者定位问题

---

## 代码变更

### 修改文件

1. **`src/main/config/configManager.ts`**
   - 添加环境判断逻辑
   - 根据环境选择不同路径
   - 添加开发模式日志

2. **`.gitignore`**
   - 添加 `config.dev.json` 忽略规则

### 新增文件

1. **`config.dev.example.json`**
   - 配置文件模板
   - 提供所有可配置字段示例

2. **`docs/DEV_CONFIG.md`**
   - 详细的开发环境配置指南
   - 使用说明和最佳实践

3. **`scripts/setup-dev-config.sh`**
   - Linux/macOS 配置设置脚本
   - 自动化配置文件初始化

4. **`scripts/setup-dev-config.bat`**
   - Windows 配置设置脚本
   - 与 Shell 脚本功能相同

5. **`README.md`** (更新)
   - 添加配置说明
   - 添加快速开始指南
   - 添加文档链接

---

## 使用方式

### 快速开始

**方法 1: 使用脚本（推荐）**

```bash
# Linux/macOS
./scripts/setup-dev-config.sh

# Windows
scripts\setup-dev-config.bat
```

**方法 2: 手动设置**

```bash
# 复制示例文件
cp config.dev.example.json config.dev.json

# 编辑配置
vim config.dev.json  # 或使用你喜欢的编辑器

# 启动开发环境
pnpm dev
```

### 配置示例

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

### 查看配置路径

启动应用后，控制台会输出：

```
[开发模式] 配置文件路径: /path/to/project/config.dev.json
```

---

## 优势

### 开发体验

| 特性     | 之前                | 现在              |
| -------- | ------------------- | ----------------- |
| 配置位置 | 用户数据目录        | 项目根目录        |
| 查找难度 | ⚠️ 需要查找系统目录 | ✅ 直接在项目中   |
| 编辑方式 | ⚠️ 需要找到文件位置 | ✅ 直接编辑       |
| 版本控制 | ⚠️ 容易误提交       | ✅ 自动忽略       |
| 团队协作 | ⚠️ 无模板参考       | ✅ 提供示例文件   |
| 调试信息 | ❌ 无               | ✅ 控制台输出路径 |

### 生产安全

| 特性     | 说明                      |
| -------- | ------------------------- |
| 路径隔离 | ✅ 开发和生产使用不同路径 |
| 符合规范 | ✅ 生产环境符合平台规范   |
| 用户隔离 | ✅ 多用户环境配置独立     |
| 数据保留 | ✅ 卸载应用后配置可保留   |

---

## 注意事项

### 1. 配置文件安全

**⚠️ 重要提醒**:

- `config.dev.json` 包含敏感信息（密码、密钥等）
- 确保该文件在 `.gitignore` 中
- 不要将真实密码提交到版本控制

**检查方法**:

```bash
# 确认文件被忽略
git status

# 如果出现在未跟踪文件中，说明配置有问题
```

### 2. 示例文件维护

**`config.dev.example.json` 维护规则**:

- ✅ 包含所有可配置字段
- ✅ 使用示例值，不要使用真实值
- ✅ 添加注释说明（如果需要）
- ✅ 与实际配置结构保持同步

### 3. 团队协作

**新成员加入流程**:

1. 克隆仓库
2. 运行 `./scripts/setup-dev-config.sh`
3. 编辑 `config.dev.json` 填入配置
4. 启动开发环境

**配置更新流程**:

1. 更新 `config.dev.example.json`
2. 提交到版本控制
3. 通知团队成员更新本地配置

---

## 兼容性

### Electron API

使用的 API 都是 Electron 标准 API，兼容所有 Electron 版本：

- `app.isPackaged` - Electron 1.0+
- `app.getPath('userData')` - Electron 1.0+
- `app.getAppPath()` - Electron 1.0+

### 平台支持

- ✅ macOS
- ✅ Windows
- ✅ Linux

所有平台都会自动使用正确的路径。

---

## 故障排查

### 问题 1: 配置文件被提交到 Git

**解决方案**:

```bash
# 从 Git 中移除
git rm --cached config.dev.json

# 确认 .gitignore 包含规则
grep "config.dev.json" .gitignore

# 如果没有，添加规则
echo "config.dev.json" >> .gitignore

# 提交更改
git add .gitignore
git commit -m "chore: ignore development config file"
```

### 问题 2: 找不到配置文件

**症状**: 控制台显示配置文件路径但文件不存在

**解决方案**:

```bash
# 方法 1: 使用脚本
./scripts/setup-dev-config.sh

# 方法 2: 手动复制
cp config.dev.example.json config.dev.json
```

### 问题 3: 生产环境仍使用开发配置

**症状**: 打包后的应用使用了开发环境的配置

**检查**:

1. 确认 `app.isPackaged` 返回 `true`
2. 检查打包配置是否正确
3. 查看应用日志中的配置路径

**注意**: 正常情况下不会发生，因为：

- 开发配置在项目根目录
- 打包后应用无法访问项目根目录

---

## 未来改进

### 1. 配置加密

为敏感字段添加加密：

```typescript
interface SecureConfig extends SystemConfig {
  _encrypted: boolean
}
```

### 2. 配置迁移工具

提供配置导入/导出功能：

```typescript
exportConfig(): Promise<string>
importConfig(data: string): Promise<void>
```

### 3. 配置验证

添加配置有效性检查：

```typescript
validateConfig(config: SystemConfig): ValidationResult
```

### 4. 多环境支持

支持更多环境：

```typescript
// config.dev.json - 开发环境
// config.test.json - 测试环境
// config.staging.json - 预发布环境
```

---

## 相关文档

- [开发环境配置指南](./DEV_CONFIG.md)
- [配置管理文档](./CONFIGURATION.md)
- [故障排查指南](./TROUBLESHOOTING.md)

---

## 测试清单

### 开发环境测试

- [ ] 配置文件保存到项目根目录
- [ ] 文件名为 `config.dev.json`
- [ ] 控制台输出配置文件路径
- [ ] 可以通过界面保存配置
- [ ] 可以手动编辑配置文件
- [ ] 重启后配置仍然有效
- [ ] `config.dev.json` 被 Git 忽略

### 生产环境测试

- [ ] 配置文件保存到用户数据目录
- [ ] 文件名为 `config.json`
- [ ] 各平台路径正确
- [ ] 首次运行使用默认配置
- [ ] 可以通过界面保存配置
- [ ] 升级后配置保留

### 团队协作测试

- [ ] 新成员可以使用脚本快速设置
- [ ] 示例文件包含所有字段
- [ ] 真实配置不会被提交
- [ ] 文档清晰易懂

---

**更新日期**: 2025-10-23
**更新者**: AI Assistant
**状态**: ✅ 已完成
