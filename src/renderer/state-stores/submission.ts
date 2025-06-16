import { defineStore } from 'pinia'
import { DocIdToFileName, Result, Submission } from '@/shared/types/submission'
import { SUBMISSION_STATUS } from '@/shared/types'
import { IPC_CHANNELS } from '@/shared/constants'

export const useSubmissionStore = defineStore('submission', {
  state: () => ({
    submissions: new Map<Submission['submissionId'], Submission>() // Store submissions with submissionId as key
  }),

  actions: {
    addSubmission(submission: Submission) {
      this.submissions.set(submission.submissionId, submission)
    },

    setStatus(submissionId: number, status: SUBMISSION_STATUS) {
      if (this.submissions.has(submissionId)) {
        const submission = this.submissions.get(submissionId)
        if (submission) {
          submission.status = status
        }
      }
    },

    setResult(submissionId: number, result: Result, docIdToFileName: DocIdToFileName) {
      if (this.submissions.has(submissionId)) {
        const submission = this.submissions.get(submissionId)
        if (submission) {
          submission.result = result
          submission.docIdToFileName = docIdToFileName
          submission.status = SUBMISSION_STATUS.COMPLETED
        }
      }
    },

    deleteSubmission(submissionId: number) {
      this.submissions.delete(submissionId)
      window.mainApi.invoke(IPC_CHANNELS.MAIN.DELETE_SUBMISSION, submissionId)
    },

    reset() {
      this.submissions.clear()
    },

    async fetchSubmissions(submissionId: number) {
      const { result, docIdToFileName } = await window.mainApi.invoke(
        IPC_CHANNELS.MAIN.GET_SUBMISSION_RESULT,
        submissionId
      )
      if (result) {
        console.log(result)
        if (this.submissions.has(submissionId)) {
          const submission = this.submissions.get(submissionId)
          if (submission) {
            submission.result = result
            submission.docIdToFileName = docIdToFileName
            submission.status = SUBMISSION_STATUS.COMPLETED
          }
        }
      }
    }
  },

  getters: {
    getSubmissionById: (state) => (submissionId: number) => {
      if (!state.submissions.has(submissionId)) {
        return null
      }
      return state.submissions.get(submissionId) || null
    },

    getAllSubmissions: (state) => {
      return Array.from(state.submissions.values())
    }
  }
})
