<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useTheme } from "vuetify"
import { useEventStore } from './useEventStore'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { getLatestBarChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig"
import BarChart from "@app-pushapp/@core/libs/chartjs/components/BarChart"

const props = defineProps({
  event: String,
  dateRange: String,
  selectedSession: String,
  cohortId: String,
})

const eventStore = useEventStore()
const vuetifyTheme = useTheme()

const rawData = ref({})
const loading = ref(false)
const chartJsColors = { barChartYellow: '#fdb022' }
const sessionCard = ref(null)

const chartJsOptions = computed(() => {
  const config = getLatestBarChartConfig(vuetifyTheme.current.value)
  const values = Object.values(rawData.value)
  const maxDataPoint = values.length ? Math.max(...values) : 0
  
  return {
    ...config,
    scales: {
      ...config.scales,
      x: {
        ...config.scales.x,
        title: { 
          display: true, 
          text: props.selectedSession === 'Time To' ? 'Time Intervals (Minutes)' : 'Pages Viewed until Event', 
          font: { weight: 'bold' } 
        }
      },
      y: {
        ...config.scales.y,
        min: 0,
        max: maxDataPoint > 50 
          ? Math.ceil((maxDataPoint * 1.1) / 50) * 50 : 50,
        ticks: {
          ...config.scales.y.ticks,
          stepSize: maxDataPoint > 50 ? 50 : 10
        },
        title: { display: true, text: 'Count', font: { weight: 'bold' } }
      }
    }
  }
})

const chartJsData = computed(() => {
  return {
    labels: Object.keys(rawData.value),
    datasets: [{
      maxBarThickness: 30,
      backgroundColor: chartJsColors.barChartYellow,
      borderColor: "transparent",
      borderRadius: { topRight: 15, topLeft: 15 },
      data: Object.values(rawData.value),
    }]
  }
})

const fetchData = async () => {
  if (!props.event || !props.selectedSession) return
  loading.value = true
  
  try {
    const parts = props.dateRange.split(" to ")
    const [sD, sM, sY] = parts[0].split("-").map(Number)
    const [eD, eM, eY] = (parts[1] || parts[0]).split("-").map(Number)
    
    const params = {
      event_name: props.event,
      dateRange1: new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime(),
      dateRange2: new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime(),
      timezone: window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asia/Kolkata",
      cohortId: props.cohortId
    }

    let res
    if (props.selectedSession === 'Time To') {
      res = await eventStore.fetchSessionTimeStats(params)
    } else {
      res = await eventStore.fetchSessionPageStats(params)
    }
    
    rawData.value = res?.data?.data || {}
  } catch (e) {
    console.error(e)
    rawData.value = {}
  } finally {
    loading.value = false
  }
}

const downloadImage = async () => {
  if (!sessionCard.value.$el) return

  const fileName = `${props.event}_${props.selectedSession}_${props.dateRange}.png`.replace(/\s+/g, '_')

  const canvas = await html2canvas(sessionCard.value.$el, {
    useCORS: true,
    backgroundColor: null,
  })

  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png')
  link.click()
}

const exportToExcel = () => {
  if (Object.keys(rawData.value).length === 0) return

  const columnLabel = props.selectedSession === 'Time To' ? 'Time Interval' : 'Pages Count'
  
  const formattedData = Object.entries(rawData.value).map(([key, value]) => ({
    [columnLabel]: key,
    Count: value
  }))

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Session Data")

  const fileName = `${props.event}_${props.selectedSession}_${props.dateRange}.xlsx`.replace(/\s+/g, '_')
  XLSX.writeFile(workbook, fileName)
}

watch([() => props.event, () => props.dateRange, () => props.selectedSession,() => props.cohortId], fetchData)
onMounted(fetchData)
</script>

<template>
  <VCard ref="sessionCard">
    <VCardItem class="pt-6 ps-8">
      <VCardTitle class="text-h5 font-weight-bold text-primary">
        {{ props.selectedSession }}
      </VCardTitle>

      <template #append>
        <VMenu transition="scale-transition" open-on-hover>
          <template #activator="{ props }">
            <VBtn
              icon="tabler-download"
              variant="text"
              color="secondary"
              size="small"
              v-bind="props"
            />
          </template>

          <VList density="compact">
            <VListItem @click="downloadImage">
              <template #prepend>
                <VIcon icon="tabler-photo" size="18" class="me-2" />
              </template>
              <VListItemTitle>Download Image</VListItemTitle>
            </VListItem>

            <VListItem @click="exportToExcel">
              <template #prepend>
                <VIcon icon="tabler-file-spreadsheet" size="18" class="me-2" />
              </template>
              <VListItemTitle>Download Excel</VListItemTitle>
            </VListItem>
          </VList>
        </VMenu>
      </template>
    </VCardItem>

    <VCardText v-if="loading" class="text-center py-10">
      <VProgressCircular indeterminate color="primary" />
    </VCardText>

    <VCardText v-else-if="Object.keys(rawData).length > 0" class="pt-2">
      <BarChart 
        :height="400" 
        :chart-data="chartJsData" 
        :chart-options="chartJsOptions" 
      />
    </VCardText>
    
    <VCardText v-else class="text-center py-10 text-disabled">
      {{ !props.event || !props.dateRange ? 'Please select Event and Date Range.' : 'No data available for the selected parameters' }}
    </VCardText>
  </VCard>
</template>