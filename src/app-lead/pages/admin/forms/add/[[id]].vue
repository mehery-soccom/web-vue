<script setup>
import { ref, onMounted, computed, inject,watch  } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFormsStore } from '@/app-lead/views/admin/forms/useFormsStore';
import { requiredValidator } from '@app-lead/@core/utils/validators'
import AppDateTimePicker from '@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue';
import draggable from 'vuedraggable';

const { show } = inject("snackbar");
const route = useRoute();
const router = useRouter();
const formsStore = useFormsStore();

const formId = computed(() => route.params.id === 'add' ? null : route.params.id);
const isLoading = ref(false);
const isFetching = ref(false);
const refForm = ref();

const formData = ref({
  title: '',
  code: '',
  desc: '',
});

const formFields = ref([]);
const availableFields = ref([]);

watch(() => formData.value.title, (newTitle) => {
  formData.value.code = newTitle.replace(/ /g, '_').toLowerCase();
});

onMounted(async () => {
  isFetching.value = true;
  try {
    availableFields.value = await formsStore.fetchFieldsForDropdown();

    if (formId.value) {
      const existingForm = await formsStore.fetchForm(formId.value);
      
      formData.value = {
        title: existingForm.title,
        code: existingForm.code,
        desc: existingForm.desc,
      };

      formFields.value = existingForm.formFields.map(field => {
        const masterField = existingForm.masterFields[field.field_id];
        return {
          ...masterField, 
          access: {
            contact: field.access?.contact || 'H',
            moderator: field.access?.moderator || 'H',
            agent: field.access?.agent || 'H'
          },
          label: masterField.title, 
        };
      });
    }
  } catch (error) {
    console.error('Failed to load form data:', error);
    show({ message: 'Failed to load data. Please try again.', color: 'error' });
    router.push({ name: 'admin-forms-list' });
  } finally {
    isFetching.value = false;
  }
});

const addFieldCard = () => {
  formFields.value.push({
    _id: null,
    inputType: null,
    access: { contact: 'R', moderator: 'R', agent: 'R' },
  });
};

const removeFieldCard = (index) => {
  formFields.value.splice(index, 1);
};

const onFieldSelected = (selectedFieldId, index) => {
  const fullField = availableFields.value.find(f => f._id === selectedFieldId);
  if (fullField) {
    formFields.value[index] = {
      ...formFields.value[index],
      ...fullField,
    };
  } else {
    formFields.value[index] = {
      _id: null,
      inputType: null,
      access: { contact: 'R', moderator: 'R', agent: 'R' },
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
    fields: formFields.value.map((field, index) => ({
      id: field._id,
      order: index + 1,
      access: field.access,
    })),
  };

  try {
    if (formId.value) {
      await formsStore.updateForm({ id: formId.value, data: payload });
      show({ message: 'Form updated successfully!', color: 'success' });
    } else {
      await formsStore.createForm(payload);
      show({ message: 'Form created successfully!', color: 'success' });
    }
    router.push({ name: 'admin-forms-list' });
  } catch (error) {
    console.error('Failed to save form:', error);
    show({ message: error.response?.data?.message || 'Failed to save the form.', color: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const openPreview = () => {
  const previewData = {
    title: formData.value.title,
    desc: formData.value.desc,
    fields: formFields.value,
  };

  sessionStorage.setItem('form-preview-data', JSON.stringify(previewData));

  const routeData = router.resolve({ name: 'admin-forms-preview' });
  window.open(routeData.href, '_blank');
};
</script>

<template>
  <VRow class="justify-center">
    <VCol cols="10" md="7">
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
                <AppTextField v-model="formData.title" label="Form Title" :rules="[requiredValidator]" />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="formData.code" label="Form Code" :rules="[requiredValidator]" />
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
                      item-title="title"
                      item-value="_id"
                      label="Select a Field"
                      placeholder="Search for a field to add"
                      clearable
                    >
                      <template #item="{ props, item }">
                          <VListItem v-bind="props" :title="undefined">
                            <VListItemTitle>{{ item.raw.title }}</VListItemTitle>
                            <template #append>
                                <VChip
                                  size="small"
                                  variant="tonal"
                                  color="primary"
                                >
                                  {{ item.raw.inputType === 'OPTIONS' ? 'DROPDOWN' : item.raw.inputType }}
                                </VChip>
                            </template>
                          </VListItem>
                      </template>

                      <template #selection="{ item }">
                          <span>{{ item.raw.title  }}</span>
                      </template>
                    </VAutocomplete>
                  </VCol>
                  <VCol cols="12" md="1" class="text-right">
                    <VBtn icon="tabler-trash" variant="text" color="error" @click="removeFieldCard(index)" />
                  </VCol>
                  <VCol cols="1" md="1" class="text-center">
                    <VIcon class="drag-handle" style="cursor: move;">tabler-grip-vertical</VIcon>
                  </VCol>
                </VRow>

                <div v-if="field.inputType" class="mt-4">

                  <VRow v-if="field.inputType === 'OPTIONS'">
                    <VCol md="8">
                      <AppSelect
                        :items="field.options"
                        item-title="label"
                        item-value="code"
                        :placeholder="field.desc"
                        disabled
                      />
                    </VCol>
                  </VRow>

                  <VSwitch
                    v-else-if="field.inputType === 'BOOLEAN'"
                    class="ps-4"
                    :label="field.title"
                    disabled
                  />

                  <VRow v-else-if="field.inputType === 'DATE'">
                    <VCol md="6">
                      <AppDateTimePicker
                        :model-value="null"
                        :placeholder="field.desc || 'User will select a date'"
                        prepend-inner-icon="tabler-calendar"
                        disabled
                      />
                    </VCol>
                  </VRow>

                  <VRow v-else-if="field.inputType === 'DOCUMENT'">
                    <VCol md="6">
                      <VFileInput
                        :placeholder="field.desc || 'User will upload a document'"
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
                  <VRow
                    v-for="role in ['Contact', 'Moderator', 'Agent']"
                    :key="role"
                    align="center"
                    dense
                  >
                    <VCol cols="2" class="py-0">
                      <strong>{{ role === 'Contact' ? 'External' : role }}</strong>
                    </VCol>

                    <VCol cols="10" class="py-0">
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
            <VBtn @click="addFieldCard" prepend-icon="tabler-plus">Add Field</VBtn>
            <VSpacer />
            <VBtn
              color="secondary"
              variant="tonal"
              :to="{ name: 'admin-forms-list' }"
            >
              Cancel
            </VBtn>
            <VBtn type="submit" :loading="isLoading">{{ formId ? 'Update Form' : 'Create Form' }}</VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCol>
  </VRow>
</template>

