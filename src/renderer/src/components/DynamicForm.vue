<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-vue-next'

interface FormItem {
  id: number
  username: string
  password: string
}

const formItems = ref<FormItem[]>([
  { id: 1, username: '', password: '' }
])

let nextId = 2

const addFormItem = (): void => {
  formItems.value.push({
    id: nextId++,
    username: '',
    password: ''
  })
}

const removeFormItem = (id: number): void => {
  if (formItems.value.length > 1) {
    formItems.value = formItems.value.filter(item => item.id !== id)
  }
}

const handleFetch = (item: FormItem): void => {
  console.log('获取数据:', {
    id: item.id,
    username: item.username,
    password: item.password
  })
  // 这里可以添加实际的获取逻辑
  alert(`获取用户 ${item.username} 的数据`)
}
</script>

<template>
  <div class="w-full space-y-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">动态表单</h1>
      <Button @click="addFormItem" class="gap-2">
        <Plus class="w-4 h-4" />
        添加条目
      </Button>
    </div>

    <div class="space-y-4">
      <Card v-for="item in formItems" :key="item.id" class="relative">
        <CardHeader>
          <div class="flex justify-between items-center">
            <CardTitle class="text-lg">条目 #{{ item.id }}</CardTitle>
            <Button
              v-if="formItems.length > 1"
              variant="ghost"
              size="icon"
              @click="removeFormItem(item.id)"
              class="text-destructive hover:text-destructive"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                用户名
              </label>
              <Input
                v-model="item.username"
                type="text"
                placeholder="请输入用户名"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                密码
              </label>
              <Input
                v-model="item.password"
                type="password"
                placeholder="请输入密码"
              />
            </div>

            <div>
              <Button
                @click="handleFetch(item)"
                variant="default"
                class="w-full"
              >
                获取
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
