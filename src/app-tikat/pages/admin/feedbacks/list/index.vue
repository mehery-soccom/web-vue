<script setup>
import { ref, reactive, inject, onMounted, computed } from 'vue'
import debounce from 'lodash/debounce'
import { useFeedbackStore } from '@/app-tikat/views/admin/feedback/useFeedbackStore'
import { useStatusStore } from '@/app-tikat/views/setup/status/useStatusStore'
import { useRouter } from 'vue-router'
import * as XLSX from "xlsx"
import { useRoute } from 'vue-router'

const route = useRoute()
const { show } = inject('snackbar')
const feedbackStore = useFeedbackStore()
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
    'contact.name': null,
    'assignee.name': null,
    'form.title': null,
    'response.rating': null,
    'meta.segmentLabel': null,
    status: null,
    closed: null,
    rating: [],
    minScore: null,
    maxScore: null,
  },
})

const userRoles = window.CONST?.USER?.role || []
const canAssign = !userRoles.includes('MODERATOR') && !userRoles.includes('USER')

const headers = computed(() => {
  const list = [
    { title: 'Name', key: 'contact.name', sortable: true },
    { title: 'Form', key: 'form.title', sortable: false },
    { title: 'Rating', key: 'response.rating', sortable: true },
    { title: 'Score', key: 'meta.score', sortable: true },
    { 
      title: 'Category', 
      key: 'meta.segmentLabel', 
      sortable: true,
      filterType: 'select',
      filterOptions: ['Not Satisfied', 'Neutral', 'Satisfied']
    },
    { 
      title: 'Status', 
      key: 'status', 
      sortable: true,
      filterType: 'select',
      filterOptions: statusOptions.value
    },
    { title: 'Assigned To', key: 'assignee.name', sortable: true },
    { 
      title: 'Closed', 
      key: 'closed', 
      sortable: true,
      filterType: 'select',
      filterOptions: [
        { title: 'Yes', value: true },
        { title: 'No', value: false }
      ]
    },
    { title: 'Created', key: 'createdAt', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false, align: 'center' },
  ]
  if (canAssign) list.unshift({ key: 'data-table-select', sortable: false })
  return list
})

const fetchFeedbacks = async (options = pagination) => {
  isLoading.value = true
  try {
    const activeFilters = {}
    
    for (const key in options.filters) {
      if (options.filters[key] !== null && options.filters[key] !== undefined) {
        if (key === 'rating') continue;
        activeFilters[key] = options.filters[key]
      }
    }

    if (userRoles.includes('MODERATOR') || userRoles.includes('USER')) {
      activeFilters['assignee.code'] = byUser
    }

    const apiParams = {
      pageNo: options.page,
      pageSize: options.itemsPerPage,
      search: activeFilters,
      rating: options.filters.rating?.length > 0 ? options.filters.rating.join(',') : undefined,
      minScore: options.filters.minScore || undefined,
      maxScore: options.filters.maxScore || undefined
    }

    if (options.sortBy?.length > 0) {
      const sortItem = options.sortBy[0]
      apiParams.sort = `${sortItem.order === 'desc' ? '-' : ''}${sortItem.key}`
    }
    lastFetchParams.value = {
      search: activeFilters,
      rating: apiParams.rating,
      minScore: apiParams.minScore,
      maxScore: apiParams.maxScore,
    }

    const response = await feedbackStore.fetchFeedbacks(apiParams)
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
  fetchFeedbacks(pagination)
}
const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300)

const closeAssignModal = () => {
  isAssignModalVisible.value = false
  selectedAgentId.value = null
}

const handleAssign = async () => {
  if (!selectedAgentId.value || selectedFeedbacks.value.length === 0) return
  isAssigning.value = true
  try {
    const selectedAgent = allAgents.value.find(a => a._id === selectedAgentId.value)
    
    const payload = {
      assignee: {
        code: selectedAgent.agent_code,
        name: selectedAgent.agent_name
      },
      byUser: byUser || 'system',
      tikatIds: selectedFeedbacks.value,
    }

    await feedbackStore.assignFeedback(payload)
    
    show({ message: 'Feedbacks assigned successfully!', color: 'success' })
    closeAssignModal()
    selectedFeedbacks.value = []
    fetchFeedbacks(pagination)
  } catch (error) {
    console.error("Assignment Error:", error)
    show({ message: 'Failed to assign feedbacks.', color: 'error' })
  } finally {
    isAssigning.value = false
  }
}

const filteredAgents = computed(() => {
  if (!allAgents.value) return []
  return [...allAgents.value]
    .sort((a, b) => (a.agent_name || '').localeCompare(b.agent_name || ''))
})

const deleteFeedback = async (id) => {
  isLoading.value = true
  try {
    await feedbackStore.deleteFeedback(id)
    await fetchFeedbacks(pagination)
    show({ message: 'Feedback deleted successfully', color: 'success' })
  } catch (error) {
    show({ message: 'Failed to delete feedback', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

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

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB')
}

const handleRowClick = (event, { item }) => {
  const id = item?.raw?._id || item?._id;
  
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
  
  // fetchFeedbacks()
  fetchAgentOptions()
  fetchStatusOptions()
})

const exportToExcel = async () => {
  isLoading.value = true
  try {
    const downloadParams = {
      rating: pagination.filters.rating?.length > 0 ? pagination.filters.rating.join(',') : undefined,
      minScore: pagination.filters.minScore || undefined,
      maxScore: pagination.filters.maxScore || undefined,
    }

    const response = await feedbackStore.fetchFeedbacksDownload(downloadParams)
    
    let allData = Array.isArray(response) ? response : (response.results || [])
    
    const searchFilters = lastFetchParams.value?.search || {}
    allData = allData.filter(item => {
      return Object.entries(searchFilters).every(([field, value]) => {
        if (value === null || value === undefined || value === '') return true
        
        const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item)
        
        if (fieldValue === undefined || fieldValue === null) return false
        
        if (typeof fieldValue === 'boolean') {
          return fieldValue === (value === true || value === 'true')
        }
        
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
      })
    })

    if (allData.length === 0) {
      show({ message: 'No data available for selected filters', color: 'warning' })
      return
    }

    const contactKeys = new Set()
    const responseKeys = new Set()
    
    allData.forEach(item => {
      Object.keys(item.contact || {}).forEach(k => contactKeys.add(k))
      Object.keys(item.response || {}).forEach(k => responseKeys.add(k))
    })

    const formattedData = allData.map(item => {
      const row = {
        "Form Title": item.form?.title || '-',
        "Status": item.status || '-',
        "Score": item.meta?.score ? `${item.meta.score}%` : '-',
        "Category": item.meta?.segmentLabel || '-',
        "Date of Feedback": formatDate(item.createdAt),
        "Assigned to": item.assignee?.name || '-',
      }

      contactKeys.forEach(key => {
        const label = key.charAt(0).toUpperCase() + key.slice(1)
        row[label] = item.contact?.[key] || '-'
      })

      responseKeys.forEach(key => {
        const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        row[label] = item.response?.[key] || '-'
      })

      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Feedbacks")
    
    XLSX.writeFile(workbook, `Feedback-Full-Export-${new Date().getTime()}.xlsx`)
  } catch (error) {
    show({ message: 'Failed to prepare download', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">Feedbacks</h5>
      <VSpacer />
      <div class="d-flex align-center flex-wrap gap-2">
        <VBtn icon @click="fetchFeedbacks(pagination)" :loading="isLoading" variant="text">
          <VIcon>tabler-refresh</VIcon>
        </VBtn>

        <VMenu 
          v-model="isFilterMenuVisible" 
          :close-on-content-click="false" 
          location="bottom end"
        >
          <template #activator="{ props }">
            <VBtn icon v-bind="props" variant="text">
              <VIcon :color="(pagination.filters.rating?.length > 0 || pagination.filters.minScore || pagination.filters.maxScore) ? 'primary' : ''">
                tabler-filter
              </VIcon>
              <VTooltip activator="parent" location="top">Filters</VTooltip>
            </VBtn>
          </template>

          <VCard min-width="300">
            <VCardText>
              <AppSelect
                v-model="pagination.filters.rating"
                :items="[1, 2, 3, 4, 5]"
                label="Select Rating"
                multiple
                chips
                class="mb-4"
              />

              <div class="text-subtitle-2 mb-2 text-high-emphasis">Score</div>
              <div class="d-flex gap-2">
                <VTextField
                  v-model="pagination.filters.minScore"
                  label="Min"
                  type="number"
                  density="compact"
                  placeholder="0"
                />
                <VTextField
                  v-model="pagination.filters.maxScore"
                  label="Max"
                  type="number"
                  density="compact"
                  placeholder="100"
                />
              </div>
            </VCardText>

            <VCardActions>
              <VSpacer />
              <VBtn 
                variant="text" 
                color="secondary" 
                size="small" 
                @click="pagination.filters.minScore = null; pagination.filters.maxScore = null; pagination.filters.rating = []"
              >
                Reset
              </VBtn>
              <VBtn 
                color="primary" 
                size="small" 
                @click="() => { fetchFeedbacks(pagination); isFilterMenuVisible = false; }"
              >
                Apply
              </VBtn>
            </VCardActions>
          </VCard>
        </VMenu>

        <VBtn 
          icon 
          @click="exportToExcel" 
          :loading="isLoading" 
          variant="text"
          color="primary"
        >
          <VIcon>tabler-download</VIcon>
          <VTooltip activator="parent" location="top">Download Excel</VTooltip>
        </VBtn>

        <VDialog v-if="canAssign" v-model="isAssignModalVisible" max-width="500px" persistent>
          <template #activator="{ props }">
            <VBtn v-bind="props" prepend-icon="tabler-user-check" :disabled="selectedFeedbacks.length === 0" variant="tonal">
              Assign ({{ selectedFeedbacks.length }})
            </VBtn>
          </template>
          <VCard>
            <VCardTitle class="py-4">Assign Selected Feedbacks</VCardTitle>
            <VDivider />
            <VCardText class="py-4">
              <p class="mb-4">Assign <span class="font-weight-bold text-primary">{{ selectedFeedbacks.length }}</span> feedbacks to:</p>
              <AppSelect
                v-model="selectedAgentId"
                :items="filteredAgents"
                item-title="agent_name"
                item-value="_id"
                :loading="isAgentLoading"
                variant="outlined"
                density="compact"
                clearable
              />
            </VCardText>
            <VDivider />
            <VCardActions class="pa-4">
              <VSpacer />
              <VBtn variant="tonal" color="secondary" @click="closeAssignModal" :disabled="isAssigning">Cancel</VBtn>
              <VBtn color="primary" :loading="isAssigning" :disabled="!selectedAgentId" @click="handleAssign" class="ml-3">Assign</VBtn>
            </VCardActions>
          </VCard>
        </VDialog>

        <VBtn prepend-icon="tabler-plus" :to="{ name: 'admin-feedbacks-add-id?' }">
          Add Feedback
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable
      v-model="selectedFeedbacks"
      :show-select="canAssign"
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

      <template #item.contact.name="{ item }">
        <span class="font-weight-medium">{{ item.raw.contact?.name || '-' }}</span>
      </template>

      <template #item.form.title="{ item }">
        {{ item.raw.form?.title || '-' }}
      </template>

      <template #item.response.rating="{ item }">
        <div class="d-flex align-center">
          <span class="font-weight-bold">{{ item.raw.response?.rating || '-' }}</span>
        </div>
      </template>

      <template #item.meta.score="{ item }">
        <span>{{ item.raw.meta?.score ? `${item.raw.meta.score}%` : '-' }}</span>
      </template>

      <template #item.meta.segmentLabel="{ item }">
        <span>{{ item.raw.meta?.segmentLabel || '-' }}</span>
      </template>

      <template #item.createdAt="{ item }">
        {{ formatDate(item.raw.createdAt) }}
      </template>

      <!-- <template #item.followup>
        <span class="text-disabled">-</span>
      </template> -->

      <template #item.assignee.name="{ item }">
        {{ item.raw.assignee?.name || '-' }}
      </template>

      <template #item.closed="{ item }">
        {{ item.raw.closed ? 'Yes' : 'No' }}
      </template>

      <template #item.status="{ item }">
          {{ item.raw.status || '-' }}
      </template>

      <template #item.actions="{ item }">
        <IconBtn 
          @click.stop="openChat(item.raw)"
          :disabled="!item.raw.contact?.phone && !item.raw.contact?.email"
        >
          <VIcon icon="tabler-message-circle" />
          
          <VTooltip activator="parent" location="top">
            Chat
          </VTooltip>
        </IconBtn>

        <IconBtn @click.stop>
          <VIcon icon="tabler-trash" color="error" />
          
          <VTooltip activator="parent" location="top">
            Delete
          </VTooltip>

          <VDialog activator="parent" max-width="400">
            <template #default="{ isActive }">
              <VCard title="Confirm Deletion" text="Are you sure you want to delete this feedback?">
                <template #actions>
                  <VSpacer />
                  <VBtn variant="text" @click="isActive.value = false">Cancel</VBtn>
                  <VBtn
                    color="error"
                    variant="tonal"
                    :loading="isLoading"
                    @click="() => { deleteFeedback(item.raw._id); isActive.value = false }"
                  >
                    Delete
                  </VBtn>
                </template>
              </VCard>
            </template>
          </VDialog>
        </IconBtn>
      </template>
    </MyDataTable>
  </VCard>
</template>

<style scoped>
:deep(tbody tr) { cursor: pointer; }
</style>