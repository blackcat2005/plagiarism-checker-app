import { app, WebContents, RenderProcessGoneDetails, BrowserWindow } from 'electron'
import BrowserConstants from './utils/browser.constants'
import { createErrorWindow, createMainWindow } from './MainRunner'
import { autoLogin } from './services/auth.service'
import { IPC_CHANNELS } from '../shared/constants'

let mainWindow
let errorWindow

app.on('ready', async () => {
  if (BrowserConstants.IS_DEV_ENV) {
    import('./index.dev')
  }

  // Disable special menus on macOS by uncommenting the following, if necessary
  /*
  if (Constants.IS_MAC) {
    systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
    systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
  }
  */

  mainWindow = await createMainWindow()

  const user = await autoLogin()
  if (user) {
    mainWindow.webContents.send(IPC_CHANNELS.RENDERER.AUTO_LOGIN_SUCCESS, user)
  }
})

app.on('activate', async () => {
  if (!mainWindow) {
    mainWindow = await createMainWindow()
  }
})

app.on('window-all-closed', () => {
  mainWindow = null
  errorWindow = null

  if (!BrowserConstants.IS_MAC) {
    app.quit()
  }
})

app.on(
  'render-process-gone',
  (event: Event, webContents: WebContents, details: RenderProcessGoneDetails) => {
    errorWindow = createErrorWindow(errorWindow, mainWindow, details)
  }
)

process.on('uncaughtException', () => {
  errorWindow = createErrorWindow(errorWindow, mainWindow)
})
