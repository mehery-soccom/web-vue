<script setup>
import { ref, reactive, inject, onMounted, computed } from 'vue'
import debounce from 'lodash/debounce'
import { useFeedbackStore } from '@/app-tikat/views/admin/feedback/useFeedbackStore'
import { useStatusStore } from '@/app-tikat/views/setup/status/useStatusStore'
import { useRouter } from 'vue-router'
import * as XLSX from "xlsx"
import { useRoute } from 'vue-router'
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue"
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters"

const route = useRoute()
const { show } = inject('snackbar')
const feedbackStore = useFeedbackStore()
const { customPlugin } = useDatePickerFilters()
const router = useRouter()
const statusStore = useStatusStore()
const statusOptions = ref(['OPEN'])

const selectedFeedbacks = ref([])
const isAssignModalVisible = ref(false)
const isAgentLoading = ref(false)
const isAssigning = ref(false)
const allAgents = ref([])
const selectedAgentId = ref(null)
const isFilterMenuVisible = ref(false)
const byUser = window.CONST?.USER?.code || null

const isLoading = ref(false)
const feedbacks = ref([])
const lastFetchParams = ref({})

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    title: null,
    description: null,
    'creator.code': null,
    'recipient.name': null,
    status: null,
  },
})
const today = new Date()
const tonight = new Date()
tonight.setHours(23, 59, 59, 999)

const oneWeekAgo = new Date()
oneWeekAgo.setDate(oneWeekAgo.getDate() - 6)

const formattedStart = oneWeekAgo.toLocaleDateString("en-GB").split("/").join("-")
const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-")
const dateRange = ref(`${formattedStart} to ${formattedEnd}`)
const selectedDateObjects = ref([oneWeekAgo, tonight])

const userRoles = window.CONST?.USER?.role || []
// const canAssign = !userRoles.includes('MODERATOR') && !userRoles.includes('USER')

const headers = computed(() => {
  const list = [
    { title: 'Name', key: 'recipient.name', sortable: true },
    { title: 'Title', key: 'title', sortable: true },
    { title: 'Description', key: 'description', sortable: true },
    { title: 'Agent', key: 'creator.code', sortable: true },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'Start Time', key: 'startDate', sortable: true },
  ]
  // if (canAssign) list.unshift({ key: 'data-table-select', sortable: false })
  return list
})

const fetchFollowUps = async (options = pagination) => {
  isLoading.value = true
  try {
    const [start, end] = selectedDateObjects.value
    const startTs = new Date(start).setHours(0, 0, 0, 0)
    const endTs = new Date(end).setHours(23, 59, 59, 999)

    const activeFilters = {}
    
    for (const key in options.filters) {
      if (options.filters[key] !== null && options.filters[key] !== undefined) {
        // if (key === 'rating') continue;
        activeFilters[key] = options.filters[key]
      }
    }

    // if (userRoles.includes('MODERATOR') || userRoles.includes('USER')) {
    //   activeFilters['creator.code'] = byUser
    // }

    const apiParams = {
      pageNo: options.page,
      pageSize: options.itemsPerPage,
      dateRange1: startTs,
      dateRange2: endTs,
      search: activeFilters,
    }

    if (options.sortBy?.length > 0) {
      const sortItem = options.sortBy[0]
      apiParams.sort = `${sortItem.order === 'desc' ? '-' : ''}${sortItem.key}`
    }

    const response = await feedbackStore.fetchFollowUps(apiParams)
    feedbacks.value = response.results || []
    pagination.itemsLength = response.pagination?.total || 0
  } catch (error) {
    show({ message: 'Failed to load feedbacks.', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const fetchStatusOptions = async () => {
  try {
    const response = await statusStore.fetchStatuses({ flavour: 'feedback' })
    const apiStatuses = (response.results || [])
      .filter(s => s.isActive)
      .map(s => s.label)

    statusOptions.value = [...new Set(['OPEN', ...apiStatuses])]
  } catch (error) {
    console.error("Failed to load status options", error)
  }
}

const onUpdateOptions = (options) => {
  pagination.page = options.page
  pagination.itemsPerPage = options.itemsPerPage
  pagination.sortBy = options.sortBy
  pagination.filters = {
    ...pagination.filters,
    ...(options.filters || {})
  }
  fetchFollowUps(pagination)
}
const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300)

const fetchAgentOptions = async () => {
  isAgentLoading.value = true
  try {
    const response = await feedbackStore.fetchAgents()
    allAgents.value = Array.isArray(response.results) ? response.results : []
  } catch (error) {
    show({ message: 'Could not load agents.', color: 'error' })
  } finally {
    isAgentLoading.value = false
  }
}

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 2) {
    selectedDateObjects.value = selectedDates
    pagination.page = 1
    fetchFollowUps(pagination)
  }
}
const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const handleRowClick = (event, { item }) => {
  const id = item?.raw?.recipient?.extId || item?.recipient?.extId;
  
  if (id) {
    router.push({ 
      name: 'admin-feedbacks-add-id?', 
      params: { id: id } 
    })
  }
}

const openChat = (rawItem) => {
  const contact = rawItem.contact || {};
  const name = contact.name || '';
  const number = contact.phone || '';
  const email = contact.email || '';

  const codeSuffix = Math.floor(1000 + Math.random() * 9000);
  const code = name 
    ? `${name.toLowerCase().replace(/\s+/g, '')}${codeSuffix}` 
    : `guest${codeSuffix}`;

  if (!email && !number) {
    show({ message: 'Cannot initiate chat. Email or phone number is required.', color: 'error' });
    return;
  }

  let paramString = `code=${code};source=FEEDBACK_MGMT;`;
  if (name) paramString += `name=${name};`;
  if (number) paramString += `number=${number};`;
  if (email) paramString += `email=${email};`;

  const encodedParams = btoa(paramString);
  const url = `/agent/app/home/CHATBOX/chat_to_customer/${encodedParams}`;
  window.open(url, '_blank');
}

onMounted(() => {
  if (route.query.formTitle) {
    pagination.filters['form.title'] = route.query.formTitle
  }
  
  // fetchFollowUps()
  fetchAgentOptions()
  fetchStatusOptions()
})

</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">Tasks</h5>
      <VSpacer />
      <div class="d-flex align-center gap-4">
          <VBtn
              icon
              @click="() => fetchFollowUps(pagination)"
              :loading="isLoading"
              variant="text"
              aria-label="Refresh Tasks"
          >
              <VIcon>tabler-refresh</VIcon>
          </VBtn>

          <AppDateTimePicker
              style="width: 260px;"
              v-model="dateRange"
              prepend-inner-icon="tabler-calendar"
              :config="{
                  mode: 'range',
                  dateFormat: 'd-m-Y',
                  maxDate: tonight,
                  position: 'auto right',
                  onClose: onDateClosed,
                  plugins: [customPlugin],
              }"
              placeholder="Select Date Range"
          />
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable
      v-model="selectedFeedbacks"
      :headers="headers"
      :items="feedbacks"
      :loading="isLoading"
      :server-side="true"
      item-value="_id"
      hover
      @update:options="onUpdateOptionsDebounced"
      @click:row="handleRowClick"
      v-bind="pagination"
    >

      <template #item.recipient.name="{ item }">
        <div class="d-flex flex-column">
          <span class="font-weight-medium"> {{ item.raw.recipient?.name || '-' }} </span>
        </div>
      </template>

      <template #item.title="{ item }">
        <div class="d-flex align-center">
          <span class="font-weight-bold" :title="item.raw.title">{{ item.raw.title || '-' }}</span>
        </div>
      </template>

       <template #item.description="{ item }">
        <span class="text-truncate" style="max-width: 200px; display: inline-block;" :title="item.raw.description">
            {{ item.raw.description || '-' }}
        </span>
      </template>

      <template #item.startDate="{ item }">
        {{ formatDate(item.raw.startDate) }}, {{ formatTime(item.raw.startDate) }}
      </template>

      <template #item.creator.code="{ item }">
        {{ item.raw.creator?.code || item.raw.creator?.name || '-' }}
      </template>
    </MyDataTable>
  </VCard>
</template>

<style scoped>
:deep(tbody tr) { cursor: pointer; }
</style>