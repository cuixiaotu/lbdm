# 修复：IPC 序列化错误

## 问题描述

保存配置时控制台报错：

```
Error: An object could not be cloned
```

## 问题原因

Vue 3 的响应式对象（通过 `ref` 创建）包含了无法被 Electron IPC 序列化的内部属性（如 Proxy、Symbol），导致结构化克隆失败。

## 解决方案

### 修改文件

- [`src/renderer/src/stores/config.ts`](../src/renderer/src/stores/config.ts)

### 具体修改

在 `ConfigStore.save()` 方法中添加响应式对象转换逻辑：

```typescript
import { toRaw } from 'vue'

static async save(config: SystemConfig): Promise<void> {
  try {
    // 使用 toRaw 转换响应式对象为纯对象，避免 IPC 序列化错误
    const rawConfig = toRaw(config)
    await window.api.config.save(rawConfig)
  } catch (error) {
    console.error('保存配置失败:', error)
    throw new Error('保存配置失败')
  }
}
```

### 优势

1. **统一处理**：在 Store 层统一处理转换，调用方无需关心
2. **类型安全**：保持 TypeScript 类型检查
3. **向后兼容**：不影响现有调用代码
4. **防患未然**：避免未来类似问题

## 测试验证

### 测试步骤

1. 打开系统设置页面
2. 填写配置信息（包括 SSH 配置）
3. 点击"保存配置"按钮
4. 检查控制台是否有错误
5. 检查配置文件是否正确保存

### 预期结果

- ✅ 不再出现 "An object could not be cloned" 错误
- ✅ 配置成功保存到本地文件
- ✅ 显示"配置保存成功！"提示

## 相关文档

- [故障排查指南 - IPC 通信相关问题](./TROUBLESHOOTING.md#错误an-object-could-not-be-cloned)
- [Vue 3 文档 - toRaw()](https://vuejs.org/api/reactivity-advanced.html#toraw)

---

**修复日期**: 2025-10-23
**修复者**: AI Assistant
**状态**: ✅ 已修复
