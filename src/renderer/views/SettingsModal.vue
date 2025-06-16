<template>
  <Dialog
    :visible="props.visible"
    @update:visible="onDialogClose"
    :modal="true"
    header="Cài đặt"
    :style="{ width: '50vw' }"
  >
    <div class="user-info p-3 border-1 surface-border border-round">
      <h3 class="mt-0 mb-3">Thông tin tài khoản</h3>
      <div class="flex flex-column gap-2">
        <div class="flex align-items-center justify-content-between">
          <span class="text-500">Tên đăng nhập:</span>
          <span class="font-medium">{{ authStore.user?.username }}</span>
        </div>
        <Button label="Đăng xuất" severity="danger" class="mt-2" @click="handleLogout" />
      </div>
    </div>
    <Toast />
  </Dialog>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/renderer/state-stores/auth.store'
import { ROUTES, IPC_CHANNELS } from '@/shared/constants'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:visible'])
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const handleLogout = async () => {
  try {
    await window.mainApi.invoke(IPC_CHANNELS.MAIN.AUTH_LOGOUT)
    authStore.logout()
    emit('update:visible', false)
    toast.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Đã đăng xuất',
      life: 3000
    })
    router.push({ path: ROUTES.LOGIN })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: 'Đăng xuất thất bại',
      life: 3000
    })
  }
}

const onDialogClose = (value) => {
  emit('update:visible', value)
}
</script>

<style scoped>
.user-info {
  background: var(--surface-card);
}
</style>
