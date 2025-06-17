export const ROUTES = {
  LOGIN: '/login',

  CHECK: '/check',
  CHECK_SINGLE: '/check/single',
  CHECK_MULTIPLE: '/check/multiple',
  CHECK_MULTIPLE_RESULT: '/check/multiple/result',
  CHECK_RESULT_PDF_VIEW: '/check/result/pdf-view',
  LIST_SUBMISSION: '/submissions',
  SETTINGS: '/settings',
  DOCUMENTS: '/documents',
  HELP: '/help'
} as const

export const API_ENDPOINT = {
  BASE_URL: 'http://localhost:8080',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  REFRESH_TOKEN: '/api/auth/refresh-token',
  DOCUMENT_UPLOAD: '/api/document/upload',
  SUBMISSION_CREATE: '/api/submission/create',
  SUBMISSION_EDIT: '/api/submission/edit',
  SUBMISSION_DELETE: '/api/submission/delete',
  SUBMISSION_GET_RESULT: '/api/submission/get-result',
  WS_URL: 'http://localhost:8080/ws'
} as const
