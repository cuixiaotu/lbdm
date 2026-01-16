# IPC 通信管理系统

## 概述

本项目实现了一个统一的 IPC（进程间通信）管理系统，用于规范化主进程和渲染进程之间的通信。所有 IPC 相关的定义和逻辑都集中管理，提高了代码的可维护性、类型安全性和开发效率。

## 设计目标

1. **统一管理** - 所有 IPC 频道定义集中在一个地方
2. **类型安全** - 完整的 TypeScript 类型定义
3. **易于维护** - 清晰的文件组织结构
4. **避免重复** - 类型定义在主进程和渲染进程之间共享
5. **易于扩展** - 添加新的 IPC 频道只需要修改几个文件

## 目录结构

```
src/
├── shared/                    # 共享代码（主进程和渲染进程都可以访问）
│   └── ipc/
│       ├── channels.ts        # IPC 频道常量定义
│       ├── types.ts           # IPC 类型定义
│       └── index.ts           # 导出所有 IPC 相关内容
├── main/                      # 主进程
│   └── ipc/
│       ├── handlers.ts        # IPC 处理器实现
│       └── index.ts           # 导出主进程 IPC 模块
├── preload/                   # Preload 脚本
│   ├── index.ts               # 暴露 API 给渲染进程
│   └── index.d.ts             # 类型定义
└── renderer/                  # 渲染进程
    └── src/
        └── stores/
            └── config.ts      # 使用 IPC API 的示例
```

## 核心文件说明

### 1. shared/ipc/channels.ts

定义所有 IPC 频道的常量，避免硬编码字符串。

```typescript
export const CONFIG_CHANNELS = {
  GET: 'config:get',
  SAVE: 'config:save',
  RESET: 'config:reset',
  GET_PATH: 'config:getPath'
} as const

export const DIALOG_CHANNELS = {
  OPEN_FILE: 'dialog:openFile',
  OPEN_FILES: 'dialog:openFiles',
  OPEN_DIRECTORY: 'dialog:openDirectory',
  SAVE_FILE: 'dialog:saveFile'
} as const

export const IPC_CHANNELS = {
  ...CONFIG_CHANNELS,
  ...DIALOG_CHANNELS
} as const
```

**优势：**

- ✅ 类型安全，自动补全
- ✅ 重命名频道只需修改一处
- ✅ 避免拼写错误
- ✅ 主进程和渲染进程使用相同的常量

### 2. shared/ipc/types.ts

定义所有 IPC 通信的数据类型。

```typescript
export interface SystemConfig {
  api: ApiConfig
  ssh: SshConfig
}

export interface IPCTypeMap {
  'config:get': {
    request: void
    response: SystemConfig
  }
  'config:save': {
    request: SystemConfig
    response: { success: boolean }
  }
  // ... 更多类型定义
}
```

**优势：**

- ✅ 请求和响应类型一目了然
- ✅ 编译时类型检查
- ✅ 自动补全和智能提示
- ✅ 类型定义在主进程和渲染进程之间共享

### 3. main/ipc/handlers.ts

实现所有 IPC 处理器的核心逻辑。

```typescript
export function registerIPCHandlers(): void {
  registerConfigHandlers()
  registerDialogHandlers()
}

function registerConfigHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET, (): SystemConfig => {
    return configManager.getConfig()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE, (_, config: SystemConfig) => {
    configManager.saveConfig(config)
    return { success: true }
  })

  // ... 更多处理器
}
```

**优势：**

- ✅ 集中管理所有 IPC 处理器
- ✅ 按功能模块分组
- ✅ 易于添加新的处理器
- ✅ 支持统一的错误处理

### 4. preload/index.ts

将 IPC 功能安全地暴露给渲染进程。

```typescript
const api = {
  config: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.GET),
    save: (config: SystemConfig) => ipcRenderer.invoke(IPC_CHANNELS.SAVE, config)
  },
  dialog: {
    openFile: (options?: OpenFileOptions) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE, options)
  }
}
```

**优势：**

- ✅ 类型安全的 API
- ✅ 隐藏 ipcRenderer 实现细节
- ✅ 易于测试和 mock

## 使用示例

### 在渲染进程中调用 IPC

```typescript
// 在 Vue 组件或 Store 中
import type { SystemConfig } from '@shared/ipc'

// 获取配置
const config = await window.api.config.get()

// 保存配置
await window.api.config.save(config)

// 打开文件选择对话框
const filePath = await window.api.dialog.openFile({
  title: '选择文件',
  defaultPath: '~/.ssh'
})
```

### 添加新的 IPC 频道

#### 步骤 1: 在 shared/ipc/channels.ts 添加频道定义

```typescript
export const NEW_CHANNELS = {
  DO_SOMETHING: 'new:doSomething'
} as const

export const IPC_CHANNELS = {
  ...CONFIG_CHANNELS,
  ...DIALOG_CHANNELS,
  ...NEW_CHANNELS // 添加新频道组
} as const
```

#### 步骤 2: 在 shared/ipc/types.ts 添加类型定义

```typescript
export interface IPCTypeMap {
  // ... 现有类型

  'new:doSomething': {
    request: { param1: string; param2: number }
    response: { result: boolean }
  }
}
```

#### 步骤 3: 在 main/ipc/handlers.ts 实现处理器

```typescript
function registerNewHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DO_SOMETHING, (_, params) => {
    // 实现逻辑
    return { result: true }
  })
}

export function registerIPCHandlers(): void {
  registerConfigHandlers()
  registerDialogHandlers()
  registerNewHandlers() // 注册新处理器
}
```

#### 步骤 4: 在 preload/index.ts 暴露 API

```typescript
const api = {
  config: {
    /* ... */
  },
  dialog: {
    /* ... */
  },

  new: {
    doSomething: (params: IPCTypeMap['new:doSomething']['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.DO_SOMETHING, params)
  }
}
```

#### 步骤 5: 更新 preload/index.d.ts 类型定义

```typescript
interface NewAPI {
  doSomething: (params: { param1: string; param2: number }) => Promise<{ result: boolean }>
}

interface Window {
  api: {
    config: ConfigAPI
    dialog: DialogAPI
    new: NewAPI
  }
}
```

## 当前支持的 IPC 频道

### 配置管理

| 频道             | 请求参数       | 响应                   | 说明             |
| ---------------- | -------------- | ---------------------- | ---------------- |
| `config:get`     | 无             | `SystemConfig`         | 获取配置         |
| `config:save`    | `SystemConfig` | `{ success: boolean }` | 保存配置         |
| `config:reset`   | 无             | `SystemConfig`         | 重置配置         |
| `config:getPath` | 无             | `string`               | 获取配置文件路径 |

### 文件对话框

| 频道                   | 请求参数           | 响应             | 说明           |
| ---------------------- | ------------------ | ---------------- | -------------- |
| `dialog:openFile`      | `OpenFileOptions?` | `string \| null` | 选择单个文件   |
| `dialog:openFiles`     | `OpenFileOptions?` | `string[]`       | 选择多个文件   |
| `dialog:openDirectory` | `OpenFileOptions?` | `string \| null` | 选择目录       |
| `dialog:saveFile`      | `SaveFileOptions?` | `string \| null` | 保存文件对话框 |

## 类型安全

### 编译时类型检查

```typescript
// ✅ 正确：类型匹配
const config: SystemConfig = await window.api.config.get()

// ❌ 错误：类型不匹配（编译器会报错）
const config: string = await window.api.config.get()

// ✅ 正确：参数类型正确
await window.api.config.save(config)

// ❌ 错误：参数类型错误（编译器会报错）
await window.api.config.save('invalid')
```

### IDE 智能提示

```typescript
// 输入 window.api. 后会自动提示：
// - config
// - dialog

// 输入 window.api.config. 后会自动提示：
// - get()
// - save()
// - reset()
// - getPath()
```

## 错误处理

### 主进程错误处理

```typescript
ipcMain.handle(IPC_CHANNELS.SAVE, async (_, config: SystemConfig) => {
  try {
    configManager.saveConfig(config)
    return { success: true }
  } catch (error) {
    console.error('保存配置失败:', error)
    throw new Error('保存配置失败')
  }
})
```

### 渲染进程错误处理

```typescript
try {
  await window.api.config.save(config)
  console.log('保存成功')
} catch (error) {
  console.error('保存失败:', error)
  // 显示错误提示
}
```

## 性能优化

### 批量操作

如果需要执行多个 IPC 调用，考虑合并为一个：

```typescript
// ❌ 不推荐：多次 IPC 调用
const config = await window.api.config.get()
const path = await window.api.config.getPath()

// ✅ 推荐：一次 IPC 调用返回所有需要的数据
// 添加一个新的频道：config:getAll
const { config, path } = await window.api.config.getAll()
```

### 缓存

对于不经常变化的数据，考虑在渲染进程中缓存：

```typescript
let cachedConfig: SystemConfig | null = null

async function getConfig(): Promise<SystemConfig> {
  if (!cachedConfig) {
    cachedConfig = await window.api.config.get()
  }
  return cachedConfig
}

async function saveConfig(config: SystemConfig): Promise<void> {
  await window.api.config.save(config)
  cachedConfig = config // 更新缓存
}
```

## 安全性

### Context Isolation

确保在 BrowserWindow 配置中启用 context isolation：

```typescript
new BrowserWindow({
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
    contextIsolation: true // ✅ 必须启用
  }
})
```

### 最小权限原则

只暴露必要的 API 给渲染进程：

```typescript
// ❌ 不要直接暴露整个 ipcRenderer
window.ipcRenderer = ipcRenderer

// ✅ 只暴露特定的方法
window.api = {
  config: {
    get: () => ipcRenderer.invoke('config:get')
  }
}
```

### 输入验证

在主进程中验证来自渲染进程的数据：

```typescript
ipcMain.handle(IPC_CHANNELS.SAVE, (_, config: SystemConfig) => {
  // 验证配置对象
  if (!config || typeof config !== 'object') {
    throw new Error('无效的配置对象')
  }

  if (!config.api || !config.ssh) {
    throw new Error('配置对象缺少必要字段')
  }

  // 保存配置
  configManager.saveConfig(config)
  return { success: true }
})
```

## 调试

### 启用 IPC 日志

在主进程中添加日志：

```typescript
ipcMain.handle(IPC_CHANNELS.GET, () => {
  console.log('[IPC] config:get called')
  const config = configManager.getConfig()
  console.log('[IPC] config:get response:', config)
  return config
})
```

### 在渲染进程中调试

```typescript
const config = await window.api.config.get()
console.log('Received config:', config)
```

## 测试

### 单元测试示例

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('IPC Config API', () => {
  it('should get config', async () => {
    const mockConfig: SystemConfig = {
      api: { apiUrl: 'test', testApi: 'test' },
      ssh: {
        /* ... */
      }
    }

    vi.spyOn(window.api.config, 'get').mockResolvedValue(mockConfig)

    const config = await window.api.config.get()
    expect(config).toEqual(mockConfig)
  })
})
```

## 迁移指南

### 从旧代码迁移

**之前（硬编码字符串）：**

```typescript
ipcMain.handle('config:get', () => {
  /* ... */
})
ipcRenderer.invoke('config:get')
```

**现在（使用常量）：**

```typescript
import { IPC_CHANNELS } from '@shared/ipc'

ipcMain.handle(IPC_CHANNELS.GET, () => {
  /* ... */
})
window.api.config.get()
```

## 最佳实践

1. **使用常量** - 始终使用 `IPC_CHANNELS` 中的常量，避免硬编码
2. **类型定义** - 为所有 IPC 通信定义完整的类型
3. **错误处理** - 在主进程和渲染进程中都要处理错误
4. **文档化** - 为新增的 IPC 频道添加文档说明
5. **测试** - 为 IPC 处理器编写单元测试
6. **安全性** - 验证来自渲染进程的所有输入

## 相关文件

- **频道定义**: [`src/shared/ipc/channels.ts`](../src/shared/ipc/channels.ts)
- **类型定义**: [`src/shared/ipc/types.ts`](../src/shared/ipc/types.ts)
- **主进程处理器**: [`src/main/ipc/handlers.ts`](../src/main/ipc/handlers.ts)
- **Preload 脚本**: [`src/preload/index.ts`](../src/preload/index.ts)
- **类型声明**: [`src/preload/index.d.ts`](../src/preload/index.d.ts)

## 参考资源

- [Electron IPC 文档](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron 安全最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)
- [TypeScript 类型系统](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
