<script setup>
import { ref, onMounted, computed } from 'vue';
import AppDateTimePicker from '@/app-tikat/@core/components/app-form-elements/AppDateTimePicker.vue';
import { emailValidator, requiredValidator } from '@app-tikat/@core/utils/validators';
import PhoneCodeWithCountry from '@/app-tikat/@core/components/PhoneCodeWithCountry.vue';

const formStructure = ref(null);
const formValues = ref({});

const phoneValidator = value => {
  if (!value) return true;
  const phoneRegex = /^\+[0-9]{8,15}$/;
  return phoneRegex.test(value) || 'Please select a country code and enter a valid phone number';
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

const cardBackgroundStyle = computed(() => {
  const bgUrl = formStructure.value?.banner?.bgImg?.url;
  if (!bgUrl) return { backgroundColor: 'rgb(var(--v-theme-surface))' };
  
  return {
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
    color: 'white',
    zIndex: 0
  };
});

onMounted(() => {
  const data = sessionStorage.getItem('form-preview-data');
  if (data) {
    try {
      formStructure.value = JSON.parse(data);

      const initialValues = {};

      if (formStructure.value.fields) {
        formStructure.value.fields.forEach(field => {
          initialValues[field.key] = field.inputType === 'BOOLEAN' ? false : (field.inputType === 'RATING' ? 0 : '');
        });
      }

      if (formStructure.value.questions) {
        formStructure.value.questions.forEach((q, index) => {
          initialValues[`question_${index}`] = 0; 
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
          
          <VCard class="mb-6 overflow-hidden preview-card-header" :style="cardBackgroundStyle" elevation="2">
            <div 
              class="d-flex align-center pa-6" 
              :class="{ 'image-overlay': formStructure.banner?.bgImg?.url }"
            >
              <div v-if="formStructure.banner?.logo?.url" class="banner-image me-4">
                <img :src="formStructure.banner.logo.url" class="banner-media-item" />
              </div>

              <div class="flex-grow-1">
                <VCardTitle class="text-h4 pa-0 font-weight-bold" :class="{'text-white': formStructure.banner?.bgImg?.url}">
                  {{ formStructure.name }}
                </VCardTitle>
                <VCardSubtitle
                  v-if="formStructure.desc"
                  class="mt-1 pa-0 opacity-90"
                  :style="formStructure.banner?.bgImg?.url ? 'color: rgba(255,255,255,0.9) !important' : ''"
                >
                  {{ formStructure.desc }}
                </VCardSubtitle>
              </div>
            </div>
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

              <VRow v-if="['TEXT', 'EMAIL'].includes(field.inputType)">
                <VCol cols="12" md="10">
                  <AppTextField
                    v-model="formValues[field.key]"
                    :placeholder="field.desc"
                    :rules="getRules(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'PHONE'">
                <VCol cols="12" md="10">
                  <PhoneCodeWithCountry
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
                      density="default"
                      :rules="getRules(field)"
                      class="large-rating"
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

          <template v-if="formStructure.questions && formStructure.questions.length">
            <VCard v-for="(q, index) in formStructure.questions" :key="index" class="my-4">
              <VCardText>
                <VLabel class="mb-2 font-weight-medium text-high-emphasis">
                  {{ q.questionText || q.label }}
                  <span v-if="q.optional === false" class="text-error ms-1">*</span>
                </VLabel>

                <VRow>
                  <VCol cols="12">
                    <VRating
                      v-model="formValues[`question_${index}`]"
                      :length="formStructure.scale || 5"
                      :size="42"
                      color="warning"
                      active-color="warning"
                      hover
                      class="large-rating"
                    />
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>
          </template>

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

<style scoped>
.banner-image {
  flex-shrink: 0;
  width: 75px;
  height: 75px;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-media-item {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.preview-card-header {
  position: relative;
  overflow: hidden !important;
  border: none !important;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.image-overlay {
  background: rgba(0, 0, 0, 0.3);
  width: 100%;
  height: 100%;
  flex-grow: 1;
}

.text-white {
  color: white !important;
}

.opacity-90 {
  opacity: 0.9;
}

.large-rating :deep(.v-icon) {
  font-size: 35px !important;
  width: 35px !important;
  height: 35px !important;
}

.preview-card-header > div {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.layout-blank {
  background-color: var(--v-theme-background) !important;
  min-height: 100vh;
  padding-bottom: 50px;
}

:deep(.v-card__underlay) {
  display: none !important;
}
</style>