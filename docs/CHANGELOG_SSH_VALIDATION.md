# SSH 条件验证功能更新日志

## 更新日期

2025-10-23

## 更新概述

为系统设置页面的 SSH 配置添加了条件验证功能，当用户填写 SSH Server 地址后，相关字段自动变为必填。

---

## 新增功能

### 1. SSH 条件验证规则

#### 验证逻辑

- **未填写 Server 时**：所有 SSH 字段均为非必填，可以留空保存
- **填写 Server 后**：以下字段变为必填
  - Port (端口)
  - User (用户名)
  - 认证方式：Password 或 SSH Key 二选一必填

#### 认证方式验证

- 如果未勾选 "Use SSH key"：Password 必填
- 如果勾选了 "Use SSH key"：SSH 私钥必填
- 两者至少填写一个

### 2. 动态 UI 提示

#### 必填标识

- Server 不为空时，Port 和 User 显示红色星号 `*`
- Password 字段：仅当 Server 不为空且未勾选 SSH Key 时显示星号
- SSH 私钥：仅当 Server 不为空且勾选了 SSH Key 时显示星号
- Server 字段旁显示橙色提示："(填写后其他字段必填)"

#### 错误反馈

- 错误边框：验证失败的输入框显示红色边框
- 错误文字：在输入框下方显示具体错误信息
- 实时清除：用户输入时自动清除对应字段的错误提示

### 3. 新增错误类型

```typescript
errors: {
  sshPort: string // Port 验证错误
  sshUser: string // User 验证错误
  sshAuth: string // 认证方式验证错误
}
```

---

## 代码变更

### 修改文件

- [`src/renderer/src/views/Configuration.vue`](../src/renderer/src/views/Configuration.vue)

### 新增函数

#### `validateSshConfig()`

```typescript
const validateSshConfig = (): boolean => {
  // 如果没有填写 server，则不验证 SSH 配置
  if (!server) return true

  // 验证 Port、User、认证方式
  // 返回验证结果
}
```

### 修改函数

#### `saveConfig()`

```typescript
const saveConfig = async (): Promise<void> => {
  // 验证接口地址
  if (!validateApiUrl()) return

  // 新增：验证 SSH 配置
  if (!validateSshConfig()) {
    saveMessage.value = '请完善 SSH 配置信息'
    return
  }

  // 保存配置
}
```

#### `clearError()`

```typescript
// 扩展支持的错误字段
const clearError = (
  field: 'apiUrl' | 'testApi' | 'sshServer' | 'sshPort' | 'sshUser' | 'sshAuth'
): void => {
  errors.value[field] = ''
}
```

### UI 模板变更

#### 1. 条件必填标识

```vue
<!-- Port -->
<label>
  Port
  <span v-if="config.ssh.server.trim()" class="text-red-500 ml-1">*</span>
</label>

<!-- User -->
<label>
  User
  <span v-if="config.ssh.server.trim()" class="text-red-500 ml-1">*</span>
</label>

<!-- Password -->
<label>
  Password
  <span v-if="config.ssh.server.trim() && !config.ssh.useSshKey"
        class="text-red-500 ml-1">*</span>
</label>

<!-- SSH 私钥 -->
<label>
  SSH 私钥
  <span v-if="config.ssh.server.trim()" class="text-red-500 ml-1">*</span>
</label>
```

#### 2. 错误边框和提示

```vue
<!-- Port 输入框 -->
<Input
  v-model.number="config.ssh.port"
  :class="errors.sshPort ? 'border-red-500' : ''"
  @input="clearError('sshPort')"
/>
<p v-if="errors.sshPort" class="text-xs text-red-500 mt-1">
  {{ errors.sshPort }}
</p>

<!-- Password 输入框 -->
<Input
  v-model="config.ssh.password"
  :disabled="config.ssh.useSshKey"
  :class="errors.sshAuth && !config.ssh.useSshKey ? 'border-red-500' : ''"
  @input="clearError('sshAuth')"
/>

<!-- 私钥 textarea -->
<textarea
  v-model="config.ssh.privateKey"
  :class="['...', errors.sshAuth && config.ssh.useSshKey ? 'border-red-500' : 'border-input']"
  @input="clearError('sshAuth')"
/>

<!-- 统一认证错误提示 -->
<p v-if="errors.sshAuth" class="text-xs text-red-500 mt-1">
  {{ errors.sshAuth }}
</p>
```

#### 3. Server 提示信息

```vue
<label>
  Server 地址
  <span v-if="config.ssh.server.trim()" class="text-orange-500 ml-1 text-xs">
    (填写后其他字段必填)
  </span>
</label>
```

---

## 文档更新

### 新增文档

- [`docs/SSH_VALIDATION_TEST_SCENARIOS.md`](./SSH_VALIDATION_TEST_SCENARIOS.md) - SSH 验证测试场景

### 更新文档

- [`docs/FORM_VALIDATION.md`](./FORM_VALIDATION.md) - 表单验证规则文档
  - 更新 SSH 配置验证规则
  - 添加条件验证说明
  - 更新验证函数示例
  - 扩展错误消息列表

---

## 错误消息

| 字段     | 错误消息                           | 触发条件                    |
| -------- | ---------------------------------- | --------------------------- |
| SSH Port | "Port 为必填项"                    | Server 不为空且 Port ≤ 0    |
| SSH User | "User 为必填项"                    | Server 不为空且 User 为空   |
| SSH 认证 | "Password 或 SSH Key 至少填写一个" | Server 不为空且两者都未填写 |
| 保存失败 | "请完善 SSH 配置信息"              | 保存时 SSH 验证失败         |

---

## 测试建议

### 手动测试场景

1. ✅ Server 为空时保存成功
2. ✅ Server 不为空但缺少 User 时保存失败
3. ✅ Server 不为空但缺少认证方式时保存失败
4. ✅ Server 不为空且所有必填项填写后保存成功
5. ✅ 密码认证和 SSH Key 认证切换正常
6. ✅ 实时错误清除功能正常

详细测试场景请参考：[SSH_VALIDATION_TEST_SCENARIOS.md](./SSH_VALIDATION_TEST_SCENARIOS.md)

---

## 用户体验改进

### 视觉反馈

- ✅ 红色星号明确标识必填字段
- ✅ 橙色提示说明条件验证规则
- ✅ 红色边框突出显示错误字段
- ✅ 错误文字提供具体错误原因

### 交互优化

- ✅ 动态显示/隐藏必填标识
- ✅ 输入时实时清除错误提示
- ✅ Password 字段根据 SSH Key 状态自动禁用/启用
- ✅ 友好的错误提示信息

### 逻辑优化

- ✅ 条件验证避免过度限制
- ✅ 支持完全空配置（不使用 SSH）
- ✅ 支持部分配置（填写 Server 后必须完整）
- ✅ 认证方式二选一灵活设计

---

## 向后兼容性

### 兼容性说明

- ✅ 不影响现有配置数据结构
- ✅ 不影响其他表单验证逻辑
- ✅ 不影响配置保存和加载功能
- ✅ 新增验证不会破坏现有功能

### 迁移说明

无需迁移，功能为向后兼容的增强。

---

## 已知问题

无

---

## 未来改进方向

1. **URL 格式验证**：验证接口地址是否为有效的 URL
2. **端口范围验证**：验证端口号是否在 1-65535 范围内
3. **IP 地址格式验证**：验证 Server 地址格式（如果是 IP）
4. **SSH 连接测试**：实现真实的 SSH 连接测试功能
5. **配置模板**：提供常用 SSH 配置模板

---

## 相关链接

- [表单验证规则文档](./FORM_VALIDATION.md)
- [SSH 验证测试场景](./SSH_VALIDATION_TEST_SCENARIOS.md)
- [配置管理文档](./CONFIGURATION.md)

---

**更新者**: AI Assistant
**审核者**: 待审核
**状态**: ✅ 已完成
