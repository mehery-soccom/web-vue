<script setup>
import { ref, reactive, inject, onMounted } from 'vue';
import debounce from "lodash/debounce";
import { useFormsStore } from '@/app-tikat/views/setup/forms/useFormsStore';

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
    name: null,
    key: null,
  },
});

const headers = [
  { title: "Title", key: "name", sortable: true },
  { title: "Key", key: "key", sortable: true },
  { title: "Description", key: "desc", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

const fetchForms = async (options = pagination) => {
  isLoading.value = true;
  try {
    const activeFilters = {
      isActive: "true"
    };
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

    if (options.sortBy && options.sortBy.length > 0) {
      const sortItem = options.sortBy[0];
      apiParams.sort = `${sortItem.order === 'desc' ? '-' : ''}${sortItem.key}`;
    }

    const response = await formsStore.fetchForms(apiParams);
    
    forms.value = response.results || [];
    pagination.itemsLength = response.pagination?.total || 0;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Failed to fetch forms.";
    show({ message: errorMessage, color: "error" });
    forms.value = [];
    pagination.itemsLength = 0;
  } finally {
    isLoading.value = false;
  }
};

const deleteForm = async (id, isActive) => {
  isLoading.value = true;
  try {
    await formsStore.deleteForm({ id });
    await fetchForms();
    isActive.value = false;
    show({ message: "Form deleted successfully", color: "success" });
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Failed to delete form";
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
      name: `${formToClone.name} - Copy`, 
      key: `${formToClone.key}_${Date.now()}`,
      desc: formToClone.desc,
      formFields: (formToClone.formFields || []).map((field, index) => ({
        id: field.id, 
        order: index + 1,
        access: field.access,
      })),
    };

    await formsStore.createForm(payload);
    show({ message: `Form '${formToClone.name}' cloned successfully!`, color: 'success' });
    await fetchForms();
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Failed to clone form";
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

const copyLink = async (id) => {
  try {
    const origin = window.location.origin; 
    
    const tnt = origin.split('.')[0].replace('https://', '');
    
    const domainPart = origin.split('.').slice(1).join('.');
    const finalLink = `https://nexuz.${domainPart}/nexuz/form/${id}?tnt=${tnt}`;

    await navigator.clipboard.writeText(finalLink);
    show({ message: "Link copied to clipboard!", color: "success" });
  } catch (error) {
    show({ message: "Failed to copy link.", color: "error" });
  }
};

</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">Feedback Forms</h5>
      <VSpacer />
      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn 
          icon 
          @click="fetchForms()" 
          :loading="isLoading" 
          variant="text" 
          size="small"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <VBtn 
          prepend-icon="tabler-plus" 
          :to="{ name: 'setup-forms-feedback-add-id?' }"  
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
        <IconBtn @click="copyLink(item.raw._id)">
          <VIcon icon="tabler-link" />
          <VTooltip activator="parent" location="top">Copy Link</VTooltip>
        </IconBtn>

        <IconBtn @click="cloneForm(item.raw._id)" :loading="isLoading">
          <VIcon icon="tabler-copy" />
          <VTooltip activator="parent" location="top">Clone Form</VTooltip>
        </IconBtn>

        <IconBtn
          :to="{
            name: 'setup-forms-feedback-add-id?',
            params: { id: item.raw._id }
          }"
        >
          <VIcon icon="tabler-eye" />
          <VTooltip activator="parent" location="top">View Form</VTooltip>
        </IconBtn>

        <IconBtn>
          <VIcon icon="tabler-trash" />
          <VTooltip activator="parent" location="top">Delete Form</VTooltip>
          <v-dialog activator="parent" max-width="400">
            <template v-slot:default="{ isActive }">
              <v-card title="Confirm Deletion">
                <v-card-text>
                  Are you sure you want to delete the form <strong>{{ item.raw.name }}</strong>?
                </v-card-text>
                <template v-slot:actions>
                  <VSpacer />
                  <v-btn text="Cancel" @click="isActive.value = false" />
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