import { Directive, DirectiveBinding } from 'vue'

export interface ObserveVisibilityOptions {
  callback: (entries: IntersectionObserverEntry[]) => void
  threshold?: number
  once?: boolean
}

declare global {
  interface HTMLElement {
    _intersectionObserver?: IntersectionObserver
  }
}

export const IntersectionObserverDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<ObserveVisibilityOptions>) {
    const options: IntersectionObserverInit = {
      threshold: binding.value.threshold || 0
    }

    const observer = new IntersectionObserver((entries) => {
      binding.value.callback(entries)

      if (binding.value.once && entries.some((e) => e.isIntersecting)) {
        observer.disconnect()
      }
    }, options)

    observer.observe(el)
    el._intersectionObserver = observer
  },

  unmounted(el: HTMLElement) {
    if (el._intersectionObserver) {
      el._intersectionObserver.disconnect()
      delete el._intersectionObserver
    }
  }
}
