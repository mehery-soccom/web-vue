<script setup>
import { ref, reactive, inject, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import debounce from 'lodash/debounce'
import { useTaskStore } from '@/app-lead/views/admin/tasks/useTasksStore.js'
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue"
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters"

const { show } = inject('snackbar')
const taskStore = useTaskStore()
const router = useRouter()
const { customPlugin } = useDatePickerFilters()

const isLoading = ref(false)
const tasks = ref([])
const byUser = window.CONST?.USER?.user || null
const userRoles = window.CONST?.USER?.role || []

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    title: null, 
    name: null,
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

const headers = computed(() => [
  { title: 'Subject', key: 'title', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Date and Time', key: 'startDate', sortable: true },
  { title: 'Contact Name', key: 'name', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' },
])

const fetchTasks = async (options = pagination) => {
  isLoading.value = true
  try {
    const [start, end] = selectedDateObjects.value
    const startTs = new Date(start).setHours(0, 0, 0, 0)
    const endTs = new Date(end).setHours(23, 59, 59, 999)

    const activeFilters = {}
    
    if (options.filters.name) {
      activeFilters['contact.name'] = options.filters.name
    }
    if (options.filters.title) {
      activeFilters['title'] = options.filters.title
    }

    if (userRoles.includes('MODERATOR') || userRoles.includes('AGENT')) {
      activeFilters['assignedTo'] = byUser 
    }

    const apiParams = {
      pageNo: options.page,
      pageSize: options.itemsPerPage,
      dateRange1: startTs,
      dateRange2: endTs,
      search: activeFilters,
    }

    if (options.sortBy && options.sortBy.length > 0) {
      const sortItem = options.sortBy[0];
      const sortKey = sortItem.key === 'name' ? 'contact.name' : sortItem.key;
      apiParams.sort = `${sortItem.order === 'desc' ? '-' : ''}${sortKey}`;
    }

    const response = await taskStore.fetchTasks(apiParams)
    
    tasks.value = Array.isArray(response.results) ? response.results : []
    pagination.itemsLength = response.pagination?.total || 0

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Something went wrong while fetching tasks.'
    show({ message: errorMessage, color: 'error' })
    tasks.value = []
    pagination.itemsLength = 0
  } finally {
    isLoading.value = false
  }
}

const onUpdateOptions = (options) => {
  pagination.page = options.page
  pagination.itemsPerPage = options.itemsPerPage
  pagination.sortBy = options.sortBy
  fetchTasks(pagination)
}

const onSearchUpdate = debounce(() => {
  pagination.page = 1
  fetchTasks(pagination)
}, 500)

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 2) {
    selectedDateObjects.value = selectedDates
    pagination.page = 1
    fetchTasks(pagination)
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
    const leadId = item.raw.recipient?.leadId || item.raw.lead?._id
    if (leadId) {
        router.push({
            name: 'admin-leads-add-id?',
            params: { id: leadId },
            query: { showProgress: 'true' },
        })
    }
}

const openChat = (rawItem) => {
  const contact = rawItem.lead?.contact || {};
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

  let paramString = `code=${code};source=LEAD_MGMT;`;
  if (name) paramString += `name=${name};`;
  if (number) paramString += `number=${number};`;
  if (email) paramString += `email=${email};`;

  const encodedParams = btoa(paramString);
  const url = `/agent/app/home/CHATBOX/chat_to_customer/${encodedParams}`;
  window.open(url, '_blank');
}

onMounted(() => {
  fetchTasks()
})
</script>

<template>
  <VCard>
    <VCardText>
        <div class="d-flex align-center flex-wrap gap-4 mb-4">
            <h5 class="text-h5">Tasks</h5>
            <VSpacer />
            
            <div class="d-flex align-center gap-4">
                <VBtn
                    icon
                    @click="() => fetchTasks(pagination)"
                    :loading="isLoading"
                    variant="text"
                    aria-label="Refresh Tasks"
                >
                    <VIcon>tabler-refresh</VIcon>
                </VBtn>

                <AppDateTimePicker
                    style="width: 240px;"
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
        </div>
    </VCardText>

    <VDivider />

    <MyDataTable
      :headers="headers"
      :items="tasks"
      :loading="isLoading"
      v-bind="pagination"
      :server-side="true"
      @update:options="onUpdateOptions"
      class="text-no-wrap"
      @click:row="handleRowClick"
      hover
      item-value="_id"
    >
      <template #item.name="{ item }">
        <div class="d-flex flex-column">
          <span class="font-weight-medium">
             {{ item.raw.lead?.contact?.name || '-' }}
          </span>
        </div>
      </template>

      <template #item.title="{ item }">
        <span class="font-weight-medium">{{ item.raw.title || '-' }}</span>
      </template>

       <template #item.description="{ item }">
        <span class="text-truncate" style="max-width: 200px; display: inline-block;" :title="item.raw.description">
            {{ item.raw.description || '-' }}
        </span>
      </template>

      <template #item.startDate="{ item }">
        <span class="text-no-wrap font-weight-medium">
            {{ formatDate(item.raw.startDate) }},
            {{ formatTime(item.raw.startDate) }}
        </span>
    </template>

      <template #item.actions="{ item }">
        <IconBtn 
          @click.stop="openChat(item.raw)"
          :disabled="!item.raw.lead?.contact?.phone && !item.raw.lead?.contact?.email"
        >
          <VIcon icon="tabler-message-circle" />
          <VTooltip activator="parent" location="top">
            Chat
          </VTooltip>
        </IconBtn>
      </template>
    </MyDataTable>
  </VCard>
</template>

<style scoped>
:deep(tbody tr) {
  cursor: pointer;
}
</style>