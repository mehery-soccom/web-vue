<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useTheme } from "vuetify"
import { useEventStore } from './useEventStore'
import { getLatestBarChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig"
import BarChart from "@app-pushapp/@core/libs/chartjs/components/BarChart"
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

const props = defineProps({
  event: String,
  dateRange: String,
  cohortId: String,
})

const eventStore = useEventStore()
const vuetifyTheme = useTheme()

const rawData = ref({})
const loading = ref(false)
const propertyOptions = ref([])
const selectedProperty = ref(null)
const propertyCard = ref(null)

// Formatting Helper: user.id -> User-id, page -> Page
const formatLabel = (str) => {
  return str
    .replace(/\./g, '-') // replace dot with hyphen
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')
}

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
        title: { display: true, text: 'Property Value', font: { weight: 'bold' } }
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
        title: { display: true, text: 'Occurrence Count', font: { weight: 'bold' } }
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
      backgroundColor: '#7367f0', // Primary Indigo
      borderColor: "transparent",
      borderRadius: { topRight: 15, topLeft: 15 },
      data: values,
    }]
  }
})

const fetchProperties = async () => {
  if (!props.event) return
  
  const res = await eventStore.fetchEventDefinition(props.event)
  if (res?.success && res.data?.dataProperties) {
    propertyOptions.value = res.data.dataProperties
      .map(prop => ({
        title: formatLabel(prop),
        value: prop
      }))
      .sort((a, b) => a.title.localeCompare(b.title))

    if (propertyOptions.value.length > 0 && !selectedProperty.value) {
      selectedProperty.value = propertyOptions.value[0].value
    }
  } else {
    propertyOptions.value = []
    selectedProperty.value = null
  }
}

const fetchData = async () => {
  if (!props.event || !selectedProperty.value) {
    rawData.value = {}
    return
  }
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

    const res = await eventStore.fetchPropertyStats(selectedProperty.value, params)
    rawData.value = res?.data?.data || {}
  } catch (e) {
    console.error(e)
    rawData.value = {}
  } finally {
    loading.value = false
  }
}

const downloadImage = async () => {
  if (!propertyCard.value.$el) return

  const baseName = `${props.event}_property_${selectedProperty.value}_${props.dateRange}`.replace(/[\s.]+/g, '_')
  const fileName = `${baseName}.png`

  const canvas = await html2canvas(propertyCard.value.$el, {
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

  const formattedData = Object.entries(rawData.value).map(([val, count]) => ({
    [formatLabel(selectedProperty.value)]: val,
    Count: count
  }))

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Property Data")

  const baseName = `${props.event}_${selectedProperty.value}_${props.dateRange}`.replace(/[\s.]+/g, '_')
  const fileName = `${baseName}.xlsx`
  
  XLSX.writeFile(workbook, fileName)
}

watch(() => props.event, async () => {
  selectedProperty.value = null // Reset selection on event change
  await fetchProperties()
})

watch([() => props.dateRange, () => props.cohortId, selectedProperty], fetchData)

onMounted(async () => {
  await fetchProperties()
})
</script>

<template>
  <VCard ref="propertyCard">
    <VCardItem>
      <VCardTitle class="ps-4 text-h5 font-weight-bold text-primary">Event Properties</VCardTitle>
      
      <template #append>
        <div class="d-flex align-center gap-2">
          <div style="width: 250px;">
            <VAutocomplete
              v-model="selectedProperty"
              :items="propertyOptions"
              label="Select Property"
              placeholder="Choose key"
              density="compact"
              hide-details
              no-data-text="No properties defined"
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
      <div v-if="!props.event">Please select an Event.</div>
      <div v-else-if="propertyOptions.length === 0">No data properties defined for this event.</div>
      <div v-else>No data available for the selected property/range.</div>
    </VCardText>
  </VCard>
</template>