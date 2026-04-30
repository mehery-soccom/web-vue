<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAnalyticsStore } from '@/app-tikat/views/dashboard/analytics/useFeedbackAnalyticsStore'
import CardStatisticsTransactions from '@app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue'
import AppDateTimePicker from "@/app-tikat/@core/components/app-form-elements/AppDateTimePicker.vue"
import DemoDataTableKitchenSink from "@/app-tikat/views/tables/DemoDataTableKitchenSink.vue"
import { useDatePickerFilters } from "@app-tikat/views/dashboard/analytics/useDatePickerFilters"
import { useRouter } from 'vue-router'

const router = useRouter()
const { customPlugin } = useDatePickerFilters()
const analyticsStore = useAnalyticsStore()
const flavour = ref('feedback')

const today = new Date()
const tonight = new Date().setHours(23, 59, 59, 999)
const formatDate = (date) => date.toLocaleDateString("en-GB").split("/").join("-")
const dateRange = ref(`${formatDate(today)} to ${formatDate(today)}`)
const oldDates = ref("") 

const defaultStatusConfig = {
  'Positive': { icon: 'tabler-circle-check', color: 'success' },
  'New': { icon: 'tabler-circle-plus', color: 'info' },
  'Active': { icon: 'tabler-chart-dots', color: 'primary' },
}
const otherColors = ['warning', 'error', 'secondary', 'dark']

const statusHeaders = computed(() => {
  const baseHeaders = [
    { title: "Form Title", key: "formTitle", searchable: true, sortable: true, width: '250px' },
    { title: "Avg Score", key: "averageScore", align: 'center', sortable: true, width: '100px' },
    { title: "Total", key: "total", align: 'center', sortable: true, width: '80px' },
  ]
  allUniqueStatuses.value.forEach(status => {
    baseHeaders.push({ title: status, key: `Status.${status}`, align: 'center', sortable: true, width: '60px' })
  })
  return baseHeaders
})

const segmentationHeaders = [
  { title: "Form Title", key: "formTitle", searchable: true, sortable: true, width: '250px' },
  { title: "Avg Score", key: "averageScore", align: 'center', sortable: true, width: '100px' },
  { title: "Total", key: "total", align: 'center', sortable: true, width: '80px' },
  { title: "Satisfied", key: "good", align: 'center', sortable: true, width: '100px' },
  { title: "Neutral", key: "satisfactory", align: 'center', sortable: true, width: '100px' },
  { title: "Not Satisfied", key: "poor", align: 'center', sortable: true, width: '100px' },
]

const allUniqueStatuses = computed(() => {
  const statuses = new Set()
  analyticsStore.statusSummary.forEach(form => {
    Object.keys(form.Status || {}).forEach(s => statuses.add(s))
  })
  const priority = ['Positive', 'New', 'Active']
  return Array.from(statuses).sort((a, b) => {
    if (priority.includes(a) && !priority.includes(b)) return -1
    if (!priority.includes(a) && priority.includes(b)) return 1
    return a.localeCompare(b)
  })
})

const goToFeedbackList = (title) => {
  router.push({
    name: 'admin-feedbacks-list',
    query: { formTitle: title }
  })
}

const dynamicStatusStats = computed(() => {
  const stats = []
  const totalReceived = analyticsStore.statusSummary.reduce((acc, curr) => acc + (curr.total || 0), 0)
  stats.push({ title: 'Total Received', stats: String(totalReceived), icon: 'tabler-message-2', color: 'primary' })
  allUniqueStatuses.value.forEach((status, index) => {
    const totalForStatus = analyticsStore.statusSummary.reduce((acc, curr) => acc + (curr.Status?.[status] || 0), 0)
    const config = defaultStatusConfig[status] || { icon: 'tabler-circle-dot', color: otherColors[index % otherColors.length] }
    stats.push({ title: status, stats: String(totalForStatus), icon: config.icon, color: config.color })
  })
  return stats
})

const mappedSegmentationSummary = computed(() => {
  return analyticsStore.segmentationSummary.map(seg => {
    const statusMatch = analyticsStore.statusSummary.find(s => s.formCode === seg.formCode)
    return { ...seg, formTitle: statusMatch ? statusMatch.formTitle : seg.formCode }
  })
})

const segmentStats = ref([
  { title: 'Total Received', stats: '0', icon: 'tabler-message-2', color: 'primary' },
  { title: 'Satisfied', stats: '0', icon: 'tabler-mood-smile', color: 'success' },
  { title: 'Neutral', stats: '0', icon: 'tabler-mood-neutral', color: 'warning' },
  { title: 'Not Satisfied', stats: '0', icon: 'tabler-mood-sad', color: 'error' },
])

const getStatusSummary = async () => {
  try { await analyticsStore.fetchStatusSummary(flavour.value) } catch (e) { console.error(e) }
}

const getSegmentationSummary = async (startTs, endTs) => {
  const tzConfig = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET || "Asia/Kolkata"
  const timezone = tzConfig.split("::")[0]
  const params = { dateRange1: startTs, dateRange2: endTs, timezone }
  try {
    const data = await analyticsStore.fetchSegmentationSummary(flavour.value, params)
    let total = 0, good = 0, sat = 0, poor = 0
    data.forEach(form => {
      total += form.total || 0; good += form.good || 0;
      sat += form.satisfactory || 0; poor += form.poor || 0
    })
    const getPct = (val) => total > 0 ? Math.round((val / total) * 100) : 0

    segmentStats.value[0].stats = String(total)
    segmentStats.value[1].stats = `${good} (${getPct(good)}%)`
    segmentStats.value[2].stats = `${sat} (${getPct(sat)}%)`
    segmentStats.value[3].stats = `${poor} (${getPct(poor)}%)`
  } catch (e) { console.error(e) }
}

const refreshSegmentation = () => {
  const parts = dateRange.value.split(" to ")
  const [sD, sM, sY] = parts[0].split("-").map(Number)
  const [eD, eM, eY] = (parts[1] || parts[0]).split("-").map(Number)
  const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime()
  const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime()
  getSegmentationSummary(start, end)
}

onMounted(async () => {
  await getStatusSummary()
  refreshSegmentation()
})

const onDateClosed = (selectedDates, dateStr) => {
  if (selectedDates.length === 2 && oldDates.value !== dateStr) {
    oldDates.value = dateStr
    const start = new Date(selectedDates[0]); start.setHours(0, 0, 0, 0)
    const end = new Date(selectedDates[1]); end.setHours(23, 59, 59, 999)
    getSegmentationSummary(start.getTime(), end.getTime())
  }
}
</script>

<template>
  <VRow class="match-height">
    <VCol cols="12"><h3 class="text-h5 mb-4">Status Analytics</h3></VCol>
    <VCol cols="12"><CardStatisticsTransactions :statistics="dynamicStatusStats" title="Status Overview" /></VCol>

    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="statusHeaders"
        :productList="analyticsStore.statusSummary"
        title="FormWise Status Breakdown"
        item-value="formCode"
        fixed-column
      >
        <template #item.formTitle="{ item }">
          <span 
            class="font-weight-medium text-primary text-left d-block truncate cursor-pointer decoration-underline"
            @click="goToFeedbackList(item.raw.formTitle)"
          >
            {{ item.raw.formTitle }}
          </span>
        </template>
        <template #item.averageScore="{ item }">
          <span class="font-weight-bold">{{ item.raw.averageScore }}</span>
        </template>
        <template v-for="status in allUniqueStatuses" :key="status" #[`item.Status.${status}`]="{ item }">
          <VChip v-if="item.raw.Status?.[status]" size="small" variant="tonal" :color="defaultStatusConfig[status]?.color || 'secondary'">
            {{ item.raw.Status[status] }}
          </VChip>
          <span v-else class="text-disabled">0</span>
        </template>
      </DemoDataTableKitchenSink>
    </VCol>

    <VCol cols="12"><VDivider class="my-6" /></VCol>

    <VCol cols="12" class="d-flex justify-space-between align-center">
      <h3 class="text-h5">Segmentation Analytics</h3>
      <AppDateTimePicker
        v-model="dateRange"
        style="width: 280px"
        prepend-inner-icon="tabler-calendar"
        :config="{ mode: 'range', dateFormat: 'd-m-Y', maxDate: tonight, onClose: onDateClosed, plugins: [customPlugin] }"
      />
    </VCol>

    <VCol cols="12"><CardStatisticsTransactions :statistics="segmentStats" title="Performance Segments" /></VCol>

    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="segmentationHeaders"
        :productList="mappedSegmentationSummary"
        title="FormWise Performance Breakdown"
        item-value="formCode"
        fixed-column
      >
        <template #item.formTitle="{ item }">
          <span 
            class="font-weight-medium text-primary text-left d-block truncate cursor-pointer decoration-underline"
            @click="goToFeedbackList(item.raw.formTitle)"
          >
            {{ item.raw.formTitle }}
          </span>
        </template>
        <template #item.averageScore="{ item }">
          <VChip size="small" :color="item.raw.averageScore > 70 ? 'success' : 'primary'">{{ item.raw.averageScore }}%</VChip>
        </template>
        <template #item.good="{ item }"><span class="text-success font-weight-medium">{{ item.raw.good }}</span></template>
        <template #item.satisfactory="{ item }"><span class="text-warning font-weight-medium">{{ item.raw.satisfactory }}</span></template>
        <template #item.poor="{ item }"><span class="text-error font-weight-medium">{{ item.raw.poor }}</span></template>
      </DemoDataTableKitchenSink>
    </VCol>
  </VRow>
</template>

<style scoped>
:deep(.v-data-table__th) { text-transform: uppercase !important; }
:deep(.v-data-table__td) { padding: 12px 16px !important; }

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cursor-pointer {
  cursor: pointer;
}
.decoration-underline:hover {
  text-decoration: underline;
}
</style>
