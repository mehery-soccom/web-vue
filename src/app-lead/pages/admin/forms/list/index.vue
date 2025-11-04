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
  { title: "Actions", key: "actions", sortable: false },
];

const fetchForms = async (options = pagination) => {
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
    const response = await formsStore.fetchForms(apiParams);
    forms.value = response.results;
    pagination.itemsLength = response.pagination?.total || 0;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message
    if (errorMessage && errorMessage !== "No forms found") {
      show({ message: errorMessage || "Something went wrong while fetching forms.", color: "error" });
    }
    forms.value = [];
    pagination.itemsLength = 0;
  } finally {
    isLoading.value = false;
  }
};

const deleteForm = async (id, dialogCloseRef) => {
  isLoading.value = true;
  try {
    await formsStore.deleteForm({ id });
    await fetchForms();
    if (dialogCloseRef) dialogCloseRef.value = false;
    show({ message: "Form deleted successfully", color: "success" });
  } catch (error) {
    console.error("Delete failed:", error);
    const errorMessage = error.response?.data?.message || error.message || "Failed to delete form"
    show({ message: errorMessage, color: "error" });
  } finally {
    isLoading.value = false;
  }
};

const cloneForm = async (formId) => {
  isLoading.value = true;
  try {
    const formToClone = await formsStore.fetchForm(formId);

    const payload = {
      title: `${formToClone.title} - Copy`,
      code: `${formToClone.code}_copy`,
      desc: formToClone.desc,
      fields: formToClone.formFields.map(field => ({
        id: field.field_id,
        access: field.access,
      })),
    };

    await formsStore.createForm(payload);
    show({ message: `Form '${formToClone.title}' cloned successfully!`, color: 'success' });

    await fetchForms();

  } catch (error) {
    console.error("Clone failed:", error);
    const errorMessage = error.response?.data?.message || error.message || "Failed to clone form"
    show({ message: errorMessage, color: "error" });
  } finally {
    isLoading.value = false;
  }
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
        <VBtn 
          prepend-icon="tabler-plus" 
          :to="{ name: 'admin-forms-add-id?' }"  
        >
          Create Form
        </VBtn>
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
        <VTooltip location="top">
          <template #activator="{ props }">
            <IconBtn v-bind="props" @click="cloneForm(item.raw._id)">
              <VIcon icon="tabler-copy" />
            </IconBtn>
          </template>
          <span>Clone Form</span>
        </VTooltip>
        <IconBtn
          :to="{
            name: 'admin-forms-add-id?',
            params: { id: item.raw._id }
          }"
        >
          <VIcon icon="tabler-edit" />
        </IconBtn>

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
