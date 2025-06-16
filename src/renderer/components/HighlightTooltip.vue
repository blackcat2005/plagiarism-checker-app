<template>
  <div v-if="visible" class="highlight-tooltip" :style="tooltipStyle">
    <div class="tooltip-header">
      <div class="matched-text">{{ data.matchedText }}</div>
      <Button icon="pi pi-times" class="p-button-text p-button-rounded" @click="$emit('close')" />
    </div>
    <div class="matches-list">
      <div v-for="(match, index) in data.matches" :key="index" class="match-item">
        <div class="match-header">
          <div class="source-name">{{ match.sourceName }}</div>
          <div class="similarity">{{ match.similarity }}%</div>
        </div>
        <div class="source-text">{{ match.sourceText }}</div>
        <div class="match-actions">
          <template v-if="match.match.isDeleted">
            <div class="deleted-info">
              <Tag
                :value="getReasonLabel(match.match.reasonType)"
                :severity="getReasonSeverity(match.match.reasonType)"
              />
              <div class="reason-text">{{ match.match.reasonText }}</div>
            </div>
            <div class="flex gap-2">
              <Button
                icon="pi pi-pencil"
                class="p-button-text p-button-rounded p-button-warning"
                @click="$emit('edit', match.match)"
              />
              <Button
                icon="pi pi-undo"
                class="p-button-text p-button-rounded p-button-success"
                @click="$emit('restore', match.match)"
              />
            </div>
          </template>
          <template v-else>
            <Button
              icon="pi pi-trash"
              class="p-button-text p-button-rounded p-button-danger"
              @click="$emit('delete', match.match)"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

const props = defineProps({
  visible: Boolean,
  data: Object,
  position: Object
})

const emit = defineEmits(['close', 'delete', 'edit', 'restore'])

const tooltipStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

const getReasonLabel = (reasonType) => {
  switch (reasonType) {
    case 'wrong_detection':
      return 'Nhận diện sai'
    case 'referenced':
      return 'Đã khai báo tài liệu tham khảo'
    case 'other':
      return 'Lý do khác'
    default:
      return reasonType
  }
}

const getReasonSeverity = (reasonType) => {
  switch (reasonType) {
    case 'wrong_detection':
      return 'warning'
    case 'referenced':
      return 'success'
    case 'other':
      return 'info'
    default:
      return 'info'
  }
}
</script>

<style scoped>
.highlight-tooltip {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 12px;
  max-width: 400px;
  z-index: 1000;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.matched-text {
  font-weight: bold;
  margin-right: 8px;
}

.matches-list {
  max-height: 300px;
  overflow-y: auto;
}

.match-item {
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.match-item:last-child {
  border-bottom: none;
}

.match-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.source-name {
  font-weight: 500;
}

.similarity {
  color: #666;
}

.source-text {
  font-size: 0.9em;
  color: #444;
  margin-bottom: 4px;
}

.match-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.deleted-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reason-text {
  font-size: 0.9em;
  color: #666;
  font-style: italic;
}
</style>
