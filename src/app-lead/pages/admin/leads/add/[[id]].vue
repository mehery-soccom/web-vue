<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLeadsStore } from '@/app-lead/views/admin/leads/useLeadsStore';
import { useFormsStore } from '@/app-lead/views/admin/forms/useFormsStore';
import AppDateTimePicker from '@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue';
import { requiredValidator } from '@app-lead/@core/utils/validators'

const { show } = inject("snackbar");
const route = useRoute();
const router = useRouter();
const leadsStore = useLeadsStore();
const formsStore = useFormsStore();

const leadId = computed(() => route.params.id === 'add' ? null : route.params.id);
const isLoading = ref(false);
const isFetching = ref(false);
const refForm = ref();

const formList = ref([]);
const selectedFormId = ref(null);
const selectedFormStructure = ref(null);
const leadData = ref({});

const loadFormStructure = async (formId) => {
  if (leadId.value) return;

  if (!formId) {
    selectedFormStructure.value = null;
    leadData.value = {};
    return;
  }
  isFetching.value = true;
  try {
    const formDetails = await formsStore.fetchForm(formId);
    selectedFormStructure.value = formDetails;

    const newLeadData = {};
    if (formDetails.formFields) {
      formDetails.formFields.forEach(field => {
        const masterField = formDetails.masterFields[field.field_id];
        if (masterField && masterField.path) {
          newLeadData[masterField.path] = leadData.value[masterField.path] || null;
        }
      });
    }
    leadData.value = newLeadData;

  } catch (error) {
    show({ message: 'Failed to load form structure.', color: 'error' });
  } finally {
    isFetching.value = false;
  }
};

watch(selectedFormId, (newFormId) => {
  if (newFormId) {
    loadFormStructure(newFormId);
  }
});

onMounted(async () => {
  isFetching.value = true;
  try {
    const formsResponse = await formsStore.fetchFormsForDropdown();
    formList.value = formsResponse.results;

    if (leadId.value) {
      const existingLead = await leadsStore.fetchLead(leadId.value);
      leadData.value = existingLead.response || {};
      selectedFormStructure.value = existingLead.formId;
      selectedFormId.value = existingLead.formId._id;
    }
  } catch (error) {
    show({ message: 'Failed to load lead data.', color: 'error' });
    router.push({ name: 'admin-leads-list' });
  } finally {
    isFetching.value = false;
  }
});

const handleSubmit = async () => {
  const { valid } = await refForm.value.validate();
  if (!valid || !selectedFormId.value) {
    show({ message: 'Please select a form and fill in all required fields.', color: 'error' });
    return;
  }

  isLoading.value = true;

  const apiData = {};
  if (selectedFormStructure.value && selectedFormStructure.value.formFields) {
    selectedFormStructure.value.formFields.forEach(field => {
      const masterField = selectedFormStructure.value.masterFields[field.field_id];
      if (masterField && masterField.path) {
        const modelKey = masterField.path.split('.')[1];
        apiData[masterField.path] = leadData.value[modelKey];
      }
    });
  }

  const selectedForm = formList.value.find(f => f._id === selectedFormId.value);

  const payload = {
    formId: selectedFormId.value,
    formTitle: selectedForm ? selectedForm.title : '',
    data: apiData,
  };

  try {
    if (leadId.value) {
      await leadsStore.updateLead({ id: leadId.value, data: payload });
      show({ message: 'Lead updated successfully!', color: 'success' });
    } else {
      await leadsStore.createLead(payload);
      show({ message: 'Lead created successfully!', color: 'success' });
    }
    router.push({ name: 'admin-leads-list' });
  } catch (error) {
    show({ message: error.message || 'Failed to save lead.', color: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const fieldsToRender = computed(() => {
  if (!selectedFormStructure.value || !selectedFormStructure.value.formFields) {
    return [];
  }

  return selectedFormStructure.value.formFields
    .map(field => selectedFormStructure.value.masterFields[field.field_id])
    .filter(masterField => !!masterField);
});

</script>

<template>
  <VRow class="justify-center">
    <VCol cols="12" md="8">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ leadId ? 'Edit Lead' : 'Create Lead' }}</VCardTitle>
        </VCardItem>
        <VDivider />

        <VCardText>
          <VForm ref="refForm" @submit.prevent="handleSubmit">
            <VRow>
              <VCol cols="12">
                <AppSelect
                  v-model="selectedFormId"
                  :items="formList"
                  item-title="title"
                  item-value="_id"
                  label="Select a Form"
                  placeholder="Choose a form to generate fields"
                  :rules="[requiredValidator]"
                  :readonly="!!leadId"
                />
              </VCol>
            </VRow>
            
            <VDivider class="my-4" v-if="selectedFormStructure" />

            <div v-if="selectedFormStructure">
              <VRow 
                v-for="field in fieldsToRender" 
                :key="field._id" 
                align="center"
              >
                <VCol cols="12" md="4">
                  <VLabel>{{ field.title }}</VLabel>
                </VCol>
                <VCol cols="12" md="8">
                  <VTextField
                    v-if="['TEXT', 'EMAIL', 'PHONE'].includes(field.inputType)"
                    v-model="leadData[field.path.split('.')[1]]"
                    :placeholder="field.desc"
                    variant="outlined"
                  />
                  <VRadioGroup 
                    v-else-if="field.inputType === 'OPTIONS'" 
                    v-model="leadData[field.path.split('.')[1]]"
                    inline
                  >
                    <VRadio
                      v-for="option in field.options"
                      :key="option.code"
                      :label="option.label"
                      :value="option.code"
                    />
                  </VRadioGroup>
                  <AppDateTimePicker
                    v-else-if="field.inputType === 'DATE'"
                    v-model="leadData[field.path.split('.')[1]]"
                    :placeholder="field.desc"
                  />
                  <VFileInput
                    v-else-if="field.inputType === 'DOCUMENT'"
                    v-model="leadData[field.path.split('.')[1]]"
                    :label="field.desc || 'Upload'"
                    variant="outlined"
                  />
                  <VSwitch
                    v-else-if="field.inputType === 'BOOLEAN'"
                    v-model="leadData[field.path.split('.')[1]]"
                    :label="field.title"
                  />
                </VCol>
              </VRow>
            </div>
            
            <VRow>
              <VCol class="d-flex gap-4 mt-6">
                <VSpacer />
                <VBtn
                  color="secondary"
                  variant="tonal"
                  :to="{ name: 'admin-leads-list' }"
                >
                  Cancel
                </VBtn>
                <VBtn type="submit" :loading="isLoading">{{ leadId ? 'Update Lead' : 'Create Lead' }}</VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>