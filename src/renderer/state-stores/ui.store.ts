import { defineStore } from 'pinia'

interface UIState {
  isLoading: boolean
  activeModal: string | null
  sidebarOpen: boolean
  theme: 'light' | 'dark'
}

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    isLoading: false,
    activeModal: null,
    sidebarOpen: true,
    theme: 'light'
  }),

  actions: {
    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    openModal(modalName: string) {
      this.activeModal = modalName
    },

    closeModal() {
      this.activeModal = null
    },

    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },

    setTheme(theme: 'light' | 'dark') {
      this.theme = theme
    }
  }
})
