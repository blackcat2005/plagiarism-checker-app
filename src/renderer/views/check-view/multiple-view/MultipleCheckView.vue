<template>
  <div class="px-5">
    <PageHeader title="Kiểm tra trùng lặp đa văn bản" @back="router.back" />

    <!-- Main content -->
    <div class="p-4 surface-100 border-round">
      <!-- Action buttons -->
      <div class="flex align-items-center gap-3 mb-4">
        <Button label="Chọn file" icon="pi pi-folder-open" @click="openFileDialog" class="p-button-raised"
          :disabled="isUploading" severity="primary" />

        <Button v-if="mode === 'edit'" label="Lưu thay đổi" icon="pi pi-save" :disabled="isUploading" severity="success"
          @click="saveChanges" class="p-button-raised" />

        <Button v-else label="Tải lên" icon="pi pi-upload" :disabled="!selectedFiles.length || isUploading"
          @click="uploadFiles" severity="success" class="p-button-raised" />
      </div>

      <div v-if="isUploading" class="mt-4">
        <h4 class="m-0 mb-2">Đang tải lên ({{ uploadProgress }}%)</h4>
        <ProgressBar :value="uploadProgress" />
        <small class="block mt-2 text-500">
          Vui lòng không đóng trình duyệt trong quá trình tải lên
        </small>
      </div>

      <!-- File list -->
      <div v-if="selectedFiles.length" class="mt-4">
        <div class="flex justify-content-between align-items-center mb-3">
          <h4 class="m-0">Danh sách file đã chọn ({{ selectedFiles.length }} files)</h4>
          <Button label="Xóa tất cả" icon="pi pi-trash" severity="danger" :disabled="isUploading" text
            @click="clearFiles" />
        </div>
        <ul class="list-none p-0 m-0 overflow-auto max-h-20rem">
          <li v-for="(file, idx) in selectedFiles" :key="idx"
            class="flex align-items-center justify-content-between p-3 border-round mb-2 surface-ground hover:surface-200 transition-colors transition-duration-150">
            <div class="flex align-items-center">
              <i class="pi pi-file mr-3 text-primary"></i>
              <span class="font-medium">{{ file }}</span>
              <span v-if="newDocuments.includes(file)" class="ml-2 text-sm text-primary">
                (Mới)
              </span>
            </div>
            <div class="flex align-items-center gap-2">
              <Button v-if="mode !== 'edit'" icon="pi pi-times" text severity="danger" @click="removeFile(idx)"
                class="p-button-rounded" />
            </div>
          </li>
        </ul>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center p-6">
        <i class="pi pi-inbox text-500" style="font-size: 3rem"></i>
        <p class="text-500 my-3">Chưa có file nào được chọn</p>
        <small class="text-400">Nhấn nút "Chọn file" để bắt đầu</small>
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
          <div class="grid">
            <div class="col-12">
              <div class="flex align-items-center gap-3">
                <div class="flex-1">
                  <div class="field-radiobutton mb-2">
                    <RadioButton v-model="checkType" :value="1" inputId="matching" />
                    <label for="matching" class="ml-2">So khớp chính xác</label>
                  </div>
                  <div class="field-radiobutton">
                    <RadioButton v-model="checkType" :value="0" inputId="semantic" />
                    <label for="semantic" class="ml-2">Kiểm tra ngữ nghĩa</label>
                    <i v-p-tooltip="'Tốn nhiều thời gian'" class="pi pi-fire ml-2 text-orange-500 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IPC_CHANNELS, ROUTES } from '@/shared/constants'
import { EditSubmissionReq, SUBMISSION_STATUS, SUBMISSION_TYPE } from '@/shared/types/submission'
import { useSubmissionStore } from '@/renderer/state-stores/submission'
import ProgressBar from 'primevue/progressbar'
import { onMounted, ref } from 'vue'
import PageHeader from '@/renderer/components/PageHeader.vue'
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import InputText from 'primevue/inputtext'
import { PDFTextProcessor } from '@/renderer/utils/PDFTextProcessor'
import { useRoute, useRouter } from 'vue-router'

const selectedFiles = ref<string[]>([])
const checkType = ref(1)
const checkName = ref('')
const isUploading = ref(false)
const uploadProgress = ref(0)
const submissionStore = useSubmissionStore()
const router = useRouter()
const route = useRoute()
const mode = ref('new')
const newDocuments = ref<string[]>([])

onMounted(() => {
  if (route.query.submissionId) {
    const submission = submissionStore.getSubmissionById(Number(route.query.submissionId))
    if (submission) {
      checkName.value = submission.submissionName
      selectedFiles.value = Object.values(submission.docIdToFileName)
      checkType.value = submission.submissionType === SUBMISSION_TYPE.MULTIPLE_SEMANTIC ? 0 : 1
      mode.value = 'edit'
    }
  }
})

const openFileDialog = async () => {
  const result = await window.mainApi.invoke(IPC_CHANNELS.MAIN.OPEN_FILE, 'pdf')
  if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
    if (mode.value === 'edit') {
      newDocuments.value = [...newDocuments.value, ...result.filePaths]
    }
    selectedFiles.value = [...selectedFiles.value, ...result.filePaths]
  }
}

async function uploadFiles() {
  try {
    const submission = await window.mainApi.invoke(IPC_CHANNELS.MAIN.SUBMISSION_CREATE, {
      name: checkName.value,
      type:
        checkType.value === 0
          ? SUBMISSION_TYPE.MULTIPLE_SEMANTIC
          : SUBMISSION_TYPE.MULTIPLE_MATCHING,
      documentCount: selectedFiles.value.length
    })

    isUploading.value = true
    uploadProgress.value = 0

    if (checkType.value === 0) {
      submissionStore.addSubmission({
        submissionId: submission.id,
        submissionName: checkName.value,
        submissionType: SUBMISSION_TYPE.MULTIPLE_SEMANTIC,
        totalFiles: selectedFiles.value.length,
        status: SUBMISSION_STATUS.PROCESSING,
        result: undefined,
        docIdToFileName: {}
      })
    } else {
      submissionStore.addSubmission({
        submissionId: submission.id,
        submissionName: checkName.value,
        submissionType: SUBMISSION_TYPE.MULTIPLE_MATCHING,
        totalFiles: selectedFiles.value.length,
        status: SUBMISSION_STATUS.PROCESSING,
        result: undefined,
        docIdToFileName: {}
      })
    }

    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
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
        filePath: selectedFiles.value[i],
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
        isDocCheck: 0
      })
      uploadProgress.value = Math.round(((i + 1) / selectedFiles.value.length) * 100)
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
  const submissionReq: EditSubmissionReq = {
    submissionId,
    submissionName: checkName.value,
    ignoreDocId: [],
    additionalDocCount: newDocuments.value.length
  }
  const submission = await window.mainApi.invoke(IPC_CHANNELS.MAIN.SUBMISSION_EDIT, submissionReq)

  isUploading.value = true
  uploadProgress.value = 0
  try {
    for (let i = 0; i < newDocuments.value.length; i++) {
      const file = newDocuments.value[i]
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
        filePath: newDocuments.value[i],
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
        isDocCheck: 0
      })
      uploadProgress.value = Math.round(((i + 1) / newDocuments.value.length) * 100)
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

function removeFile(index) {
  selectedFiles.value = selectedFiles.value.filter((_, idx) => idx !== index)
}

function clearFiles() {
  selectedFiles.value = []
}
</script>

<style scoped>
.field-radiobutton {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
}

.transition-colors {
  transition: background-color 0.2s;
}

.transition-duration-150 {
  transition-duration: 150ms;
}
</style>
