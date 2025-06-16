<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    header="Nhập lý do xóa"
    :style="{ width: '50vw' }"
    :closable="false"
  >
    <div class="flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label for="reasonType" class="w-2">Lý do:</label>
        <Dropdown
          v-model="localReasonType"
          :options="reasonOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          placeholder="Chọn lý do"
          :class="{ 'p-invalid': submitted && !localReasonType }"
        />
      </div>
      <div class="flex align-items-center gap-2">
        <label for="reasonText" class="w-2">Nội dung:</label>
        <Textarea
          v-model="localReasonText"
          :rows="3"
          class="w-full"
          placeholder="Nhập chi tiết lý do..."
          :class="{ 'p-invalid': submitted && !localReasonText }"
        />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-content-end gap-2">
        <Button label="Hủy" icon="pi pi-times" @click="handleCancel" class="p-button-text" />
        <Button label="Xóa" icon="pi pi-check" @click="handleSave" :disabled="!isValid" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import { REASON_CONFIG, type ReasonType } from '@/shared/types'

const props = defineProps<{
  visible: boolean
  reasonType?: ReasonType
  reasonText?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:reasonType': [value: ReasonType]
  'update:reasonText': [value: string]
  save: []
  cancel: []
}>()

const submitted = ref(false)

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const localReasonType = computed({
  get: () => props.reasonType,
  set: (value) => emit('update:reasonType', value as ReasonType)
})

const localReasonText = computed({
  get: () => props.reasonText || '',
  set: (value) => emit('update:reasonText', value)
})

const reasonOptions = computed(() =>
  Object.entries(REASON_CONFIG).map(([key, config]) => ({
    label: config.label,
    value: key,
    severity: config.severity
  }))
)

const isValid = computed(() => localReasonType.value && localReasonText.value?.trim().length > 0)

const handleSave = () => {
  submitted.value = true
  if (isValid.value) {
    emit('save')
    resetForm()
  }
}

const handleCancel = () => {
  emit('cancel')
  resetForm()
}

const resetForm = () => {
  submitted.value = false
  localReasonType.value = undefined
  localReasonText.value = ''
}
</script>

<style scoped>
.p-invalid {
  border-color: var(--red-500) !important;
}

.w-2 {
  width: 6rem;
}
</style>
