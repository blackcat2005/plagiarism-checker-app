<template>
  <div class="px-3">
    <PageHeader :title="`Chi tiết kết quả của ${transformedData[docId]} trong lượt kiểm tra ${submissionName}`"
      @back="router.back">
      <template #actions>
        <!-- Action Buttons -->
        <div class="p-2 flex gap-2 border-bottom-1 surface-border">
          <Button label="In báo cáo" icon="pi pi-print" class="flex-1" @click="print" />
        </div>
      </template>
    </PageHeader>
    <div class="flex">
      <!-- PDF Viewer Panel -->
      <div class="w-8 relative">
        <div class="pdf-container">
          <PdfViewer :file-path="documentPath" :highlightData="highlightData"
            :comparisonData="Object.values(comparisonData)" ref="pdfRef" :transformedData="transformedData"
            @delete-match="onDeleteMatch" @edit-match="onEditMatch" @restore-match="onRestoreMatch"
            :enableSource="enabledSources" :similarityThreshold="similarityThreshold" />
        </div>
      </div>

      <!-- Sidebar -->
      <div class="w-4 flex flex-column border-left-1 surface-border">
        <!-- Overall Score -->
        <div class="p-3 surface-section border-round m-2 border-1 surface-border">
          <div class="text-center">
            <div class="text-4xl font-bold mb-2">{{ overallSimilarity }}%</div>
            <div class="text-500">Điểm số tổng thể</div>
          </div>
          <div class="mt-3 text-sm">
            <div class="flex justify-content-between mb-2">
              <span class="text-500">Tổng số câu:</span>
              <span class="font-medium">{{ documentSentenceCount }}</span>
            </div>
            <div class="flex justify-content-between">
              <span class="text-500">Số câu trùng:</span>
              <span class="font-medium">{{ matchedSentence.size }}</span>
            </div>
          </div>
        </div>

        <!-- Similarity Threshold -->
        <div class="p-3 surface-section border-round m-2 border-1 surface-border">
          <div class="flex align-items-center justify-content-between mb-3">
            <h3 class="m-0 text-lg">Ngưỡng độ tương đồng</h3>
            <span class="text-500">{{ (similarityThreshold * 100).toFixed(0) }}%</span>
          </div>
          <Dropdown v-model="similarityThreshold" :options="thresholdOptions" optionLabel="label" optionValue="value"
            class="w-full" />
        </div>

        <!-- Modified Pairs Section -->
        <div class="p-3 surface-section border-round m-2 border-1 surface-border">
          <div class="flex align-items-center justify-content-between mb-3">
            <h3 class="m-0 text-lg">Các cặp đã thay đổi</h3>
            <Button icon="pi pi-chevron-down" class="p-button-text p-button-rounded"
              @click="toggleSection('modifiedPairs')" />
          </div>
          <div v-show="expandedSections.modifiedPairs" class="modified-pairs-list">
            <div v-for="sentence in modifiedPairs" :key="sentence.sentenceId">
              <div class="flex align-items-center justify-content-between mb-3">
                <div class="source-name font-bold">{{ transformedData[sentence.docId] }}</div>
                <div class="flex gap-2">
                  <Tag :value="getReasonConfig(sentence.reasonType).label"
                    :severity="getReasonConfig(sentence.reasonType).severity" />
                  <Button icon="pi pi-pencil" class="p-button-text p-button-rounded p-button-warning"
                    @click="handleEditMatch(sentence)" />
                  <Button icon="pi pi-undo" class="p-button-text p-button-rounded p-button-success"
                    @click="handleRestoreMatch(sentence)" />
                </div>
              </div>
              <div class="text-sm text-500 mb-3 p-2 surface-100 border-round">
                <div class="font-bold mb-1">Lý do:</div>
                <div>{{ sentence.reasonText }}</div>
              </div>
              <div class="text-sm mb-3 p-2 surface-100 border-round">
                <div class="font-bold mb-1">Câu trong văn bản hiện tại:</div>
                <div class="text-500">{{ sentence.text }}</div>
              </div>
              <div class="text-sm p-2 surface-100 border-round">
                <div class="font-bold mb-1">Câu trùng:</div>
                <div class="text-500">{{ sentence.text }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sources Section -->
        <div class="p-3 surface-section border-round m-2 border-1 surface-border">
          <div class="flex align-items-center justify-content-between mb-3">
            <h3 class="m-0 text-lg">Các nguồn khác</h3>
            <Button icon="pi pi-chevron-down" class="p-button-text p-button-rounded"
              @click="toggleSection('sources')" />
          </div>
          <div v-show="expandedSections.sources" class="sources-list">
            <div v-for="id in Object.keys(enabledSources)" :key="id"
              class="source-item p-2 border-1 surface-border border-round mb-2">
              <div class="flex align-items-center gap-2 mb-2">
                <Checkbox v-model="enabledSources[id]" :binary="true" :inputId="'source-' + id" />
                <label :for="'source-' + id" class="font-medium">{{ transformedData[id] }}</label>
              </div>
              <div class="text-sm pl-5">
                <div class="flex justify-content-between mb-1">
                  <span class="text-500">Số câu trùng:</span>
                  <span class="font-medium">{{ getSourceMatchCount(id) }}</span>
                </div>
                <div class="flex justify-content-between">
                  <span class="text-500">Tỷ lệ trùng:</span>
                  <span class="font-medium">{{ getSourceSimilarityPercentage(id) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DeleteReasonDialog v-model:visible="showDeleteDialog" v-model:reasonType="reasonType"
      v-model:reasonText="reasonText" @save="saveDeleteReason" @cancel="showDeleteDialog = false" />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PdfViewer from '@/renderer/views/result/PdfViewer.vue'
import { useSubmissionStore } from '@/renderer/state-stores/submission'
import PageHeader from '@/renderer/components/PageHeader.vue'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import _ from 'lodash'
import { AnnotationFactory } from 'annotpdf'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import { IPC_CHANNELS } from '@/shared/constants'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { ComparisonData, Result, ReasonType, REASON_CONFIG } from '@/shared/types'
import { HighlightData, MatchSentenceUI } from '@/shared/types'
import { useMatchManagement } from '@/renderer/composables/useMatchManagement'
import { useComparisonData } from '@/renderer/composables/useComparisonData'
import DeleteReasonDialog from '@/renderer/components/DeleteReasonDialog.vue'

const toast = useToast()

const similarityThreshold = ref(0.85)
const pdfRef = ref()
const router = useRouter()
const route = useRoute()
const submissionStore = useSubmissionStore()
const docId = Number(route.query.docId as string)
const submissionId = Number(route.query.submissionId as string)
const submission = submissionStore.getSubmissionById(submissionId)

const documentResult = computed<Result>(() => {
  if (submission && submission.result && submission.result[Number(docId)]) {
    return submission.result[Number(docId)]
  }
  return []
})

const documentSentenceCount = computed(() => {
  return documentResult.value.documentSentenceCount || 0
})

const transformedData = computed<Record<string, string>>(() => {
  if (submission && submission.docIdToFileName) {
    return Object.keys(submission.docIdToFileName).reduce<Record<string, string>>((acc, key) => {
      const fileName = submission.docIdToFileName[key].split('\\').pop()
      acc[key] = fileName ?? ''
      return acc
    }, {})
  }
  return {}
})

const documentPath = computed<string>(() => {
  if (submission && submission.docIdToFileName) {
    return submission.docIdToFileName[Number(docId)] || ''
  }
  return ''
})

const comparisonData = computed<ComparisonData>(() => {
  return _.clone(documentResult.value.comparisonData || {})
})

const enabledSources = ref<{ [key: string]: boolean }>({})

const thresholdOptions = [
  { label: '85%', value: 0.85 },
  { label: '90%', value: 0.9 },
  { label: '95%', value: 0.95 },
  { label: '100%', value: 1.0 }
]

const {
  matchedSentence,
  filteredMatches,
  modifiedPairs,
  showDeleteDialog,
  reasonType,
  reasonText,
  handleDeleteMatch,
  handleEditMatch,
  handleRestoreMatch,
  saveDeleteReason
} = useComparisonData(comparisonData, enabledSources, similarityThreshold)

const overallSimilarity = computed(() => {
  const totalMatches = matchedSentence.value.size

  return totalMatches > 0 ? ((totalMatches / documentSentenceCount.value) * 100).toFixed(2) : 0
})

const submissionName = computed(() => {
  return submission ? submission.submissionName : ''
})

const highlightData = ref<HighlightData[]>([])

const expandedSections = ref({
  modifiedPairs: true,
  sources: true
})

const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section]
}

const getReasonConfig = (reasonType: ReasonType | undefined) => {
  if (!reasonType) return REASON_CONFIG.OTHER
  return REASON_CONFIG[reasonType] || REASON_CONFIG.OTHER
}

const getSourceMatchCount = (sourceId) => {
  if (!documentResult.value.stats[sourceId]) return 0
  return documentResult.value.stats[sourceId].matchedSentenceCount ?? 0
}

const getSourceSimilarityPercentage = (sourceId) => {
  if (!documentResult.value.stats[sourceId]) return 0
  return (documentResult.value.stats[sourceId].percentage * 100).toFixed(2) ?? 0
}

const pdfViewerKey = ref(0)

onMounted(async () => {
  const docSentences = await window.mainApi.invoke(IPC_CHANNELS.MAIN.GET_SENTENCE, Number(docId))
  // Initialize enabledSources
  enabledSources.value = Object.keys(documentResult.value.stats).reduce((acc, key) => {
    acc[key] = true
    return acc
  }, {})

  for (const sentence of docSentences) {
    let pages = JSON.parse(sentence.page)
    let lastPage = pages[pages.length - 1]
    let id = sentence.id_in_doc
    let split = sentence.split
    let text = sentence.text

    if (highlightData.value.length < lastPage) {
      highlightData.value.push({
        page: lastPage,
        data: []
      })
    }

    const foundCompareData = Object.values(comparisonData.value).find((c) => c.sentenceId === id)
    if (!foundCompareData) {
      continue
    }

    if (split === -1) {
      highlightData.value[lastPage - 1].data.push({
        sentenceId: id,
        text
      })
    } else {
      highlightData.value[lastPage - 1].data.push({
        sentenceId: id,
        text: text.slice(split)
      })

      highlightData.value[lastPage - 2].data.push({
        sentenceId: id,
        text: text.slice(0, split)
      })
    }
  }
})

const print = async () => {
  const highlightDataToSend = pdfRef.value.getHighlightModified().flatMap((h) => h.data)
  const documentPathToSend = documentPath.value
  await window.mainApi.send(
    IPC_CHANNELS.MAIN.HIGHLIGHT,
    documentPathToSend,
    _.cloneDeep(highlightDataToSend)
  )
}

const onDeleteMatch = (match) => {
  handleDeleteMatch(match)
}

const onEditMatch = (match) => {
  handleEditMatch(match)
}

const onRestoreMatch = (match) => {
  handleRestoreMatch(match)
  toast.add({
    severity: 'success',
    summary: 'Thành công',
    detail: 'Đã khôi phục câu trùng',
    life: 3000
  })
}
</script>

<style scoped>
.pdf-container {
  height: 40rem;
  overflow: hidden;
}

.modified-pairs-list {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.sources-list {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.modified-pair-item {
  background-color: var(--p-surface-0);
  transition: all 0.2s;
}

.modified-pair-item:hover {
  background-color: var(--p-surface-50);
}

.source-item {
  background-color: var(--p-surface-0);
  transition: all 0.2s;
}

.source-item:hover {
  background-color: var(--p-surface-50);
}

.text-lg {
  font-size: 1.1rem;
}

.font-medium {
  font-weight: 500;
}
</style>
