import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './styles.css'
import App from '@/renderer/App.vue'
import router from '@/renderer/router'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import ToastService from 'primevue/toastservice'
import DialogService from 'primevue/dialogservice'
import Tooltip from 'primevue/tooltip'
import { IntersectionObserverDirective } from './directives/intersection'
import ConfirmationService from 'primevue/confirmationservice'

// Add API key defined in contextBridge to window object type
declare global {
  interface Window {
    mainApi?: any
  }
}

const app = createApp(App)

app
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.dark-mode'
      }
    }
  })
  .use(ToastService)
  .use(DialogService)
  .use(ConfirmationService)
  .use(router)
  .directive('p-tooltip', Tooltip)
  .directive('intersection-observer', IntersectionObserverDirective)
  .use(createPinia())
  .mount('#app')
