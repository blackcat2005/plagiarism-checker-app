import { BaseResponse } from './api'

export interface User {
  id: string
  username: string
  name: string
  role: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
}

export interface AuthData {
  token: string | null
  refreshToken: string | null
  tokenExpiry: number | null
  user: User | null
}

export interface LoginCredentials {
  username: string
  password: string
}

export type LoginResponse = BaseResponse<{
  accessToken: string
  refreshToken: string
  user: User
}>

export type RefreshResponse = BaseResponse<{
  accessToken: string
  refreshToken: string
}>
