<script setup lang="tsx">
import { useRouter } from 'vue-router'
import { IPC_CHANNELS, ROUTES } from '@/shared/constants'
import { DocIdToFileName, Result } from '@/shared/types/submission'
import { useSubmissionStore } from '@/renderer/state-stores/submission'
import { useAuthStore } from '@/renderer/state-stores/auth.store'
import { User } from '@/shared/types'

const router = useRouter()
const submissionStore = useSubmissionStore()
const authStore = useAuthStore()

window.mainApi.on(
  IPC_CHANNELS.RENDERER.SOCKET_MESSAGE,
  (event, submissionId: number, results: Result, docIdToFileName: DocIdToFileName) => {
    submissionStore.setResult(submissionId, results, docIdToFileName)
  }
)

// Handle auto login success
window.mainApi.on(IPC_CHANNELS.RENDERER.AUTO_LOGIN_SUCCESS, async (_, user: User) => {
  authStore.login(user)
  await authStore.loadSubmissions()
  router.push({ path: ROUTES.CHECK })
})

router.push({ path: ROUTES.LOGIN })
</script>

<template>
  <router-view />
</template>

<style>
html {
  overflow-y: auto !important;
  user-select: none;
}

html,
body {
  width: 100%;
  height: 100%;
}
</style>
