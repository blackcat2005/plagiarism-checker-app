import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { API_ENDPOINT } from '../../shared/constants'

export class HttpService {
  private static instance: HttpService
  private axiosInstance: AxiosInstance
  private token: string | null = null

  private constructor() {
    const defaultConfig: AxiosRequestConfig = {
      baseURL: API_ENDPOINT.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }

    this.axiosInstance = axios.create(defaultConfig)
    this.setupInterceptors()
  }

  public static getInstance(): HttpService {
    if (!HttpService.instance) {
      HttpService.instance = new HttpService()
    }
    return HttpService.instance
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
  }

  public setToken(token: string | null) {
    this.token = token
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }

  public getToken(): string | null {
    return this.token
  }
}
