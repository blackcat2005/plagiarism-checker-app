import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import { DocumentRepo } from '../database/document.repo'
import { SubmissionRepo } from '../database/submission.repo'
import { SUBMISSION_STATUS } from '../../shared/types'

const documentRepo = new DocumentRepo()
const submissionRepo = new SubmissionRepo()

export class SocketService {
  private static instance: SocketService
  private userId: string | null = null
  private client: Client | null = null
  private token: string | null = null
  private mainWindow: BrowserWindow | null = null
  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  public setToken(token: string | null) {
    this.token = token
  }

  public setMainWindow(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  public setUserId(userId: string) {
    this.userId = userId
  }

  public connect(url: string) {
    if (!this.token) {
      console.error('No authentication token available')
      return
    }

    try {
      this.client = new Client({
        // brokerURL: url,
        webSocketFactory: () => new SockJS(url),
        connectHeaders: {
          Authorization: `Bearer ${this.token}`
        },
        debug: (str) => {
          console.log('STOMP Debug:', str)
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000
      })

      this.client.onConnect = () => {
        console.log('STOMP Connected')

        this.client.subscribe('/topic/plagiarism/' + this.userId, async (message) => {
          if (this.mainWindow) {
            const { submissionId, results } = JSON.parse(message.body)
            const documents = await documentRepo.findBySubmissionId(submissionId)
            const docIdToFileName = documents.reduce((acc, doc) => {
              acc[doc.id] = doc.name
              return acc
            }, {})

            this.mainWindow.webContents.send(
              IPC_CHANNELS.RENDERER.SOCKET_MESSAGE,
              submissionId,
              results,
              docIdToFileName
            )

            const submission = await submissionRepo.findById(submissionId)
            submission.status = SUBMISSION_STATUS.COMPLETED
            await submissionRepo.update(submissionId, submission)
            await submissionRepo.saveResult(submissionId, results)
          } else {
            console.log('Main window not init')
          }
        })
      }

      this.client.onStompError = (frame) => {
        console.error('STOMP Error:', frame)
      }

      this.client.onWebSocketClose = () => {
        console.log('STOMP Disconnected')
      }

      this.client.activate()
    } catch (error) {
      console.error('Failed to connect to STOMP:', error)
    }
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate()
      this.client = null
    }
  }

  public subscribe(destination: string, callback: (message: any) => void) {
    if (this.client && this.client.connected) {
      return this.client.subscribe(destination, (message) => {
        console.log('Received message:', message)
        const data = JSON.parse(message.body)
        callback(data)
      })
    } else {
      console.error('STOMP client is not connected')
      return null
    }
  }

  public send(destination: string, body: any) {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body)
      })
    } else {
      console.error('STOMP client is not connected')
    }
  }
}
