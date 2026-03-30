<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAnalyticsStore } from '@/app-tikat/views/dashboard/analytics/useFeedbackAnalyticsStore'
import CardStatisticsTransactions from '@app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue'
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue"
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters"

const { customPlugin } = useDatePickerFilters()
const analyticsStore = useAnalyticsStore()
const flavour = ref('feedback')

const today = new Date()
const tonight = new Date().setHours(23, 59, 59, 999)

const formattedToday = today.toLocaleDateString("en-GB").split("/").join("-")
const dateRange = ref(`${formattedToday} to ${formattedToday}`)

const defaultStatusConfig = {
  'Positive': { icon: 'tabler-circle-check', color: 'success' },
  'New': { icon: 'tabler-circle-plus', color: 'info' },
  'Active': { icon: 'tabler-chart-dots', color: 'primary' },
}

const otherColors = ['warning', 'error', 'secondary', 'dark']

const mappedSegmentationSummary = computed(() => {
  return analyticsStore.segmentationSummary.map(seg => {
    const statusMatch = analyticsStore.statusSummary.find(s => s.formCode === seg.formCode)
    return {
      ...seg,
      formTitle: statusMatch ? statusMatch.formTitle : seg.formCode
    }
  })
})

const allUniqueStatuses = computed(() => {
  const statuses = new Set()
  analyticsStore.statusSummary.forEach(form => {
    Object.keys(form.Status || {}).forEach(s => statuses.add(s))
  })
  
  const priority = ['Positive', 'New', 'Active']
  return Array.from(statuses).sort((a, b) => {
    if (priority.includes(a) && !priority.includes(b)) return -1
    if (!priority.includes(a) && priority.includes(b)) return 1
    if (priority.includes(a) && priority.includes(b)) return priority.indexOf(a) - priority.indexOf(b)
    return a.localeCompare(b)
  })
})

const dynamicStatusStats = computed(() => {
  const stats = []
  const totalReceived = analyticsStore.statusSummary.reduce((acc, curr) => acc + (curr.total || 0), 0)
  
  stats.push({ 
    title: 'Total Received', 
    stats: String(totalReceived), 
    icon: 'tabler-message-2', 
    color: 'primary' 
  })

  allUniqueStatuses.value.forEach((status, index) => {
    const totalForStatus = analyticsStore.statusSummary.reduce((acc, curr) => acc + (curr.Status?.[status] || 0), 0)
    const config = defaultStatusConfig[status] || { 
      icon: 'tabler-circle-dot',
      color: otherColors[index % otherColors.length] 
    }

    stats.push({
      title: status,
      stats: String(totalForStatus),
      icon: config.icon,
      color: config.color
    })
  })
  return stats
})

const segmentStats = ref([
  { title: 'Total Received', stats: '0', icon: 'tabler-message-2', color: 'primary' },
  { title: 'Good/Excellent', stats: '0', icon: 'tabler-mood-smile', color: 'success' },
  { title: 'Satisfactory', stats: '0', icon: 'tabler-mood-neutral', color: 'warning' },
  { title: 'Poor', stats: '0', icon: 'tabler-mood-sad', color: 'error' },
])

const getStatusSummary = async () => {
  try {
    await analyticsStore.fetchStatusSummary(flavour.value)
  } catch (e) {
    console.error("Status fetch error", e)
  }
}

const getSegmentationSummary = async () => {
  let [startStr, endStr] = dateRange.value.includes(" to ") ? dateRange.value.split(" to ") : [dateRange.value, dateRange.value]
  const [sD, sM, sY] = startStr.split("-").map(Number)
  const [eD, eM, eY] = endStr.split("-").map(Number)

  const tzConfig = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET || "Asia/Kolkata"
  const timezone = tzConfig.split("::")[0]

  const params = {
    dateRange1: new Date(sY, sM - 1, sD, 0, 0, 0).getTime(),
    dateRange2: new Date(eY, eM - 1, eD, 23, 59, 59).getTime(),
    timezone
  }

  try {
    const data = await analyticsStore.fetchSegmentationSummary(flavour.value, params)
    let total = 0, good = 0, sat = 0, poor = 0
    data.forEach(form => {
      total += form.total || 0
      good += form.good || 0
      sat += form.satisfactory || 0
      poor += form.poor || 0
    })
    segmentStats.value[0].stats = String(total)
    segmentStats.value[1].stats = String(good)
    segmentStats.value[2].stats = String(sat)
    segmentStats.value[3].stats = String(poor)
  } catch (e) {
    console.error("Segmentation fetch error", e)
  }
}

onMounted(async () => {
  await getStatusSummary()
  getSegmentationSummary()
})

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 2) {
    getSegmentationSummary()
  }
}
</script>

<template>
  <VRow class="match-height">
    
    <VCol cols="12">
      <h3 class="text-h5">Status Analytics</h3>
    </VCol>

    <VCol cols="12">
      <CardStatisticsTransactions 
        :statistics="dynamicStatusStats" 
        title="Status Overview" 
      />
    </VCol>

    <VCol cols="12">
      <VCard title="FormWise Status Breakdown">
        <VTable class="text-no-wrap">
          <thead>
            <tr>
              <th class="text-uppercase">Form Title</th>
              <th class="text-uppercase text-center">Avg Score</th>
              <th class="text-uppercase text-center">Total</th>
              <th v-for="status in allUniqueStatuses" :key="status" class="text-uppercase text-center">
                {{ status }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in analyticsStore.statusSummary" :key="item.formCode">
              <td class="font-weight-medium text-primary">{{ item.formTitle }}</td>
              <td class="text-center font-weight-bold">{{ item.averageScore }}</td>
              <td class="text-center">{{ item.total }}</td>
              <td v-for="status in allUniqueStatuses" :key="status" class="text-center">
                <VChip v-if="item.Status?.[status]" size="small" variant="tonal" :color="defaultStatusConfig[status]?.color || 'secondary'">
                  {{ item.Status[status] }}
                </VChip>
                <span v-else class="text-disabled">0</span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VDivider class="my-6" />
    </VCol>

    <VCol cols="12" class="d-flex justify-space-between align-center">
      <h3 class="text-h5">Segmentation Analytics</h3>
      <AppDateTimePicker
        v-model="dateRange"
        style="width: 280px"
        prepend-inner-icon="tabler-calendar"
        :config="{
          mode: 'range',
          dateFormat: 'd-m-Y',
          maxDate: tonight,
          onClose: onDateClosed,
          plugins: [customPlugin],
        }"
      />
    </VCol>

    <VCol cols="12">
      <CardStatisticsTransactions 
        :statistics="segmentStats" 
        title="Performance Segments" 
      />
    </VCol>

    <VCol cols="12">
      <VCard title="FormWise Performance Breakdown">
        <template #append>
          <div v-if="analyticsStore.isLoading" class="mr-4">
            <VProgressCircular indeterminate size="20" width="2" color="primary" />
          </div>
        </template>
        <VTable class="text-no-wrap segmentation-table">
          <thead>
            <tr>
              <th class="text-uppercase px-6">Form Title</th>
              <th class="text-uppercase text-center px-6">Avg Score</th>
              <th class="text-uppercase text-center px-6">Total</th>
              <th class="text-uppercase text-center px-6">Good</th>
              <th class="text-uppercase text-center px-6">Satisfactory</th>
              <th class="text-uppercase text-center px-6">Poor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in mappedSegmentationSummary" :key="item.formCode">
              <td class="font-weight-medium text-primary px-6">{{ item.formTitle }}</td>
              <td class="text-center px-6">
                <VChip size="small" :color="item.averageScore > 70 ? 'success' : 'primary'">
                  {{ item.averageScore }}%
                </VChip>
              </td>
              <td class="text-center px-6">{{ item.total }}</td>
              <td class="text-center text-success px-6">{{ item.good }}</td>
              <td class="text-center text-warning px-6">{{ item.satisfactory }}</td>
              <td class="text-center text-error px-6">{{ item.poor }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.segmentation-table th, 
.segmentation-table td {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

.segmentation-table th:first-child {
  width: 30%;
}
</style>