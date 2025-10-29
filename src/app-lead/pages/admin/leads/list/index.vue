<script setup>
import { ref, reactive, inject, onMounted } from 'vue';
import debounce from "lodash/debounce";
import { useLeadsStore } from '@/app-lead/views/admin/leads/useLeadsStore';
import LeadTable from '@/app-lead/views/admin/leads/LeadTable.vue';

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

const deleteLead = async (id) => {
  isLoading.value = true;
  try {
    await leadsStore.deleteLead({ id });
    await fetchLeads();
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

    <LeadTable
      :leads="leads"
      :loading="isLoading"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
      @delete-lead="deleteLead" 
    />
  </VCard>
</template>

