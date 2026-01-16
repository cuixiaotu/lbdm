# 登录自动化脚本示例

## 默认脚本功能

系统默认会执行以下操作（无需额外配置）：

```javascript
// 1. 填充用户名到 input[name="email"]
const usernameInput = await waitForElement('input[name="email"]')
usernameInput.value = '用户名'
usernameInput.dispatchEvent(new Event('input', { bubbles: true }))
usernameInput.dispatchEvent(new Event('change', { bubbles: true }))

// 2. 填充密码到 input[type="password"]
const passwordInput = await waitForElement('input[type="password"]')
passwordInput.value = '密码'
passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
passwordInput.dispatchEvent(new Event('change', { bubbles: true }))

// 3. 检查并勾选协议复选框
const agreementCheckDiv = await waitForElement('.account-center-agreement-check')
if (!agreementCheckDiv.classList.contains('checked')) {
  agreementCheckDiv.click()
  await new Promise((resolve) => setTimeout(resolve, 300))
}

// 4. 验证并提交表单
const submitButton = await waitForElement('.account-center-submit')
const innerButton = submitButton.querySelector('button')
if (!innerButton || !innerButton.classList.contains('form-validate-error')) {
  submitButton.click()
}
```

## 使用场景示例

### 场景1：基本使用（仅默认功能）

如果只需要基本的登录功能，不传 `customScript` 参数：

```typescript
await window.api.account.openLoginWindow({
  username: 'user@example.com',
  password: 'password123',
  loginUrl: 'https://example.com/login'
  // 不传 customScript，只执行默认脚本
})
```

### 场景2：处理额外的表单字段

如果登录表单有额外的字段（如验证码、公司代码等）：

```typescript
const customScript = `
  (async () => {
    try {
      // 等待公司代码输入框并填充
      const companyCodeInput = await waitForElement('#company-code');
      companyCodeInput.value = 'COMPANY123';
      companyCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
      companyCodeInput.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('已填充公司代码');
    } catch (error) {
      console.error('填充公司代码失败:', error);
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

### 场景3：关闭弹窗或广告

如果登录页面有弹窗或广告需要关闭：

```typescript
const customScript = `
  (async () => {
    try {
      // 等待并关闭弹窗（最多等待3秒）
      const closeButton = await waitForElement('.popup-close-btn', 3000);
      closeButton.click();
      console.log('已关闭弹窗');
    } catch (error) {
      // 如果没有弹窗，忽略错误
      console.log('未检测到弹窗，继续登录流程');
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

### 场景4：多步骤登录

如果登录需要多个步骤（如先输入用户名，点击下一步，再输入密码）：

```typescript
const customScript = `
  (async () => {
    try {
      // 等待2秒确保第一步完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 点击"下一步"按钮
      const nextButton = await waitForElement('.next-step-button');
      nextButton.click();
      console.log('已点击下一步');

      // 等待第二个页面加载
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 填充额外的安全问题答案
      const securityAnswer = await waitForElement('#security-answer');
      securityAnswer.value = '我的答案';
      securityAnswer.dispatchEvent(new Event('input', { bubbles: true }));

      console.log('多步骤登录设置完成');
    } catch (error) {
      console.error('多步骤登录失败:', error);
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

### 场景5：处理验证码（需人工介入）

如果有验证码需要用户手动输入，可以添加提示或等待：

```typescript
const customScript = `
  (async () => {
    try {
      // 检查是否有验证码
      const captchaInput = await waitForElement('#captcha-input', 5000);
      console.log('检测到验证码输入框，请手动输入验证码');

      // 等待用户输入验证码（监听输入框变化）
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (captchaInput.value && captchaInput.value.length >= 4) {
            clearInterval(checkInterval);
            console.log('验证码已输入');
            resolve();
          }
        }, 500);

        // 最多等待60秒
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 60000);
      });
    } catch (error) {
      console.log('未检测到验证码，继续流程');
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

### 场景6：选择账号类型或登录方式

如果需要选择账号类型（如个人/企业）或登录方式（如密码/短信）：

```typescript
const customScript = `
  (async () => {
    try {
      // 等待账号类型选择器
      const accountTypeSelector = await waitForElement('.account-type-selector');

      // 选择企业账号
      const enterpriseOption = accountTypeSelector.querySelector('[data-type="enterprise"]');
      if (enterpriseOption) {
        enterpriseOption.click();
        console.log('已选择企业账号类型');

        // 等待一下让页面更新
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.log('未检测到账号类型选择器');
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

### 场景7：记住登录状态

如果需要勾选"记住我"或"7天内自动登录"：

```typescript
const customScript = `
  (async () => {
    try {
      // 查找"记住我"复选框
      const rememberCheckbox = await waitForElement('.remember-me-checkbox', 3000);

      // 如果未勾选，则点击勾选
      if (!rememberCheckbox.checked && !rememberCheckbox.classList.contains('checked')) {
        rememberCheckbox.click();
        console.log('已勾选"记住我"');
      }
    } catch (error) {
      console.log('未找到"记住我"选项');
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

## 在 AccountAdd.vue 中的完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-vue-next'

interface FormItem {
  id: number
  username: string
  password: string
}

const formItems = ref<FormItem[]>([{ id: 1, username: '', password: '' }])

let nextId = 2

const addFormItem = (): void => {
  formItems.value.push({
    id: nextId++,
    username: '',
    password: ''
  })
}

const removeFormItem = (id: number): void => {
  if (formItems.value.length > 1) {
    formItems.value = formItems.value.filter((item) => item.id !== id)
  }
}

const handleAdd = async (item: FormItem): Promise<void> => {
  console.log('添加账户:', {
    id: item.id,
    username: item.username,
    password: item.password
  })

  try {
    // 自定义脚本示例：处理额外的登录逻辑
    const customScript = `
      (async () => {
        try {
          // 关闭可能的欢迎弹窗
          try {
            const welcomePopup = await waitForElement('.welcome-popup-close', 2000);
            welcomePopup.click();
            console.log('已关闭欢迎弹窗');
          } catch (e) {
            console.log('无欢迎弹窗');
          }

          // 勾选"记住我"
          try {
            const rememberMe = await waitForElement('.remember-me', 2000);
            if (!rememberMe.classList.contains('checked')) {
              rememberMe.click();
              console.log('已勾选记住我');
            }
          } catch (e) {
            console.log('无记住我选项');
          }
        } catch (error) {
          console.error('自定义脚本执行失败:', error);
        }
      })();
    `

    // 调用主进程打开登录窗口
    const result = await window.api.account.openLoginWindow({
      username: item.username,
      password: item.password,
      loginUrl: 'https://example.com/login'
      // customScript // 如果不需要自定义脚本，可以注释掉这行
    })

    if (result.success) {
      console.log('登录成功，获取到 Cookie:', result.cookie)
      alert(`账户 ${item.username} 添加成功！`)
      // 清空表单
      item.username = ''
      item.password = ''
    } else {
      console.error('登录失败:', result.error)
      alert(`登录失败: ${result.error}`)
    }
  } catch (error) {
    console.error('添加账户失败:', error)
    alert(`添加账户失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
</script>
```

## 调试技巧

1. **开启开发者工具**：开发环境下会自动打开 DevTools
2. **查看控制台日志**：所有 `console.log` 都会输出到登录窗口的控制台
3. **使用断点**：在自定义脚本中使用 `debugger;` 语句
4. **测试选择器**：在控制台中测试 `document.querySelector('.your-selector')`

## 注意事项

⚠️ **重要提示**：

1. 自定义脚本在默认脚本**之后**执行
2. 默认脚本已经处理了基本的登录流程，通常不需要自定义脚本
3. 使用 `waitForElement` 时设置合理的超时时间
4. 添加适当的错误处理，避免一个错误影响整个流程
5. 自定义脚本应该是纯 JavaScript 代码，不能使用 Node.js API
