import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'

export class EventService {
  private static instance: EventService
  private mainWindow: BrowserWindow | null = null

  private constructor() {}

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService()
    }
    return EventService.instance
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  // Gửi sự kiện đến renderer process
  public sendToRenderer(channel: string, ...args: any[]) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(channel, ...args)
    }
  }

  // Lắng nghe sự kiện từ renderer process
  public on(channel: string, listener: (...args: any[]) => void) {
    ipcMain.on(channel, (event, ...args) => {
      listener(...args)
    })
  }

  // Lắng nghe sự kiện một lần từ renderer process
  public once(channel: string, listener: (...args: any[]) => void) {
    ipcMain.once(channel, (event, ...args) => {
      listener(...args)
    })
  }

  // Hủy lắng nghe sự kiện
  public removeListener(channel: string, listener: (...args: any[]) => void) {
    ipcMain.removeListener(channel, listener)
  }

  // Gửi sự kiện đến tất cả renderer processes
  public broadcast(channel: string, ...args: any[]) {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(channel, ...args)
    })
  }
}
