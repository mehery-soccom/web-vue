<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useTheme } from "vuetify"
import { useEventStore } from './useEventStore'
import { getLatestBarChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig"
import BarChart from "@app-pushapp/@core/libs/chartjs/components/BarChart"

const props = defineProps({
  event: String,
  dateRange: String,
  selectedSession: String,
})

const eventStore = useEventStore()
const vuetifyTheme = useTheme()

const rawData = ref({})
const loading = ref(false)
const chartJsColors = { barChartYellow: '#fdb022' }

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
      timezone: window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asia/Kolkata"
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

watch([() => props.event, () => props.dateRange, () => props.selectedSession], fetchData)
onMounted(fetchData)
</script>

<template>
  <VCard>
    <VCardTitle class="pt-6 ps-8 text-h5 font-weight-bold text-primary">
      {{ props.selectedSession }}
    </VCardTitle>

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