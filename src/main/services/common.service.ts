import { ipcMain, shell, IpcMainEvent, dialog, BrowserWindow } from 'electron'
import BrowserConstants from '../utils/browser.constants'
import { IPC_CHANNELS } from '../../shared/constants/ipc.channels'

export default class CommonService {
  static initialize(): void {
    // Get application version
    ipcMain.handle(IPC_CHANNELS.MAIN.GET_VERSION, () => {
      return BrowserConstants.APP_VERSION
    })

    // Open url via web browser
    ipcMain.on(IPC_CHANNELS.MAIN.OPEN_EXTERNAL_LINK, async (event: IpcMainEvent, url: string) => {
      await shell.openExternal(url)
    })

    // Open file
    ipcMain.handle(IPC_CHANNELS.MAIN.OPEN_FILE, async (event: IpcMainEvent, filter: string) => {
      const filters = [{ name: 'All Files', extensions: ['*'] }]
      if (filter === 'pdf') {
        filters.push({ name: 'PDF', extensions: ['pdf'] })
      }
      const dialogResult = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters,
        title: 'Open File'
      })
      return dialogResult
    })

    ipcMain.on(IPC_CHANNELS.MAIN.MAXIMIZE_WINDOW, async (event: IpcMainEvent) => {
      const window = BrowserWindow.getFocusedWindow()
      console.log('maximize window', window)
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize()
        } else {
          window.maximize()
        }
      }
    })

    ipcMain.on(IPC_CHANNELS.MAIN.MINIMIZE_WINDOW, async (event: IpcMainEvent) => {
      const window = BrowserWindow.getFocusedWindow()
      if (window) {
        window.minimize()
      }
    })

    ipcMain.on(IPC_CHANNELS.MAIN.CLOSE_WINDOW, async (event: IpcMainEvent) => {
      const window = BrowserWindow.getFocusedWindow()
      if (window) {
        window.close()
      }
    })
  }
}
