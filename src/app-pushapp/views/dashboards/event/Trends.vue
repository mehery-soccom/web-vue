<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useTheme } from "vuetify"
import VueApexCharts from "vue3-apexcharts"
import { useEventStore } from './useEventStore'
import { getColumnChartConfig } from "@app-pushapp/@core/libs/apex-chart/apexCharConfig"
import { getLatestBarChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig"
import BarChart from "@app-pushapp/@core/libs/chartjs/components/BarChart"

const props = defineProps({
  event: String,
  dateRange: String,
  selectedTrend: String,
})

const eventStore = useEventStore()
const vuetifyTheme = useTheme()

const rawData = ref({})
const loading = ref(false)

// Colors for ChartJS
const chartJsColors = { barChartYellow: '#fdb022' }

const timeCategories = ['0-2', '2-4', '4-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24']

const apexConfig = computed(() => {
  const config = getColumnChartConfig(vuetifyTheme.current.value)
  const colors = ['#826af9', '#d2b0ff', '#28c76f', '#ff9f43', '#00cfe8']
  
  return {
    ...config,
    xaxis: { ...config.xaxis, categories: timeCategories },
    colors: colors,
    plotOptions: {
      bar: {
        ...config.plotOptions.bar,
        columnWidth: '20%',
        colors: {
          ...config.plotOptions.bar.colors,
          backgroundBarColors: Array(timeCategories.length).fill("#f8d3ff")
        }
      }
    }
  }
})

const apexSeries = computed(() => {
  return Object.entries(rawData.value).map(([date, values]) => ({
    name: date,
    data: values
  }))
})

const chartJsOptions = computed(() => getLatestBarChartConfig(vuetifyTheme.current.value))

const chartJsData = computed(() => {
  const labels = Object.keys(rawData.value)
  const values = Object.values(rawData.value)

  return {
    labels,
    datasets: [{
      maxBarThickness: 15,
      backgroundColor: chartJsColors.barChartYellow,
      borderColor: "transparent",
      borderRadius: { topRight: 15, topLeft: 15 },
      data: values,
    }]
  }
})

const fetchData = async () => {
  if (!props.event || !props.selectedTrend) return
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
    if (props.selectedTrend === 'Time of Day') {
      res = await eventStore.fetchTimeSlotStats(params)
    } else if (props.selectedTrend === 'Events over time') {
      res = await eventStore.fetchEventOverTime(params)
    } else if (props.selectedTrend === 'Users over time') {
      res = await eventStore.fetchUserOverTime(params)
    }
    
    rawData.value = res?.data?.data || {}
  } catch (e) {
    console.error(e)
    rawData.value = {}
  } finally {
    loading.value = false
  }
}

watch([() => props.event, () => props.dateRange, () => props.selectedTrend], fetchData)
onMounted(fetchData)
</script>

<template>
  <VCard>
    <VCardText v-if="loading" class="text-center py-10">
      <VProgressCircular indeterminate color="primary" />
    </VCardText>

    <VCardText v-else-if="Object.keys(rawData).length > 0">
      <template v-if="props.selectedTrend === 'Time of Day'">
        <VueApexCharts
          type="bar"
          height="400"
          :options="apexConfig"
          :series="apexSeries"
        />
      </template>

      <template v-else>
        <BarChart 
          :height="400" 
          :chart-data="chartJsData" 
          :chart-options="chartJsOptions" 
        />
      </template>
    </VCardText>
    
    <VCardText v-else class="text-center py-10 text-disabled">
      Please select Event and Date Range.
    </VCardText>
  </VCard>
</template>