<script setup lang="ts">
import * as PDFJS from 'pdfjs-dist'
import { onMounted, ref, watch } from 'vue'

import type { PDFPageProxy, PageViewport } from 'pdfjs-dist'
import type {
  HighlightEventPayload,
  HighlightOptions,
  TextLayerLoadedEventPayload,
  HighlightData
} from './types'
import { findMatches, highlightMatches, resetDivs } from './highlight'

const props = defineProps<{
  page?: PDFPageProxy
  viewport?: PageViewport
  highlightData?: HighlightData[]
  highlightOptions?: HighlightOptions
  highlightCallBack?: (...args) => void
}>()

const emit = defineEmits<{
  (event: 'highlight', payload: HighlightEventPayload): void
  (event: 'textLoaded', payload: TextLayerLoadedEventPayload): void
}>()

const layer = ref<HTMLDivElement>()
const endContent = ref<HTMLDivElement>()
let textDivs: HTMLElement[] = []

function getHighlightOptionsWithDefaults(): HighlightOptions {
  return Object.assign(
    {},
    {
      ignoreCase: true,
      completeWords: false
    },
    props.highlightOptions
  )
}

async function findAndHighlight(reset = false) {
  const page = props.page
  const textContent = await page?.getTextContent()

  if (!textContent) return

  if (reset) resetDivs(textContent, textDivs)

  if (props.highlightData) {
    const matches = findMatches(
      props.highlightData,
      textContent!,
      getHighlightOptionsWithDefaults()
    )
    highlightMatches(matches, textContent!, textDivs, props.highlightCallBack)
    emit('highlight', {
      matches,
      textContent,
      textDivs,
      page: page?.pageNumber || 1
    })
  }
}

function render() {
  layer.value!.replaceChildren?.()

  const page = props.page
  const viewport = props.viewport
  const textStream = page?.streamTextContent({
    includeMarkedContent: true,
    disableNormalization: true
  })
  const textLayer = new PDFJS.TextLayer({
    container: layer.value!,
    textContentSource: textStream!,
    viewport: viewport!
  })
  textLayer.render().then(async () => {
    textDivs = textLayer.textDivs
    const textContent = await page?.getTextContent()
    emit('textLoaded', { textDivs, textContent })
    const endOfContent = document.createElement('div')
    endOfContent.className = 'endOfContent'
    layer.value?.appendChild(endOfContent)
    endContent.value = endOfContent
    findAndHighlight()
  })
}

function onMouseDown() {
  if (!endContent.value) return
  endContent.value.classList.add('active')
}

function onMouseUp() {
  if (!endContent.value) return
  endContent.value.classList.remove('active')
}

watch(
  () => props.viewport,
  (_) => {
    if (props.page && props.viewport && layer.value) render()
  }
)

watch(
  () => [props.highlightData, props.highlightOptions],
  (_) => {
    findAndHighlight(true)
  },
  { deep: true }
)

onMounted(() => {
  if (props.page && props.viewport && layer.value) render()
})
</script>

<template>
  <div
    ref="layer"
    class="textLayer"
    style="display: block; margin: 0 auto"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
  />
</template>
