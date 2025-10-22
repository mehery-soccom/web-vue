<script setup>
import { ref, reactive, inject, onMounted } from 'vue';
import debounce from "lodash/debounce";
import { useLeadsStore } from '@/app-lead/views/admin/leads/useLeadsStore';

const { show } = inject("snackbar");
const leadsStore = useLeadsStore();

const isLoading = ref(false);
const leads = ref([]);
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {},
});

const headers = [
  { title: "Name", key: "response.name" },
  { title: "Email", key: "response.email" },
  { title: "Campaign", key: "formTitle" },
  { title: "Created At", key: "createdAt", sortable: true },
  { title: "Modified At", key: "updatedAt", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

const fetchLeads = async (options = pagination) => {
  isLoading.value = true;
  try {
    const activeFilters = {};
    for (const key in options.filters) {
      if (options.filters[key]) {
        activeFilters[key] = options.filters[key];
      }
    }
    const apiParams = {
      pageNo: options.page,
      pageSize: options.itemsPerPage,
      search: activeFilters,
    };

    const response = await leadsStore.fetchLeads(apiParams);
    leads.value = response.results;
    pagination.itemsLength = response.pagination?.total || 0;
  } catch (error) {
    show({ message: error.message || "Something went wrong while fetching leads.", color: "error" });
    leads.value = [];
    pagination.itemsLength = 0;
  } finally {
    isLoading.value = false;
  }
};

const onUpdateOptions = (options) => {
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  
  fetchLeads(pagination);
};
const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300);

onMounted(() => {
    fetchLeads();
});

const formatDate = (timestampObj) => {
  if (!timestampObj || !timestampObj.stamp) {
    return '-';
  }
  const date = new Date(timestampObj.stamp);
  const options = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  };
  
  const formatted = new Intl.DateTimeFormat('en-GB', options).format(date);
  
  const parts = formatted.split(', ');
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`;
  }
  return formatted;
};

const deleteLead = async (id, dialogCloseRef) => {
  isLoading.value = true;
  try {
    await leadsStore.deleteLead({ id });
    await fetchLeads();
    if (dialogCloseRef) dialogCloseRef.value = false;
    show({ message: "Lead deleted successfully", color: "success" });
  } catch (error) {
    console.error("Delete failed:", error);
    show({ message: "Failed to delete lead", color: "error" });
  } finally {
    isLoading.value = false;
  }
};

</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">
        Leads
      </h5>
      <VSpacer />
      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn 
          icon 
          @click="() => fetchLeads()" 
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
      :server-side="true"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
    >
      <template #item.createdAt="{ item }">
        {{ formatDate(item.raw.createdAt) }}
      </template>
      <template #item.updatedAt="{ item }">
        {{ formatDate(item.raw.updatedAt) }}
      </template>

      <template #item.actions="{ item }">
        <IconBtn :to="{ name: 'admin-leads-add-id?', params: { id: item.raw._id } }">
          <VIcon icon="tabler-eye" />
        </IconBtn>

        <IconBtn>
          <VIcon icon="tabler-trash" />
          <v-dialog activator="parent" max-width="400">
            <template v-slot:default="{ isActive }">
              <v-card
                title="Confirm Deletion"
                text="Are you sure you want to delete this lead?"
              >
                <template v-slot:actions>
                  <VSpacer />
                  <v-btn 
                    text="Cancel" 
                    @click="isActive.value = false"
                  />
                  <v-btn
                    color="error"
                    variant="tonal"
                    text="Delete"
                    :loading="isLoading"
                    @click="deleteLead(item.raw._id, isActive)"
                  />
                </template>
              </v-card>
            </template>
          </v-dialog>
        </IconBtn>
      </template>
    </MyDataTable>
  </VCard>
</template>

