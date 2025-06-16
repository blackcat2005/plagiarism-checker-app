import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, MainChannel, RendererChannel } from '../shared/constants'

contextBridge.exposeInMainWorld('mainApi', {
  invoke: (channel: MainChannel, ...args: any[]) => {
    if (Object.values(IPC_CHANNELS.MAIN).includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
  },
  on: (channel: RendererChannel, callback: (...args: any[]) => void) => {
    if (Object.values(IPC_CHANNELS.RENDERER).includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
    }
  }
})
