import { ipcMain } from 'electron'
import { API_ENDPOINT, IPC_CHANNELS } from '../../shared/constants'
import { HttpService } from './http.service'
import { LoginResponse, RefreshResponse } from '../../shared/types/auth'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const keytar = require('keytar')
import BrowserConstants from '../utils/browser.constants'
import authStore from '../app-stores/auth.store'
import { SocketService } from './socket.service'
import { UserRepo } from '../database/user.repo'
import { getAndSaveResult } from './submission.service'
const userService = new UserRepo()

export async function autoLogin() {
  const userName = authStore.get('userName')
  const userId = authStore.get('userId')
  const refreshToken = await keytar.getPassword(BrowserConstants.APP_NAME, userName)
  console.log('refreshToken ', refreshToken)
  if (refreshToken) {
    try {
      const response = await HttpService.getInstance()
        .getAxiosInstance()
        .post<RefreshResponse>(API_ENDPOINT.REFRESH_TOKEN, { refreshToken })
      console.log(response)
      if (response.data.code === 2000) {
        const accessToken = response.data.result.accessToken
        HttpService.getInstance().setToken(accessToken)
        SocketService.getInstance().setToken(refreshToken)
        SocketService.getInstance().setUserId(userId)
        SocketService.getInstance().connect(API_ENDPOINT.WS_URL)
        const user = await userService.findByUserId(userId)
        if (!user) {
          await userService.create({ id: parseInt(userId), username: userName })
        }
        await getAndSaveResult()
        return user
      }
    } catch (error) {
      console.error('Auto login failed:', error)
    }
  }
  return false
}

export function setupAuthHandlers() {
  const httpService = HttpService.getInstance()

  ipcMain.handle(IPC_CHANNELS.MAIN.GET_AUTH_STORE, (_, key: string) => {
    return authStore.get(key)
  })

  ipcMain.handle(IPC_CHANNELS.MAIN.AUTH_LOGIN, async (_, credentials) => {
    const response = await httpService
      .getAxiosInstance()
      .post<LoginResponse>(API_ENDPOINT.AUTH_LOGIN, credentials)
    if (response.data.code === 2000) {
      const userId = response.data.result.user.id
      const username = response.data.result.user.username
      const accessToken = response.data.result.accessToken
      const refreshToken = response.data.result.refreshToken
      keytar.setPassword(BrowserConstants.APP_NAME, username, refreshToken)
      httpService.setToken(accessToken)
      SocketService.getInstance().setToken(refreshToken)
      SocketService.getInstance().setUserId(userId)
      SocketService.getInstance().connect(API_ENDPOINT.WS_URL)
      authStore.set('userId', userId)
      authStore.set('userName', username)
      const user = await userService.findByUserId(userId)
      if (!user) {
        await userService.create({ id: parseInt(userId), username })
      }
    }
    await getAndSaveResult()

    return response.data.result
  })

  ipcMain.handle(IPC_CHANNELS.MAIN.AUTH_LOGOUT, async () => {
    const response = await httpService.getAxiosInstance().post(API_ENDPOINT.AUTH_LOGOUT, {
      token: httpService.getToken()
    })
    httpService.setToken(null)
    authStore.set('userId', null)
    authStore.set('userName', null)
    SocketService.getInstance().disconnect()
    SocketService.getInstance().setToken(null)
    return true
  })
}
