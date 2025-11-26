<script setup>
import { ref, onMounted } from 'vue';
import AppDateTimePicker from '@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue';
import { emailValidator, requiredValidator } from '@app-lead/@core/utils/validators';

const formStructure = ref(null);
const formValues = ref({});

const phoneValidator = value => {
  if (!value) return true 
  const phoneRegex = /^[+]?[0-9]{10,15}$/;
  return phoneRegex.test(value) || 'Please enter a valid phone number';
}

const getRules = (field) => {
  const rules = [];

  if (field.inputType === 'BOOLEAN') {
    rules.push(value => (value !== null && value !== undefined) || 'Field is required');
  } else {
    rules.push(requiredValidator);
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
          const key = field.path || field.code;
          
          if (field.inputType === 'BOOLEAN') {
            initialValues[key] = false;
          } else {
            initialValues[key] = null;
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
  // alert('This is a preview. Form data would be submitted now. Check the console for values.');
  // console.log('Form Values:', formValues.value);
}
</script>

<template>
  <VContainer>
    <VRow class="justify-center">
      <VCol cols="12" md="7">
        <VForm v-if="formStructure" @submit.prevent="submitForm">
          <VCard class="mb-6">
            <VCardItem class="text-left">
              <VCardTitle class="text-h3 pt-4">{{ formStructure.title }}</VCardTitle>
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
              <VLabel class="mb-2 font-weight-medium">
                {{ field.title }}
                <span v-if="field.optional === false" class="text-error">*</span>
              </VLabel>

              <!-- TEXT / EMAIL / PHONE -->
              <VRow v-if="['TEXT', 'EMAIL', 'PHONE'].includes(field.inputType)">
                <VCol md="8">
                  <VTextField
                    v-model="formValues[field.path || field.code]"
                    :placeholder="field.desc"
                    variant="outlined"
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'OPTIONS'">
                <VCol md="8">
                  <AppSelect
                    v-model="formValues[field.path || field.code]"
                    :items="field.options"
                    item-title="label"
                    item-value="code"
                    :placeholder="field.desc"
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'DATE'">
                <VCol md="4">
                  <AppDateTimePicker
                    v-model="formValues[field.path || field.code]"
                    :placeholder="field.desc"
                    prepend-inner-icon="tabler-calendar"
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'DOCUMENT'">
                <VCol md="6">
                  <VFileInput
                    v-model="formValues[field.path || field.code]"
                    :label="field.desc || 'Upload a file'"
                    variant="outlined"
                    chips
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <VSwitch
                v-else-if="field.inputType === 'BOOLEAN'"
                v-model="formValues[field.path || field.code]"
                :rules="getRules(field)"
                color="primary"
                class="mt-2"
                style="transform: scale(1.6); transform-origin: left center;"
              />

              <VTextField
                v-else
                v-model="formValues[field.path || field.code]"
                :placeholder="field.desc"
                variant="outlined"
                disabled
                hint="Unsupported field type"
                :rules="getRules(field)"
              />
            </VCardText>
          </VCard>

          <VBtn class="mt-6" type="submit" block>Submit</VBtn>
        </VForm>

        <div v-else class="text-center mt-10">
          <VAlert type="error" variant="tonal">
            No form data found to preview or the data is invalid. Please go back and try again.
          </VAlert>
        </div>
      </VCol>
    </VRow>
  </VContainer>
</template>

<style>
.layout-wrapper.layout-blank {
  background-color: #f4f5fa;
}
</style>


