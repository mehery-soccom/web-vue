<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useTheme } from "vuetify"
import { useEventStore } from './useEventStore'
import { getLatestBarChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig"
import BarChart from "@app-pushapp/@core/libs/chartjs/components/BarChart"

const props = defineProps({
  event: String,
  dateRange: String,
})

const eventStore = useEventStore()
const vuetifyTheme = useTheme()

const rawData = ref({})
const loading = ref(false)
const selectedProperty = ref('platform')

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
      timezone: window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asia/Kolkata"
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

watch([() => props.event, () => props.dateRange, selectedProperty], fetchData)
onMounted(fetchData)
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle class="ps-4 text-h5 font-weight-bold text-primary">Device Properties</VCardTitle>
      
      <template #append>
        <div style="width: 200px;">
          <VSelect
            v-model="selectedProperty"
            :items="deviceProperties"
            label="Property"
            density="compact"
            hide-details
          />
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
      Please select Event and Date Range.
    </VCardText>
  </VCard>
</template>