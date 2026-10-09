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
import { dotColor } from "@app-pushapp/views/config/event-master/eventMaster"

const eventStore = useEventStore()
const route = useRoute()
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

// Value stays the event key, so every stats call and tab below is unchanged; only the label shown differs.
const formattedEventList = computed(() => {
  return eventStore.eventOptions
    .map(event => ({
      title: event.displayLabel,
      value: event.eventName,
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
})

// Search matches the label or the event key
const eventFilter = (_value, query, item) => {
  const q = (query || '').toLowerCase()
  return item.raw.title.toLowerCase().includes(q) || item.raw.value.toLowerCase().includes(q)
}

const selectedEventOption = computed(() => formattedEventList.value.find(e => e.value === selectedEvent.value))

// On focus Vuetify fills the search with the selected label; select it so typing starts a fresh search.
const selectSearchText = (e) => setTimeout(() => e?.target?.select?.(), 0)

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

// watch([selectedEvent, analyticsType], () => {
//   if (analyticsType.value === 'Snap') {
//     getStats()
//   }
// })

const snapStatistics = computed(() => {
  // Return zeros if no event is currently selected
  if (!selectedEvent.value) {
    return [
      { title: 'Events', stats: '0', icon: 'tabler-click', color: 'primary' },
      { title: 'Unique Users', stats: '0', icon: 'tabler-users', color: 'success' }
    ]
  }
  
  return [
    { 
      title: 'Events', 
      stats: (eventStore.eventStats.total_events || 0).toLocaleString("en-IN"), 
      icon: 'tabler-click', 
      color: 'primary' 
    },
    { 
      title: 'Unique Users', 
      stats: (eventStore.eventStats.unique_users || 0).toLocaleString("en-IN"), 
      icon: 'tabler-users', 
      color: 'success' 
    },
  ]
})

const isSnapLoading = ref(false)

const getStats = async () => {
  if (!selectedEvent.value || analyticsType.value !== 'Snap') return

  const parts = dateRange.value.split(" to ")
  const [sD, sM, sY] = parts[0].split("-").map(Number)
  const [eD, eM, eY] = (parts[1] || parts[0]).split("-").map(Number)
  
  const startTs = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime()
  const endTs = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime()
  const timezone = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asia/Kolkata"

  try {
    isSnapLoading.value = true
    await eventStore.fetchEventStats({
      event_name: selectedEvent.value,
      dateRange1: startTs,
      dateRange2: endTs,
      timezone,
      cohortId: selectedCohort.value
    })
  } finally {
    isSnapLoading.value = false
  }
}

const onDateClosed = (selectedDates, dateStr) => {
  if (selectedDates.length === 2) {
    dateRange.value = dateStr
    getStats()
  }
}

const isSessionDisabled = computed(() => ['app_open', 'page_open'].includes(selectedEvent.value))

onMounted(async () => {
  await eventStore.fetchEventOptions()
  // Deep link from Event Master: /dashboards/events?event=<eventName> preselects it (default date range)
  if (route.query.event) selectedEvent.value = String(route.query.event)

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
          <VAutocomplete
            v-model="selectedEvent"
            :items="sessionFilteredEvents"
            :custom-filter="eventFilter"
            :menu-props="{ contentClass: 'event-picker-menu' }"
            label="Event"
            variant="outlined"
            placeholder="Search event label or internal key"
            density="compact"
            class="event-picker"
            @focus="selectSearchText"
            style="min-width: 360px; max-width: 460px;"
          >
            <!-- Label keeps priority; the key shrinks first and ends in "…" instead of being clipped. Hover shows both. -->
            <template #selection>
              <span
                v-if="selectedEventOption"
                class="event-selection"
                :title="selectedEventOption.title !== selectedEventOption.value ? `${selectedEventOption.title} (${selectedEventOption.value})` : selectedEventOption.title"
              >
                <span class="event-dot" :style="{ background: dotColor(selectedEventOption.value) }" />
                <span class="event-selection__label">{{ selectedEventOption.title }}</span>
                <span v-if="selectedEventOption.title !== selectedEventOption.value" class="event-selection__key text-disabled font-mono text-caption">
                  ({{ selectedEventOption.value }})
                </span>
              </span>
            </template>
            <template #item="{ props, item }">
              <VListItem v-bind="props" :title="undefined" class="event-option">
                <template #prepend>
                  <span class="event-dot me-3" :style="{ background: dotColor(item.raw.value) }" />
                </template>
                <VListItemTitle class="font-weight-bold">{{ item.raw.title }}</VListItemTitle>
                <VListItemSubtitle class="font-mono">{{ item.raw.value }}</VListItemSubtitle>
                <template #append>
                  <VIcon v-if="item.raw.value === selectedEvent" icon="tabler-check" color="primary" size="18" />
                </template>
              </VListItem>
            </template>
            <!-- Pinned to the bottom of the menu so it's visible without scrolling the whole event list -->
            <template #append-item>
              <div class="event-master-cta">
                <VListItem :to="{ path: '/config/event-master/list' }" class="justify-center">
                  <VListItemTitle class="text-primary text-center d-flex align-center justify-center gap-2">
                    <VIcon icon="tabler-settings" size="18" /> Manage event labels in Event Master
                  </VListItemTitle>
                </VListItem>
              </div>
            </template>
          </VAutocomplete>

          <VAutocomplete
            v-model="selectedCohort"
            :items="formattedCohortList"
            label="Cohort"
            variant="outlined"
            placeholder="Select cohort"
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
              <div class="snap-overview-wrap">
                <CardStatisticsTransactions
                    :statistics="snapStatistics"
                    title="Snap Overview"
                />
                <div v-if="isSnapLoading" class="snap-overview-loader">
                  <VProgressCircular indeterminate color="primary" size="40" />
                </div>
              </div>
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
.event-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
/* Closed picker: the selected label/key gets the whole field. The (empty) search input only takes
   space again while the field is focused, i.e. while typing. */
.event-picker :deep(.v-autocomplete__selection) {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}
.event-picker :deep(.v-field:not(.v-field--focused) .v-field__input > input) {
  flex: 0 0 0;
  min-width: 0;
  width: 0;
  padding: 0;
}
.event-selection {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.event-selection__label,
.event-selection__key {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-selection__label {
  flex: 0 1 auto;
}
.event-selection__key {
  flex: 0 100 auto; /* shrinks long before the label does */
}
.event-master-cta {
  position: sticky;
  bottom: 0;
  z-index: 1;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
/* full-bleed row: the theme's list-item margin + radius left a gap around the hover */
.event-master-cta :deep(.v-list-item) {
  margin: 0 !important;
  border-radius: 0 !important;
  min-block-size: 52px;
}
/* separator between event options in the picker */
.event-option {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.snap-overview-wrap {
  position: relative;
}
.snap-overview-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(1px);
  border-radius: inherit;
  z-index: 2;
}
</style>
<style>
/* Event picker menu (teleported, so not reachable from scoped styles): no bottom padding,
   so the pinned "Manage event labels" CTA sits flush with the menu's bottom edge. */
.event-picker-menu .v-list {
  padding-block-end: 0 !important;
}
</style>
