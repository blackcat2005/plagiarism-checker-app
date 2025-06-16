<template>
  <div class="pdf-viewer-container">
    <div class="pages-container" ref="pagesContainer">
      <div
        v-for="page in totalPages"
        :key="page"
        :data-page="page"
        class="page-container"
        v-intersection-observer="{
          callback: handleIntersection,
          threshold: 0.5,
          once: true
        }"
      >
        <div v-if="pageLoadingStates.get(page)" class="load"> Loading page {{ page }}... </div>
        <template v-else-if="loadedPages.has(page)">
          <VuePDF
            :page="loadedPages.get(page)"
            :scale="1"
            :highlight-data="highlightDataInternal[page - 1].data"
            :highlight-options="highlightOptions"
            :highlight-call-back="callback"
            class="pdf-content"
          />
        </template>
        <div v-else-if="pageErrors.get(page)" class="error">
          Error loading page {{ page }}: {{ pageErrors.get(page) }}
        </div>
        <div v-else class="load"> Page {{ page }} - Scroll to load </div>
      </div>
    </div>
    <HighlightTooltip
      :visible="tooltipVisible"
      :data="tooltipData"
      :position="tooltipPosition"
      @close="closeTooltip"
      @delete="handleDeleteMatch"
      @edit="handleEditMatch"
      @restore="handleRestoreMatch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import VuePDF from '@/renderer/components/vue-pdf/VuePDF.vue'
import HighlightTooltip from '@/renderer/components/HighlightTooltip.vue'

import { shallowRef } from 'vue'

import * as PDFJS from 'pdfjs-dist'

import LegacyWorker from 'pdfjs-dist/legacy/build/pdf.worker.min?url'
import { IPC_CHANNELS } from '@/shared/constants'

PDFJS.GlobalWorkerOptions.workerSrc = LegacyWorker

const props = defineProps({
  // eslint-disable-next-line vue/require-default-prop
  filePath: String,
  // eslint-disable-next-line vue/require-default-prop
  highlightData: Array,
  // eslint-disable-next-line vue/require-default-prop
  comparisonData: Array,
  // eslint-disable-next-line vue/require-default-prop
  transformedData: Object,
  // eslint-disable-next-line vue/require-default-prop
  updateAnnotation: Function,
  // eslint-disable-next-line vue/require-default-prop
  updateHighlightCoordinates: Function
})

const emit = defineEmits(['delete-match', 'edit-match', 'restore-match'])

const pdfInstance = shallowRef()
const totalPages = ref(0)
const tooltipVisible = ref(false)
const tooltipData = ref({})
const tooltipPosition = ref({ x: 0, y: 0 })
const viewport = ref(null)
const resolvedPdf = shallowRef()
const loadedPages = shallowRef(new Map<number, PDFJS.PDFPageProxy>())
const pageLoadingStates = ref(new Map<number, boolean>())
const pageErrors = ref(new Map<number, string>())

const highlightOptions = ref({
  completeWords: false,
  ignoreCase: true
})

const highlightMap = new Map()

const callback = (e: MouseEvent, sentenceId: number) => {
  if (!props.comparisonData || props.comparisonData.length === 0) {
    return
  }
  const info = props.comparisonData.find((c) => c.sentenceId === sentenceId)
  tooltipData.value = {
    matchedText: info.text,
    matches: info.matchedSentences.map((match) => ({
      similarity: Math.round(match.similarity * 100),
      sourceName: props.transformedData[match.docId],
      sourceText: match.text,
      match: match
    }))
  }

  tooltipPosition.value = {
    x: e.clientX + 2,
    y: e.clientY + 2
  }
  tooltipVisible.value = true
}

const highlightDataInternal = computed(() => {
  if (!props.highlightData || props.highlightData.length === 0) {
    return []
  }
  const data = [...props.highlightData]
  if (totalPages.value > data.length) {
    for (let i = data.length + 1; i <= totalPages.value; i++) {
      data.push({
        page: i,
        data: []
      })
    }
  }
  return data
})

const reload = async () => {
  try {
    if (pdfInstance.value) {
      await pdfInstance.value.destroy()
    }

    // Clear highlight map
    highlightMap.clear()

    // Reload PDF
    const pdfSrc = await window.mainApi.invoke(IPC_CHANNELS.MAIN.READ_FILE, props.filePath)
    let raw = atob(pdfSrc)
    let rawLength = raw.length
    let pdfBase64 = new Uint8Array(new ArrayBuffer(rawLength))

    for (let i = 0; i < rawLength; i++) {
      pdfBase64[i] = raw.charCodeAt(i)
    }

    pdfInstance.value = PDFJS.getDocument({ data: pdfBase64 })
    totalPages.value = (await pdfInstance.value.promise).numPages

    viewport.value = await (
      await (await pdfInstance.value.promise).getPage(1)
    ).getViewport({ scale: 1 })
    const data = await (await pdfInstance.value.promise).getData()
    props.updateAnnotation(data)

    // Force re-render of PDF pages
    const pagesContainer = document.querySelector('.pages-container')
    if (pagesContainer) {
      const pages = pagesContainer.querySelectorAll('.pdf-content')
      pages.forEach((page) => {
        const vuePdf = page.querySelector('vue-pdf')
        if (vuePdf) {
          vuePdf.$forceUpdate()
        }
      })
    }
  } catch (error) {
    console.error('Error reloading PDF: ', error)
  }
}

defineExpose({
  reload
})

onMounted(async () => {
  try {
    const pdfSrc = await window.mainApi.invoke(IPC_CHANNELS.MAIN.READ_FILE, props.filePath)
    let raw = atob(pdfSrc)
    let rawLength = raw.length
    let pdfBase64 = new Uint8Array(new ArrayBuffer(rawLength))

    for (let i = 0; i < rawLength; i++) {
      pdfBase64[i] = raw.charCodeAt(i)
    }
    pdfInstance.value = PDFJS.getDocument({ data: pdfBase64 })
    resolvedPdf.value = await pdfInstance.value.promise
    totalPages.value = resolvedPdf.value.numPages
    viewport.value = await (await resolvedPdf.value.getPage(1)).getViewport({ scale: 1 })
    // const data = await resolvedPdf.value.getData()
    // props.updateAnnotation(data)
    await loadPage(1)
  } catch (error) {
    console.error('Error loading PDF: ', error)
  }
})

const onHighlight = (value) => {
  const { matches, textDivs, page } = value
  const highLightPage = props.highlightData[page - 1]
  const pdfContent = document.querySelectorAll('.pdf-content')[page - 1]
  const pdfHeightPx = pdfContent.clientHeight
  const pdfContentBoundingClientRect = pdfContent.getBoundingClientRect()
  const pdfHeightPt = viewport.value.height
  const factor = pdfHeightPt / pdfHeightPx

  matches.forEach((match, index) => {
    const matchedText = match.str
    const sentence = highLightPage.data.find((s) => s.text.includes(matchedText))
    for (let i = match.start.idx; i <= match.end.idx; i++) {
      const textDiv = textDivs[i]
      const highlightSpanList = textDiv.querySelectorAll('.highlight.appended')
      highlightSpanList.forEach((highlightSpan) => {
        if (
          highlightSpan &&
          sentence &&
          highlightSpan.getBoundingClientRect().width > 0 &&
          highlightSpan.getBoundingClientRect().height > 0
        ) {
          const compareInfo = props.comparisonData.find((c) => c.sentenceId === sentence.sentenceId)
          if (compareInfo) {
            const x1 =
              (-pdfContentBoundingClientRect.left + highlightSpan.getBoundingClientRect().left) *
              factor
            const y2 =
              (pdfHeightPx +
                pdfContentBoundingClientRect.top -
                highlightSpan.getBoundingClientRect().top) *
                factor -
              0.2
            const x2 = x1 + highlightSpan.getBoundingClientRect().width * factor
            const y1 = y2 - highlightSpan.getBoundingClientRect().height * factor + 0.2
            props.updateHighlightCoordinates(page, sentence.sentenceId, [x1, y1, x2, y2])
            // Sắp xếp các câu trùng theo độ tương đồng
            const sortedMatches = [...compareInfo.matchedSentences].sort(
              (a, b) => b.similarity - a.similarity
            )

            highlightMap.set(highlightSpan, {
              sentence: compareInfo,
              matchedSentences: sortedMatches
            })

            highlightSpan.addEventListener('click', (e) => {
              e.stopPropagation() // Ngăn chặn event bubbling
              // if (tooltipVisible.value == true) {
              //     tooltipVisible.value = false
              //     return
              // } else {
              //     tooltipVisible.value = true
              // }
              const info = highlightMap.get(highlightSpan)
              tooltipData.value = {
                matchedText: info.sentence.text,
                matches: info.matchedSentences.map((match) => ({
                  similarity: Math.round(match.similarity * 100),
                  sourceName: props.transformedData[match.docId],
                  sourceText: match.text,
                  match: match
                }))
              }

              tooltipPosition.value = {
                x: e.clientX + 2,
                y: e.clientY + 2
              }
              tooltipVisible.value = true
            })
          }
        }
      })
    }
  })
}

const closeTooltip = () => {
  tooltipVisible.value = false
}

const handleDeleteMatch = (match) => {
  emit('delete-match', match)
}

const handleEditMatch = (match) => {
  emit('edit-match', match)
}

const handleRestoreMatch = (match) => {
  emit('restore-match', match)
}

const loadPage = async (page: number) => {
  if (loadedPages.value.has(page) || pageLoadingStates.value.get(page)) return

  try {
    pageLoadingStates.value.set(page, true)
    if (!resolvedPdf.value) {
      resolvedPdf.value = await pdfInstance.value?.promise
    }
    const pdfPage = await resolvedPdf.value?.getPage(page)
    if (pdfPage) {
      loadedPages.value.set(page, pdfPage)
    }
  } catch (error: any) {
    pageErrors.value.set(page, error.message)
    console.error(`Error loading page ${page}:`, error)
  } finally {
    pageLoadingStates.value.set(page, false)
  }
}

const handleIntersection = (entries: IntersectionObserverEntry[]) => {
  entries.forEach(async (entry) => {
    if (entry.isIntersecting && entry.target instanceof HTMLElement) {
      const page = parseInt(entry.target.getAttribute('data-page'), 10)
      await loadPage(page)
    }
  })
}
</script>

<style>
.textLayer .highlight {
  cursor: pointer;
  pointer-events: auto;
}

.pdf-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.pages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
  background-color: #ddd;
  box-sizing: border-box;
}

.pdf-content {
  width: 100%;
  position: relative;
  margin-bottom: 30px;
}

canvas {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  height: auto;
}
</style>
