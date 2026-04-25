<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useTheme } from "vuetify"
import VueApexCharts from "vue3-apexcharts"
import { useEventStore } from './useEventStore'
import { getColumnChartConfig } from "@app-pushapp/@core/libs/apex-chart/apexCharConfig"
import { getLatestBarChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig"
import BarChart from "@app-pushapp/@core/libs/chartjs/components/BarChart"
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

const props = defineProps({
  event: String,
  dateRange: String,
  selectedTrend: String,
})

const eventStore = useEventStore()
const vuetifyTheme = useTheme()
const trendCard = ref(null)

const rawData = ref({})
const loading = ref(false)
const chartJsColors = { barChartYellow: '#fdb022' }

const timeCategories = ['0-2', '2-4', '4-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24']

const downloadImage = async () => {
  if (!trendCard.value.$el) return

  const fileName = `${props.event}_${props.selectedTrend}_${props.dateRange}.png`.replace(/\s+/g, '_')

  const canvas = await html2canvas(trendCard.value.$el, {
    useCORS: true,
    backgroundColor: null,
  })

  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png')
  link.click()
}

const apexConfig = computed(() => {
  const config = getColumnChartConfig(vuetifyTheme.current.value)
  
  return {
    ...config,
    chart: { ...config.chart, toolbar: { show: false }, offsetX: 5 },
    xaxis: { 
      ...config.xaxis, 
      categories: timeCategories,
      title: { text: 'Hours of day', style: { fontWeight: 500 } }
    },
    yaxis: {
      ...config.yaxis,
      title: { text: 'Count', style: { fontWeight: 500 }, offsetX: 5 }
    },
    labels: {
        ...config.yaxis.labels,
        minWidth: 30 
      },
    colors: ['#826af9', '#9055FD', '#28c76f', '#ff9f43', '#00cfe8', '#EA5455', '#FFB400', '#E83E8C', '#32475C', '#20C997'],
    plotOptions: {
      bar: {
        ...config.plotOptions.bar,
        columnWidth: '20%',
        colors: {
          ...config.plotOptions.bar.colors,
          backgroundBarColors: Array(timeCategories.length).fill("#fdf7ff")
        }
      }
    }
  }
})

const apexSeries = computed(() => {
  return Object.entries(rawData.value).map(([date, values]) => ({
    name: date.slice(0, 5), 
    data: values
  }))
})

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
        title: { display: true, text: 'Date', font: { weight: 'bold' } }
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
  const labels = Object.keys(rawData.value).map(d => d.slice(0, 5))
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

const exportToExcel = () => {
  if (Object.keys(rawData.value).length === 0) return

  let formattedData = []

  if (props.selectedTrend === 'Time of Day') {
    formattedData = Object.entries(rawData.value).map(([date, values]) => {
      const row = { Date: date }
      timeCategories.forEach((cat, index) => {
        row[cat] = values[index]
      })
      return row
    })
  } else {
    const columnLabel = props.selectedTrend.split(' ')[0]
    formattedData = Object.entries(rawData.value).map(([date, value]) => ({
      Date: date,
      [columnLabel]: value
    }))
  }

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Trend Data")

  const fileName = `${props.event}_${props.selectedTrend}_${props.dateRange}.xlsx`.replace(/\s+/g, '_')
  XLSX.writeFile(workbook, fileName)
}

watch([() => props.event, () => props.dateRange, () => props.selectedTrend], fetchData)
onMounted(fetchData)
</script>

<template>
  <VCard ref="trendCard">
    <VCardItem class="pt-6 ps-8">
      <VCardTitle class="text-h5 font-weight-bold text-primary">
        {{ props.selectedTrend }}
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