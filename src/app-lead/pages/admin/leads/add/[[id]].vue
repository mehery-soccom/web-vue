<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLeadsStore } from '@/app-lead/views/admin/leads/useLeadsStore';
import { useFormsStore } from '@/app-lead/views/admin/forms/useFormsStore';
import AppDateTimePicker from '@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue';
import { emailValidator, requiredValidator } from '@app-lead/@core/utils/validators'
import LeadTimeline from "@/app-lead/views/admin/leads/LeadTimeline.vue";
import LeadStageData from '@/app-lead/views/admin/leads/LeadStageData.vue';
import LeadDocs from '@/app-lead/views/admin/leads/LeadDocs.vue'; 

const { show } = inject("snackbar");
const route = useRoute();
const router = useRouter();
const leadsStore = useLeadsStore();
const formsStore = useFormsStore();
const tab = ref('details');

const leadId = computed(() => route.params.id === 'add' ? null : route.params.id);
const isLoading = ref(false);
const isFetching = ref(false);
const refForm = ref();

const formList = ref([]);
const selectedFormId = ref(null);
const selectedFormStructure = ref(null);
const leadData = ref({});
const leadHistory = ref([]);
const currentLeadStageId = ref(null);
const originalContactData = ref(null);
const originalLeadData = ref(null);

const contactData = ref({
  name: '',
  phone: '',
  email: '',
})

const phoneValidator = value => {
  if (!value) return true
  const phoneRegex = /^[+]?[0-9]{10,15}$/;
  return phoneRegex.test(value) || 'Please enter a valid phone number';
}

const phoneOrEmailRequired = () => {
  return !!contactData.value.phone || !!contactData.value.email || 'Either Phone or Email is required';
}

const loadFormStructure = async (formId) => {

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
          const modelKey = masterField.path.split('.')[1];
          newLeadData[modelKey] = leadData.value[modelKey] === undefined ? null : leadData.value[modelKey];
        }
      });
    }
    if (!leadId.value) {
        leadData.value = newLeadData;
        console.log("Initialized leadData for create mode:", JSON.parse(JSON.stringify(newLeadData)));
    } else {
        console.log("Edit mode: Keeping existing leadData:", JSON.parse(JSON.stringify(leadData.value)));
    }


  } catch (error) {
    console.error("Failed to load form structure:", error);
    show({ message: 'Failed to load form structure.', color: 'error' });
  } finally {
    isFetching.value = false;
    console.log("loadFormStructure finished.");
  }
};

watch(selectedFormId, (newFormId) => {
  if (newFormId) {
    loadFormStructure(newFormId);
  }
});


const isFormEdited = computed(() => {
  if (!leadId.value) {
    return true;
  }
  if (!originalContactData.value || !originalLeadData.value) {
    return false;
  }
  const contactEdited = JSON.stringify(originalContactData.value) !== JSON.stringify(contactData.value);
  const leadEdited = JSON.stringify(originalLeadData.value) !== JSON.stringify(leadData.value);
  return contactEdited || leadEdited;
});

const fetchLeadData = async () => {
  isFetching.value = true;
  try {
    const formsResponse = await formsStore.fetchFormsForDropdown();
    formList.value = formsResponse.results;

    if (leadId.value) {
      const leadDetails = await leadsStore.fetchLead(leadId.value);

      contactData.value = {
          name: leadDetails.contact?.name || '',
          phone: leadDetails.contact?.phone || '',
          email: leadDetails.contact?.email || '',
      };
      originalContactData.value = JSON.parse(JSON.stringify(contactData.value));

      leadData.value = leadDetails.response || {};
      originalLeadData.value = JSON.parse(JSON.stringify(leadData.value));

      leadHistory.value = leadDetails.leadHistory || [];
      currentLeadStageId.value = leadDetails.leadStage;

      selectedFormId.value = leadDetails.formId;
    } else {
        console.log("Create mode - No lead data to fetch.");
        originalContactData.value = JSON.parse(JSON.stringify(contactData.value));
        originalLeadData.value = JSON.parse(JSON.stringify(leadData.value));
    }
  } catch (error) {
    console.error("Failed to load lead data:", error);
    show({ message: 'Failed to load lead data.', color: 'error' });
    router.push({ name: 'admin-leads-list' });
  } finally {
    isFetching.value = false;
    console.log("fetchLeadData finished.");
  }
};

onMounted(fetchLeadData);

const handleSubmit = async () => {
  const { valid } = await refForm.value.validate();
  if (!valid || (!contactData.value.phone && !contactData.value.email)) {
    show({ message: 'Please fill in Name and either Phone or Email.', color: 'error' });
    if (!selectedFormId.value && !leadId.value){
         show({ message: 'Please select a form.', color: 'error' });
    }
    return;
  }

  isLoading.value = true;

  const apiData = {};
  for (const key in contactData.value) {
      const value = contactData.value[key] === '' ? null : contactData.value[key];
      if (value !== null) {
          apiData[`contact.${key}`] = value;
      }
  }

  if (selectedFormStructure.value && selectedFormStructure.value.formFields) {
    selectedFormStructure.value.formFields.forEach(field => {
      const masterField = selectedFormStructure.value.masterFields[field.field_id];
      if (masterField && masterField.path) {
        const modelKey = masterField.path.split('.')[1];
        const value = leadData.value[modelKey] === '' ? null : leadData.value[modelKey];
         if (value !== null) {
             apiData[masterField.path] = value;
         }
      }
    });
  }

  const selectedForm = formList.value.find(f => f._id === selectedFormId.value);

  const payload = {
    formId: selectedFormId.value,
    formTitle: selectedForm ? selectedForm.title : '',
    data: apiData,
  };

  if (!leadId.value) {
    payload.leadStage = "68fb5c0aec8a6bb94018efd2"; 
  }

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

const shouldShowLeadProgress = computed(() => route.query.showProgress === 'true');

</script>

<template>
  <VRow class="justify-center">
    <VCol cols="12" md="8">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ leadId ? 'Overview' : 'Create Lead' }}</VCardTitle>
        </VCardItem>
        <VDivider />

        <VTabs v-if="leadId" v-model="tab" bg-color="transparent">
          <VTab value="details">Details</VTab>
          <VTab value="timeline">Timeline</VTab>
        </VTabs>
        <VDivider v-if="leadId" />

        <VCardText>
          <VWindow v-model="tab">
            <VWindowItem value="details">
              <VRow>

                <VCol v-if="leadId && currentLeadStageId && shouldShowLeadProgress" cols="12">
                  <LeadStageData 
                    :current-stage-id="currentLeadStageId"
                    :lead-id="leadId"
                    @stage-updated="fetchLeadData"
                  />
                </VCol>

                <VCol cols="12">
                  <VCard border elevation="2">
                    <VCardText>
                      <VForm ref="refForm" @submit.prevent="handleSubmit">
                        <VRow>
                          <VCol cols="12">
                            <AppSelect
                              v-model="selectedFormId"
                              :items="formList"
                              item-title="title"
                              item-value="_id"
                              label="Form"
                              placeholder="Choose a form to generate fields"
                              :rules="[requiredValidator]"
                              :readonly="!!leadId"
                            />
                          </VCol>
                        </VRow>
                        
                        <VDivider class="my-4" v-if="selectedFormStructure" />

                        <div v-if="selectedFormStructure">
                          <VRow>
                            <VCol cols="12" md="4">
                                <VLabel class="font-weight-medium">Name <span class="text-error">*</span></VLabel>
                            </VCol>
                            <VCol cols="12" md="8">
                                <AppTextField
                                  v-model="contactData.name"
                                  placeholder="Enter Lead Name"
                                  :rules="[requiredValidator]"
                                />
                            </VCol>
                          </VRow>
                          <VRow>
                            <VCol cols="12" md="4">
                                <VLabel class="font-weight-medium">Phone</VLabel>
                            </VCol>
                              <VCol cols="12" md="8">
                                <AppTextField
                                  v-model="contactData.phone"
                                  placeholder="Enter Phone Number"
                                  :rules="[phoneValidator, phoneOrEmailRequired]"
                                />
                            </VCol>
                          </VRow>
                          <VRow>
                            <VCol cols="12" md="4">
                                <VLabel class="font-weight-medium">Email</VLabel>
                            </VCol>
                            <VCol cols="12" md="8">
                                <AppTextField
                                  v-model="contactData.email"
                                  placeholder="Enter Email Address"
                                  :rules="[emailValidator, phoneOrEmailRequired]"
                                />
                            </VCol>
                          </VRow>

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
                              <AppSelect
                                v-else-if="field.inputType === 'OPTIONS'"
                                v-model="leadData[field.path.split('.')[1]]"
                                :items="field.options"
                                item-title="label"
                                item-value="code"
                                :placeholder="field.desc"
                              />
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
                            <VBtn 
                              type="submit" 
                              :loading="isLoading"
                              :disabled="leadId && !isFormEdited"
                            >
                              {{ leadId ? 'Update Lead' : 'Create Lead' }}
                            </VBtn>
                          </VCol>
                        </VRow>
                      </VForm>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="leadId" cols="12">
                  <LeadDocs :lead-id="leadId" />
                </VCol>
              </VRow>
            </VWindowItem>

            <VWindowItem value="timeline">
              <LeadTimeline :history="leadHistory" />
            </VWindowItem>
          </VWindow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>