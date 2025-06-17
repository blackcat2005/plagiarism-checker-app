import { defineStore } from 'pinia'
import type { User, AuthState, LoginCredentials, LoginResponse } from '@/shared/types/auth'
import { IPC_CHANNELS } from '@/shared/constants/ipc.channels'
import { useSubmissionStore } from './submission'
import { SUBMISSION_STATUS } from '@/shared/types'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    user: null
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated,
    currentUser: (state) => state.user
  },

  actions: {
    async login(user: User) {
      this.isAuthenticated = true
      this.user = user
      await this.loadSubmissions()
    },

    async logout() {
      this.isAuthenticated = false
      this.user = null
    },

    async loadSubmissions() {
      try {
        const submissionStore = useSubmissionStore()
        const submissions = await window.mainApi.invoke(IPC_CHANNELS.MAIN.GET_USER_SUBMISSIONS)

        if (submissions && Array.isArray(submissions)) {
          for (const submission of submissions) {
            // If submission has result, load it
            const submissionState = {
              submissionId: submission.id,
              submissionName: submission.name,
              submissionType: submission.type,
              totalFiles: submission.document_count,
              status: submission.status,
              result: undefined,
              docIdToFileName: undefined
            }
            if (submission.result_path) {
              const { result, docIdToFileName } = await window.mainApi.invoke(
                IPC_CHANNELS.MAIN.GET_SUBMISSION_RESULT,
                submission.id
              )
              if (result) {
                submissionState.result = result.results
                submissionState.docIdToFileName = docIdToFileName
                submissionState.status = SUBMISSION_STATUS.COMPLETED
              }
            }
            // Add submission to store
            submissionStore.addSubmission(submissionState)
          }
        }
      } catch (error) {
        console.error('Error loading submissions:', error)
      }
    }
  }
})
