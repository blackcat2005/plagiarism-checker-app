<template>
  <div class="surface-ground flex mt-4 align-items-start justify-content-center overflow-hidden">
    <Toast />
    <div class="w-30rem flex flex-column align-items-start justify-content-center">
      <div class="w-full surface-card sm:px-10">
        <div class="text-center mb-6">
          <img
            src="@/public/images/logo.svg"
            alt="Logo"
            class="mb-4"
            style="width: 120px; height: auto"
          />
          <div class="text-900 text-3xl font-medium mb-2"> Đăng nhập </div>
        </div>

        <div class="px-2">
          <div class="flex flex-column gap-3 mb-4">
            <InputText
              id="username"
              v-model="username"
              type="text"
              class="w-full p-3"
              placeholder="Username"
            />
          </div>

          <div class="flex flex-column gap-3 mb-5">
            <Password
              id="password"
              v-model="password"
              class="w-full"
              :feedback="false"
              :toggle-mask="true"
              placeholder="Password"
              inputClass="w-full p-3"
            />
          </div>

          <Button
            :label="loading ? 'Đang đăng nhập...' : 'Đăng nhập'"
            class="w-full p-3 text-xl"
            @click="handleLogin"
            :loading="loading"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { ROUTES } from '@/shared/constants/app.constants'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useAuthStore } from '@/renderer/state-stores/auth.store'
import { IPC_CHANNELS } from '@/shared/constants'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    toast.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: 'Vui lòng điền đầy đủ thông tin',
      life: 3000
    })
    return
  }

  loading.value = true
  try {
    const response = await window.mainApi.invoke(IPC_CHANNELS.MAIN.AUTH_LOGIN, {
      username: username.value,
      password: password.value
    })
    if (response && response['accessToken']) {
      authStore.login(response.user)
      toast.add({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Đăng nhập thành công',
        life: 3000
      })
      await router.push({ path: ROUTES.CHECK })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Thông tin đăng nhập không chính xác',
        life: 3000
      })
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Đăng nhập thất bại', life: 3000 })
  } finally {
    loading.value = false
  }
}
</script>
