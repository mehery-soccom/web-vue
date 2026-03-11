<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFormsStore } from '@/app-tikat/views/setup/forms/useFormsStore';
import TikatDocUpload from '@/app-tikat/views/admin/feedback/TikatDocUpload.vue';
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
const hasTikats = ref(false);

const formData = ref({
  name: '',
  key: '',
  desc: '',
  scale: 5,
  positiveScore: 60,
  segmentation: [
    { label: 'Poor Feedback', min: 0, max: 40 },
    { label: 'Satisfactory', min: 41, max: 65 },
    { label: 'Good to Excellent', min: 66, max: 100 },
  ],
  banner: {
    bgImg: null,
    logo: null,
  },
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
      const questionMaster = availableFields.value.find(f => f.key === 'question');
      
      formData.value = {
        name: existingForm.name,
        key: existingForm.key,
        desc: existingForm.desc,
        scale: existingForm.scale || 5,
        positiveScore: existingForm.positiveScore || 0,
        segmentation: existingForm.segmentation?.length ? existingForm.segmentation : formData.value.segmentation,
        banner: existingForm.banner || { bgImg: null, logo: null },
      };
      hasTikats.value = !!existingForm.hasTikats;

      const mappedRegularFields = (existingForm.formFields || []).map(field => {
        const masterField = (existingForm.masterFields || []).find(m => m.field_id === field.id) || {};
        return {
          ...masterField, 
          _id: field.id,
          order: field.order || 0,
          access: {
            contact: field.access?.contact || 'W',
            moderator: field.access?.moderator || 'W',
            agent: field.access?.agent || 'W'
          },
          label: masterField.label || 'Unknown Field',
        };
      });

      const mappedQuestions = (existingForm.questions || []).map(q => {
        return {
          ...(questionMaster || {}),
          _id: questionMaster?._id || null,
          key: 'question',
          label: questionMaster?.label || 'Question',
          questionText: q.question,
          weight: q.weight,
          optional: q.optional,
          order: q.order || 0,
        };
      });

      formFields.value = [...mappedRegularFields, ...mappedQuestions].sort((a, b) => a.order - b.order);

    }else {
      const defaultKeys = ['name', 'email', 'phone', 'rating'];
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

watch(() => formData.value.segmentation[0].max, (newVal) => {
  const poorMax = Number(newVal) || 0;
  formData.value.segmentation[1].min = poorMax + 1;
});

watch(() => formData.value.segmentation[1].max, (newVal) => {
  const satMax = Number(newVal) || 0;
  formData.value.segmentation[2].min = satMax + 1;
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
      questionText: fullField.key === 'question' ? '' : undefined,
      weight: fullField.key === 'question' ? 1 : undefined,
      optional: fullField.key === 'question' ? false : (fullField.optional ?? true),
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

  const regularFields = formFields.value.filter(f => f.key !== 'question');
  const questionFields = formFields.value.filter(f => f.key === 'question');

  if (regularFields.length === 0) {
    show({ message: 'Please add at least one regular field before saving.', color: 'warning' });
    return;
  }

  isLoading.value = true;

  const payload = {
    ...formData.value,
    formFields: regularFields.map((field, index) => ({
      id: field._id,
      order: formFields.value.indexOf(field) + 1,
      access: field.access,
    })),
    questions: questionFields.map((field, index) => ({
      question: field.questionText,
      weight: Number(field.weight) || 1,
      order: formFields.value.indexOf(field) + 1,
      optional: !!field.optional,
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
    banner: formData.value.banner,
    scale: formData.value.scale,
    fields: formFields.value.filter(f => f.key !== 'question'),
    questions: formFields.value.filter(f => f.key === 'question'),
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
                <AppTextField v-model="formData.name" label="Form Name*" :rules="[requiredValidator]" />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="formData.key" label="Form Key *" :rules="[requiredValidator]" :disabled="!!formId" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="formData.desc" label="Description" rows="1" />
              </VCol>
              <VCol cols="12" md="6">
                <TikatDocUpload
                  label="Background Image"
                  :model-value="formData.banner.bgImg?.url"
                  :max-size="1 * 1024 * 1024"
                  form-id="banner"
                  sub-dir="feedback"
                  accept="image/*"
                  hint="Supported formats: JPG, PNG, WebP. Max 1 MB"
                  @upload-complete="payload => formData.banner.bgImg = payload"
                  @update:modelValue="val => { if(!val) formData.banner.bgImg = null }"
                />
              </VCol>
              <VCol cols="12" md="6">
                <TikatDocUpload
                  label="Logo (Aspect ratio : 4/3)"
                  :model-value="formData.banner.logo?.url"
                  :max-size="1 * 1024 * 1024"
                  form-id="banner"
                  sub-dir="feedback"
                  accept="image/*"
                  hint="Supported formats: JPG, PNG, WebP. Max 1 MB"
                  @upload-complete="payload => formData.banner.logo = payload"
                  @update:modelValue="val => { if(!val) formData.banner.logo = null }"
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppSelect
                  v-model="formData.scale"
                  label="Rating Scale"
                  :items="[2, 3, 5, 10]"
                  :disabled="hasTikats"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  v-model="formData.positiveScore"
                  type="number"
                  label="Minimum Score for Positive Feedback (%)"
                  suffix="%"
                  :rules="[v => (v >= 0 && v <= 100) || 'Between 0-100']"
                  placeholder="60"
                  :disabled="hasTikats"
                />
              </VCol>
              <VCol cols="12">
                <div class="text-subtitle-1 font-weight-bold mb-3">Response Segmentation (%)</div>
                
                <VCol cols="12" md="6" class="pa-0 mb-3">
                  <AppTextField
                    v-model="formData.segmentation[0].max"
                    type="number"
                    label="Poor Feedback"
                    :disabled="hasTikats"
                    prefix="<"
                    suffix="%"
                  />
                </VCol>

                <VCol cols="12" md="6" class="pa-0 mb-3">
                  <div class="text-body-2 mb-1">Satisfactory</div>
                  <VRow dense align="center">
                    <VCol cols="5">
                      <AppTextField
                        v-model="formData.segmentation[1].min"
                        suffix=""
                        readonly
                        variant="filled"
                        :disabled="hasTikats"
                        placeholder="Min"
                        density="compact"
                      />
                    </VCol>
                    <VCol cols="2" class="text-center text-h6 pb-4">-</VCol>
                    <VCol cols="5">
                      <AppTextField
                        v-model="formData.segmentation[1].max"
                        type="number"
                        suffix=""
                        placeholder="Max"
                        density="compact"
                        :disabled="hasTikats"
                      />
                    </VCol>
                  </VRow>
                </VCol>

                <VCol cols="12" md="6" class="pa-0 mb-3">
                  <AppTextField
                    v-model="formData.segmentation[2].min"
                    label="Good to Excellent"
                    prefix=">"
                    suffix="%"
                    readonly
                    variant="filled"
                    :disabled="hasTikats"
                  />
                </VCol>
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
                      :disabled="hasTikats"
                      item-title="label"
                      item-value="_id"
                      label="Select a Field"
                      placeholder="Search for a field"
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
                    <VBtn icon="tabler-trash" variant="text" color="error" @click="removeFieldCard(index)" :disabled="field.key === 'name' || hasTikats" />
                  </VCol>
                  <VCol cols="1" md="1" class="text-center">
                    <VIcon class="drag-handle" style="cursor: move;">tabler-grip-vertical</VIcon>
                  </VCol>
                </VRow>

                <div v-if="field.inputType" class="mt-4">
                 <template v-if="field.key === 'question'">
                    <VRow align="center">
                      <VCol cols="12" md="9">
                        <AppTextField 
                          v-model="field.questionText" 
                          label="Enter Question Text" 
                          :rules="[requiredValidator]"
                          :disabled="hasTikats"
                          placeholder="e.g. How likely are you to recommend us?"
                        />
                      </VCol>
                      <VCol cols="12" md="3">
                        <VSwitch 
                          v-model="field.optional"
                          :disabled="hasTikats"
                          label="Optional" 
                          density="compact"
                          class="mt-5"
                        />
                      </VCol>
                    </VRow>
                    <VRow>
                      <VCol cols="12" md="3">
                        <AppTextField 
                          v-model="field.weight"
                          :disabled="hasTikats"
                          type="number" 
                          label="Weight" 
                          placeholder="1"
                          hide-spin-buttons
                          class="no-spinner"
                        />
                      </VCol>
                    </VRow>
                  </template>
                 <template v-else>
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
                 </template>
                 <div v-if="field.key !== 'question'">
                  <VDivider class="my-4" />

                  <h6 class="text-h6 mb-3">Access Control</h6>
                  <VRow v-for="role in ['Contact', 'Moderator', 'Agent']" :key="role" align="center" dense>
                    <VCol cols="3" md="2" class="py-0">
                      <strong>{{ role === 'Contact' ? 'External' : role }}</strong>
                    </VCol>
                    <VCol cols="9" md="10" class="py-0">
                      <VRadioGroup
                        v-model="field.access[role.toLowerCase()]"
                        :disabled="hasTikats"
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
            <VBtn @click="addFieldCard" prepend-icon="tabler-plus" :disabled="hasTikats" variant="tonal">Add Field</VBtn>
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

:deep(.no-spinner input::-webkit-outer-spin-button),
:deep(.no-spinner input::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

</style>