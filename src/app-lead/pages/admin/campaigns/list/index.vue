<script setup>
import { ref, reactive, inject } from 'vue'
import debounce from 'lodash/debounce'
import { useCampaignStore } from '@/app-lead/views/admin/campaigns/useCampaignStore'

const { show } = inject('snackbar')
const byUser = window.CONST?.USER?.user || null

const campaignStore = useCampaignStore()

const isLoading = ref(false)
const campaigns = ref([])
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    title: null,
  },
})

const headers = [
  { title: 'Campaign', key: 'title' },
  { title: 'Description', key: 'description' },
  { title: 'Form', key: 'form.title' },
  { title: 'Created By', key: 'byUser' },
  { title: 'Status', key: 'isActive' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const copyLink = async (link) => {
  try {
    await navigator.clipboard.writeText(link);
    show({ message: "Link copied to clipboard!", color: "success" });
  } catch (error) {
    console.error("Failed to copy link:", error);
    show({ message: "Failed to copy link.", color: "error" });
  }
};

const fetchCampaigns = async (options = pagination) => {
  isLoading.value = true
  try {
    const activeFilters = {}
    for (const key in options.filters) {
      if (options.filters[key]) activeFilters[key] = options.filters[key]
    }

    const apiParams = {
      pageNo: options.page,
      pageSize: options.itemsPerPage,
      search: activeFilters,
    }

    const response = await campaignStore.fetchCampaigns(apiParams)
    campaigns.value = response.results
    pagination.itemsLength = response.pagination?.total || 0
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message
    if (errorMessage && errorMessage !== 'No campaigns found') {
      show({
        message: errorMessage || 'Something went wrong while fetching campaigns.',
        color: 'error',
      })
    }
    campaigns.value = []
    pagination.itemsLength = 0
  } finally {
    isLoading.value = false
  }
}

const deactivateCampaign = async (id, dialogCloseRef) => {
  isLoading.value = true
  try {
    await campaignStore.deactivateCampaign(id)
    await fetchCampaigns()
    if (dialogCloseRef) dialogCloseRef.value = false
    show({ message: 'Campaign deactivated successfully', color: 'success' })
  } catch (error) {
    console.error('Deactivation failed:', error)
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to deactivate campaign'
    show({ message: errorMessage, color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const onUpdateOptions = (options) => {
  pagination.page = options.page
  pagination.itemsPerPage = options.itemsPerPage
  pagination.sortBy = options.sortBy
  fetchCampaigns(pagination)
}
const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300)

fetchCampaigns()
</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">Campaigns</h5>
      <VSpacer />
      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          icon
          @click="() => fetchCampaigns()"
          :loading="isLoading"
          variant="text"
          size="small"
          aria-label="Refresh Campaigns"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>

        <VBtn prepend-icon="tabler-plus" :to="{ name: 'admin-campaigns-add-id?' }">
          Create Campaign
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable
      :headers="headers"
      :items="campaigns"
      :loading="isLoading"
      :server-side="true"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
    >
      <!-- Status chip -->
      <template #item.isActive="{ item }">
        <VChip :color="item.raw.isActive ? 'success' : 'error'" size="small" label>
          {{ item.raw.isActive ? 'Active' : 'Inactive' }}
        </VChip>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">

        <VTooltip location="top">
          <template #activator="{ props }">
            <IconBtn v-bind="props" @click="copyLink(item.raw.link)">
              <VIcon icon="tabler-link" />
            </IconBtn>
          </template>
          <span>Copy Link</span>
        </VTooltip>

        <IconBtn
          :to="{
            name: 'admin-campaigns-add-id?',
            params: { id: item.raw._id },
          }"
        >
          <VIcon icon="tabler-edit" />
        </IconBtn>

        <IconBtn v-if="item.raw.isActive">
          <VIcon icon="tabler-trash" />
          <VDialog activator="parent" max-width="400">
            <template #default="{ isActive }">
              <VCard
                title="Confirm Deactivation"
                text="Are you sure you want to deactivate this campaign?"
              >
                <template #actions>
                  <VSpacer />
                  <VBtn text="Cancel" @click="isActive.value = false" />
                  <VBtn
                    color="error"
                    variant="tonal"
                    text="Deactivate"
                    :loading="isLoading"
                    @click="deactivateCampaign(item.raw._id, isActive)"
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
