# SSH 隧道 HTTP 请求修复

## 问题描述

在使用 SSH 端口转发进行 HTTP 请求测试时，出现连接被拒绝的错误：

```
SSH连接成功
SSH端口转发成功
SSH->HTTP请求失败 AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1134:18)
    at afterConnectMultiple (node:net:1715:7) {
  code: 'ECONNREFUSED',
  [errors]: [
    Error: connect ECONNREFUSED ::1:80
    Error: connect ECONNREFUSED 127.0.0.1:80
  ]
}
```

## 问题分析

### 错误原因

虽然 SSH 端口转发成功建立，但 HTTP 请求没有使用转发的 stream，而是尝试直接连接到本地的 `127.0.0.1:80`。

### 原始代码问题

```typescript
// ❌ 错误的做法
const req = http.request(requestOptions, (res) => {
  // ...
})

// 尝试在请求创建后设置 socket
req.socket = stream // 这不会生效
req.end()
```

**问题**：

1. `http.request()` 在调用时就会立即创建连接
2. 没有传入 `createConnection` 选项，导致使用默认的连接方式
3. 后续设置 `req.socket` 已经太晚了，连接已经建立

## 解决方案

### 修复后的代码

```typescript
// ✅ 正确的做法
const requestOptions: http.RequestOptions = {
  method: 'GET',
  path: targetPath,
  headers: {
    Host: targetHost
  },
  // 关键：使用 createConnection 来复用 SSH stream
  createConnection: () => stream
}

const req = http.request(requestOptions, (res) => {
  res.on('data', () => {
    // 消费数据
  })

  res.on('end', () => {
    stream.end() // 关闭 stream
    sshClient.end() // 关闭 SSH 客户端
    // 返回结果
  })
})

req.on('error', (error) => {
  stream.end() // 确保错误时也关闭 stream
  sshClient.end()
  // 返回错误
})

req.end() // 发送请求
```

### 关键改进

1. **使用 `createConnection` 选项**

   ```typescript
   createConnection: () => stream
   ```

   这告诉 `http.request` 使用我们的 SSH stream 而不是创建新的 TCP 连接

2. **正确的资源清理**

   ```typescript
   // 成功时
   stream.end()
   sshClient.end()

   // 错误时
   stream.end()
   sshClient.end()
   ```

   确保 stream 和 SSH 客户端都被正确关闭

3. **添加日志**
   ```typescript
   console.log('SSH->HTTP请求结束，状态码:', res.statusCode)
   ```
   方便调试和追踪请求状态

## 技术原理

### HTTP over SSH 隧道的工作流程

```mermaid
graph LR
    A[HTTP Request] --> B[createConnection]
    B --> C[SSH Stream]
    C --> D[SSH Tunnel]
    D --> E[Remote Server]
    E --> F[HTTP Response]
    F --> G[SSH Stream]
    G --> H[Local Client]
```

### Node.js http.request 的连接机制

1. **默认行为**（不指定 `createConnection`）：

   ```typescript
   // 内部会调用 net.createConnection()
   net.createConnection({
     host: 'localhost',
     port: 80
   })
   ```

2. **自定义连接**（指定 `createConnection`）：
   ```typescript
   {
     createConnection: () => {
       // 返回一个 Duplex stream
       return sshStream // 使用 SSH 转发的 stream
     }
   }
   ```

### SSH2 forwardOut 参数说明

```typescript
sshClient.forwardOut(
  srcIP, // 源 IP（本地）
  srcPort, // 源端口（0 表示随机）
  dstIP, // 目标 IP（远程服务器）
  dstPort, // 目标端口（远程服务器端口）
  callback // 回调函数，返回 stream
)
```

**示例**：

```typescript
sshClient.forwardOut('127.0.0.1', 0, 'api.example.com', 443, (err, stream) => {
  // stream 是一个双向流，可以用于发送和接收数据
  // 类似于 TCP socket，但数据经过 SSH 加密传输
})
```

## 测试验证

### 测试场景

1. **直接 HTTP 测试**
   - 配置 API URL
   - 不配置 SSH
   - 预期：直接发送 HTTP 请求

2. **SSH 隧道测试**
   - 配置 API URL
   - 配置完整的 SSH 信息
   - 预期：通过 SSH 隧道发送请求

### 预期日志输出

**成功的 SSH 隧道测试**：

```
尝试进行SSH连接...
SSH连接成功
尝试进行SSH端口转发... api.example.com 443
SSH端口转发成功
SSH->HTTP请求结束，状态码: 200
```

**失败的情况**：

```
尝试进行SSH连接...
SSH连接成功
尝试进行SSH端口转发... api.example.com 443
SSH端口转发成功
SSH->HTTP请求失败 Error: ...
```

## 相关代码位置

- **服务类**: [`src/main/services/connectionTestService.ts`](../src/main/services/connectionTestService.ts)
- **测试方法**: `testViaSSH()`
- **IPC 处理**: [`src/main/ipc/handlers.ts`](../src/main/ipc/handlers.ts)
- **前端调用**: [`src/renderer/src/views/Configuration.vue`](../src/renderer/src/views/Configuration.vue)

## 最佳实践

### 1. 使用 SSH 隧道的注意事项

```typescript
// ✅ 正确：使用 createConnection
const options: http.RequestOptions = {
  createConnection: () => sshStream
}

// ❌ 错误：事后设置 socket
const req = http.request({})
req.socket = sshStream // 无效！
```

### 2. 资源清理

```typescript
// ✅ 总是清理资源
stream.end()
sshClient.end()

// ❌ 忘记清理会导致连接泄漏
```

### 3. 错误处理

```typescript
// ✅ 同时监听 request 和 response 的错误
req.on('error', handleError)
stream.on('error', handleError)

// ❌ 只监听一个可能导致未捕获的错误
```

### 4. 超时控制

```typescript
// ✅ 设置合理的超时
const timeout = setTimeout(() => {
  stream.end()
  sshClient.end()
  resolve({ success: false, error: '请求超时' })
}, 10000)

// 请求完成后清除超时
clearTimeout(timeout)
```

## 参考资料

- [Node.js http.request 文档](https://nodejs.org/api/http.html#httprequestoptions-callback)
- [ssh2 库文档](https://github.com/mscdex/ssh2)
- [Node.js Stream 文档](https://nodejs.org/api/stream.html)

## 版本历史

- **2025-10-23**: 修复 SSH 隧道 HTTP 请求问题，使用 `createConnection` 选项
- **2025-10-23**: 添加详细的技术文档和测试指南

---

**修复作者**: AI Assistant
**最后更新**: 2025-10-23
