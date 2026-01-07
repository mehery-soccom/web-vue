<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFormsStore } from '@/app-tikat/views/setup/forms/useFormsStore';
import draggable from 'vuedraggable';

const requiredValidator = value => !!value || 'This field is required';

const { show } = inject("snackbar");
const route = useRoute();
const router = useRouter();
const formsStore = useFormsStore();

const formId = computed(() => route.params.id === 'add' ? null : route.params.id);
const isLoading = ref(false);
const isFetching = ref(false);
const refForm = ref();

const formData = ref({
  name: '',
  key: '',
  desc: '',
});

const formFields = ref([]);
const availableFields = ref([]);

watch(() => formData.value.name, (newName) => {
  if (newName && !formId.value) {
    formData.value.key = newName.replace(/ /g, '_').toLowerCase();
  }
});

onMounted(async () => {
  isFetching.value = true;
  try {
    const fieldResponse = await formsStore.fetchFieldsForDropdown();
    availableFields.value = (fieldResponse.results || [])
      .filter(field => field.isActive !== false);
      
    if (formId.value) {
      const existingForm = await formsStore.fetchForm(formId.value);
      
      formData.value = {
        name: existingForm.name,
        key: existingForm.key,
        desc: existingForm.desc,
      };

      formFields.value = (existingForm.formFields || []).map(field => {
        const masterField = (existingForm.masterFields || []).find(m => m.field_id === field.id) || {};
        
        return {
          ...masterField, 
          _id: field.id,
          access: {
            contact: field.access?.contact || 'W',
            moderator: field.access?.moderator || 'W',
            agent: field.access?.agent || 'W'
          },
          label: masterField.label || 'Unknown Field',
        };
      });
    }else {
      const defaultKeys = ['name', 'email', 'phone'];
      const defaultAccess = { contact: 'W', moderator: 'W', agent: 'W' };

      const fieldsToAdd = defaultKeys.map(k => {
        return availableFields.value.find(f => f.key === k);
      }).filter(Boolean);

      formFields.value = fieldsToAdd.map(field => ({
        ...field,
        access: { ...defaultAccess },
      }));
    }
  } catch (error) {
    console.error('Failed to load form data:', error);
    const errorMessage = error.response?.data?.message || 'Failed to load data. Please try again.';
    show({ message: errorMessage, color: 'error' });
    router.push({ name: 'setup-forms-feedback-list' });
  } finally {
    isFetching.value = false;
  }
});

const addFieldCard = () => {
  formFields.value.push({
    _id: null,
    inputType: null,
    access: { contact: 'W', moderator: 'W', agent: 'W' },
  });
};

const removeFieldCard = (index) => {
  const field = formFields.value[index];
  if (field && field.key === 'name') {
    show({ message: 'The Name field cannot be removed.', color: 'warning' });
    return;
  }
  formFields.value.splice(index, 1);
};

const onFieldSelected = (selectedFieldId, index) => {
  const fullField = availableFields.value.find(f => f._id === selectedFieldId);
  if (fullField) {
    formFields.value[index] = {
      ...fullField,
      access: { contact: 'W', moderator: 'W', agent: 'W' },
    };
  } else {
    formFields.value[index] = {
      _id: null,
      inputType: null,
      access: { contact: 'W', moderator: 'W', agent: 'W' },
    };
  }
};

const handleSubmit = async () => {
  const { valid } = await refForm.value.validate();
  if (!valid) {
    show({ message: 'Please fill in all required fields.', color: 'error' });
    return;
  }

  if (formFields.value.length === 0) {
    show({ message: 'Please add at least one field before saving.', color: 'warning' });
    return;
  }

  isLoading.value = true;

  const payload = {
    ...formData.value,
    formFields: formFields.value.map((field, index) => ({
      id: field._id,
      order: index + 1,
      access: field.access,
    })),
  };

  try {
    if (formId.value) {
      await formsStore.updateForm({ id: formId.value }, payload);
      show({ message: 'Form updated successfully!', color: 'success' });
    } else {
      await formsStore.createForm(payload);
      show({ message: 'Form created successfully!', color: 'success' });
    }
    router.push({ name: 'setup-forms-feedback-list' });
  } catch (error) {
    const action = formId.value ? 'update' : 'create';
    const errorMessage = error.response?.data?.message || `Failed to ${action} form.`;
    show({ message: errorMessage, color: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const openPreview = () => {
  const previewData = {
    name: formData.value.name,
    desc: formData.value.desc,
    fields: formFields.value,
  };
  sessionStorage.setItem('form-preview-data', JSON.stringify(previewData));
  const routeData = router.resolve({ name: 'setup-forms-feedback-preview' });
  window.open(routeData.href, '_blank');
};
</script>

<template>
  <VRow class="justify-center">
    <VCol cols="12" md="8">
      <VCard :loading="isFetching" class="mb-4">
        <VCardItem>
          <VCardTitle>{{ formId ? 'Edit Form' : 'Create Form' }}</VCardTitle>
          <template #append>
            <VTooltip location="top">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="tabler-eye"
                  variant="text"
                  color="default"
                  @click="openPreview"
                />
              </template>
              <span>Preview</span>
            </VTooltip>
          </template>
        </VCardItem>
      </VCard>

      <VForm ref="refForm" @submit.prevent="handleSubmit">
        <VCard class="my-4">
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <AppTextField v-model="formData.name" label="Form Name" :rules="[requiredValidator]" />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="formData.key" label="Form Key" :rules="[requiredValidator]" :disabled="!!formId" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="formData.desc" label="Description" rows="3" />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <draggable
          v-model="formFields"
          tag="div"
          item-key="index"
          handle=".drag-handle"
        >
          <template #item="{ element: field, index }">
            <VCard class="my-4" variant="outlined">
              <VCardText>
                <VRow align="center">
                  <VCol cols="10" md="10">
                    <VAutocomplete
                      :model-value="field._id"
                      @update:model-value="onFieldSelected($event, index)"
                      :items="availableFields"
                      item-title="label"
                      item-value="_id"
                      label="Select a Field"
                      placeholder="Search for a field to add"
                      clearable
                    >
                      <template #label>
                        {{ field.label || 'Select a Field' }}
                        <span v-if="field.optional === false" class="text-error">*</span>
                      </template>
                      <template #item="{ props, item }">
                        <VListItem v-bind="props" :title="undefined">
                          <VListItemTitle>{{ item.raw.label }}</VListItemTitle>
                          <template #append>
                            <VChip size="small" variant="tonal" color="primary">
                              {{ item.raw.inputType }}
                            </VChip>
                          </template>
                        </VListItem>
                      </template>
                      <template #selection="{ item }">
                        <span>{{ item.raw.label }}</span>
                      </template>
                    </VAutocomplete>
                  </VCol>
                  <VCol cols="12" md="1" class="text-right">
                    <VBtn icon="tabler-trash" variant="text" color="error" @click="removeFieldCard(index)" :disabled="field.key === 'name'" />
                  </VCol>
                  <VCol cols="1" md="1" class="text-center">
                    <VIcon class="drag-handle" style="cursor: move;">tabler-grip-vertical</VIcon>
                  </VCol>
                </VRow>

                <div v-if="field.inputType" class="mt-4">
                  <VRow v-if="field.inputType === 'OPTIONS'">
                    <VCol md="8">
                      <VSelect
                        :items="field.options"
                        item-title="label"
                        item-value="code"
                        :placeholder="field.desc"
                        disabled
                        variant="outlined"
                      />
                    </VCol>
                  </VRow>

                  <VSwitch
                    v-else-if="field.inputType === 'BOOLEAN'"
                    class="ps-4"
                    :label="field.label"
                    disabled
                  />

                  <VRow v-else-if="field.inputType === 'DATE'">
                    <VCol md="6">
                      <VTextField
                        disabled
                        placeholder="User will select a date"
                        prepend-inner-icon="tabler-calendar"
                      />
                    </VCol>
                  </VRow>

                  <VRow v-else-if="field.inputType === 'DOCUMENT'">
                    <VCol md="6">
                      <VFileInput
                        placeholder="User will upload a document"
                        variant="outlined"
                        disabled
                      />
                    </VCol>
                  </VRow>

                  <VRow v-else>
                    <VCol md="8">
                      <VTextField
                        :placeholder="field.desc || 'User will enter text here'"
                        disabled
                      />
                    </VCol>
                  </VRow>

                  <VDivider class="my-4" />

                  <h6 class="text-h6 mb-3">Access Control</h6>
                  <VRow v-for="role in ['Contact', 'Moderator', 'Agent']" :key="role" align="center" dense>
                    <VCol cols="3" md="2" class="py-0">
                      <strong>{{ role === 'Contact' ? 'External' : role }}</strong>
                    </VCol>
                    <VCol cols="9" md="10" class="py-0">
                      <VRadioGroup
                        v-model="field.access[role.toLowerCase()]"
                        inline
                        density="compact"
                        hide-details
                      >
                        <VRadio label="Hide" value="H" />
                        <VRadio label="Read" value="R" />
                        <VRadio label="Write" value="W" />
                      </VRadioGroup>
                    </VCol>
                  </VRow>
                </div>

                <div v-else class="text-center pa-4 text-disabled">
                  Select a field to configure its properties.
                </div>
              </VCardText>
            </VCard>
          </template>
        </draggable>

        <VRow>
          <VCol cols="12" class="d-flex gap-4">
            <VBtn @click="addFieldCard" prepend-icon="tabler-plus" variant="tonal">Add Field</VBtn>
            <VSpacer />
            <VBtn color="secondary" variant="tonal" :to="{ name: 'setup-forms-feedback-list' }">
              Cancel
            </VBtn>
            <VBtn type="submit" :loading="isLoading">
              {{ formId ? 'Update Form' : 'Create Form' }}
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCol>
  </VRow>
</template>

<style scoped>
.drag-handle:hover {
  color: rgb(var(--v-theme-primary));
}
</style>