import { ref } from 'vue'

// 定义对话框选项类型
export interface DialogOptions {
  type?: 'info' | 'error' | 'warning' | 'success'
  title: string
  message: string
  detail?: string
  buttons?: string[]
  defaultId?: number
  cancelId?: number
}

// 定义对话框响应类型
export interface DialogResult {
  response: number
  checkboxChecked: boolean
}

// 对话框状态（全局共享）
export const dialogState = ref<{
  open: boolean
  title: string
  description: string
  type: 'info' | 'error' | 'warning' | 'success'
  buttons: string[]
  defaultId: number
  cancelId: number
  resolve: (value: DialogResult) => void
}>({
  open: false,
  title: '',
  description: '',
  type: 'info',
  buttons: ['确定'],
  defaultId: 0,
  cancelId: 0,
  resolve: () => {}
})

// 显示对话框的函数
export function showDialog(options: DialogOptions): Promise<DialogResult> {
  return new Promise((resolve) => {
    dialogState.value = {
      open: true,
      title: options.title,
      description: options.message + (options.detail ? '\n\n' + options.detail : ''),
      type: options.type || 'info',
      buttons: options.buttons || ['确定'],
      defaultId: options.defaultId !== undefined ? options.defaultId : 0,
      cancelId: options.cancelId !== undefined ? options.cancelId : 0,
      resolve
    }
  })
}

// 处理对话框响应
export function handleDialogResponse(response: DialogResult): void {
  dialogState.value.resolve(response)
  dialogState.value.open = false
}
