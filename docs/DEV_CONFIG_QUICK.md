# 开发环境配置文件 - 快速参考

## 🚀 快速开始

```bash
# 1. 设置配置文件
./scripts/setup-dev-config.sh  # Linux/macOS
# 或
scripts\setup-dev-config.bat   # Windows

# 2. 编辑配置
vim config.dev.json

# 3. 启动开发
pnpm dev
```

---

## 📁 文件位置

| 环境 | 文件名            | 位置         |
| ---- | ----------------- | ------------ |
| 开发 | `config.dev.json` | 项目根目录   |
| 生产 | `config.json`     | 用户数据目录 |

---

## 📝 配置示例

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

---

## ✅ 检查清单

- [ ] 已运行设置脚本或手动复制示例文件
- [ ] 已编辑 `config.dev.json` 填入配置
- [ ] 确认 `config.dev.json` 在 `.gitignore` 中
- [ ] 启动应用，检查控制台显示的配置路径

---

## 🔗 详细文档

- [完整配置指南](./DEV_CONFIG.md)
- [更新日志](./CHANGELOG_DEV_CONFIG.md)

---

## ⚠️ 注意事项

1. **不要提交真实配置**: `config.dev.json` 包含敏感信息
2. **使用示例文件**: 新成员参考 `config.dev.example.json`
3. **检查 Git 状态**: 确保配置文件被忽略

```bash
# 检查文件是否被忽略
git status
```

---

**快速链接**: [README](../README.md) | [文档首页](./README.md)
