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
import LeadActivities from '@/app-lead/views/admin/leads/LeadActivities.vue';
// import MyPdfUpload from '@/app-lead/views/admin/leads/MyPdfUpload.vue';
import LeadDocUpload from '@/app-lead/views/admin/leads/LeadDocUpload.vue';
import PhoneInputWithCountry from '@/app-lead/@core/components/PhoneCodeWithCountry.vue';

const { show } = inject("snackbar");
const route = useRoute();
const router = useRouter();
const leadsStore = useLeadsStore();
const formsStore = useFormsStore();
const tab = ref('details');

const leadId = computed(() => {
  if (urlParams.value) return null; 
  return route.params.id === 'add' ? null : route.params.id
});
const isLoading = ref(false);
const isFetching = ref(false);
const refForm = ref();

const formList = ref([]);
const selectedFormId = ref(null);
const selectedFormStructure = ref(null);
const leadData = ref({});
const leadHistory = ref([]);
const followups = ref([]);
const currentLeadStageId = ref(null);
const originalLeadData = ref(null);
const closingDate = ref(null);
const assignedTo = ref(null);
const maxDocSize = 5 * 1024 * 1024;

const urlParams = computed(() => {
  const param = route.params.id;
  if (!param || param === 'add') return null;
  
  try {
    const decoded = atob(param);
    if (decoded.includes('=') && decoded.includes(';')) {
      const parsed = {};
      decoded.split(";").forEach(entry => {
        const [key, value] = entry.split("=");
        if (key && value) parsed[key.trim()] = value.trim();
      });
      return parsed;
    }
  } catch (e) {
    return null;
  }
  return null;
});

const phoneValidator = value => {
  if (!value) return true
  const phoneRegex = /^\+[0-9]{8,15}$/; 
  return phoneRegex.test(value) || 'Please select a country code and enter a valid number';
}

const getRules = (field) => {
  const rules = [];
  if (field.optional === false) {
    if (field.inputType === 'BOOLEAN') {
      rules.push(value => (value !== null && value !== undefined) || 'Field is required');
    } else {
      rules.push(requiredValidator);
    }
  }
  if (field.inputType === 'EMAIL') {
    rules.push(emailValidator);
  }
  if (field.inputType === 'PHONE') {
    rules.push(phoneValidator);
  }
  return rules;
}

const isModerator = computed(() => {
  const userRoles = window.CONST?.USER?.role || [];
  return userRoles.includes('MODERATOR');
});

const isAdmin = computed(() => {
  const userRoles = window.CONST?.USER?.role || [];
  return userRoles.includes('ADMIN');
});

const isReadOnly = (field) => {
  if (isAdmin.value && !leadId.value) return false;
  if (isAdmin.value && field.access?.moderator === 'R') return true;
  if (isModerator.value && field.access?.moderator === 'R') {
    return true;
  }
  return false;
};

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
          let currentValue = leadData.value[modelKey];

          if (masterField.inputType === 'BOOLEAN') {
            if (currentValue === undefined || currentValue === null) {
              currentValue = false;
            }
          } else {
            if (currentValue === undefined) {
              currentValue = '';
            }
          }

          newLeadData[modelKey] = currentValue;
        }
      });
    }

    if (!leadId.value) {
        if (urlParams.value) {
            if (urlParams.value.name) newLeadData.name = urlParams.value.name;
            if (urlParams.value.email) newLeadData.email = urlParams.value.email;
            if (urlParams.value.phone) newLeadData.phone = urlParams.value.phone;
            if (urlParams.value.number) newLeadData.phone = urlParams.value.number;
        }

        leadData.value = newLeadData;
        console.log("Initialized leadData for create mode:", JSON.parse(JSON.stringify(newLeadData)));
    } else {
        console.log("Edit mode: Keeping existing leadData:", JSON.parse(JSON.stringify(leadData.value)));
    }

  } catch (error) {
    console.error("Failed to load form structure:", error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to load form structure.'
    show({ message: errorMessage, color: 'error' });
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
  if (!originalLeadData.value) {
    return false;
  }
  const leadEdited = JSON.stringify(originalLeadData.value) !== JSON.stringify(leadData.value);
  return leadEdited;
});

const fetchLeadData = async () => {
  isFetching.value = true;
  try {
    const formsResponse = await formsStore.fetchFormsForDropdown();
    formList.value = formsResponse.results;

    if (leadId.value) {
      const leadDetails = await leadsStore.fetchLead(leadId.value);

      const contactData = leadDetails.contact || {};
      const responseData = leadDetails.response || {};
      leadData.value = { ...responseData, ...contactData }; 
      originalLeadData.value = JSON.parse(JSON.stringify(leadData.value));

      leadHistory.value = leadDetails.leadHistory || [];
      followups.value = leadDetails.followups || [];
      currentLeadStageId.value = leadDetails.leadStage;
      closingDate.value = leadDetails.closingDate || null;
      assignedTo.value = leadDetails.assignedTo || null;

      selectedFormId.value = leadDetails.form?.id || leadDetails.formId;
    } else {
        console.log("Create mode - No lead data to fetch.");
        originalLeadData.value = JSON.parse(JSON.stringify(leadData.value));
    }
  } catch (error) {
    console.error("Failed to load lead data:", error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to load lead data.'
    show({ message: errorMessage, color: 'error' });
    router.push({ name: 'admin-leads-list' });
  } finally {
    isFetching.value = false;
    console.log("fetchLeadData finished.");
  }
};

onMounted(fetchLeadData);
const byUser = window.CONST?.USER?.code || null;

const handleSubmit = async () => {
  const { valid } = await refForm.value.validate();
  if (!valid) { 
    show({ message: 'Please fill in all required fields.', color: 'error' });
    if (!selectedFormId.value && !leadId.value){
         show({ message: 'Please select a form.', color: 'error' });
    }
    return;
  }

  isLoading.value = true;

  const apiData = {};

  if (selectedFormStructure.value && selectedFormStructure.value.formFields) {
    selectedFormStructure.value.formFields.forEach(field => {
      const masterField = selectedFormStructure.value.masterFields[field.field_id];
      if (masterField && masterField.path) {
        const modelKey = masterField.path.split('.')[1];
        const value = leadData.value[modelKey] === '' ? null : leadData.value[modelKey];
         if (value !== null) {
             if (masterField.code === 'name' || masterField.code === 'phone' || masterField.code === 'email') {
                apiData[`contact.${masterField.code}`] = value;
              } else {
                apiData[masterField.path] = value;
              }
         }
      }
    });
  }

  const selectedForm = formList.value.find(f => f._id === selectedFormId.value);

  const payload = {
    formId: selectedFormId.value,
    formTitle: selectedForm ? selectedForm.title : '',
    formCode: selectedForm ? selectedForm.code : '',
    data: apiData,
    byUser: byUser,
  };

  // if (!leadId.value) {
  //   payload.stageCode = "initial"; 
  // }

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
    const errorMessage = error.response?.data?.message || error.message || 'Failed to save lead.'
    show({ message: errorMessage, color: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const fieldsToRender = computed(() => {
  if (!selectedFormStructure.value || !selectedFormStructure.value.formFields) {
    return [];
  }

  return selectedFormStructure.value.formFields
    .map(formField => {
      const masterField = selectedFormStructure.value.masterFields[formField.field_id];
      if (!masterField) return null;
      
      return { 
        ...masterField, 
        access: formField.access 
      };
    })
    .filter(field => {
      if (!field) return false;

      if (isModerator.value && field.access?.moderator === 'H') {
        return false;
      }
      
      return true;
    });
});

const shouldShowLeadProgress = computed(() => route.query.showProgress === 'true');

</script>

<template>
  <VRow>
    <VCol cols="12">
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
                    :initial-closing-date="closingDate"
                    @stage-updated="fetchLeadData"
                    :initial-agent-id="assignedTo"
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
                              label="Customer data"
                              placeholder="Choose a form to generate fields"
                              :rules="[requiredValidator]"
                              :readonly="!!leadId"
                            />
                          </VCol>
                        </VRow>
                        
                        <VDivider class="my-4" v-if="selectedFormStructure" />

                        <div v-if="selectedFormStructure">
                          <VRow>
                            <VCol
                              v-for="field in fieldsToRender"
                              :key="field._id"
                              cols="12"
                              md="6"
                            >
                              <VLabel>
                                {{ field.title }}
                                <span v-if="field.optional === false" class="text-error">*</span>
                              </VLabel>

                              <VTextField
                                v-if="['TEXT', 'EMAIL'].includes(field.inputType)"
                                v-model="leadData[field.path.split('.')[1]]"
                                :placeholder="field.desc"
                                variant="outlined"
                                :rules="getRules(field)"
                                class="mt-2"
                                :disabled="isReadOnly(field)"
                              />

                              <PhoneInputWithCountry
                                v-else-if="field.inputType === 'PHONE'"
                                v-model="leadData[field.path.split('.')[1]]"
                                :placeholder="field.desc"
                                :rules="getRules(field)"
                                class="mt-2"
                                :disabled="isReadOnly(field)"
                              />

                              <AppSelect
                                v-else-if="field.inputType === 'OPTIONS'"
                                v-model="leadData[field.path.split('.')[1]]"
                                :items="field.options"
                                item-title="label"
                                item-value="code"
                                :placeholder="field.desc"
                                :rules="getRules(field)"
                                class="mt-2"
                                :disabled="isReadOnly(field)"
                              />

                              <AppDateTimePicker
                                v-else-if="field.inputType === 'DATE'"
                                v-model="leadData[field.path.split('.')[1]]"
                                :placeholder="field.desc"
                                prepend-inner-icon="tabler-calendar"
                                :rules="getRules(field)"
                                class="mt-2"
                                :disabled="isReadOnly(field)"
                              />

                              <!-- <MyPdfUpload
                                v-else-if="field.inputType === 'DOCUMENT'"
                                :model-value="leadData[field.path.split('.')[1]]?.url || null"
                                :max-size="maxDocSize"
                                class="mt-2"
                                :disabled="isReadOnly(field)"
                                @upload-complete="payload => {
                                  leadData[field.path.split('.')[1]] = {
                                    name: payload.name,
                                    path: payload.path,
                                    url: payload.url,
                                    contentType: payload.contentType,
                                    contentLength: payload.contentLength,
                                    title: payload.title,
                                  }
                                }"
                                @update:modelValue="value => {
                                  if (value === null) {
                                    leadData[field.path.split('.')[1]] = null
                                  }
                                }"
                              /> -->
                              <LeadDocUpload
                                v-else-if="field.inputType === 'DOCUMENT'"
                                :model-value="leadData[field.path.split('.')[1]]?.url || null"
                                :max-size="maxDocSize"
                                :form-id="selectedFormId"
                                sub-dir="main"
                                class="mt-2"
                                :disabled="isReadOnly(field)"
                                @upload-complete="payload => {
                                  leadData[field.path.split('.')[1]] = {
                                    name: payload.name,
                                    path: payload.path,
                                    url: payload.url,
                                    contentType: payload.contentType,
                                    contentLength: payload.contentLength,
                                    title: payload.title,
                                  }
                                }"
                                @update:modelValue="value => {
                                  if (value === null) {
                                    leadData[field.path.split('.')[1]] = null
                                  }
                                }"
                              />
                              
                              <VSwitch
                                v-else-if="field.inputType === 'BOOLEAN'"
                                v-model="leadData[field.path.split('.')[1]]"
                                :rules="getRules(field)"
                                color="primary"
                                class="mt-5"
                                :disabled="isReadOnly(field)"
                                style="transform: scale(1.6); transform-origin: left center;"
                              />

                              <VTextField
                                v-else
                                v-model="leadData[field.path?.split('.')?.[1] || field.code]"
                                :placeholder="field.desc"
                                variant="outlined"
                                disabled
                                hint="Unsupported field type"
                                :rules="getRules(field)"
                                class="mt-2"
                                :disabled="isReadOnly(field)"
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

                <VCol v-if="leadId && selectedFormId" cols="12">
                  <LeadDocs :lead-id="leadId" :form-id="selectedFormId" />
                </VCol>

                <VCol v-if="leadId" cols="12">
                  <LeadActivities 
                    :lead-id="leadId"
                    :followups="followups"
                    :contact="leadData"
                    @activity-added="fetchLeadData" 
                  />
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