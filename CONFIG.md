# 配置文件快速入门

## 🚀 快速开始

### 1. 复制示例配置

```bash
cp config.dev.example.json config.dev.json
```

### 2. 编辑配置

打开 `config.dev.json`,根据实际情况修改:

```json
{
  "api": {
    "apiUrl": "你的正式API地址",
    "testApiUrl": "你的测试API地址"
  },
  "ssh": {
    "server": "SSH服务器地址",
    "port": 22,
    "user": "用户名",
    "password": "",
    "useSshKey": false,
    "privateKey": ""
  },
  "account": {
    "loginUrl": "登录页面URL",
    "defaultScript": "自动登录脚本(JavaScript)"
  }
}
```

### 3. 启动应用

```bash
pnpm dev
```

## 📝 重要说明

- ✅ `config.dev.json` 已被 `.gitignore` 忽略,可以安全地存储本地配置
- ✅ `config.dev.example.json` 是示例文件,包含完整的配置模板
- ✅ 也可以在应用的"系统配置"页面中进行可视化配置
- ✅ 自动登录脚本支持使用 `${options.username}` 和 `${options.password}` 占位符

## 📚 详细文档

查看 [docs/CONFIG_SETUP_GUIDE.md](./docs/CONFIG_SETUP_GUIDE.md) 了解更多配置详情。

## 🔒 安全提醒

- 不要将包含真实密码的配置文件提交到版本控制系统
- 生产环境建议使用 SSH 密钥认证而非密码
- 团队协作时只共享示例文件 `config.dev.example.json`
