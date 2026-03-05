<script setup>
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useTikatFormStore } from "@/app-nexuzForm/views/useTikatFormStore"
import AppDateTimePicker from "@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue"
import { emailValidator, requiredValidator } from "@app-lead/@core/utils/validators"
import TikatDocUpload from "@/app-tikat/views/admin/feedback/TikatDocUpload.vue"
import PhoneCodeWithCountry from '@/app-tikat/@core/components/PhoneCodeWithCountry.vue';

const route = useRoute()
const router = useRouter()
const tikatStore = useTikatFormStore()

const refForm = ref(null)
const formStructure = ref(null)
const formValues = ref({})
const isLoading = ref(true)
const formMeta = ref({ code: '', title: '' })
const maxDocSize = 5 * 1024 * 1024;

const phoneValidator = (value) => {
  if (!value) return true
  const phoneRegex = /^\+[0-9]{8,15}$/
  return phoneRegex.test(value) || "Please select a country code and enter a valid phone number"
}

const getRules = (field) => {
  const rules = []
  if (field.optional === false) {
    if (field.inputType === 'BOOLEAN') {
      rules.push(value => (value !== null && value !== undefined) || 'This Field is required');
    } else {
      rules.push(requiredValidator);
    }
  }
  if (field.inputType === "EMAIL") rules.push(emailValidator)
  if (field.inputType === "PHONE") rules.push(phoneValidator)
  return rules
}

const isReadOnly = (field) => {
  return field.access?.contact === 'R';
}

const cardBackgroundStyle = computed(() => {
  const bgUrl = formStructure.value?.banner?.bgImg?.url;
  if (!bgUrl) return { backgroundColor: 'rgb(var(--v-theme-surface))' };
  
  return {
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
});

onMounted(async () => {
  const { formId } = route.params
  const { tnt } = route.query

  if (!formId) return

  try {
    isLoading.value = true
    const res = await tikatStore.fetchFormStructure({ formId, params: { tnt } })
    
    const formDef = res
    if (!formDef || !formDef._id) throw new Error("Form not found")

    const mappedFields = formDef.formFields.map(ff => {
      const master = formDef.masterFields.find(m => m.field_id === ff.id)
      return master ? { ...master, access: ff.access } : null
    }).filter(f => f && f.access?.contact !== 'H')

    formMeta.value = { code: formDef.key, title: formDef.name }
    formStructure.value = {
      title: formDef.name,
      desc: formDef.desc, 
      fields: mappedFields,
      questions: formDef.questions || [],
      scale: formDef.scale || 5,
      segmentation: formDef.segmentation || [],
      banner: formDef.banner || { bgImg: null, logo: null }
    }

    const initialValues = {}
    mappedFields.forEach(f => {
      if (f.inputType === 'BOOLEAN') initialValues[f.key] = false
      else if (f.inputType === 'RATING') initialValues[f.key] = 0
      else initialValues[f.key] = ''
    })
    if (formDef.questions) {
      formDef.questions.forEach((q, idx) => {
        initialValues[`q_${idx}`] = 0
      })
    }
    formValues.value = initialValues

  } catch (error) {
    console.error("Load Error:", error)
    formStructure.value = null
  } finally {
    isLoading.value = false
  }
})

const handleSubmit = async () => {
  if (!refForm.value) return
  const { valid } = await refForm.value.validate()
  if (!valid) return

  try {
    isLoading.value = true
    
    const apiData = {}
    formStructure.value.fields.forEach(field => {
      const val = formValues.value[field.key]
      
      if (val !== undefined && val !== null && val !== '') {
        if (['name', 'email', 'phone'].includes(field.key)) {
          apiData[`contact.${field.key}`] = val
        } else {
          apiData[`custom.${field.key}`] = val
        }
      }
    })

    const questionPayload = (formStructure.value.questions || []).map((q, idx) => ({
      question: q.question,
      value: formValues.value[`q_${idx}`] || 0,
      weight: q.weight,
      order: q.order,
      optional: q.optional
    }))

    apiData.questions = questionPayload

    const payload = {
      formId: route.params.formId,
      formCode: formMeta.value.code,
      formTitle: formMeta.value.title,
      data: apiData,
      byUser: null,
      scale: formStructure.value?.scale || 5,
      segmentation: formStructure.value?.segmentation || [],
    }

    await tikatStore.submitFeedback({
      formId: route.params.formId,
      payload,
      params: { tnt: route.query.tnt }
    })

    router.push({ name: "nexuz-form-success", params: { formId: route.params.formId } })
  } catch (error) {
    alert("Submission failed. Please try again.")
  } finally {
    isLoading.value = false
  }
}

</script>

<template>
  <VContainer>
    <VRow class="justify-center">
      <VCol cols="12" md="8" lg="7">
        
        <div v-if="isLoading" class="text-center mt-10">
          <VProgressCircular indeterminate size="64" color="primary" />
          <p class="mt-4">Loading Form...</p>
        </div>

        <VForm v-else-if="formStructure" ref="refForm" @submit.prevent="handleSubmit">
          <VCard class="mb-6 overflow-hidden preview-card-header" :style="cardBackgroundStyle" elevation="2">
            <div 
              class="d-flex align-center pa-6" 
              :class="{ 'image-overlay': formStructure.banner?.bgImg?.url }"
            >
              <div v-if="formStructure.banner?.logo?.url" class="banner-image me-4">
                <img :src="formStructure.banner.logo.url" class="banner-media-item" />
              </div>

              <div class="flex-grow-1">
                <VCardTitle class="text-h3 pa-0 font-weight-bold" :class="{'text-white': formStructure.banner?.bgImg?.url}">
                  {{ formStructure.title }}
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
            :key="field.field_id" 
            class="my-4" 
            variant="flat" 
            border
          >
            <VCardText>
              <VLabel class="mb-2 font-weight-medium">
                {{ field.label }}
                <span v-if="field.optional === false" class="text-error">*</span>
              </VLabel>

              <VRow v-if="['TEXT', 'EMAIL'].includes(field.inputType)">
                <VCol cols="8">
                  <VTextField
                    v-model="formValues[field.key]"
                    :placeholder="field.label"
                    variant="outlined"
                    density="comfortable"
                    :rules="getRules(field)"
                    :disabled="isReadOnly(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'PHONE'">
                <VCol cols="8">
                  <PhoneCodeWithCountry
                    v-model="formValues[field.key]"
                    :placeholder="field.label"
                    :rules="getRules(field)"
                    :disabled="isReadOnly(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'OPTIONS'">
                <VCol cols="6">
                  <VSelect
                    v-model="formValues[field.key]"
                    :items="field.options"
                    item-title="label"
                    item-value="code"
                    variant="outlined"
                    :rules="getRules(field)"
                    :disabled="isReadOnly(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'RATING'">
                <VCol cols="12">
                  <div class="d-flex align-center gap-2 py-1">
                    <VRating
                      v-model="formValues[field.key]"
                      hover
                      color="warning"
                      active-color="warning"
                      size="large"
                      :disabled="isReadOnly(field)"
                      class="large-rating"
                    />
                  </div>
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'DATE'">
                <VCol md="4">
                  <AppDateTimePicker
                    v-model="formValues[field.key]"
                    prepend-inner-icon="tabler-calendar"
                    :rules="getRules(field)"
                    :disabled="isReadOnly(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'DOCUMENT'">
                <VCol cols="6">
                  <TikatDocUpload
                    :model-value="formValues[field.key]?.url || null"
                    :form-id="route.params.formId"
                    :max-size="maxDocSize"
                    sub-dir="feedback_public"
                    :disabled="isReadOnly(field)"
                    @upload-complete="payload => {
                        formValues[field.key] = {
                        name: payload.name,
                        path: payload.path,
                        url: payload.url,
                        contentType: payload.contentType,
                        contentLength: payload.contentLength,
                        title: payload.title,
                        }
                    }"
                    @update:modelValue="value => {
                        if (value === null) formValues[field.key] = null
                    }"
                   />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'BOOLEAN'">
                <VCol cols="12">
                  <VSwitch
                    v-model="formValues[field.key]"
                    color="primary"
                    inset
                    :rules="getRules(field)"
                    :disabled="isReadOnly(field)"
                  />
                </VCol>
              </VRow>

              <VTextField
                v-else
                disabled
                variant="outlined"
                hint="Unsupported field type"
                persistent-hint
              />
            </VCardText>
          </VCard>
          <div v-if="formStructure.questions?.length">
            <VCard 
              v-for="(q, idx) in formStructure.questions" 
              :key="idx" 
              class="my-4" 
              variant="flat" 
              border
            >
              <VCardText>
                <VLabel class="mb-2 font-weight-medium text-high-emphasis d-block">
                  {{ q.question }}
                  <span v-if="q.optional === false" class="text-error ms-1">*</span>
                </VLabel>
                <div class="py-1">
                  <VRating
                    v-model="formValues[`q_${idx}`]"
                    hover
                    :length="formStructure.scale || 5"
                    color="warning"
                    active-color="warning"
                    size="large"
                    class="large-rating"
                  />
                </div>
              </VCardText>
            </VCard>
          </div>

          <VBtn type="submit" block color="primary" :loading="isLoading" class="mt-6">
            Submit
          </VBtn>
        </VForm>

        <VAlert v-else type="error" variant="tonal" class="mt-10">
          Unable to load form structure. Please check the URL or try again later.
        </VAlert>
      </VCol>
    </VRow>
  </VContainer>
</template>

<style scoped>
:deep(.v-card__underlay) {
  display: none !important;
}

.large-rating :deep(.v-icon) {
  font-size: 35px !important;
  width: 35px !important;
  height: 35px !important;
}

.banner-image {
  flex-shrink: 0;
  width: 75px;
  height: 75px;
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

.preview-card-header > div {
  flex-grow: 1;
  display: flex;
  align-items: center;
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

.v-container {
  min-height: 100vh;
  padding-bottom: 50px;
}
</style>