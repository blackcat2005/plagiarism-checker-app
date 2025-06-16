import { ipcMain } from 'electron'
import { API_ENDPOINT, IPC_CHANNELS } from '../../shared/constants'
import { createRequire } from 'module'
import {
  CreateSubmissionReq,
  EditSubmissionReq,
  EditSubmissionResp,
  SUBMISSION_STATUS,
  UploadDocumentReq,
  UploadDocumentResp
} from '../../shared/types/submission'
import { CreateSubmissionResp } from '../../shared/types/submission'
import { HttpService } from './http.service'
import { DatabaseManager } from '../database/database.manager'
import { SubmissionRepo } from '../database/submission.repo'
import authStore from '../app-stores/auth.store'
import { DocumentRepo } from '../database/document.repo'
import { SentenceRepo } from '../database/sentence.repo'
import axios from 'axios'

const require = createRequire(import.meta.url)
const fs = require('fs')
const submissionService = new SubmissionRepo()
const documentService = new DocumentRepo()
const sentenceService = new SentenceRepo()

export function setupSubmissionHandlers() {
  ipcMain.handle(IPC_CHANNELS.MAIN.READ_FILE, async (_, filePath: string) => {
    const pdfSource = fs.readFileSync(filePath, 'base64')
    return pdfSource
  })

  ipcMain.handle(
    IPC_CHANNELS.MAIN.SUBMISSION_CREATE,
    async (_, submission: CreateSubmissionReq) => {
      const response = await HttpService.getInstance()
        .getAxiosInstance()
        .post<CreateSubmissionResp>(API_ENDPOINT.SUBMISSION_CREATE, submission)
      if (response.data.code === 2000) {
        const submissionData = response.data.result
        const submissionCreated = await submissionService.create({
          id: submissionData.submissionId,
          name: submission.name,
          type: submission.type,
          status: SUBMISSION_STATUS.CREATED,
          document_count: submission.documentCount,
          user_id: authStore.get('userId')
        })
        return submissionCreated
      }
      return response.data.result
    }
  )

  ipcMain.handle(IPC_CHANNELS.MAIN.UPLOAD_DOCUMENT, async (_, document: UploadDocumentReq) => {
    const response = await HttpService.getInstance()
      .getAxiosInstance()
      .post<UploadDocumentResp>(API_ENDPOINT.DOCUMENT_UPLOAD, document)
    if (response.data.code === 2000) {
      const documentData = response.data.result
      await documentService.create({
        id: documentData.documentId,
        submission_id: document.submissionId,
        name: document.filePath,
        is_doc_check: document.isDocCheck ? 1 : 0
      })

      for (const sentence of document.sentences) {
        await sentenceService.create({
          id_in_doc: sentence.id,
          doc_id: documentData.documentId,
          page: sentence.pages,
          split: sentence.split,
          text: sentence.text
        })
      }
    }
    return response.data.result
  })

  ipcMain.handle(IPC_CHANNELS.MAIN.DOCUMENT_CHECK, async (_, submissionId: number) => {
    const documents = await documentService.findBySubmissionIdAndIsDocCheck(submissionId, true)
    if (documents.length > 0) {
      return documents[0].id
    }
    return null
  })

  ipcMain.handle(IPC_CHANNELS.MAIN.GET_SENTENCE, async (_, documentId: number) => {
    return await sentenceService.findByDocId(documentId)
  })

  ipcMain.handle(
    IPC_CHANNELS.MAIN.SAVE_FILE,
    async (_, filePath: string, data: Uint8Array, callback: (err: Error | null) => void) => {
      try {
        fs.writeFileSync(filePath, data)
        callback(null)
      } catch (err) {
        callback(err as Error)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.MAIN.SUBMISSION_EDIT, async (_, submission: EditSubmissionReq) => {
    const submissionResp = await HttpService.getInstance()
      .getAxiosInstance()
      .post<EditSubmissionResp>(API_ENDPOINT.SUBMISSION_EDIT, submission)

    const submissionEdit = await submissionService.findById(submissionResp.data.result.submissionId)
    submissionEdit.status = SUBMISSION_STATUS.PROCESSING
    submissionEdit.document_count = submissionEdit.document_count + submission.additionalDocCount
    submissionEdit.name = submission.submissionName
    await submissionService.update(submissionResp.data.result.submissionId, submissionEdit)

    return submissionResp.data.result
  })

  ipcMain.handle(IPC_CHANNELS.MAIN.GET_USER_SUBMISSIONS, async (_) => {
    const userId = authStore.get('userId')
    const submissions = await submissionService.findByUserId(userId)
    return submissions
  })

  ipcMain.handle(IPC_CHANNELS.MAIN.GET_SUBMISSION_RESULT, async (_, submissionId) => {
    const result = await submissionService.getResult(submissionId)
    const documents = await documentService.findBySubmissionId(submissionId)
    const docIdToFileName = documents.reduce((acc, doc) => {
      acc[doc.id] = doc.name
      return acc
    }, {})
    return { result, docIdToFileName }
  })

  ipcMain.handle(IPC_CHANNELS.MAIN.DELETE_SUBMISSION, async (_, submissionId: number) => {
    const submission = await submissionService.findById(submissionId)
    if (submission) {
      await sentenceService.deleteBySubmissionId(submissionId)
      await documentService.deleteBySubmissionId(submissionId)
      await submissionService.delete(submissionId)

      await HttpService.getInstance()
        .getAxiosInstance()
        .post(API_ENDPOINT.SUBMISSION_DELETE, { submissionId })
      return { success: true }
    }
  })
}

export async function getAndSaveResult() {
  const createdSubmission = await submissionService.getCreatedSubmissions()
  console.log('Created Submissions:', JSON.stringify(createdSubmission))
  for (const submission of createdSubmission) {
    try {
      const response = await HttpService.getInstance()
        .getAxiosInstance()
        .post(API_ENDPOINT.SUBMISSION_GET_RESULT, { submissionId: submission.id })
      if (response.data.code === 2000) {
        const result = response.data.result
        submission.status = SUBMISSION_STATUS.COMPLETED
        await submissionService.update(submission.id, submission)
        await submissionService.saveResult(submission.id, result)
      } else {
        submission.status = SUBMISSION_STATUS.ERROR
        await submissionService.update(submission.id, submission)
      }
    } catch (error) {
      console.error('Error auto-saving result:', error)
    }
  }
}
