<script setup>
import { ref, onMounted } from 'vue';
import AppDateTimePicker from '@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue';

const formStructure = ref(null);
const formValues = ref({});

onMounted(() => {
  const data = sessionStorage.getItem('form-preview-data');
  if (data) {
    try {
      formStructure.value = JSON.parse(data);

      if (formStructure.value && formStructure.value.fields) {
        formStructure.value.fields.forEach(field => {
          formValues.value[field.code] = null;
        });
      }
    } catch (e) {
      console.error("Failed to parse form preview data:", e);
      formStructure.value = null;
    }
  }
});

const submitForm = () => {
  alert('This is a preview. Form data would be submitted now. Check the console for values.');
  console.log('Form Values:', formValues.value);
}
</script>

<template>
  <VContainer >
    <VRow class="justify-center">
      <VCol cols="12" md="7">
        <VForm v-if="formStructure" @submit.prevent="submitForm">
          <VCard class="mb-6">
            <VCardItem class="text-left">
              <VCardTitle class="text-h3 pt-4">{{ formStructure.title }}</VCardTitle>
              <VCardSubtitle v-if="formStructure.desc" class="mt-2 font-italic">{{ formStructure.desc }}</VCardSubtitle>
            </VCardItem>
          </VCard>

          <VCard
            v-for="field in formStructure.fields"
            :key="field._id"
            class="my-4"
          >
            <VCardText>
              <VLabel class="mb-2 font-weight-medium">{{ field.title }}</VLabel>

              <VRow v-if="['TEXT', 'EMAIL', 'PHONE'].includes(field.inputType)">
                <VCol md="8">
                  <VTextField
                    v-model="formValues[field.code]"
                    :placeholder="field.desc"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
              
              <VRadioGroup 
                v-else-if="field.inputType === 'OPTIONS'" 
                v-model="formValues[field.code]"
              >
                <VRadio
                  v-for="option in field.options"
                  :key="option.code"
                  :label="option.label"
                  :value="option.code"
                />
              </VRadioGroup>

              <VRow v-else-if="field.inputType === 'DATE'">
                <VCol md="4">
                  <AppDateTimePicker
                    v-model="formValues[field.code]"
                    :placeholder="field.desc"
                    prepend-inner-icon="tabler-calendar"
                  />
                </VCol>
              </VRow>
              
             <VRow v-else-if="field.inputType === 'DOCUMENT'">
              <VCol md="6">
                <VFileInput
                  v-model="formValues[field.code]"
                  :label="field.desc || 'Upload a file'"
                  variant="outlined"
                  chips
                />
              </VCol>
             </VRow>

              <VSwitch
                v-else-if="field.inputType === 'BOOLEAN'"
                v-model="formValues[field.code]"
                :label="field.title"
                class="ms-n3"
              />

              <VTextField
                v-else
                v-model="formValues[field.code]"
                :placeholder="field.desc"
                variant="outlined"
                disabled
                hint="Unsupported field type"
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

