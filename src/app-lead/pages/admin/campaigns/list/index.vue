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
  { title: 'Created By', key: 'createdAt.byUser' },
  { title: 'isActive', key: 'isActive' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const isConfirmDialogOpen = ref(false)
const selectedItem = ref(null)

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

    if (options.sortBy && options.sortBy.length > 0) {
      const sortItem = options.sortBy[0];
      apiParams.sort = `${sortItem.order === 'desc' ? '-' : ''}${sortItem.key}`;
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

const openConfirmDialog = (item) => {
  selectedItem.value = item
  isConfirmDialogOpen.value = true
}

const toggleCampaignStatus = async () => {
  if (!selectedItem.value) return

  isLoading.value = true
  const item = selectedItem.value
  const newStatus = !item.isActive

  try {
    let message = ''
    if (newStatus === false) {
      await campaignStore.deactivateCampaign(item._id, byUser)
      message = 'Campaign deactivated successfully'
    } else {
      const payload = { isActive: true, byUser }
      await campaignStore.updateCampaign({ id: item._id, payload })
      message = 'Campaign activated successfully'
    }

    await fetchCampaigns()
    isConfirmDialogOpen.value = false
    show({ message, color: 'success' })
  } catch (error) {
    console.error('Toggle status failed:', error)
    const action = newStatus ? 'activate' : 'deactivate'
    const errorMessage =
      error.response?.data?.message || error.message || `Failed to ${action} campaign`
    show({ message: errorMessage, color: 'error' })
  } finally {
    isLoading.value = false
    selectedItem.value = null
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
      <template #item.isActive="{ item }">
        <VSwitch
          :model-value="item.raw.isActive"
          readonly
          @click="openConfirmDialog(item.raw)"
        />
      </template>

      <template #item.actions="{ item }">

        <VTooltip location="top">
          <template #activator="{ props }">
            <IconBtn v-bind="props" @click="copyLink(item.raw.link)" :disabled="!item.raw.isActive">
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
      </template>
    </MyDataTable>

    <VDialog v-model="isConfirmDialogOpen" max-width="400" persistent>
      <VCard
        v-if="selectedItem"
        :title="selectedItem.isActive ? 'Confirm Deactivation' : 'Confirm Activation'"
        :text="`Are you sure you want to ${selectedItem.isActive ? 'deactivate' : 'activate'} this campaign?`"
      >
        <template #actions>
          <VSpacer />
          <VBtn text="Cancel" @click="isConfirmDialogOpen = false" />
          <VBtn
            :color="selectedItem.isActive ? 'error' : 'success'"
            variant="tonal"
            :text="selectedItem.isActive ? 'Deactivate' : 'Activate'"
            :loading="isLoading"
            @click="toggleCampaignStatus"
          />
        </template>
      </VCard>
    </VDialog>
  </VCard>
</template>
