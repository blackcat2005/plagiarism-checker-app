<!-- eslint-disable no-case-declarations -->
<script setup lang="ts">
import * as PDFJS from 'pdfjs-dist'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import 'pdfjs-dist/web/pdf_viewer.css'

import type { PDFPageProxy, PageViewport, RenderTask } from 'pdfjs-dist'

import type { GetViewportParameters, RenderParameters } from 'pdfjs-dist/types/src/display/api'
import type {
  HighlightData,
  HighlightEventPayload,
  HighlightOptions,
  LoadedEventPayload,
  TextLayerLoadedEventPayload
} from './types'

import TextLayer from './TextLayer.vue'

interface InternalProps {
  viewport: PageViewport | undefined
}

const props = withDefaults(
  defineProps<{
    page: PDFPageProxy
    scale?: number
    rotation?: number
    fitParent?: boolean
    width?: number
    height?: number
    autoDestroy?: boolean
    imageResourcesPath?: string
    hideForms?: boolean
    intent?: string
    highlightData?: HighlightData[]
    highlightCallBack?: (...args) => void
    highlightOptions?: HighlightOptions
    highlightPages?: number[]
  }>(),
  {
    scale: 1,
    intent: 'display',
    autoDestroy: true
  }
)

const emit = defineEmits<{
  (event: 'highlight', payload: HighlightEventPayload): void
  (event: 'loaded', payload: LoadedEventPayload): void
  (event: 'textLoaded', payload: TextLayerLoadedEventPayload): void
  (event: 'annotationLoaded', payload: any[]): void
}>()

// Template Refs
const container = ref<HTMLSpanElement>()
const loadingLayer = ref<HTMLSpanElement>()
const loading = ref(false)
let renderTask: RenderTask

const internalProps = computed(() => {
  return {
    viewport: undefined
  } as InternalProps
})

const tlayerProps = computed(() => {
  return {
    highlightData: props.highlightData,
    highlightOptions: props.highlightOptions,
    highlightPages: props.highlightPages,
    highlightCallBack: props.highlightCallBack
  }
})

function getRotation(rotation: number): number {
  if (!(typeof rotation === 'number' && rotation % 90 === 0)) return 0
  const factor = rotation / 90
  if (factor > 4) return getRotation(rotation - 360)
  else if (factor < 0) return getRotation(rotation + 360)
  return rotation
}

function getScale(page: PDFPageProxy): number {
  let fscale = props.scale
  if (props.fitParent) {
    const parentWidth: number = (container.value!.parentNode! as HTMLElement).clientWidth
    const scale1Width = page.getViewport({ scale: 1 }).width
    fscale = parentWidth / scale1Width
  } else if (props.width) {
    const scale1Width = page.getViewport({ scale: 1 }).width
    fscale = props.width / scale1Width
  } else if (props.height) {
    const scale1Height = page.getViewport({ scale: 1 }).height
    fscale = props.height / scale1Height
  }
  return fscale
}

function getCurrentCanvas(): HTMLCanvasElement | null {
  let oldCanvas = null
  container.value?.childNodes.forEach((el) => {
    if ((el as HTMLElement).tagName === 'CANVAS') oldCanvas = el
  })
  return oldCanvas
}

function setupCanvas(viewport: PageViewport): HTMLCanvasElement {
  let canvas
  const currentCanvas = getCurrentCanvas()!
  if (currentCanvas && currentCanvas?.getAttribute('role') === 'main') {
    canvas = currentCanvas
  } else {
    canvas = document.createElement('canvas')
    canvas.style.display = 'block'
    canvas.setAttribute('dir', 'ltr')
  }

  const outputScale = window.devicePixelRatio || 1
  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)

  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  // --scale-factor property
  container.value?.style.setProperty('--scale-factor', `${viewport.scale}`)
  // Also setting dimension properties for load layer
  loadingLayer.value!.style.width = `${Math.floor(viewport.width)}px`
  loadingLayer.value!.style.height = `${Math.floor(viewport.height)}px`
  loadingLayer.value!.style.top = '0'
  loadingLayer.value!.style.left = '0'
  loading.value = true
  return canvas
}

function cancelRender() {
  if (renderTask) renderTask.cancel()
}

function renderPage() {
  cancelRender()
  const defaultViewport = props.page.getViewport()
  const viewportParams: GetViewportParameters = {
    scale: getScale(props.page),
    rotation: getRotation((props.rotation || 0) + defaultViewport.rotation)
  }
  const viewport = props.page.getViewport(viewportParams)

  const oldCanvas = getCurrentCanvas()
  const canvas = setupCanvas(viewport)

  const outputScale = window.devicePixelRatio || 1
  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined

  // Render page page into canvas context
  const renderContext: RenderParameters = {
    canvasContext: canvas.getContext('2d')!,
    viewport,
    annotationMode: props.hideForms
      ? PDFJS.AnnotationMode.ENABLE
      : PDFJS.AnnotationMode.ENABLE_FORMS,
    transform,
    intent: props.intent
  }

  if (canvas?.getAttribute('role') !== 'main') {
    if (oldCanvas) container.value?.replaceChild(canvas, oldCanvas)
  } else {
    canvas.removeAttribute('role')
  }

  internalProps.value.viewport = viewport
  renderTask = props.page.render(renderContext)
  renderTask.promise
    .then(() => {
      loading.value = false
      emit('loaded', internalProps.value.viewport!)
    })
    .catch(() => {
      loading.value = false
    })
}

watch(
  () => [
    props.scale,
    props.width,
    props.height,
    props.rotation,
    props.page,
    props.hideForms,
    props.intent
  ],
  () => {
    // Props that should dispatch an render task
    renderPage()
  }
)

onMounted(() => {
  renderPage()
})

onUnmounted(() => {
  // Abort all network process and terminates the worker
  if (props.autoDestroy) props.page?.cleanup()
  if (renderTask) renderTask.cancel()
})

// Exposed method
function destroy() {
  props.page?.cleanup()
  renderTask?.cancel()
}

function reload() {
  renderPage()
}

function cancel() {
  cancelRender()
}

defineExpose({
  reload,
  cancel,
  destroy
})
</script>

<template>
  <div ref="container" style="position: relative; display: block">
    <canvas dir="ltr" style="display: block" role="main" />
    <TextLayer v-bind="{ page: props.page, ...internalProps, ...tlayerProps }" @highlight="emit('highlight', $event)"
      @text-loaded="emit('textLoaded', $event)" />
    <div v-show="loading" ref="loadingLayer" style="position: absolute">
      <slot />
    </div>
  </div>
</template>
