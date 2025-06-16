<template>
  <div class="px-5">
    <!-- Header section -->
    <PageHeader :title="`Chi tiết kết quả kiểm tra ${submissionName}`" @back="router.back">
      <template #actions>
        <div class="flex justify-content-end mb-3">
          <Button
            :icon="isTableView ? 'pi pi-chart-bar' : 'pi pi-table'"
            :label="isTableView ? 'Xem biểu đồ' : 'Xem bảng'"
            @click="toggleView"
          />
        </div>
      </template>
    </PageHeader>

    <!-- Chart container -->
    <div v-if="!isTableView" class="p-4 surface-100 border-round">
      <div class="surface-card p-4 border-round">
        <div class="chart-container">
          <v-chart :option="option" class="chart" autoresize @click="click" />
        </div>
      </div>
    </div>

    <!-- Table view -->
    <div v-else class="p-4 surface-100 border-round">
      <div class="surface-card p-4 border-round">
        <DataTable
          :value="tableData"
          :paginator="true"
          :rows="10"
          class="p-datatable-sm"
          :scrollable="true"
          scrollHeight="calc(100vh - 300px)"
        >
          <Column field="fileName" header="Tên file"></Column>
          <Column field="percentage" header="Tỷ lệ trùng lặp">
            <template #body="slotProps">
              <span :class="getPercentageClass(slotProps.data.percentage)">
                {{ slotProps.data.percentage }}%
              </span>
            </template>
          </Column>
          <Column field="action" header="Hành động">
            <template #body="slotProps">
              <Button label="Xem chi tiết" @click="handleAction(slotProps.data.docId)" />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSubmissionStore } from '@/renderer/state-stores/submission'
import { useRoute, useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { ROUTES } from '@/shared/constants'
import { TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/renderer/components/PageHeader.vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

use([GridComponent, BarChart, CanvasRenderer, TooltipComponent])

let option = ref()
const submissionName = ref('')
const route = useRoute()
const submissionId = route.params.id
const router = useRouter()
const submissionStore = useSubmissionStore()
let submission
const listDocId = []
const data = []
const isTableView = ref(false)
const tableData = ref([])

const toggleView = () => {
  isTableView.value = !isTableView.value
}

const getPercentageClass = (percentage) => {
  if (percentage > 75) return 'text-green-500'
  if (percentage > 50) return 'text-yellow-500'
  return 'text-red-500'
}

const click = (params) => {
  if (params.componentType === 'series' && submission) {
    const docId = Number(listDocId[params.dataIndex])
    console.log(`Clicked on ${docId} and submissionId ${submissionId}`)
    router.push({ path: ROUTES.CHECK_RESULT_PDF_VIEW, query: { docId, submissionId } })
  }
}

const handleAction = (docId) => {
  router.push({ path: ROUTES.CHECK_MULTIPLE, query: { docId, submissionId } })
}

onMounted(async () => {
  if (!submissionId) return
  submission = submissionStore.getSubmissionById(Number(submissionId))
  submissionName.value = submission.submissionName
  if (!submission) return
  if (!submission.result) {
    await submissionStore.fetchSubmissions(Number(submissionId))
  }
  const transformedData = Object.keys(submission.docIdToFileName).reduce((acc, key) => {
    const fileName = submission.docIdToFileName[key].split('\\').pop()
    acc[key] = fileName
    return acc
  }, {})

  for (const [key, value] of Object.entries(submission.result)) {
    const percentage = (100 * value.percentage).toFixed(2)
    data.push(percentage)
    listDocId.push(key)
    tableData.value.push({
      docId: key,
      fileName: transformedData[key],
      percentage: percentage
    })
  }

  option.value = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      top: '5%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        formatter: '{value}%',
        fontSize: 12
      },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: Object.values(transformedData),
      axisLabel: {
        interval: 0,
        rotate: 30,
        fontSize: 12,
        width: 100,
        overflow: 'truncate'
      }
    },
    series: [
      {
        data,
        type: 'bar',
        barWidth: '60%',
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#000',
          fontWeight: 'bold',
          fontSize: 12
        },
        itemStyle: {
          color: function (params) {
            const value = params.value
            if (value <= 2) {
              return '#4caf50' // Green for <= 2%
            } else if (value <= 15) {
              return '#ffeb3b' // Yellow for 2-15%
            } else {
              return '#f44336' // Red for > 15%
            }
          },
          borderRadius: [0, 4, 4, 0]
        }
      }
    ]
  }
})
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 200px);
  min-height: 600px;
  max-height: 800px;
}

.chart {
  width: 100%;
  height: 100%;
}

:deep(.echarts) {
  width: 100% !important;
  height: 100% !important;
}
</style>
