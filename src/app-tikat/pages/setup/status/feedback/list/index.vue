<script setup>
import { ref, reactive, inject, onMounted } from 'vue';
import debounce from "lodash/debounce";
import { useStatusStore } from '@/app-tikat/views/setup/status/useStatusStore'; 

const { show } = inject("snackbar");
const statusStore = useStatusStore(); 

const isLoading = ref(false);
const isCreatingDefaults = ref(false);
const statuses = ref([]); 

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {},
});

const headers = [
  { title: "Status", key: "label" }, 
  { title: "Key", key: "key" },
  { title: "Description", key: "desc" },
  { title: "Actions", key: "actions", sortable: false },
];

const defaultStatuses = [
  { label: 'Initial', key: 'initial', desc: 'Initial Status' },
  { label: 'Resolved', key: 'resolved', desc: 'Feedback has been resolved' },
];

const defaultStatusKeys = defaultStatuses.map(s => s.key);

const isDefaultStatus = (status) => {
  return status && status.key && defaultStatusKeys.includes(status.key);
};

const fetchStatuses = async (options = pagination) => {
  isLoading.value = true;
  let shouldRefetch = false;

  try {
    const apiParams = {
      pageNo: options.page,
      pageSize: options.itemsPerPage,
      sort: options.sortBy.length ? `${options.sortBy[0].key},${options.sortBy[0].order}` : 'createdAt',
      ...options.filters,
    };

    const response = await statusStore.fetchStatuses(apiParams);
    
    const fetchedStatuses = response.results || [];
    
    const fetchedKeys = new Set(fetchedStatuses.map(s => s.key));
    const missingStatuses = defaultStatuses.filter(ds => !fetchedKeys.has(ds.key));

    if (missingStatuses.length > 0 && !isCreatingDefaults.value) {
      isCreatingDefaults.value = true; 
      try {
        await Promise.all(missingStatuses.map(status => statusStore.createStatus(status)));
        show({ message: 'Default statuses synchronized.', color: 'success' });
        shouldRefetch = true; 
      } catch (createError) {
        console.error("Error creating defaults:", createError);
      } finally {
        isCreatingDefaults.value = false; 
      }
    }

    if (shouldRefetch) {
      const finalResponse = await statusStore.fetchStatuses(apiParams);
      statuses.value = finalResponse.results || [];
      pagination.itemsLength = finalResponse.pagination?.total || 0;
    } else {
      statuses.value = fetchedStatuses;
      pagination.itemsLength = response.pagination?.total || 0;
    }

  } catch (error) {
    show({ message: "Failed to fetch statuses.", color: "error" });
  } finally {
    isLoading.value = false;
  }
};

const deleteStatus = async (id, isActive) => {
  isLoading.value = true;
  try {
    await statusStore.deleteStatus({ id });
    await fetchStatuses();
    isActive.value = false;
    show({ message: "Status deleted successfully", color: "success" });
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Failed to delete status";
    show({ message: errorMessage, color: "error" });
  } finally {
    isLoading.value = false;
  }
};

const onUpdateOptions = (options) => {
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters || {};

  fetchStatuses(pagination);
};

const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300);

onMounted(() => {
  fetchStatuses();
});
</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">Feedback Statuses</h5>
      <VSpacer />
      
      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          icon
          @click="() => fetchStatuses()"
          :loading="isLoading"
          variant="text"
          size="small"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>

        <VTooltip
          location="top"
          text="Maximum 10 Statuses allowed"
          :disabled="pagination.itemsLength < 10"
        >
          <template #activator="{ props: tooltipProps }">
            <div v-bind="tooltipProps" class="d-inline-block">
              <VBtn
                prepend-icon="tabler-plus"
                :to="pagination.itemsLength >= 10 ? undefined : { name: 'setup-status-feedback-add-id?', params: { id: 'add' } }"
                :disabled="pagination.itemsLength >= 10"
              >
                Create Status
              </VBtn>
            </div>
          </template>
        </VTooltip>
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable
      :headers="headers"
      :items="statuses"
      :loading="isLoading"
      :server-side="true"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
    >
      <template #item.actions="{ item }">
        <IconBtn
          :to="{ name: 'setup-status-feedback-add-id?', params: { id: item.raw._id } }"
          :disabled="isDefaultStatus(item.raw)"  
        >
          <VIcon icon="tabler-edit" />
        </IconBtn>

        <IconBtn :disabled="isDefaultStatus(item.raw)">  
          <VIcon icon="tabler-trash" />
          <v-dialog activator="parent" max-width="400">
            <template v-slot:default="{ isActive }">
              <v-card title="Confirm Deletion">
                <v-card-text>
                  Are you sure you want to delete the status <strong>{{ item.raw.label }}</strong>?
                </v-card-text>
                <template v-slot:actions>
                  <VSpacer />
                  <v-btn text="Cancel" @click="isActive.value = false" />
                  <v-btn
                    color="error"
                    variant="tonal"
                    text="Delete"
                    :loading="isLoading"
                    @click="deleteStatus(item.raw._id, isActive)"
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