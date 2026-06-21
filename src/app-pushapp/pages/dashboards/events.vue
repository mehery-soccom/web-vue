<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useEventStore } from '@app-pushapp/views/dashboards/event/useEventStore'
import { useCohortsStore } from '@app-pushapp/views/admin/cohorts/useCohortsStore'
import CardStatisticsTransactions from '@app-pushapp/views/dashboards/event/CardStatisticsTransactions.vue'
import AppDateTimePicker from "@/app-tikat/@core/components/app-form-elements/AppDateTimePicker.vue"
import { useDatePickerFilters } from "@app-tikat/views/dashboard/analytics/useDatePickerFilters"
import Trends from "@app-pushapp/views/dashboards/event/Trends.vue"
import SessionEvents from "@app-pushapp/views/dashboards/event/SessionEvents.vue"
import EventDevices from "@app-pushapp/views/dashboards/event/EventDevices.vue"
import EventGeo from "@app-pushapp/views/dashboards/event/EventGeo.vue"
import EventProperty from "@app-pushapp/views/dashboards/event/EventProperty.vue"

const eventStore = useEventStore()
const { customPlugin } = useDatePickerFilters()

const cohortsStore = useCohortsStore()
const selectedCohort = ref(null)

const selectedEvent = ref(null)
const cohortOptions = ['All']
const analyticsType = ref('Snap') 
const options = ['Snap', 'Trends', 'Sessions', 'Property', "Geo's", 'Devices']

const selectedTrend = ref(null)
const trendOptions = ['Time of Day', 'Events over period', 'Users over period']

const selectedSession = ref(null)
const sessionOptions = ['Time To', 'Pages To']

// Date Logic: Default last 7 days
const tonight = new Date().setHours(23, 59, 59, 999)
const formatDate = (date) => date.toLocaleDateString("en-GB").split("/").join("-")
const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 6))
const dateRange = ref(`${formatDate(sevenDaysAgo)} to ${formatDate(new Date())}`)

const optionIcons = {
  Snap: 'tabler-bolt',
  Trends: 'tabler-trending-up',
  Sessions: 'tabler-clock',
  Property: 'tabler-adjustments',
  "Geo's": 'tabler-map-pin',
  Devices: 'tabler-device-mobile'
}

const formattedEventList = computed(() => {
  return eventStore.uniqueEvents
    .map(event => ({
      title: event.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
      value: event
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
})

const formattedCohortList = computed(() => {
  return cohortsStore.cohorts
    .map(c => ({ title: c.name, value: c._id }))
    .sort((a, b) => a.title.localeCompare(b.title))
})

// sessions cant have event options- app_open and page_open
const sessionFilteredEvents = computed(() => {
  if (analyticsType.value === 'Sessions') {
    return formattedEventList.value.filter(e => 
      e.value !== 'app_open' && e.value !== 'page_open'
    )
  }
  return formattedEventList.value
})

watch(analyticsType, (newType) => {
  if (newType === 'Sessions') {
    const invalidEvents = ['app_open', 'page_open'];
    if (invalidEvents.includes(selectedEvent.value)) {
      selectedEvent.value = null; 
    }
  }
})

watch([selectedEvent, analyticsType], () => {
  if (analyticsType.value === 'Snap') {
    getStats()
  }
})

const snapStatistics = computed(() => [
  { 
    title: 'Events', 
    stats: String(eventStore.eventStats.total_events || 0), 
    icon: 'tabler-click', 
    color: 'primary' 
  },
  { 
    title: 'Unique Users', 
    stats: String(eventStore.eventStats.unique_users || 0), 
    icon: 'tabler-users', 
    color: 'success' 
  },
])

const getStats = async () => {
  if (!selectedEvent.value || analyticsType.value !== 'Snap') return

  const parts = dateRange.value.split(" to ")
  const [sD, sM, sY] = parts[0].split("-").map(Number)
  const [eD, eM, eY] = (parts[1] || parts[0]).split("-").map(Number)
  
  const startTs = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime()
  const endTs = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime()
  const timezone = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asia/Kolkata"

  await eventStore.fetchEventStats({
    event_name: selectedEvent.value,
    dateRange1: startTs,
    dateRange2: endTs,
    timezone,
    cohortId: selectedCohort.value
  })
}

const onDateClosed = (selectedDates, dateStr) => {
  if (selectedDates.length === 2) {
    dateRange.value = dateStr
    getStats()
  }
}

const isSessionDisabled = computed(() => ['app_open', 'page_open'].includes(selectedEvent.value))

onMounted(async () => {
  await eventStore.fetchUniqueEvents()

  const res = await cohortsStore.fetchCohorts({  paginate: false  })
  cohortsStore.cohorts = res.data.results
})

watch([selectedEvent, analyticsType,selectedCohort], () => {
  getStats()
})
</script>

<template>
  <VRow class="match-height">
    <VCol cols="12">
      <div class="d-flex align-center justify-space-between flex-wrap gap-4">
        <h3 class="text-h5">Event Analytics</h3>
        
        <div class="d-flex gap-4 align-center flex-wrap">
          <VSelect
            v-model="selectedEvent"
            :items="sessionFilteredEvents"
            label="Event"
            placeholder="Choose an event"
            density="compact"
            style="min-width: 250px;"
          />

          <VSelect
            v-model="selectedCohort"
            :items="formattedCohortList"
            label="Cohort"
            placeholder="All"
            density="compact"
            clearable
            style="min-width: 200px;"
          />

          <AppDateTimePicker
            v-model="dateRange"
            style="width: 280px"
            prepend-inner-icon="tabler-calendar"
            :config="{ 
              mode: 'range', 
              dateFormat: 'd-m-Y', 
              maxDate: tonight, 
              onClose: onDateClosed, 
              plugins: [customPlugin] 
            }"
          />
        </div>
      </div>
    </VCol>

    <VCol cols="12">
      <VBtnToggle v-slot="{ isSelected, toggle }" v-model="analyticsType" color="primary" variant="text" mandatory class="gap-2">
        <template v-for="option in options" :key="option">
          
          <VBtn 
            v-if="!['Trends', 'Sessions'].includes(option)" 
            :value="option" 
            :prepend-icon="optionIcons[option]"
            rounded="lg"
          >
            {{ option }}
          </VBtn>

          <VBtn 
            v-else-if="option === 'Trends'" 
            :value="option" 
            :prepend-icon="optionIcons[option]"
            append-icon="tabler-chevron-down"
            rounded="lg"
          >
            Trends
            
            <VMenu activator="parent" transition="scale-transition" open-on-hover>
              <VList>
                <VListItem 
                  v-for="trend in trendOptions" 
                  :key="trend" 
                  @click="selectedTrend = trend; analyticsType = 'Trends'"
                >
                  <VListItemTitle>{{ trend }}</VListItemTitle>
                </VListItem>
              </VList>
            </VMenu>
          </VBtn>

          <VBtn 
            v-else-if="option === 'Sessions'" 
            :value="option" 
            :disabled="['app_open', 'page_open'].includes(selectedEvent)"
            :prepend-icon="optionIcons[option]"
            append-icon="tabler-chevron-down"
            rounded="lg"
            style="pointer-events: auto;"
          >
            Sessions

            <VTooltip
              v-if="['app_open', 'page_open'].includes(selectedEvent)"
              activator="parent"
              location="top"
            >
              Session analytics are not available for App Open or Page Open events
            </VTooltip>

            <VMenu 
              v-if="!['app_open', 'page_open'].includes(selectedEvent)" 
              activator="parent" 
              transition="scale-transition" 
              open-on-hover
            >
              <VList>
                <VListItem 
                  v-for="session in sessionOptions" 
                  :key="session" 
                  @click="selectedSession = session; analyticsType = 'Sessions'"
                >
                  <VListItemTitle>{{ session }}</VListItemTitle>
                </VListItem>
              </VList>
            </VMenu>
          </VBtn>

        </template>
      </VBtnToggle>
    </VCol>

    <VCol cols="12">
        <VRow v-if="analyticsType === 'Snap'">
            <VCol cols="12" md="6">
              <CardStatisticsTransactions
                  :statistics="snapStatistics"
                  title="Snap Overview"
              />
            </VCol>
        </VRow>

        <VRow v-else-if="analyticsType === 'Trends'">
          <VCol cols="12">
            <Trends 
              :event="selectedEvent" 
              :dateRange="dateRange" 
              :selectedTrend="selectedTrend"
              :cohortId="selectedCohort"
            />
          </VCol>
        </VRow>

        <VRow v-else-if="analyticsType === 'Sessions'">
          <VCol cols="12">
            <SessionEvents
              :event="selectedEvent" 
              :dateRange="dateRange" 
              :selectedSession="selectedSession"
              :cohortId="selectedCohort"
            />
          </VCol>
        </VRow>

        <VRow v-else-if="analyticsType === 'Devices'">
          <VCol cols="12">
            <EventDevices
              :event="selectedEvent" 
              :dateRange="dateRange" 
              :cohortId="selectedCohort"
            />
          </VCol>
        </VRow>

        <VRow v-else-if="analyticsType === 'Property'">
          <VCol cols="12">
            <EventProperty
              :event="selectedEvent" 
              :dateRange="dateRange" 
              :cohortId="selectedCohort"
            />
          </VCol>
        </VRow>
        
        <VRow v-else-if="analyticsType === 'Geo\'s'">
          <VCol cols="12">
            <EventGeo
              :event="selectedEvent" 
              :dateRange="dateRange" 
              :cohortId="selectedCohort"
            />
          </VCol>
        </VRow>

        <VCard v-else class="text-center pa-12">
            <VCardText class="text-h6 text-disabled">
            {{ analyticsType }} view coming soon
            </VCardText>
        </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.border-dashed {
  border: 2px dashed rgba(var(--v-border-color), 0.3);
}
</style>