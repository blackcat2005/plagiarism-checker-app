<template>
  <div class="mt-4">
    <h2 class="text-5xl text-center text-primary font-semibold mb-4 animate-title gradient-text">
      Lựa chọn kiểu kiểm tra
    </h2>
    <div class="mt-8 flex gap-8 justify-content-center align-items-center mt-4">
      <Card class="check-card" style="width: 25rem; overflow: hidden">
        <template #header>
          <img alt="1 document - n documents" src="@/public/images/1-n.svg" class="card-image" />
        </template>
        <template #title>
          <div class="text-2xl font-bold"> Kiểm tra đơn văn bản </div>
        </template>
        <template #content>
          <p class="m-0 h-full text-gray-600 content-text">
            So sánh 1 tài liệu đầu vào với kho tài liệu cho trước
          </p>
        </template>
        <template #footer>
          <Button
            label="Chọn"
            class="p-button-rounded p-button-primary w-full"
            @click="router.push({ path: ROUTES.CHECK_SINGLE })"
          />
        </template>
      </Card>

      <Card class="check-card" style="width: 25rem; overflow: hidden">
        <template #header>
          <img alt="n documents - n documents" src="@/public/images/n-n.svg" class="card-image" />
        </template>
        <template #title>
          <div class="text-2xl font-bold"> Kiểm tra đa văn bản </div>
        </template>
        <template #content>
          <p class="m-0 h-full text-gray-600 content-text">
            Tìm trong tập tài liệu đầu vào các tài liệu tương tự nhất
          </p>
        </template>
        <template #footer>
          <Button
            label="Chọn"
            class="p-button-rounded p-button-primary w-full"
            @click="router.push({ path: ROUTES.CHECK_MULTIPLE })"
          />
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import { ROUTES } from '@/shared/constants/app.constants'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.check-card {
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-height: 25rem;
  display: flex;
  flex-direction: column;
}

.check-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.content-text {
  flex: 1;
  padding: 1rem 0;
  line-height: 1.6;
  font-size: 1.1rem;
}

.card-image {
  transition: transform 0.3s ease;
  width: 100%;
  height: 200px;
  object-fit: contain;
  padding: 1rem;
}

.check-card:hover .card-image {
  transform: scale(1.05);
}

.gradient-text {
  background: linear-gradient(120deg, #2563eb, #4f46e5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  position: relative;
}

.gradient-text::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 4px;
  background: linear-gradient(120deg, #2563eb, #4f46e5);
  border-radius: 2px;
}

.animate-title {
  animation: slideDown 0.7s ease-out;
}

@keyframes slideDown {
  0% {
    opacity: 0;
    transform: translateY(-30px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
