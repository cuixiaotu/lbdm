import { app, Menu, MenuItemConstructorOptions, shell } from 'electron'
import { accountMonitorService } from '../services/accountMonitorService'

export function createAppMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ] as MenuItemConstructorOptions[]
          }
        ]
      : []),
    ...(!isMac
      ? [
          {
            label: '应用',
            submenu: [{ role: 'quit' }] as MenuItemConstructorOptions[]
          }
        ]
      : []),
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
      ] as MenuItemConstructorOptions[]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        //{ role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: '监控',
      submenu: [
        {
          id: 'toggle-monitor',
          label: '启用监控',
          type: 'checkbox',
          checked: accountMonitorService.running,
          click: (menuItem) => {
            try {
              if (accountMonitorService.running) {
                accountMonitorService.stop()
              } else {
                accountMonitorService.start()
              }
              menuItem.checked = accountMonitorService.running
            } catch (error) {
              console.error('[Menu] Toggle monitor failed:', error)
            }
          }
        }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ role: 'front' }] : [])
      ] as MenuItemConstructorOptions[]
    },
    {
      role: 'help',
      submenu: [
        {
          label: '项目文档',
          click: async () => {
            const url = 'https://github.com/'
            await shell.openExternal(url)
          }
        }
      ] as MenuItemConstructorOptions[]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
