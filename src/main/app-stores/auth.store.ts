import Store from 'electron-store'

const authStore = new Store({
  name: 'auth-store',
  encryptionKey: '1234567890',
  defaults: {
    userId: null,
    userName: null
  }
})

export default authStore
