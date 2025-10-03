
<script setup>
import { ref, onMounted, inject } from 'vue';
import debounce from "lodash/debounce";
import { useFieldsStore } from "@/app-lead/views/admin/fields/useFieldsStore";

const { show } = inject("snackbar");
const fieldsStore = useFieldsStore();
const isLoading = ref(false);
const fields = ref([]);

const isImportModalVisible = ref(false)
const customerFields = ref([])
const selectedCustomerFields = ref([])
const isImporting = ref(false)

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

const onUpdateOptions = (options) => {
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;
  
  fetchFields(pagination);
};
const onUpdateOptionsDebounced = debounce(onUpdateOptions, 300);

const headers = [
  { title: "Label", key: "title" },
  { title: "Code", key: "code" },
  { title: "Description", key: "desc" },
  { title: "Type", key: "inputType" },
  { title: "Mandatory", key: "optional" },
  { title: "Active", key: "isActive" },
  { title: "Actions", key: "actions", sortable: false },
];

const fetchFields = async (options) => {
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

    const response = await fieldsStore.fetchFields(apiParams);
    fields.value = response.results;
    pagination.itemsLength = response.pagination.total || 0;
  } catch (error) {
    if (error.response?.data?.error !== "No fields found") {
      show({ message: "Something went wrong while fetching fields.", color: "error" });
    }
    fields.value = [];
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
    console.log(error);
    show({ message: "Failed to delete field", color: "error" });
  } finally {
    isLoading.value = false;
  }
};


const openImportModal = async () => {
  isImportModalVisible.value = true
  isImporting.value = true
  try {
    const response = await fieldsStore.fetchCustomerFields()
    customerFields.value = response.results
  }
  catch (error) {
    show({ message: 'Failed to fetch customer fields', color: 'error' })
    isImportModalVisible.value = false
  }
  finally {
    isImporting.value = false
  }
}

const handleImport = async () => {
  if (selectedCustomerFields.value.length === 0) {
    show({ message: 'Please select at least one field to import', color: 'warning' })
    return
  }

  isImporting.value = true

  const typeMap = {
    date: 'DATE',
    text: 'TEXT',
    dropdown: 'OPTIONS',
    document: 'DOCUMENT',
    boolean: 'BOOLEAN',
    email: 'EMAIL',
    phone: 'PHONE',
  }

  const importPromises = selectedCustomerFields.value.map(field => {
    const transformedField = {
      title: field.label,
      code: field.code,
      desc: field.desc,
      inputType: typeMap[field.type] || 'TEXT',
      isActive: field.active,
      optional: !field.required,
      options: (field.possibleOptions || []).map(opt => ({
        label: opt.label,
        code: opt.value,
      })),
    }
    
    return fieldsStore.createField(transformedField)
  })

  try {
    await Promise.all(importPromises)
    show({ message: `${importPromises.length} fields imported successfully!`, color: 'success' })
    fetchFields() 
    isImportModalVisible.value = false
    selectedCustomerFields.value = []
  }
  catch (error) {
    console.error('Import failed:', error)
    show({ message: 'An error occurred during import.', color: 'error' })
  }
  finally {
    isImporting.value = false
  }
}

</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <h5 class="text-h5">
        Fields
      </h5>
      <VSpacer />
      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn icon @click="fetchFields" :loading="isLoading" variant="text" size="small">
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <VBtn
          prepend-icon="tabler-database-import"
          class="mr-2"
          @click="openImportModal"
        >
          Import Fields
        </VBtn>
        <VBtn 
          prepend-icon="tabler-plus" 
          :to="{name: 'admin-fields-add-id?'}" 
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
          <IconBtn>
            <VIcon icon="tabler-trash" />
            <v-dialog activator="parent" max-width="400">
              <template v-slot:default="{ isActive }">
                <v-card
                  title="Confirm Deletion"
                  text="Are you sure you want to delete this field?"
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

          <IconBtn
           :to="{
              name: 'admin-fields-add-id?',
              params: {id: item.raw._id}
           }"
          >
            <VIcon icon="tabler-edit" />
          </IconBtn>
        </template>
    </MyDataTable>

    <VDialog
      v-model="isImportModalVisible"
      max-width="700px"
      persistent
    >
      <VCard :loading="isImporting">
        <VCardTitle class="pa-4">Import Customer Fields</VCardTitle>
        <VDivider />

        <VCardText style="max-height: 400px; overflow-y: auto;">
          <VTable
            v-if="customerFields.length"
            fixed-header
          >
            <thead>
              <tr>
                <th class="text-left">
                  Select
                </th>
                <th class="text-left">
                  Label
                </th>
                <th class="text-left">
                  Code
                </th>
                <th class="text-left">
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="field in customerFields"
                :key="field._id"
              >
                <td class="d-flex justify-center">
                  <VCheckbox
                    v-model="selectedCustomerFields"
                    :value="field"
                    hide-details
                  />
                </td>
                <td>{{ field.label }}</td>
                <td>{{ field.code }}</td>
                <td>
                  <VChip
                    size="small"
                    label
                  >
                    {{ field.type }}
                  </VChip>
                </td>
              </tr>
            </tbody>
          </VTable>
          <p v-else>
            No fields available to import.
          </p>
        </VCardText>
        <VDivider />

        <VCardActions class="pt-3">
          <VSpacer />
          <VBtn
            variant="text"
            :disabled="isImporting"
            @click="isImportModalVisible = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            variant="text"
            :loading="isImporting"
            @click="handleImport"
          >
            Import Selected
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

  </VCard>
</template>