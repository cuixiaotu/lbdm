import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                external: [
                    'better-sqlite3',
                    'better-sqlite3-multiple-ciphers',
                    'bindings',
                    'cpu-features',
                    'ssh2'
                ]
            },
            commonjsOptions: {
                ignoreDynamicRequires: true
            }
        }
    },

    preload: {
        plugins: [externalizeDepsPlugin()]
    },
    renderer: {
        resolve: {
            alias: {
                '@renderer': resolve('src/renderer/src'),
                '@': resolve('src/renderer/src')
            }
        },
        plugins: [vue()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/renderer/index.html'),
                    'log-viewer': resolve(__dirname, 'src/renderer/log-viewer.html')
                }
            }
        }
    }
})
