<template>
  <div class="surface-section">
    <div
      class="flex align-items-center justify-content-between pb-2 mb-3 border-bottom-1 surface-border"
    >
      <div class="flex align-items-center gap-3">
        <Button
          v-if="showBackButton"
          icon="pi pi-arrow-left"
          text
          class="p-button-sm hover:bg-primary hover:text-white transition-colors transition-duration-150"
          @click="$emit('back')"
        />
        <h2 class="m-0 text-primary font-medium text-lg">{{ title }}</h2>
      </div>
      <slot name="actions"> </slot>
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button'

defineProps({
  title: {
    type: String,
    required: true
  },
  showBackButton: {
    type: Boolean,
    default: true
  }
})

defineEmits(['back'])
</script>

<style scoped>
:deep(.p-button.p-button-text:enabled:hover) {
  background: var(--primary-color);
  color: var(--primary-color-text);
}
</style>
