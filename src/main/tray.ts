import { app, screen, Menu, Tray, BrowserWindow } from 'electron'
import BrowserConstants from './utils/browser.constants'
import { debounce } from './utils/util'
import { join } from 'path'
let tray
let trayOptions

export function createTray(window: BrowserWindow, options) {
  trayOptions = options || BrowserConstants.DEFAULT_TRAY_OPTIONS
  // menu or trayWindow, you need to choose
  if (trayOptions.trayWindow) {
    trayOptions.menu = false
  }

  tray = new Tray(join(BrowserConstants.PUBLIC_PATH, 'images/vutron-tray-icon.png'))
  tray.setToolTip(trayOptions.tooltip)
  if (trayOptions.menu) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          showWindow(window)
        }
      },
      {
        label: 'Hide App',
        click: () => {
          hideWindow(window)
        }
      },
      {
        label: 'Exit',
        click: () => {
          app.quit()
        }
      }
    ])
    // tray icon only with classic window
    tray.setContextMenu(contextMenu)
  } else {
    // handle click on tray icon
    tray.on('right-click', function () {
      debounce(() => toggleWindow(window))
    })
    tray.on('click', function () {
      debounce(() => toggleWindow(window))
    })
    // no menu for tray window
    window.setMenu(null)
    tray.setContextMenu(null)
  }
  // align at startup
  alignWindow(window)
  return tray
}

export function hideWindow(window: BrowserWindow) {
  window.hide()
  // if (!trayOptions.trayWindow) return;
  // hide window when click elsewhere on screen
  window.on('blur', () => {
    // dont close if devtools
    if (!window.webContents.isDevToolsOpened()) {
      window.hide()
    }
  })
}

export function toggleWindow(window: BrowserWindow) {
  if (window.isVisible()) {
    hideWindow(window)
  } else {
    showWindow(window)
  }
}

export function showWindow(window: BrowserWindow) {
  window.show()
  alignWindow(window)
}

export function alignWindow(window: BrowserWindow) {
  if (!trayOptions.trayWindow) return

  const b = window.getBounds()
  const position = calculateWindowPosition(b)
  window.setBounds({
    width: b.width,
    height: b.height,
    x: position.x,
    y: position.y
  })
}

function calculateWindowPosition(b) {
  const margin = trayOptions.margin
  const screenBounds = screen.getPrimaryDisplay().size
  const trayBounds = tray.getBounds()
  const bottom = trayBounds.y > screenBounds.height / 2
  const x = Math.floor(trayBounds.x - b.width / 2 - margin.x + trayBounds.width / 2)
  const y = bottom
    ? Math.floor(trayBounds.y - b.height - margin.y + trayBounds.height / 2)
    : Math.floor(trayBounds.y + margin.y + trayBounds.height / 2)
  // constraint into screen
  return {
    x: Math.max(0, Math.min(screenBounds.width - b.width, x)),
    y: Math.max(0, Math.min(screenBounds.height - b.height, y))
  }
}
