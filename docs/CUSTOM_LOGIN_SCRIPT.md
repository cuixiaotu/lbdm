# 自定义登录脚本使用文档

## 概述

在添加账户时，您可以通过 `customScript` 参数传递自定义的 JavaScript 代码到主进程的登录窗口中执行。这允许您在默认的自动登录流程之外，执行额外的自定义操作。

## 功能特性

1. **默认自动填充流程**：系统会自动执行以下操作
   - 填充用户名到 `input[name="email"]`
   - 填充密码到 `input[type="password"]`
   - 检查并勾选协议复选框 `.account-center-agreement-check`
   - 验证并点击提交按钮 `.account-center-submit`

2. **自定义脚本**：在默认流程执行后，会执行您传入的自定义脚本

3. **内置工具函数**：自定义脚本中可以使用内置的 `waitForElement()` 函数

## 使用方式

### 基本用法

```typescript
await window.api.account.openLoginWindow({
  username: 'user@example.com',
  password: 'password123',
  loginUrl: 'https://example.com/login',
  customScript: `
    // 您的自定义JavaScript代码
    console.log('执行自定义操作...');
  `
})
```

### 完整示例

```typescript
const customScript = `
  // 使用内置的 waitForElement 函数等待特定元素
  (async () => {
    try {
      // 等待某个特殊按钮出现
      const specialButton = await waitForElement('.special-action-button');
      console.log('找到特殊按钮');

      // 点击按钮
      specialButton.click();

      // 等待并填充额外的表单字段
      const extraField = await waitForElement('#extra-field');
      extraField.value = 'some value';
      extraField.dispatchEvent(new Event('input', { bubbles: true }));

      console.log('自定义操作完成');
    } catch (error) {
      console.error('自定义操作失败:', error);
    }
  })();
`

await window.api.account.openLoginWindow({
  username: 'user@example.com',
  password: 'password123',
  loginUrl: 'https://example.com/login',
  customScript
})
```

## 内置工具函数

### waitForElement(selector, timeout)

等待指定的 DOM 元素出现。

**参数：**

- `selector` (string): CSS 选择器
- `timeout` (number, 可选): 超时时间（毫秒），默认 10000

**返回：**

- Promise<Element>: 找到的 DOM 元素

**示例：**

```javascript
const button = await waitForElement('.my-button', 5000)
button.click()
```

## 执行时机

1. 页面加载完成后触发 `did-finish-load` 事件
2. 首先执行默认的自动填充脚本
3. 然后执行自定义脚本（如果提供）

## 脚本执行顺序

```
页面加载完成
    ↓
执行 waitForElement 函数定义
    ↓
执行默认自动填充流程
    ├─ 填充用户名
    ├─ 填充密码
    ├─ 勾选协议
    └─ 提交表单
    ↓
执行自定义脚本（如果提供）
```

## 注意事项

1. **异步执行**：自定义脚本应该使用 async/await 或 Promise 来处理异步操作
2. **错误处理**：建议在自定义脚本中添加 try-catch 错误处理
3. **性能考虑**：避免执行耗时过长的操作
4. **安全性**：自定义脚本在独立的登录窗口中执行，不会影响主应用
5. **调试**：开发环境下会自动打开 DevTools，方便调试

## 常见用例

### 1. 处理验证码

```javascript
const customScript = `
  (async () => {
    try {
      // 等待验证码输入框出现
      const captchaInput = await waitForElement('#captcha-input');

      // 这里可以添加验证码识别逻辑
      // 或者等待用户手动输入
      console.log('等待验证码输入...');
    } catch (error) {
      console.error('验证码处理失败:', error);
    }
  })();
`
```

### 2. 多步骤登录

```javascript
const customScript = `
  (async () => {
    try {
      // 等待第一步完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 点击"下一步"按钮
      const nextButton = await waitForElement('.next-step-button');
      nextButton.click();

      // 等待第二个页面并填充额外信息
      const secondaryField = await waitForElement('#secondary-info');
      secondaryField.value = 'additional info';

      console.log('多步骤登录完成');
    } catch (error) {
      console.error('多步骤登录失败:', error);
    }
  })();
`
```

### 3. 处理弹窗

```javascript
const customScript = `
  (async () => {
    try {
      // 等待弹窗出现并关闭
      const closeButton = await waitForElement('.popup-close', 3000);
      closeButton.click();
      console.log('弹窗已关闭');
    } catch (error) {
      // 如果没有弹窗，忽略错误
      console.log('未检测到弹窗');
    }
  })();
`
```

## 故障排查

### 脚本未执行

- 检查是否正确传递了 `customScript` 参数
- 查看控制台是否有语法错误
- 确认页面已完全加载

### 元素未找到

- 使用 DevTools 确认元素选择器是否正确
- 增加 `waitForElement` 的超时时间
- 检查元素是否真的存在于页面中

### 脚本执行顺序问题

- 使用 `setTimeout` 或 `waitForElement` 来控制执行时机
- 确保异步操作使用 async/await 正确处理

## API 参考

### OpenLoginWindowRequest

```typescript
interface OpenLoginWindowRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 登录URL */
  loginUrl: string
  /** 可选：自定义执行的JavaScript代码 */
  customScript?: string
}
```

## 相关文件

- 主进程服务：`/src/main/services/loginWindowService.ts`
- 类型定义：`/src/shared/ipc/types.ts`
- 使用示例：`/src/renderer/src/components/AccountAdd.vue`
