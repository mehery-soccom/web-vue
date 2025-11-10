<script setup>
import { ref, reactive, inject, onMounted } from 'vue';
import debounce from "lodash/debounce";
import { useStagesStore } from '@/app-lead/views/admin/stages/useStagesStore'; 

const { show } = inject("snackbar");
const stagesStore = useStagesStore(); 

const isLoading = ref(false);
const stages = ref([]); 
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {},
});

const headers = [
  { title: "Stage", key: "title", }, 
  { title: "Description", key: "desc" },
  { title: "Probability (%)", key: "probability" },
  { title: "Actions", key: "actions" },
];

const defaultStages = [
  { title: 'Initial', code: 'initial', desc: 'Initial Stage', probability: '10' },
  { title: 'Won', code: 'won', desc: 'Won', probability: '100' },
  { title: 'Lost', code: 'lost', desc: 'Lost', probability: '0' },
];

const defaultStageCodes = defaultStages.map(s => s.code);

const isDefaultStage = (stage) => {
  return defaultStageCodes.includes(stage.code);
};

const fetchStages = async (options = pagination) => {
  isLoading.value = true;
  let shouldRefetch = false;

  try {
    const apiParams = {
      page: options.page,
      pageSize: options.itemsPerPage,
      search: options.filters,
      sortBy: options.sortBy.length ? options.sortBy[0].key : null,
      sortOrder: options.sortBy.length ? options.sortBy[0].order : null,
    };

    const response = await stagesStore.fetchStages(apiParams);
    const fetchedStages = response.data || [];
    const fetchedCodes = new Set(fetchedStages.map(s => s.code));

    const missingStages = defaultStages.filter(ds => !fetchedCodes.has(ds.code));

    if (missingStages.length > 0) {
      show({ message: `Creating missing default stages: ${missingStages.map(s => s.title).join(', ')}...`, color: 'info' });
      shouldRefetch = true;
      try {
        await Promise.all(missingStages.map(stage => stagesStore.createStage({ payload: stage })));
        show({ message: 'Default stages created.', color: 'success' });
      } catch (createError) {
        console.error("Error creating default stages:", createError);
        const createErrorMessage = createError.response?.data?.message || createError.message || 'Unknown error'
        show({ message: `Failed to create some default stages: ${createErrorMessage}`, color: 'error' });
        shouldRefetch = false;
      }
    }

    if (shouldRefetch) {
      const finalResponse = await stagesStore.fetchStages(apiParams);
      stages.value = finalResponse.data || [];
      pagination.itemsLength = finalResponse.pagination?.total || 0;
    } else {
      stages.value = fetchedStages;
      pagination.itemsLength = response.pagination?.total || 0;
    }

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Something went wrong while fetching stages."
    show({ message: errorMessage, color: "error" });
    stages.value = [];
    pagination.itemsLength = 0;
  } finally {
    isLoading.value = false;
  }
};

const deleteStage = async (id, dialogCloseRef) => {
  isLoading.value = true;
  try {
    await stagesStore.deleteStage({ id });
    await fetchStages();
    if (dialogCloseRef) dialogCloseRef.value = false;
    show({ message: "Stage deleted successfully", color: "success" });
  } catch (error) {
    console.error("Delete failed:", error);
    const errorMessage = error.response?.data?.message || error.message || "Failed to delete stage"
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

  fetchStages(pagination);
};
const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300);

onMounted(() => {
    fetchStages();
});

</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">
        Stages
      </h5>
      <VSpacer />
      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          icon
          @click="() => fetchStages()"
          :loading="isLoading"
          variant="text"
          size="small"
          aria-label="Refresh Stages"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <VTooltip
          location="top"
          text="Maximum 10 Stages are allowed"
          :disabled="pagination.itemsLength < 10"
        >
          <template #activator="{ props: tooltipProps }">
            <div
              v-bind="tooltipProps"
              class="d-inline-block"
            >
              <VBtn
                prepend-icon="tabler-plus"
                :to="pagination.itemsLength >= 10 ? undefined : { name: 'admin-stages-add-id?', params: { id: 'add' } }"
                :disabled="pagination.itemsLength >= 10"
              >
                Create Stage
              </VBtn>
            </div>
          </template>
        </VTooltip>
      </div>
    </VCardText>
    <VDivider />

    <MyDataTable
      :headers="headers"
      :items="stages"
      :loading="isLoading"
      :server-side="true"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
    >
      <template #item.probability="{ item }">
        {{ item.raw.probability }}%
      </template>

      <template #item.actions="{ item }">
        <IconBtn
          :to="{
            name: 'admin-stages-add-id?',
            params: { id: item.raw._id }
          }"
          :disabled="isDefaultStage(item.raw)"  
        >
          <VIcon icon="tabler-edit" />
        </IconBtn>

        <IconBtn :disabled="isDefaultStage(item.raw)">  
          <VIcon icon="tabler-trash" />
          <v-dialog activator="parent" max-width="400">
            <template v-slot:default="{ isActive }">
              <v-card
                title="Confirm Deletion"
                text="Are you sure you want to delete this stage?"
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
                    @click="deleteStage(item.raw._id, isActive)"
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