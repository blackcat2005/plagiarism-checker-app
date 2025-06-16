import {
  app,
  BrowserWindow,
  RenderProcessGoneDetails,
  BrowserWindowConstructorOptions
} from 'electron'
import BrowserConstants, { TrayOptions } from './utils/browser.constants'
import CommonService from './services/common.service'
import { createTray, hideWindow, showWindow } from './tray'
import { setupAuthHandlers } from './services/auth.service'
import { setupSubmissionHandlers } from './services/submission.service'
import { SocketService } from './services/socket.service'
import HighlightService from './services/highlight.service'

const options = {
  width: BrowserConstants.IS_DEV_ENV ? 1500 : 1200,
  height: 650,
  tray: {
    // all optional values from DEFAULT_TRAY_OPTIONS can de defined here
    enabled: true,
    menu: false, // true, to use a tray menu ; false to toggle visibility on click on tray icon
    trayWindow: false // true, to use a tray floating window attached to top try icon
  }
}

const exitApp = (mainWindow: BrowserWindow): void => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
  }
  mainWindow.destroy()
  app.exit()
}

export const createMainWindow = async (): Promise<BrowserWindow> => {
  let opt: BrowserWindowConstructorOptions = {
    title: BrowserConstants.APP_NAME,
    show: false,
    width: options.width,
    height: options.height,
    useContentSize: true,
    webPreferences: BrowserConstants.DEFAULT_WEB_PREFERENCES,
    frame: false
  }
  const trayOptions: TrayOptions = options.tray?.enabled
    ? {
        ...BrowserConstants.DEFAULT_TRAY_OPTIONS,
        ...options.tray
      }
    : {
        ...BrowserConstants.DEFAULT_TRAY_OPTIONS,
        enabled: false
      }

  // trayWindow requires tray.enabled=true
  if (trayOptions.enabled && trayOptions.trayWindow) {
    opt = {
      ...opt,
      width: options.width,
      height: options.height,
      maxWidth: options.width,
      maxHeight: options.height,
      show: false,
      frame: false,
      fullscreenable: false,
      hiddenInMissionControl: true,
      resizable: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        ...BrowserConstants.DEFAULT_WEB_PREFERENCES,
        backgroundThrottling: false
      }
    }
  }
  const mainWindow = new BrowserWindow(opt)

  mainWindow.setMenu(null)

  mainWindow.on('close', (event: Event): void => {
    event.preventDefault()
    exitApp(mainWindow)
  })

  mainWindow.webContents.on('did-frame-finish-load', (): void => {
    if (BrowserConstants.IS_DEV_ENV && BrowserConstants.IS_DEVTOOLS) {
      mainWindow.webContents.openDevTools()
    }
  })

  if (trayOptions.enabled) {
    createTray(mainWindow, trayOptions)
  }

  if (trayOptions.enabled && trayOptions.trayWindow) {
    hideWindow(mainWindow)
    if (trayOptions.showAtStartup) {
      showWindow(mainWindow)
    }
  } else {
    mainWindow.once('ready-to-show', (): void => {
      mainWindow.setAlwaysOnTop(true)
      mainWindow.show()
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(false)
    })
  }

  // Initialize common IPC handlers
  CommonService.initialize()
  setupAuthHandlers()
  setupSubmissionHandlers()
  HighlightService.initialize()
  SocketService.getInstance().setMainWindow(mainWindow)

  if (BrowserConstants.IS_DEV_ENV) {
    await mainWindow.loadURL(BrowserConstants.APP_INDEX_URL_DEV)
  } else {
    await mainWindow.loadFile(BrowserConstants.APP_INDEX_URL_PROD)
  }

  return mainWindow
}

export const createErrorWindow = async (
  errorWindow: BrowserWindow,
  mainWindow: BrowserWindow,

  details?: RenderProcessGoneDetails
): Promise<BrowserWindow> => {
  if (!BrowserConstants.IS_DEV_ENV) {
    mainWindow?.hide()
  }

  errorWindow = new BrowserWindow({
    title: BrowserConstants.APP_NAME,
    show: false,
    resizable: BrowserConstants.IS_DEV_ENV,
    webPreferences: BrowserConstants.DEFAULT_WEB_PREFERENCES
  })

  errorWindow.setMenu(null)

  if (BrowserConstants.IS_DEV_ENV) {
    await errorWindow.loadURL(`${BrowserConstants.APP_INDEX_URL_DEV}#/error`)
  } else {
    await errorWindow.loadFile(BrowserConstants.APP_INDEX_URL_PROD, { hash: 'error' })
  }

  errorWindow.on('ready-to-show', (): void => {
    if (!BrowserConstants.IS_DEV_ENV && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy()
    }
    errorWindow.show()
    errorWindow.focus()
  })

  errorWindow.webContents.on('did-frame-finish-load', (): void => {
    if (BrowserConstants.IS_DEV_ENV) {
      errorWindow.webContents.openDevTools()
    }
  })

  return errorWindow
}
