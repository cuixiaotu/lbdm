# SSH 条件验证测试场景

## 概述

本文档描述了 SSH 配置的条件验证测试场景，确保验证逻辑正确实现。

## 验证规则总结

### 基本原则

- **未填写 Server 地址时**：所有 SSH 字段均为非必填，可以保存
- **填写了 Server 地址后**：Port、User、认证方式（Password 或 SSH Key）变为必填

### 必填字段（当 Server 不为空时）

1. **Port**：必须大于 0
2. **User**：不能为空字符串
3. **认证方式**：Password 或 SSH Key 至少填写一个
   - 如果未勾选 "Use SSH key"：Password 必填
   - 如果勾选了 "Use SSH key"：SSH 私钥必填

---

## 测试场景

### ✅ 场景 1: 完全空配置（允许保存）

**前置条件**：

- 接口地址已填写（必填项）

**操作步骤**：

1. 打开系统设置页面
2. SSH Server 留空
3. 其他 SSH 字段也留空
4. 点击"保存配置"

**预期结果**：

- ✅ 不触发 SSH 验证
- ✅ 配置保存成功
- ✅ 显示："配置保存成功！"

**验证代码**：

```typescript
// 当 server 为空时，validateSshConfig() 返回 true
if (!server) {
  return true
}
```

---

### ✅ 场景 2: 只填写 Server（验证失败）

**操作步骤**：

1. 填写 SSH Server: `192.168.1.100`
2. Port 保持默认值 22
3. User 留空
4. Password 留空
5. 点击"保存配置"

**预期结果**：

- ❌ User 字段显示错误："User 为必填项"
- ❌ 显示认证错误："Password 或 SSH Key 至少填写一个"
- ❌ 配置保存失败
- ✅ 显示："请完善 SSH 配置信息"

**UI 表现**：

- User 输入框红色边框
- 认证错误提示显示在 "Use SSH key" 下方

---

### ✅ 场景 3: Server + 密码认证（成功）

**操作步骤**：

1. 填写 SSH Server: `192.168.1.100`
2. Port: `22`
3. User: `admin`
4. Password: `mypassword`
5. 不勾选 "Use SSH key"
6. 点击"保存配置"

**预期结果**：

- ✅ 所有验证通过
- ✅ 配置保存成功
- ✅ 显示："配置保存成功！"

**验证逻辑**：

```typescript
const hasPassword = config.value.ssh.password.trim().length > 0 // true
const hasSshKey = false // 未勾选
if (!hasPassword && !hasSshKey) {
  // false && true = false
  // 不会进入错误分支
}
```

---

### ✅ 场景 4: Server + SSH Key 认证（成功）

**操作步骤**：

1. 填写 SSH Server: `192.168.1.100`
2. Port: `22`
3. User: `admin`
4. Password: 留空或填写（填写也不会被使用，因为会被禁用）
5. 勾选 "Use SSH key"
6. 填写私钥内容或选择私钥文件
7. 点击"保存配置"

**预期结果**：

- ✅ Password 输入框被禁用
- ✅ 显示 SSH 私钥输入区域
- ✅ 所有验证通过
- ✅ 配置保存成功

**UI 状态**：

- Password 输入框 `disabled` 属性为 `true`
- Password 字段不显示必填星号（因为已禁用）

---

### ❌ 场景 5: Server + User，但两种认证都未填（失败）

**操作步骤**：

1. 填写 SSH Server: `192.168.1.100`
2. Port: `22`
3. User: `admin`
4. Password: 留空
5. 不勾选 "Use SSH key"
6. 点击"保存配置"

**预期结果**：

- ❌ 显示认证错误："Password 或 SSH Key 至少填写一个"
- ❌ Password 输入框红色边框
- ❌ 配置保存失败
- ✅ 显示："请完善 SSH 配置信息"

**验证逻辑**：

```typescript
const hasPassword = false // 留空
const hasSshKey = false // 未勾选
if (!hasPassword && !hasSshKey) {
  // true && true = true
  errors.value.sshAuth = 'Password 或 SSH Key 至少填写一个'
  isValid = false
}
```

---

### ❌ 场景 6: Server + SSH Key 勾选但未填私钥（失败）

**操作步骤**：

1. 填写 SSH Server: `192.168.1.100`
2. Port: `22`
3. User: `admin`
4. Password: 留空（被禁用）
5. 勾选 "Use SSH key"
6. 私钥内容留空
7. 点击"保存配置"

**预期结果**：

- ❌ 显示认证错误："Password 或 SSH Key 至少填写一个"
- ❌ 私钥输入框红色边框（textarea 或 Input）
- ❌ 配置保存失败
- ✅ 显示："请完善 SSH 配置信息"

**验证逻辑**：

```typescript
const hasPassword = false // Password 被禁用且留空
const hasSshKey = true && (''.trim() || '').length > 0 // true && 0 = false
if (!hasPassword && !hasSshKey) {
  // true && true = true
  errors.value.sshAuth = 'Password 或 SSH Key 至少填写一个'
}
```

---

### ❌ 场景 7: Server + Port 无效（失败）

**操作步骤**：

1. 填写 SSH Server: `192.168.1.100`
2. Port: `0` 或负数
3. User: `admin`
4. Password: `mypassword`
5. 点击"保存配置"

**预期结果**：

- ❌ Port 字段显示错误："Port 为必填项"
- ❌ Port 输入框红色边框
- ❌ 配置保存失败

**验证逻辑**：

```typescript
if (!config.value.ssh.port || config.value.ssh.port <= 0) {
  errors.value.sshPort = 'Port 为必填项'
  isValid = false
}
```

---

### ✅ 场景 8: 实时错误清除

**操作步骤**：

1. 触发验证错误（例如场景 2）
2. 开始在 User 输入框输入内容

**预期结果**：

- ✅ User 字段的错误提示立即消失
- ✅ User 输入框红色边框消失
- ✅ 其他字段的错误仍然显示

**实现机制**：

```vue
<Input v-model="config.ssh.user" @input="clearError('sshUser')" />
```

---

### ✅ 场景 9: 密码和 SSH Key 切换

**子场景 9.1：从密码切换到 SSH Key**

**操作步骤**：

1. 填写 Password: `mypassword`
2. 勾选 "Use SSH key"
3. 观察 UI 变化

**预期结果**：

- ✅ Password 输入框被禁用
- ✅ 显示 SSH 私钥输入区域
- ✅ Password 不再显示必填星号

**子场景 9.2：从 SSH Key 切换到密码**

**操作步骤**：

1. 勾选 "Use SSH key" 并填写私钥
2. 取消勾选 "Use SSH key"
3. 观察 UI 变化

**预期结果**：

- ✅ Password 输入框重新启用
- ✅ SSH 私钥输入区域隐藏
- ✅ Password 显示必填星号（如果 Server 不为空）

---

### ✅ 场景 10: 必填标识动态显示

**子场景 10.1：Server 为空时**

**预期 UI**：

- ✅ Port 不显示必填星号
- ✅ User 不显示必填星号
- ✅ Password 不显示必填星号

**子场景 10.2：Server 不为空且未勾选 SSH Key**

**预期 UI**：

- ✅ Port 显示红色星号 `*`
- ✅ User 显示红色星号 `*`
- ✅ Password 显示红色星号 `*`
- ✅ Server 显示橙色提示："(填写后其他字段必填)"

**子场景 10.3：Server 不为空且勾选 SSH Key**

**预期 UI**：

- ✅ Port 显示红色星号 `*`
- ✅ User 显示红色星号 `*`
- ✅ Password **不显示**必填星号（已禁用）
- ✅ SSH 私钥显示红色星号 `*`

**实现代码**：

```vue
<!-- Port -->
<label>
  Port
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

---

## 边界情况测试

### 边界 1: Server 只有空格

**操作**：

- Server: `   ` (只有空格)
- 点击保存

**预期**：

- ✅ `server.trim()` 返回空字符串
- ✅ 不触发 SSH 验证
- ✅ 保存成功

### 边界 2: User 只有空格

**操作**：

- Server: `192.168.1.100`
- User: `   ` (只有空格)
- Password: `mypassword`
- 点击保存

**预期**：

- ❌ User 验证失败
- ❌ 显示错误："User 为必填项"

**验证逻辑**：

```typescript
if (!config.value.ssh.user.trim()) {
  // '   '.trim() = ''
  errors.value.sshUser = 'User 为必填项'
}
```

### 边界 3: 私钥只有空格

**操作**：

- Server: `192.168.1.100`
- User: `admin`
- 勾选 "Use SSH key"
- 私钥: `   ` (只有空格)
- 点击保存

**预期**：

- ❌ 认证验证失败
- ❌ 显示错误："Password 或 SSH Key 至少填写一个"

**验证逻辑**：

```typescript
const hasSshKey =
  config.value.ssh.useSshKey && (config.value.ssh.privateKey?.trim() || '').length > 0
// true && ('   '.trim() || '').length > 0
// true && ('').length > 0
// true && 0 > 0
// false
```

---

## 错误状态管理

### 错误对象结构

```typescript
const errors = ref({
  apiUrl: '', // 接口地址错误
  testApi: '', // 测试接口地址错误
  sshServer: '', // SSH Server 错误（保留，暂未使用）
  sshPort: '', // SSH Port 错误
  sshUser: '', // SSH User 错误
  sshAuth: '' // SSH 认证错误（Password 或 SSH Key）
})
```

### 错误清除时机

| 字段          | 清除时机                              |
| ------------- | ------------------------------------- |
| `apiUrl`      | 用户在接口地址输入框输入时            |
| `testApi`     | 用户在测试接口地址输入框输入时        |
| `sshPort`     | 用户在 Port 输入框输入时              |
| `sshUser`     | 用户在 User 输入框输入时              |
| `sshAuth`     | 用户在 Password 或私钥输入框输入时    |
| 所有 SSH 错误 | 下次调用 `validateSshConfig()` 时清空 |

---

## 集成测试清单

### 保存配置测试

- [ ] 场景 1: 完全空 SSH 配置能保存
- [ ] 场景 2: 只填 Server 无法保存
- [ ] 场景 3: Server + 密码认证能保存
- [ ] 场景 4: Server + SSH Key 认证能保存
- [ ] 场景 5: Server + 无认证无法保存
- [ ] 场景 6: Server + SSH Key 勾选但未填私钥无法保存
- [ ] 场景 7: Server + 无效 Port 无法保存

### UI 交互测试

- [ ] 场景 8: 实时错误清除生效
- [ ] 场景 9.1: 从密码切换到 SSH Key
- [ ] 场景 9.2: 从 SSH Key 切换到密码
- [ ] 场景 10.1: Server 为空时无必填标识
- [ ] 场景 10.2: Server 不为空时显示必填标识
- [ ] 场景 10.3: SSH Key 模式下 Password 不显示必填标识

### 边界情况测试

- [ ] 边界 1: Server 只有空格
- [ ] 边界 2: User 只有空格
- [ ] 边界 3: 私钥只有空格

---

## 相关文件

- 表单组件: [`src/renderer/src/views/Configuration.vue`](../src/renderer/src/views/Configuration.vue)
- 验证文档: [`docs/FORM_VALIDATION.md`](./FORM_VALIDATION.md)

---

**创建日期**: 2025-10-23
**状态**: ✅ 已实现
**测试状态**: ⏳ 待测试
