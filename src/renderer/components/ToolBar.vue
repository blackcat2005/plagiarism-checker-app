<template>
  <div
    class="surface-100 flex align-items-center justify-content-between gap-2 py-2 px-3 border-bottom-1 surface-border toolbar"
    @dblclick="toggleMaximize"
  >
    <!-- Logo and title -->
    <div class="flex align-items-center gap-2">
      <img
        src="@/public/images/logo.svg"
        alt="Logo"
        class="w-2rem h-2rem border-round-lg object-cover surface-200"
      />
      <span class="text-xl font-bold text-primary">Plagiarism Checker</span>
    </div>

    <!-- Navigation buttons -->
    <div
      v-if="authStore.isAuthenticated"
      class="flex align-items-center gap-2 ml-auto mr-4 no-drag"
    >
      <Button
        icon="pi pi-history"
        text
        rounded
        v-p-tooltip.bottom="'Lịch sử kiểm tra'"
        @click="navigateToHistory"
      />
      <Button icon="pi pi-cog" text rounded v-p-tooltip.bottom="'Cài đặt'" @click="openSettings" />
    </div>

    <!-- Window controls -->
    <div class="flex align-items-center gap-2 no-drag">
      <Button
        icon="pi pi-minus"
        text
        rounded
        severity="secondary"
        @click="minimize"
        class="window-control"
      />

      <Button
        :icon="isMaximized ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
        text
        rounded
        severity="secondary"
        @click="toggleMaximize"
        @dblclick="toggleMaximize"
        class="window-control"
      />

      <Button
        icon="pi pi-times"
        text
        rounded
        severity="danger"
        @click="close"
        class="window-control"
      />
    </div>

    <!-- Settings Modal -->
    <SettingsModal v-model:visible="settingsVisible" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import SettingsModal from '@/renderer/views/SettingsModal.vue'
import { useAuthStore } from '@/renderer/state-stores/auth.store'
import { IPC_CHANNELS, ROUTES } from '@/shared/constants'
import { useRouter } from 'vue-router'

const router = useRouter()

const authStore = useAuthStore()

const isMaximized = ref(false)
const settingsVisible = ref(false)
const isDarkMode = ref(false)

const toggleMaximize = async () => {
  await window.mainApi.send(IPC_CHANNELS.MAIN.MAXIMIZE_WINDOW)
  isMaximized.value = !isMaximized.value
}

const minimize = async () => {
  await window.mainApi.send(IPC_CHANNELS.MAIN.MINIMIZE_WINDOW)
}

const close = async () => {
  await window.mainApi.send(IPC_CHANNELS.MAIN.CLOSE_WINDOW)
}

const openSettings = () => {
  settingsVisible.value = true
}

const navigateToHistory = () => {
  router.push({ path: ROUTES.LIST_SUBMISSION })
}

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  document.body.classList.toggle('dark-mode')
}
</script>

<style scoped>
.ml-auto {
  margin-left: auto;
}

.mr-4 {
  margin-right: 1rem;
}

.toolbar {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}

.window-control {
  -webkit-app-region: no-drag;
  width: 2.5rem;
  height: 2.5rem;
}
</style>
