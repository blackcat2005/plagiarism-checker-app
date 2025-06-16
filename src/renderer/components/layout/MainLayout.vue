<template>
  <div class="flex flex-column h-full">
    <!-- <div class="w-min">
            <SideBar />
        </div> -->
    <ToolBar />
    <Suspense>
      <div class="p-3 flex-grow-1 overflow-y-auto">
        <router-view />
      </div>
    </Suspense>
    <div class="bottom-bar surface-card border-top-1 border-primary-200">
      <div class="flex align-items-center justify-content-between w-full">
        <div class="flex align-items-center gap-2">
          <i class="pi pi-info-circle text-primary"></i>
          <span class="text-500">Status: Ready</span>
        </div>
        <div class="flex align-items-center gap-3">
          <span class="text-500">Version 1.0.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import ToolBar from '@/renderer/components/ToolBar.vue'
</script>

<style scoped>
.bottom-bar {
  height: 60px;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
}
</style>
