<script setup>
import { ref, inject, reactive } from 'vue';
import debounce from "lodash/debounce";
import { useFieldsStore } from "@/app-tikat/views/setup/fields/useFieldsStore";

const { show } = inject("snackbar");
const fieldsStore = useFieldsStore();
const isLoading = ref(false);
const fields = ref([]);

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    label: null,
    key: null,
  },
});

const defaultFields = [
  { label: 'Name', key: 'name', desc: 'Name', inputType: 'TEXT', optional: false, isActive: true },
  { label: 'Phone', key: 'phone', desc: 'Phone Number', inputType: 'PHONE', optional: false, isActive: true },
  { label: 'Email', key: 'email', desc: 'Email ID', inputType: 'EMAIL', optional: false, isActive: true },
];

const defaultFieldCodes = defaultFields.map(f => f.key);

const isDefaultField = (field) => {
  return defaultFieldCodes.includes(field.code);
};

const onUpdateOptions = (options) => {
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;
  
  fetchFields(pagination);
};

const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300);

const headers = [
  { title: "Label", key: "label", sortable: true }, // Key is now label
  { title: "Code", key: "key" },
  { title: "Description", key: "desc" },
  { title: "Type", key: "inputType" },
  { title: "Mandatory", key: "optional" },
  { title: "Active", key: "isActive" },
  { title: "Actions", key: "actions", sortable: false },
];

const fetchFields = async (options = pagination) => {
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

    if (options.sortBy && options.sortBy.length > 0) {
      const sortItem = options.sortBy[0];
      const sortKey = sortItem.key; 
      apiParams.sort = `${sortItem.order === 'desc' ? '-' : ''}${sortKey}`;
    }

    const response = await fieldsStore.fetchFields(apiParams);
    fields.value = response.results;
    pagination.itemsLength = response.pagination.total || 0;

    // Handle initial setup if no fields exist
    if (pagination.itemsLength === 0 && !Object.keys(activeFilters).length) {
      show({ message: 'No fields found. Creating default fields...', color: 'info' });
      try {
        await Promise.all(defaultFields.map(field => fieldsStore.createField(field)));
        show({ message: 'Default fields created successfully.', color: 'success' });
        
        const finalResponse = await fieldsStore.fetchFields(apiParams);
        fields.value = finalResponse.results;
        pagination.itemsLength = finalResponse.pagination.total || 0;
      } catch (createError) {
        console.error("Error creating default fields:", createError);
        const createErrorMessage = createError.response?.data?.message || 'Failed to create default fields'
        show({ message: createErrorMessage, color: 'error' });
      }
    }

  } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Something went wrong while fetching fields."
      show({ message: errorMessage, color: "error" });
      fields.value = [];
      pagination.itemsLength = 0;
  } finally {
    isLoading.value = false;
  }
};

const deleteField = async (id, dialogCloseRef) => {
  isLoading.value = true;
  try {
    await fieldsStore.deleteField({ id });
    await fetchFields(pagination);
    
    dialogCloseRef.value = false;
    show({ message: "Field deleted successfully", color: "success" });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Failed to delete field"
    show({ message: errorMessage, color: "error" });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">Fields</h5>
      <VSpacer />
      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn 
          icon 
          @click="fetchFields" 
          :loading="isLoading" 
          variant="text" 
          size="small"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <VBtn 
          prepend-icon="tabler-plus" 
          :to="{name: 'setup-fields-add-id?'}" 
        >
          Create Field
        </VBtn>
      </div>
    </VCardText>
    
    <VDivider />

    <MyDataTable 
      :headers="headers" 
      :items="fields" 
      :loading="isLoading"
      :server-side="true"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
    >
      <template #item.inputType="{ item }">
        {{ item.raw.inputType === 'OPTIONS' ? 'DROPDOWN' : item.raw.inputType }}
      </template>

      <template #item.optional="{ item }">
        <VChip :color="item.raw.optional ? 'secondary' : 'success'" size="small" label>
          {{ item.raw.optional ? 'No' : 'Yes' }}
        </VChip>
      </template>

      <template #item.isActive="{ item }">
        <VChip :color="item.raw.isActive ? 'success' : 'error'" size="small" label>
          {{ item.raw.isActive ? 'Yes' : 'No' }}
        </VChip>
      </template>

      <template #item.actions="{ item }">
          <IconBtn
           :to="{
             name: 'setup-fields-add-id?',
             params: {id: item.raw._id}
           }"
           :disabled="isDefaultField(item.raw)"
          >
            <VIcon icon="tabler-edit" />
          </IconBtn>
          
          <IconBtn :disabled="isDefaultField(item.raw)">
            <VIcon icon="tabler-trash" />
            <v-dialog activator="parent" max-width="400">
              <template v-slot:default="{ isActive }">
                <v-card
                  title="Confirm Deletion"
                  text="Are you sure you want to delete this field? This action cannot be undone."
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
                      @click="deleteField(item.raw._id, isActive)"
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