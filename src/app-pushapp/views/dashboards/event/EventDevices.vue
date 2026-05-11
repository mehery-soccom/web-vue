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
  cohortId: String,
})

const eventStore = useEventStore()
const vuetifyTheme = useTheme()

const rawData = ref({})
const loading = ref(false)
const selectedProperty = ref('platform')
const deviceCard = ref(null)

const deviceProperties = [
  { title: 'Platform', value: 'platform' },
  { title: 'App Version', value: 'appVersion' },
  { title: 'SDK Version', value: 'sdkVersion' },
  { title: 'Locale', value: 'locale' },
  { title: 'Device Model', value: 'deviceModel' },
  { title: 'OS Name', value: 'osName' },
  { title: 'OS Version', value: 'osVersion' },
]

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
        title: { display: true, text: 'Property', font: { weight: 'bold' } }
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
  const sortedEntries = Object.entries(rawData.value).sort((a, b) => b[1] - a[1])
  
  const labels = sortedEntries.map(entry => entry[0])
  const values = sortedEntries.map(entry => entry[1])

  return {
    labels,
    datasets: [{
      maxBarThickness: 30,
      backgroundColor: '#28c76f', 
      borderColor: "transparent",
      borderRadius: { topRight: 15, topLeft: 15 },
      data: values,
    }]
  }
})

const fetchData = async () => {
  if (!props.event || !selectedProperty.value) return
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

    const res = await eventStore.fetchDeviceStats(selectedProperty.value, params)
    rawData.value = res?.data?.data || {}
  } catch (e) {
    console.error(e)
    rawData.value = {}
  } finally {
    loading.value = false
  }
}

const downloadImage = async () => {
  if (!deviceCard.value.$el) return

  const fileName = `${props.event}_${selectedProperty.value}_${props.dateRange}.png`.replace(/\s+/g, '_')

  const canvas = await html2canvas(deviceCard.value.$el, {
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

  const formattedData = Object.entries(rawData.value).map(([propValue, count]) => ({
    [selectedProperty.value.toUpperCase()]: propValue,
    Count: count
  }))

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Device Data")

  const fileName = `${props.event}_${selectedProperty.value}_${props.dateRange}.xlsx`.replace(/\s+/g, '_')
  XLSX.writeFile(workbook, fileName)
}

watch([() => props.event, () => props.dateRange,() => props.cohortId, selectedProperty], fetchData)
onMounted(fetchData)
</script>

<template>
  <VCard ref="deviceCard">
    <VCardItem>
      <VCardTitle class="ps-4 text-h5 font-weight-bold text-primary">Device Properties</VCardTitle>
      
      <template #append>
        <div class="d-flex align-center gap-2">
          <div style="width: 200px;">
            <VSelect
              v-model="selectedProperty"
              :items="deviceProperties"
              label="Property"
              density="compact"
              hide-details
            />
          </div>

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
        </div>
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