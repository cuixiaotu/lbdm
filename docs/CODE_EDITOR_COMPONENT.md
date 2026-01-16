# CodeEditor 组件文档

## 概述

`CodeEditor` 是一个基于 CodeMirror 6 的轻量级代码编辑器组件，为 Vue 3 应用提供语法高亮、代码提示等功能。

## 技术栈

- **CodeMirror 6**：现代化的代码编辑器核心库
- **@codemirror/lang-javascript**：JavaScript 语法支持
- **@codemirror/theme-one-dark**：One Dark 主题
- **Vue 3**：响应式框架

## 功能特性

- ✅ JavaScript 语法高亮
- ✅ 代码自动缩进
- ✅ 行号显示
- ✅ 括号匹配
- ✅ 暗色/亮色主题切换
- ✅ 自定义高度
- ✅ 占位符提示
- ✅ 只读模式
- ✅ 双向数据绑定 (v-model)

## 安装依赖

已安装的依赖包：

```json
{
  "codemirror": "6.0.2",
  "@codemirror/lang-javascript": "6.2.4",
  "@codemirror/theme-one-dark": "6.1.3",
  "@codemirror/view": "6.38.6",
  "@codemirror/state": "6.5.2"
}
```

## 使用方法

### 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import CodeEditor from '@/components/CodeEditor.vue'

const code = ref('')
</script>

<template>
  <CodeEditor v-model="code" />
</template>
```

### 完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import CodeEditor from '@/components/CodeEditor.vue'

const scriptCode = ref(`(async () => {
  try {
    const button = await waitForElement('.my-button');
    button.click();
  } catch (error) {
    console.error('错误:', error);
  }
})();`)
</script>

<template>
  <div class="space-y-2">
    <label>自定义脚本</label>
    <CodeEditor
      v-model="scriptCode"
      height="400px"
      theme="dark"
      placeholder="// 输入JavaScript代码..."
    />
  </div>
</template>
```

## Props 属性

| 属性          | 类型                | 默认值                       | 说明                       |
| ------------- | ------------------- | ---------------------------- | -------------------------- |
| `modelValue`  | `string`            | `''`                         | 编辑器内容（支持 v-model） |
| `placeholder` | `string`            | `'// 输入JavaScript代码...'` | 占位符文本                 |
| `readonly`    | `boolean`           | `false`                      | 是否只读                   |
| `height`      | `string`            | `'200px'`                    | 编辑器高度                 |
| `theme`       | `'light' \| 'dark'` | `'dark'`                     | 主题模式                   |

## Events 事件

| 事件                | 参数              | 说明           |
| ------------------- | ----------------- | -------------- |
| `update:modelValue` | `(value: string)` | 内容变化时触发 |

## 样式定制

组件提供了以下 CSS 类用于样式定制：

```css
.code-editor-wrapper {
  /* 编辑器容器 */
}

.code-editor-wrapper :deep(.cm-editor) {
  /* CodeMirror 编辑器主体 */
}

.code-editor-wrapper :deep(.cm-scroller) {
  /* 滚动容器 */
}

.code-editor-wrapper :deep(.cm-gutters) {
  /* 行号区域 */
}

.code-editor-wrapper :deep(.cm-content) {
  /* 内容区域 */
}

.code-editor-wrapper :deep(.cm-line) {
  /* 单行代码 */
}
```

## 主题定制

### 使用暗色主题

```vue
<CodeEditor v-model="code" theme="dark" />
```

### 使用亮色主题

```vue
<CodeEditor v-model="code" theme="light" />
```

## 只读模式

```vue
<CodeEditor v-model="code" readonly />
```

## 自定义高度

```vue
<CodeEditor v-model="code" height="500px" />
```

## 在配置页面中的应用

在 `Configuration.vue` 中使用：

```vue
<script setup lang="ts">
import CodeEditor from '@/components/CodeEditor.vue'

const config = ref({
  account: {
    defaultScript: ''
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>账户配置</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-2">
        <label class="text-sm font-medium leading-none"> 默认执行脚本 </label>
        <CodeEditor
          v-model="config.account.defaultScript"
          height="300px"
          theme="dark"
          placeholder="// 自定义JavaScript脚本..."
        />
      </div>
    </CardContent>
  </Card>
</template>
```

## 特性说明

### 1. 语法高亮

自动识别 JavaScript 语法，包括：

- 关键字（`async`, `await`, `const`, `let` 等）
- 字符串
- 注释
- 函数
- 操作符

### 2. 自动缩进

- 支持自动缩进
- Tab 键缩进（2个空格）
- 自动括号匹配

### 3. 行号显示

- 显示行号
- 行号区域可折叠（未来扩展）

### 4. 响应式更新

- 支持 Vue 3 的响应式系统
- v-model 双向绑定
- 外部值变化时自动更新编辑器内容

### 5. 性能优化

- 虚拟滚动（CodeMirror 内置）
- 按需加载语法高亮
- 轻量级打包体积

## 优势对比

### vs Textarea

| 特性     | CodeEditor   | Textarea |
| -------- | ------------ | -------- |
| 语法高亮 | ✅           | ❌       |
| 代码提示 | ✅           | ❌       |
| 自动缩进 | ✅           | ❌       |
| 行号显示 | ✅           | ❌       |
| 括号匹配 | ✅           | ❌       |
| 主题切换 | ✅           | ❌       |
| 用户体验 | 优秀         | 一般     |
| 打包体积 | 较大 (~50KB) | 无       |

### vs Monaco Editor

| 特性       | CodeEditor (CodeMirror) | Monaco Editor |
| ---------- | ----------------------- | ------------- |
| 打包体积   | 小 (~50KB)              | 大 (~2MB)     |
| 启动速度   | 快                      | 较慢          |
| 功能丰富度 | 中等                    | 丰富          |
| 定制性     | 高                      | 中等          |
| 适用场景   | 轻量级编辑              | 完整IDE体验   |

## 注意事项

⚠️ **重要提示**：

1. **打包体积**：CodeMirror 会增加约 50KB 的打包体积
2. **浏览器兼容性**：需要现代浏览器（Chrome 63+, Firefox 67+, Safari 11+）
3. **性能考虑**：对于超长代码（>10000行），建议启用代码折叠
4. **主题切换**：切换主题时会重新渲染编辑器

## 未来扩展

可能的功能扩展：

- [ ] 代码自动补全
- [ ] 错误提示（ESLint 集成）
- [ ] 代码格式化（Prettier 集成）
- [ ] 多语言支持（TypeScript, Python 等）
- [ ] 代码折叠
- [ ] 搜索/替换
- [ ] 多光标编辑
- [ ] Vim/Emacs 模式

## 故障排查

### 问题1：编辑器不显示

**原因**：容器高度为 0
**解决**：确保父容器有明确的高度

```vue
<div style="height: 400px">
  <CodeEditor v-model="code" height="100%" />
</div>
```

### 问题2：内容不更新

**原因**：没有正确使用 v-model
**解决**：检查绑定语法

```vue
<!-- 错误 -->
<CodeEditor :value="code" />

<!-- 正确 -->
<CodeEditor v-model="code" />
```

### 问题3：样式异常

**原因**：主题冲突或 CSS 覆盖
**解决**：使用 `:deep()` 选择器定制样式

```vue
<style scoped>
.my-editor :deep(.cm-editor) {
  /* 自定义样式 */
}
</style>
```

## 相关资源

- [CodeMirror 6 官方文档](https://codemirror.net/docs/)
- [CodeMirror 6 示例](https://codemirror.net/examples/)
- [Vue 3 文档](https://vuejs.org/)

## 更新日志

### v1.0.0 (当前版本)

- ✅ 初始版本
- ✅ JavaScript 语法支持
- ✅ 暗色主题
- ✅ 基本编辑功能
- ✅ Vue 3 集成
