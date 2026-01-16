import { ref } from 'vue'

export interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

export interface ToastItem extends ToastOptions {
  id: string
}

// Toast状态（全局共享）
export const toastState = ref<{
  toasts: ToastItem[]
}>({
  toasts: []
})

let toastIdCounter = 0

/**
 * 显示Toast提示
 */
export function showToast(options: ToastOptions): void {
  const id = `toast-${Date.now()}-${toastIdCounter++}`
  const duration = options.duration ?? 3000

  const toast: ToastItem = {
    id,
    type: options.type || 'info',
    title: options.title,
    message: options.message,
    duration
  }

  toastState.value.toasts.push(toast)

  // 自动移除
  if (duration > 0) {
    setTimeout(() => {
      toastState.value.toasts = toastState.value.toasts.filter((t) => t.id !== id)
    }, duration)
  }
}

/**
 * 成功提示
 */
export function showSuccess(message: string, title?: string): void {
  showToast({ type: 'success', message, title })
}

/**
 * 错误提示
 */
export function showError(message: string, title?: string): void {
  showToast({ type: 'error', message, title, duration: 5000 })
}

/**
 * 警告提示
 */
export function showWarning(message: string, title?: string): void {
  showToast({ type: 'warning', message, title, duration: 4000 })
}

/**
 * 信息提示
 */
export function showInfo(message: string, title?: string): void {
  showToast({ type: 'info', message, title })
}
