<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Trash2, Download, Pause, Play } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { CanvasAddon } from '@xterm/addon-canvas'
import '@xterm/xterm/css/xterm.css'

interface LogEntry {
  id: string
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: unknown
  source?: string
}

// 终端相关
const terminalRef = ref<HTMLElement>()
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null

// 控制
const isPaused = ref(false)
const logBuffer: LogEntry[] = []
const allLogs: LogEntry[] = []

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  bold: '\x1b[1m'
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  // 防御性编程：如果 timestamp 无效，使用当前时间
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    timestamp = Date.now()
  }

  const date = new Date(timestamp)

  // 再次验证 Date 对象是否有效
  if (isNaN(date.getTime())) {
    return '??:??:??.???'
  }

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

// 获取日志级别颜色
const getLevelColor = (level: string): string => {
  const colorMap: Record<string, string> = {
    debug: colors.gray,
    info: colors.blue,
    warn: colors.yellow,
    error: colors.red
  }
  return colorMap[level] || colors.blue
}

// 格式化日志到终端
const writeLogToTerminal = (log: LogEntry): void => {
  if (!terminal || isPaused.value) {
    logBuffer.push(log)
    return
  }

  // 确保 log.level 有值，默认为 'info'
  const level = log.level || 'info'
  const time = formatTime(log.timestamp)
  const levelColor = getLevelColor(level)
  const levelText = level.toUpperCase().padEnd(5)

  // 格式: [时间] [级别] 消息
  let line = `${colors.gray}[${time}]${colors.reset} `
  line += `${levelColor}${colors.bold}[${levelText}]${colors.reset} `
  line += `${log.message || ''}`

  // 添加来源信息
  if (log.source) {
    line += ` ${colors.cyan}(${log.source})${colors.reset}`
  }

  terminal.writeln(line)

  // 如果有附加数据
  if (log.data) {
    try {
      const dataStr = JSON.stringify(log.data, null, 2)
      const dataLines = dataStr.split('\n')
      dataLines.forEach((dataLine) => {
        terminal!.writeln(`  ${colors.gray}${dataLine}${colors.reset}`)
      })
    } catch {
      terminal!.writeln(`  ${colors.gray}[数据格式化失败]${colors.reset}`)
    }
  }
}

// 清空终端
const clearTerminal = (): void => {
  if (terminal) {
    terminal.clear()
  }
  allLogs.length = 0
  logBuffer.length = 0
}

// 清空日志
const clearLogs = async (): Promise<void> => {
  await window.api.logger.clear()
  clearTerminal()
}

// 导出日志
const exportLogs = (): void => {
  const content = allLogs
    .map((log) => {
      const time = new Date(log.timestamp).toISOString()
      const level = log.level || 'info'
      const message = log.message || ''
      const data = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : ''
      return `[${time}] [${level.toUpperCase()}] ${message}${data}`
    })
    .join('\n\n')

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// 切换暂停状态
const togglePause = (): void => {
  isPaused.value = !isPaused.value

  // 恢复时写入缓冲的日志
  if (!isPaused.value && logBuffer.length > 0) {
    logBuffer.forEach((log) => writeLogToTerminal(log))
    logBuffer.length = 0
  }
}

// 监听新日志
const handleNewLog = (_event: unknown, entry: LogEntry): void => {
  allLogs.push(entry)

  // 限制日志数量
  if (allLogs.length > 10000) {
    allLogs.shift()
  }

  writeLogToTerminal(entry)
}

// 监听原始日志（带 ANSI 颜色码）
const handleRawLog = (_event: unknown, message: string): void => {
  if (!terminal || isPaused.value) {
    return
  }

  // 直接写入终端，保留 ANSI 颜色代码
  const lines = message.split('\n')
  lines.forEach((line) => {
    if (line) {
      terminal!.writeln(line)
    } else {
      terminal!.writeln('')
    }
  })
}

// 监听清空日志
const handleClearLogs = (): void => {
  clearTerminal()
}

/**
 * 执行清理操作
 * 移除所有事件监听器，销毁终端实例
 */
let isCleanedUp = false // 防止重复清理

const cleanup = (): void => {
  if (isCleanedUp) {
    console.log('[LogViewer] Cleanup already executed, skipping')
    return
  }

  isCleanedUp = true
  console.log('[LogViewer] Starting cleanup process...')
  console.log('[LogViewer] Handlers:', {
    handleNewLog: handleNewLog.name || 'handleNewLog',
    handleClearLogs: handleClearLogs.name || 'handleClearLogs',
    handleRawLog: handleRawLog.name || 'handleRawLog'
  })

  // 移除所有事件监听器
  console.log('[LogViewer] Removing handleNewLog listener...')
  window.api.logger.off(handleNewLog)

  console.log('[LogViewer] Removing handleClearLogs listener...')
  window.api.logger.offClear(handleClearLogs)

  console.log('[LogViewer] Removing handleRawLog listener...')
  window.api.logger.offRaw(handleRawLog)

  // 销毁终端实例
  if (terminal) {
    console.log('[LogViewer] Disposing terminal instance...')
    terminal.dispose()
    terminal = null
    console.log('[LogViewer] Terminal disposed')
  } else {
    console.log('[LogViewer] No terminal instance to dispose')
  }

  console.log('[LogViewer] Cleanup completed successfully')

  // 通知主进程清理已完成
  console.log('[LogViewer] Notifying main process that cleanup is complete')
  window.api.logger.notifyCleanupComplete()
}

// 在组件顶层立即监听窗口关闭事件（修复：使用正确的事件名）
if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
  console.log('[LogViewer] Setting up window:will-close listener at component top level')
  window.electron.ipcRenderer.on('window:will-close', () => {
    console.log('[LogViewer] Received window:will-close event')
    cleanup()
  })
}

// 初始化终端
const initTerminal = async (): Promise<void> => {
  if (!terminalRef.value) return

  // 创建终端实例
  terminal = new Terminal({
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.4,
    cursorBlink: false,
    cursorStyle: 'bar',
    scrollback: 10000,
    rows: 30, // 设置默认行数
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#aeafad',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff'
    }
  })

  // 添加自适应插件
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  // 添加 Canvas 渲染器（性能更好）
  const canvasAddon = new CanvasAddon()
  terminal.loadAddon(canvasAddon)

  // 添加链接插件
  terminal.loadAddon(new WebLinksAddon())

  // 挂载到 DOM
  terminal.open(terminalRef.value)

  // 延迟适配，确保 DOM 完全渲染
  await nextTick()
  fitAddon.fit()

  // 欢迎信息
  terminal.writeln(
    `${colors.green}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  )
  terminal.writeln(`${colors.cyan}${colors.bold}  日志查看器已启动${colors.reset}`)
  terminal.writeln(`${colors.gray}  实时监控系统日志输出${colors.reset}`)
  terminal.writeln(
    `${colors.green}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  )
  terminal.writeln('')

  // 窗口大小改变时重新适配
  const resizeObserver = new ResizeObserver(() => {
    // 使用 requestAnimationFrame 确保在浏览器重绘前执行
    requestAnimationFrame(() => {
      fitAddon?.fit()
    })
  })
  resizeObserver.observe(terminalRef.value)

  // 获取历史日志
  const historicalLogs = await window.api.logger.getAll()
  allLogs.push(...historicalLogs)
  historicalLogs.forEach((log) => writeLogToTerminal(log))

  // 监听新日志
  window.api.logger.on(handleNewLog)
  window.api.logger.onClear(handleClearLogs)
  // 监听原始日志（带 ANSI 颜色码）
  window.api.logger.onRaw(handleRawLog)
}

// 生命周期
onMounted(async () => {
  await nextTick()
  await initTerminal()
})

onUnmounted(() => {
  // 在组件卸载时也执行清理（作为后备）
  console.log('[LogViewer] Component unmounting, executing cleanup...')
  cleanup()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 固定头部 -->
    <div class="flex-shrink-0 mb-6 flex items-center justify-between">
      <div>
        <h2 class="text-3xl font-bold text-foreground">日志查看器</h2>
        <p class="text-muted-foreground mt-2">
          实时监控系统日志输出
          <span v-if="allLogs.length > 0" class="ml-2"> · 总计: {{ allLogs.length }} 条 </span>
          <span v-if="isPaused" class="ml-2 text-yellow-600 dark:text-yellow-400"> · 已暂停 </span>
        </p>
      </div>
    </div>

    <!-- 终端显示区域 -->
    <div class="flex-1 overflow-hidden">
      <!-- 终端卡片 -->
      <div class="h-full rounded-lg border bg-card shadow-sm overflow-hidden">
        <div ref="terminalRef" class="bg-[#1e1e1e] p-4 h-full"></div>
      </div>
    </div>

    <!-- 固定底部操作按钮 -->
    <div class="flex-shrink-0 border-t bg-background pt-4 mt-4">
      <div class="max-w-full flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          <span
            v-if="isPaused"
            class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400"
          >
            <Pause class="w-3 h-3" />
            日志输出已暂停
          </span>
          <span v-else class="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Play class="w-3 h-3" />
            实时输出中
          </span>
        </div>
        <div class="flex gap-3">
          <Button variant="outline" class="gap-2" @click="togglePause">
            <component :is="isPaused ? Play : Pause" class="w-4 h-4" />
            {{ isPaused ? '继续' : '暂停' }}
          </Button>
          <Button variant="destructive" class="gap-2" @click="clearLogs">
            <Trash2 class="w-4 h-4" />
            清空日志
          </Button>
          <Button class="gap-2" @click="exportLogs">
            <Download class="w-4 h-4" />
            导出日志
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
