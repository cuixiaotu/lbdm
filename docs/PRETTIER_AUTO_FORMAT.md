# Prettier 自动格式化配置指南

## 配置完成 ✅

项目已配置文件保存时自动进行 Prettier 格式化。

## 配置内容

### 1. VS Code 设置 (`.vscode/settings.json`)

已启用以下功能：

```json
{
  // 保存时自动格式化
  "editor.formatOnSave": true,

  // 粘贴时不自动格式化（避免干扰）
  "editor.formatOnPaste": false,

  // 保存时自动修复 ESLint 错误
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### 2. 支持的文件类型

已为以下文件类型配置 Prettier 格式化器：

- ✅ TypeScript (`.ts`, `.tsx`)
- ✅ JavaScript (`.js`, `.jsx`)
- ✅ Vue (`.vue`)
- ✅ JSON (`.json`)
- ✅ HTML (`.html`)
- ✅ CSS (`.css`)
- ✅ SCSS (`.scss`)
- ✅ Markdown (`.md`)

### 3. Prettier 规则 (`.prettierrc.yaml`)

当前项目的格式化规则：

```yaml
singleQuote: true # 使用单引号
semi: false # 不使用分号
printWidth: 100 # 每行最大字符数 100
trailingComma: none # 不使用尾随逗号
```

## 使用方法

### 自动格式化

1. **编辑文件**：在 VS Code 中编辑任何支持的文件类型
2. **保存文件**：按 `Cmd+S` (macOS) 或 `Ctrl+S` (Windows/Linux)
3. **自动格式化**：Prettier 会自动格式化文件并保存

### 手动格式化

如果需要手动格式化：

- **格式化当前文件**：
  - macOS: `Shift+Option+F`
  - Windows/Linux: `Shift+Alt+F`

- **格式化选中代码**：
  1. 选中需要格式化的代码
  2. 右键 → "格式化选区"

### 命令行格式化

在项目根目录运行：

```bash
# 检查所有文件的格式（不修改）
pnpm exec prettier --check "src/**/*.{js,ts,vue,json,css,scss,md}"

# 格式化所有文件
pnpm exec prettier --write "src/**/*.{js,ts,vue,json,css,scss,md}"
```

## 必需的 VS Code 插件

确保已安装以下插件：

1. **Prettier - Code formatter** (esbenp.prettier-vscode)
   - 提供 Prettier 格式化功能
   - [安装链接](vscode:extension/esbenp.prettier-vscode)

2. **Vue - Official** (Vue.volar) 或 **Vetur**
   - 提供 Vue 文件支持
   - [Vue 官方插件](vscode:extension/Vue.volar)

3. **ESLint** (dbaeumer.vscode-eslint)
   - 提供 ESLint 检查和修复
   - [安装链接](vscode:extension/dbaeumer.vscode-eslint)

### 安装插件

在 VS Code 中：

1. 按 `Cmd+Shift+X` (macOS) 或 `Ctrl+Shift+X` (Windows/Linux) 打开扩展面板
2. 搜索插件名称
3. 点击"安装"

## 验证配置

### 测试步骤

1. 打开任意 `.vue`、`.ts` 或 `.js` 文件
2. 故意打乱格式（如删除空格、添加多余空行）
3. 保存文件 (`Cmd+S` / `Ctrl+S`)
4. 文件应该自动格式化为统一风格

### 示例

**格式化前**：

```typescript
const data = { name: 'test', value: 123, items: [1, 2, 3] }
```

**格式化后**：

```typescript
const data = { name: 'test', value: 123, items: [1, 2, 3] }
```

## 常见问题

### Q1: 保存时没有自动格式化？

**解决方案**：

1. 检查是否安装了 Prettier 插件
2. 检查 VS Code 设置中是否启用了 `editor.formatOnSave`
3. 确认当前文件类型的默认格式化器是 Prettier
4. 重启 VS Code

### Q2: 格式化后代码被破坏？

**解决方案**：

1. 检查 `.prettierrc.yaml` 配置是否正确
2. 使用 `Cmd+Z` / `Ctrl+Z` 撤销格式化
3. 查看 Prettier 输出面板的错误信息

### Q3: Vue 文件格式化不正确？

**解决方案**：

1. 确保安装了 Vue 官方插件
2. 检查是否有多个格式化器冲突
3. 在 `.vscode/settings.json` 中明确设置 Vue 文件的格式化器

### Q4: 只想格式化特定文件？

**解决方案**：

编辑 `.prettierignore` 文件，添加不需要格式化的路径：

```
# 忽略的目录
node_modules/
dist/
out/

# 忽略的文件
*.min.js
*.min.css
```

## 项目集成

### Git Hooks (推荐)

项目已配置 `lint-staged`，在提交前自动格式化：

```json
{
  "lint-staged": {
    "*.{js,ts,vue,json,css,scss,md}": ["prettier --write", "git add"]
  }
}
```

### CI/CD 检查

在 CI/CD 流程中添加格式检查：

```bash
# 在 CI 中运行
pnpm exec prettier --check "src/**/*.{js,ts,vue,json,css,scss,md}"
```

## 最佳实践

1. ✅ **团队统一配置**：将 `.vscode/settings.json` 提交到代码库
2. ✅ **使用 `.prettierignore`**：排除不需要格式化的文件
3. ✅ **配合 ESLint**：Prettier 负责格式，ESLint 负责代码质量
4. ✅ **提交前检查**：使用 Git Hooks 确保代码风格统一
5. ✅ **定期更新**：保持 Prettier 和插件为最新版本

## 禁用自动格式化

如果某些情况下需要临时禁用自动格式化：

### 方法 1: 禁用单个文件

在文件顶部添加注释：

```javascript
// prettier-ignore-file
```

### 方法 2: 禁用代码块

```javascript
// prettier-ignore
const uglyCode = {a:1,b:2,c:3};
```

### 方法 3: 临时禁用保存时格式化

1. 打开命令面板：`Cmd+Shift+P` (macOS) 或 `Ctrl+Shift+P` (Windows/Linux)
2. 输入 "Format on Save"
3. 切换开关

## 相关文档

- [Prettier 官方文档](https://prettier.io/docs/en/)
- [VS Code 格式化文档](https://code.visualstudio.com/docs/editor/codebasics#_formatting)
- [项目代码规范](./CODE_STYLE.md)

---

**配置日期**: 2025-10-23
**维护者**: 开发团队
**状态**: ✅ 已激活
