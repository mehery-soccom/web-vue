<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTheme } from "vuetify"
import VueApexCharts from "vue3-apexcharts"
import { useDashboardStore } from '@/app-lead/views/dashboard/useDashboardStore'
import { useStagesStore } from '@/app-lead/views/admin/stages/useStagesStore'
import { getDonutChartConfig } from "@app-lead/@core/libs/apex-chart/apexCharConfig"
import { useDatePickerFilters } from "@app-lead/views/dashboard/useDatePickerFilters"
import CardStatisticsTransactions from '@app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue'
import AppDateTimePicker from "@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue"

const vuetifyTheme = useTheme()
const { customPlugin } = useDatePickerFilters()
const dashboardStore = useDashboardStore()
const stagesStore = useStagesStore()

const chartColors = {
  column: {
    series1: '#9055FD',
  },
}
const labelColor = 'rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity))'
const borderColor = 'rgba(var(--v-border-color), var(--v-border-opacity))'

const today = new Date()
const tonight = new Date().setHours(23, 59, 59, 999)
const formatDate = (date) => date.toLocaleDateString("en-GB").split("/").join("-")
const dateRange = ref(`${formatDate(today)} to ${formatDate(today)}`)

const stageConfigs = {
  'initial': { icon: 'tabler-circle-plus', color: 'info' },
  'won': { icon: 'tabler-circle-check', color: 'success' },
  'lost': { icon: 'tabler-circle-x', color: 'error' },
}
const otherColors = ['primary', 'warning', 'secondary', 'dark', 'info', 'success']

const monthMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const countChartData = computed(() => {
  const data = dashboardStore.countSummary || {}
  const categories = []
  const seriesData = []

  Object.keys(data).forEach(dateStr => {
    const [day, month, year] = dateStr.split('-')
    const formattedLabel = `${parseInt(day)} ${monthMap[parseInt(month) - 1]}`
    
    categories.push(formattedLabel)
    seriesData.push(data[dateStr])
  })

  return {
    series: [{ name: 'Leads', data: seriesData }],
    categories
  }
})

const countChartConfig = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    parentHeightOffset: 0,
  },
  plotOptions: {
    bar: {
      columnWidth: '35%',
      borderRadius: 6,
      borderRadiusApplication: 'end',
    },
  },
  dataLabels: { enabled: false },
  grid: {
    borderColor,
    strokeDashArray: 8,
    xaxis: { lines: { show: false } },
  },
  colors: [chartColors.column.series1],
  xaxis: {
    categories: countChartData.value.categories,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: labelColor, fontSize: '13px' } },
  },
  yaxis: {
    labels: {
      style: { colors: labelColor, fontSize: '13px' },
      formatter: val => Math.floor(val),
    },
  },
  tooltip: { y: { formatter: val => `${val} Leads` } },
}))

const sourceChartData = computed(() => {
  const series = []
  const labels = []
  dashboardStore.sourceSummary.forEach(form => {
    Object.entries(form.activity || {}).forEach(([source, count]) => {
      if (source !== 'total_received') {
        series.push(count)
        labels.push(`${form.formTitle} - ${source}`)
      }
    })
  })
  return { series, labels }
})

const otherColorss = [
  '#9055FD', '#00CFE8', '#FF9F43', '#EA5455', '#28C76F', 
  '#7367F0', '#6226EF', '#FF4C51', '#00BAD1', '#A8AAAD',
  '#56CA00', '#FBAD17', '#16B1FF', '#FFB400', '#00D4BD'
]

const sourceChartConfig = computed(() => {
  const config = getDonutChartConfig(vuetifyTheme.current.value)
  
  return { 
    ...config, 
    labels: sourceChartData.value.labels, 
    colors: otherColorss,
    tooltip: { enabled: true } 
  }
})

const mappedStageStats = computed(() => {
  const stats = []
  const summary = dashboardStore.stageSummary || {}
  const allStages = Array.isArray(stagesStore.stages) ? stagesStore.stages : []
  const totalLeads = Object.values(summary).reduce((acc, count) => acc + (Number(count) || 0), 0)
  
  stats.push({ title: 'Total Leads', stats: String(totalLeads), icon: 'tabler-users', color: 'primary' })
  
  const wonStage = allStages.find(s => s.code === 'won')
  const lostStage = allStages.find(s => s.code === 'lost')
  const others = allStages.filter(s => s.code !== 'won' && s.code !== 'lost').sort((a, b) => Number(a.probability || 0) - Number(b.probability || 0))

  if (wonStage) stats.push({ title: wonStage.title, stats: String(summary[wonStage._id] || 0), icon: stageConfigs.won.icon, color: stageConfigs.won.color })
  others.forEach((stage, index) => {
    const config = stageConfigs[stage.code] || { icon: 'tabler-circle-dot', color: otherColors[index % otherColors.length] }
    stats.push({ title: stage.title, stats: String(summary[stage._id] || 0), icon: config.icon, color: config.color })
  })
  if (lostStage) stats.push({ title: lostStage.title, stats: String(summary[lostStage._id] || 0), icon: stageConfigs.lost.icon, color: stageConfigs.lost.color })
  return stats
})

const getDatedAnalytics = async (selectedDates = null) => {
  let startDate, endDate
  if (selectedDates && selectedDates.length === 2) {
    startDate = new Date(selectedDates[0]); startDate.setHours(0, 0, 0, 0)
    endDate = new Date(selectedDates[1]); endDate.setHours(23, 59, 59, 999)
  } else {
    const parts = dateRange.value.split(" to ")
    const [sD, sM, sY] = parts[0].split("-").map(Number)
    const [eD, eM, eY] = (parts[1] || parts[0]).split("-").map(Number)
    startDate = new Date(sY, sM - 1, sD, 0, 0, 0, 0)
    endDate = new Date(eY, eM - 1, eD, 23, 59, 59, 999)
  }

  const tzConfig = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET || "Asia/Kolkata"
  const timezone = tzConfig.split("::")[0]
  const params = { dateRange1: startDate.getTime(), dateRange2: endDate.getTime(), timezone }
  
  await Promise.all([
    dashboardStore.fetchSourceSummary(params),
    dashboardStore.fetchCountSummary(params)
  ])
}

const fetchData = async () => {
  try {
    const stagesRes = await stagesStore.fetchStages()
    if (stagesRes && stagesRes.data) stagesStore.stages = stagesRes.data 
    await dashboardStore.fetchStageSummary()
    await getDatedAnalytics()
  } catch (e) {
    console.error("Dashboard error", e)
  }
}

onMounted(() => fetchData())

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 2) getDatedAnalytics(selectedDates)
}
</script>

<template>
  <VRow class="match-height">
    <VCol cols="12">
      <h3 class="text-h5">Lead Analytics</h3>
    </VCol>

    <VCol cols="12">
      <CardStatisticsTransactions 
        v-if="mappedStageStats.length > 1"
        :statistics="mappedStageStats" 
        title="Stages Overview" 
      />
    </VCol>

    <VCol cols="12" class="d-flex justify-end">
      <AppDateTimePicker
        v-model="dateRange"
        style="width: 280px"
        prepend-inner-icon="tabler-calendar"
        :config="{ mode: 'range', dateFormat: 'd-m-Y', maxDate: tonight, onClose: onDateClosed, plugins: [customPlugin] }"
      />
    </VCol>

    <VCol cols="12" md="8">
      <VCard title="Leads Statistics" subtitle="Daily lead creation volume">
        <VCardText>
          <VueApexCharts
            type="bar"
            height="320"
            :options="countChartConfig"
            :series="countChartData.series"
          />
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="4">
      <VCard title="Lead Source Breakdown">
        <VCardText>
          <VueApexCharts
            v-if="sourceChartData.series.length"
            type="donut"
            height="410"
            :options="sourceChartConfig"
            :series="sourceChartData.series"
          />
          <div v-else class="d-flex flex-column align-center justify-center py-10">
            <VIcon icon="tabler-chart-pie-off" size="48" color="disabled" />
            <span class="text-disabled mt-2">No Leads for selected range</span>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
// @use "@core/scss/template/libs/apex-chart.scss";
</style>