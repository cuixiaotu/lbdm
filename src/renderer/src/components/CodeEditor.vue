<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'

interface Props {
  modelValue: string
  placeholder?: string
  readonly?: boolean
  height?: string
  theme?: 'light' | 'dark'
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '// 输入JavaScript代码...',
  readonly: false,
  height: '200px',
  theme: 'dark'
})

const emit = defineEmits<Emits>()

const editorContainer = ref<HTMLDivElement>()
let editorView: EditorView | null = null

// 初始化编辑器
onMounted(() => {
  if (!editorContainer.value) return

  const startState = EditorState.create({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      javascript(),
      props.theme === 'dark' ? oneDark : [],
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString()
          emit('update:modelValue', newValue)
        }
      }),
      EditorView.editable.of(!props.readonly),
      EditorState.readOnly.of(props.readonly)
    ]
  })

  editorView = new EditorView({
    state: startState,
    parent: editorContainer.value
  })
})

// 监听外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (editorView && newValue !== editorView.state.doc.toString()) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: newValue
        }
      })
    }
  }
)

// 监听只读状态变化
watch(
  () => props.readonly,
  (newReadonly) => {
    if (editorView) {
      // 重新创建编辑器以应用新的只读状态
      const currentValue = editorView.state.doc.toString()
      editorView.destroy()

      const startState = EditorState.create({
        doc: currentValue,
        extensions: [
          basicSetup,
          javascript(),
          props.theme === 'dark' ? oneDark : [],
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString()
              emit('update:modelValue', newValue)
            }
          }),
          EditorView.editable.of(!newReadonly),
          EditorState.readOnly.of(newReadonly)
        ]
      })

      editorView = new EditorView({
        state: startState,
        parent: editorContainer.value!
      })
    }
  }
)

// 清理
onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})
</script>

<template>
  <div
    class="code-editor-wrapper rounded-md border border-input overflow-hidden"
    :style="{ height: props.height }"
  >
    <div ref="editorContainer" class="h-full"></div>
  </div>
</template>

<style scoped>
.code-editor-wrapper {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.code-editor-wrapper :deep(.cm-editor) {
  height: 100%;
  font-size: 13px;
}

.code-editor-wrapper :deep(.cm-scroller) {
  overflow: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.code-editor-wrapper :deep(.cm-gutters) {
  background-color: transparent;
  border-right: 1px solid rgba(128, 128, 128, 0.2);
}

.code-editor-wrapper :deep(.cm-content) {
  padding: 8px 0;
}

.code-editor-wrapper :deep(.cm-line) {
  padding: 0 8px;
}
</style>
