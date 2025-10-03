<script setup>
import { ref, reactive, inject } from 'vue';
import debounce from "lodash/debounce";
import { useFormsStore } from '@/app-lead/views/admin/forms/useFormsStore';

const { show } = inject("snackbar");

const formsStore = useFormsStore();

const isLoading = ref(false);
const forms = ref([]);
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    title: null,
    code: null,
  },
});

const headers = [
  { title: "Title", key: "title" },
  { title: "Code", key: "code" },
  { title: "Description", key: "desc" },
  { title: "Actions", key: "actions", sortable: false, align: 'end' },
];

const fetchForms = (options = pagination) => {
  isLoading.value = true;

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

  formsStore
    .fetchForms(apiParams)
    .then((response) => {
      forms.value = response.results;
      pagination.itemsLength = response.pagination?.total || 0;
    })
    .catch((error) => {
      if (error.response?.data?.error !== "No forms found") {
        show({ message: "Something went wrong while fetching forms.", color: "error" });
      }
      forms.value = [];
      pagination.itemsLength = 0;
    })
    .finally(() => {
      isLoading.value = false;
    });
};

const deleteForm = (id, dialogCloseRef) => {
  isLoading.value = true;
  formsStore.deleteForm({ id })
    .then(() => {
      fetchForms(); // Refresh the data
      if (dialogCloseRef) dialogCloseRef.value = false;
      show({ message: "Form deleted successfully", color: "success" });
    })
    .catch((error) => {
      console.error("Delete failed:", error);
      show({ message: "Failed to delete form", color: "error" });
    })
    .finally(() => {
      isLoading.value = false;
    });
};

const onUpdateOptions = (options) => {
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  
  fetchForms(pagination);
};
const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300);

fetchForms();

</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">
        Forms
      </h5>
      <VSpacer />
      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn 
          icon 
          @click="() => fetchForms()" 
          :loading="isLoading" 
          variant="text" 
          size="small"
          aria-label="Refresh Forms"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <!-- <VBtn 
          prepend-icon="tabler-plus" 
          :to="{ name: 'admin-forms-add' }"  
        >
          Create Form
        </VBtn> -->
      </div>
    </VCardText>
    <VDivider />

    <MyDataTable 
      :headers="headers" 
      :items="forms" 
      :loading="isLoading"
      :server-side="true"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
    >
      <template #item.actions="{ item }">
        <!-- <IconBtn
          :to="{
            name: 'admin-forms-edit-id',
            params: { id: item.raw._id }
          }"
        >
          <VIcon icon="tabler-edit" />
        </IconBtn> -->

        <IconBtn>
          <VIcon icon="tabler-trash" />
          <v-dialog activator="parent" max-width="400">
            <template v-slot:default="{ isActive }">
              <v-card
                title="Confirm Deletion"
                text="Are you sure you want to delete this form?"
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
                    @click="deleteForm(item.raw._id, isActive)"
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
