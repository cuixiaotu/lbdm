import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Layout from '@/components/Layout.vue'
import Dashboard from '@/views/Dashboard.vue'
import MonitorQueue from '@/views/MonitorQueue.vue'
import Configuration from '@/views/Configuration.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'monitor-queue',
        name: 'MonitorQueue',
        component: MonitorQueue
      },
      {
        path: 'configuration',
        name: 'Configuration',
        component: Configuration
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
