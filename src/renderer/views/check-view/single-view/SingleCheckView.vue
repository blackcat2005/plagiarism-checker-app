<template>
  <div class="px-5">
    <PageHeader title="Kiểm tra trùng lặp đơn văn bản" @back="router.back" />

    <!-- Main content -->
    <div class="p-4 surface-100 border-round">
      <!-- Action buttons -->
      <div class="flex align-items-center gap-3 mb-4">
        <Button label="Chọn file cần kiểm tra" icon="pi pi-file" @click="openMainFileDialog" class="p-button-raised"
          :disabled="isUploading" severity="primary" />

        <Button label="Chọn file tham chiếu" icon="pi pi-folder-open" @click="openReferenceFilesDialog"
          class="p-button-raised" :disabled="isUploading || !mainFile" severity="primary" />

        <Button v-if="mode === 'edit'" label="Lưu thay đổi" icon="pi pi-save" :disabled="isUploading" severity="success"
          @click="saveChanges" class="p-button-raised" />

        <Button v-else label="Tải lên" icon="pi pi-upload" :disabled="!canUpload || isUploading" @click="uploadFiles"
          severity="success" class="p-button-raised" />
      </div>

      <div v-if="isUploading" class="mt-4">
        <h4 class="m-0 mb-2">Đang tải lên ({{ uploadProgress }}%)</h4>
        <ProgressBar :value="uploadProgress" />
        <small class="block mt-2 text-500">
          Vui lòng không đóng ứng dụng trong quá trình tải lên
        </small>
      </div>

      <!-- Main file section -->
      <div v-if="mainFile" class="mt-4">
        <div class="flex justify-content-between align-items-center mb-3">
          <h4 class="m-0">File cần kiểm tra</h4>
          <Button v-if="mode !== 'edit'" icon="pi pi-times" text severity="danger" @click="removeMainFile"
            class="p-button-rounded" />
        </div>
        <div class="surface-card p-3 border-round">
          <div class="flex align-items-center">
            <i class="pi pi-file mr-3 text-primary"></i>
            <span class="font-medium text-overflow-ellipsis">{{ mainFile }}</span>
          </div>
        </div>
      </div>

      <!-- Reference files section -->
      <div v-if="referenceFiles.length" class="mt-4">
        <div class="flex justify-content-between align-items-center mb-3">
          <h4 class="m-0">Danh sách file tham chiếu ({{ referenceFiles.length }} files)</h4>
          <Button label="Xóa tất cả" icon="pi pi-trash" severity="danger" :disabled="isUploading" text
            @click="clearReferenceFiles" />
        </div>
        <ul class="list-none p-0 m-0 overflow-auto max-h-20rem">
          <li v-for="(file, idx) in referenceFiles" :key="idx"
            class="flex align-items-center justify-content-between p-3 border-round mb-2 surface-ground hover:surface-200 transition-colors transition-duration-150">
            <div class="flex align-items-center">
              <i class="pi pi-file mr-3 text-primary"></i>
              <span class="font-medium">{{ file }}</span>
              <span v-if="newDocuments.includes(file)" class="ml-2 text-sm text-primary">
                (Mới)
              </span>
            </div>
            <div class="flex align-items-center gap-2">
              <Button v-if="mode !== 'edit'" icon="pi pi-times" text severity="danger" @click="removeReferenceFile(idx)"
                class="p-button-rounded" />
            </div>
          </li>
        </ul>
      </div>

      <!-- Empty state -->
      <div v-if="!mainFile && !referenceFiles.length" class="text-center p-6">
        <i class="pi pi-inbox text-500" style="font-size: 3rem"></i>
        <p class="text-500 my-3">Chưa có file nào được chọn</p>
        <small class="text-400">Nhấn nút "Chọn file cần kiểm tra" để bắt đầu</small>
      </div>

      <div class="mb-4">
        <div class="flex align-items-center mb-3">
          <h3 class="m-0">Tên lượt kiểm tra</h3>
        </div>
        <div class="surface-card p-3 border-round">
          <InputText v-model="checkName" placeholder="Nhập tên lượt kiểm tra" class="w-full" :disabled="isUploading" />
        </div>
      </div>

      <div class="mb-4">
        <div class="flex align-items-center mb-3">
          <h3 class="m-0">Cài đặt nâng cao</h3>
        </div>
        <div class="surface-card p-3 border-round">
          <div class="flex align-items-center gap-3">
            <div class="flex-1">
              <div class="field-radiobutton mb-2">
                <RadioButton v-model="checkType" :value="0" inputId="semantic" />
                <label for="semantic" class="ml-2">Kiểm tra ngữ nghĩa</label>
                <i id="semantic-info" class="pi pi-info-circle ml-2 text-500 cursor-pointer"></i>
              </div>
              <div class="field-radiobutton">
                <RadioButton v-model="checkType" :value="1" inputId="matching" />
                <label for="matching" class="ml-2">So khớp chính xác</label>
                <i id="matching-info" class="pi pi-info-circle ml-2 text-500 cursor-pointer"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '@/shared/constants/app.constants'
import { EditSubmissionReq, SUBMISSION_STATUS, SUBMISSION_TYPE } from '@/shared/types/submission'
import { useSubmissionStore } from '@/renderer/state-stores/submission'
import ProgressBar from 'primevue/progressbar'
import { ref, computed, onMounted, watch } from 'vue'
import PageHeader from '@/renderer/components/PageHeader.vue'
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import InputText from 'primevue/inputtext'
import { PDFTextProcessor } from '@/renderer/utils/PDFTextProcessor'
import { useRouter, useRoute } from 'vue-router'
import { IPC_CHANNELS } from '@/shared/constants'

const mainFile = ref<string>('')
const referenceFiles = ref<string[]>([])
const checkType = ref(0)
const checkName = ref('')
const isUploading = ref(false)
const uploadProgress = ref(0)
const submissionStore = useSubmissionStore()
const router = useRouter()
const route = useRoute()
const mode = ref('new')
const newDocuments = ref<string[]>([])
const ignoredDocuments = ref<string[]>([])
const originalMainFile = ref<string>('')

const canUpload = computed(() => {
  return mainFile.value && referenceFiles.value.length > 0 && checkName.value.trim() !== ''
})

onMounted(async () => {
  if (route.query.submissionId) {
    const submission = submissionStore.getSubmissionById(Number(route.query.submissionId))
    if (!submission) {
      router.push({ path: ROUTES.LIST_SUBMISSION })
      return
    }
    if (!submission.result) {
      await submissionStore.fetchSubmissions(Number(route.query.submissionId))
    }
    checkName.value = submission.submissionName
    const files = Object.values(submission.docIdToFileName)
    mainFile.value = files[0] as string
    originalMainFile.value = files[0] as string
    referenceFiles.value = files.slice(1) as string[]
    checkType.value = submission.submissionType === SUBMISSION_TYPE.SINGLE_SEMANTIC ? 0 : 1
    mode.value = 'edit'
  }
})

watch(mainFile, (newValue, oldValue) => {
  if (mode.value === 'edit' && newValue !== originalMainFile.value) {
    if (!newDocuments.value.includes(newValue)) {
      newDocuments.value.push(newValue)
    }
  }
})

const openMainFileDialog = async () => {
  const result = await window.mainApi.invoke(IPC_CHANNELS.MAIN.OPEN_FILE, 'pdf')
  if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
    mainFile.value = result.filePaths[0]
  }
}

const openReferenceFilesDialog = async () => {
  const result = await window.mainApi.invoke(IPC_CHANNELS.MAIN.OPEN_FILE, 'pdf')
  if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
    if (mode.value === 'edit') {
      newDocuments.value = [...newDocuments.value, ...result.filePaths]
    }
    referenceFiles.value = [...referenceFiles.value, ...result.filePaths]
  }
}

async function uploadFiles() {
  try {
    const allFiles = [mainFile.value, ...referenceFiles.value]
    const submission = await window.mainApi.invoke(IPC_CHANNELS.MAIN.SUBMISSION_CREATE, {
      name: checkName.value,
      type:
        checkType.value === 0 ? SUBMISSION_TYPE.SINGLE_SEMANTIC : SUBMISSION_TYPE.SINGLE_MATCHING,
      documentCount: allFiles.length
    })
    isUploading.value = true
    uploadProgress.value = 0

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i]
      const pdfSource = await window.mainApi.invoke(IPC_CHANNELS.MAIN.READ_FILE, file)
      let raw = atob(pdfSource)
      let rawLength = raw.length
      let pdfBase64 = new Uint8Array(new ArrayBuffer(rawLength))
      for (let i = 0; i < rawLength; i++) {
        pdfBase64[i] = raw.charCodeAt(i)
      }
      const sentences = await PDFTextProcessor.process(pdfBase64)
      await window.mainApi.invoke(IPC_CHANNELS.MAIN.UPLOAD_DOCUMENT, {
        submissionId: submission.id,
        filePath: allFiles[i],
        documentId: 0,
        sentences: sentences.map((sentence) => {
          const splitArray = sentence.splits
            .filter((item) => item.fromPage !== item.toPage)
            .map((item) => item.position)
          const split = splitArray.length > 0 ? splitArray[0] : -1
          return {
            id: sentence.id,
            text: sentence.text,
            pages: JSON.stringify([...new Set(sentence.pages)]),
            split
          }
        }),
        isDocCheck: i === 0 ? 1 : 0
      })
      uploadProgress.value = Math.round(((i + 1) / allFiles.length) * 100)
      if (checkType.value === 0) {
        submissionStore.addSubmission({
          submissionId: submission.id,
          submissionName: checkName.value,
          submissionType: SUBMISSION_TYPE.SINGLE_SEMANTIC,
          totalFiles: allFiles.length,
          status: SUBMISSION_STATUS.PROCESSING,
          result: undefined,
          docIdToFileName: {}
        })
      } else {
        submissionStore.addSubmission({
          submissionId: submission.id,
          submissionName: checkName.value,
          submissionType: SUBMISSION_TYPE.SINGLE_MATCHING,
          totalFiles: allFiles.length,
          status: SUBMISSION_STATUS.PROCESSING,
          result: undefined,
          docIdToFileName: {}
        })
      }
    }
    await router.push({ path: ROUTES.LIST_SUBMISSION })
  } catch (error) {
    console.error('Error uploading files:', error)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const saveChanges = async () => {
  const submissionId = Number(route.query.submissionId)
  const allFiles = [...newDocuments.value]

  // const ignoreDocId: number[] = []
  // for (const file of ignoredDocuments.value) {
  //   const docId = Object.keys(submissionStore.getSubmissionById(submissionId).docIdToFileName).find(
  //     (key) => submissionStore.getSubmissionById(submissionId).docIdToFileName[key] === file
  //   )
  //   if (docId) {
  //     ignoreDocId.push(Number(docId))
  //   }
  // }
  const submissionReq: EditSubmissionReq = {
    submissionId,
    submissionName: checkName.value,
    // TODO: feature ignore documents
    ignoreDocId: [],
    additionalDocCount: allFiles.length
  }
  const submission = await window.mainApi.invoke(IPC_CHANNELS.MAIN.SUBMISSION_EDIT, submissionReq)

  isUploading.value = true
  uploadProgress.value = 0
  try {
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i]
      const pdfSource = await window.mainApi.invoke(IPC_CHANNELS.MAIN.READ_FILE, file)
      let raw = atob(pdfSource)
      let rawLength = raw.length
      let pdfBase64 = new Uint8Array(new ArrayBuffer(rawLength))
      for (let i = 0; i < rawLength; i++) {
        pdfBase64[i] = raw.charCodeAt(i)
      }
      const sentences = await PDFTextProcessor.process(pdfBase64)
      await window.mainApi.invoke(IPC_CHANNELS.MAIN.UPLOAD_DOCUMENT, {
        submissionId,
        filePath: allFiles[i],
        sentences: sentences.map((sentence) => {
          const splitArray = sentence.splits
            .filter((item) => item.fromPage !== item.toPage)
            .map((item) => item.position)
          const split = splitArray.length > 0 ? splitArray[0] : -1
          return {
            id: sentence.id,
            text: sentence.text,
            pages: JSON.stringify([...new Set(sentence.pages)]),
            split
          }
        }),
        isDocCheck: file === mainFile.value ? 1 : 0
      })
      uploadProgress.value = Math.round(((i + 1) / allFiles.length) * 100)
      submissionStore.setStatus(submissionId, SUBMISSION_STATUS.PROCESSING)
    }
    await router.push({ path: ROUTES.LIST_SUBMISSION })
  } catch (error) {
    console.error('Error saving changes:', error)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

function removeMainFile() {
  mainFile.value = ''
}

function removeReferenceFile(index) {
  referenceFiles.value = referenceFiles.value.filter((_, idx) => idx !== index)
}

function clearReferenceFiles() {
  referenceFiles.value = []
}
</script>

<style scoped>
.field-radiobutton {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
}

:deep(.p-radiobutton) {
  width: 1.2rem;
  height: 1.2rem;
}

:deep(.p-tooltip) {
  max-width: 250px;
}

.surface-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
}

.transition-colors {
  transition: background-color 0.2s;
}

.transition-duration-150 {
  transition-duration: 150ms;
}

.text-overflow-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 2rem);
}
</style>
