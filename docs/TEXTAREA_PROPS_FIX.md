# Cookie Textarea 修复说明

## 问题描述

1. **Vue 警告**：`rows` 属性类型检查失败

   ```
   [Vue warn]: Invalid prop: type check failed for prop "rows".
   Expected Number with value 6, got String with value "6".
   ```

2. **交互问题**：Cookie 回显后应该禁用 Textarea，防止用户误编辑

## 修复内容

### 1. 修复 `rows` 属性类型

**之前（错误）**：

```vue
<Textarea rows="6" />
<!-- 字符串 -->
```

**修复后（正确）**：

```vue
<Textarea :rows="6" />
<!-- 使用 v-bind，传递数字 -->
```

**原因**：

- 没有使用 `v-bind`（`:` 前缀）时，Vue 将属性值作为字符串传递
- Textarea 组件的 `rows` prop 定义为 `number` 类型
- 需要使用 `:rows="6"` 来传递数字而不是字符串 `"6"`

### 2. 添加 `disabled` 属性

```vue
<Textarea
  v-model="newAccount.cookie"
  :rows="6"
  readonly
  disabled  <!-- 新增：禁用编辑 -->
/>
```

**效果**：

- Cookie 回显后，Textarea 处于禁用状态
- 用户无法编辑或选择文本
- 视觉上显示为灰色，明确表示不可编辑

## 修改文件

- `src/renderer/src/components/AccountAdd.vue`

## 验证

✅ Vue 警告已消除
✅ Cookie 回显后 Textarea 正确禁用
✅ 类型检查通过
