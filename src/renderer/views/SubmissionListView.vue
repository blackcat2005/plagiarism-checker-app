<template>
  <div class="px-5">
    <PageHeader title="Các lượt kiểm tra" :show-back-button="false">
      <template #actions>
        <Button
          v-if="canStartNewCheck"
          icon="pi pi-plus"
          label="Kiểm tra mới"
          @click="navigateToCheck"
        />
      </template>
    </PageHeader>
    <div class="p-4 surface-100 border-round">
      <!-- Results Table -->
      <DataTable :value="submissions" :paginator="true" :rows="10">
        <Column field="submissionId" header="Id" />
        <Column field="submissionName" header="Tên lượt kiểm tra" />
        <Column field="submissionType" header="Dạng kiểm tra">
          <template #body="slotProps">
            <span>{{ SUBMISSION_TYPE_LABEL[slotProps.data.submissionType] }}</span>
          </template>
        </Column>
        <Column field="status" header="Trạng thái">
          <template #body="slotProps">
            <Tag :severity="getStatusSeverity(slotProps.data.status)">
              {{ SUBMISSION_STATUS_LABEL[slotProps.data.status] }}
            </Tag>
          </template>
        </Column>
        <Column field="actions" header="">
          <template #body="slotProps">
            <div class="flex gap-2">
              <Button
                v-if="slotProps.data.status === SUBMISSION_STATUS.COMPLETED"
                icon="pi pi-eye"
                text
                @click="viewDetails(slotProps.data)"
              />
              <Button
                v-if="slotProps.data.status === SUBMISSION_STATUS.COMPLETED"
                icon="pi pi-plus-circle"
                text
                severity="warning"
                @click="editSubmission(slotProps.data)"
              />
              <Button
                v-if="slotProps.data.status === SUBMISSION_STATUS.COMPLETED"
                icon="pi pi-trash"
                text
                severity="danger"
                @click="deleteSubmission(slotProps.data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
    <ConfirmDialog></ConfirmDialog>
    <Toast />
  </div>
</template>

<script setup>
import { useSubmissionStore } from '@/renderer/state-stores/submission'
import { ROUTES } from '@/shared/constants/app.constants'
import { IPC_CHANNELS } from '@/shared/constants/ipc.channels'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/renderer/components/PageHeader.vue'
import {
  SUBMISSION_TYPE_LABEL,
  SUBMISSION_STATUS,
  SUBMISSION_TYPE,
  SUBMISSION_STATUS_LABEL
} from '@/shared/types/submission'
import { useConfirm } from 'primevue/useconfirm'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import ConfirmDialog from 'primevue/confirmdialog'

const submissionStore = useSubmissionStore()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

const submissions = computed(() => submissionStore.getAllSubmissions)

const getStatusSeverity = (status) => {
  switch (status) {
    case SUBMISSION_STATUS.COMPLETED:
      return 'success'
    case SUBMISSION_STATUS.PROCESSING:
      return 'info'
    case SUBMISSION_STATUS.ERROR:
      return 'danger'
    default:
      return 'warning'
  }
}

const viewDetails = async (data) => {
  console.log('Viewing details for submission:', data.submissionId)
  console.log(submissionStore.getSubmissionById(data.submissionId))
  if (!submissionStore.getSubmissionById(data.submissionId).result) {
    await submissionStore.fetchSubmissions(data.submissionId)
  }
  if (
    data.submissionType === SUBMISSION_TYPE.SINGLE_SEMANTIC ||
    data.submissionType === SUBMISSION_TYPE.SINGLE_MATCHING
  ) {
    const docCheckId = await window.mainApi.invoke(
      IPC_CHANNELS.MAIN.DOCUMENT_CHECK,
      data.submissionId
    )
    await router.push({
      path: ROUTES.CHECK_RESULT_PDF_VIEW,
      query: {
        submissionId: data.submissionId,
        docId: docCheckId
      }
    })
  } else {
    await router.push({
      path: `${ROUTES.CHECK_MULTIPLE_RESULT}/${data.submissionId}`
    })
  }
}

const editSubmission = (data) => {
  if (
    data.submissionType === SUBMISSION_TYPE.SINGLE_SEMANTIC ||
    data.submissionType === SUBMISSION_TYPE.SINGLE_MATCHING
  ) {
    router.push({
      path: ROUTES.CHECK_SINGLE,
      query: {
        submissionId: data.submissionId,
        mode: 'edit'
      }
    })
  } else {
    router.push({
      path: ROUTES.CHECK_MULTIPLE,
      query: {
        submissionId: data.submissionId,
        mode: 'edit'
      }
    })
  }
}

const deleteSubmission = async (data) => {
  const confirmed = await confirm.require({
    message: `Bạn có chắc chắn muốn xóa lượt kiểm tra "${data.submissionName}"?`,
    accept: async () => {
      await submissionStore.deleteSubmission(data.submissionId)
      toast.add({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Đã xóa lượt kiểm tra'
      })
    }
  })
}

const canStartNewCheck = computed(() => {
  return !submissions.value.some((submission) => submission.status === SUBMISSION_STATUS.PROCESSING)
})

const navigateToCheck = () => {
  router.push({ path: ROUTES.CHECK })
}
</script>
