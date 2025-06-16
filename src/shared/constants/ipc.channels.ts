export const IPC_CHANNELS = {
  // Main process channels (renderer -> main)
  MAIN: {
    GET_VERSION: 'msgRequestGetVersion',
    MAXIMIZE_WINDOW: 'msgMaximizeWindow',
    MINIMIZE_WINDOW: 'msgMinimizeWindow',
    CLOSE_WINDOW: 'msgCloseWindow',
    OPEN_EXTERNAL_LINK: 'msgOpenExternalLink',
    OPEN_FILE: 'msgOpenFile',
    READ_FILE: 'msgReadFile',
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_CHECK: 'auth:check',
    SUBMISSION_CREATE: 'submission:create',
    SUBMISSION_EDIT: 'submission:edit',
    UPLOAD_DOCUMENT: 'upload:document',
    DOCUMENT_CHECK: 'document:check',
    GET_SENTENCE: 'get:sentence',
    SAVE_FILE: 'save:file',
    HIGHLIGHT: 'highlight:matches',
    GET_AUTH_STORE: 'get:auth-store',
    GET_USER_SUBMISSIONS: 'get:user-submissions',
    GET_SUBMISSION_RESULT: 'get:submission-result',
    DELETE_SUBMISSION: 'delete:submission'
  },
  // Renderer process channels (main -> renderer)
  RENDERER: {
    SOCKET_MESSAGE: 'msgSocketMessage',
    AUTO_LOGIN_SUCCESS: 'auto-login-success'
  }
} as const

// Type for all available channels
export type MainChannel = (typeof IPC_CHANNELS.MAIN)[keyof typeof IPC_CHANNELS.MAIN]
export type RendererChannel = (typeof IPC_CHANNELS.RENDERER)[keyof typeof IPC_CHANNELS.RENDERER]
