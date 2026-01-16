# API Service 使用文档

## 概述

`apiService` 是统一管理所有业务 API 接口请求的服务模块，提供标准化的请求配置和响应格式。

## 接口列表

### 1. getManagedList - 获取管家账号列表

用于账户监控服务，验证账户凭证是否有效。

**请求示例：**

```typescript
import { apiService } from '@/services/apiService'

const response = await apiService.getManagedList({
  cookie: account.cookie,
  csrfToken: account.csrfToken
})

if (response.success) {
  console.log('账户凭证有效', response.data)
} else {
  console.error('账户凭证失效', response.error)
}
```

**响应格式：**

```typescript
{
  success: boolean
  statusCode: number
  data?: ManagedListData
  error?: string
  responseTime: number
}
```

---

### 2. getLiveIESList - 获取直播列表

获取指定组织下的直播数据列表，支持分页和多种筛选条件。

**接口地址：**

```
POST /nbs/api/bm/operate/live/ies_list?group_id={groupId}
```

**请求参数：**

```typescript
interface LiveIESListRequest {
  page: number // 页码，从 1 开始
  limit: number // 每页数量，默认 10
  live_type: string // 直播类型："1" 表示全部
  promotion_status: string // 推广状态："0" 表示全部
  search_key: string // 搜索关键词，空字符串表示不搜索
  metrics: string[] // 需要返回的指标列表
}
```

**可用指标（metrics）：**

| 指标名称                               | 说明         |
| -------------------------------------- | ------------ |
| `live_st`                              | 开播时间     |
| `live_dt`                              | 直播时长     |
| `total_live_watch_cnt`                 | 总观看人数   |
| `total_live_avg_watch_duration`        | 平均观看时长 |
| `total_live_follow_cnt`                | 总关注数     |
| `total_live_comment_cnt`               | 总评论数     |
| `total_live_like_cnt`                  | 总点赞数     |
| `live_card_icon_component_click_count` | 卡片点击数   |
| `stat_cost`                            | 消耗金额     |

**请求示例：**

```typescript
import { apiService, type LiveIESListRequest } from '@/services/apiService'

// 准备请求参数
const requestData: LiveIESListRequest = {
  page: 1,
  limit: 10,
  live_type: '1',
  promotion_status: '0',
  search_key: '',
  metrics: [
    'live_st',
    'live_dt',
    'total_live_watch_cnt',
    'total_live_avg_watch_duration',
    'total_live_follow_cnt',
    'total_live_comment_cnt',
    'total_live_like_cnt',
    'live_card_icon_component_click_count',
    'stat_cost'
  ]
}

// 发送请求
const response = await apiService.getLiveIESList(
  '1798630428233865', // groupId - 组织ID
  requestData,
  {
    cookie: account.cookie,
    csrfToken: account.csrfToken
  }
)

if (response.success) {
  console.log('直播列表获取成功', response.data)
  console.log('响应时间:', response.responseTime, 'ms')
} else {
  console.error('获取失败:', response.error, '状态码:', response.statusCode)
}
```

**完整使用示例（带分页）：**

```typescript
async function fetchLiveList(groupId: string, page: number = 1, searchKey: string = '') {
  try {
    const response = await apiService.getLiveIESList(
      groupId,
      {
        page,
        limit: 10,
        live_type: '1',
        promotion_status: '0',
        search_key: searchKey,
        metrics: [
          'live_st',
          'live_dt',
          'total_live_watch_cnt',
          'total_live_avg_watch_duration',
          'total_live_follow_cnt',
          'total_live_comment_cnt',
          'total_live_like_cnt',
          'live_card_icon_component_click_count',
          'stat_cost'
        ]
      },
      {
        cookie: currentAccount.cookie,
        csrfToken: currentAccount.csrfToken,
        timeout: 15000 // 可选：自定义超时时间
      }
    )

    if (!response.success) {
      throw new Error(`获取直播列表失败: ${response.error}`)
    }

    return response.data
  } catch (error) {
    console.error('请求异常:', error)
    throw error
  }
}

// 使用示例
const liveData = await fetchLiveList('1798630428233865', 1, '直播间名称')
```

**响应格式：**

```typescript
{
  success: true,
  statusCode: 200,
  data: {
    // 具体数据结构取决于接口返回
    list: [...],
    total: 100,
    ...
  },
  responseTime: 500
}
```

---

## 通用配置

### ApiRequestConfig

所有 API 请求都需要提供以下配置：

```typescript
interface ApiRequestConfig {
  cookie: string // 从数据库获取的 Cookie
  csrfToken: string // 从数据库获取的 CSRF Token
  timeout?: number // 可选：请求超时时间（毫秒），默认 10000
}
```

### ApiResponse

统一的响应格式：

```typescript
interface ApiResponse<T> {
  success: boolean // 请求是否成功（2xx 状态码）
  statusCode: number // HTTP 状态码
  data?: T // 成功时的响应数据
  error?: string // 失败时的错误信息
  responseTime: number // 响应时间（毫秒）
}
```

---

## 错误处理

### HTTP 状态码说明

| 状态码  | 说明       | 错误信息                    |
| ------- | ---------- | --------------------------- |
| 200-299 | 成功       | -                           |
| 401     | 未授权     | "Unauthorized - 凭证失效"   |
| 403     | 禁止访问   | "Forbidden - 无访问权限"    |
| 404     | 接口不存在 | "Not Found - 接口不存在"    |
| 500+    | 服务器错误 | "Server Error - 服务器错误" |

### 错误处理示例

```typescript
const response = await apiService.getLiveIESList(groupId, requestData, config)

if (!response.success) {
  switch (response.statusCode) {
    case 401:
      // 凭证失效，需要重新登录
      console.error('账户凭证已失效，请重新登录')
      break
    case 403:
      console.error('无权访问该资源')
      break
    case 404:
      console.error('接口不存在，请检查 API 路径')
      break
    case 0:
      // 网络错误或请求超时
      console.error('网络连接失败:', response.error)
      break
    default:
      console.error(`请求失败: ${response.error}`)
  }
}
```

---

## 添加新接口

如果需要添加新的 API 接口，请按照以下步骤：

### 1. 定义接口类型

```typescript
// 请求参数类型
export interface NewApiRequest {
  // 定义请求参数
}

// 响应数据类型
export interface NewApiData {
  // 定义响应数据结构
}
```

### 2. 添加接口方法

```typescript
async newApiMethod(
  config: ApiRequestConfig,
  requestData?: NewApiRequest
): Promise<ApiResponse<NewApiData>> {
  const startTime = Date.now()

  try {
    const response = await this.axios.post('/api/path', requestData, {
      headers: this.buildHeaders(config.cookie, config.csrfToken),
      timeout: config.timeout || this.DEFAULT_TIMEOUT
    })

    const responseTime = Date.now() - startTime
    const success = response.status >= 200 && response.status < 300

    return {
      success,
      statusCode: response.status,
      data: success ? response.data : undefined,
      error: success ? undefined : this.getErrorMessage(response),
      responseTime
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      success: false,
      statusCode: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    }
  }
}
```

### 3. 导出类型（如果需要）

确保在文件中导出新定义的类型，以便其他模块使用：

```typescript
export type { NewApiRequest, NewApiData }
```

---

## 最佳实践

1. **统一错误处理**：始终检查 `response.success` 字段
2. **设置合理超时**：根据接口特性设置适当的 `timeout` 值
3. **记录响应时间**：使用 `responseTime` 监控接口性能
4. **类型安全**：充分利用 TypeScript 类型系统
5. **避免重复代码**：复用 `apiService` 实例，不要创建多个

---

## 相关文件

- **服务文件**：`/src/main/services/apiService.ts`
- **类型定义**：包含在服务文件中
- **使用示例**：
  - `/src/main/services/accountMonitorService.ts` - 账户监控服务使用 `getManagedList`
  - 其他服务可参考相同模式使用 `getLiveIESList`

---

## 技术栈

- **HTTP 客户端**：Axios
- **基础 URL**：`https://business.oceanengine.com`
- **默认超时**：10000 毫秒（10 秒）
- **请求验证**：通过 Cookie 和 CSRF Token

---

## 注意事项

⚠️ **重要提示：**

1. Cookie 和 CSRF Token 必须从数据库中获取
2. 所有接口都需要有效的账户凭证
3. 凭证失效（401）时需要重新登录获取新的 Cookie
4. 请求超时时间根据网络情况适当调整
5. 生产环境中应添加请求重试机制（可选）

---

## 更新日志

### 2025-10-24

- ✅ 添加 `getLiveIESList` 接口
  - 支持获取直播列表
  - 支持分页和搜索
  - 支持自定义指标
  - 完整的类型定义

### 2025-10-23

- ✅ 初始化 `apiService`
- ✅ 添加 `getManagedList` 接口
- ✅ 统一错误处理机制
