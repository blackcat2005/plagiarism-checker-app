import Store from 'electron-store'

const configStore = new Store({
  name: 'app-config',
  encryptionKey: '1234567890',
  defaults: {
    settings: {
      theme: 'light',
      language: 'en'
    }
  }
})

export default configStore
