<script setup>
import { ref, reactive, inject, onMounted, computed } from 'vue'
import debounce from 'lodash/debounce'
import { useLeadsStore } from '@/app-lead/views/admin/leads/useLeadsStore'
import { useRouter } from 'vue-router'

const { show } = inject('snackbar')
const leadsStore = useLeadsStore()
const router = useRouter()

const selectedLeads = ref([])
const isAssignModalVisible = ref(false)
const isAgentLoading = ref(false)
const isAssigning = ref(false)
const allAgents = ref([])
const selectedAgentId = ref(null)
const byUser = window.CONST?.USER?.user || null

const isLoading = ref(false)
const leads = ref([])
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    name: null,
    form: null,
    source: null,
    assignedTo: null,
  },
})

const userRoles = window.CONST?.USER?.role || []
const canAssign = !userRoles.includes('MODERATOR') && !userRoles.includes('USER')

const headers = computed(() => {
  const list = [
    { title: 'Name', key: 'name', sortable: true },
    { title: 'Stage', key: 'stage', sortable: false },
    { title: 'Form', key: 'form', sortable: true }, 
    { title: 'Campaign', key: 'source', sortable: true },
    { title: 'Assigned Agent', key: 'assignedTo', sortable: true },
    { title: 'Closing Date', key: 'closingDate', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false, align: 'center' },
  ]
  
  if (canAssign) {
    list.unshift({ key: 'data-table-select', sortable: false })
  }

  return list
})

const fetchLeads = async (options = pagination) => {
  isLoading.value = true
  try {
    const activeFilters = {}
    
    if (options.filters.name) activeFilters['contact.name'] = options.filters.name
    if (options.filters.stage) activeFilters['leadHistory.stagetitle'] = options.filters.stage
    if (options.filters.form) activeFilters['form.title'] = options.filters.form
    if (options.filters.source) activeFilters['source'] = options.filters.source
    if (options.filters.assignedTo) activeFilters['assignedTo'] = options.filters.assignedTo

    const userRoles = window.CONST?.USER?.role || []
    if (userRoles.includes('MODERATOR') || userRoles.includes('USER')) {
      activeFilters['assignedTo'] = byUser 
    }

    const apiParams = {
      pageNo: options.page,
      pageSize: options.itemsPerPage,
      search: activeFilters,
    }
    if (options.sortBy && options.sortBy.length > 0) {
      const sortItem = options.sortBy[0];
      const sortKey = sortItem.key === 'name' ? 'contact.name' : sortItem.key;
      apiParams.sort = `${sortItem.order === 'desc' ? '-' : ''}${sortKey}`;
    }

    const response = await leadsStore.fetchLeads(apiParams)
    leads.value = response.results
    pagination.itemsLength = response.pagination?.total || 0
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Something went wrong while fetching leads.'
    show({ message: errorMessage, color: 'error' })
    leads.value = []
    pagination.itemsLength = 0
  } finally {
    isLoading.value = false
  }
}

const onUpdateOptions = (options) => {
  pagination.page = options.page
  pagination.itemsPerPage = options.itemsPerPage
  pagination.sortBy = options.sortBy
  pagination.filters = options.filters || {}
  fetchLeads(pagination)
}
const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300)

const deleteLead = async (id) => {
  isLoading.value = true
  try {
    await leadsStore.deleteLead({ id })
    await fetchLeads(pagination)
    show({ message: 'Lead deleted successfully', color: 'success' })
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to delete lead'
    show({ message: errorMessage, color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const getCurrentStage = (lead) => {
  if (Array.isArray(lead.leadHistory) && lead.leadHistory.length > 0) {
    return lead.leadHistory[lead.leadHistory.length - 1].stagetitle
  }
  return 'N/A'
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '-'
    return date.toISOString().split('T')[0]
  } catch {
    return '-'
  }
}

const handleRowClick = (event, { item }) => {
  if (item?.raw?._id) {
    router.push({
      name: 'admin-leads-add-id?',
      params: { id: item.raw._id },
      query: { showProgress: 'true' },
    })
  }
}

const fetchAgentOptions = async () => {
  isAgentLoading.value = true
  try {
    const response = await leadsStore.fetchAgents()
    allAgents.value = Array.isArray(response.results) ? response.results : []
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Could not load agents.'
    show({ message: errorMessage, color: 'error' })
  } finally {
    isAgentLoading.value = false
  }
}

const filteredAgents = computed(() => {
  if (!allAgents.value) return []
  return allAgents.value
    .filter(agent => agent.admin === true || agent.moderator === true)
    .sort((a, b) => a.name.localeCompare(b.name))
})

const closeAssignModal = () => {
  isAssignModalVisible.value = false
  selectedAgentId.value = null
}

const handleAssign = async () => {
  if (!selectedAgentId.value || selectedLeads.value.length === 0) return

  isAssigning.value = true
  try {
    const selectedAgent = allAgents.value.find(a => a.id === selectedAgentId.value)
    if (!selectedAgent) {
      throw new Error('Selected agent not found.')
    }

    const payload = {
      leadIds: selectedLeads.value,
      assignedTo: selectedAgent.code,
      byUser: byUser,
    }

    await leadsStore.assignLead(payload)
    show({ message: 'Leads assigned successfully!', color: 'success' })
    
    closeAssignModal()
    selectedLeads.value = []
    fetchLeads(pagination)

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to assign leads.'
    show({ message: errorMessage, color: 'error' })
  } finally {
    isAssigning.value = false
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

  let paramString = `code=${code};source=LEAD_MGMT;`;
  if (name) paramString += `name=${name};`;
  if (number) paramString += `number=${number};`;
  if (email) paramString += `email=${email};`;
  console.log('Chat Params:', paramString);

  const encodedParams = btoa(paramString);
  
  const url = `/agent/app/home/CHATBOX/chat_to_customer/${encodedParams}`;
  window.open(url, '_blank');
}

onMounted(() => {
//   fetchLeads()
  fetchAgentOptions()
})
</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">Leads</h5>
      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          icon
          @click="() => fetchLeads(pagination)"
          :loading="isLoading"
          variant="text"
          aria-label="Refresh Leads"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>

        <VDialog v-if="canAssign" v-model="isAssignModalVisible" max-width="500px" persistent>
          <template #activator="{ props }">
            <VBtn
              v-bind="props"
              prepend-icon="tabler-user-check"
              :disabled="selectedLeads.length === 0"
              variant="tonal"
            >
              Assign ({{ selectedLeads.length }})
            </VBtn>
          </template>

          <VCard>
            <VCardTitle class="py-4">
              Assign Selected Leads
            </VCardTitle>
    
            <VDivider />

            <VCardText class="py-4">
              <p class="mb-4">
                Assign
                <span class="font-weight-bold text-primary">{{ selectedLeads.length }}</span>
                {{ selectedLeads.length === 1 ? 'lead' : 'leads' }} to:
              </p>
    
              <AppSelect
                v-model="selectedAgentId"
                :items="filteredAgents"
                item-title="name"
                item-value="id"
                :loading="isAgentLoading"
                variant="outlined"
                density="compact"
                clearable
              />
            </VCardText>
            
            <VDivider />
    
            <VCardActions class="pa-4">
              <VSpacer />
              <VBtn
                variant="tonal"
                color="secondary"
                @click="closeAssignModal"
                :disabled="isAssigning"
              >
                Cancel
              </VBtn>
              <VBtn
                color="primary"
                :loading="isAssigning"
                :disabled="!selectedAgentId"
                @click="handleAssign"
                class="ml-3"
              >
                Assign
              </VBtn>
            </VCardActions>
          </VCard>
        </VDialog>

        <VBtn
          prepend-icon="tabler-plus"
          :to="{ name: 'admin-leads-add-id?', params: { id: 'add' } }"
        >
          Create Lead
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable
      :headers="headers"
      :items="leads"
      :loading="isLoading"
      v-bind="pagination"
      class="text-no-wrap"
      :server-side="true"
      @update:options="onUpdateOptionsDebounced"
      @click:row="handleRowClick"
      :show-select="canAssign"
      hover
      v-model="selectedLeads"
      show-select
      item-value="_id"
    >
      <template #item.name="{ item }">
        <div class="d-flex flex-column">
          <span class="font-weight-medium">{{ item.raw.contact?.name || '-' }}</span>
        </div>
      </template>

      <template #item.stage="{ item }">
        {{ getCurrentStage(item.raw) }}
      </template>

      <template #item.form="{ item }">
        {{ item.raw.form?.title || '-' }}
      </template>

      <template #item.source="{ item }">
        <span class="text-capitalize">{{ item.raw.source || 'Manual' }}</span>
      </template>

      <template #item.assignedTo="{ item }">
        {{ item.raw.assignedTo || '-' }}
      </template>

      <template #item.closingDate="{ item }">
        {{ formatDate(item.raw.closingDate) }}
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
          <VIcon icon="tabler-trash" />
          <VDialog activator="parent" max-width="400">
            <template #default="{ isActive }">
              <VCard title="Confirm Deletion" text="Are you sure you want to delete this lead?">
                <template #actions>
                  <VSpacer />
                  <VBtn text @click="isActive.value = false">Cancel</VBtn>
                  <VBtn
                    color="error"
                    variant="tonal"
                    :loading="isLoading"
                    @click="() => { deleteLead(item.raw._id); isActive.value = false }"
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
:deep(tbody tr) {
  cursor: pointer;
}
</style>
