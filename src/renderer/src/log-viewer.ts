import { createApp } from 'vue'
import LogViewerApp from './LogViewerApp.vue'
import './assets/main.css'

const app = createApp(LogViewerApp)
app.mount('#log-viewer-app')
