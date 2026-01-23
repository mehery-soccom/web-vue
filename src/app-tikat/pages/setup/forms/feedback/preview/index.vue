<script setup>
import { ref, onMounted } from 'vue';
import AppDateTimePicker from '@/app-tikat/@core/components/app-form-elements/AppDateTimePicker.vue';
import { emailValidator, requiredValidator } from '@app-tikat/@core/utils/validators';

const formStructure = ref(null);
const formValues = ref({});

const phoneValidator = value => {
  if (!value) return true;
  const phoneRegex = /^[+]?[0-9]{10,15}$/;
  return phoneRegex.test(value) || 'Please enter a valid phone number';
}

const getRules = (field) => {
  const rules = [];
  
  if (field.optional === false) {
    if (field.inputType === 'BOOLEAN') {
      rules.push(value => (value !== null && value !== undefined) || 'This field is required');
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

onMounted(() => {
  const data = sessionStorage.getItem('form-preview-data');
  if (data) {
    try {
      formStructure.value = JSON.parse(data);

      const initialValues = {};

      if (formStructure.value && formStructure.value.fields) {
        formStructure.value.fields.forEach(field => {
          const dataKey = field.key;
          
          if (field.inputType === 'BOOLEAN') {
                initialValues[dataKey] = false;
            } else if (field.inputType === 'RATING') {
                initialValues[dataKey] = 0;
            } else {
                initialValues[dataKey] = null;
            }
        });
      }
      formValues.value = initialValues;

    } catch (e) {
      console.error("Failed to parse form preview data:", e);
      formStructure.value = null;
    }
  }
});

const submitForm = () => {
  console.log('Form Values mapped by key:', formValues.value);
}
</script>

<template>
  <VContainer fluid class="layout-wrapper layout-blank">
    <VRow class="justify-center">
      <VCol cols="12" md="7">
        <VForm v-if="formStructure" @submit.prevent="submitForm">
          
          <VCard class="mb-6">
            <VCardItem class="text-left">
              <VCardTitle class="text-h4 pt-4">{{ formStructure.name }}</VCardTitle>
              <VCardSubtitle
                v-if="formStructure.desc"
                class="mt-2 font-italic"
              >
                {{ formStructure.desc }}
              </VCardSubtitle>
            </VCardItem>
          </VCard>

          <VCard
            v-for="field in formStructure.fields"
            :key="field._id"
            class="my-4"
          >
            <VCardText>
              <VLabel class="mb-2 font-weight-medium text-high-emphasis">
                {{ field.label }}
                <span v-if="field.optional === false" class="text-error ms-1">*</span>
              </VLabel>

              <VRow v-if="['TEXT', 'EMAIL', 'PHONE'].includes(field.inputType)">
                <VCol cols="12" md="10">
                  <AppTextField
                    v-model="formValues[field.key]"
                    :placeholder="field.desc"
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'OPTIONS'">
                <VCol cols="12" md="10">
                  <AppSelect
                    v-model="formValues[field.key]"
                    :items="field.options"
                    item-title="label"
                    item-value="code"
                    :placeholder="field.desc || 'Select an option'"
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'DATE'">
                <VCol cols="12" md="6">
                  <AppDateTimePicker
                    v-model="formValues[field.key]"
                    :placeholder="field.desc || 'Select date'"
                    prepend-inner-icon="tabler-calendar"
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'DOCUMENT'">
                <VCol cols="12" md="10">
                  <VFileInput
                    v-model="formValues[field.key]"
                    :placeholder="field.desc || 'Upload a file'"
                    variant="outlined"
                    density="compact"
                    chips
                    prepend-icon=""
                    prepend-inner-icon="tabler-file-upload"
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <div v-else-if="field.inputType === 'BOOLEAN'">
                <VSwitch
                  v-model="formValues[field.key]"
                  :rules="getRules(field)"
                  color="primary"
                  density="compact"
                  class="mt-1"
                  style="transform: scale(1.6); transform-origin: left center;"
                />
              </div>

              <VRow v-else-if="field.inputType === 'RATING'">
                <VCol cols="12">
                    <VRating
                      v-model="formValues[field.key]"
                      :length="5"
                      :size="42"
                      color="warning"
                      active-color="warning"
                      hover
                      density="comfortable"
                      :rules="getRules(field)"
                    />
                </VCol>
              </VRow>

              <VRow v-else>
                <VCol cols="12">
                  <VTextField
                    v-model="formValues[field.key]"
                    :placeholder="field.desc"
                    variant="outlined"
                    disabled
                    persistent-hint
                    hint="Unsupported preview for this field type"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <VBtn class="mt-6" type="submit" variant="elevated" color="primary" block>
            Submit
          </VBtn>
        </VForm>

        <div v-else class="text-center mt-10">
          <VAlert type="error" variant="tonal">
            No valid form data found to preview.
          </VAlert>
        </div>
      </VCol>
    </VRow>
  </VContainer>
</template>

<style>
.layout-blank {
  background-color: var(--v-theme-background) !important;
  min-height: 100vh;
  padding-bottom: 50px;
}
</style>