<script setup>
import { ref, reactive, inject } from 'vue'
import debounce from 'lodash/debounce'
import { useLeadsStore } from '@/app-lead/views/admin/leads/useLeadsStore'
import { useRouter } from 'vue-router'

const { show } = inject('snackbar')
const leadsStore = useLeadsStore()
const router = useRouter()

const isLoading = ref(false)
const leads = ref([])
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    name: null,
  },
})

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Stage', key: 'stage', sortable: false },
  { title: 'Campaign', key: 'campaign', sortable: false },
  { title: 'Assigned Agent', key: 'agent', sortable: false },
  { title: 'Closing Date', key: 'closingDate', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' },
]

const fetchLeads = async (options = pagination) => {
  isLoading.value = true
  try {
    const activeFilters = {}
    if (options.filters.name) {
      activeFilters['contact.name'] = options.filters.name
    }
    for (const key in options.filters) {
      if (options.filters[key] && key !== 'name') {
        activeFilters[key] = options.filters[key]
      }
    }
    const apiParams = {
      pageNo: options.page,
      pageSize: options.itemsPerPage,
      search: activeFilters,
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

fetchLeads()
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
          size="small"
          aria-label="Refresh Leads"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
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
      hover
    >
      <template #item.name="{ item }">
        <div class="d-flex flex-column">
          <span class="font-weight-medium">{{ item.raw.contact?.name || '-' }}</span>
        </div>
      </template>

      <template #item.stage="{ item }">
        {{ getCurrentStage(item.raw) }}
      </template>

      <template #item.campaign="{ item }">
        {{ item.raw.form?.title || item.raw.formTitle || '-' }}
      </template>

      <template #item.agent>
        -
      </template>

      <template #item.closingDate="{ item }">
        {{ formatDate(item.raw.closingDate) }}
      </template>

      <template #item.actions="{ item }">
        <IconBtn @click.stop>
          <VIcon icon="tabler-trash" />
          <VDialog activator="parent" max-width="400">
            <template #default="{ isActive }">
              <VCard
                title="Confirm Deletion"
                text="Are you sure you want to delete this lead?"
              >
                <template #actions>
                  <VSpacer />
                  <VBtn text="Cancel" @click="isActive.value = false" />
                  <VBtn
                    color="error"
                    variant="tonal"
                    text="Delete"
                    :loading="isLoading"
                    @click="() => { deleteLead(item.raw._id); isActive.value = false }"
                  />
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
