import { BaseResponse } from './api'

export enum SUBMISSION_TYPE {
  MULTIPLE_SEMANTIC,
  MULTIPLE_MATCHING,
  SINGLE_SEMANTIC,
  SINGLE_MATCHING
}

export enum SUBMISSION_STATUS {
  CREATED,
  PROCESSING,
  COMPLETED,
  ERROR
}

export const SUBMISSION_TYPE_LABEL = {
  [SUBMISSION_TYPE.MULTIPLE_SEMANTIC]: 'Kiểm tra đa văn bản - So sánh ngữ nghĩa',
  [SUBMISSION_TYPE.MULTIPLE_MATCHING]: 'Kiểm tra đa văn bản - So sánh khớp từ vựng',
  [SUBMISSION_TYPE.SINGLE_SEMANTIC]: 'Kiểm tra đơn văn bản - So sánh ngữ nghĩa',
  [SUBMISSION_TYPE.SINGLE_MATCHING]: 'Kiểm tra đơn văn bản - So sánh khớp từ vựng'
} as const

export const SUBMISSION_STATUS_LABEL = {
  [SUBMISSION_STATUS.CREATED]: 'Đã tạo',
  [SUBMISSION_STATUS.PROCESSING]: 'Đang thực hiện',
  [SUBMISSION_STATUS.COMPLETED]: 'Hoàn thành',
  [SUBMISSION_STATUS.ERROR]: 'Lỗi'
}

export type MatchedSentence = {
  sentenceId: number
  docId: number
  text: string
  similarity: number
}

export type ComparisonData = {
  [key: string]: {
    sentenceId: number
    text: string
    matchedSentences: MatchedSentence[]
  }
}

type Stats = {
  [key: string]: {
    docId: number
    percentage: number
    matchedSentenceCount: number
  }
}

export type Result = {
  docId: number
  documentSentenceCount: number
  percentage: number
  stats: Stats
  comparisonData: ComparisonData
}

export type DocIdToFileName = {
  [key: number]: string
}

export interface Submission {
  submissionId: number
  submissionName: string
  submissionType: SUBMISSION_TYPE
  totalFiles: number
  status: SUBMISSION_STATUS
  result?: Result
  docIdToFileName?: DocIdToFileName
}

export interface CreateSubmissionReq {
  name: string
  type: SUBMISSION_TYPE
  documentCount: number
}

export type CreateSubmissionResp = BaseResponse<{
  submissionId: number
}>

export interface UploadDocumentReq {
  submissionId: number
  isDocCheck: number
  filePath: string
  sentences: any[]
}

export type UploadDocumentResp = BaseResponse<{
  documentId: number
}>

export interface EditSubmissionReq {
  submissionId: number
  submissionName: string
  ignoreDocId: number[]
  additionalDocCount: number
}

export type EditSubmissionResp = BaseResponse<{
  submissionId: number
}>

export type DeleteSubmissionReq = {
  submissionId: number
}
export type DeleteSubmissionResp = BaseResponse<{
  success: boolean
}>
interface HighlightSentence {
  sentenceId: number
  text: string
}

export interface HighlightData {
  page: number
  data: HighlightSentence[]
}

export const REASON_CONFIG = {
  WRONG_DETECTION: {
    value: 'wrong_detection',
    label: 'Nhận diện sai',
    severity: 'warning'
  },
  REFERENCED: {
    value: 'referenced',
    label: 'Đã khai báo tài liệu tham khảo',
    severity: 'success'
  },
  OTHER: {
    value: 'other',
    label: 'Lý do khác',
    severity: 'info'
  }
} as const

export type ReasonType = keyof typeof REASON_CONFIG

export type MatchSentenceUI = MatchedSentence & {
  sourceSentenceId: number
  sourceText: string
  isDeleted?: boolean
  reasonType?: ReasonType
  reasonText?: string
}
