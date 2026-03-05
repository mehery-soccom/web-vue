<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFeedbackStore } from '@/app-tikat/views/admin/feedback/useFeedbackStore';
import { useFormsStore } from '@/app-tikat/views/setup/forms/useFormsStore';
import AppDateTimePicker from '@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue';
import { emailValidator, requiredValidator } from '@app-tikat/@core/utils/validators';
import TikatDocUpload from '@/app-tikat/views/admin/feedback/TikatDocUpload.vue';
import TikatDocs from '@/app-tikat/views/admin/feedback/TikatDocs.vue';
import FeedbackStatusData from '@/app-tikat/views/admin/feedback/FeedbackStatusData.vue';
import TikatFollowups from '@/app-tikat/views/admin/feedback/TikatFollowups.vue';
import PhoneCodeWithCountry from '@/app-tikat/@core/components/PhoneCodeWithCountry.vue';

const { show } = inject("snackbar");
const route = useRoute();
const router = useRouter();
const feedbackStore = useFeedbackStore();
const formsStore = useFormsStore();
const feedbackNotes = ref([]);
const feedbackDocs = ref([]);
const feedbackFollowups = ref([]);
const assigneeId = ref(null);
const currentStatus = ref(null);

const tab = ref('details');
const isLoading = ref(false);
const isFetching = ref(false);
const refForm = ref();

const feedbackId = computed(() => route.params.id === 'add' ? null : route.params.id);

const formList = ref([]);
const selectedFormId = ref(null);
const selectedFormStructure = ref(null);
const feedbackData = ref({});
const originalFeedbackData = ref(null);
const feedbackHistory = ref([]);

const byUser = window.CONST?.USER?.user || null;

const phoneValidator = value => {
  if (!value) return true;
  const phoneRegex = /^\+[0-9]{8,15}$/
  return phoneRegex.test(value) || "Please select a country code and enter a valid phone number"
};

const getRules = (field) => {
  const rules = [];
  if (field.optional === false) {
    if (field.inputType === 'BOOLEAN') {
      rules.push(value => (value !== null && value !== undefined) || 'Field is required');
    } else {
      rules.push(requiredValidator);
    }
  }
  if (field.inputType === 'EMAIL') rules.push(emailValidator);
  if (field.inputType === 'PHONE') rules.push(phoneValidator);
  return rules;
};

const loadFormStructure = async (formId) => {
  if (!formId) return
  isFetching.value = true
  try {
    const formDetails = await formsStore.fetchForm(formId)
    selectedFormStructure.value = formDetails

    const newData = { ...feedbackData.value }
    const masterFieldsArr = formDetails.masterFields || []
    
    if (formDetails.formFields) {
      formDetails.formFields.forEach(field => {
        const masterField = masterFieldsArr.find(m => m.field_id === field.id)
        if (masterField) {
          const modelKey = masterField.key
          if (newData[modelKey] === undefined) {
            newData[modelKey] = masterField.inputType === 'BOOLEAN' ? false : ''
          }
        }
      })
    }
    if (formDetails.questions) {
      formDetails.questions.forEach((q, idx) => {
        const qKey = `q_${idx}`;
        if (newData[qKey] === undefined) newData[qKey] = 0;
      });
    }
    feedbackData.value = newData
    if (!feedbackId.value) {
      originalFeedbackData.value = JSON.parse(JSON.stringify(newData))
    }
  } finally {
    isFetching.value = false
  }
}

const isAdmin = computed(() => {
  const userRoles = window.CONST?.USER?.role || [];
  return userRoles.includes('ADMIN');
});

const isModerator = computed(() => {
  const userRoles = window.CONST?.USER?.role || [];
  return userRoles.includes('MODERATOR');
});

const isUserRole = computed(() => {
  const userRoles = window.CONST?.USER?.role || [];
  return userRoles.includes('USER');
});

const isReadOnly = (field) => {
  if (isAdmin.value && !feedbackId.value) return false;
  if (isAdmin.value && field.access?.moderator === 'R') return true;
  if (isModerator.value && field.access?.moderator === 'R') return true;
  if (isUserRole.value && field.access?.agent === 'R') return true;
  
  return false;
};

watch(selectedFormId, (newId) => {
  if (newId && !feedbackId.value) {
    loadFormStructure(newId);
  }
});

const isFormEdited = computed(() => {
  if (!feedbackId.value) return true;
  return JSON.stringify(originalFeedbackData.value) !== JSON.stringify(feedbackData.value);
});

const fetchFeedbackData = async () => {
  isFetching.value = true
  try {
    const formsResponse = await formsStore.fetchFormsForDropdown()
    formList.value = formsResponse.results.filter(form => form.isActive !== "false")

    if (feedbackId.value) {
      const response = await feedbackStore.fetchFeedback(feedbackId.value)
      const data = response.results ? response.results[0] : response 

      assigneeId.value = data.assignee?.code || null
      currentStatus.value = data.status

      feedbackData.value = { 
        ...(data.response || {}), 
        ...(data.contact || {}) 
      }
      if (data.questions) {
        data.questions.forEach((q, idx) => {
          const qKey = `q_${idx}`;
          feedbackData.value[qKey] = q.value || 0;
        });
      }
      originalFeedbackData.value = JSON.parse(JSON.stringify(feedbackData.value))

      feedbackNotes.value = data.notes || []
      feedbackDocs.value = data.documents || []
      feedbackFollowups.value = data.followups || []
      
      selectedFormId.value = data.form?.id
      await loadFormStructure(selectedFormId.value)
    }
  } finally {
    isFetching.value = false
  }
}

const handleSubmit = async () => {
  const { valid } = await refForm.value.validate()
  if (!valid) {
    show({ message: 'Please fill all required fields.', color: 'error' }) 
    return
  }

  isLoading.value = true

  const apiData = {}
  fieldsToRender.value.forEach(field => {
    const value = feedbackData.value[field.key]
    if (value !== undefined && value !== null && value !== '') {
      if (['name', 'email', 'phone'].includes(field.key)) {
        apiData[`contact.${field.key}`] = value
      } else {
        apiData[`custom.${field.key}`] = value
      }
    }
  })

  const questionPayload = (selectedFormStructure.value?.questions || []).map((q, idx) => ({
    question: q.question,
    value: feedbackData.value[`q_${idx}`] || 0,
    weight: q.weight,
    order: q.order,
    optional: q.optional
  }))

  apiData.questions = questionPayload

  const selectedForm = formList.value.find(f => f._id === selectedFormId.value)

  const payload = {
    formId: selectedFormId.value,
    formTitle: selectedForm?.name || '',
    formCode: selectedForm?.key || '',
    data: apiData,
    status: currentStatus.value || 'OPEN',
    byUser: byUser,
    scale: selectedFormStructure.value?.scale || 5,
    segmentation: selectedFormStructure.value?.segmentation || [],
  }

  try {
    if (feedbackId.value) {
      await feedbackStore.updateFeedback({ id: feedbackId.value, data: payload })
      show({ message: 'Feedback updated successfully!', color: 'success' })
    } else {
      await feedbackStore.createFeedback(payload)
      show({ message: 'Feedback created successfully!', color: 'success' })
    }
    router.push({ name: 'admin-feedbacks-list' })
  } catch (error) {
    show({ message: 'Failed to save feedback.', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const fieldsToRender = computed(() => {
  if (!selectedFormStructure.value || !selectedFormStructure.value.formFields) return [];
  
  const masterFieldsArr = selectedFormStructure.value.masterFields || [];
  
  return selectedFormStructure.value.formFields.map(ff => {
    const master = masterFieldsArr.find(m => m.field_id === ff.id);
    return master ? { ...master, access: ff.access } : null;
  }).filter(f => {
    if (!f) return false;
    if (isModerator.value && f.access?.moderator === 'H') return false;
    if (isUserRole.value && f.access?.agent === 'H') return false;
    return true;
  });
});

onMounted(fetchFeedbackData);
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ feedbackId ? 'Feedback Details' : 'Create Feedback' }}</VCardTitle>
        </VCardItem>
        <VDivider />

        <VTabs v-if="feedbackId" v-model="tab">
          <VTab value="details">Details</VTab>
          <!-- <VTab value="timeline">Timeline</VTab> -->
        </VTabs>
        <VDivider v-if="feedbackId" />

        <VCardText>
          <VWindow v-model="tab">
            <VWindowItem value="details">
              <VRow>
                <VCol v-if="feedbackId" cols="12">
                  <FeedbackStatusData 
                    :feedback-id="feedbackId"
                    :initial-status-id="currentStatus"
                    :initial-agent-id="assigneeId"
                    @updated="fetchFeedbackData"
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
                              item-title="name"
                              item-value="_id"
                              label="Customer Data"
                              placeholder="Choose a form to generate fields"
                              :rules="[requiredValidator]"
                              :readonly="!!feedbackId"
                            />
                          </VCol>
                        </VRow>

                        <VDivider v-if="selectedFormStructure" class="my-4" />

                        <div v-if="selectedFormStructure">
                          <VRow>
                            <VCol
                              v-for="field in fieldsToRender"
                              :key="field.field_id"
                              cols="12"
                              md="6"
                            >
                              <VLabel class="mb-1 text-body-2 text-high-emphasis">
                                {{ field.label }}
                                <span v-if="field.optional === false" class="text-error">*</span>
                              </VLabel>

                              <VTextField
                                v-if="['TEXT', 'EMAIL'].includes(field.inputType)"
                                v-model="feedbackData[field.key]"
                                :placeholder="field.label"
                                :rules="getRules(field)"
                                variant="outlined"
                                :disabled="isReadOnly(field)"
                              />

                              <PhoneCodeWithCountry
                                v-else-if="field.inputType === 'PHONE'"
                                v-model="feedbackData[field.key]"
                                :placeholder="field.label"
                                :rules="getRules(field)"
                                :disabled="isReadOnly(field)"
                              />

                              <AppSelect
                                v-else-if="field.inputType === 'OPTIONS'"
                                v-model="feedbackData[field.key]"
                                :items="field.options"
                                item-title="label"
                                item-value="code"
                                :placeholder="field.label"
                                :rules="getRules(field)"
                                :disabled="isReadOnly(field)"
                              />

                              <AppDateTimePicker
                                v-else-if="field.inputType === 'DATE'"
                                v-model="feedbackData[field.key]"
                                :placeholder="field.label"
                                :rules="getRules(field)"
                                prepend-inner-icon="tabler-calendar"
                                :disabled="isReadOnly(field)"
                              />

                              <VSwitch
                                v-else-if="field.inputType === 'BOOLEAN'"
                                v-model="feedbackData[field.key]"
                                :rules="getRules(field)"
                                color="primary"
                                class="mt-5"
                                :disabled="isReadOnly(field)"
                                style="transform: scale(1.6); transform-origin: left center;"
                              />

                              <TikatDocUpload
                                v-else-if="field.inputType === 'DOCUMENT'"
                                :model-value="feedbackData[field.key]?.url || null"
                                :max-size="5 * 1024 * 1024"
                                :form-id="selectedFormId"
                                :disabled="isReadOnly(field)"
                                sub-dir="feedback"
                                class="mt-2"
                                @upload-complete="payload => {
                                  feedbackData[field.key] = {
                                    name: payload.name,
                                    path: payload.path,
                                    url: payload.url,
                                    contentType: payload.contentType,
                                    contentLength: payload.contentLength,
                                    title: payload.title,
                                  }
                                }"
                                @update:modelValue="value => {
                                  if (value === null) feedbackData[field.key] = null
                                }"
                              />

                              <div v-else-if="field.inputType === 'RATING'" class="d-flex align-center gap-2">
                                <VRating
                                  v-model="feedbackData[field.key]"
                                  hover
                                  color="warning"
                                  active-color="warning"
                                  :disabled="isReadOnly(field)"
                                  class="large-rating"
                                />
                              </div>

                              <VTextField
                                v-else
                                v-model="feedbackData[field.key]"
                                disabled
                                hint="Unsupported Type"
                              />
                            </VCol>
                          </VRow>
                          <div v-if="selectedFormStructure.questions?.length" class="mt-6">
                            <VRow>
                              <VCol 
                                v-for="(q, idx) in selectedFormStructure.questions" 
                                :key="idx" 
                                cols="12" 
                                md="6"
                              >
                                <VLabel class="mb-1 text-body-2 text-high-emphasis d-block">
                                  {{ q.question }}
                                  <span v-if="q.optional === false" class="text-error ms-1">*</span>
                                </VLabel>
                                <VRating
                                  v-model="feedbackData[`q_${idx}`]"
                                  hover
                                  :length="selectedFormStructure.scale || 5"
                                  color="warning"
                                  active-color="warning"
                                  class="large-rating"
                                  :disabled="isReadOnly({ access: { moderator: 'W', agent: 'W' } })" 
                                />
                              </VCol>
                            </VRow>
                          </div>
                        </div>

                        <VRow>
                          <VCol class="d-flex gap-4 mt-6">
                            <VSpacer />
                            <VBtn
                              color="secondary"
                              variant="tonal"
                              :to="{ name: 'admin-feedbacks-list' }"
                            >
                              Cancel
                            </VBtn>
                            <VBtn 
                              type="submit" 
                              :loading="isLoading" 
                              :disabled="(feedbackId && !isFormEdited) || !selectedFormId"
                            >
                              {{ feedbackId ? 'Update Feedback' : 'Create Feedback' }}
                            </VBtn>
                          </VCol>
                        </VRow>
                      </VForm>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="feedbackId" cols="12" class="mt-4">
                  <TikatDocs 
                    :feedback-id="feedbackId" 
                    :form-id="selectedFormId" 
                    :notes="feedbackNotes"
                    :documents="feedbackDocs"
                    @refresh="fetchFeedbackData"
                  />
                </VCol>

                <VCol v-if="feedbackId && selectedFormId" cols="12" class="mt-4">
                  <TikatFollowups 
                    :feedback-id="feedbackId"
                    :form-id="selectedFormId"
                    :followups="feedbackFollowups"
                    :contact="feedbackData"
                    @refresh="fetchFeedbackData"
                  />
                </VCol>
              </VRow>
            </VWindowItem>

            <!-- <VWindowItem value="timeline">
              <div class="pa-4 text-center">
                <VIcon size="48" icon="tabler-clock" color="disabled" class="mb-2" />
                <p class="text-h6">Hi</p>
                <p class="text-body-2">Timeline tracking will be implemented soon.</p>
              </div>
            </VWindowItem> -->
          </VWindow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>

.large-rating :deep(.v-icon) {
  font-size: 35px !important;
  width: 35px !important;
  height: 35px !important;
}

</style>